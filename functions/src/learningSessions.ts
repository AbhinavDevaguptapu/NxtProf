import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";


interface EndSessionData {
    sessionId: string;
}

/**
 * Ends a learning session and locks all associated learning points.
 * This function is callable only by an admin.
*/
export const endLearningSessionAndLockPoints = onCall<EndSessionData>(async (request) => {
    const db = admin.firestore();
    // 1. Authentication & Authorization Check
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    if (request.auth.token.isAdmin !== true) {
        throw new HttpsError("permission-denied", "Only admins can end a session.");
    }

    const { sessionId } = request.data;
    if (!sessionId) {
        throw new HttpsError("invalid-argument", "A valid 'sessionId' must be provided.");
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

    } catch (error) {
        console.error("Error ending session and locking points:", error);
        throw new HttpsError("internal", "An unexpected error occurred while ending the session.");
    }
});