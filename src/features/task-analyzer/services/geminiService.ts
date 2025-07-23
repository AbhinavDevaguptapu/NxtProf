import { TaskData, AnalysisResult } from '../types';
import { TASK_FRAMEWORK_MD } from '../constants';
import { getFunctions, httpsCallable } from "firebase/functions";

// Helper function for creating a delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeTask = async (taskData: TaskData): Promise<AnalysisResult> => {
  const { task, taskFrameworkCategory, situation, behavior, impact, action } = taskData;

  if (!task) {
    return {
      matchPercentage: 0,
      status: "Needs improvement",
      rationale: "Task description is empty."
    };
  }

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
    3.  **Provide a Percentage Match**: Score how well the chosen 'Task Framework Category' fits the task description and context. A high score (90-100%) means the category is a perfect or near-perfect match. A low score indicates a mismatch.
    4.  **Generate a Rationale**: Explain your reasoning. If the category is a good match, explain why, referencing both the framework and the task details. If it's a poor match, explain why and suggest a more appropriate category from the framework.

    Your response MUST be a raw JSON object in the following format and nothing else:
    {
      "matchPercentage": <number>,
      "status": <"Meets criteria"|"Needs improvement">,
      "rationale": <string>
    }

    Example for a good match:
    {
      "matchPercentage": 95,
      "status": "Meets criteria",
      "rationale": "The category 'Objective' is well-chosen. The user's entry focuses on clarifying the task's purpose and desired outcomes, which directly aligns with the 'Objective' principle of the framework. The SBI-A details confirm this focus."
    }

    Example for a poor match:
    {
      "matchPercentage": 30,
      "status": "Needs improvement",
      "rationale": "The category 'Commitment' is a mismatch. The task details describe planning and breaking down the work, which more closely aligns with the 'ELP (Execution Level Planning)' principle. The user should consider re-categorizing this task to 'ELP' for better alignment."
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

      if (typeof analysis.matchPercentage !== 'number' || typeof analysis.status !== 'string' || typeof analysis.rationale !== 'string') {
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