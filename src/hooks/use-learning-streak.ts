import { useState, useEffect } from "react";
import { db } from "@/integrations/firebase/client";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    getDocs,
} from "firebase/firestore";
import { useUserAuth } from "@/context/UserAuthContext";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { calculateLearningStreak } from "@/lib/calculate-learning-streak";

// Define the type for the streak state
type Streak = number | "N/A" | null;

export function useLearningStreak() {
    const { user } = useUserAuth();
    const { admin } = useAdminAuth(); // <-- Use admin context

    const [learningStreak, setLearningStreak] = useState<Streak>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let unsubscribe = () => { };

        // Handle user state
        if (user) {
            setLoading(true);

            // --- POINT TO THE CORRECT COLLECTION ---
            const attendanceRef = collection(db, "learning_hours_attendance");
            const q = query(
                attendanceRef,
                where("employee_id", "==", user.uid),
                orderBy("scheduled_at", "desc")
            );


            // Use real-time listener
            unsubscribe = onSnapshot(q, async (snapshot) => {
                const entries = snapshot.docs.map((d) => d.data() as {
                    status: string;
                    scheduled_at: Timestamp;
                });

                // Get all scheduled learning hour dates
                const scheduledSessionsQuery = query(collection(db, "learning_hours"));
                const scheduledSessionsSnapshot = await getDocs(scheduledSessionsQuery);
                const allConductedDates = new Set<string>();
                scheduledSessionsSnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.scheduled_at) {
                        allConductedDates.add(data.scheduled_at.toDate().toISOString().split('T')[0]);
                    }
                });

                setLearningStreak(calculateLearningStreak(entries, allConductedDates));
                setLoading(false);
            }, (error) => {
                console.error("Error fetching learning streak:", error);
                setLoading(false);
            });

            // Handle admin state
        } else if (admin) {
            setLearningStreak("N/A");
            setLoading(false);

            // Handle logged out state
        } else {
            setLearningStreak(null);
            setLoading(false);
        }

        // Cleanup the listener on unmount
        return unsubscribe;
    }, [user, admin]);

    return { learningStreak, loading };
}
