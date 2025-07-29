/**
 * @file Utility functions for Firebase Cloud Functions.
 */
import { JWT } from "google-auth-library";
import { HttpsError } from "firebase-functions/v2/https";
import { parse, isValid } from "date-fns";

// Helper function to securely get the Gemini API Key
export function getGeminiKey(): string {
    const key = process.env.GEMINI_KEY;
    if (!key) throw new Error("GEMINI_KEY not set in environment.");
    return key;
}

// Helper function to create a Google Sheets API auth client
export function getSheetsAuth(): JWT {
    const saRaw = process.env.SHEETS_SA_KEY!;
    if (!saRaw) throw new HttpsError("internal", "Service Account key is not configured.");
    const sa = JSON.parse(saRaw);
    return new JWT({
        email: sa.client_email,
        key: sa.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
}

// Flexible date parser for handling multiple formats from Google Sheets
export function parseDynamicDate(dateString: string): Date {
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
