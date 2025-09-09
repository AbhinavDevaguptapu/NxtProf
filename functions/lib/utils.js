"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGeminiKey = getGeminiKey;
exports.getAttendanceSpreadsheetId = getAttendanceSpreadsheetId;
exports.getLearningHoursSpreadsheetId = getLearningHoursSpreadsheetId;
exports.getSheetsAuth = getSheetsAuth;
exports.parseDynamicDate = parseDynamicDate;
exports.isUserAdmin = isUserAdmin;
exports.isUserSuperAdmin = isUserSuperAdmin;
exports.validateAndSanitizeDate = validateAndSanitizeDate;
/**
 * @file Utility functions for Firebase Cloud Functions.
 */
const google_auth_library_1 = require("google-auth-library");
const https_1 = require("firebase-functions/v2/https");
const date_fns_1 = require("date-fns");
// Helper function to securely get the Gemini API Key
function getGeminiKey() {
    const key = process.env.GEMINI_KEY;
    if (!key || typeof key !== "string" || key.trim().length === 0) {
        throw new https_1.HttpsError("internal", "AI services are temporarily unavailable.");
    }
    return key.trim();
}
// Helper function to securely get the Attendance Spreadsheet ID
function getAttendanceSpreadsheetId() {
    const id = process.env.ATTENDANCE_SPREADSHEET_ID;
    if (!id || typeof id !== "string" || id.trim().length === 0) {
        throw new https_1.HttpsError("internal", "Reporting services are temporarily unavailable.");
    }
    return id.trim();
}
// Helper function to securely get the Learning Hours Spreadsheet ID
function getLearningHoursSpreadsheetId() {
    const id = process.env.LEARNING_HOURS_SPREADSHEET_ID;
    if (!id || typeof id !== "string" || id.trim().length === 0) {
        throw new https_1.HttpsError("internal", "Reporting services are temporarily unavailable.");
    }
    return id.trim();
}
// Helper function to create a Google Sheets API auth client
function getSheetsAuth() {
    const saRaw = process.env.SHEETS_SA_KEY;
    if (!saRaw || typeof saRaw !== "string" || saRaw.trim().length === 0) {
        throw new https_1.HttpsError("internal", "Reporting services are temporarily unavailable.");
    }
    let sa;
    try {
        sa = JSON.parse(saRaw.trim());
    }
    catch (error) {
        console.error("Invalid Service Account key format:", error);
        throw new https_1.HttpsError("internal", "Reporting services are temporarily unavailable.");
    }
    // Validate required fields
    if (!sa.client_email || !sa.private_key) {
        throw new https_1.HttpsError("internal", "Reporting services are temporarily unavailable.");
    }
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
/**
 * Utility function to check if a user has admin or co-admin privileges
 * Standardizes admin role validation across all functions
 */
function isUserAdmin(auth) {
    if (!auth || !auth.token)
        return false;
    return auth.token.isAdmin === true || auth.token.isCoAdmin === true;
}
;
/**
 * Utility function to check if a user has admin privileges only (not co-admin)
 */
function isUserSuperAdmin(auth) {
    if (!auth || !auth.token)
        return false;
    return auth.token.isAdmin === true;
}
;
/**
 * Validates and sanitizes a client-provided date string
 * Prevents timestamp manipulation attacks by enforcing server-side validation
 */
function validateAndSanitizeDate(dateStr, allowFuture = false) {
    if (!dateStr || typeof dateStr !== "string") {
        return null; // Will use server current date
    }
    const sanitizedDateStr = dateStr.trim();
    // Validate date format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
    const datePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
    if (!datePattern.test(sanitizedDateStr)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid date format.");
    }
    const targetDate = new Date(sanitizedDateStr);
    // Validate the date is not NaN and is reasonable
    if (isNaN(targetDate.getTime())) {
        throw new https_1.HttpsError("invalid-argument", "Invalid date provided.");
    }
    const now = new Date();
    if (!allowFuture) {
        // Prevent access to future dates by default
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (targetDate > tomorrow) {
            throw new https_1.HttpsError("invalid-argument", "Cannot access data for future dates.");
        }
    }
    // Prevent access to dates too far in the past (prevent abuse)
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (targetDate < oneYearAgo) {
        throw new https_1.HttpsError("invalid-argument", "Cannot access data older than one year.");
    }
    return targetDate;
}
;
//# sourceMappingURL=utils.js.map