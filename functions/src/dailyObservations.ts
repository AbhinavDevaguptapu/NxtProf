/**
 * @file Daily Observations Cloud Functions
 * @description Handles all backend logic for creating, reading, updating, and deleting user observations.
 * This file follows Firebase Functions v2 best practices, including explicit CORS configuration and initialization.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { z } from "zod";

// --- Initialization ---
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// --- Validation Schemas ---
const observationSchema = z.object({
  observationText: z.string().min(10, {
    message: "Observation must be at least 10 characters long.",
  }),
});

const updateObservationSchema = z.object({
  id: z.string(),
  observationText: z.string().min(10, {
    message: "Observation must be at least 10 characters long.",
  }),
});

// --- Helper Functions ---
const ensureAuthenticated = (request: any) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
};



const verifyObservationOwnership = async (id: string, uid: string) => {
    const observationRef = admin.firestore().collection("observations").doc(id);
    const doc = await observationRef.get();

    if (!doc.exists) {
        throw new HttpsError("not-found", "The requested observation does not exist.");
    }

    const observation = doc.data()!;
    if (observation.userId !== uid) {
        throw new HttpsError("permission-denied", "You are not authorized to modify this observation.");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const observationDate = observation.observationDate.toDate();
    observationDate.setHours(0, 0, 0, 0);

    if (today.getTime() !== observationDate.getTime()) {
        throw new HttpsError("permission-denied", "Observations can only be modified on the day they were created.");
    }

    return observationRef;
};

// --- Cloud Functions ---

/**
 * Adds a new observation to the Firestore database.
 */
export const addObservation = onCall({ cors: true }, async (request) => {
  ensureAuthenticated(request);

  const validation = observationSchema.safeParse(request.data);
  if (!validation.success) {
    const errorMessage = validation.error.errors.map((e) => e.message).join(", ");
    throw new HttpsError("invalid-argument", errorMessage);
  }

  const { observationText } = validation.data;
  const { uid } = request.auth!;

  try {
    const user = await admin.auth().getUser(uid);
    const authorName = user.displayName || "Unknown User";
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await admin.firestore().collection("observations").add({
      userId: uid,
      authorName,
      observationText,
      observationDate: admin.firestore.Timestamp.fromDate(today),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, message: "Observation added successfully." };
  } catch (error) {
    console.error("Error adding observation:", error);
    throw new HttpsError("internal", "An unexpected error occurred while adding the observation.");
  }
});

/**
 * Updates an existing observation.
 */
export const updateObservation = onCall({ cors: true }, async (request) => {
  ensureAuthenticated(request);

  const validation = updateObservationSchema.safeParse(request.data);
  if (!validation.success) {
    const errorMessage = validation.error.errors.map((e) => e.message).join(", ");
    throw new HttpsError("invalid-argument", errorMessage);
  }

  const { id, observationText } = validation.data;
  const { uid } = request.auth!;

  try {
    const observationRef = await verifyObservationOwnership(id, uid);
    await observationRef.update({
      observationText,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: "Observation updated successfully." };
  } catch (error: any) {
    console.error("Error updating observation:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "An unexpected error occurred while updating the observation.");
  }
});


/**
 * Deletes an observation from the Firestore database.
 */
export const deleteObservation = onCall({ cors: true }, async (request) => {
  ensureAuthenticated(request);

  const { id } = request.data;
  const { uid } = request.auth!;

  try {
    const observationRef = await verifyObservationOwnership(id, uid);
    await observationRef.delete();
    return { success: true, message: "Observation deleted successfully." };
  } catch (error: any) {
    console.error("Error deleting observation:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "An unexpected error occurred while deleting the observation.");
  }
});