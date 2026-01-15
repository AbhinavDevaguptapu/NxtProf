/**
 * @file Cloud Functions for syncing attendance data to Google Sheets.
 */
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { google } from "googleapis";
import {
  getAttendanceSpreadsheetId,
  getSheetsAuth,
  isUserAdmin,
} from "./utils";
import { syncToSheetSchema, validateInput } from "./validation";

interface SyncToSheetData {
  date: string;
  sessionType: "standups" | "learning_hours";
}

async function _syncAttendanceToSheet(data: SyncToSheetData) {
  // Validate input using Zod schema
  const { date, sessionType } = validateInput(syncToSheetSchema, data);

  const SPREADSHEET_ID = getAttendanceSpreadsheetId();
  const db = admin.firestore();

  const collectionName =
    sessionType === "standups" ? "attendance" : "learning_hours_attendance";
  const idField =
    sessionType === "standups" ? "standup_id" : "learning_hour_id";
  const q = db.collection(collectionName).where(idField, "==", date);
  const snapshot = await q.get();

  if (snapshot.empty) {
    logger.info("No Firestore records found", { date, sessionType });
    return {
      success: true,
      message: `No Firestore records found for ${date}. Sheet was not modified.`,
    };
  }

  const recordsToSync = snapshot.docs.map((doc) => {
    const data = doc.data();
    const options: Intl.DateTimeFormatOptions = {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    };
    const scheduledTime = data.scheduled_at
      ? new Date(data.scheduled_at.toMillis()).toLocaleTimeString(
          "en-US",
          options
        )
      : "N/A";
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
    const sheets = google.sheets({ version: "v4", auth: getSheetsAuth() });

    const spreadsheetMeta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const allSheets = spreadsheetMeta.data.sheets;
    if (!allSheets || allSheets.length < 2) {
      throw new HttpsError(
        "not-found",
        "The spreadsheet must contain at least two sheets."
      );
    }

    const targetSheetIndex = sessionType === "standups" ? 0 : 1;
    const targetSheet = allSheets[targetSheetIndex];

    if (!targetSheet) {
      throw new HttpsError(
        "not-found",
        `No sheet found at index ${targetSheetIndex}.`
      );
    }

    const props = targetSheet.properties || {};
    if (props.sheetId == null || props.title == null) {
      throw new HttpsError(
        "not-found",
        `Sheet at index ${targetSheetIndex} is missing an ID or title.`
      );
    }

    const sheetId = props.sheetId;
    const sheetName = props.title;

    const rangeToRead = `${sheetName}!A2:A`;
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: rangeToRead,
    });

    const rowsToDelete: any[] = [];
    if (existingData.data.values) {
      existingData.data.values.forEach((row, index) => {
        if (row[0] === date) {
          rowsToDelete.push({
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: index + 1,
                endIndex: index + 2,
              },
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
      logger.info("Deleted old rows", { count: rowsToDelete.length, date });
    }

    if (recordsToSync.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A:H`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: recordsToSync },
      });
      return {
        success: true,
        message: `Successfully synced ${recordsToSync.length} records.`,
      };
    } else {
      return {
        success: true,
        message: `No Firestore records found for ${date}. Existing sheet data was cleared.`,
      };
    }
  } catch (err: any) {
    logger.error("Google Sheets sync failed", {
      error: err.message,
      date: data.date,
      sessionType: data.sessionType,
    });
    throw new HttpsError(
      "internal",
      "An error occurred while syncing to the sheet. " + err.message
    );
  }
}

export const syncAttendanceToSheet = onCall<SyncToSheetData>(
  {
    timeoutSeconds: 120,
    memory: "256MiB",
    secrets: ["SHEETS_SA_KEY"],
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }
    if (!isUserAdmin(request.auth)) {
      throw new HttpsError(
        "permission-denied",
        "Must be an admin to run this operation."
      );
    }

    return await _syncAttendanceToSheet(request.data);
  }
);

export const scheduledSync = onSchedule(
  {
    schedule: "30 19 * * 1-6",
    timeZone: "Asia/Kolkata",
    secrets: ["SHEETS_SA_KEY"],
    timeoutSeconds: 300,
    memory: "256MiB",
  },
  async (event: { scheduleTime: any }) => {
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];

    logger.info("Starting scheduled sync", {
      scheduleTime: event.scheduleTime,
      date: dateString,
    });

    try {
      const standupResult = await _syncAttendanceToSheet({
        date: dateString,
        sessionType: "standups",
      });
      logger.info("Standups sync completed", {
        message: standupResult.message,
      });

      const learningHoursResult = await _syncAttendanceToSheet({
        date: dateString,
        sessionType: "learning_hours",
      });
      logger.info("Learning hours sync completed", {
        message: learningHoursResult.message,
      });
    } catch (error: any) {
      logger.error("Scheduled sync failed", {
        error: error.message,
        date: dateString,
      });
    }
  }
);
