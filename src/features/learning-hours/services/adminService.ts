import { getFunctions, httpsCallable } from "firebase/functions";
import { LearningPoint } from "../types";

export const getTodaysLearningPoints = async (): Promise<LearningPoint[]> => {
  const fn = httpsCallable(
    getFunctions(),
    "getTodaysLearningPoints"
  );

  const result = await fn();
  return result.data as LearningPoint[];
};
