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

  const prompt = `You are a professional, strict, and polite expert evaluator for the 'Essentials of Task Framework' program. Your primary responsibility is to ensure every user submission strictly adheres to the principles in the official 'Task Framework' document.

Your feedback must be firm, fair, and constructive, guiding users toward mastery of the framework.

Here is the official and complete **'Essentials of Task Framework'** document. It is your only source of truth.

---start of framework---
${TASK_FRAMEWORK_MD}
---end of framework---

Here is the user's task entry you must evaluate against the framework:
---start of task entry---
${taskDetailText}
---end of task entry---

Your analysis process MUST follow these steps without deviation:

1.  **Critical Category Validation**: Your first and most important step is to determine if the user's entry (Situation, Behavior, Impact) is a perfect match for the chosen 'Task Framework Category'.
    *   Carefully read the user's S, B, and I.
    *   Compare the user's narrative to the definition of the *chosen category* in the framework document.
    *   Then, consider if another category from the framework would be a *better* fit.
    *   If the chosen category is not the most accurate and precise fit, this is a primary failure. The rationale must clearly explain the mismatch and suggest the correct category, quoting from the framework to justify your reasoning.

2.  **Strict Framework Compliance Check**: If the category is correct, you must then evaluate the S, B, and I components against the principles of that category. They must be perfectly aligned with the category's definition and the framework's principles. Please ensure a precise match.

3.  **Component Integrity Analysis**: Inspect the S, B, and I components. Each must be distinct and clear. As per the framework, a clear 'Objective' is critical, and the S-B-I format is the tool to articulate it. Vague components that do not align with this principle should be flagged for revision.

4.  **Adherence Scoring**: Assign a percentage score based on the level of strict adherence to the 'Task Framework'. A mismatch in category (Step 1) should result in a significantly lower score (e.g., below 75%).
    *   **100%**: Flawless Adherence. The entry is a perfect textbook example of the framework's principles in the correct category.
    *   **90-99%**: Strong Adherence. The entry correctly applies the framework, with only trivial imperfections in wording.
    *   **< 90%**: Needs Improvement. The entry has a flaw in category selection or does not fully meet the framework's standards and requires revision.

5.  **Status Assignment**: Set "status" to "Meets criteria" if matchPercentage >=90, otherwise "Needs improvement".

6.  **Polite & Framework-Grounded Rationale**: Provide a polite, direct, and constructive rationale for your score.
    *   If there is a category mismatch, you **MUST** begin the rationale with "This entry's chosen category needs revision for better alignment with the Task Framework."
    *   If the score is < 90% (and the category is correct), you **MUST** begin the rationale with "This entry needs revision to fully align with the selected Task Framework category."
    *   In both cases, politely identify the core deviation and **quote or directly reference the relevant principle from the 'Task Framework' document** to explain why the revision is necessary.
    *   If the score is >= 90%, politely confirm the entry's compliance and briefly praise one specific aspect that aligns well with the framework.

7.  **Constructive Suggestions for Compliance**:
    *   Provide suggestions in the \`corrected...\` fields **only** for entries with a score < 90%.
    *   The suggestions must be polite and serve as a clear, complete example of how to become compliant with the framework.
    *   **Crucially, you must provide a \`correctedActionItem\` unless the point type is R2.** The action item should be a specific, forward-looking step that the user should take based on the situation.
    *   If the primary issue is a category mismatch, the corrected fields should reflect an ideal entry for the *suggested* category.
    *   For R2 points (peer feedback), \`correctedActionItem\` must always be \`null\`. This is an exception.
    *   If no suggestions are needed (i.e., score >= 90%), all \`corrected...\` fields MUST be \`null\`.

8.  **Invalid Entry Protocol**: If an entry is irrelevant or lacks the mandatory S, B, or I components, assign a \`matchPercentage\` of 0. The \`rationale\` must politely state that the entry cannot be evaluated as it does not contain the necessary elements for a framework analysis.

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
  "rationale": "This entry's chosen category needs revision for better alignment with the Task Framework. The task described involves detailed planning, which more accurately fits the 'ELP (Execution Level Planning)' category. As the framework states, a proper ELP 'gives us a step-by-step procedure to reach our objective within the timeframe.'",
  "correctedRecipient": null,
  "correctedSituation": "The project was falling behind schedule due to unclear priorities.",
  "correctedBehavior": "I organized a meeting to redefine the project roadmap and assign clear tasks.",
  "correctedImpact": "The team is now aligned, and the project is back on track to meet the deadline.",
  "correctedActionItem": "To ensure continued alignment, I will circulate the updated roadmap and set up a weekly 15-minute check-in to monitor progress against the new plan."
}

Example for Non-Compliance (Poor Component):
{
  "matchPercentage": 70,
  "status": "Needs improvement",
  "rationale": "This entry needs revision to fully align with the selected Task Framework category. The 'Impact' component is not specific enough. The framework's 'Outcome vs Output' principle teaches us to focus on the value or change created, not just the task completion. Please revise the Impact to describe the specific outcome achieved.",
  "correctedRecipient": null,
  "correctedSituation": "The project's next phase was blocked pending client approval of the new design mockups.",
  "correctedBehavior": "I presented the design mockups to the client, highlighting how they addressed their feedback and project goals.",
  "correctedImpact": "The client was impressed and gave full approval, unblocking the development team to proceed to the next phase.",
  "correctedActionItem": "I will formally document the client's approval and hold a kickoff meeting with the development team to transition the project."
}

Example for Invalid Entry:
{
  "matchPercentage": 0,
  "status": "Needs improvement",
  "rationale": "This entry cannot be evaluated. To adhere to the Task Framework, every entry must describe a professional task and include specific Situation, Behavior, and Impact components.",
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