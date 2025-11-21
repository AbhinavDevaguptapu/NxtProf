import { getFunctions, httpsCallable } from "firebase/functions";
import { TASK_FRAMEWORK_MD } from "@/features/task-analyzer/constants";

export type Suggestions = {
  situation: string;
  behavior: string;
  impact: string;
  action_item?: string;
  framework_category: string;
};

// Internal type to handle the AI's potential error response
type AIResponse = Suggestions | { error: string };

// Helper function for creating a delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getLearningPointSuggestions = async (
  userStory: string
): Promise<Suggestions> => {
  const prompt = `
You are an expert Mentor and empathetic Coach for the 'Essentials of Task Framework' program. Your goal is to help users translate their raw, unstructured experiences into professional, structured learning points using the SBIA format. Your feedback should be supportive and psychologically safe.

**Reference Material:**
Here is the official **'Essentials of Task Framework'** document. This is your source of truth for all definitions.
---start of framework---
${TASK_FRAMEWORK_MD}
---end of framework---

**User's Raw Experience:**
Here is the user's input you must transform:
---start of input---
${userStory}
---end of input---

**Analysis & Transformation Protocol:**

**STEP 1: VALIDATION (CRITICAL)**
Analyze the user's input. If it fits ANY of these criteria:
1. It is a trivial greeting (e.g., "Hi", "Hello").
2. It is gibberish or random characters.
3. It is too short or vague to describe a meaningful work situation (e.g., "work", "test").
4. It is completely unrelated to a professional or learning scenario.

Then you MUST return EXACTLY this JSON object and stop:
{
    "error": "Hi there! I'm designed to help with work situations. Please describe a specific task or scenario you'd like to analyze."
}

**STEP 2: TRANSFORMATION (Only if valid)**
If the input describes a valid situation, follow these transformation rules:

1.  **Perspective Shift (Mandatory):** Rewrite the user's story from the **First-Person Perspective** ("I", "me", "my"). Even if the user says "The team did X" or "He did Y," you must convert it to a narrative centered on the user's actions (e.g., "I collaborated with the team to do X").
2.  **SBIA Extraction & Refinement:**
    *   **Situation:** Briefly set the context or the challenge faced. What was the initial state?
    *   **Behavior:** Isolate and describe the specific actions **I** took. Use active verbs. What did I do?
    *   **Impact:** Describe the outcome or value created by the behavior. Focus on the results. What changed because of my actions?
    *   **Action Item (Conditional):** If applicable, create a concrete, forward-looking step **I** can take next based on this experience. If not obvious, this can be omitted.
3.  **Categorization:** Based on the narrative, select the single best 'Task Framework Category' code from the framework document that matches the core nature of the work described.

**Final Output Requirements:**
You MUST return a **raw JSON object** with no markdown, no comments, and no extra text before or after the JSON.

**JSON Structure Example:**
{
    "situation": "<Generated Situation in 1st person, e.g., 'The deployment pipeline was consistently failing on staging.'>",
    "behavior": "<Generated Behavior in 1st person, e.g., 'I investigated the build logs, identified a deprecated dependency, and submitted a pull request to update it.'>",
    "impact": "<Generated Impact in 1st person, e.g., 'This stabilized the staging environment, unblocking the QA team and preventing further delays.'>",
    "action_item": "<Generated Action Item in 1st person, e.g., 'I will set up automated dependency checking to prevent this issue in the future.'>",
    "framework_category": "<Selected Framework Category, e.g., 'Quality'>"
}
    `;

  const functions = getFunctions();
  const analyzeTaskFunction = httpsCallable(functions, "analyzeTask");

  const maxRetries = 3;
  let currentDelay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await analyzeTaskFunction({ prompt });
      const data = result.data as AIResponse;

      // 1. Check if the AI returned a validation error
      if ("error" in data && typeof data.error === "string") {
        // Throw specific error to be displayed in the chat UI
        throw new Error(data.error);
      }

      // 2. Cast to Suggestions since we know it's not an error
      const suggestions = data as Suggestions;

      // 3. Validate JSON structure
      if (
        typeof suggestions.situation !== "string" ||
        typeof suggestions.behavior !== "string" ||
        typeof suggestions.impact !== "string" ||
        typeof suggestions.framework_category !== "string"
      ) {
        throw new Error("Invalid JSON structure received from AI.");
      }

      return suggestions;
    } catch (error: any) {
      // If it is the validation error (Hi/Hello), throw it immediately
      if (error.message?.includes("Hi there!")) {
        throw error;
      }

      const isRetriable =
        error.message?.includes("503") || error.message?.includes("overloaded");

      if (isRetriable && i < maxRetries - 1) {
        console.warn(
          `Attempt ${i + 1} failed. Retrying in ${currentDelay}ms...`
        );
        await sleep(currentDelay);
        currentDelay *= 2;
      } else {
        console.error(`Error on attempt ${i + 1}:`, error);
        throw new Error("Failed to get suggestions. Please check console.");
      }
    }
  }

  throw new Error("Failed to get suggestions after retries.");
};
