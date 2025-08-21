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
exports.peerFeedback = exports.getArchivedEmployees = exports.getEmployeesWithAdminStatus = exports.unarchiveEmployee = exports.archiveEmployee = exports.deleteEmployee = exports.removeAdminRole = exports.addAdminRole = exports.getSheetData = exports.getSubsheetNames = exports.analyzeTask = exports.endActiveStandup = exports.startScheduledStandup = exports.scheduleDailyStandup = exports.deleteObservation = exports.updateObservation = exports.addObservation = exports.autoSyncLearningPoints = exports.syncLearningPointsToSheet = exports.getLearningPointsByDate = exports.endLearningSessionAndLockPoints = exports.getRawFeedback = exports.getFeedbackAiSummary = exports.getFeedbackChartData = exports.scheduledSync = exports.syncAttendanceToSheet = void 0;
/**
 * @file Cloud Functions for the NxtProf application.
 * @description This file serves as the main entry point for all backend serverless logic.
 * It initializes Firebase and exports all cloud functions from their respective modules.
 */
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// Re-export all functions directly from their respective modules.
// Attendance
var attendanceSync_1 = require("./attendanceSync");
Object.defineProperty(exports, "syncAttendanceToSheet", { enumerable: true, get: function () { return attendanceSync_1.syncAttendanceToSheet; } });
Object.defineProperty(exports, "scheduledSync", { enumerable: true, get: function () { return attendanceSync_1.scheduledSync; } });
// Feedback Analysis
var feedbackAnalysis_1 = require("./feedbackAnalysis");
Object.defineProperty(exports, "getFeedbackChartData", { enumerable: true, get: function () { return feedbackAnalysis_1.getFeedbackChartData; } });
Object.defineProperty(exports, "getFeedbackAiSummary", { enumerable: true, get: function () { return feedbackAnalysis_1.getFeedbackAiSummary; } });
Object.defineProperty(exports, "getRawFeedback", { enumerable: true, get: function () { return feedbackAnalysis_1.getRawFeedback; } });
// Learning Sessions
var learningSessions_1 = require("./learningSessions");
Object.defineProperty(exports, "endLearningSessionAndLockPoints", { enumerable: true, get: function () { return learningSessions_1.endLearningSessionAndLockPoints; } });
Object.defineProperty(exports, "getLearningPointsByDate", { enumerable: true, get: function () { return learningSessions_1.getLearningPointsByDate; } });
// Learning Hours Sync
var syncLearningHours_1 = require("./syncLearningHours");
Object.defineProperty(exports, "syncLearningPointsToSheet", { enumerable: true, get: function () { return syncLearningHours_1.syncLearningPointsToSheet; } });
Object.defineProperty(exports, "autoSyncLearningPoints", { enumerable: true, get: function () { return syncLearningHours_1.autoSyncLearningPoints; } });
// Daily Observations
var dailyObservations_1 = require("./dailyObservations");
Object.defineProperty(exports, "addObservation", { enumerable: true, get: function () { return dailyObservations_1.addObservation; } });
Object.defineProperty(exports, "updateObservation", { enumerable: true, get: function () { return dailyObservations_1.updateObservation; } });
Object.defineProperty(exports, "deleteObservation", { enumerable: true, get: function () { return dailyObservations_1.deleteObservation; } });
// Standups
var standups_1 = require("./standups");
Object.defineProperty(exports, "scheduleDailyStandup", { enumerable: true, get: function () { return standups_1.scheduleDailyStandup; } });
Object.defineProperty(exports, "startScheduledStandup", { enumerable: true, get: function () { return standups_1.startScheduledStandup; } });
Object.defineProperty(exports, "endActiveStandup", { enumerable: true, get: function () { return standups_1.endActiveStandup; } });
// Task Analysis
var taskAnalysis_1 = require("./taskAnalysis");
Object.defineProperty(exports, "analyzeTask", { enumerable: true, get: function () { return taskAnalysis_1.analyzeTask; } });
Object.defineProperty(exports, "getSubsheetNames", { enumerable: true, get: function () { return taskAnalysis_1.getSubsheetNames; } });
Object.defineProperty(exports, "getSheetData", { enumerable: true, get: function () { return taskAnalysis_1.getSheetData; } });
// User Management
var users_1 = require("./users");
Object.defineProperty(exports, "addAdminRole", { enumerable: true, get: function () { return users_1.addAdminRole; } });
Object.defineProperty(exports, "removeAdminRole", { enumerable: true, get: function () { return users_1.removeAdminRole; } });
Object.defineProperty(exports, "deleteEmployee", { enumerable: true, get: function () { return users_1.deleteEmployee; } });
Object.defineProperty(exports, "archiveEmployee", { enumerable: true, get: function () { return users_1.archiveEmployee; } });
Object.defineProperty(exports, "unarchiveEmployee", { enumerable: true, get: function () { return users_1.unarchiveEmployee; } });
Object.defineProperty(exports, "getEmployeesWithAdminStatus", { enumerable: true, get: function () { return users_1.getEmployeesWithAdminStatus; } });
Object.defineProperty(exports, "getArchivedEmployees", { enumerable: true, get: function () { return users_1.getArchivedEmployees; } });
// Peer Feedback (exports all functions from the module as a single group)
exports.peerFeedback = __importStar(require("./peerFeedback"));
//# sourceMappingURL=index.js.map