import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { useUserAuth } from "@/context/UserAuthContext";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { calculateLearningStreak } from "@/lib/calculate-learning-streak";

// Define the type for the streak state
type Streak = number | "N/A" | null;

/**
 * Fetches all scheduled learning hour sessions and returns their dates.
 */
async function fetchScheduledSessions(): Promise<Set<string>> {
  const snapshot = await getDocs(query(collection(db, "learning_hours")));
  const dates = new Set<string>();
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.scheduled_at) {
      dates.add(data.scheduled_at.toDate().toISOString().split("T")[0]);
    }
  });
  return dates;
}

/**
 * Fetches learning hours attendance for a user and calculates streak.
 */
async function fetchLearningStreak(
  userId: string,
  conductedDates: Set<string>
): Promise<number> {
  const attendanceRef = collection(db, "learning_hours_attendance");
  const q = query(
    attendanceRef,
    where("employee_id", "==", userId),
    orderBy("scheduled_at", "desc")
  );

  const snapshot = await getDocs(q);
  const entries = snapshot.docs.map(
    (d) =>
      d.data() as {
        status: string;
        scheduled_at: Timestamp;
      }
  );

  return calculateLearningStreak(entries, conductedDates);
}

export function useLearningStreak() {
  const { user } = useUserAuth();
  const { admin } = useAdminAuth();

  // Query 1: Fetch scheduled sessions (cached for all users)
  const { data: conductedDates, isLoading: sessionsLoading } = useQuery({
    queryKey: ["learningHoursSessions"],
    queryFn: fetchScheduledSessions,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  // Query 2: Fetch learning streak (depends on sessions being loaded)
  const { data: learningStreak, isLoading: streakLoading } = useQuery<Streak>({
    queryKey: ["learningStreak", user?.uid],
    queryFn: () => fetchLearningStreak(user!.uid, conductedDates!),
    enabled: !!user && !admin && !!conductedDates,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Return "N/A" for admins
  if (admin) {
    return { learningStreak: "N/A" as Streak, loading: false };
  }

  // Return null for logged out users
  if (!user) {
    return { learningStreak: null, loading: false };
  }

  return {
    learningStreak: learningStreak ?? null,
    loading: sessionsLoading || streakLoading,
  };
}
