"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeTask = void 0;
/**
 * @file Cloud Functions for task analysis and Google Sheet data retrieval.
 */
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const generative_ai_1 = require("@google/generative-ai");
const utils_1 = require("./utils");
exports.analyzeTask = (0, https_1.onCall)({
    timeoutSeconds: 120,
    memory: "512MiB",
    secrets: ["GEMINI_KEY"],
    cors: true,
}, async (request) => {
    var _a;
    const startTime = Date.now();
    const userId = ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || "anonymous";
    if (!request.auth) {
        v2_1.logger.warn("Unauthenticated analyzeTask attempt", {
            timestamp: new Date().toISOString(),
        });
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const { prompt } = request.data;
    // Input validation and sanitization
    if (!prompt || typeof prompt !== "string") {
        v2_1.logger.warn("Invalid prompt provided", {
            userId,
            timestamp: new Date().toISOString(),
        });
        throw new https_1.HttpsError("invalid-argument", "A valid prompt is required.");
    }
    const sanitizedPrompt = prompt.trim();
    if (sanitizedPrompt.length === 0 || sanitizedPrompt.length > 20000) {
        v2_1.logger.warn("Prompt length validation failed", {
            userId,
            promptLength: sanitizedPrompt.length,
            timestamp: new Date().toISOString(),
        });
        throw new https_1.HttpsError("invalid-argument", "Prompt must be between 1 and 20000 characters.");
    }
    v2_1.logger.info("Task analysis started", {
        userId,
        promptLength: sanitizedPrompt.length,
        timestamp: new Date().toISOString(),
    });
    try {
        const model = new generative_ai_1.GoogleGenerativeAI((0, utils_1.getGeminiKey)()).getGenerativeModel({
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
            v2_1.logger.info("Task analysis completed", {
                userId,
                durationMs: duration,
                timestamp: new Date().toISOString(),
            });
            return obj;
        }
        catch (parseError) {
            v2_1.logger.error("Failed to parse AI response", {
                userId,
                error: parseError.message,
                timestamp: new Date().toISOString(),
            });
            throw new https_1.HttpsError("internal", "Failed to process AI response.");
        }
    }
    catch (e) {
        const duration = Date.now() - startTime;
        v2_1.logger.error("AI processing failed", {
            userId,
            error: e.message,
            durationMs: duration,
            timestamp: new Date().toISOString(),
        });
        throw new https_1.HttpsError("internal", "Failed to generate AI summary.");
    }
});
//# sourceMappingURL=taskAnalysis.js.map