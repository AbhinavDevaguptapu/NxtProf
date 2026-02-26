import { httpsCallable } from "firebase/functions";
import { functions } from "@/integrations/firebase/client";
import { LearningPoint } from "../types";

const formatDateForFirebase = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getLearningPointsByDate = async (
  date?: Date,
): Promise<LearningPoint[]> => {
  const fn = httpsCallable(functions, "getLearningPointsByDate");

  const result = await fn(date ? { date: formatDateForFirebase(date) } : {});
  return result.data as LearningPoint[];
};
