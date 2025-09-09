import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { startOfMonth, endOfMonth, format, parseISO, eachDayOfInterval, getDay } from "date-fns";

if (admin.apps.length === 0) {
    admin.initializeApp();
}

interface PerformanceRequest {
    employeeId: string;
    month: string; // YYYY-MM format
}

export const getEmployeePerformanceSummary = onCall<PerformanceRequest>({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication is required.");
    }
    if (!request.auth.token.isAdmin) {
        throw new HttpsError("permission-denied", "Only admins can access performance summaries.");
    }

    const { employeeId, month } = request.data;
    if (!employeeId || !month) {
        throw new HttpsError("invalid-argument", "Both employee and month parameters are required.");
    }

    const db = admin.firestore();
    const targetMonth = parseISO(month + "-01");
    const monthStart = startOfMonth(targetMonth);
    const monthEnd = endOfMonth(targetMonth);

    // Calculate working days in the month (excluding Sundays)
    const daysInInterval = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const workingDaysInMonth = daysInInterval.filter(day => getDay(day) !== 0).length; // 0 is Sunday

    try {
        // 1. Fetch Standup Attendance
        const standupQuery = db.collection("attendance")
            .where("employee_id", "==", employeeId)
            .where("standup_id", ">=", format(monthStart, "yyyy-MM-dd"))
            .where("standup_id", "<=", format(monthEnd, "yyyy-MM-dd"));

        const standupSnapshot = await standupQuery.get();
        const standupStats = { present: 0, absent: 0, missed: 0, unavailable: 0 };
        standupSnapshot.forEach(doc => {
            const status = doc.data().status;
            if (status === "Present") standupStats.present++;
            else if (status === "Absent") standupStats.absent++;
            else if (status === "Missed") standupStats.missed++;
            else if (status === "Not Available") standupStats.unavailable++;
        });

        // 2. Fetch Learning Hours Attendance
        const learningQuery = db.collection("learning_hours_attendance")
            .where("employee_id", "==", employeeId)
            .where("learning_hour_id", ">=", format(monthStart, "yyyy-MM-dd"))
            .where("learning_hour_id", "<=", format(monthEnd, "yyyy-MM-dd"));

        const learningSnapshot = await learningQuery.get();
        const learningStats = { present: 0, absent: 0, missed: 0, unavailable: 0 };
        learningSnapshot.forEach(doc => {
            const status = doc.data().status;
            if (status === "Present") learningStats.present++;
            else if (status === "Absent") learningStats.absent++;
            else if (status === "Missed") learningStats.missed++;
            else if (status === "Not Available") learningStats.unavailable++;
        });

        // 3. Presence Donut Chart Data (based on standup attendance)
        const attendedDays = standupStats.present + standupStats.unavailable;
        const presencePercentage = workingDaysInMonth > 0 ? (attendedDays / workingDaysInMonth) * 100 : 0;

        return {
            standupAttendance: standupStats,
            learningAttendance: learningStats,
            monthlyChart: {
                standupDays: standupStats.present,
                learningDays: learningStats.present,
            },
            presenceChart: {
                ...standupStats,
                presencePercentage: presencePercentage.toFixed(1)
            },
            workingDays: workingDaysInMonth
        };

    } catch (error) {
        console.error("Error fetching employee performance summary:", error);
        throw new HttpsError("internal", "An unexpected error occurred while fetching the performance summary.");
    }
});