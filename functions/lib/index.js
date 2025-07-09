"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAttendanceToSheet = exports.getFeedbackAiSummary = exports.getFeedbackChartData = exports.getEmployeesWithAdminStatus = exports.deleteEmployee = exports.removeAdminRole = exports.addAdminRole = void 0;
/**
 * @file Cloud Functions for the NxtProf application.
 * @description This file contains all the backend serverless logic, including user management,
 * data synchronization with Google Sheets, and AI-powered feedback analysis.
 */
const admin = __importStar(require("firebase-admin"));
const google_auth_library_1 = require("google-auth-library");
const googleapis_1 = require("googleapis");
const generative_ai_1 = require("@google/generative-ai");
const https_1 = require("firebase-functions/v2/https");
const functions = __importStar(require("firebase-functions"));
const date_fns_1 = require("date-fns");
admin.initializeApp();
// Helper function to securely get the Gemini API Key
function getGeminiKey() {
    const key = process.env.GEMINI_KEY;
    if (!key)
        throw new Error("GEMINI_KEY not set in environment.");
    return key;
}
// Helper function to create a Google Sheets API auth client
function getSheetsAuth() {
    const saRaw = process.env.SHEETS_SA_KEY;
    if (!saRaw)
        throw new https_1.HttpsError("internal", "Service Account key is not configured.");
    const sa = JSON.parse(saRaw);
    return new google_auth_library_1.JWT({
        email: sa.client_email,
        key: sa.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
}
exports.addAdminRole = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Login required.");
    const caller = request.auth.token;
    if (caller.isAdmin !== true)
        throw new https_1.HttpsError("permission-denied", "Admins only.");
    const email = (_a = request.data.email) === null || _a === void 0 ? void 0 : _a.trim();
    if (!email)
        throw new https_1.HttpsError("invalid-argument", "Provide a valid email.");
    try {
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(user.uid, Object.assign(Object.assign({}, user.customClaims), { isAdmin: true }));
        return { message: `${email} is now an admin.` };
    }
    catch (err) {
        if (err.code === "auth/user-not-found") {
            throw new https_1.HttpsError("not-found", "User not found.");
        }
        console.error("addAdminRole error:", err);
        throw new https_1.HttpsError("internal", "Could not set admin role.");
    }
});
exports.removeAdminRole = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.isAdmin) !== true) {
        throw new https_1.HttpsError("permission-denied", "Only admins can modify roles.");
    }
    const email = (_b = request.data.email) === null || _b === void 0 ? void 0 : _b.trim();
    if (!email) {
        throw new https_1.HttpsError("invalid-argument", "Provide a valid email.");
    }
    try {
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(user.uid, Object.assign(Object.assign({}, user.customClaims), { isAdmin: false }));
        return { message: `Admin role removed for ${email}.` };
    }
    catch (err) {
        if (err.code === "auth/user-not-found") {
            throw new https_1.HttpsError("not-found", "User not found.");
        }
        console.error("removeAdminRole error:", err);
        throw new https_1.HttpsError("internal", "Could not remove admin role.");
    }
});
exports.deleteEmployee = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    if (request.auth.token.isAdmin !== true) {
        throw new https_1.HttpsError("permission-denied", "Only admins can delete employees.");
    }
    const uid = request.data.uid;
    if (!uid) {
        throw new https_1.HttpsError("invalid-argument", "Missing or invalid `uid` parameter.");
    }
    try {
        await admin.auth().deleteUser(uid);
        await admin.firestore().doc(`employees/${uid}`).delete();
        return { message: "User account and profile deleted." };
    }
    catch (error) {
        console.error("deleteEmployee error:", error);
        throw new https_1.HttpsError("internal", error.message || "An unknown error occurred.");
    }
});
exports.getEmployeesWithAdminStatus = (0, https_1.onCall)(async (request) => {
    var _a;
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.isAdmin) !== true) {
        throw new https_1.HttpsError("permission-denied", "Only admins can view the employee list.");
    }
    try {
        const listUsersResult = await admin.auth().listUsers(1000);
        const adminUids = new Set(listUsersResult.users
            .filter(u => { var _a; return ((_a = u.customClaims) === null || _a === void 0 ? void 0 : _a.isAdmin) === true; })
            .map(u => u.uid));
        const employeesSnapshot = await admin.firestore().collection("employees").orderBy("name").get();
        const employeesWithStatus = employeesSnapshot.docs.map(doc => (Object.assign(Object.assign({ id: doc.id }, doc.data()), { isAdmin: adminUids.has(doc.id) })));
        return employeesWithStatus;
    }
    catch (error) {
        console.error("Error fetching employees with admin status:", error);
        throw new https_1.HttpsError("internal", "Failed to fetch employee data.");
    }
});
// --- Data Fetching and Analysis Functions ---
// Flexible date parser for handling multiple formats from Google Sheets
function parseDynamicDate(dateString) {
    if (!dateString)
        return new Date(NaN);
    const SUPPORTED_DATE_FORMATS = [
        'M/d/yyyy H:mm:ss', 'M/d/yyyy H:mm', 'yyyy-MM-dd HH:mm:ss',
        'yyyy-MM-dd HH:mm', 'MMMM d, yyyy h:mm a', 'MMM d, yyyy',
        'yyyy-MM-dd', 'M/d/yyyy', 'dd/MM/yyyy', 'dd-MMM-yyyy',
    ];
    for (const formatString of SUPPORTED_DATE_FORMATS) {
        const parsedDate = (0, date_fns_1.parse)(dateString.trim(), formatString, new Date());
        if ((0, date_fns_1.isValid)(parsedDate))
            return parsedDate;
    }
    console.warn(`Unrecognized date format: "${dateString}"`);
    return new Date(NaN);
}
/**
 * Shared logic to fetch and filter feedback data from Google Sheets.
 * This is used by both getFeedbackChartData and getFeedbackAiSummary to avoid code duplication.
 */
async function getFilteredFeedbackData(requestData) {
    var _a, _b, _c;
    const { employeeId, timeFrame, date, startDate, endDate } = requestData;
    // 1. Get Employee's Sheet URL
    const empDoc = await admin.firestore().collection("employees").doc(employeeId).get();
    const sheetUrl = (_a = empDoc.data()) === null || _a === void 0 ? void 0 : _a.feedbackSheetUrl;
    if (typeof sheetUrl !== "string")
        throw new https_1.HttpsError("not-found", "No feedback sheet URL configured.");
    const sheetIdMatch = sheetUrl.match(/\/d\/([\w-]+)/);
    if (!sheetIdMatch)
        throw new https_1.HttpsError("invalid-argument", "Invalid Google Sheet URL format.");
    const spreadsheetId = sheetIdMatch[1];
    // 2. Fetch and Parse Sheet Data
    const sheets = googleapis_1.google.sheets({ version: "v4", auth: getSheetsAuth() });
    const gidMatch = sheetUrl.match(/[#&]gid=(\d+)/);
    const targetGid = gidMatch ? parseInt(gidMatch[1], 10) : 0;
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = (_b = meta.data.sheets) === null || _b === void 0 ? void 0 : _b.find(s => { var _a; return ((_a = s.properties) === null || _a === void 0 ? void 0 : _a.sheetId) === targetGid; });
    if (!((_c = sheet === null || sheet === void 0 ? void 0 : sheet.properties) === null || _c === void 0 ? void 0 : _c.title))
        throw new https_1.HttpsError("not-found", `Sheet with GID "${targetGid}" not found.`);
    const range = `${sheet.properties.title}!A:D`;
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = resp.data.values;
    if (!rows || rows.length < 2)
        return [];
    const dataRows = rows.slice(1).map(r => {
        var _a;
        return ({
            date: parseDynamicDate(((_a = r[0]) === null || _a === void 0 ? void 0 : _a.toString()) || ""),
            understanding: Number(r[1]) || 0,
            instructor: Number(r[2]) || 0,
            comment: (r[3] || "").toString().trim(),
        });
    }).filter(x => (0, date_fns_1.isValid)(x.date));
    // 3. Filter by Time Frame
    if (timeFrame === "full")
        return dataRows;
    if (timeFrame === "daily" || timeFrame === "specific") {
        const targetDate = (0, date_fns_1.startOfDay)((0, date_fns_1.parseISO)(date));
        return dataRows.filter(x => (0, date_fns_1.isSameDay)(x.date, targetDate));
    }
    if (timeFrame === "monthly") {
        const refDate = date ? (0, date_fns_1.parseISO)(date) : new Date();
        return dataRows.filter(x => (0, date_fns_1.isSameMonth)(x.date, refDate));
    }
    if (timeFrame === "range") {
        const s0 = (0, date_fns_1.startOfDay)((0, date_fns_1.parseISO)(startDate));
        const e0 = (0, date_fns_1.endOfDay)((0, date_fns_1.parseISO)(endDate));
        return dataRows.filter(x => x.date >= s0 && x.date <= e0);
    }
    return []; // Should not be reached
}
// --- REFACTORED FUNCTIONS ---
/**
 * NEW FUNCTION 1: Fetches and processes data ONLY for charts. This is fast.
 */
exports.getFeedbackChartData = (0, https_1.onCall)({ timeoutSeconds: 60, memory: "256MiB", secrets: ["SHEETS_SA_KEY"] }, async (request) => {
    // Authorization Check
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    // Add more detailed auth logic here if needed (e.g., allow users to see their own data)
    const filteredData = await getFilteredFeedbackData(request.data);
    const totalFeedbacks = filteredData.length;
    if (totalFeedbacks === 0) {
        return { totalFeedbacks: 0, graphData: null, graphTimeseries: null };
    }
    let graphData = null;
    if (["daily", "specific", "monthly"].includes(request.data.timeFrame)) {
        const sumU = filteredData.reduce((s, r) => s + r.understanding, 0);
        const sumI = filteredData.reduce((s, r) => s + r.instructor, 0);
        graphData = {
            totalFeedbacks,
            avgUnderstanding: parseFloat((sumU / totalFeedbacks).toFixed(2)),
            avgInstructor: parseFloat((sumI / totalFeedbacks).toFixed(2)),
        };
    }
    let graphTimeseries = null;
    if (request.data.timeFrame === "range") {
        const dailyAggregates = new Map();
        filteredData.forEach(row => {
            const dayKey = (0, date_fns_1.format)(row.date, 'yyyy-MM-dd');
            const dayStats = dailyAggregates.get(dayKey) || { sumU: 0, sumI: 0, count: 0 };
            dayStats.sumU += row.understanding;
            dayStats.sumI += row.instructor;
            dayStats.count += 1;
            dailyAggregates.set(dayKey, dayStats);
        });
        const sortedKeys = Array.from(dailyAggregates.keys()).sort();
        graphTimeseries = {
            labels: sortedKeys.map(k => (0, date_fns_1.format)((0, date_fns_1.parseISO)(k), 'MMM d')),
            understanding: sortedKeys.map(k => parseFloat((dailyAggregates.get(k).sumU / dailyAggregates.get(k).count).toFixed(1))),
            instructor: sortedKeys.map(k => parseFloat((dailyAggregates.get(k).sumI / dailyAggregates.get(k).count).toFixed(1))),
        };
    }
    else if (request.data.timeFrame === "full") {
        const monthlyAggregates = new Map();
        filteredData.forEach(row => {
            const monthKey = (0, date_fns_1.format)(row.date, 'yyyy-MM');
            const monthStats = monthlyAggregates.get(monthKey) || { sumU: 0, sumI: 0, count: 0 };
            monthStats.sumU += row.understanding;
            monthStats.sumI += row.instructor;
            monthStats.count += 1;
            monthlyAggregates.set(monthKey, monthStats);
        });
        const sortedKeys = Array.from(monthlyAggregates.keys()).sort();
        graphTimeseries = {
            labels: sortedKeys.map(k => (0, date_fns_1.format)((0, date_fns_1.parse)(k, 'yyyy-MM', new Date()), "MMM yyyy")),
            understanding: sortedKeys.map(k => parseFloat((monthlyAggregates.get(k).sumU / monthlyAggregates.get(k).count).toFixed(2))),
            instructor: sortedKeys.map(k => parseFloat((monthlyAggregates.get(k).sumI / monthlyAggregates.get(k).count).toFixed(2))),
        };
    }
    return { totalFeedbacks, graphData, graphTimeseries };
});
/**
 * NEW FUNCTION 2: Fetches data and performs AI analysis ONLY. This can be slow.
 */
exports.getFeedbackAiSummary = (0, https_1.onCall)({ timeoutSeconds: 120, memory: "512MiB", secrets: ["GEMINI_KEY", "SHEETS_SA_KEY"] }, async (request) => {
    // Authorization Check
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    const filteredData = await getFilteredFeedbackData(request.data);
    const skip = ["na", "n/a", "none", "ntg", "nil", ""];
    const comments = filteredData.map(x => x.comment).filter(t => t && !skip.includes(t.toLowerCase()));
    if (comments.length === 0) {
        return { positiveFeedback: [], improvementAreas: [] };
    }
    try {
        const model = new generative_ai_1.GoogleGenerativeAI(getGeminiKey()).getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `From the following list of verbatim feedback comments, perform an analysis. Return a valid JSON object with two keys: "positiveFeedback" and "improvementAreas". For "positiveFeedback", return an array of up to 3 objects, where each object has a "quote" key (the verbatim positive comment) and a "keywords" key (an array of 1-3 relevant keywords from the quote). For "improvementAreas", return an array of up to 3 objects, where each object has a "theme" key (a summarized topic like 'Pacing' or 'Interaction') and a "suggestion" key (a concise, actionable suggestion for the instructor). If the comments do not contain explicit areas for improvement, analyze the context and provide general best-practice suggestions that could still enhance performance. If there are no comments that fit a category, return an empty array for that key. Comments: """${comments.join("\n")}"""`;
        const aiRes = await model.generateContent(prompt);
        const aiTxt = aiRes.response.text();
        const js = aiTxt.slice(aiTxt.indexOf("{"), aiTxt.lastIndexOf("}") + 1);
        const obj = JSON.parse(js);
        return {
            positiveFeedback: obj.positiveFeedback || [],
            improvementAreas: obj.improvementAreas || [],
        };
    }
    catch (e) {
        console.error("AI processing error:", e);
        throw new https_1.HttpsError("internal", "Failed to generate AI summary.");
    }
});
// --- Find the syncAttendanceToSheet function and REPLACE it with this entire block ---
exports.syncAttendanceToSheet = (0, https_1.onCall)({
    timeoutSeconds: 120,
    memory: "256MiB",
    secrets: ["SHEETS_SA_KEY"],
}, async (request) => {
    var _a, _b;
    // 1. Authentication & Authorization (Unchanged)
    const callerUid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!callerUid) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    try {
        const userRecord = await admin.auth().getUser(callerUid);
        if (((_b = userRecord.customClaims) === null || _b === void 0 ? void 0 : _b.isAdmin) !== true) {
            throw new https_1.HttpsError("permission-denied", "Must be an admin to run this operation.");
        }
    }
    catch (error) {
        console.error("Admin check failed:", error);
        throw new https_1.HttpsError("internal", "Could not verify user permissions.");
    }
    // 2. Validate Input (Unchanged)
    const { date, sessionType } = request.data;
    if (!date || !sessionType) {
        throw new https_1.HttpsError("invalid-argument", "Missing 'date' or 'sessionType'.");
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
        return { success: true, message: `No Firestore records found for ${date}. Sheet was not modified.` };
    }
    const recordsToSync = snapshot.docs.map(doc => {
        const data = doc.data();
        // --- REPLACE WITH THIS BLOCK ---
        const options = {
            hour12: true,
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata' // Explicitly set the timezone to IST
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
    // --- Find and Delete Existing Rows by Sheet Index ---
    try {
        // 4. Authenticate with Google Sheets
        const saRaw = process.env.SHEETS_SA_KEY;
        const sa = JSON.parse(saRaw);
        const jwt = new google_auth_library_1.JWT({
            email: sa.client_email,
            key: sa.private_key,
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        const sheets = googleapis_1.google.sheets({ version: "v4", auth: jwt });
        // 5. Get Sheet Info by Index
        const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const allSheets = spreadsheetMeta.data.sheets;
        if (!allSheets || allSheets.length < 2) {
            throw new https_1.HttpsError("not-found", "The spreadsheet must contain at least two sheets.");
        }
        const targetSheetIndex = sessionType === "standups" ? 0 : 1;
        const targetSheet = allSheets[targetSheetIndex];
        // 1) make sure we actually got a sheet at that index
        if (!targetSheet) {
            throw new https_1.HttpsError("not-found", `No sheet found at index ${targetSheetIndex}.`);
        }
        // 2) pull off its properties
        const props = targetSheet.properties || {};
        // 3) explicitly check for missing (null or undefined)
        //    this won’t mistake 0 for “missing”
        if (props.sheetId == null || props.title == null) {
            throw new https_1.HttpsError("not-found", `Sheet at index ${targetSheetIndex} is missing an ID or title.`);
        }
        // 4) now safely extract them
        const sheetId = props.sheetId; // could be 0, but that’s fine
        const sheetName = props.title;
        // 6. Find and Delete Existing Rows
        const rangeToRead = `${sheetName}!A2:A`;
        const existingData = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: rangeToRead });
        const rowsToDelete = [];
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
        // 7. Append Fresh Data
        if (recordsToSync.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `${sheetName}!A:H`,
                valueInputOption: "USER_ENTERED",
                requestBody: { values: recordsToSync },
            });
            return { success: true, message: `Successfully synced ${recordsToSync.length} records.` };
        }
        else {
            return { success: true, message: `No Firestore records found for ${date}. Existing sheet data was cleared.` };
        }
    }
    catch (err) {
        functions.logger.error("Error during Google Sheets operation:", err);
        throw new https_1.HttpsError("internal", "An error occurred while syncing to the sheet. " + err.message);
    }
});
// // Add this new function alongside your existing addAdminRole function
// export const removeAdminRole = onCall<RoleManagementData>(async (request) => {
//     if (!request.auth?.token.isAdmin) {
//         throw new HttpsError("permission-denied", "Only admins can modify roles.");
//     }
//     const email = request.data.email?.trim();
//     if (!email) {
//         throw new HttpsError("invalid-argument", "Provide a valid email.");
//     }
//     try {
//         const user = await admin.auth().getUserByEmail(email);
//         // Set custom claims, ensuring other claims are merged if they exist
//         await admin.auth().setCustomUserClaims(user.uid, { ...user.customClaims, isAdmin: false });
//         return { message: `Admin role removed for ${email}.` };
//     } catch (err: any) {
//         if (err.code === "auth/user-not-found") {
//             throw new HttpsError("not-found", "User not found.");
//         }
//         console.error("removeAdminRole error:", err);
//         throw new HttpsError("internal", "Could not remove admin role.");
//     }
// });
// // Add this function to securely get the list of employees with their admin status
// export const getEmployeesWithAdminStatus = onCall(async (request) => {
//     if (!request.auth?.token.isAdmin) {
//         throw new HttpsError("permission-denied", "Only admins can view the employee list.");
//     }
//     try {
//         // Get all users from Firebase Auth to check their custom claims
//         const listUsersResult = await admin.auth().listUsers(1000);
//         const adminUids = new Set();
//         listUsersResult.users.forEach(userRecord => {
//             if (userRecord.customClaims?.isAdmin === true) {
//                 adminUids.add(userRecord.uid);
//             }
//         });
//         // Get all employee profiles from Firestore
//         const employeesSnapshot = await admin.firestore().collection("employees").orderBy("name").get();
//         // Merge the two data sources
//         const employeesWithStatus = employeesSnapshot.docs.map(doc => {
//             const employeeData = doc.data();
//             return {
//                 id: doc.id,
//                 ...employeeData,
//                 isAdmin: adminUids.has(doc.id) // Add the isAdmin flag
//             };
//         });
//         return employeesWithStatus;
//     } catch (error: any) {
//         console.error("Error fetching employees with admin status:", error);
//         throw new HttpsError("internal", "Failed to fetch employee data.");
//     }
// });
//# sourceMappingURL=index.js.map