
import { useState, useEffect, useCallback } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from "sonner";

const functions = getFunctions();
const getMyReceivedFeedback = httpsCallable(functions, 'peerFeedback-getMyReceivedFeedback');

export interface Feedback {
    id: string;
    projectOrTask: string;
    workEfficiency: number;
    easeOfWork: number;
    remarks: string;
    submittedAt: string;
    type: 'direct' | 'requested';
    finalRating?: number;
}

export const useReceivedFeedback = () => {
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFeedback = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getMyReceivedFeedback();
            setFeedback(result.data as Feedback[]);
        } catch (error: any) {
            console.error("Error fetching received feedback:", error);
            toast.error("Failed to load your feedback.", { description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFeedback();
    }, [fetchFeedback]);

    return { feedback, isLoading, refresh: fetchFeedback };
};
