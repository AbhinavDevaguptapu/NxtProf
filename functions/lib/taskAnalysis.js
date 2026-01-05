"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeTask = void 0;
/**
 * @file Cloud Functions for task analysis and Google Sheet data retrieval.
 */
const https_1 = require("firebase-functions/v2/https");
const generative_ai_1 = require("@google/generative-ai");
const utils_1 = require("./utils");
exports.analyzeTask = (0, https_1.onCall)({
    timeoutSeconds: 120,
    memory: "512MiB",
    secrets: ["GEMINI_KEY"],
    cors: true,
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const { prompt } = request.data;
    // Input validation and sanitization
    if (!prompt || typeof prompt !== "string") {
        throw new https_1.HttpsError("invalid-argument", "A valid prompt is required.");
    }
    const sanitizedPrompt = prompt.trim();
    if (sanitizedPrompt.length === 0 || sanitizedPrompt.length > 20000) {
        throw new https_1.HttpsError("invalid-argument", "Prompt must be between 1 and 20000 characters.");
    }
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
            return obj;
        }
        catch (parseError) {
            console.error("Failed to parse AI response as JSON:", parseError);
            console.error("AI Response text:", aiTxt);
            throw new https_1.HttpsError("internal", "Failed to process AI response.");
        }
    }
    catch (e) {
        console.error("AI processing error:", e);
        throw new https_1.HttpsError("internal", "Failed to generate AI summary.");
    }
});
//# sourceMappingURL=taskAnalysis.js.map