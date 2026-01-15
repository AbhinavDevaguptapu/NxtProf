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
const v2_1 = require("firebase-functions/v2");
// Import timezone functions
const date_fns_tz_1 = require("date-fns-tz");
const date_fns_1 = require("date-fns");
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
    // CORRECT: Always format the date in your target timezone
    const todayDocId = (0, date_fns_tz_1.formatInTimeZone)(now, TIME_ZONE, "yyyy-MM-dd");
    if (dayOfWeek === 0) {
        // Skip Sundays
        v2_1.logger.info("Skipping standup scheduling on Sunday", {
            date: todayDocId,
            timestamp: new Date().toISOString(),
        });
        return;
    }
    // CORRECT: Always format the date in your target timezone
    const standupRef = db.collection("standups").doc(todayDocId);
    // Set standup time to 8:45 AM IST
    // 1. Get today's date string in IST
    const dateString = (0, date_fns_tz_1.formatInTimeZone)(now, TIME_ZONE, "yyyy-MM-dd");
    // 2. Create the full timestamp string for 8:45 AM IST
    const standupTimeInZone = (0, date_fns_tz_1.zonedTimeToUtc)(`${dateString}T08:45:00`, TIME_ZONE);
    try {
        await standupRef.set({
            status: "scheduled",
            scheduledTime: admin.firestore.Timestamp.fromDate(standupTimeInZone),
            scheduledBy: "System Automation",
        });
        v2_1.logger.info("Standup scheduled successfully", {
            date: todayDocId,
            scheduledTime: "08:45 AM IST",
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        v2_1.logger.error("Error scheduling standup", {
            date: todayDocId,
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});
// Function to automatically start the standup
exports.startScheduledStandup = (0, scheduler_1.onSchedule)({
    schedule: "every mon,tue,wed,thu,fri,sat 08:45",
    timeZone: TIME_ZONE,
}, async () => {
    var _a;
    const db = admin.firestore();
    const todayDocId = (0, date_fns_tz_1.formatInTimeZone)(new Date(), TIME_ZONE, "yyyy-MM-dd");
    const standupRef = db.collection("standups").doc(todayDocId);
    try {
        const standupDoc = await standupRef.get();
        if (standupDoc.exists && ((_a = standupDoc.data()) === null || _a === void 0 ? void 0 : _a.status) === "scheduled") {
            // Fetch all employees to initialize tempAttendance
            const employeesSnapshot = await db.collection("employees").get();
            const initialTempAttendance = {};
            employeesSnapshot.forEach((empDoc) => {
                initialTempAttendance[empDoc.id] = "Missed";
            });
            await standupRef.update({
                status: "active",
                startedAt: admin.firestore.FieldValue.serverTimestamp(),
                tempAttendance: initialTempAttendance,
                absenceReasons: {},
            });
            v2_1.logger.info("Standup started successfully", {
                date: todayDocId,
                employeeCount: employeesSnapshot.size,
                timestamp: new Date().toISOString(),
            });
        }
    }
    catch (error) {
        v2_1.logger.error("Error starting standup", {
            date: todayDocId,
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});
// Function to automatically end the standup
exports.endActiveStandup = (0, scheduler_1.onSchedule)({
    schedule: "every mon,tue,wed,thu,fri,sat 09:00",
    timeZone: TIME_ZONE,
}, async () => {
    const db = admin.firestore();
    const todayDocId = (0, date_fns_tz_1.formatInTimeZone)(new Date(), TIME_ZONE, "yyyy-MM-dd");
    const standupRef = db.collection("standups").doc(todayDocId);
    try {
        const standupDoc = await standupRef.get();
        const standupData = standupDoc.data();
        if (standupDoc.exists && (standupData === null || standupData === void 0 ? void 0 : standupData.status) === "active") {
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
                const record = {
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
            v2_1.logger.info("Standup ended successfully", {
                date: todayDocId,
                attendanceRecords: employeesSnapshot.size,
                timestamp: new Date().toISOString(),
            });
        }
    }
    catch (error) {
        v2_1.logger.error("Error ending standup", {
            date: todayDocId,
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});
//# sourceMappingURL=standups.js.map