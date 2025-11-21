import { TaskData, AnalysisResult } from "../types";
import { TASK_FRAMEWORK_MD } from "../constants";
import { getFunctions, httpsCallable } from "firebase/functions";

// Helper function for creating a delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const analyzeTask = async (
  taskData: TaskData
): Promise<AnalysisResult> => {
  const {
    task,
    taskFrameworkCategory,
    situation,
    behavior,
    impact,
    action,
    recipient,
    pointType,
  } = taskData;

  // Construct the detailed task information string
  const taskDetailParts = [
    `Original Task: ${task}`,
    taskFrameworkCategory
      ? `Task Framework Category: ${taskFrameworkCategory}`
      : null,
    recipient ? `Recipient: ${recipient}` : null,
    situation ? `Situation(S): ${situation}` : null,
    behavior ? `Behavior(B): ${behavior}` : null,
    impact ? `Impact(I): ${impact}` : null,
    action ? `Action Item(A): ${action}` : null,
  ].filter(Boolean);
  const taskDetailText = taskDetailParts.join("\n");

  const prompt = `
You are an expert Mentor and empathetic Coach for the 'Essentials of Task Framework' program. Your purpose is to guide users toward mastery of the framework by providing feedback that is professional, supportive, and psychologically safe.

Your goal is not just to "grade" the entry, but to help the user understand *why* a change creates a more powerful professional narrative.

**Reference Material:**
Here is the official **'Essentials of Task Framework'** document. This is your source of truth for all definitions and principles.
---start of framework---
${TASK_FRAMEWORK_MD}
---end of framework---

**User Input:**
Here is the task entry you must evaluate:
---start of task entry---
${taskDetailText}
---end of task entry---

**Analysis Protocol:**
Follow this logical flow to generate your evaluation:

1.  **Completeness Check:**
    * Does the entry contain the minimum required information (Situation, Behavior, Impact)?
    * If the entry is gibberish, irrelevant, or empty, mark it as an "Invalid Entry" (Score: 0).

2.  **Category Alignment (Crucial Step):**
    * Analyze the user's narrative. Does the *nature* of the work described match the specific definition of the selected 'Task Framework Category'?
    * *Self-Correction:* Even if the user selected a category, is there a *different* category in the framework that fits the story significantly better? If so, you must suggest the better category.

3.  **Component Quality & Specificity:**
    * **Situation:** Is the context clear?
    * **Behavior:** Is the specific action taken by the user distinct? (Avoid "We did...", prefer "I did...").
    * **Impact:** Does it describe a result/value? (Outcome vs. Output).
    * **Action Item:** Is there a concrete next step?

4.  **Scoring Criteria:**
    * **100% (Exemplary):** Flawless application. No corrections needed.
    * **95-99% (High Proficiency):** Excellent, perhaps one minor stylistic polish needed.
    * **75-94% (Proficient):** Meets core criteria but could be sharper (e.g., Impact is vague).
    * **< 75% (Growth Opportunity):** Misaligned category, missing components, or significant vagueness.

**Feedback Guidelines (Tone & Style):**
* **Be Validating:** Start by acknowledging the effort or the value of the task described.
* **Be Constructive:** Use phrases like "To strengthen this...", "To better align with...", "Consider refining..."
* **Be Specific:** Always quote or reference a specific principle from the Framework Markdown to back up your advice.

**Output Requirements:**
You must return a **raw JSON object**.

{
  "matchPercentage": <number>,
  "status": <"Meets criteria" | "Needs improvement">,  // "Meets criteria" if score >= 75
  "rationale": <string>,
  "correctedRecipient": <string or null>,
  "correctedSituation": <string or null>,
  "correctedBehavior": <string or null>,
  "correctedImpact": <string or null>,
  "correctedActionItem": <string or null>
}

**Rules for "Corrected" Fields:**
* If Score >= 75%: Set all \`corrected...\` fields to \`null\`.
* If Score < 75%: You MUST provide a rewritten version of the entry that fixes the issues (e.g., changes the category, sharpens the impact).
* **Perspective:** Corrected fields must use **First-Person ("I", "my")**.
* **Action Items:** Must be forward-looking. Exception: If the point type is **R2 (Peer Feedback)**, \`correctedActionItem\` must be \`null\`.

**Rationale Templates (Customize these based on context):**

* *Category Mismatch:* "This is a valuable task! However, the nature of this work—[mention specific aspect]—aligns more closely with the '[Correct Category Name]' category. The framework defines [Correct Category] as..."
* *Low Score (<75%):* "This is a great start. To make this entry even stronger, let's refine the [Component Name]. The framework encourages us to focus on..."
* *High Score (>=75%):* "Excellent work. You have clearly articulated the [Component Name], which aligns perfectly with the framework's principle of..."

**JSON Examples:**

Example: Misaligned Category (Polite Correction)
{
  "matchPercentage": 65,
  "status": "Needs improvement",
  "rationale": "This is clearly important work regarding detailed scheduling. To ensure you get full credit for this complexity, let's reconsider the category. While you selected 'Objective', this narrative fits the definition of 'ELP (Execution Level Planning)' because it involves creating a step-by-step procedure. Switching categories clarifies your contribution.",
  "correctedRecipient": null,
  "correctedSituation": "The project timeline was at risk due to undefined milestones.",
  "correctedBehavior": "I created a detailed Gantt chart mapping out all dependencies and assigned specific owners to every task.",
  "correctedImpact": "The team now has a clear roadmap, reducing ambiguity and ensuring we hit our Phase 1 deadline.",
  "correctedActionItem": "I will review the Gantt chart weekly with the team to adjust for any blockers."
}

Example: High Score (Supportive Reinforcement)
{
  "matchPercentage": 92,
  "status": "Meets criteria",
  "rationale": "Strong entry! You've done a great job isolating your specific contribution in the 'Behavior' section. This aligns well with the framework's requirement for individual accountability. To polish this further, try quantifying the 'Impact' slightly more if data is available.",
  "correctedRecipient": null,
  "correctedSituation": null,
  "correctedBehavior": null,
  "correctedImpact": null,
  "correctedActionItem": null
}

Example: Invalid/Empty
{
  "matchPercentage": 0,
  "status": "Needs improvement",
  "rationale": "It looks like we are missing some key details here. To help you get the most out of the framework, please fill in the Situation, Behavior, and Impact fields so we can analyze your work effectively.",
  "correctedRecipient": null,
  "correctedSituation": null,
  "correctedBehavior": null,
  "correctedImpact": null,
  "correctedActionItem": null
}
`;
  const functions = getFunctions();
  const analyzeTaskFunction = httpsCallable(functions, "analyzeTask");

  const maxRetries = 3;
  let currentDelay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await analyzeTaskFunction({ prompt });
      const analysis = result.data as AnalysisResult;

      if (
        typeof analysis.matchPercentage !== "number" ||
        typeof analysis.status !== "string" ||
        typeof analysis.rationale !== "string" ||
        (analysis.correctedRecipient !== null &&
          typeof analysis.correctedRecipient !== "string") ||
        (analysis.correctedSituation !== null &&
          typeof analysis.correctedSituation !== "string") ||
        (analysis.correctedBehavior !== null &&
          typeof analysis.correctedBehavior !== "string") ||
        (analysis.correctedImpact !== null &&
          typeof analysis.correctedImpact !== "string") ||
        (analysis.correctedActionItem !== null &&
          typeof analysis.correctedActionItem !== "string")
      ) {
        throw new Error("Invalid JSON structure received from API.");
      }

      // For R2 points, ensure no Action Item corrections are provided
      if (pointType === "R2") {
        analysis.correctedActionItem = null;
      }

      return analysis;
    } catch (error: any) {
      const isRetriable =
        error.message?.includes("503") || error.message?.includes("overloaded");

      if (isRetriable && i < maxRetries - 1) {
        console.warn(
          `Attempt ${
            i + 1
          } failed with a server error. Retrying in ${currentDelay}ms...`
        );
        await sleep(currentDelay);
        currentDelay *= 2;
      } else {
        console.error(`Error on attempt ${i + 1}:`, error);
        if (i === maxRetries - 1) {
          throw new Error(
            "Failed to get analysis from AI. Please check the console for details."
          );
        }
      }
    }
  }

  throw new Error("Failed to get analysis from AI after all retries.");
};
