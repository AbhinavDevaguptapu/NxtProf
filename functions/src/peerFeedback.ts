import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

interface GivenPeerFeedback {
    giverId: string;
    targetId: string;
    projectOrTask: string;
    workEfficiency: number;
    easeOfWork: number;
    remarks: string;
    createdAt: admin.firestore.FieldValue;
}

// Function to get feedback received by the current user (anonymous)
export const getMyReceivedFeedback = onCall({ cors: true }, async (request) => {
    const db = admin.firestore();
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to view your feedback.");
    }
    const myId = request.auth.uid;

    const givenSnapshot = await db.collection("givenPeerFeedback").where("targetId", "==", myId).orderBy("createdAt", "desc").get();

    const feedback = givenSnapshot.docs.map(doc => {
        const data = doc.data() as GivenPeerFeedback;
        const timestamp = data.createdAt as admin.firestore.Timestamp;
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
export const adminGetAllPeerFeedback = onCall({ cors: true }, async (request) => {
    const db = admin.firestore();
    if (request.auth?.token.isAdmin !== true) {
        throw new HttpsError("permission-denied", "Only admins can access this information.");
    }

    const givenSnapshot = await db.collection("givenPeerFeedback").orderBy("createdAt", "desc").get();

    const feedback = await Promise.all(givenSnapshot.docs.map(async (doc) => {
        const data = doc.data() as GivenPeerFeedback;
        const [giverDoc, receiverDoc] = await Promise.all([
            db.collection("employees").doc(data.giverId).get(),
            db.collection("employees").doc(data.targetId).get()
        ]);

        // Skip feedback if either giver or receiver is archived
        if (giverDoc.data()?.archived === true || receiverDoc.data()?.archived === true) {
            return null;
        }

        const timestamp = data.createdAt as admin.firestore.Timestamp;
        return {
            id: doc.id,
            giver: { id: data.giverId, name: giverDoc.data()?.name || "Unknown" },
            receiver: { id: data.targetId, name: receiverDoc.data()?.name || "Unknown" },
            projectOrTask: data.projectOrTask,
            workEfficiency: data.workEfficiency,
            easeOfWork: data.easeOfWork,
            remarks: data.remarks,
            submittedAt: timestamp ? timestamp.toDate().toISOString() : new Date().toISOString()
        };
    }));

    return feedback.filter(item => item !== null);
});

export const togglePeerFeedbackLock = onCall<{ lock: boolean }>({ cors: true }, async (request) => {
    if (request.auth?.token.isAdmin !== true) {
        throw new HttpsError("permission-denied", "Only admins can toggle the peer feedback lock.");
    }

    const db = admin.firestore();
    const lockRef = db.collection("moduleLocks").doc("peerFeedback");

    try {
        await lockRef.set({ locked: request.data.lock });
        return { success: true, locked: request.data.lock };
    } catch (error) {
        console.error("Error toggling peer feedback lock:", error);
        throw new HttpsError("internal", "An unexpected error occurred while toggling the lock.");
    }
});

export const getPeerFeedbackLockStatus = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication is required.");
    }

    const db = admin.firestore();
    const lockRef = db.collection("moduleLocks").doc("peerFeedback");

    try {
        const doc = await lockRef.get();
        if (!doc.exists) {
            return { locked: false }; // Default to unlocked if not set
        }
        return { locked: doc.data()?.locked || false };
    } catch (error) {
        console.error("Error getting peer feedback lock status:", error);
        throw new HttpsError("internal", "An unexpected error occurred while fetching lock status.");
    }
});

export const givePeerFeedback = onCall<{ targetId: string; projectOrTask: string; workEfficiency: number; easeOfWork: number; remarks: string; }>({ cors: true }, async (request) => {
    const db = admin.firestore();
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to give feedback.");
    }

    const { targetId, projectOrTask, workEfficiency, easeOfWork, remarks } = request.data;

    // Input validation and sanitization
    if (!targetId || typeof targetId !== "string" || targetId.trim().length === 0) {
        throw new HttpsError("invalid-argument", "Valid targetId is required.");
    }
    if (!projectOrTask || typeof projectOrTask !== "string") {
        throw new HttpsError("invalid-argument", "Valid projectOrTask is required.");
    }
    if (!remarks || typeof remarks !== "string") {
        throw new HttpsError("invalid-argument", "Valid remarks are required.");
    }
    if (typeof workEfficiency !== "number" || typeof easeOfWork !== "number") {
        throw new HttpsError("invalid-argument", "Ratings must be valid numbers.");
    }

    // Sanitize inputs
    const sanitizedTargetId = targetId.trim();
    const sanitizedProjectOrTask = projectOrTask.trim().substring(0, 255); // Limit length
    const sanitizedRemarks = remarks.trim().substring(0, 1000); // Limit length

    // Validate rating ranges
    if (workEfficiency < 0 || workEfficiency > 5 || easeOfWork < 0 || easeOfWork > 5) {
        throw new HttpsError("invalid-argument", "Ratings must be between 0 and 5.");
    }

    // Validate lengths
    if (sanitizedTargetId.length > 128 || sanitizedProjectOrTask.length === 0 || sanitizedRemarks.length === 0) {
        throw new HttpsError("invalid-argument", "Input validation failed.");
    }

    const giverId = request.auth.uid;

    try {
        // Check if the module is locked
        const lockRef = db.collection("moduleLocks").doc("peerFeedback");
        const lockDoc = await lockRef.get();
        if (lockDoc.exists && lockDoc.data()?.locked === true) {
            throw new HttpsError("failed-precondition", "Feedback submissions are temporarily disabled.");
        }

        // Prevent race conditions with transaction-based duplicate check and creation
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        try {
            await db.runTransaction(async (transaction) => {
                // Check for existing feedback within transaction
                const existingFeedbackQuery = db.collection("givenPeerFeedback")
                    .where("giverId", "==", giverId)
                    .where("targetId", "==", sanitizedTargetId)
                    .where("createdAt", ">=", startOfMonth)
                    .where("createdAt", "<=", endOfMonth)
                    .limit(1);

                const existingDocSnapshot = await transaction.get(existingFeedbackQuery);

                if (!existingDocSnapshot.empty) {
                    throw new Error("DUPLICATE_FEEDBACK");
                }

                // Create the feedback document
                const feedbackRef = db.collection("givenPeerFeedback").doc();
                const feedback: GivenPeerFeedback = {
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
        } catch (transactionError: any) {
            if (transactionError.message === "DUPLICATE_FEEDBACK") {
                throw new HttpsError("failed-precondition", "You have already given feedback to this user this month.");
            }
            // Re-throw other transaction errors
            throw transactionError;
        }
        return { success: true };
    } catch (error) {
        console.error("Error giving peer feedback:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "An unexpected error occurred while giving feedback.");
    }
});
