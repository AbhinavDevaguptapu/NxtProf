
import { useState, useEffect, useCallback } from 'react';
import { useUserAuth } from '@/context/UserAuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { toast } from "sonner";

export interface FeedbackRequest {
    id: string;
    requesterName: string;
    message: string;
    createdAt: {
        toDate: () => Date;
    };
}

export const usePendingRequests = () => {
    const { user } = useUserAuth();
    const [requests, setRequests] = useState<FeedbackRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRequests = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const q = query(
                collection(db, "peerFeedbackRequests"),
                where("targetId", "==", user.uid),
                where("status", "==", "pending"),
                orderBy("createdAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            const fetchedRequests: FeedbackRequest[] = [];
            querySnapshot.forEach((doc) => {
                fetchedRequests.push({ id: doc.id, ...doc.data() } as FeedbackRequest);
            });
            setRequests(fetchedRequests);
        } catch (error) {
            console.error("Error fetching pending requests:", error);
            toast.error("Failed to load pending requests.");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    return { requests, isLoading, refresh: fetchRequests };
};
