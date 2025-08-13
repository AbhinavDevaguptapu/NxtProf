"use strict";
/**
 * @file Daily Observations Cloud Functions
 * @description Handles all backend logic for creating, reading, updating, and deleting user observations.
 * This file follows Firebase Functions v2 best practices, including explicit CORS configuration and initialization.
 */
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
exports.deleteObservation = exports.updateObservation = exports.addObservation = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
// --- Initialization ---
if (admin.apps.length === 0) {
    admin.initializeApp();
}
// --- Validation Schemas ---
const observationSchema = zod_1.z.object({
    observationText: zod_1.z.string().min(10, {
        message: "Observation must be at least 10 characters long.",
    }),
});
const updateObservationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    observationText: zod_1.z.string().min(10, {
        message: "Observation must be at least 10 characters long.",
    }),
});
// --- Helper Functions ---
const ensureAuthenticated = (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
};
const verifyObservationOwnership = async (id, uid) => {
    const observationRef = admin.firestore().collection("observations").doc(id);
    const doc = await observationRef.get();
    if (!doc.exists) {
        throw new https_1.HttpsError("not-found", "The requested observation does not exist.");
    }
    const observation = doc.data();
    if (observation.userId !== uid) {
        throw new https_1.HttpsError("permission-denied", "You are not authorized to modify this observation.");
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const observationDate = observation.observationDate.toDate();
    observationDate.setHours(0, 0, 0, 0);
    if (today.getTime() !== observationDate.getTime()) {
        throw new https_1.HttpsError("permission-denied", "Observations can only be modified on the day they were created.");
    }
    return observationRef;
};
// --- Cloud Functions ---
/**
 * Adds a new observation to the Firestore database.
 */
exports.addObservation = (0, https_1.onCall)(async (request) => {
    ensureAuthenticated(request);
    const validation = observationSchema.safeParse(request.data);
    if (!validation.success) {
        const errorMessage = validation.error.errors.map((e) => e.message).join(", ");
        throw new https_1.HttpsError("invalid-argument", errorMessage);
    }
    const { observationText } = validation.data;
    const { uid } = request.auth;
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
    }
    catch (error) {
        console.error("Error adding observation:", error);
        throw new https_1.HttpsError("internal", "An unexpected error occurred while adding the observation.");
    }
});
/**
 * Updates an existing observation.
 */
exports.updateObservation = (0, https_1.onCall)(async (request) => {
    ensureAuthenticated(request);
    const validation = updateObservationSchema.safeParse(request.data);
    if (!validation.success) {
        const errorMessage = validation.error.errors.map((e) => e.message).join(", ");
        throw new https_1.HttpsError("invalid-argument", errorMessage);
    }
    const { id, observationText } = validation.data;
    const { uid } = request.auth;
    try {
        const observationRef = await verifyObservationOwnership(id, uid);
        await observationRef.update({
            observationText,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, message: "Observation updated successfully." };
    }
    catch (error) {
        console.error("Error updating observation:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "An unexpected error occurred while updating the observation.");
    }
});
/**
 * Deletes an observation from the Firestore database.
 */
exports.deleteObservation = (0, https_1.onCall)(async (request) => {
    ensureAuthenticated(request);
    const { id } = request.data;
    const { uid } = request.auth;
    try {
        const observationRef = await verifyObservationOwnership(id, uid);
        await observationRef.delete();
        return { success: true, message: "Observation deleted successfully." };
    }
    catch (error) {
        console.error("Error deleting observation:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "An unexpected error occurred while deleting the observation.");
    }
});
//# sourceMappingURL=dailyObservations.js.map