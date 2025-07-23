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
exports.endLearningSessionAndLockPoints = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
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
    if (request.auth.token.isAdmin !== true) {
        throw new https_1.HttpsError("permission-denied", "Only admins can end a session.");
    }
    const { sessionId } = request.data;
    if (!sessionId) {
        throw new https_1.HttpsError("invalid-argument", "A valid 'sessionId' must be provided.");
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
//# sourceMappingURL=learningSessions.js.map