import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { format, getDay } from "date-fns";

const TIME_ZONE = "Asia/Kolkata";

// Function to schedule standup at 9:00 AM, skipping Sundays
export const scheduleDailyStandup = onSchedule({
    schedule: "every day 01:00",
    timeZone: TIME_ZONE,
}, async () => {
    const db = admin.firestore();
    const today = new Date();
    const dayOfWeek = getDay(today); // Sunday is 0

    if (dayOfWeek === 0) { // Skip Sundays
        console.log("Skipping standup scheduling on Sunday.");
        return;
    }

    const todayDocId = format(today, "yyyy-MM-dd");
    const standupRef = db.collection("standups").doc(todayDocId);

    const standupTime = new Date(today);
    standupTime.setHours(9, 0, 0, 0); // 9:00 AM

    try {
        await standupRef.set({
            status: "scheduled",
            scheduledTime: admin.firestore.Timestamp.fromDate(standupTime),
            scheduledBy: "System Automation",
        });
        console.log(`Successfully scheduled standup for ${todayDocId}`);
    } catch (error) {
        console.error(`Error scheduling standup for ${todayDocId}:`, error);
    }
});

// Function to automatically start the standup at 9:00 AM
export const startScheduledStandup = onSchedule({
    schedule: "every mon,tue,wed,thu,fri,sat 09:00",
    timeZone: TIME_ZONE,
}, async () => {
    const db = admin.firestore();
    const today = new Date();
    const todayDocId = format(today, "yyyy-MM-dd");
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

// Function to automatically end the standup at 9:15 AM
export const endActiveStandup = onSchedule({
    schedule: "every mon,tue,wed,thu,fri,sat 09:15",
    timeZone: TIME_ZONE,
}, async () => {
    const db = admin.firestore();
    const today = new Date();
    const todayDocId = format(today, "yyyy-MM-dd");
    const standupRef = db.collection("standups").doc(todayDocId);

    try {
        const standupDoc = await standupRef.get();
        const standupData = standupDoc.data();

        if (standupDoc.exists && standupData?.status === "active") {
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

