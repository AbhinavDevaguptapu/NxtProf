"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeminiKey = getGeminiKey;
exports.getSheetsAuth = getSheetsAuth;
exports.parseDynamicDate = parseDynamicDate;
/**
 * @file Utility functions for Firebase Cloud Functions.
 */
const google_auth_library_1 = require("google-auth-library");
const https_1 = require("firebase-functions/v2/https");
const date_fns_1 = require("date-fns");
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
//# sourceMappingURL=utils.js.map