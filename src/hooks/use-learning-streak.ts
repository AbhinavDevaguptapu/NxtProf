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
 * returns the length of the current “Present” streak for a Monday-Saturday work week.
 */
function calculateStreak(
    entries: { status: string; scheduled_at: Timestamp }[]
): number {
    // Keep only the days the user was present on a workday (Mon-Sat).
    const presents = entries
        .filter(e => {
            const day = e.scheduled_at.toDate().getDay();
            const isWorkday = day !== 0; // 0 is Sunday
            const isPresent = e.status === "Present" || e.status === "Not Available";
            return isPresent && isWorkday;
        })
        // Ensure correct sort just in case
        .sort(
            (a, b) =>
                b.scheduled_at.toDate().getTime() -
                a.scheduled_at.toDate().getTime()
        );

    if (presents.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mostRecentDate = presents[0].scheduled_at.toDate();
    mostRecentDate.setHours(0, 0, 0, 0);

    const isToday = today.getTime() === mostRecentDate.getTime();

    const diffFromToday =
        (today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24);

    // Check if the current streak is active.
    // On Monday, allow a 2-day gap to account for Sunday being an off-day.
    // On any other day of the week (including Sunday), only a 1-day gap is allowed
    // to the last workday (e.g., from Sunday to Saturday).
    if (today.getDay() === 1) { // Monday
        if (diffFromToday > 2) {
            return 0; // Streak is broken if last present day was before Saturday.
        }
    } else {
        if (diffFromToday > 1) {
            return 0; // Streak is broken if there's a gap of more than 1 day.
        }
    }

    // Start streak at 1 for the most recent "Present" day.
    let streak = isToday ? 1 : 0;
    let prevDate = mostRecentDate;

    for (let i = 1; i < presents.length; i++) {
        const currDate = presents[i].scheduled_at.toDate();
        currDate.setHours(0, 0, 0, 0);

        const diffDays =
            (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24);

        // A streak continues if the gap is 1 day (e.g., Tue -> Mon).
        // It also continues if the gap is 2 days and the previous day was a Monday,
        // which accounts for jumping over a Sunday from Saturday.
        if (diffDays === 1 || (diffDays === 2 && prevDate.getDay() === 1)) {
            streak++;
            prevDate = currDate;
        } else {
            break; // Streak is broken
        }
    }

    return streak;
}