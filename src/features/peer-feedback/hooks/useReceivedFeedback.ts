import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { toast } from "sonner";
import { db } from '@/integrations/firebase/client';
import { useUserAuth } from '@/context/UserAuthContext';
import { Feedback } from '../types';

export const useReceivedFeedback = () => {
    const { user } = useUserAuth();
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const feedbackQuery = query(
            collection(db, "givenPeerFeedback"),
            where("targetId", "==", user.uid),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(feedbackQuery, (snapshot) => {
            const receivedFeedback = snapshot.docs.map(doc => {
                const data = doc.data();
                const timestamp = data.createdAt as Timestamp;

                if (!timestamp) {
                    console.warn("Feedback item without a timestamp:", doc.id);
                    return null;
                }

                return {
                    id: doc.id,
                    projectOrTask: data.projectOrTask,
                    workEfficiency: data.workEfficiency,
                    easeOfWork: data.easeOfWork,
                    remarks: data.remarks,
                    submittedAt: timestamp.toDate().toISOString(),
                } as Feedback;
            }).filter((item): item is Feedback => item !== null);
            setFeedback(receivedFeedback);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching real-time feedback:", error);
            toast.error("Failed to load your feedback in real-time.");
            setIsLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [user]);

    return { feedback, isLoading };
};
