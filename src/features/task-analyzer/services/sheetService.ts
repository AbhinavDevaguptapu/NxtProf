import { getFunctions, httpsCallable, Functions } from "firebase/functions";
import { TaskData, Employee } from "../types";

// A reusable reference to the Firebase Functions instance
let functionsInstance: Functions;

function getFunctionsInstance(): Functions {
  if (!functionsInstance) {
    functionsInstance = getFunctions();
  }
  return functionsInstance;
}

/**
 * Fetches the list of all employees with their ID and name.
 * This is intended for admin use to populate selection lists.
 */
export const getEmployees = async (): Promise<Employee[]> => {
  try {
    const getEmployeesFunction = httpsCallable<unknown, Employee[]>(
      getFunctionsInstance(),
      'getEmployeesWithAdminStatus' // Assuming this function returns { id, name }
    );
    const result = await getEmployeesFunction();
    return result.data;
  } catch (error) {
    console.error("Error calling getEmployees cloud function:", error);
    throw new Error("Could not fetch the list of employees.");
  }
};


/**
 * Fetches subsheet names from the master Google Sheet.
 * The backend determines which sheets to return based on the user's role (admin vs. regular user).
 */
export const getSubsheetNames = async (): Promise<Employee[]> => {
  try {
    const getSubsheets = httpsCallable<unknown, Employee[]>(
      getFunctionsInstance(), 
      'getSubsheetNames'
    );
    // No parameters are needed.
    const result = await getSubsheets();
    return result.data;
  } catch (error) {
    console.error("Error calling getSubsheetNames cloud function:", error);
    throw new Error("Could not fetch the list of sheets. Please check server logs.");
  }
};

/**
 * Fetches and processes data from a specific subsheet by name.
 * The backend handles permissions to ensure users can only access their own sheet.
 * @param sheetName The name of the subsheet to fetch data from.
 */
export const getSheetData = async (sheetName: string): Promise<TaskData[]> => {
  if (!sheetName) {
    throw new Error("A sheet name must be provided.");
  }

  try {
    const getSheet = httpsCallable<{ sheetName: string }, TaskData[]>(
      getFunctionsInstance(),
      'getSheetData'
    );
    // Only the sheetName is required now.
    const result = await getSheet({ sheetName });
    return result.data;
  } catch (error) {
    console.error("Error calling getSheetData cloud function:", error);
    throw new Error(`Failed to fetch data for sheet "${sheetName}". Please try again.`);
  }
};