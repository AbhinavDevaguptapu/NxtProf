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
exports.getEmployeePerformanceSummary = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const date_fns_1 = require("date-fns");
exports.getEmployeePerformanceSummary = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a;
    const startTime = Date.now();
    const userId = ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || "anonymous";
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    if (!request.auth.token.isAdmin) {
        throw new https_1.HttpsError("permission-denied", "Only admins can access performance summaries.");
    }
    const { employeeId, month } = request.data;
    if (!employeeId || !month) {
        throw new https_1.HttpsError("invalid-argument", "Both employee and month parameters are required.");
    }
    v2_1.logger.info("Performance summary requested", {
        userId,
        targetEmployeeId: employeeId,
        month,
        timestamp: new Date().toISOString(),
    });
    const db = admin.firestore();
    const targetMonth = (0, date_fns_1.parseISO)(month + "-01");
    const monthStart = (0, date_fns_1.startOfMonth)(targetMonth);
    const monthEnd = (0, date_fns_1.endOfMonth)(targetMonth);
    // Calculate working days in the month (excluding Sundays)
    const daysInInterval = (0, date_fns_1.eachDayOfInterval)({
        start: monthStart,
        end: monthEnd,
    });
    const workingDaysInMonth = daysInInterval.filter((day) => (0, date_fns_1.getDay)(day) !== 0).length; // 0 is Sunday
    try {
        // Build queries
        const standupQuery = db
            .collection("attendance")
            .where("employee_id", "==", employeeId)
            .where("standup_id", ">=", (0, date_fns_1.format)(monthStart, "yyyy-MM-dd"))
            .where("standup_id", "<=", (0, date_fns_1.format)(monthEnd, "yyyy-MM-dd"));
        const learningQuery = db
            .collection("learning_hours_attendance")
            .where("employee_id", "==", employeeId)
            .where("learning_hour_id", ">=", (0, date_fns_1.format)(monthStart, "yyyy-MM-dd"))
            .where("learning_hour_id", "<=", (0, date_fns_1.format)(monthEnd, "yyyy-MM-dd"));
        // Execute both queries in parallel for better performance
        const [standupSnapshot, learningSnapshot] = await Promise.all([
            standupQuery.get(),
            learningQuery.get(),
        ]);
        // Process standup attendance
        const standupStats = { present: 0, absent: 0, missed: 0, unavailable: 0 };
        standupSnapshot.forEach((doc) => {
            const status = doc.data().status;
            if (status === "Present")
                standupStats.present++;
            else if (status === "Absent")
                standupStats.absent++;
            else if (status === "Missed")
                standupStats.missed++;
            else if (status === "Not Available")
                standupStats.unavailable++;
        });
        // Process learning hours attendance
        const learningStats = {
            present: 0,
            absent: 0,
            missed: 0,
            unavailable: 0,
        };
        learningSnapshot.forEach((doc) => {
            const status = doc.data().status;
            if (status === "Present")
                learningStats.present++;
            else if (status === "Absent")
                learningStats.absent++;
            else if (status === "Missed")
                learningStats.missed++;
            else if (status === "Not Available")
                learningStats.unavailable++;
        });
        // 3. Presence Donut Chart Data (based on standup attendance)
        const attendedDays = standupStats.present + standupStats.unavailable;
        const presencePercentage = workingDaysInMonth > 0 ? (attendedDays / workingDaysInMonth) * 100 : 0;
        const result = {
            standupAttendance: standupStats,
            learningAttendance: learningStats,
            monthlyChart: {
                standupDays: standupStats.present,
                learningDays: learningStats.present,
            },
            presenceChart: Object.assign(Object.assign({}, standupStats), { presencePercentage: presencePercentage.toFixed(1) }),
            workingDays: workingDaysInMonth,
        };
        v2_1.logger.info("Performance summary completed", {
            userId,
            targetEmployeeId: employeeId,
            durationMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
        });
        return result;
    }
    catch (error) {
        v2_1.logger.error("Error fetching performance summary", {
            userId,
            targetEmployeeId: employeeId,
            error: error.message,
            durationMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
        });
        throw new https_1.HttpsError("internal", "An unexpected error occurred while fetching the performance summary.");
    }
});
//# sourceMappingURL=performance.js.map