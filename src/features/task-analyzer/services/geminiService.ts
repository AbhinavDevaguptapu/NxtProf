import { TaskData, AnalysisResult } from '../types';
import { TASK_FRAMEWORK_MD } from '../constants';
import { getFunctions, httpsCallable } from "firebase/functions";

// Helper function for creating a delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeTask = async (taskData: TaskData): Promise<AnalysisResult> => {
  const { task, taskFrameworkCategory, situation, behavior, impact, action, recipient, pointType } = taskData;

  // Construct the detailed task information string
  const taskDetailParts = [
    `Original Task: ${task}`,
    taskFrameworkCategory ? `Task Framework Category: ${taskFrameworkCategory}` : null,
    recipient ? `Recipient: ${recipient}` : null,
    situation ? `Situation(S): ${situation}` : null,
    behavior ? `Behavior(B): ${behavior}` : null,
    impact ? `Impact(I): ${impact}` : null,
    action ? `Action Item(A): ${action}` : null,
  ].filter(Boolean);
  const taskDetailText = taskDetailParts.join('\n');

  const prompt = `You are a friendly and supportive coach for the 'Essentials of Task Framework' program. Your main goal is to help users understand and apply the framework effectively.

Your feedback should be encouraging and clear, helping users master the framework with constructive guidance.

Here is the official and complete **'Essentials of Task Framework'** document. It is your only source of truth.

---start of framework---
${TASK_FRAMEWORK_MD}
---end of framework---

Here is the user's task entry you must evaluate against the framework:
---start of task entry---
${taskDetailText}
---end of task entry---

Your analysis process MUST follow these steps without deviation:

1.  **Category Alignment Check**: First, check if the user's entry (Situation, Behavior, Impact) aligns well with the chosen 'Task Framework Category'.
    *   Carefully read the user's S, B, and I.
    *   Compare the user's narrative to the definition of the *chosen category* in the framework document.
    *   Then, consider if another category from the framework would be a *better* fit.
    *   If another category seems like a better fit, gently guide the user toward the more appropriate category, explaining your reasoning with examples from the framework.

2.  **Framework Compliance Review**: If the category is correct, review the S, B, and I components against the principles of that category. They should align well with the category's definition and the framework's principles.

3.  **Component Clarity Analysis**: Inspect the S, B, and I components. Each should be distinct and clear. A clear 'Objective' is key, and the S-B-I format helps articulate it. Vague components should be flagged for revision with helpful suggestions.

4.  **Adherence Scoring**: Assign a percentage score based on how well the entry adheres to the 'Task Framework'. A misaligned category should result in a lower score (e.g., below 75%) to highlight the learning opportunity.
    *   **100%**: Excellent! A perfect textbook example of the framework's principles in the correct category.
    *   **95-99%**: Great job! The entry correctly applies the framework with high accuracy.
    *   **85-94%**: Good work! The entry meets the core criteria, with some areas for refinement.
    *   **< 85%**: Needs improvement. This is a good start, but requires revision to meet the framework's standards.

5.  **Status Assignment**: Set "status" to "Meets criteria" if matchPercentage >= 85, otherwise "Needs improvement".

6.  **Encouraging, Framework-Grounded Rationale**: Provide a polite, direct, and constructive rationale for your score.
    *   If there is a category mismatch, you **MUST** begin the rationale with "To better align with the Task Framework, let's reconsider the chosen category for this entry."
    *   If the score is < 85%, you **MUST** begin the rationale with "This is a good start! To make it even stronger, let's revise it to fully align with the selected Task Framework category."
    *   In both cases, politely identify the core deviation and **quote or directly reference the relevant principle from the 'Task Framework' document** to explain why the revision is helpful.
    *   If the score is >= 85%, politely confirm the entry's compliance. Briefly praise one specific aspect that aligns well with the framework, and if the score is below 95%, gently suggest one area for refinement.

7.  **Constructive Suggestions for Improvement**:
    *   Provide suggestions in the \`corrected...\` fields **only** for entries with a score < 85%.
    *   The suggestions should be friendly and serve as a clear, complete example of how to improve.
    *   **Crucially, you must provide a \`correctedActionItem\` unless the point type is R2.** The action item should be a specific, forward-looking step that the user should take based on the situation.
    *   If the primary issue is a category mismatch, the corrected fields should reflect an ideal entry for the *suggested* category.
    *   For R2 points (peer feedback), \`correctedActionItem\` must always be \`null\`.
    *   If no suggestions are needed (i.e., score >= 85%), all \`corrected...\` fields MUST be \`null\`.

8.  **Invalid Entry Protocol**: If an entry is irrelevant or lacks the mandatory S, B, or I components, assign a \`matchPercentage\` of 0. The \`rationale\` should politely explain that the entry is missing some key information (Situation, Behavior, or Impact) and can't be evaluated yet. Encourage the user to provide the missing details.

Your response **MUST** be a raw JSON object and nothing else.

{
  "matchPercentage": <number>,
  "status": <"Meets criteria"|"Needs improvement">,
  "rationale": <string>,
  "correctedRecipient": <string or null>,
  "correctedSituation": <string or null>,
  "correctedBehavior": <string or null>,
  "correctedImpact": <string or null>,
  "correctedActionItem": <string or null>
}

**JSON Output Examples:**

Example for Flawless Adherence:
{
  "matchPercentage": 100,
  "status": "Meets criteria",
  "rationale": "Excellent. This entry is a perfect example of the 'Objective' principle. The components are clear, and the focus on the final outcome is exemplary.",
  "correctedRecipient": null,
  "correctedSituation": null,
  "correctedBehavior": null,
  "correctedImpact": null,
  "correctedActionItem": null
}

Example for Non-Compliance (Misaligned Category):
{
  "matchPercentage": 65,
  "status": "Needs improvement",
  "rationale": "To better align with the Task Framework, let's reconsider the chosen category for this entry. The task described involves detailed planning, which more accurately fits the 'ELP (Execution Level Planning)' category. As the framework states, a proper ELP 'gives us a step-by-step procedure to reach our objective within the timeframe.'",
  "correctedRecipient": null,
  "correctedSituation": "The project was falling behind schedule due to unclear priorities.",
  "correctedBehavior": "I organized a meeting to redefine the project roadmap and assign clear tasks.",
  "correctedImpact": "The team is now aligned, and the project is back on track to meet the deadline.",
  "correctedActionItem": "To ensure continued alignment, I will circulate the updated roadmap and set up a weekly 15-minute check-in to monitor progress against the new plan."
}

Example for Good Work (Component for Refinement):
{
  "matchPercentage": 88,
  "status": "Meets criteria",
  "rationale": "Good work! This entry meets the core criteria of the selected category. To make it even better, consider making the 'Impact' component more specific. The framework's 'Outcome vs Output' principle teaches us to focus on the value or change created, not just the task completion.",
  "correctedRecipient": null,
  "correctedSituation": null,
  "correctedBehavior": null,
  "correctedImpact": null,
  "correctedActionItem": null
}

Example for Invalid Entry:
{
  "matchPercentage": 0,
  "status": "Needs improvement",
  "rationale": "This entry cannot be evaluated yet. To adhere to the Task Framework, every entry must describe a professional task and include specific Situation, Behavior, and Impact components. Please add the missing details so we can analyze it.",
  "correctedRecipient": null,
  "correctedSituation": null,
  "correctedBehavior": null,
  "correctedImpact": null,
  "correctedActionItem": null
}
`
  const functions = getFunctions();
  const analyzeTaskFunction = httpsCallable(functions, 'analyzeTask');

  const maxRetries = 3;
  let currentDelay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await analyzeTaskFunction({ prompt });
      const analysis = result.data as AnalysisResult;

      if (typeof analysis.matchPercentage !== 'number' ||
        typeof analysis.status !== 'string' ||
        typeof analysis.rationale !== 'string' ||
        (analysis.correctedRecipient !== null && typeof analysis.correctedRecipient !== 'string') ||
        (analysis.correctedSituation !== null && typeof analysis.correctedSituation !== 'string') ||
        (analysis.correctedBehavior !== null && typeof analysis.correctedBehavior !== 'string') ||
        (analysis.correctedImpact !== null && typeof analysis.correctedImpact !== 'string') ||
        (analysis.correctedActionItem !== null && typeof analysis.correctedActionItem !== 'string')) {
        throw new Error("Invalid JSON structure received from API.");
      }

      // For R2 points, ensure no Action Item corrections are provided
      if (pointType === 'R2') {
        analysis.correctedActionItem = null;
      }

      return analysis;

    } catch (error: any) {
      const isRetriable = error.message?.includes('503') || error.message?.includes('overloaded');

      if (isRetriable && i < maxRetries - 1) {
        console.warn(`Attempt ${i + 1} failed with a server error. Retrying in ${currentDelay}ms...`);
        await sleep(currentDelay);
        currentDelay *= 2;
      } else {
        console.error(`Error on attempt ${i + 1}:`, error);
        if (i === maxRetries - 1) {
          throw new Error("Failed to get analysis from AI. Please check the console for details.");
        }
      }
    }
  }

  throw new Error("Failed to get analysis from AI after all retries.");
};