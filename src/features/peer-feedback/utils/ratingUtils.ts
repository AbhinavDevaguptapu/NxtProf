import { ReactNode } from "react";
import { Feedback } from "../types";

export interface OverallRating {
    finalRating: ReactNode;
    averageRating: number;
    starRating: number;
    totalEntries: number;
}

const RATING_THRESHOLDS: { threshold: number; stars: number }[] = [
    { threshold: 4.8, stars: 5 },
    { threshold: 4.6, stars: 4 },
    { threshold: 4.3, stars: 3 },
    { threshold: 4.0, stars: 2 },
    { threshold: 3.5, stars: 1 },
];

export const calculateOverallRating = (feedback: Feedback[]): OverallRating => {
    if (feedback.length === 0) {
        return { finalRating: "N/A", averageRating: 0, starRating: 0, totalEntries: 0 };
    }

    const totalRatings = feedback.reduce((acc, item) => acc + item.workEfficiency + item.easeOfWork, 0);
    const averageRating = totalRatings / (feedback.length * 2);

    const starRating = RATING_THRESHOLDS.find(
        ({ threshold }) => averageRating >= threshold
    )?.stars ?? 0;

    return {
        finalRating: averageRating.toFixed(2),
        averageRating,
        starRating,
        totalEntries: feedback.length,
    };
};
