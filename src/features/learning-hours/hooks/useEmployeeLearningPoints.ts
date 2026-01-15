import { useQuery } from "@tanstack/react-query";
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

/**
 * Fetches learning points for an employee, optionally filtered by month.
 */
async function fetchEmployeeLearningPoints(
  employeeId: string,
  month?: string
): Promise<LearningPoint[]> {
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

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as LearningPoint[];
}

export const useEmployeeLearningPoints = (
  employeeId: string,
  month?: string
) => {
  const {
    data: learningPoints = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["employeeLearningPoints", employeeId, month],
    queryFn: () => fetchEmployeeLearningPoints(employeeId, month),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });

  return {
    learningPoints,
    isLoading,
    error: error ? "Failed to load learning history." : null,
  };
};
