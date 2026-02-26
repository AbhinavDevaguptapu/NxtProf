import { httpsCallable } from "firebase/functions";
import { functions } from "@/integrations/firebase/client";

export const syncLearningPointsToSheet = async (sessionId: string) => {
  if (!sessionId) throw new Error("Invalid session ID.");

  const fn = httpsCallable<
    { sessionId: string },
    { appended: number; success?: boolean; message?: string }
  >(functions, "syncLearningPointsToSheet");

  return fn({ sessionId }).then((res) => res.data);
};
