/**
 * @file Cloud Functions for task analysis and Google Sheet data retrieval.
 */
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiKey } from "./utils";

export const analyzeTask = onCall<{ prompt: string }>(
  {
    timeoutSeconds: 120,
    memory: "512MiB",
    secrets: ["GEMINI_KEY"],
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const { prompt } = request.data;

    // Input validation and sanitization
    if (!prompt || typeof prompt !== "string") {
      throw new HttpsError("invalid-argument", "A valid prompt is required.");
    }

    const sanitizedPrompt = prompt.trim();
    if (sanitizedPrompt.length === 0 || sanitizedPrompt.length > 20000) {
      throw new HttpsError(
        "invalid-argument",
        "Prompt must be between 1 and 20000 characters."
      );
    }

    try {
      const model = new GoogleGenerativeAI(getGeminiKey()).getGenerativeModel({
        model: "gemini-2.5-flash-lite",
      });
      const aiRes = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: sanitizedPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });
      const aiTxt = aiRes.response.text();
      const js = aiTxt.slice(aiTxt.indexOf("{"), aiTxt.lastIndexOf("}") + 1);

      try {
        const obj = JSON.parse(js);
        return obj;
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        console.error("AI Response text:", aiTxt);
        throw new HttpsError("internal", "Failed to process AI response.");
      }
    } catch (e) {
      console.error("AI processing error:", e);
      throw new HttpsError("internal", "Failed to generate AI summary.");
    }
  }
);

export const getLearningPointsForEmployee = onCall<{ employeeId: string }>(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }

    const { employeeId } = request.data;

    // Input validation and sanitization
    if (!employeeId || typeof employeeId !== "string") {
      throw new HttpsError("invalid-argument", "An employee ID is required.");
    }

    const sanitizedEmployeeId = employeeId.trim();
    if (sanitizedEmployeeId.length === 0 || sanitizedEmployeeId.length > 128) {
      throw new HttpsError("invalid-argument", "Invalid employee ID format.");
    }

    // Authorization check: users can only access their own data unless they're admins
    const isAdmin =
      request.auth.token.isAdmin === true ||
      request.auth.token.isCoAdmin === true;
    if (!isAdmin && request.auth.uid !== sanitizedEmployeeId) {
      throw new HttpsError(
        "permission-denied",
        "You can only access your own learning points."
      );
    }

    try {
      const learningPointsSnapshot = await admin
        .firestore()
        .collection("learning_points")
        .where("userId", "==", sanitizedEmployeeId)
        .get();

      const learningPoints = learningPointsSnapshot.docs.map((doc) => {
        const data = doc.data();
        const date =
          data.date instanceof admin.firestore.Timestamp
            ? data.date.toDate().toLocaleDateString("en-CA")
            : data.date || "";

        return {
          id: doc.id,
          date,
          task: data.task_name || "",
          taskFrameworkCategory: data.framework_category || "",
          pointType: data.point_type || "",
          situation: data.situation || "",
          behavior: data.behavior || "",
          impact: data.impact || "",
          action: data.action_item || "",
        };
      });

      return learningPoints;
    } catch (error) {
      console.error(
        `Error fetching learning points for employee ${employeeId}:`,
        error
      );
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "An unexpected error occurred while fetching learning points."
      );
    }
  }
);
