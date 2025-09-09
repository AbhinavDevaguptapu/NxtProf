import { TaskData, AnalysisResult } from '../types';
import { TASK_FRAMEWORK_MD } from '../constants';
import { getFunctions, httpsCallable } from "firebase/functions";

// Helper function for creating a delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeTask = async (taskData: TaskData): Promise<AnalysisResult> => {
  const { task, taskFrameworkCategory, situation, behavior, impact, action } = taskData;

  // Construct the detailed task information string
  const taskDetailParts = [
    `Original Task: ${task}`,
    taskFrameworkCategory ? `Task Framework Category: ${taskFrameworkCategory}` : null,
    situation ? `Situation(S): ${situation}` : null,
    behavior ? `Behavior(B): ${behavior}` : null,
    impact ? `Impact(I): ${impact}` : null,
    action ? `Action Item(A): ${action}` : null,
  ].filter(Boolean);
  const taskDetailText = taskDetailParts.join('\n');


 const prompt = `
   You are an expert evaluator specializing in personal and professional development frameworks. Your task is to analyze a given task entry against a predefined 'Task Framework' and determine how well the specified 'Task Framework Category' aligns with the framework's principles, considering the provided context (Situation, Behavior, Impact, Action Item).

   Here is the complete 'Task Framework' for your reference:
   ---start of framework---
   ${TASK_FRAMEWORK_MD}
   ---end of framework---

   Here is the user's task entry to evaluate:
   ---start of task entry---
   ${taskDetailText}
   ---end of task entry---

   Your analysis should focus on the following:
   1.  **Analyze the 'Task Framework Category'**: Based on the full 'Task Framework' provided, evaluate if the user has chosen the most appropriate category from the framework for their task.
   2.  **Consider SBI-A Context**: Use the Situation (S), Behavior (B), Impact (I), and Action Item (A) details to understand the full context of the task and to inform your analysis of the chosen category's relevance.
   3.  **Provide a Percentage Match**: Score how well the chosen 'Task Framework Category' fits the task description and context. Be generous with high scores for good matches - give 100% for truly perfect alignments. A score of 90-99% indicates very good matches.
   4.  **Generate a Rationale**: Explain your reasoning in a friendly, encouraging way. If the category is a perfect match, give 100% score and celebrate the great choice without suggesting any changes. For less-than-perfect matches, warmly suggest exactly one better category to improve alignment.
   5.  **Provide Corrections (optional)**: Only when status is "Needs improvement", provide corrected versions of the SBI-A components that would better align with the recommended framework category. Set corrected fields to null for perfect matches or if no improvements needed.
   6.  **Special Handling for Unrelated Topics**: If the task entry appears to be completely unrelated to the 'Task Framework' (e.g., random characters, gibberish, or topics opposite to personal and professional development), or if there is no proper Situation, Behavior, Impact, and Action Item related to the task framework, reject it immediately and provide a matchPercentage of 0, status "Needs improvement", and a rationale explaining why it's unrelated or lacks proper SBI-A context aligned with the framework.

   Your response MUST be a raw JSON object in the following format and nothing else:
   {
     "matchPercentage": <number>,
     "status": <"Meets criteria"|"Needs improvement">,
     "rationale": <string>,
     "correctedSituation": <string or null>,
     "correctedBehavior": <string or null>,
     "correctedImpact": <string or null>,
     "correctedActionItem": <string or null>
   }

   Example for a good match:
   {
     "matchPercentage": 95,
     "status": "Meets criteria",
     "rationale": "Great choice with the 'Objective' category! Your entry perfectly focuses on clarifying the task's purpose and desired outcomes. The SBI-A details wonderfully confirm this excellent alignment with the framework principles.",
     "correctedSituation": null,
     "correctedBehavior": null,
     "correctedImpact": null,
     "correctedActionItem": null
   }

   Example for a perfect match:
   {
     "matchPercentage": 100,
     "status": "Meets criteria",
     "rationale": "Perfect! The 'Objective' category is absolutely ideal for your task. You've demonstrated exceptional understanding by clearly defining the purpose and desired outcomes. Excellent work!",
     "correctedSituation": null,
     "correctedBehavior": null,
     "correctedImpact": null,
     "correctedActionItem": null
   }

   Example for a poor match:
   {
     "matchPercentage": 30,
     "status": "Needs improvement",
     "rationale": "Let's make this even better! Change this task to the 'ELP (Execution Level Planning)' category. Your task details about planning and breaking down work would align much better with ELP principles.",
     "correctedSituation": "During team project planning phase, we needed a structured approach to break down complex deliverables into manageable tasks",
     "correctedBehavior": "I researched ELP methodologies and created a detailed execution plan with clear milestones and dependencies",
     "correctedImpact": "This improved team coordination and reduced project timeline by 25%, ensuring we met all deadlines efficiently",
     "correctedActionItem": "Apply ELP framework to all future projects by conducting weekly planning reviews and updating task breakdowns"
   }

   Example for unrelated topic:
   {
     "matchPercentage": 0,
     "status": "Needs improvement",
     "rationale": "The task entry appears to be random gibberish or unrelated to personal/professional development frameworks. It does not align with any category in the 'Task Framework' and should be reviewed or re-entered.",
     "correctedSituation": null,
     "correctedBehavior": null,
     "correctedImpact": null,
     "correctedActionItem": null
   }
 `;

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
          (analysis.correctedSituation !== null && typeof analysis.correctedSituation !== 'string') ||
          (analysis.correctedBehavior !== null && typeof analysis.correctedBehavior !== 'string') ||
          (analysis.correctedImpact !== null && typeof analysis.correctedImpact !== 'string') ||
          (analysis.correctedActionItem !== null && typeof analysis.correctedActionItem !== 'string')) {
        throw new Error("Invalid JSON structure received from API.");
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