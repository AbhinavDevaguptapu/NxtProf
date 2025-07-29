/**
 * Custom React hook to calculate and provide the current attendance streak for the logged-in user.
 * 
 * - If a user is logged in, listens to their attendance records in Firestore and computes the streak of consecutive "Present" days.
 * - If an admin is logged in, returns "N/A" as streak.
 * - If no user or admin is logged in, returns null.
 *
 * @returns An object containing:
 *   - `attendanceStreak`: The current streak as a number, "N/A" for admin, or null if not available.
 *   - `attendanceLoading`: Boolean indicating if the attendance data is loading.
 */
import { useState, useEffect } from "react";
import { db } from "@/integrations/firebase/client";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { useUserAuth } from "@/context/UserAuthContext";
import { useAdminAuth } from "@/context/AdminAuthContext";

type AttendanceStreak = number | "N/A" | null;

export function useAttendanceStreak() {
  const { user } = useUserAuth();
  const { admin } = useAdminAuth();

  const [attendanceStreak, setAttendanceStreak] =
    useState<AttendanceStreak>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  useEffect(() => {
    // cleanup handle
    let unsubscribe = () => { };

    if (user) {
      setAttendanceLoading(true);

      const attendanceRef = collection(db, "attendance");
      const q = query(
        attendanceRef,
        where("employee_id", "==", user.uid),
        orderBy("scheduled_at", "desc")
      );

      // real-time listener
      unsubscribe = onSnapshot(q, (snapshot) => {
        const entries = snapshot.docs.map((d) => d.data() as {
          status: string;
          scheduled_at: Timestamp;
        });
        setAttendanceStreak(calculateStreak(entries));
        setAttendanceLoading(false);
      });
    } else if (admin) {
      setAttendanceStreak("N/A");
    } else {
      setAttendanceStreak(null);
    }

    return unsubscribe;
  }, [user, admin]);

  return { attendanceStreak, attendanceLoading };
}

/**
 * Given an array of attendance entries sorted descending by date,
 * returns the length of the current “Present” streak.
 */
function calculateStreak(
  entries: { status: string; scheduled_at: Timestamp }[]
): number {
  // Keep only the days the user was present
  const presents = entries
    .filter((e) => e.status === "Present" || e.status === "Not Available")
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

  const diffFromToday =
    (today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24);

  // Check if the current streak is active.
  // On Monday, allow a 2-day gap to account for Sunday being an off-day.
  // On any other day of the week, only a 1-day gap is allowed.
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
  let streak = 1;
  let prevDate = mostRecentDate;

  for (let i = 1; i < presents.length; i++) {
    const currDate = presents[i].scheduled_at.toDate();
    currDate.setHours(0, 0, 0, 0);

    const diffDays =
      (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24);

    // A streak continues if the gap is 1 day.
    // It also continues if the gap is 2 days and the previous day was a Monday,
    // which accounts for jumping over a Sunday.
    if (diffDays === 1 || (diffDays === 2 && prevDate.getDay() === 1)) {
      streak++;
      prevDate = currDate;
    } else {
      break; // Streak is broken
    }
  }

  return streak;
}
