/**
 * @file Daily Observations Cloud Functions
 * @description Handles all backend logic for creating, reading, updating, and deleting user observations.
 * This file follows Firebase Functions v2 best practices, including explicit CORS configuration and initialization.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { z } from "zod";
import { formatInTimeZone } from "date-fns-tz";

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

const deleteObservationSchema = z.object({
  id: z.string().min(1, { message: "Observation ID is required." }),
});

const IST_TIMEZONE = "Asia/Kolkata";

// --- Helper Functions ---
const ensureAuthenticated = (request: any) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated.",
    );
  }
};

const verifyObservationOwnership = async (id: string, uid: string) => {
  const observationRef = admin.firestore().collection("observations").doc(id);
  const doc = await observationRef.get();

  if (!doc.exists) {
    throw new HttpsError(
      "not-found",
      "The requested observation does not exist.",
    );
  }

  const observation = doc.data()!;
  if (observation.userId !== uid) {
    throw new HttpsError(
      "permission-denied",
      "You are not authorized to modify this observation.",
    );
  }

  // Compare dates in IST timezone to avoid UTC boundary issues
  const todayIST = formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");
  const observationDateIST = formatInTimeZone(
    observation.observationDate.toDate(),
    IST_TIMEZONE,
    "yyyy-MM-dd",
  );

  if (todayIST !== observationDateIST) {
    throw new HttpsError(
      "permission-denied",
      "Observations can only be modified on the day they were created.",
    );
  }

  return observationRef;
};

// --- Cloud Functions ---

/**
 * Adds a new observation to the Firestore database.
 */
export const addObservation = onCall(
  { region: "asia-south1", cors: true },
  async (request) => {
    ensureAuthenticated(request);

    const validation = observationSchema.safeParse(request.data);
    if (!validation.success) {
      const errorMessage = validation.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new HttpsError("invalid-argument", errorMessage);
    }

    const { observationText } = validation.data;
    const { uid } = request.auth!;

    try {
      const user = await admin.auth().getUser(uid);
      const authorName = user.displayName || "Unknown User";

      // Create IST midnight timestamp for the observation date
      const nowIST = formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");
      const istMidnight = new Date(`${nowIST}T00:00:00+05:30`);

      await admin
        .firestore()
        .collection("observations")
        .add({
          userId: uid,
          authorName,
          observationText,
          observationDate: admin.firestore.Timestamp.fromDate(istMidnight),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      logger.info("Observation added", {
        userId: uid,
        timestamp: new Date().toISOString(),
      });
      return { success: true, message: "Observation added successfully." };
    } catch (error: any) {
      logger.error("Error adding observation", {
        userId: uid,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      throw new HttpsError(
        "internal",
        "An unexpected error occurred while adding the observation.",
      );
    }
  },
);

/**
 * Updates an existing observation.
 */
export const updateObservation = onCall(
  { region: "asia-south1", cors: true },
  async (request) => {
    ensureAuthenticated(request);

    const validation = updateObservationSchema.safeParse(request.data);
    if (!validation.success) {
      const errorMessage = validation.error.errors
        .map((e) => e.message)
        .join(", ");
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
      logger.info("Observation updated", {
        userId: uid,
        observationId: id,
        timestamp: new Date().toISOString(),
      });
      return { success: true, message: "Observation updated successfully." };
    } catch (error: any) {
      logger.error("Error updating observation", {
        userId: uid,
        observationId: id,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        "internal",
        "An unexpected error occurred while updating the observation.",
      );
    }
  },
);

/**
 * Deletes an observation from the Firestore database.
 */
export const deleteObservation = onCall(
  { region: "asia-south1", cors: true },
  async (request) => {
    ensureAuthenticated(request);

    const validation = deleteObservationSchema.safeParse(request.data);
    if (!validation.success) {
      const errorMessage = validation.error.errors
        .map((e) => e.message)
        .join(", ");
      throw new HttpsError("invalid-argument", errorMessage);
    }

    const { id } = validation.data;
    const { uid } = request.auth!;

    try {
      const observationRef = await verifyObservationOwnership(id, uid);
      await observationRef.delete();
      logger.info("Observation deleted", {
        userId: uid,
        observationId: id,
        timestamp: new Date().toISOString(),
      });
      return { success: true, message: "Observation deleted successfully." };
    } catch (error: any) {
      logger.error("Error deleting observation", {
        userId: uid,
        observationId: id,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        "internal",
        "An unexpected error occurred while deleting the observation.",
      );
    }
  },
);
