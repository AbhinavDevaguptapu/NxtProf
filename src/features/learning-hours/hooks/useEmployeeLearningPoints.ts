import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { LearningPoint } from "../types";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

export const useEmployeeLearningPoints = (
  employeeId: string,
  month?: string
) => {
  const [learningPoints, setLearningPoints] = useState<LearningPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) {
      setIsLoading(false);
      return;
    }

    const fetchPoints = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const pointsRef = collection(db, "learning_points");

        // Build query constraints
        const constraints: any[] = [
          where("userId", "==", employeeId),
          orderBy("createdAt", "desc"),
        ];

        // If month is provided, filter by date range
        if (month) {
          const monthDate = parseISO(`${month}-01`);
          const monthStart = Timestamp.fromDate(startOfMonth(monthDate));
          const monthEnd = Timestamp.fromDate(endOfMonth(monthDate));
          constraints.push(where("createdAt", ">=", monthStart));
          constraints.push(where("createdAt", "<=", monthEnd));
        }

        constraints.push(limit(50));

        const q = query(pointsRef, ...constraints);

        const snapshot = await getDocs(q);
        const points = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LearningPoint[];

        setLearningPoints(points);
      } catch (err: any) {
        console.error("Error fetching employee learning points:", err);
        setError("Failed to load learning history.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPoints();
  }, [employeeId, month]);

  return { learningPoints, isLoading, error };
};
