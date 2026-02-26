import { httpsCallable } from "firebase/functions";
import { functions } from "@/integrations/firebase/client";
import { Employee } from "../types";

export const getEmployees = async (): Promise<Employee[]> => {
  try {
    const getEmployeesFunction = httpsCallable<unknown, Employee[]>(
      functions,
      "getEmployeesWithAdminStatus",
    );
    const result = await getEmployeesFunction();
    return result.data;
  } catch (error) {
    console.error("Error calling getEmployees cloud function:", error);
    throw new Error("Could not fetch the list of employees.");
  }
};
