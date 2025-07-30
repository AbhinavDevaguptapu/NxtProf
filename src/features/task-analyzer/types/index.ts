export interface AnalysisResult {
  matchPercentage: number;
  status: "Meets criteria" | "Needs improvement";
  rationale: string;
}

export enum AnalysisStatus {
  PENDING = 'PENDING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

// Represents the raw data for a task fetched from the Google Sheet
export interface TaskData {
  id: string; // Unique ID, e.g., "sheetName-rowIndex"
  date: string;
  task: string;
  taskFrameworkCategory: string;
  situation: string;
  behavior: string;
  impact: string;
  action: string;
  pointType: string;
}

// Represents a task with its analysis state
export interface Task {
  id: string;
  taskData: TaskData;
  analysis: AnalysisResult | null;
  status: AnalysisStatus;
}

// Represents an employee user, typically fetched for admin views.
export interface Employee {
  id: string;
  name: string;
  sheetName: string;
  [key: string]: any; // Allow other properties
}
