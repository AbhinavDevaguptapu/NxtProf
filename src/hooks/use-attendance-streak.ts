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
import { calculateStreak } from "@/lib/calculate-streak";

type AttendanceStreak = number | "N/A" | null;

/**
 * Fetches attendance data and calculates streak for a user.
 * Uses React Query for caching and automatic refetching.
 */
async function fetchAttendanceStreak(userId: string): Promise<number> {
  const attendanceRef = collection(db, "attendance");
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

  return calculateStreak(entries);
}

export function useAttendanceStreak() {
  const { user } = useUserAuth();
  const { admin } = useAdminAuth();

  const { data: attendanceStreak, isLoading: attendanceLoading } =
    useQuery<AttendanceStreak>({
      queryKey: ["attendanceStreak", user?.uid],
      queryFn: () => fetchAttendanceStreak(user!.uid),
      enabled: !!user && !admin,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
      refetchOnWindowFocus: false,
      retry: 2,
    });

  // Return "N/A" for admins, null for logged out, or the streak value
  if (admin) {
    return {
      attendanceStreak: "N/A" as AttendanceStreak,
      attendanceLoading: false,
    };
  }

  if (!user) {
    return { attendanceStreak: null, attendanceLoading: false };
  }

  return {
    attendanceStreak: attendanceStreak ?? null,
    attendanceLoading,
  };
}
