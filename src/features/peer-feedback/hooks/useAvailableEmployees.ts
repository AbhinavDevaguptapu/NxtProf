import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserAuth } from "@/context/UserAuthContext";
import {
  collection,
  getDocs,
  query,
  where,
  documentId,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { toast } from "sonner";
import { Employee } from "../types";

/**
 * Fetches employees available for peer feedback (excludes self and already given this month).
 */
async function fetchAvailableEmployees(userId: string): Promise<Employee[]> {
  const employeesQuery = query(
    collection(db, "employees"),
    where(documentId(), "!=", userId)
  );

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const feedbackGivenQuery = query(
    collection(db, "givenPeerFeedback"),
    where("giverId", "==", userId),
    where("createdAt", ">=", startOfMonth),
    where("createdAt", "<=", endOfMonth)
  );

  const [employeesSnapshot, feedbackGivenSnapshot] = await Promise.all([
    getDocs(employeesQuery),
    getDocs(feedbackGivenQuery),
  ]);

  const alreadyGivenToIds = new Set(
    feedbackGivenSnapshot.docs.map((doc) => doc.data().targetId)
  );

  const availableEmployees: Employee[] = [];
  employeesSnapshot.forEach((doc) => {
    const data = doc.data();
    if (!alreadyGivenToIds.has(doc.id) && data.archived !== true) {
      if (data.name) {
        availableEmployees.push({ id: doc.id, name: data.name });
      }
    }
  });

  return availableEmployees;
}

export const useAvailableEmployees = () => {
  const { user } = useUserAuth();
  const queryClient = useQueryClient();

  const {
    data: employees = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["availableEmployees", user?.uid],
    queryFn: () => {
      if (!user) throw new Error("No user");
      return fetchAvailableEmployees(user.uid);
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    meta: {
      onError: () => {
        toast.error("Failed to load employee list.");
      },
    },
  });

  // Optimistic update: remove employee from list after feedback submission
  const removeEmployee = (employeeId: string) => {
    queryClient.setQueryData<Employee[]>(
      ["availableEmployees", user?.uid],
      (oldData) => oldData?.filter((emp) => emp.id !== employeeId) ?? []
    );
  };

  return {
    employees,
    isLoading,
    removeEmployee,
    refetch,
  };
};
