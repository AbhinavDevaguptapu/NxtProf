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
exports.getSheetData = exports.getSubsheetNames = exports.analyzeTask = void 0;
/**
 * @file Cloud Functions for task analysis and Google Sheet data retrieval.
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const googleapis_1 = require("googleapis");
const generative_ai_1 = require("@google/generative-ai");
const utils_1 = require("./utils");
exports.analyzeTask = (0, https_1.onCall)({ timeoutSeconds: 120, memory: "512MiB", secrets: ["GEMINI_KEY"] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const { prompt } = request.data;
    try {
        const model = new generative_ai_1.GoogleGenerativeAI((0, utils_1.getGeminiKey)()).getGenerativeModel({ model: "gemini-1.5-flash" });
        const aiRes = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            },
        });
        const aiTxt = aiRes.response.text();
        const js = aiTxt.slice(aiTxt.indexOf("{"), aiTxt.lastIndexOf("}") + 1);
        const obj = JSON.parse(js);
        return obj;
    }
    catch (e) {
        console.error("AI processing error:", e);
        throw new https_1.HttpsError("internal", "Failed to generate AI summary.");
    }
});
exports.getSubsheetNames = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    const SPREADSHEET_ID = "1RIEItNyirXEN_apxmYOlWaV5-rrTxJucyz6-kDu9dWA";
    const isAdmin = request.auth.token.isAdmin === true;
    try {
        const sheets = googleapis_1.google.sheets({ version: "v4", auth: (0, utils_1.getSheetsAuth)() });
        const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        if (!meta.data.sheets)
            return [];
        const allSheetNames = meta.data.sheets
            .map(sheet => { var _a; return ((_a = sheet.properties) === null || _a === void 0 ? void 0 : _a.title) || ""; })
            .filter(Boolean);
        const employeeSheets = allSheetNames
            .map(name => {
            const parts = name.split('|').map(p => p.trim());
            if (parts.length !== 2)
                return null;
            return { name: parts[0], id: parts[1], sheetName: name };
        })
            .filter(Boolean);
        employeeSheets.sort((a, b) => a.name.localeCompare(b.name));
        if (isAdmin) {
            return employeeSheets;
        }
        else {
            const userDoc = await admin.firestore().collection("employees").doc(request.auth.uid).get();
            const employeeId = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.employeeId;
            if (!employeeId) {
                throw new https_1.HttpsError("not-found", "Could not find an employee ID for the current user.");
            }
            const userSheet = employeeSheets.find(sheet => sheet.id === employeeId);
            return userSheet ? [userSheet] : [];
        }
    }
    catch (error) {
        console.error("Error in getSubsheetNames:", error);
        throw new https_1.HttpsError("internal", "Failed to retrieve sheet names.", error.message);
    }
});
exports.getSheetData = (0, https_1.onCall)({ secrets: ["SHEETS_SA_KEY"] }, async (request) => {
    var _a, _b;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    const { sheetName } = request.data;
    if (!sheetName) {
        throw new https_1.HttpsError("invalid-argument", "A sheet name is required.");
    }
    const isAdmin = request.auth.token.isAdmin === true;
    if (!isAdmin) {
        const userDoc = await admin.firestore().collection("employees").doc(request.auth.uid).get();
        const employeeId = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.employeeId;
        const sheetId = (_b = sheetName.split('|').pop()) === null || _b === void 0 ? void 0 : _b.trim();
        if (!employeeId || sheetId !== employeeId) {
            throw new https_1.HttpsError("permission-denied", "You do not have permission to access this sheet.");
        }
    }
    const SPREADSHEET_ID = "1RIEItNyirXEN_apxmYOlWaV5-rrTxJucyz6-kDu9dWA";
    try {
        const sheets = googleapis_1.google.sheets({ version: "v4", auth: (0, utils_1.getSheetsAuth)() });
        const range = `${sheetName}!A:J`;
        const resp = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
        const rows = resp.data.values;
        if (!rows || rows.length < 2)
            return [];
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
            .map(([key]) => REQUIRED_HEADERS[key]);
        if (missingHeaders.length > 0) {
            throw new https_1.HttpsError("failed-precondition", `The sheet is missing required columns: ${missingHeaders.join(', ')}.`);
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
    }
    catch (error) {
        console.error(`Error in getSheetData for sheet ${sheetName}:`, error);
        throw new https_1.HttpsError("internal", "Failed to retrieve and parse sheet data.", error.message);
    }
});
//# sourceMappingURL=taskAnalysis.js.map