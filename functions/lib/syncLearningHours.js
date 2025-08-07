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
exports.autoSyncLearningPoints = exports.syncLearningPointsToSheet = void 0;
const https_1 = require("firebase-functions/v2/https");
const googleapis_1 = require("googleapis");
const google_auth_library_1 = require("google-auth-library");
const admin = __importStar(require("firebase-admin"));
const date_fns_1 = require("date-fns");
const LEARNING_HOURS_SPREADSHEET_ID = "1RIEItNyirXEN_apxmYOlWaV5-rrTxJucyz6-kDu9dWA";
// Sheets client with service account
function getSheetsClient() {
    const saRaw = process.env.SHEETS_SA_KEY;
    if (!saRaw)
        throw new https_1.HttpsError("internal", "SHEETS_SA_KEY env var not configured.");
    const sa = JSON.parse(saRaw);
    const auth = new google_auth_library_1.JWT({
        email: sa.client_email,
        key: sa.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    return googleapis_1.google.sheets({ version: "v4", auth });
}
// Reusable core logic for syncing
async function _syncLearningPoints(sessionId) {
    var _a;
    const db = admin.firestore();
    // Verify session
    const sessionRef = db.doc(`learning_hours/${sessionId}`);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
        throw new https_1.HttpsError("not-found", `Learning-hour session document not found for ID: ${sessionId}.`);
    }
    const sessionData = sessionSnap.data();
    if (sessionData.status !== "ended") {
        throw new https_1.HttpsError("failed-precondition", "Session must be ended before syncing.");
    }
    if (sessionData.synced === true) {
        return {
            success: true,
            message: "This session is already synced.",
            appended: 0,
        };
    }
    // 2. Fetch points
    const pointsSnap = await db
        .collection("learning_points")
        .where("sessionId", "==", sessionId)
        .where("editable", "==", false)
        .get();
    if (pointsSnap.empty) {
        // If no points, still mark as synced to prevent re-running.
        await sessionRef.update({
            synced: true,
            syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            message: "No locked learning points found for this session. Marked as synced.",
            appended: 0,
        };
    }
    const grouped = {};
    pointsSnap.forEach((doc) => {
        const p = doc.data();
        grouped[p.userId] = grouped[p.userId] ? [...grouped[p.userId], p] : [p];
    });
    // 3. Prepare sheets meta
    const sheets = getSheetsClient();
    const meta = await sheets.spreadsheets.get({
        spreadsheetId: LEARNING_HOURS_SPREADSHEET_ID,
    });
    const allSheets = meta.data.sheets || [];
    const sheetLookup = {};
    allSheets.forEach((sh) => {
        var _a;
        const title = ((_a = sh.properties) === null || _a === void 0 ? void 0 : _a.title) || "";
        const parts = title.split("|").map((s) => s.trim());
        if (parts.length === 2) {
            sheetLookup[parts[1]] = { title, sheetId: sh.properties.sheetId };
        }
    });
    // 4. Sync data
    let totalAppended = 0;
    for (const [uid, points] of Object.entries(grouped)) {
        const empSnap = await db.collection("employees").doc(uid).get();
        const employee = empSnap.data();
        if (!employee)
            continue;
        const { employeeId } = employee;
        if (!employeeId || !sheetLookup[employeeId]) {
            console.warn(`No subsheet for employeeId ${employeeId}. Skipping.`);
            continue;
        }
        const sheetName = sheetLookup[employeeId].title;
        // 4a. Existing rows to skip duplicates
        const existingResp = await sheets.spreadsheets.values.get({
            spreadsheetId: LEARNING_HOURS_SPREADSHEET_ID,
            range: `${sheetName}!A:J`,
        });
        const existingRows = (_a = existingResp.data.values) !== null && _a !== void 0 ? _a : [];
        const existingKeys = new Set(existingRows.slice(1).map((row) => `${row[0]}|${row[1]}|${row[4]}`));
        // 4b. Prepare rows
        const rowsToAppend = [];
        points.forEach((p) => {
            var _a, _b;
            const dateStr = p.date
                ? (0, date_fns_1.format)(p.date.toDate(), "yyyy-MM-dd")
                : (0, date_fns_1.format)((_b = (_a = p.createdAt) === null || _a === void 0 ? void 0 : _a.toDate()) !== null && _b !== void 0 ? _b : new Date(), "yyyy-MM-dd");
            const key = `${dateStr}|${p.task_name}|${p.point_type}`;
            if (existingKeys.has(key))
                return;
            rowsToAppend.push([
                dateStr,
                p.task_name || "",
                p.framework_category || "",
                p.subcategory || "",
                p.point_type || "",
                p.recipient || "",
                p.situation || "",
                p.behavior || "",
                p.impact || "",
                p.action_item || "",
            ]);
        });
        if (rowsToAppend.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: LEARNING_HOURS_SPREADSHEET_ID,
                range: `${sheetName}!A:J`,
                valueInputOption: "USER_ENTERED",
                requestBody: { values: rowsToAppend },
            });
            totalAppended += rowsToAppend.length;
        }
    }
    // 5. Mark session as synced
    await sessionRef.update({
        synced: true,
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
        success: true,
        message: `Synced successfully. ${totalAppended} new rows appended.`,
        appended: totalAppended,
    };
}
// Cloud function: syncLearningPointsToSheet
exports.syncLearningPointsToSheet = (0, https_1.onCall)({
    timeoutSeconds: 300,
    memory: "512MiB",
    secrets: ["SHEETS_SA_KEY"],
}, async (request) => {
    // 1. Auth check
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    if (request.auth.token.isAdmin !== true) {
        throw new https_1.HttpsError("permission-denied", "Only admins may run this sync.");
    }
    const { sessionId } = request.data;
    if (!sessionId) {
        throw new https_1.HttpsError("invalid-argument", "A valid sessionId is required.");
    }
    return await _syncLearningPoints(sessionId);
});
const scheduler_1 = require("firebase-functions/v2/scheduler");
const functions = __importStar(require("firebase-functions"));
exports.autoSyncLearningPoints = (0, scheduler_1.onSchedule)({
    schedule: '0 19 * * 1-6',
    timeZone: 'Asia/Kolkata',
    secrets: ["SHEETS_SA_KEY"],
    timeoutSeconds: 540,
    memory: "512MiB"
}, async (event) => {
    const today = new Date();
    const dateString = (0, date_fns_1.format)(today, "yyyy-MM-dd");
    functions.logger.info(`Running scheduled learning points sync for ${dateString}`);
    try {
        const result = await _syncLearningPoints(dateString);
        functions.logger.info(`Learning points sync completed for ${dateString}: ${result.message}`);
    }
    catch (error) {
        // Check if it's an HttpsError and log accordingly
        if (error.code) {
            functions.logger.error(`Scheduled sync for ${dateString} failed with code ${error.code}:`, error.message);
        }
        else {
            functions.logger.error(`Scheduled sync for ${dateString} failed with an unexpected error:`, error);
        }
    }
});
//# sourceMappingURL=syncLearningHours.js.map