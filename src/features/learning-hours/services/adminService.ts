import { getFunctions, httpsCallable } from "firebase/functions";
import { LearningPoint } from "../types";

export const getLearningPointsByDate = async (date?: Date): Promise<LearningPoint[]> => {
  const fn = httpsCallable(
    getFunctions(),
    "getLearningPointsByDate"
  );

  const result = await fn(date ? { date: date.toISOString() } : {});
  return result.data as LearningPoint[];
};
