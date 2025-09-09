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
exports.getLearningPointsByDate = exports.endLearningSessionAndLockPoints = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const utils_1 = require("./utils");
/**
 * Ends a learning session and locks all associated learning points.
 * This function is callable only by an admin.
*/
exports.endLearningSessionAndLockPoints = (0, https_1.onCall)(async (request) => {
    const db = admin.firestore();
    // 1. Authentication & Authorization Check
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    if (!(0, utils_1.isUserAdmin)(request.auth)) {
        throw new https_1.HttpsError("permission-denied", "Only admins or co-admins can end a session.");
    }
    const { sessionId } = request.data;
    if (!sessionId) {
        throw new https_1.HttpsError("invalid-argument", "A valid session ID must be provided.");
    }
    try {
        const batch = db.batch();
        // 2. Find all learning points associated with this session
        const pointsQuery = db.collection("learning_points").where("sessionId", "==", sessionId);
        const pointsSnapshot = await pointsQuery.get();
        if (!pointsSnapshot.empty) {
            pointsSnapshot.forEach(doc => {
                // Add an update operation to the batch to lock each point
                batch.update(doc.ref, { editable: false });
            });
        }
        // 3. Mark the session itself as 'ended'
        const sessionRef = db.doc(`learning_hours/${sessionId}`);
        batch.update(sessionRef, {
            status: "ended",
            endedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // 4. Commit all the changes at once
        await batch.commit();
        return { success: true, message: `Session ended and ${pointsSnapshot.size} points were locked.` };
    }
    catch (error) {
        console.error("Error ending session and locking points:", error);
        throw new https_1.HttpsError("internal", "An unexpected error occurred while ending the session.");
    }
});
exports.getLearningPointsByDate = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const { date } = request.data || {};
    // Date validation and sanitization
    let targetDate;
    if (date) {
        // Validate and sanitize the client-provided date
        if (typeof date !== "string") {
            throw new https_1.HttpsError("invalid-argument", "Invalid date format.");
        }
        const sanitizedDateStr = date.trim();
        // Validate date format (YYYY-MM-DD)
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(sanitizedDateStr)) {
            throw new https_1.HttpsError("invalid-argument", "Invalid date format. Use YYYY-MM-DD.");
        }
        targetDate = new Date(sanitizedDateStr + "T00:00:00.000Z");
        // Validate the date is not NaN and is reasonable
        if (isNaN(targetDate.getTime())) {
            throw new https_1.HttpsError("invalid-argument", "Invalid date provided.");
        }
        // Prevent access to future dates (prevent enumeration attacks)
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (targetDate > tomorrow) {
            throw new https_1.HttpsError("invalid-argument", "Cannot access data for future dates.");
        }
        // Prevent access to dates too far in the past (prevent abuse)
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (targetDate < oneYearAgo) {
            throw new https_1.HttpsError("invalid-argument", "Cannot access data older than one year.");
        }
    }
    else {
        // Use server-side current date if no date provided
        targetDate = new Date();
    }
    const db = admin.firestore();
    // Determine the start and end of the day in UTC using server-validated date.
    const startDate = new Date(targetDate);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 1);
    try {
        const baseQuery = db.collection("learning_points")
            .where("createdAt", ">=", startDate)
            .where("createdAt", "<", endDate);
        // Allow all users to see all learning points for today's learning
        const snapshot = await baseQuery.get();
        if (snapshot.empty) {
            return [];
        }
        const points = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return points;
    }
    catch (error) {
        console.error("Error fetching learning points:", error);
        throw new https_1.HttpsError("internal", "An unexpected error occurred while fetching learning points.");
    }
});
//# sourceMappingURL=learningSessions.js.map