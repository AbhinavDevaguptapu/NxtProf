import { Feedback } from "../types";

export interface OverallRating {
    averageRating: number;
    finalRating: number;
    totalEntries: number;
}

export const calculateOverallRating = (feedback: Feedback[]): OverallRating => {
    if (feedback.length === 0) {
        return { averageRating: 0, finalRating: 0, totalEntries: 0 };
    }

    const totalRatings = feedback.reduce((acc, item) => acc + item.workEfficiency + item.easeOfWork, 0);
    const averageRating = totalRatings / (feedback.length * 2);

    let finalRating: number;
    if (averageRating >= 4.8) {
        finalRating = 5;
    } else if (averageRating >= 4.6) {
        finalRating = 4;
    } else if (averageRating >= 4.3) {
        finalRating = 3;
    } else if (averageRating >= 4.0) {
        finalRating = 2;
    } else if (averageRating >= 3.5) {
        finalRating = 1;
    } else {
        finalRating = 0;
    }

    return {
        averageRating,
        finalRating,
        totalEntries: feedback.length,
    };
};
