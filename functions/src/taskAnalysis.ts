/**
 * @file Cloud Functions for task analysis and Google Sheet data retrieval.
 */
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getGeminiKey } from "./utils";

export const analyzeTask = onCall<{ prompt: string }>(
    { timeoutSeconds: 120, memory: "512MiB", secrets: ["GEMINI_KEY"] },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Authentication required.");
        }

        const { prompt } = request.data;

        try {
            const model = new GoogleGenerativeAI(getGeminiKey()).getGenerativeModel({ model: "gemini-1.5-flash" });
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
        } catch (e) {
            console.error("AI processing error:", e);
            throw new HttpsError("internal", "Failed to generate AI summary.");
        }
    }
);


export const getLearningPointsForEmployee = onCall<{ employeeId: string }>(
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Authentication is required.");
        }

        const { employeeId } = request.data;
        if (!employeeId) {
            throw new HttpsError("invalid-argument", "An employee ID is required.");
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
        } catch (error) {
            console.error(`Error fetching learning points for employee ${employeeId}:`, error);
            if (error instanceof HttpsError) {
                throw error;
            }
            throw new HttpsError("internal", "An unexpected error occurred while fetching learning points.");
        }
    }
);
