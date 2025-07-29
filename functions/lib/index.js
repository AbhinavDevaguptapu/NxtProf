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
exports.getSheetData = exports.getSubsheetNames = exports.analyzeTask = exports.scheduledSync = exports.syncAttendanceToSheet = exports.getFeedbackAiSummary = exports.getFeedbackChartData = exports.getEmployeesWithAdminStatus = exports.deleteEmployee = exports.removeAdminRole = exports.addAdminRole = exports.standups = exports.peerFeedback = exports.syncLearningPointsToSheet = exports.endLearningSessionAndLockPoints = void 0;
/**
 * @file Cloud Functions for the NxtProf application.
 * @description This file serves as the main entry point for all backend serverless logic.
 * It initializes Firebase and exports all cloud functions from their respective modules.
 */
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK
admin.initializeApp();
// Import and re-export functions from their dedicated modules
const learningSessions_1 = require("./learningSessions");
Object.defineProperty(exports, "endLearningSessionAndLockPoints", { enumerable: true, get: function () { return learningSessions_1.endLearningSessionAndLockPoints; } });
const syncLearningHours_1 = require("./syncLearningHours");
Object.defineProperty(exports, "syncLearningPointsToSheet", { enumerable: true, get: function () { return syncLearningHours_1.syncLearningPointsToSheet; } });
const peerFeedback = __importStar(require("./peerFeedback"));
exports.peerFeedback = peerFeedback;
const standups = __importStar(require("./standups"));
exports.standups = standups;
const users_1 = require("./users");
Object.defineProperty(exports, "addAdminRole", { enumerable: true, get: function () { return users_1.addAdminRole; } });
Object.defineProperty(exports, "removeAdminRole", { enumerable: true, get: function () { return users_1.removeAdminRole; } });
Object.defineProperty(exports, "deleteEmployee", { enumerable: true, get: function () { return users_1.deleteEmployee; } });
Object.defineProperty(exports, "getEmployeesWithAdminStatus", { enumerable: true, get: function () { return users_1.getEmployeesWithAdminStatus; } });
const feedbackAnalysis_1 = require("./feedbackAnalysis");
Object.defineProperty(exports, "getFeedbackChartData", { enumerable: true, get: function () { return feedbackAnalysis_1.getFeedbackChartData; } });
Object.defineProperty(exports, "getFeedbackAiSummary", { enumerable: true, get: function () { return feedbackAnalysis_1.getFeedbackAiSummary; } });
const attendanceSync_1 = require("./attendanceSync");
Object.defineProperty(exports, "syncAttendanceToSheet", { enumerable: true, get: function () { return attendanceSync_1.syncAttendanceToSheet; } });
Object.defineProperty(exports, "scheduledSync", { enumerable: true, get: function () { return attendanceSync_1.scheduledSync; } });
const taskAnalysis_1 = require("./taskAnalysis");
Object.defineProperty(exports, "analyzeTask", { enumerable: true, get: function () { return taskAnalysis_1.analyzeTask; } });
Object.defineProperty(exports, "getSubsheetNames", { enumerable: true, get: function () { return taskAnalysis_1.getSubsheetNames; } });
Object.defineProperty(exports, "getSheetData", { enumerable: true, get: function () { return taskAnalysis_1.getSheetData; } });
//# sourceMappingURL=index.js.map