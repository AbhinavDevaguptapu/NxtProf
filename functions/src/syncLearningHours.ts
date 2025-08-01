import { onCall, HttpsError } from "firebase-functions/v2/https";
import { google } from "googleapis";
import { JWT } from "google-auth-library";
import * as admin from "firebase-admin";
import { format } from "date-fns";

type SyncRequest = { sessionId: string };

const LEARNING_HOURS_SPREADSHEET_ID =
    "1RIEItNyirXEN_apxmYOlWaV5-rrTxJucyz6-kDu9dWA";

// Sheets client with service account
function getSheetsClient() {
    const saRaw = process.env.SHEETS_SA_KEY;
    if (!saRaw)
        throw new HttpsError("internal", "SHEETS_SA_KEY env var not configured.");

    const sa = JSON.parse(saRaw);
    const auth = new JWT({
        email: sa.client_email,
        key: sa.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    return google.sheets({ version: "v4", auth });
}

// Cloud function: syncLearningPointsToSheet
export const syncLearningPointsToSheet = onCall<SyncRequest>(
    {
        timeoutSeconds: 300,
        memory: "512MiB",
        secrets: ["SHEETS_SA_KEY"],
    },
    async (request) => {
        // 1. Auth check
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Authentication required.");
        }
        if (request.auth.token.isAdmin !== true) {
            throw new HttpsError(
                "permission-denied",
                "Only admins may run this sync."
            );
        }

        const { sessionId } = request.data;
        if (!sessionId) {
            throw new HttpsError(
                "invalid-argument",
                "A valid sessionId is required."
            );
        }

        const db = admin.firestore();
        // Verify session
        const sessionRef = db.doc(`learning_hours/${sessionId}`);
        const sessionSnap = await sessionRef.get();
        if (!sessionSnap.exists) {
            throw new HttpsError(
                "not-found",
                "Learning-hour session document not found."
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
            throw new HttpsError(
                "not-found",
                "No locked learning points found for this session."
            );
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
            spreadsheetId: LEARNING_HOURS_SPREADSHEET_ID,
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
                spreadsheetId: LEARNING_HOURS_SPREADSHEET_ID,
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
);
