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
exports.getRawFeedback = exports.getFeedbackAiSummary = exports.getFeedbackChartData = void 0;
/**
 * @file Cloud Functions for feedback analysis.
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const googleapis_1 = require("googleapis");
const generative_ai_1 = require("@google/generative-ai");
const utils_1 = require("./utils");
const date_fns_1 = require("date-fns");
async function getFilteredFeedbackData(requestData) {
    var _a, _b, _c;
    const { employeeId, timeFrame, date, startDate, endDate } = requestData;
    const empDoc = await admin.firestore().collection("employees").doc(employeeId).get();
    const sheetUrl = (_a = empDoc.data()) === null || _a === void 0 ? void 0 : _a.feedbackSheetUrl;
    if (typeof sheetUrl !== "string")
        throw new https_1.HttpsError("not-found", "No feedback sheet URL configured.");
    const sheetIdMatch = sheetUrl.match(/\/d\/([\w-]+)/);
    if (!sheetIdMatch)
        throw new https_1.HttpsError("invalid-argument", "Invalid Google Sheet URL format.");
    const spreadsheetId = sheetIdMatch[1];
    const sheets = googleapis_1.google.sheets({ version: "v4", auth: (0, utils_1.getSheetsAuth)() });
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
            date: (0, utils_1.parseDynamicDate)(((_a = r[0]) === null || _a === void 0 ? void 0 : _a.toString()) || ""),
            understanding: Number(r[1]) || 0,
            instructor: Number(r[2]) || 0,
            comment: (r[3] || "").toString().trim(),
        });
    }).filter(x => (0, date_fns_1.isValid)(x.date));
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
    return [];
}
exports.getFeedbackChartData = (0, https_1.onCall)({ timeoutSeconds: 60, memory: "256MiB", secrets: ["SHEETS_SA_KEY"], cors: true }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    // Authorization check: users can only access their own feedback data unless they're admins
    const isAdmin = request.auth.token.isAdmin === true || request.auth.token.isCoAdmin === true;
    if (!isAdmin && request.auth.uid !== request.data.employeeId) {
        throw new https_1.HttpsError("permission-denied", "You can only access your own feedback data.");
    }
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
            avgUnderstanding: sumU / totalFeedbacks,
            avgInstructor: sumI / totalFeedbacks,
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
            understanding: sortedKeys.map(k => dailyAggregates.get(k).sumU / dailyAggregates.get(k).count),
            instructor: sortedKeys.map(k => dailyAggregates.get(k).sumI / dailyAggregates.get(k).count),
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
            understanding: sortedKeys.map(k => monthlyAggregates.get(k).sumU / monthlyAggregates.get(k).count),
            instructor: sortedKeys.map(k => monthlyAggregates.get(k).sumI / monthlyAggregates.get(k).count),
        };
    }
    return { totalFeedbacks, graphData, graphTimeseries };
});
exports.getFeedbackAiSummary = (0, https_1.onCall)({ timeoutSeconds: 120, memory: "512MiB", secrets: ["GEMINI_KEY", "SHEETS_SA_KEY"], cors: true }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    // Authorization check: users can only access their own feedback data unless they're admins
    const isAdmin = request.auth.token.isAdmin === true || request.auth.token.isCoAdmin === true;
    if (!isAdmin && request.auth.uid !== request.data.employeeId) {
        throw new https_1.HttpsError("permission-denied", "You can only access your own feedback data.");
    }
    const filteredData = await getFilteredFeedbackData(request.data);
    const skip = ["na", "n/a", "none", "ntg", "nil", ""];
    const comments = filteredData.map(x => x.comment).filter(t => t && !skip.includes(t.toLowerCase()));
    if (comments.length === 0) {
        return { positiveFeedback: [], improvementAreas: [] };
    }
    try {
        const model = new generative_ai_1.GoogleGenerativeAI((0, utils_1.getGeminiKey)()).getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        const prompt = `From the following list of verbatim feedback comments, perform an analysis. Return a valid JSON object with two keys: "positiveFeedback" and "improvementAreas". For "positiveFeedback", return an array of up to 3 objects, where each object has a "quote" key (the verbatim positive comment) and a "keywords" key (an array of 1-3 relevant keywords from the quote). For "improvementAreas", return an array of up to 3 objects, where each object has a "theme" key (a summarized topic like 'Pacing' or 'Interaction') and a "suggestion" key (a concise, actionable suggestion for the instructor). If the comments do not contain explicit areas for improvement, analyze the context and provide general best-practice suggestions that could still enhance performance. If there are no comments that fit a category, return an empty array for that key. Comments: """${comments.join("\n")}"""`;
        const aiRes = await model.generateContent(prompt);
        const aiTxt = aiRes.response.text();
        const js = aiTxt.slice(aiTxt.indexOf("{"), aiTxt.lastIndexOf("}") + 1);
        try {
            const obj = JSON.parse(js);
            return {
                positiveFeedback: obj.positiveFeedback || [],
                improvementAreas: obj.improvementAreas || [],
            };
        }
        catch (parseError) {
            console.error("Failed to parse AI response as JSON:", parseError);
            console.error("AI Response text:", aiTxt);
            return {
                positiveFeedback: [],
                improvementAreas: [],
            };
        }
    }
    catch (e) {
        console.error("AI processing error:", e);
        throw new https_1.HttpsError("internal", "Failed to generate AI summary.");
    }
});
exports.getRawFeedback = (0, https_1.onCall)({ timeoutSeconds: 60, memory: "256MiB", secrets: ["SHEETS_SA_KEY"], cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    // Authorization check: users can only access their own feedback data unless they're admins
    const isAdmin = request.auth.token.isAdmin === true || request.auth.token.isCoAdmin === true;
    if (!isAdmin && request.auth.uid !== request.data.employeeId) {
        throw new https_1.HttpsError("permission-denied", "You can only access your own feedback data.");
    }
    const filteredData = await getFilteredFeedbackData(request.data);
    // The date objects from getFilteredFeedbackData were parsed assuming the server's
    // local timezone. We format them back into a string representing that local time,
    // and then append the correct IST offset (+05:30) to create a timezone-aware
    // ISO 8601 string for the frontend.
    return filteredData.map(row => {
        const localTimeStr = (0, date_fns_1.format)(row.date, "yyyy-MM-dd'T'HH:mm:ss");
        return Object.assign(Object.assign({}, row), { date: `${localTimeStr}+05:30` });
    });
});
//# sourceMappingURL=feedbackAnalysis.js.map