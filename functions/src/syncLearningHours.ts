import { onCall, HttpsError } from "firebase-functions/v2/https";
import { google } from "googleapis";
import * as admin from "firebase-admin";
import { format } from "date-fns";
import { getLearningHoursSpreadsheetId, getSheetsAuth, isUserAdmin } from "./utils";

type SyncRequest = { sessionId: string };

// Sheets client with service account
function getSheetsClient() {
    return google.sheets({ version: "v4", auth: getSheetsAuth() });
}

// Reusable core logic for syncing
async function _syncLearningPoints(sessionId: string) {
    const db = admin.firestore();
    // Verify session
    const sessionRef = db.doc(`learning_hours/${sessionId}`);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
        throw new HttpsError(
            "not-found",
            "Session not found."
        );
    }

    const sessionData = sessionSnap.data() as any;
    if (sessionData.status !== "ended") {
        throw new HttpsError(
            "failed-precondition",
            "Session must be ended before syncing."
        );
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

    // Group points by user
    type Point = admin.firestore.DocumentData;
    const grouped: Record<string, Point[]> = {};
    pointsSnap.forEach((doc) => {
        const p = doc.data() as Point;
        grouped[p.userId] = grouped[p.userId] ? [...grouped[p.userId], p] : [p];
    });

    // 3. Prepare sheets meta
    const sheets = getSheetsClient();
    const meta = await sheets.spreadsheets.get({
        spreadsheetId: getLearningHoursSpreadsheetId(),
    });
    const allSheets = meta.data.sheets || [];
    const sheetLookup: Record<string, { title: string; sheetId: number }> = {};
    allSheets.forEach((sh) => {
        const title = sh.properties?.title || "";
        const parts = title.split("|").map((s) => s.trim());
        if (parts.length === 2) {
            sheetLookup[parts[1]] = { title, sheetId: sh.properties!.sheetId! };
        }
    });

    // 4. Sync data
    let totalAppended = 0;
    for (const [uid, points] of Object.entries(grouped)) {
        const empSnap = await db.collection("employees").doc(uid).get();
        const employee = empSnap.data();
        if (!employee) continue;

        const { employeeId } = employee as any;
        if (!employeeId || !sheetLookup[employeeId]) {
            console.warn(`No subsheet for employeeId ${employeeId}. Skipping.`);
            continue;
        }

        const sheetName = sheetLookup[employeeId].title;

        // 4a. Existing rows to skip duplicates
        const existingResp = await sheets.spreadsheets.values.get({
            spreadsheetId: getLearningHoursSpreadsheetId(),
            range: `${sheetName}!A:J`,
        });
        const existingRows = existingResp.data.values ?? [];
        const existingKeys = new Set(
            existingRows.slice(1).map((row) => `${row[0]}|${row[1]}|${row[4]}`)
        );

        // 4b. Prepare rows
        const rowsToAppend: string[][] = [];
        points.forEach((p) => {
            const dateStr = p.date
                ? format(p.date.toDate(), "yyyy-MM-dd")
                : format(p.createdAt?.toDate() ?? new Date(), "yyyy-MM-dd");

            const key = `${dateStr}|${p.task_name}|${p.point_type}`;
            if (existingKeys.has(key)) return;

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
                spreadsheetId: getLearningHoursSpreadsheetId(),
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

type SyncByDateRequest = { date: string };

// Cloud function: syncLearningHoursByDate
export const syncLearningHoursByDate = onCall<SyncByDateRequest>(
    {
        timeoutSeconds: 300,
        memory: "512MiB",
        secrets: ["SHEETS_SA_KEY"],
        cors: true
    },
    async (request) => {
        // 1. Auth check
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Authentication required.");
        }
        if (!isUserAdmin(request.auth)) {
            throw new HttpsError(
                "permission-denied",
                "Only admins may run this sync."
            );
        }

        const { date } = request.data;

        // Input validation and sanitization
        if (!date || typeof date !== "string") {
            throw new HttpsError(
                "invalid-argument",
                "A valid date is required."
            );
        }

        const sanitizedDate = date.trim();
        if (sanitizedDate.length === 0 || sanitizedDate.length > 100) {
            throw new HttpsError(
                "invalid-argument",
                "Invalid date format."
            );
        }

        // Check for valid date format (YYYY-MM-DD)
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(sanitizedDate)) {
            throw new HttpsError(
                "invalid-argument",
                "Invalid date format. Use YYYY-MM-DD."
            );
        }

        return await _syncLearningPoints(sanitizedDate);
    }
);

// Cloud function: syncLearningPointsToSheet
export const syncLearningPointsToSheet = onCall<SyncRequest>(
    {
        timeoutSeconds: 300,
        memory: "512MiB",
        secrets: ["SHEETS_SA_KEY"],
        cors: true
    },
    async (request) => {
        // 1. Auth check
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Authentication required.");
        }
        if (!isUserAdmin(request.auth)) {
            throw new HttpsError(
                "permission-denied",
                "Only admins may run this sync."
            );
        }

        const { sessionId } = request.data;

        // Input validation and sanitization
        if (!sessionId || typeof sessionId !== "string") {
            throw new HttpsError(
                "invalid-argument",
                "A valid sessionId is required."
            );
        }

        const sanitizedSessionId = sessionId.trim();
        if (sanitizedSessionId.length === 0 || sanitizedSessionId.length > 100) {
            throw new HttpsError(
                "invalid-argument",
                "Invalid sessionId format."
            );
        }

        // Check for valid format (e.g., date format like YYYY-MM-DD)
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(sanitizedSessionId)) {
            throw new HttpsError(
                "invalid-argument",
                "Invalid sessionId format."
            );
        }

        return await _syncLearningPoints(sanitizedSessionId);
    }
);

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as functions from "firebase-functions";

export const autoSyncLearningPoints = onSchedule(
    {
        schedule: '0 19 * * 1-6',
        timeZone: 'Asia/Kolkata',
        secrets: ["SHEETS_SA_KEY"],
        timeoutSeconds: 540,
        memory: "512MiB"
    },
    async (event) => {
        const today = new Date();
        const dateString = format(today, "yyyy-MM-dd");

        functions.logger.info(`Running scheduled learning points sync for ${dateString}`);

        try {
            const result = await _syncLearningPoints(dateString);
            functions.logger.info(`Learning points sync completed for ${dateString}: ${result.message}`);
        } catch (error: any) {
            // Check if it's an HttpsError and log accordingly
            if (error.code) {
                functions.logger.error(`Scheduled sync for ${dateString} failed with code ${error.code}:`, error.message);
            } else {
                functions.logger.error(`Scheduled sync for ${dateString} failed with an unexpected error:`, error);
            }
        }
    }
);

