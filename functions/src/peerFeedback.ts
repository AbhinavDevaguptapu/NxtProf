
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

interface PeerFeedbackRequest {
    requesterId: string;
    requesterName: string;
    targetId: string;
    targetName: string;
    message: string;
    status: "pending" | "completed";
    createdAt: admin.firestore.FieldValue;
}

interface GivenPeerFeedback {
    giverId: string;
    targetId: string;
    projectOrTask: string;
    workEfficiency: number;
    easeOfWork: number;
    remarks: string;
    createdAt: admin.firestore.FieldValue;
    type: 'direct' | 'requested';
}

// Callable function for a user to request feedback from another user
export const requestPeerFeedback = onCall<{ targetId: string; message: string }>(async (request) => {
    const db = admin.firestore();
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to request feedback.");
    }

    const { targetId, message } = request.data;
    if (!targetId) {
        throw new HttpsError("invalid-argument", "A target user ID must be provided.");
    }

    const requesterId = request.auth.uid;

    try {
        // Check if feedback has already been given
        const existingFeedbackQuery = await db.collection("givenPeerFeedback")
            .where("giverId", "==", targetId)
            .where("targetId", "==", requesterId)
            .limit(1)
            .get();

        if (!existingFeedbackQuery.empty) {
            throw new HttpsError("failed-precondition", "You have already received feedback from this user.");
        }

        // Fetch requester and target user data to store their names
        const requesterDoc = await db.collection("employees").doc(requesterId).get();
        const targetDoc = await db.collection("employees").doc(targetId).get();

        if (!requesterDoc.exists || !targetDoc.exists) {
            throw new HttpsError("not-found", "One of the users involved does not exist.");
        }

        const requesterName = requesterDoc.data()?.name || "Unknown User";
        const targetName = targetDoc.data()?.name || "Unknown User";

        const feedbackRequest: PeerFeedbackRequest = {
            requesterId,
            requesterName,
            targetId,
            targetName,
            message,
            status: "pending",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection("peerFeedbackRequests").add(feedbackRequest);

        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error requesting peer feedback:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "An unexpected error occurred while requesting feedback.");
    }
});

// Callable function to submit feedback in response to a request
export const submitPeerFeedback = onCall<{ requestId: string; projectOrTask: string; workEfficiency: number; easeOfWork: number; remarks: string; }>(async (request) => {
    const db = admin.firestore();
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to submit feedback.");
    }

    const { requestId, projectOrTask, workEfficiency, easeOfWork, remarks } = request.data;

    // Validate inputs
    if (!requestId || !projectOrTask || !remarks) {
        throw new HttpsError("invalid-argument", "Missing required fields.");
    }
    if (workEfficiency < 0 || workEfficiency > 5 || easeOfWork < 0 || easeOfWork > 5) {
        throw new HttpsError("invalid-argument", "Ratings must be between 0 and 5.");
    }

    const giverId = request.auth.uid;
    const requestRef = db.collection("peerFeedbackRequests").doc(requestId);

    try {
        await db.runTransaction(async (transaction) => {
            const requestDoc = await transaction.get(requestRef);

            if (!requestDoc.exists) {
                throw new HttpsError("not-found", "The feedback request does not exist.");
            }

            const requestData = requestDoc.data() as PeerFeedbackRequest;

            if (requestData.targetId !== giverId) {
                throw new HttpsError("permission-denied", "You are not authorized to submit feedback for this request.");
            }

            if (requestData.status === "completed") {
                throw new HttpsError("failed-precondition", "Feedback has already been submitted for this request.");
            }

            // Create a new feedback document in the 'givenPeerFeedback' collection
            const newFeedback: GivenPeerFeedback = {
                giverId,
                targetId: requestData.requesterId, // The person who asked for feedback is the target
                projectOrTask,
                workEfficiency,
                easeOfWork,
                remarks,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                type: 'requested',
            };
            transaction.set(db.collection("givenPeerFeedback").doc(), newFeedback);

            // Mark the original request as completed
            transaction.update(requestRef, { status: "completed" });
        });

        return { success: true };
    } catch (error) {
        console.error("Error submitting peer feedback:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "An unexpected error occurred while submitting feedback.");
    }
});

// Function to get feedback received by the current user (anonymous)
export const getMyReceivedFeedback = onCall(async (request) => {
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
            submittedAt: timestamp ? timestamp.toDate().toISOString() : new Date().toISOString(),
            type: data.type,
        };
    });

    return feedback;
});

// Function for admins to get all feedback (not anonymous)
export const adminGetAllPeerFeedback = onCall(async (request) => {
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
        const timestamp = data.createdAt as admin.firestore.Timestamp;
        return {
            id: doc.id,
            giver: { id: data.giverId, name: giverDoc.data()?.name || "Unknown" },
            receiver: { id: data.targetId, name: receiverDoc.data()?.name || "Unknown" },
            projectOrTask: data.projectOrTask,
            workEfficiency: data.workEfficiency,
            easeOfWork: data.easeOfWork,
            remarks: data.remarks,
            submittedAt: timestamp ? timestamp.toDate().toISOString() : new Date().toISOString(),
            type: data.type,
        };
    }));

    return feedback;
});

export const givePeerFeedback = onCall<{ targetId: string; projectOrTask: string; workEfficiency: number; easeOfWork: number; remarks: string; }>(async (request) => {
    const db = admin.firestore();
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to give feedback.");
    }

    const { targetId, projectOrTask, workEfficiency, easeOfWork, remarks } = request.data;

    if (!targetId || !projectOrTask || !remarks) {
        throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    if (workEfficiency < 0 || workEfficiency > 5 || easeOfWork < 0 || easeOfWork > 5) {
        throw new HttpsError("invalid-argument", "Ratings must be between 0 and 5.");
    }

    const giverId = request.auth.uid;

    try {
        // Check if feedback has already been given by this user to the target
        const existingFeedbackQuery = await db.collection("givenPeerFeedback")
            .where("giverId", "==", giverId)
            .where("targetId", "==", targetId)
            .limit(1)
            .get();

        if (!existingFeedbackQuery.empty) {
            throw new HttpsError("failed-precondition", "You have already given feedback to this user.");
        }

        const feedback: GivenPeerFeedback = {
            giverId,
            targetId,
            projectOrTask,
            workEfficiency,
            easeOfWork,
            remarks,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            type: 'direct',
        };

        await db.collection("givenPeerFeedback").add(feedback);
        return { success: true };
    } catch (error) {
        console.error("Error giving peer feedback:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "An unexpected error occurred while giving feedback.");
    }
});
