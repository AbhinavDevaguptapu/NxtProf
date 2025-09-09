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
exports.givePeerFeedback = exports.getPeerFeedbackLockStatus = exports.togglePeerFeedbackLock = exports.adminGetAllPeerFeedback = exports.getMyReceivedFeedback = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
// Function to get feedback received by the current user (anonymous)
exports.getMyReceivedFeedback = (0, https_1.onCall)({ cors: true }, async (request) => {
    const db = admin.firestore();
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to view your feedback.");
    }
    const myId = request.auth.uid;
    const givenSnapshot = await db.collection("givenPeerFeedback").where("targetId", "==", myId).orderBy("createdAt", "desc").get();
    const feedback = givenSnapshot.docs.map(doc => {
        const data = doc.data();
        const timestamp = data.createdAt;
        return {
            id: doc.id,
            projectOrTask: data.projectOrTask,
            workEfficiency: data.workEfficiency,
            easeOfWork: data.easeOfWork,
            remarks: data.remarks,
            submittedAt: timestamp ? timestamp.toDate().toISOString() : new Date().toISOString()
        };
    });
    return feedback;
});
// Function for admins to get all feedback (not anonymous)
exports.adminGetAllPeerFeedback = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a;
    const db = admin.firestore();
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.isAdmin) !== true) {
        throw new https_1.HttpsError("permission-denied", "Only admins can access this information.");
    }
    const givenSnapshot = await db.collection("givenPeerFeedback").orderBy("createdAt", "desc").get();
    const feedback = await Promise.all(givenSnapshot.docs.map(async (doc) => {
        var _a, _b, _c, _d;
        const data = doc.data();
        const [giverDoc, receiverDoc] = await Promise.all([
            db.collection("employees").doc(data.giverId).get(),
            db.collection("employees").doc(data.targetId).get()
        ]);
        // Skip feedback if either giver or receiver is archived
        if (((_a = giverDoc.data()) === null || _a === void 0 ? void 0 : _a.archived) === true || ((_b = receiverDoc.data()) === null || _b === void 0 ? void 0 : _b.archived) === true) {
            return null;
        }
        const timestamp = data.createdAt;
        return {
            id: doc.id,
            giver: { id: data.giverId, name: ((_c = giverDoc.data()) === null || _c === void 0 ? void 0 : _c.name) || "Unknown" },
            receiver: { id: data.targetId, name: ((_d = receiverDoc.data()) === null || _d === void 0 ? void 0 : _d.name) || "Unknown" },
            projectOrTask: data.projectOrTask,
            workEfficiency: data.workEfficiency,
            easeOfWork: data.easeOfWork,
            remarks: data.remarks,
            submittedAt: timestamp ? timestamp.toDate().toISOString() : new Date().toISOString()
        };
    }));
    return feedback.filter(item => item !== null);
});
exports.togglePeerFeedbackLock = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a;
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.isAdmin) !== true) {
        throw new https_1.HttpsError("permission-denied", "Only admins can toggle the peer feedback lock.");
    }
    const db = admin.firestore();
    const lockRef = db.collection("moduleLocks").doc("peerFeedback");
    try {
        await lockRef.set({ locked: request.data.lock });
        return { success: true, locked: request.data.lock };
    }
    catch (error) {
        console.error("Error toggling peer feedback lock:", error);
        throw new https_1.HttpsError("internal", "An unexpected error occurred while toggling the lock.");
    }
});
exports.getPeerFeedbackLockStatus = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    const db = admin.firestore();
    const lockRef = db.collection("moduleLocks").doc("peerFeedback");
    try {
        const doc = await lockRef.get();
        if (!doc.exists) {
            return { locked: false }; // Default to unlocked if not set
        }
        return { locked: ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.locked) || false };
    }
    catch (error) {
        console.error("Error getting peer feedback lock status:", error);
        throw new https_1.HttpsError("internal", "An unexpected error occurred while fetching lock status.");
    }
});
exports.givePeerFeedback = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a;
    const db = admin.firestore();
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to give feedback.");
    }
    const { targetId, projectOrTask, workEfficiency, easeOfWork, remarks } = request.data;
    // Input validation and sanitization
    if (!targetId || typeof targetId !== "string" || targetId.trim().length === 0) {
        throw new https_1.HttpsError("invalid-argument", "Valid targetId is required.");
    }
    if (!projectOrTask || typeof projectOrTask !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Valid projectOrTask is required.");
    }
    if (!remarks || typeof remarks !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Valid remarks are required.");
    }
    if (typeof workEfficiency !== "number" || typeof easeOfWork !== "number") {
        throw new https_1.HttpsError("invalid-argument", "Ratings must be valid numbers.");
    }
    // Sanitize inputs
    const sanitizedTargetId = targetId.trim();
    const sanitizedProjectOrTask = projectOrTask.trim().substring(0, 255); // Limit length
    const sanitizedRemarks = remarks.trim().substring(0, 1000); // Limit length
    // Validate rating ranges
    if (workEfficiency < 0 || workEfficiency > 5 || easeOfWork < 0 || easeOfWork > 5) {
        throw new https_1.HttpsError("invalid-argument", "Ratings must be between 0 and 5.");
    }
    // Validate lengths
    if (sanitizedTargetId.length > 128 || sanitizedProjectOrTask.length === 0 || sanitizedRemarks.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "Input validation failed.");
    }
    const giverId = request.auth.uid;
    try {
        // Check if the module is locked
        const lockRef = db.collection("moduleLocks").doc("peerFeedback");
        const lockDoc = await lockRef.get();
        if (lockDoc.exists && ((_a = lockDoc.data()) === null || _a === void 0 ? void 0 : _a.locked) === true) {
            throw new https_1.HttpsError("failed-precondition", "Feedback submissions are temporarily disabled.");
        }
        // Prevent race conditions with transaction-based duplicate check and creation
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        try {
            await db.runTransaction(async (transaction) => {
                // Check for existing feedback within transaction
                const existingFeedbackQuery = db.collection("givenPeerFeedback")
                    .where("giverId", "==", giverId)
                    .where("targetId", "==", sanitizedTargetId)
                    .where("createdAt", ">=", startOfMonth)
                    .limit(1);
                const existingDocSnapshot = await transaction.get(existingFeedbackQuery);
                if (!existingDocSnapshot.empty) {
                    throw new Error("DUPLICATE_FEEDBACK");
                }
                // Create the feedback document
                const feedbackRef = db.collection("givenPeerFeedback").doc();
                const feedback = {
                    giverId,
                    targetId: sanitizedTargetId,
                    projectOrTask: sanitizedProjectOrTask,
                    workEfficiency,
                    easeOfWork,
                    remarks: sanitizedRemarks,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                };
                transaction.set(feedbackRef, feedback);
            });
        }
        catch (transactionError) {
            if (transactionError.message === "DUPLICATE_FEEDBACK") {
                throw new https_1.HttpsError("failed-precondition", "You have already given feedback to this user this month.");
            }
            // Re-throw other transaction errors
            throw transactionError;
        }
        return { success: true };
    }
    catch (error) {
        console.error("Error giving peer feedback:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "An unexpected error occurred while giving feedback.");
    }
});
//# sourceMappingURL=peerFeedback.js.map