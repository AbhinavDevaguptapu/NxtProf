/**
 * @file Cloud Functions for task analysis and Google Sheet data retrieval.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
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
    const startTime = Date.now();
    const userId = request.auth?.uid || "anonymous";

    if (!request.auth) {
      logger.warn("Unauthenticated analyzeTask attempt", {
        timestamp: new Date().toISOString(),
      });
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const { prompt } = request.data;

    // Input validation and sanitization
    if (!prompt || typeof prompt !== "string") {
      logger.warn("Invalid prompt provided", {
        userId,
        timestamp: new Date().toISOString(),
      });
      throw new HttpsError("invalid-argument", "A valid prompt is required.");
    }

    const sanitizedPrompt = prompt.trim();
    if (sanitizedPrompt.length === 0 || sanitizedPrompt.length > 20000) {
      logger.warn("Prompt length validation failed", {
        userId,
        promptLength: sanitizedPrompt.length,
        timestamp: new Date().toISOString(),
      });
      throw new HttpsError(
        "invalid-argument",
        "Prompt must be between 1 and 20000 characters."
      );
    }

    logger.info("Task analysis started", {
      userId,
      promptLength: sanitizedPrompt.length,
      timestamp: new Date().toISOString(),
    });

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
        const duration = Date.now() - startTime;
        logger.info("Task analysis completed", {
          userId,
          durationMs: duration,
          timestamp: new Date().toISOString(),
        });
        return obj;
      } catch (parseError: any) {
        logger.error("Failed to parse AI response", {
          userId,
          error: parseError.message,
          timestamp: new Date().toISOString(),
        });
        throw new HttpsError("internal", "Failed to process AI response.");
      }
    } catch (e: any) {
      const duration = Date.now() - startTime;
      logger.error("AI processing failed", {
        userId,
        error: e.message,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      });
      throw new HttpsError("internal", "Failed to generate AI summary.");
    }
  }
);
