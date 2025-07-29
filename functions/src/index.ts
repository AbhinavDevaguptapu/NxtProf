/**
 * @file Cloud Functions for the NxtProf application.
 * @description This file serves as the main entry point for all backend serverless logic.
 * It initializes Firebase and exports all cloud functions from their respective modules.
 */
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Import and re-export functions from their dedicated modules
import { endLearningSessionAndLockPoints } from "./learningSessions";
import { syncLearningPointsToSheet } from "./syncLearningHours";
import * as peerFeedback from "./peerFeedback";
import * as standups from "./standups";
import { addAdminRole, removeAdminRole, deleteEmployee, getEmployeesWithAdminStatus } from "./users";
import { getFeedbackChartData, getFeedbackAiSummary } from "./feedbackAnalysis";
import { syncAttendanceToSheet, scheduledSync } from "./attendanceSync";
import { analyzeTask, getSubsheetNames, getSheetData } from "./taskAnalysis";

export {
    // Learning Sessions
    endLearningSessionAndLockPoints,
    syncLearningPointsToSheet,

    // Peer Feedback
    peerFeedback,

    // Standups
    standups,

    // User Management
    addAdminRole,
    removeAdminRole,
    deleteEmployee,
    getEmployeesWithAdminStatus,

    // Feedback Analysis
    getFeedbackChartData,
    getFeedbackAiSummary,

    // Attendance Sync
    syncAttendanceToSheet,
    scheduledSync,

    // Task Analysis & Sheet Data
    analyzeTask,
    getSubsheetNames,
    getSheetData,
};
