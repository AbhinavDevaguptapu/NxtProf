import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { toast } from 'sonner';

const functions = getFunctions();
const togglePeerFeedbackLock = httpsCallable(functions, 'peerFeedback-togglePeerFeedbackLock');

export const usePeerFeedbackLock = () => {
    const [isLocked, setIsLocked] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const lockRef = doc(db, "moduleLocks", "peerFeedback");
        const unsubscribe = onSnapshot(lockRef, (doc) => {
            if (doc.exists()) {
                setIsLocked(doc.data().locked || false);
            } else {
                setIsLocked(false); // Default to unlocked if not set
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching peer feedback lock status:", error);
            toast.error("Could not fetch feedback lock status.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const toggleLock = async (lock: boolean) => {
        try {
            await toast.promise(togglePeerFeedbackLock({ lock }), {
                loading: lock ? "Locking feedback submissions..." : "Unlocking feedback submissions...",
                success: (result) => {
                    const data = result.data as { locked: boolean };
                    return `Peer feedback submissions have been successfully ${data.locked ? "locked" : "unlocked"}.`;
                },
                error: (err) => `Failed to toggle lock: ${err.message}`,
            });
            setIsLocked(lock);
        } catch (error) {
            console.error("Error toggling peer feedback lock:", error);
        }
    };

    return { isLocked, isLoading, toggleLock };
};