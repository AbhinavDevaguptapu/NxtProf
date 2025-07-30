import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
// Import timezone functions
import { zonedTimeToUtc, formatInTimeZone } from 'date-fns-tz';
import { getDay } from "date-fns";

// Initialize Firebase Admin if not already done
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const TIME_ZONE = "Asia/Kolkata";

// Function to schedule standup
export const scheduleDailyStandup = onSchedule({
    schedule: "every day 08:00",
    timeZone: TIME_ZONE,
}, async () => {
    const db = admin.firestore();
    // Get the current date in the specified timezone
    const now = new Date();
    const dayOfWeek = getDay(now);

    if (dayOfWeek === 0) { // Skip Sundays
        console.log("Skipping standup scheduling on Sunday.");
        return;
    }

    // CORRECT: Always format the date in your target timezone
    const todayDocId = formatInTimeZone(now, TIME_ZONE, 'yyyy-MM-dd');
    const standupRef = db.collection("standups").doc(todayDocId);

    // CORRECT: Create the 10:30 AM IST date object correctly
    // 1. Get today's date string in IST
    const dateString = formatInTimeZone(now, TIME_ZONE, 'yyyy-MM-dd');
    // 2. Create the full timestamp string for 11:10 AM IST
    const standupTimeInZone = zonedTimeToUtc(`${dateString}T09:00:00`, TIME_ZONE);

    try {
        await standupRef.set({
            status: "scheduled",
            scheduledTime: admin.firestore.Timestamp.fromDate(standupTimeInZone),
            scheduledBy: "System Automation",
        });
        console.log(`Successfully scheduled standup for ${todayDocId} at 09:00 AM IST`);
    } catch (error) {
        console.error(`Error scheduling standup for ${todayDocId}:`, error);
    }
});

// Function to automatically start the standup
export const startScheduledStandup = onSchedule({
    schedule: "every mon,tue,wed,thu,fri,sat 09:00",
    timeZone: TIME_ZONE,
}, async () => {
    const db = admin.firestore();
    // CORRECT: Get doc ID based on the correct timezone
    const todayDocId = formatInTimeZone(new Date(), TIME_ZONE, 'yyyy-MM-dd');
    const standupRef = db.collection("standups").doc(todayDocId);

    try {
        const standupDoc = await standupRef.get();
        if (standupDoc.exists && standupDoc.data()?.status === "scheduled") {
            await standupRef.update({
                status: "active",
                startedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Successfully started standup for ${todayDocId}`);
        }
    } catch (error) {
        console.error(`Error starting standup for ${todayDocId}:`, error);
    }
});

// Function to automatically end the standup
export const endActiveStandup = onSchedule({
    schedule: "every mon,tue,wed,thu,fri,sat 09:15",
    timeZone: TIME_ZONE,
}, async () => {
    const db = admin.firestore();
    const todayDocId = formatInTimeZone(new Date(), TIME_ZONE, 'yyyy-MM-dd');
    const standupRef = db.collection("standups").doc(todayDocId);

    try {
        const standupDoc = await standupRef.get();
        const standupData = standupDoc.data();

        if (standupDoc.exists && standupData?.status === "active") {
            // ... (rest of your logic is fine)
            const batch = db.batch();
            const employeesSnapshot = await db.collection("employees").get();
            const attendanceSnapshot = await db.collection("attendance").where("standup_id", "==", todayDocId).get();
            const markedEmployeeIds = new Set(attendanceSnapshot.docs.map(doc => doc.data().employee_id));

            employeesSnapshot.forEach(empDoc => {
                if (!markedEmployeeIds.has(empDoc.id)) {
                    const attendanceDocRef = db.collection("attendance").doc(`${todayDocId}_${empDoc.id}`);
                    const employeeData = empDoc.data();
                    const record = {
                        standup_id: todayDocId,
                        employee_id: empDoc.id,
                        employee_name: employeeData.name,
                        employee_email: employeeData.email,
                        employeeId: employeeData.employeeId,
                        status: "Missed",
                        scheduled_at: standupData.scheduledTime,
                        markedAt: admin.firestore.FieldValue.serverTimestamp(),
                    };
                    batch.set(attendanceDocRef, record, { merge: true });
                }
            });

            await batch.commit();
            await standupRef.update({
                status: "ended",
                endedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Successfully ended standup for ${todayDocId}`);
        }
    } catch (error) {
        console.error(`Error ending standup for ${todayDocId}:`, error);
    }
});