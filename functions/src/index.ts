/**
 * @file Cloud Functions for the NxtProf application.
 * @description This file serves as the main entry point for all backend serverless logic.
 * It initializes Firebase and exports all cloud functions from their respective modules.
 */
import * as admin from "firebase-admin";
admin.initializeApp();

// Re-export all functions directly from their respective modules.

// Attendance
export { syncAttendanceToSheet, scheduledSync } from "./attendanceSync";

// Feedback Analysis
export {
  getFeedbackChartData,
  getFeedbackAiSummary,
  getRawFeedback,
} from "./feedbackAnalysis";

// Learning Sessions
export {
  endLearningSessionAndLockPoints,
  getLearningPointsByDate,
} from "./learningSessions";

// Learning Hours Sync
export {
  syncLearningPointsToSheet,
  autoSyncLearningPoints,
  syncLearningHoursByDate,
} from "./syncLearningHours";

// Daily Observations
export {
  addObservation,
  updateObservation,
  deleteObservation,
} from "./dailyObservations";

// Standups
export {
  scheduleDailyStandup,
  startScheduledStandup,
  endActiveStandup,
} from "./standups";

// Task Analysis
export { analyzeTask } from "./taskAnalysis";

// User Management
export {
  addAdminRole,
  removeAdminRole,
  addCoAdminRole,
  removeCoAdminRole,
  deleteEmployee,
  archiveEmployee,
  unarchiveEmployee,
  getEmployeesWithAdminStatus,
  getArchivedEmployees,
  approveUser,
  getUnapprovedUsers,
} from "./users";

// Peer Feedback (exports all functions from the module as a single group)
export * as peerFeedback from "./peerFeedback";

// Performance
export { getEmployeePerformanceSummary } from "./performance";
