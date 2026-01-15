import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
// Import timezone functions
import { zonedTimeToUtc, formatInTimeZone } from "date-fns-tz";
import { getDay } from "date-fns";

const TIME_ZONE = "Asia/Kolkata";

// Function to schedule standup
export const scheduleDailyStandup = onSchedule(
  {
    schedule: "every day 08:00",
    timeZone: TIME_ZONE,
  },
  async () => {
    const db = admin.firestore();
    // Get the current date in the specified timezone
    const now = new Date();
    const dayOfWeek = getDay(now);
    // CORRECT: Always format the date in your target timezone
    const todayDocId = formatInTimeZone(now, TIME_ZONE, "yyyy-MM-dd");

    if (dayOfWeek === 0) {
      // Skip Sundays
      logger.info("Skipping standup scheduling on Sunday", {
        date: todayDocId,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    // CORRECT: Always format the date in your target timezone
    const standupRef = db.collection("standups").doc(todayDocId);

    // Set standup time to 8:45 AM IST
    // 1. Get today's date string in IST
    const dateString = formatInTimeZone(now, TIME_ZONE, "yyyy-MM-dd");
    // 2. Create the full timestamp string for 8:45 AM IST
    const standupTimeInZone = zonedTimeToUtc(
      `${dateString}T08:45:00`,
      TIME_ZONE
    );

    try {
      await standupRef.set({
        status: "scheduled",
        scheduledTime: admin.firestore.Timestamp.fromDate(standupTimeInZone),
        scheduledBy: "System Automation",
      });
      logger.info("Standup scheduled successfully", {
        date: todayDocId,
        scheduledTime: "08:45 AM IST",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Error scheduling standup", {
        date: todayDocId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Function to automatically start the standup
export const startScheduledStandup = onSchedule(
  {
    schedule: "every mon,tue,wed,thu,fri,sat 08:45",
    timeZone: TIME_ZONE,
  },
  async () => {
    const db = admin.firestore();
    const todayDocId = formatInTimeZone(new Date(), TIME_ZONE, "yyyy-MM-dd");
    const standupRef = db.collection("standups").doc(todayDocId);

    try {
      const standupDoc = await standupRef.get();
      if (standupDoc.exists && standupDoc.data()?.status === "scheduled") {
        // Fetch all employees to initialize tempAttendance
        const employeesSnapshot = await db.collection("employees").get();
        const initialTempAttendance: { [key: string]: string } = {};
        employeesSnapshot.forEach((empDoc) => {
          initialTempAttendance[empDoc.id] = "Missed";
        });

        await standupRef.update({
          status: "active",
          startedAt: admin.firestore.FieldValue.serverTimestamp(),
          tempAttendance: initialTempAttendance,
          absenceReasons: {},
        });
        logger.info("Standup started successfully", {
          date: todayDocId,
          employeeCount: employeesSnapshot.size,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error("Error starting standup", {
        date: todayDocId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Function to automatically end the standup
export const endActiveStandup = onSchedule(
  {
    schedule: "every mon,tue,wed,thu,fri,sat 09:00",
    timeZone: TIME_ZONE,
  },
  async () => {
    const db = admin.firestore();
    const todayDocId = formatInTimeZone(new Date(), TIME_ZONE, "yyyy-MM-dd");
    const standupRef = db.collection("standups").doc(todayDocId);

    try {
      const standupDoc = await standupRef.get();
      const standupData = standupDoc.data();

      if (standupDoc.exists && standupData?.status === "active") {
        const batch = db.batch();
        const employeesSnapshot = await db.collection("employees").get();

        const tempAttendance = standupData.tempAttendance || {};
        const absenceReasons = standupData.absenceReasons || {};

        employeesSnapshot.forEach((empDoc) => {
          const attendanceDocRef = db
            .collection("attendance")
            .doc(`${todayDocId}_${empDoc.id}`);
          const employeeData = empDoc.data();
          const status = tempAttendance[empDoc.id] || "Missed"; // Use temp status, default to Missed
          const record: any = {
            standup_id: todayDocId,
            employee_id: empDoc.id,
            employee_name: employeeData.name,
            employee_email: employeeData.email,
            employeeId: employeeData.employeeId,
            status: status,
            scheduled_at: standupData.scheduledTime,
            markedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          if (status === "Not Available") {
            record.reason = absenceReasons[empDoc.id] || "No reason provided";
          }

          batch.set(attendanceDocRef, record, { merge: true });
        });

        await batch.commit();
        await standupRef.update({
          status: "ended",
          endedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info("Standup ended successfully", {
          date: todayDocId,
          attendanceRecords: employeesSnapshot.size,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error("Error ending standup", {
        date: todayDocId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);
