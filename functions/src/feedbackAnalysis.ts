/**
 * @file Cloud Functions for feedback analysis.
 */
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { google } from "googleapis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSheetsAuth, getGeminiKey, parseDynamicDate } from "./utils";
import {
    isSameDay,
    isSameMonth,
    startOfDay,
    endOfDay,
    parseISO,
    format,
    isValid,
    parse
} from "date-fns";

// Type definitions
type FeedbackRequestData = {
    employeeId: string;
    timeFrame: "daily" | "monthly" | "specific" | "range" | "full";
    date?: string;
    startDate?: string;
    endDate?: string;
};

type SummaryGraph = {
    totalFeedbacks: number;
    avgUnderstanding: number;
    avgInstructor: number;
};

type TimeseriesGraph = {
    labels: string[];
    understanding: number[];
    instructor: number[];
};

async function getFilteredFeedbackData(requestData: FeedbackRequestData): Promise<any[]> {
    const { employeeId, timeFrame, date, startDate, endDate } = requestData;

    const empDoc = await admin.firestore().collection("employees").doc(employeeId).get();
    const sheetUrl = empDoc.data()?.feedbackSheetUrl;
    if (typeof sheetUrl !== "string") throw new HttpsError("not-found", "No feedback sheet URL configured.");
    const sheetIdMatch = sheetUrl.match(/\/d\/([\w-]+)/);
    if (!sheetIdMatch) throw new HttpsError("invalid-argument", "Invalid Google Sheet URL format.");
    const spreadsheetId = sheetIdMatch[1];

    const sheets = google.sheets({ version: "v4", auth: getSheetsAuth() });
    const gidMatch = sheetUrl.match(/[#&]gid=(\d+)/);
    const targetGid = gidMatch ? parseInt(gidMatch[1], 10) : 0;
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = meta.data.sheets?.find(s => s.properties?.sheetId === targetGid);
    if (!sheet?.properties?.title) throw new HttpsError("not-found", `Sheet with GID "${targetGid}" not found.`);
    const range = `${sheet.properties.title}!A:D`;
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = resp.data.values;
    if (!rows || rows.length < 2) return [];

    const dataRows = rows.slice(1).map(r => ({
        date: parseDynamicDate(r[0]?.toString() || ""),
        understanding: Number(r[1]) || 0,
        instructor: Number(r[2]) || 0,
        comment: (r[3] || "").toString().trim(),
    })).filter(x => isValid(x.date));

    if (timeFrame === "full") return dataRows;
    if (timeFrame === "daily" || timeFrame === "specific") {
        const targetDate = startOfDay(parseISO(date!));
        return dataRows.filter(x => isSameDay(x.date, targetDate));
    }
    if (timeFrame === "monthly") {
        const refDate = date ? parseISO(date) : new Date();
        return dataRows.filter(x => isSameMonth(x.date, refDate));
    }
    if (timeFrame === "range") {
        const s0 = startOfDay(parseISO(startDate!));
        const e0 = endOfDay(parseISO(endDate!));
        return dataRows.filter(x => x.date >= s0 && x.date <= e0);
    }
    return [];
}

export const getFeedbackChartData = onCall<FeedbackRequestData>(
    { timeoutSeconds: 60, memory: "256MiB", secrets: ["SHEETS_SA_KEY"] },
    async (request) => {
        if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required.");

        const filteredData = await getFilteredFeedbackData(request.data);
        const totalFeedbacks = filteredData.length;

        if (totalFeedbacks === 0) {
            return { totalFeedbacks: 0, graphData: null, graphTimeseries: null };
        }

        let graphData: SummaryGraph | null = null;
        if (["daily", "specific", "monthly"].includes(request.data.timeFrame)) {
            const sumU = filteredData.reduce((s, r) => s + r.understanding, 0);
            const sumI = filteredData.reduce((s, r) => s + r.instructor, 0);
            graphData = {
                totalFeedbacks,
                avgUnderstanding: sumU / totalFeedbacks,
                avgInstructor: sumI / totalFeedbacks,
            };
        }

        let graphTimeseries: TimeseriesGraph | null = null;
        if (request.data.timeFrame === "range") {
            const dailyAggregates = new Map<string, { sumU: number; sumI: number; count: number }>();
            filteredData.forEach(row => {
                const dayKey = format(row.date, 'yyyy-MM-dd');
                const dayStats = dailyAggregates.get(dayKey) || { sumU: 0, sumI: 0, count: 0 };
                dayStats.sumU += row.understanding;
                dayStats.sumI += row.instructor;
                dayStats.count += 1;
                dailyAggregates.set(dayKey, dayStats);
            });
            const sortedKeys = Array.from(dailyAggregates.keys()).sort();
            graphTimeseries = {
                labels: sortedKeys.map(k => format(parseISO(k), 'MMM d')),
                understanding: sortedKeys.map(k => dailyAggregates.get(k)!.sumU / dailyAggregates.get(k)!.count),
                instructor: sortedKeys.map(k => dailyAggregates.get(k)!.sumI / dailyAggregates.get(k)!.count),
            };
        } else if (request.data.timeFrame === "full") {
            const monthlyAggregates = new Map<string, { sumU: number; sumI: number; count: number }>();
            filteredData.forEach(row => {
                const monthKey = format(row.date, 'yyyy-MM');
                const monthStats = monthlyAggregates.get(monthKey) || { sumU: 0, sumI: 0, count: 0 };
                monthStats.sumU += row.understanding;
                monthStats.sumI += row.instructor;
                monthStats.count += 1;
                monthlyAggregates.set(monthKey, monthStats);
            });
            const sortedKeys = Array.from(monthlyAggregates.keys()).sort();
            graphTimeseries = {
                labels: sortedKeys.map(k => format(parse(k, 'yyyy-MM', new Date()), "MMM yyyy")),
                understanding: sortedKeys.map(k => monthlyAggregates.get(k)!.sumU / monthlyAggregates.get(k)!.count),
                instructor: sortedKeys.map(k => monthlyAggregates.get(k)!.sumI / monthlyAggregates.get(k)!.count),
            };
        }

        return { totalFeedbacks, graphData, graphTimeseries };
    }
);

export const getFeedbackAiSummary = onCall<FeedbackRequestData>(
    { timeoutSeconds: 120, memory: "512MiB", secrets: ["GEMINI_KEY", "SHEETS_SA_KEY"] },
    async (request) => {
        if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required.");

        const filteredData = await getFilteredFeedbackData(request.data);

        const skip = ["na", "n/a", "none", "ntg", "nil", ""];
        const comments = filteredData.map(x => x.comment).filter(t => t && !skip.includes(t.toLowerCase()));

        if (comments.length === 0) {
            return { positiveFeedback: [], improvementAreas: [] };
        }

        try {
            const model = new GoogleGenerativeAI(getGeminiKey()).getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `From the following list of verbatim feedback comments, perform an analysis. Return a valid JSON object with two keys: "positiveFeedback" and "improvementAreas". For "positiveFeedback", return an array of up to 3 objects, where each object has a "quote" key (the verbatim positive comment) and a "keywords" key (an array of 1-3 relevant keywords from the quote). For "improvementAreas", return an array of up to 3 objects, where each object has a "theme" key (a summarized topic like 'Pacing' or 'Interaction') and a "suggestion" key (a concise, actionable suggestion for the instructor). If the comments do not contain explicit areas for improvement, analyze the context and provide general best-practice suggestions that could still enhance performance. If there are no comments that fit a category, return an empty array for that key. Comments: """${comments.join("\n")}"""`;
            const aiRes = await model.generateContent(prompt);
            const aiTxt = aiRes.response.text();
            const js = aiTxt.slice(aiTxt.indexOf("{"), aiTxt.lastIndexOf("}") + 1);
            const obj = JSON.parse(js);
            return {
                positiveFeedback: obj.positiveFeedback || [],
                improvementAreas: obj.improvementAreas || [],
            };
        } catch (e) {
            console.error("AI processing error:", e);
            throw new HttpsError("internal", "Failed to generate AI summary.");
        }
    }
);

export const getRawFeedback = onCall<FeedbackRequestData>(
    { timeoutSeconds: 60, memory: "256MiB", secrets: ["SHEETS_SA_KEY"] },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Authentication required.");
        }

        const filteredData = await getFilteredFeedbackData(request.data);

        // The date objects from getFilteredFeedbackData were parsed assuming the server's
        // local timezone. We format them back into a string representing that local time,
        // and then append the correct IST offset (+05:30) to create a timezone-aware
        // ISO 8601 string for the frontend.
        return filteredData.map(row => {
            const localTimeStr = format(row.date, "yyyy-MM-dd'T'HH:mm:ss");
            return {
                ...row,
                date: `${localTimeStr}+05:30`,
            };
        });
    }
);
