import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    orderBy,
    writeBatch,
    getDocs
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useToast } from '@/components/ui/use-toast';
import type { LearningPoint } from '../types';
import { useUserAuth } from '@/context/UserAuthContext';

export const useLearningPoints = (sessionId: string | null) => {
    const { user } = useUserAuth();
    const { toast } = useToast();
    const [learningPoints, setLearningPoints] = useState<LearningPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || !sessionId) {
            setLearningPoints([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const q = query(
            collection(db, 'learning_points'),
            where('userId', '==', user.uid),
            where('sessionId', '==', sessionId),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const points = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LearningPoint));
            setLearningPoints(points);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching learning points:", error);
            toast({ title: "Error", description: "Could not fetch learning points.", variant: "destructive" });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, sessionId, toast]);

    const addLearningPoint = async (newPointData: Omit<LearningPoint, 'id' | 'userId' | 'createdAt' | 'editable' | 'sessionId'>, sessionId: string) => {
        if (!user) {
            toast({ title: "Not Authenticated", description: "You must be logged in to add a point.", variant: "destructive" });
            return;
        }
        if (!sessionId) {
            toast({ title: "No Active Session", description: "Cannot add a point as there is no active session.", variant: "destructive" });
            return;
        }
        try {
            await addDoc(collection(db, 'learning_points'), {
                ...newPointData,
                userId: user.uid,
                createdAt: serverTimestamp(),
                editable: true,
                sessionId: sessionId,
            });
            toast({ title: "Success", description: "Learning point added." });
        } catch (error) {
            console.error("Error adding learning point:", error);
            toast({ title: "Error", description: "Could not add the learning point.", variant: "destructive" });
        }
    };

    const updateLearningPoint = async (pointId: string, updatedData: Partial<Omit<LearningPoint, 'id' | 'userId' | 'createdAt'>>) => {
        try {
            const pointRef = doc(db, 'learning_points', pointId);
            await updateDoc(pointRef, updatedData);
            toast({ title: "Success", description: "Learning point updated." });
        } catch (error) {
            console.error("Error updating learning point:", error);
            toast({ title: "Error", description: "Could not update the learning point.", variant: "destructive" });
        }
    };

    const deleteLearningPoint = async (pointId: string) => {
        try {
            await deleteDoc(doc(db, 'learning_points', pointId));
            toast({ title: "Success", description: "Learning point deleted." });
        } catch (error) {
            console.error("Error deleting learning point:", error);
            toast({ title: "Error", description: "Could not delete the learning point.", variant: "destructive" });
        }
    };

    return {
        learningPoints,
        isLoading,
        addLearningPoint,
        updateLearningPoint,
        deleteLearningPoint,
    };
};
