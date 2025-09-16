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


 const prompt = `
   You are an expert evaluator specializing in personal and professional development frameworks. Your task is to analyze a given task entry against a predefined 'Task Framework' and determine how well the specified 'Task Framework Category' aligns with the framework's principles, considering the provided context (Situation, Behavior, Impact, and Action Item if provided).

   Here is the complete 'Task Framework' for your reference:
   ---start of framework---
   ${TASK_FRAMEWORK_MD}
   ---end of framework---

   Here is the user's task entry to evaluate:
   ---start of task entry---
   ${taskDetailText}
   ---end of task entry---

   Your analysis should focus on the following:
   1.  **Analyze the 'Task Framework Category'**: Based on the full 'Task Framework' provided, evaluate if the user has chosen the most appropriate category from the framework for their task, considering whether this is a learning point for themselves (Recipient: Self) or for others (peer feedback/learning from others). Be generous and give the benefit of the doubt - most category choices have some reasonable alignment. For R2 points, be especially encouraging and friendly in your assessment.
   2.  **Consider Context Details**: Use the Recipient, Situation (S), Behavior (B), Impact (I), and Action Item (A) details (if provided) to understand the full context of the task. For self-learning points, focus on personal growth and improvement. For points given to others (R2), focus on constructive feedback and peer learning opportunities, and do NOT suggest Action Item corrections.
   3.  **Provide a Percentage Match**: Score how well the chosen 'Task Framework Category' fits the task description and context. Be very generous with high scores - give 90%+ for any reasonable alignment. Only give scores below 80% for truly poor matches that don't align with the framework at all.
   4.  **Generate a Rationale**: Always explain your reasoning in a friendly, encouraging, and supportive way. Celebrate the user's effort and insights. If the category shows any reasonable alignment, acknowledge the good thinking and give positive feedback. Only suggest an alternative category if there's a clearly superior option that would significantly improve the alignment - otherwise, encourage the current choice.
   5.  **Provide Corrections (optional)**: Only when status is "Needs improvement", provide corrected versions of the SBI-A components that would better align with the recommended framework category. For R2 points, never provide Action Item corrections (set correctedActionItem to null). Set corrected fields to null for perfect matches or if no improvements needed.
   6.  **Special Handling for Unrelated Topics**: Only if the task entry appears to be completely unrelated to the 'Task Framework' (e.g., random characters, gibberish, or topics completely opposite to personal and professional development), or if there is absolutely no proper Recipient, Situation, Behavior, Impact related to the task framework (Action Item is optional), then gently reject it with a matchPercentage of 0, status "Needs improvement", and a supportive rationale encouraging the user to try again with framework-aligned content.

   Your response MUST be a raw JSON object in the following format and nothing else:
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

   Example for a good match:
   {
     "matchPercentage": 95,
     "status": "Meets criteria",
     "rationale": "Fantastic work! Your choice of the 'Objective' category is spot-on and shows real insight into the framework. The way you've described your situation, behavior, and impact demonstrates thoughtful reflection. You're doing excellent work here - keep it up!",
     "correctedRecipient": null,
     "correctedSituation": null,
     "correctedBehavior": null,
     "correctedImpact": null,
     "correctedActionItem": null
   }

   Example for a perfect match:
   {
     "matchPercentage": 100,
     "status": "Meets criteria",
     "rationale": "Absolutely brilliant! 🎉 Your choice of the 'Objective' category is perfection itself. The way you've articulated your learning experience shows exceptional insight and framework understanding. This is exactly the kind of thoughtful analysis that drives real growth. You're amazing at this!",
     "correctedRecipient": null,
     "correctedSituation": null,
     "correctedBehavior": null,
     "correctedImpact": null,
     "correctedActionItem": null
   }

   Example for needs improvement (only when truly misaligned):
   {
     "matchPercentage": 65,
     "status": "Needs improvement",
     "rationale": "You're doing great work here! While your current category has some alignment, the 'ELP (Execution Level Planning)' category might be an even better fit for project planning tasks like this. Your approach to breaking down work is really thoughtful - keep up the excellent work!",
     "correctedRecipient": null,
     "correctedSituation": null,
     "correctedBehavior": null,
     "correctedImpact": null,
     "correctedActionItem": null
   }

   Example for R2 peer feedback point:
   {
     "matchPercentage": 92,
     "status": "Meets criteria",
     "rationale": "What a wonderful team player you are! 🌟 Your peer feedback is absolutely spot-on and shows such genuine appreciation for your colleague's contributions. The 'Outcome vs Output' category is perfect for highlighting the difference between busy work and meaningful results. You're helping create an amazing, supportive team culture - thank you for being such a positive force!",
     "correctedRecipient": null,
     "correctedSituation": null,
     "correctedBehavior": null,
     "correctedImpact": null,
     "correctedActionItem": null
   }

   Example for unrelated topic:
   {
     "matchPercentage": 0,
     "status": "Needs improvement",
     "rationale": "Hmm, this entry doesn't quite align with our personal and professional development framework yet. That's okay - learning is a journey! Try focusing on a work situation where you learned something valuable, and we'll help you categorize it perfectly. You've got this!",
     "correctedRecipient": null,
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