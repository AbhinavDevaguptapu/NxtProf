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
import { calculateStreak } from "@/lib/calculate-streak";
 
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

