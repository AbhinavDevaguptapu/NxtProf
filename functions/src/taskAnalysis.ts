/**
 * @file Cloud Functions for task analysis and Google Sheet data retrieval.
 */
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { google } from "googleapis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSheetsAuth, getGeminiKey } from "./utils";

export const analyzeTask = onCall<{ prompt: string }>(
    { timeoutSeconds: 120, memory: "512MiB", secrets: ["GEMINI_KEY"] },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Authentication required.");
        }

        const { prompt } = request.data;

        try {
            const model = new GoogleGenerativeAI(getGeminiKey()).getGenerativeModel({ model: "gemini-1.5-flash" });
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
        } catch (e) {
            console.error("AI processing error:", e);
            throw new HttpsError("internal", "Failed to generate AI summary.");
        }
    }
);

export const getSubsheetNames = onCall<{}>(
    async (request): Promise<any[]> => {
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
                    if (parts.length !== 2) return null;
                    return { name: parts[0], id: parts[1], sheetName: name };
                })
                .filter(Boolean) as { name: string; id: string; sheetName: string }[];

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

        if (!isAdmin) {
            const userDoc = await admin.firestore().collection("employees").doc(request.auth.uid).get();
            const employeeId = userDoc.data()?.employeeId;
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
