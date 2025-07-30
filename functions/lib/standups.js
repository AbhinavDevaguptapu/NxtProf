"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.endActiveStandup = exports.startScheduledStandup = exports.scheduleDailyStandup = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
// Import timezone functions
const date_fns_tz_1 = require("date-fns-tz");
const date_fns_1 = require("date-fns");
// Initialize Firebase Admin if not already done
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const TIME_ZONE = "Asia/Kolkata";
// Function to schedule standup
exports.scheduleDailyStandup = (0, scheduler_1.onSchedule)({
    schedule: "every day 08:00",
    timeZone: TIME_ZONE,
}, async () => {
    const db = admin.firestore();
    // Get the current date in the specified timezone
    const now = new Date();
    const dayOfWeek = (0, date_fns_1.getDay)(now);
    if (dayOfWeek === 0) { // Skip Sundays
        console.log("Skipping standup scheduling on Sunday.");
        return;
    }
    // CORRECT: Always format the date in your target timezone
    const todayDocId = (0, date_fns_tz_1.formatInTimeZone)(now, TIME_ZONE, 'yyyy-MM-dd');
    const standupRef = db.collection("standups").doc(todayDocId);
    // CORRECT: Create the 10:30 AM IST date object correctly
    // 1. Get today's date string in IST
    const dateString = (0, date_fns_tz_1.formatInTimeZone)(now, TIME_ZONE, 'yyyy-MM-dd');
    // 2. Create the full timestamp string for 11:10 AM IST
    const standupTimeInZone = (0, date_fns_tz_1.zonedTimeToUtc)(`${dateString}T09:00:00`, TIME_ZONE);
    try {
        await standupRef.set({
            status: "scheduled",
            scheduledTime: admin.firestore.Timestamp.fromDate(standupTimeInZone),
            scheduledBy: "System Automation",
        });
        console.log(`Successfully scheduled standup for ${todayDocId} at 09:00 AM IST`);
    }
    catch (error) {
        console.error(`Error scheduling standup for ${todayDocId}:`, error);
    }
});
// Function to automatically start the standup
exports.startScheduledStandup = (0, scheduler_1.onSchedule)({
    schedule: "every mon,tue,wed,thu,fri,sat 09:00",
    timeZone: TIME_ZONE,
}, async () => {
    var _a;
    const db = admin.firestore();
    // CORRECT: Get doc ID based on the correct timezone
    const todayDocId = (0, date_fns_tz_1.formatInTimeZone)(new Date(), TIME_ZONE, 'yyyy-MM-dd');
    const standupRef = db.collection("standups").doc(todayDocId);
    try {
        const standupDoc = await standupRef.get();
        if (standupDoc.exists && ((_a = standupDoc.data()) === null || _a === void 0 ? void 0 : _a.status) === "scheduled") {
            await standupRef.update({
                status: "active",
                startedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Successfully started standup for ${todayDocId}`);
        }
    }
    catch (error) {
        console.error(`Error starting standup for ${todayDocId}:`, error);
    }
});
// Function to automatically end the standup
exports.endActiveStandup = (0, scheduler_1.onSchedule)({
    schedule: "every mon,tue,wed,thu,fri,sat 09:15",
    timeZone: TIME_ZONE,
}, async () => {
    const db = admin.firestore();
    const todayDocId = (0, date_fns_tz_1.formatInTimeZone)(new Date(), TIME_ZONE, 'yyyy-MM-dd');
    const standupRef = db.collection("standups").doc(todayDocId);
    try {
        const standupDoc = await standupRef.get();
        const standupData = standupDoc.data();
        if (standupDoc.exists && (standupData === null || standupData === void 0 ? void 0 : standupData.status) === "active") {
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
    }
    catch (error) {
        console.error(`Error ending standup for ${todayDocId}:`, error);
    }
});
//# sourceMappingURL=standups.js.map