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
    getDoc,
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

    /**
     * Checks if the current learning session has ended and is locked.
     * @param sessionId The ID of the session to check.
     * @returns A promise that resolves to true if the session is locked ('ended'), otherwise false.
     */
    const isSessionLocked = async (sessionId: string): Promise<boolean> => {
        const sessionRef = doc(db, 'learning_hours', sessionId);
        const sessionSnap = await getDoc(sessionRef);
        // If the session document doesn't exist, it's not locked.
        if (!sessionSnap.exists()) {
            return false;
        }
        // The session is only locked if its status is 'ended'.
        return sessionSnap.data().status === 'ended';
    };

    const addLearningPoint = async (newPointData: Omit<LearningPoint, 'id' | 'userId' | 'createdAt' | 'editable' | 'sessionId'>) => {
        if (!user) {
            toast({ title: "Not Authenticated", description: "You must be logged in to add a point.", variant: "destructive" });
            return;
        }
        if (!sessionId) {
            toast({ title: "No Active Session", description: "Cannot add a point as there is no active session.", variant: "destructive" });
            return;
        }

        // --- Corrected Logic: Check if the session has ended ---
        const locked = await isSessionLocked(sessionId);
        if (locked) {
            toast({ title: "Session Has Ended", description: "This learning session is over. Points are now locked.", variant: "destructive" });
            return;
        }

        try {
            await addDoc(collection(db, 'learning_points'), {
                ...newPointData,
                userId: user.uid,
                sessionId: sessionId,
                createdAt: serverTimestamp(),
                editable: true,
            });
            toast({ title: "Success", description: "Learning point added." });
        } catch (error) {
            console.error("Error adding learning point:", error);
            toast({ title: "Error", description: "Could not add the learning point.", variant: "destructive" });
        }
    };

    const updateLearningPoint = async (pointId: string, updatedData: Partial<Omit<LearningPoint, 'id' | 'userId' | 'createdAt'>>) => {
        if (!sessionId) return;

        // --- Corrected Logic: Check if the session has ended ---
        const locked = await isSessionLocked(sessionId);
        if (locked) {
            toast({ title: "Session Has Ended", description: "This learning session is over. Points are now locked.", variant: "destructive" });
            return;
        }

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
        if (!sessionId) return;

        // --- Corrected Logic: Check if the session has ended ---
        const locked = await isSessionLocked(sessionId);
        if (locked) {
            toast({ title: "Session Has Ended", description: "This learning session is over. Points are now locked.", variant: "destructive" });
            return;
        }
        
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