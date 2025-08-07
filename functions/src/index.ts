/**
 * @file Cloud Functions for the NxtProf application.
 * @description This file serves as the main entry point for all backend serverless logic.
 * It initializes Firebase and exports all cloud functions from their respective modules.
 */
import * as admin from "firebase-admin";
admin.initializeApp();

// Import all functions from their respective modules.
import { 
    syncAttendanceToSheet, 
    scheduledSync 
} from "./attendanceSync";
import { 
    getFeedbackChartData, 
    getFeedbackAiSummary,
    getRawFeedback
} from "./feedbackAnalysis";
import { 
    endLearningSessionAndLockPoints, 
    getTodaysLearningPoints 
} from "./learningSessions";
import * as peerFeedback from "./peerFeedback";
import { 
    scheduleDailyStandup, 
    startScheduledStandup, 
    endActiveStandup 
} from "./standups";
import { 
    syncLearningPointsToSheet, 
    autoSyncLearningPoints 
} from "./syncLearningHours";
import { 
    analyzeTask, 
    getSubsheetNames, 
    getSheetData 
} from "./taskAnalysis";
import { 
    addAdminRole, 
    removeAdminRole, 
    deleteEmployee, 
    getEmployeesWithAdminStatus 
} from "./users";

// Export all functions for deployment.
export {
    // Attendance
    syncAttendanceToSheet,
    scheduledSync,

    // Feedback Analysis
    getFeedbackChartData,
    getFeedbackAiSummary,
    getRawFeedback,

    // Learning Sessions
    endLearningSessionAndLockPoints,
    getTodaysLearningPoints,
    
    // Learning Hours Sync
    syncLearningPointsToSheet,
    autoSyncLearningPoints,

    // Peer Feedback (exports all functions from the module)
    peerFeedback,

    // Standups
    scheduleDailyStandup,
    startScheduledStandup,
    endActiveStandup,

    // Task Analysis
    analyzeTask,
    getSubsheetNames,
    getSheetData,

    // User Management
    addAdminRole,
    removeAdminRole,
    deleteEmployee,
    getEmployeesWithAdminStatus,
};