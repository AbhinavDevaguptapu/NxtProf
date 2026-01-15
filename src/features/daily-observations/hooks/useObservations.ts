import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getFunctions,
  httpsCallable,
  HttpsCallableResult,
} from "firebase/functions";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { Observation } from "../types";
import { toast } from "sonner";
import { getUserFriendlyErrorMessage } from "@/lib/errorHandler";

// --- Type Definitions ---
interface MutationSuccess {
  success: boolean;
  message: string;
}

interface AddObservationVars {
  observationText: string;
}

interface UpdateObservationVars {
  id: string;
  observationText: string;
}

interface DeleteObservationVars {
  id: string;
}

// --- Firebase Setup ---
const functions = getFunctions();
const db = getFirestore();

// Define callables with explicit types for better safety
const addObservationCallable = httpsCallable<
  AddObservationVars,
  MutationSuccess
>(functions, "addObservation");
const updateObservationCallable = httpsCallable<
  UpdateObservationVars,
  MutationSuccess
>(functions, "updateObservation");
const deleteObservationCallable = httpsCallable<
  DeleteObservationVars,
  MutationSuccess
>(functions, "deleteObservation");

// --- React Query Hooks ---

/**
 * Fetches daily observations for a specific date in real-time.
 */
export const useGetObservations = (date: Date) => {
  return useQuery<Observation[], Error>({
    queryKey: ["observations", date.toDateString()],
    queryFn: async () => {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const startTimestamp = Timestamp.fromDate(startOfDay);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      const endTimestamp = Timestamp.fromDate(endOfDay);

      const q = query(
        collection(db, "observations"),
        where("observationDate", ">=", startTimestamp),
        where("observationDate", "<=", endTimestamp),
        orderBy("observationDate", "asc"),
        orderBy("createdAt", "asc")
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          authorName: data.authorName,
          observationText: data.observationText,
          observationDate: {
            _seconds: data.observationDate.seconds,
            _nanoseconds: data.observationDate.nanoseconds,
          },
          createdAt: {
            _seconds: data.createdAt.seconds,
            _nanoseconds: data.createdAt.nanoseconds,
          },
          updatedAt: {
            _seconds: data.updatedAt.seconds,
            _nanoseconds: data.updatedAt.nanoseconds,
          },
        } as Observation;
      });
    },
  });
};

/**
 * Adds a new observation.
 */
export const useAddObservation = () => {
  const queryClient = useQueryClient();
  return useMutation<
    HttpsCallableResult<MutationSuccess>,
    Error,
    AddObservationVars
  >({
    mutationFn: async (variables) => addObservationCallable(variables),
    onSuccess: (result) => {
      toast.success(result.data.message || "Observation added successfully!");
      queryClient.invalidateQueries({ queryKey: ["observations"] });
    },
    onError: (error: unknown) => {
      const message = getUserFriendlyErrorMessage(
        error,
        "Could not add your observation. Please try again."
      );
      toast.error(message);
    },
  });
};

/**
 * Updates an existing observation.
 */
export const useUpdateObservation = () => {
  const queryClient = useQueryClient();
  return useMutation<
    HttpsCallableResult<MutationSuccess>,
    Error,
    UpdateObservationVars
  >({
    mutationFn: async (variables) => updateObservationCallable(variables),
    onSuccess: (result) => {
      toast.success(result.data.message || "Observation updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["observations"] });
    },
    onError: (error: unknown) => {
      const message = getUserFriendlyErrorMessage(
        error,
        "Could not update your observation. Please try again."
      );
      toast.error(message);
    },
  });
};

/**
 * Deletes an observation.
 */
export const useDeleteObservation = () => {
  const queryClient = useQueryClient();
  return useMutation<
    HttpsCallableResult<MutationSuccess>,
    Error,
    DeleteObservationVars
  >({
    mutationFn: async (variables) => deleteObservationCallable(variables),
    onSuccess: (result) => {
      toast.success(result.data.message || "Observation deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["observations"] });
    },
    onError: (error: unknown) => {
      const message = getUserFriendlyErrorMessage(
        error,
        "Could not delete your observation. Please try again."
      );
      toast.error(message);
    },
  });
};
