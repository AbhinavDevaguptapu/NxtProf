import { getFunctions, httpsCallable, Functions } from "firebase/functions";
import { Employee } from "../types";

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
      "getEmployeesWithAdminStatus"
    );
    const result = await getEmployeesFunction();
    return result.data;
  } catch (error) {
    console.error("Error calling getEmployees cloud function:", error);
    throw new Error("Could not fetch the list of employees.");
  }
};
