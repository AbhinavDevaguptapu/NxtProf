import { getFunctions, httpsCallable, Functions } from "firebase/functions";
import { TaskData, Employee } from "../types";

let functionsInstance: Functions;

function getFunctionsInstance(): Functions {
  if (!functionsInstance) {
    functionsInstance = getFunctions();
  }
  return functionsInstance;
}

export const getEmployees = async (): Promise<Employee[]> => {
  try {
    const getEmployeesFunction = httpsCallable<unknown, Employee[]>(
      getFunctionsInstance(),
      'getEmployeesWithAdminStatus'
    );
    const result = await getEmployeesFunction();
    return result.data;
  } catch (error) {
    console.error("Error calling getEmployees cloud function:", error);
    throw new Error("Could not fetch the list of employees.");
  }
};

export const getLearningPointsForEmployee = async (employeeId: string): Promise<TaskData[]> => {
  if (!employeeId) {
    throw new Error("An employee ID must be provided.");
  }

  try {
    const getLearningPoints = httpsCallable<{ employeeId: string }, TaskData[]>(
      getFunctionsInstance(),
      'getLearningPointsForEmployee'
    );
    const result = await getLearningPoints({ employeeId });
    return result.data;
  } catch (error) {
    console.error("Error calling getLearningPointsForEmployee cloud function:", error);
    throw new Error(`Failed to fetch learning points for employee "${employeeId}". Please try again.`);
  }
};