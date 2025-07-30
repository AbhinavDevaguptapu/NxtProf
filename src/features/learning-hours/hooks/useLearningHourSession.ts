import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { format, formatDistanceStrict } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import type { LearningHour } from '../types';

export const useLearningHourSession = () => {
    const { toast } = useToast();
    const [learningHour, setLearningHour] = useState<LearningHour | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [sessionTime, setSessionTime] = useState("0s");

    const todayDocId = format(new Date(), "yyyy-MM-dd");

    useEffect(() => {
        const ref = doc(db, "learning_hours", todayDocId);
        const unsubscribe = onSnapshot(ref, (snap) => {
            setLearningHour(snap.exists() ? (snap.data() as LearningHour) : null);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [todayDocId]);

    useEffect(() => {
        if (learningHour?.status === 'active' && learningHour.startedAt) {
            const intervalId = setInterval(() => {
                const now = new Date();
                const start = learningHour.startedAt.toDate();
                const seconds = Math.floor((now.getTime() - start.getTime()) / 1000);

                const h = Math.floor(seconds / 3600);
                const m = Math.floor((seconds % 3600) / 60);
                const s = seconds % 60;

                const hStr = String(h).padStart(2, '0');
                const mStr = String(m).padStart(2, '0');
                const sStr = String(s).padStart(2, '0');

                if (h > 0) {
                    setSessionTime(`${hStr}:${mStr}:${sStr}`);
                } else {
                    setSessionTime(`${mStr}:${sStr}`);
                }
            }, 1000);
            return () => clearInterval(intervalId);
        }
    }, [learningHour?.status, learningHour?.startedAt]);

    const startSession = async () => {
        setIsUpdating(true);
        try {
            await updateDoc(doc(db, "learning_hours", todayDocId), {
                status: "active",
                startedAt: serverTimestamp(),
            });
            toast({ title: "Learning Session Started" });
        } catch (e) {
            console.error(e);
            toast({ title: "Error starting session", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const endSession = async () => {
        setIsUpdating(true);
        try {
            await updateDoc(doc(db, "learning_hours", todayDocId), {
                status: "ended",
                endedAt: serverTimestamp(),
            });
            toast({ title: "Session Ended", description: "Attendance saved." });
        } catch (e) {
            console.error(e);
            toast({ title: "Error ending session", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    return {
        learningHour,
        isLoading,
        isUpdating,
        sessionTime,
        todayDocId,
        startSession,
        endSession,
    };
};
