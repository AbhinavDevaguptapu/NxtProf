import { getFunctions, httpsCallable } from "firebase/functions";

export const syncLearningPointsToSheet = async (sessionId: string) => {
  if (!sessionId) throw new Error("Invalid session ID.");

  const fn = httpsCallable<{ sessionId:string }, { appended: number, success?: boolean, message?: string }>(
    getFunctions(),
    "syncLearningPointsToSheet"
  );

  return fn({ sessionId }).then(res => res.data);
};
