// src/hooks/use-learning-streak.ts

import { useState, useEffect } from "react";
import { db } from "@/integrations/firebase/client";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot, // <-- Use onSnapshot for real-time
    Timestamp,
} from "firebase/firestore";
import { useUserAuth } from "@/context/UserAuthContext";
import { useAdminAuth } from "@/context/AdminAuthContext"; // <-- Import admin context

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
            unsubscribe = onSnapshot(q, (snapshot) => {
                const entries = snapshot.docs.map((d) => d.data() as {
                    status: string;
                    scheduled_at: Timestamp;
                });
                // --- USE THE PROVEN CALCULATION LOGIC ---
                setLearningStreak(calculateStreak(entries));
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

/**
 * Given an array of attendance entries sorted descending by date,
 * returns the length of the current “Present” streak.
 * 
 * --- THIS IS THE EXACT, WORKING FUNCTION FROM YOUR REFERENCE ---
 */
function calculateStreak(
    entries: { status: string; scheduled_at: Timestamp }[]
): number {
    // Keep only the days the user was present
    const presents = entries
        .filter((e) => e.status === "Present")
        // Ensure correct sort just in case
        .sort(
            (a, b) =>
                b.scheduled_at.toDate().getTime() -
                a.scheduled_at.toDate().getTime()
        );

    if (presents.length === 0) return 0;

    // Start streak at 1 for the most recent “Present” day,
    // but only if it was today or yesterday.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mostRecentDate = presents[0].scheduled_at.toDate();
    mostRecentDate.setHours(0, 0, 0, 0);

    const diffFromToday = (today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24);

    // If the last attendance was more than a day ago, the streak is 0.
    if (diffFromToday > 1) {
        return 0;
    }

    let streak = 1;
    let prevDate = mostRecentDate;

    for (let i = 1; i < presents.length; i++) {
        const currDate = presents[i].scheduled_at.toDate();
        currDate.setHours(0, 0, 0, 0);

        const diffDays =
            (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24);

        // If the gap is exactly one day, continue the streak.
        if (diffDays === 1) {
            streak++;
            prevDate = currDate;
        } else if (diffDays > 1) {
            // If the gap is more than one day, the streak is broken.
            break;
        }
        // If diffDays is 0, it means multiple entries on the same day. We just ignore it and continue.
    }

    return streak;
}