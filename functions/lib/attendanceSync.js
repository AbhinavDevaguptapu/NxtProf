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
exports.scheduledSync = exports.syncAttendanceToSheet = void 0;
/**
 * @file Cloud Functions for syncing attendance data to Google Sheets.
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const googleapis_1 = require("googleapis");
const google_auth_library_1 = require("google-auth-library");
const functions = __importStar(require("firebase-functions"));
async function _syncAttendanceToSheet(data) {
    const { date, sessionType } = data;
    if (!date || !sessionType) {
        throw new https_1.HttpsError("invalid-argument", "Missing 'date' or 'sessionType'.");
    }
    const SPREADSHEET_ID = "1mMTTdmpGNwqJy9co4tcExdj6FZ0nvEZOhLLhW8yMNn4";
    const db = admin.firestore();
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
        const options = {
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
        const saRaw = process.env.SHEETS_SA_KEY;
        const sa = JSON.parse(saRaw);
        const jwt = new google_auth_library_1.JWT({
            email: sa.client_email,
            key: sa.private_key,
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        const sheets = googleapis_1.google.sheets({ version: "v4", auth: jwt });
        const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const allSheets = spreadsheetMeta.data.sheets;
        if (!allSheets || allSheets.length < 2) {
            throw new https_1.HttpsError("not-found", "The spreadsheet must contain at least two sheets.");
        }
        const targetSheetIndex = sessionType === "standups" ? 0 : 1;
        const targetSheet = allSheets[targetSheetIndex];
        if (!targetSheet) {
            throw new https_1.HttpsError("not-found", `No sheet found at index ${targetSheetIndex}.`);
        }
        const props = targetSheet.properties || {};
        if (props.sheetId == null || props.title == null) {
            throw new https_1.HttpsError("not-found", `Sheet at index ${targetSheetIndex} is missing an ID or title.`);
        }
        const sheetId = props.sheetId;
        const sheetName = props.title;
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
}
exports.syncAttendanceToSheet = (0, https_1.onCall)({ timeoutSeconds: 120, memory: "256MiB", secrets: ["SHEETS_SA_KEY"] }, async (request) => {
    var _a, _b;
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
    return await _syncAttendanceToSheet(request.data);
});
exports.scheduledSync = (0, scheduler_1.onSchedule)({
    schedule: '30 19 * * 1-6',
    timeZone: 'Asia/Kolkata',
    secrets: ["SHEETS_SA_KEY"],
    timeoutSeconds: 300,
    memory: "256MiB"
}, async (event) => {
    console.log('Running scheduled sync for event:', event.scheduleTime);
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    try {
        console.log(`Starting standups sync for ${dateString}`);
        const standupResult = await _syncAttendanceToSheet({ date: dateString, sessionType: 'standups' });
        console.log('Standups sync completed:', standupResult.message);
        console.log(`Starting learning hours sync for ${dateString}`);
        const learningHoursResult = await _syncAttendanceToSheet({ date: dateString, sessionType: 'learning_hours' });
        console.log('Learning hours sync completed:', learningHoursResult.message);
    }
    catch (error) {
        console.error('Scheduled sync failed:', error);
    }
});
//# sourceMappingURL=attendanceSync.js.map