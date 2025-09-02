"use strict";
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
exports.getLearningPointsForEmployee = exports.analyzeTask = void 0;
/**
 * @file Cloud Functions for task analysis and Google Sheet data retrieval.
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const generative_ai_1 = require("@google/generative-ai");
const utils_1 = require("./utils");
exports.analyzeTask = (0, https_1.onCall)({ timeoutSeconds: 120, memory: "512MiB", secrets: ["GEMINI_KEY"] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const { prompt } = request.data;
    try {
        const model = new generative_ai_1.GoogleGenerativeAI((0, utils_1.getGeminiKey)()).getGenerativeModel({ model: "gemini-1.5-flash" });
        const aiRes = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
            },
        });
        const aiTxt = aiRes.response.text();
        const js = aiTxt.slice(aiTxt.indexOf("{"), aiTxt.lastIndexOf("}") + 1);
        const obj = JSON.parse(js);
        return obj;
    }
    catch (e) {
        console.error("AI processing error:", e);
        throw new https_1.HttpsError("internal", "Failed to generate AI summary.");
    }
});
exports.getLearningPointsForEmployee = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    const { employeeId } = request.data;
    if (!employeeId) {
        throw new https_1.HttpsError("invalid-argument", "An employee ID is required.");
    }
    try {
        const learningPointsSnapshot = await admin.firestore()
            .collection("learning_points")
            .where("userId", "==", employeeId)
            .get();
        const learningPoints = learningPointsSnapshot.docs.map((doc) => {
            const data = doc.data();
            const date = data.date instanceof admin.firestore.Timestamp
                ? data.date.toDate().toLocaleDateString('en-CA')
                : data.date || '';
            return {
                id: doc.id,
                date,
                task: data.task_name || '',
                taskFrameworkCategory: data.framework_category || '',
                pointType: data.point_type || '',
                situation: data.situation || '',
                behavior: data.behavior || '',
                impact: data.impact || '',
                action: data.action_item || '',
            };
        });
        return learningPoints;
    }
    catch (error) {
        console.error(`Error fetching learning points for employee ${employeeId}:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", "An unexpected error occurred while fetching learning points.");
    }
});
//# sourceMappingURL=taskAnalysis.js.map