/**
 * @file Cloud Functions for the NxtProf application.
 * @description This file contains all the backend serverless logic, including user management,
 * data synchronization with Google Sheets, and AI-powered feedback analysis.
 */
import { endLearningSessionAndLockPoints } from "./learningSessions";
import { syncLearningPointsToSheet } from "./syncLearningHours";
import * as admin from "firebase-admin";
import { JWT } from "google-auth-library";
import { google } from "googleapis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DecodedIdToken } from "firebase-admin/auth";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler"; 
import {
    parse,
    isSameDay,
    isSameMonth,
    startOfDay,
    endOfDay,
    parseISO,
    format,
    isValid
} from "date-fns";

admin.initializeApp();

// Helper function to securely get the Gemini API Key
function getGeminiKey(): string {
    const key = process.env.GEMINI_KEY;
    if (!key) throw new Error("GEMINI_KEY not set in environment.");
    return key;
}

// Helper function to create a Google Sheets API auth client
function getSheetsAuth(): JWT {
    const saRaw = process.env.SHEETS_SA_KEY!;
    if (!saRaw) throw new HttpsError("internal", "Service Account key is not configured.");
    const sa = JSON.parse(saRaw);
    return new JWT({
        email: sa.client_email,
        key: sa.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
}

// --- User & Role Management Functions ---

interface RoleManagementData { email: string; }
interface CustomDecodedIdToken extends DecodedIdToken { isAdmin?: boolean; }

export const addAdminRole = onCall<RoleManagementData>(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
    const caller = request.auth.token as CustomDecodedIdToken;
    if (caller.isAdmin !== true) throw new HttpsError("permission-denied", "Admins only.");

    const email = request.data.email?.trim();
    if (!email) throw new HttpsError("invalid-argument", "Provide a valid email.");

    try {
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(user.uid, { ...user.customClaims, isAdmin: true });
        return { message: `${email} is now an admin.` };
    } catch (err: any) {
        if (err.code === "auth/user-not-found") {
            throw new HttpsError("not-found", "User not found.");
        }
        console.error("addAdminRole error:", err);
        throw new HttpsError("internal", "Could not set admin role.");
    }
});

export const removeAdminRole = onCall<RoleManagementData>(async (request) => {
    if (request.auth?.token.isAdmin !== true) {
        throw new HttpsError("permission-denied", "Only admins can modify roles.");
    }
    const email = request.data.email?.trim();
    if (!email) {
        throw new HttpsError("invalid-argument", "Provide a valid email.");
    }
    try {
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(user.uid, { ...user.customClaims, isAdmin: false });
        return { message: `Admin role removed for ${email}.` };
    } catch (err: any) {
        if (err.code === "auth/user-not-found") {
            throw new HttpsError("not-found", "User not found.");
        }
        console.error("removeAdminRole error:", err);
        throw new HttpsError("internal", "Could not remove admin role.");
    }
});

export const deleteEmployee = onCall<{ uid?: string }>(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const uid = request.data.uid;
    if (!uid) {
        throw new HttpsError("invalid-argument", "Missing or invalid `uid` parameter.");
    }

    // A user can delete their own account, or an admin can delete any account.
    if (request.auth.uid !== uid && request.auth.token.isAdmin !== true) {
        throw new HttpsError("permission-denied", "You do not have permission to delete this account.");
    }

    try {
        await admin.auth().deleteUser(uid);
        await admin.firestore().doc(`employees/${uid}`).delete();
        return { message: "User account and profile deleted." };
    } catch (error: any) {
        console.error("deleteEmployee error:", error);
        throw new HttpsError("internal", error.message || "An unknown error occurred.");
    }
});

export const getEmployeesWithAdminStatus = onCall(async (request) => {
    if (request.auth?.token.isAdmin !== true) {
        throw new HttpsError("permission-denied", "Only admins can view the employee list.");
    }

    try {
        const listUsersResult = await admin.auth().listUsers(1000);
        const adminUids = new Set(
            listUsersResult.users
                .filter(u => u.customClaims?.isAdmin === true)
                .map(u => u.uid)
        );

        const employeesSnapshot = await admin.firestore().collection("employees").orderBy("name").get();
        const employeesWithStatus = employeesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            isAdmin: adminUids.has(doc.id),
        }));
        return employeesWithStatus;
    } catch (error: any) {
        console.error("Error fetching employees with admin status:", error);
        throw new HttpsError("internal", "Failed to fetch employee data.");
    }
});

// --- Data Fetching and Analysis Functions ---

// Flexible date parser for handling multiple formats from Google Sheets
function parseDynamicDate(dateString: string): Date {
    if (!dateString) return new Date(NaN);
    const SUPPORTED_DATE_FORMATS = [
        'M/d/yyyy H:mm:ss', 'M/d/yyyy H:mm', 'yyyy-MM-dd HH:mm:ss',
        'yyyy-MM-dd HH:mm', 'MMMM d, yyyy h:mm a', 'MMM d, yyyy',
        'yyyy-MM-dd', 'M/d/yyyy', 'dd/MM/yyyy', 'dd-MMM-yyyy',
    ];
    for (const formatString of SUPPORTED_DATE_FORMATS) {
        const parsedDate = parse(dateString.trim(), formatString, new Date());
        if (isValid(parsedDate)) return parsedDate;
    }
    console.warn(`Unrecognized date format: "${dateString}"`);
    return new Date(NaN);
}

// Type definitions for the feedback functions
type FeedbackRequestData = {
    employeeId: string;
    timeFrame: "daily" | "monthly" | "specific" | "range" | "full";
    date?: string;      // ISO string for daily/monthly/specific
    startDate?: string; // YYYY-MM-DD for range
    endDate?: string;   // YYYY-MM-DD for range
};

type SummaryGraph = {
    totalFeedbacks: number;
    avgUnderstanding: number;
    avgInstructor: number;
};

type TimeseriesGraph = {
    labels: string[];
    understanding: number[];
    instructor: number[];
};

/**
 * Shared logic to fetch and filter feedback data from Google Sheets.
 * This is used by both getFeedbackChartData and getFeedbackAiSummary to avoid code duplication.
 */
async function getFilteredFeedbackData(requestData: FeedbackRequestData): Promise<any[]> {
    const { employeeId, timeFrame, date, startDate, endDate } = requestData;

    // 1. Get Employee's Sheet URL
    const empDoc = await admin.firestore().collection("employees").doc(employeeId).get();
    const sheetUrl = empDoc.data()?.feedbackSheetUrl;
    if (typeof sheetUrl !== "string") throw new HttpsError("not-found", "No feedback sheet URL configured.");
    const sheetIdMatch = sheetUrl.match(/\/d\/([\w-]+)/);
    if (!sheetIdMatch) throw new HttpsError("invalid-argument", "Invalid Google Sheet URL format.");
    const spreadsheetId = sheetIdMatch[1];

    // 2. Fetch and Parse Sheet Data
    const sheets = google.sheets({ version: "v4", auth: getSheetsAuth() });
    const gidMatch = sheetUrl.match(/[#&]gid=(\d+)/);
    const targetGid = gidMatch ? parseInt(gidMatch[1], 10) : 0;
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = meta.data.sheets?.find(s => s.properties?.sheetId === targetGid);
    if (!sheet?.properties?.title) throw new HttpsError("not-found", `Sheet with GID "${targetGid}" not found.`);
    const range = `${sheet.properties.title}!A:D`;
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = resp.data.values;
    if (!rows || rows.length < 2) return [];

    const dataRows = rows.slice(1).map(r => ({
        date: parseDynamicDate(r[0]?.toString() || ""),
        understanding: Number(r[1]) || 0,
        instructor: Number(r[2]) || 0,
        comment: (r[3] || "").toString().trim(),
    })).filter(x => isValid(x.date));

    // 3. Filter by Time Frame
    if (timeFrame === "full") return dataRows;
    if (timeFrame === "daily" || timeFrame === "specific") {
        const targetDate = startOfDay(parseISO(date!));
        return dataRows.filter(x => isSameDay(x.date, targetDate));
    }
    if (timeFrame === "monthly") {
        const refDate = date ? parseISO(date) : new Date();
        return dataRows.filter(x => isSameMonth(x.date, refDate));
    }
    if (timeFrame === "range") {
        const s0 = startOfDay(parseISO(startDate!));
        const e0 = endOfDay(parseISO(endDate!));
        return dataRows.filter(x => x.date >= s0 && x.date <= e0);
    }
    return []; // Should not be reached
}


// --- REFACTORED FUNCTIONS ---

/**
 * NEW FUNCTION 1: Fetches and processes data ONLY for charts. This is fast.
 */
export const getFeedbackChartData = onCall<FeedbackRequestData>(
    { timeoutSeconds: 60, memory: "256MiB", secrets: ["SHEETS_SA_KEY"] },
    async (request) => {
        // Authorization Check
        if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required.");
        // Add more detailed auth logic here if needed (e.g., allow users to see their own data)

        const filteredData = await getFilteredFeedbackData(request.data);
        const totalFeedbacks = filteredData.length;

        if (totalFeedbacks === 0) {
            return { totalFeedbacks: 0, graphData: null, graphTimeseries: null };
        }

        let graphData: SummaryGraph | null = null;
        if (["daily", "specific", "monthly"].includes(request.data.timeFrame)) {
            const sumU = filteredData.reduce((s, r) => s + r.understanding, 0);
            const sumI = filteredData.reduce((s, r) => s + r.instructor, 0);
            graphData = {
                totalFeedbacks,
                avgUnderstanding: parseFloat((sumU / totalFeedbacks).toFixed(2)),
                avgInstructor: parseFloat((sumI / totalFeedbacks).toFixed(2)),
            };
        }

        let graphTimeseries: TimeseriesGraph | null = null;
        if (request.data.timeFrame === "range") {
             const dailyAggregates = new Map<string, { sumU: number; sumI: number; count: number }>();
             filteredData.forEach(row => {
                 const dayKey = format(row.date, 'yyyy-MM-dd');
                 const dayStats = dailyAggregates.get(dayKey) || { sumU: 0, sumI: 0, count: 0 };
                 dayStats.sumU += row.understanding;
                 dayStats.sumI += row.instructor;
                 dayStats.count += 1;
                 dailyAggregates.set(dayKey, dayStats);
             });
             const sortedKeys = Array.from(dailyAggregates.keys()).sort();
             graphTimeseries = {
                 labels: sortedKeys.map(k => format(parseISO(k), 'MMM d')),
                 understanding: sortedKeys.map(k => parseFloat((dailyAggregates.get(k)!.sumU / dailyAggregates.get(k)!.count).toFixed(1))),
                 instructor: sortedKeys.map(k => parseFloat((dailyAggregates.get(k)!.sumI / dailyAggregates.get(k)!.count).toFixed(1))),
             };
        } else if (request.data.timeFrame === "full") {
            const monthlyAggregates = new Map<string, { sumU: number; sumI: number; count: number }>();
            filteredData.forEach(row => {
                const monthKey = format(row.date, 'yyyy-MM');
                const monthStats = monthlyAggregates.get(monthKey) || { sumU: 0, sumI: 0, count: 0 };
                monthStats.sumU += row.understanding;
                monthStats.sumI += row.instructor;
                monthStats.count += 1;
                monthlyAggregates.set(monthKey, monthStats);
            });
            const sortedKeys = Array.from(monthlyAggregates.keys()).sort();
            graphTimeseries = {
                labels: sortedKeys.map(k => format(parse(k, 'yyyy-MM', new Date()), "MMM yyyy")),
                understanding: sortedKeys.map(k => parseFloat((monthlyAggregates.get(k)!.sumU / monthlyAggregates.get(k)!.count).toFixed(2))),
                instructor: sortedKeys.map(k => parseFloat((monthlyAggregates.get(k)!.sumI / monthlyAggregates.get(k)!.count).toFixed(2))),
            };
        }

        return { totalFeedbacks, graphData, graphTimeseries };
    }
);

/**
 * NEW FUNCTION 2: Fetches data and performs AI analysis ONLY. This can be slow.
 */
export const getFeedbackAiSummary = onCall<FeedbackRequestData>(
    { timeoutSeconds: 120, memory: "512MiB", secrets: ["GEMINI_KEY", "SHEETS_SA_KEY"] },
    async (request) => {
        // Authorization Check
        if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required.");

        const filteredData = await getFilteredFeedbackData(request.data);

        const skip = ["na", "n/a", "none", "ntg", "nil", ""];
        const comments = filteredData.map(x => x.comment).filter(t => t && !skip.includes(t.toLowerCase()));

        if (comments.length === 0) {
            return { positiveFeedback: [], improvementAreas: [] };
        }

        try {
            const model = new GoogleGenerativeAI(getGeminiKey()).getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `From the following list of verbatim feedback comments, perform an analysis. Return a valid JSON object with two keys: "positiveFeedback" and "improvementAreas". For "positiveFeedback", return an array of up to 3 objects, where each object has a "quote" key (the verbatim positive comment) and a "keywords" key (an array of 1-3 relevant keywords from the quote). For "improvementAreas", return an array of up to 3 objects, where each object has a "theme" key (a summarized topic like 'Pacing' or 'Interaction') and a "suggestion" key (a concise, actionable suggestion for the instructor). If the comments do not contain explicit areas for improvement, analyze the context and provide general best-practice suggestions that could still enhance performance. If there are no comments that fit a category, return an empty array for that key. Comments: """${comments.join("\n")}"""`;
            const aiRes = await model.generateContent(prompt);
            const aiTxt = aiRes.response.text();
            const js = aiTxt.slice(aiTxt.indexOf("{"), aiTxt.lastIndexOf("}") + 1);
            const obj = JSON.parse(js);
            return {
                positiveFeedback: obj.positiveFeedback || [],
                improvementAreas: obj.improvementAreas || [],
            };
        } catch (e) {
            console.error("AI processing error:", e);
            throw new HttpsError("internal", "Failed to generate AI summary.");
        }
    }
);


// Add this interface definition with your other types
interface SyncToSheetData {
    date: string; // Expected format: YYYY-MM-DD
    sessionType: 'standups' | 'learning_hours';
}

// --- Internal function to sync attendance data ---
async function _syncAttendanceToSheet(data: SyncToSheetData) {
    const { date, sessionType } = data;
    if (!date || !sessionType) {
        throw new HttpsError("invalid-argument", "Missing 'date' or 'sessionType'.");
    }

    // --- Configuration ---
    const SPREADSHEET_ID = "1mMTTdmpGNwqJy9co4tcExdj6FZ0nvEZOhLLhW8yMNn4";
    const db = admin.firestore();

    // 3. Fetch Data from Firestore (Unchanged)
    const collectionName = sessionType === "standups" ? "attendance" : "learning_hours_attendance";
    const idField = sessionType === "standups" ? "standup_id" : "learning_hour_id";
    const q = db.collection(collectionName).where(idField, "==", date);
    const snapshot = await q.get();

    if (snapshot.empty) {
        console.log(`No Firestore records found for ${date}. Sheet was not modified.`);
        return { success: true, message: `No Firestore records found for ${date}. Sheet was not modified.` };
    }

    const recordsToSync = snapshot.docs.map(doc => {
        const data = doc.data();
        const options: Intl.DateTimeFormatOptions = {
            hour12: true,
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
        };
        const scheduledTime = data.scheduled_at ? new Date(data.scheduled_at.toMillis()).toLocaleTimeString('en-US', options) : "N/A";
        return [
            data.standup_id || data.learning_hour_id,
            scheduledTime,
            sessionType,
            data.employeeId || "",
            data.employee_name || "",
            data.employee_email || "",
            data.status,
            data.reason || "",
        ];
    });

    try {
        const saRaw = process.env.SHEETS_SA_KEY!;
        const sa = JSON.parse(saRaw);
        const jwt = new JWT({
            email: sa.client_email,
            key: sa.private_key,
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        const sheets = google.sheets({ version: "v4", auth: jwt });

        const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const allSheets = spreadsheetMeta.data.sheets;
        if (!allSheets || allSheets.length < 2) {
            throw new HttpsError("not-found", "The spreadsheet must contain at least two sheets.");
        }

        const targetSheetIndex = sessionType === "standups" ? 0 : 1;
        const targetSheet = allSheets[targetSheetIndex];

        if (!targetSheet) {
            throw new HttpsError("not-found", `No sheet found at index ${targetSheetIndex}.`);
        }

        const props = targetSheet.properties || {};
        if (props.sheetId == null || props.title == null) {
            throw new HttpsError("not-found", `Sheet at index ${targetSheetIndex} is missing an ID or title.`);
        }

        const sheetId = props.sheetId;
        const sheetName = props.title;

        const rangeToRead = `${sheetName}!A2:A`;
        const existingData = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: rangeToRead });

        const rowsToDelete: any[] = [];
        if (existingData.data.values) {
            existingData.data.values.forEach((row, index) => {
                if (row[0] === date) {
                    rowsToDelete.push({
                        deleteDimension: {
                            range: { sheetId, dimension: "ROWS", startIndex: index + 1, endIndex: index + 2 },
                        },
                    });
                }
            });
        }

        if (rowsToDelete.length > 0) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: { requests: rowsToDelete.reverse() },
            });
            functions.logger.info(`Deleted ${rowsToDelete.length} old rows for date ${date}.`);
        }

        if (recordsToSync.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `${sheetName}!A:H`,
                valueInputOption: "USER_ENTERED",
                requestBody: { values: recordsToSync },
            });
            return { success: true, message: `Successfully synced ${recordsToSync.length} records.` };
        } else {
            return { success: true, message: `No Firestore records found for ${date}. Existing sheet data was cleared.` };
        }

    } catch (err: any) {
        functions.logger.error("Error during Google Sheets operation:", err);
        throw new HttpsError("internal", "An error occurred while syncing to the sheet. " + err.message);
    }
}

// --- Callable function to sync attendance data ---
export const syncAttendanceToSheet = onCall<SyncToSheetData>(
    { timeoutSeconds: 120, memory: "256MiB", secrets: ["SHEETS_SA_KEY"] },
    async (request) => {
        const callerUid = request.auth?.uid;
        if (!callerUid) {
            throw new HttpsError("unauthenticated", "Authentication is required.");
        }
        try {
            const userRecord = await admin.auth().getUser(callerUid);
            if (userRecord.customClaims?.isAdmin !== true) {
                throw new HttpsError("permission-denied", "Must be an admin to run this operation.");
            }
        } catch (error) {
            console.error("Admin check failed:", error);
            throw new HttpsError("internal", "Could not verify user permissions.");
        }

        return await _syncAttendanceToSheet(request.data);
    }
);

// --- Scheduled function to sync attendance data ---
export const scheduledSync = onSchedule(
    {
        schedule: '30 19 * * 1-6', // Runs at 7:30 PM from Monday to Saturday
        timeZone: 'Asia/Kolkata',
        secrets: ["SHEETS_SA_KEY"], // Ensure secrets are available to the scheduled function
        timeoutSeconds: 300,
        memory: "256MiB"
    },
    async (event: { scheduleTime: any; }) => {
        console.log('Running scheduled sync for event:', event.scheduleTime);
        const today = new Date();
        const dateString = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD

        try {
            // Sync standups
            console.log(`Starting standups sync for ${dateString}`);
            const standupResult = await _syncAttendanceToSheet({ date: dateString, sessionType: 'standups' });
            console.log('Standups sync completed:', standupResult.message);

            // Sync learning hours
            console.log(`Starting learning hours sync for ${dateString}`);
            const learningHoursResult = await _syncAttendanceToSheet({ date: dateString, sessionType: 'learning_hours' });
            console.log('Learning hours sync completed:', learningHoursResult.message);

        } catch (error) {
            console.error('Scheduled sync failed:', error);
            // The error is automatically reported to Cloud Logging.
            // Depending on requirements, you could add more specific error handling here,
            // such as sending a notification.
        }
    }
);

export const analyzeTask = onCall<{ prompt: string }>(
    { timeoutSeconds: 120, memory: "512MiB", secrets: ["GEMINI_KEY"] },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Authentication required.");
        }

        const { prompt } = request.data;

        try {
            const model = new GoogleGenerativeAI(getGeminiKey()).getGenerativeModel({ model: "gemini-1.5-flash" });
            const aiRes = await model.generateContent(prompt);
            const aiTxt = aiRes.response.text();
            const js = aiTxt.slice(aiTxt.indexOf("{"), aiTxt.lastIndexOf("}") + 1);
            const obj = JSON.parse(js);
            return obj;
        } catch (e) {
            console.error("AI processing error:", e);
            throw new HttpsError("internal", "Failed to generate AI summary.");
        }
    }
);

export const getSubsheetNames = onCall<{}>( 
  async (request): Promise<any[]> => { // Return type changed to any[] to support the new object structure
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }

    const SPREADSHEET_ID = "1RIEItNyirXEN_apxmYOlWaV5-rrTxJucyz6-kDu9dWA";
    const isAdmin = request.auth.token.isAdmin === true;

    try {
      const sheets = google.sheets({ version: "v4", auth: getSheetsAuth() });
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });

      if (!meta.data.sheets) return [];

      const allSheetNames = meta.data.sheets
        .map(sheet => sheet.properties?.title || "")
        .filter(Boolean);

      const employeeSheets = allSheetNames
        .map(name => {
          const parts = name.split('|').map(p => p.trim());
          if (parts.length !== 2) return null; // Invalid format
          return { name: parts[0], id: parts[1], sheetName: name };
        })
        .filter(Boolean) as { name: string; id: string; sheetName: string }[]; // Type assertion

      employeeSheets.sort((a, b) => a.name.localeCompare(b.name));

      if (isAdmin) {
        return employeeSheets;
      } else {
        const userDoc = await admin.firestore().collection("employees").doc(request.auth.uid).get();
        const employeeId = userDoc.data()?.employeeId;

        if (!employeeId) {
          throw new HttpsError("not-found", "Could not find an employee ID for the current user.");
        }

        const userSheet = employeeSheets.find(sheet => sheet.id === employeeId);
        
        return userSheet ? [userSheet] : [];
      }
    } catch (error: any) {
      console.error("Error in getSubsheetNames:", error);
      throw new HttpsError("internal", "Failed to retrieve sheet names.", error.message);
    }
  }
);

/**
 * Fetches and parses data from a specific subsheet by name, with permission checks.
 * - Admins can access any subsheet.
 * - Regular users can only access the subsheet that matches their name.
 */
export const getSheetData = onCall<{ sheetName: string }>(
  { secrets: ["SHEETS_SA_KEY"] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }

    const { sheetName } = request.data;
    if (!sheetName) {
      throw new HttpsError("invalid-argument", "A sheet name is required.");
    }

    const isAdmin = request.auth.token.isAdmin === true;

    // --- Authorization Check ---
    if (!isAdmin) {
      const userDoc = await admin.firestore().collection("employees").doc(request.auth.uid).get();
      const employeeId = userDoc.data()?.employeeId;

      // Extract the ID from the sheet name (e.g., "Hemanth | NW0004740" -> "NW0004740")
      const sheetId = sheetName.split('|').pop()?.trim();

      if (!employeeId || sheetId !== employeeId) {
        throw new HttpsError("permission-denied", "You do not have permission to access this sheet.");
      }
    }

    const SPREADSHEET_ID = "1RIEItNyirXEN_apxmYOlWaV5-rrTxJucyz6-kDu9dWA";

    try {
      const sheets = google.sheets({ version: "v4", auth: getSheetsAuth() });
      const range = `${sheetName}!A:J`;
      const resp = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
      const rows = resp.data.values;

      if (!rows || rows.length < 2) return [];

      const REQUIRED_HEADERS = {
        date: 'Date',
        task: 'Task in the Day (As in Day Plan)',
        taskFrameworkCategory: 'Task Framework Category',
        pointType: 'Point Type',
        situation: 'Situation (S)',
        behavior: 'Behavior (B)',
        impact: 'Impact (I)',
        action: 'Action Item (A)',
      };
      
      const headers = rows[0].map(h => h.toLowerCase().trim());
      const dataRows = rows.slice(1);

      const headerMapping = {
        date: headers.indexOf(REQUIRED_HEADERS.date.toLowerCase()),
        task: headers.indexOf(REQUIRED_HEADERS.task.toLowerCase()),
        taskFrameworkCategory: headers.indexOf(REQUIRED_HEADERS.taskFrameworkCategory.toLowerCase()),
        pointType: headers.indexOf(REQUIRED_HEADERS.pointType.toLowerCase()),
        situation: headers.indexOf(REQUIRED_HEADERS.situation.toLowerCase()),
        behavior: headers.indexOf(REQUIRED_HEADERS.behavior.toLowerCase()),
        impact: headers.indexOf(REQUIRED_HEADERS.impact.toLowerCase()),
        action: headers.indexOf(REQUIRED_HEADERS.action.toLowerCase()),
      };

      const missingHeaders = Object.entries(headerMapping)
        .filter(([, idx]) => idx === -1)
        .map(([key]) => REQUIRED_HEADERS[key as keyof typeof REQUIRED_HEADERS]);

      if (missingHeaders.length > 0) {
        throw new HttpsError("failed-precondition", `The sheet is missing required columns: ${missingHeaders.join(', ')}.`);
      }

      const tasks = dataRows.map((row, index) => ({
        id: `${sheetName}-${index}`,
        date: row[headerMapping.date] || '',
        task: row[headerMapping.task] || '',
        taskFrameworkCategory: row[headerMapping.taskFrameworkCategory] || '',
        pointType: row[headerMapping.pointType] || '',
        situation: row[headerMapping.situation] || '',
        behavior: row[headerMapping.behavior] || '',
        impact: row[headerMapping.impact] || '',
        action: row[headerMapping.action] || '',
      }))
      .filter(task => task.date || task.task);

      return tasks;

    } catch (error: any) {
      console.error(`Error in getSheetData for sheet ${sheetName}:`, error);
      throw new HttpsError("internal", "Failed to retrieve and parse sheet data.", error.message);
    }
  }
);

export { endLearningSessionAndLockPoints, syncLearningPointsToSheet };
