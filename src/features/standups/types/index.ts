import type { Timestamp } from "firebase/firestore";

export type AttendanceStatus = "Present" | "Absent" | "Missed" | "Not Available";

export type Standup = {
  status: "scheduled" | "active" | "ended";
  scheduledTime: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
  scheduledBy: string;
  tempAttendance?: Record<string, AttendanceStatus>;
  absenceReasons?: Record<string, string>;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  employeeId: string;
};

export type AttendanceRecord = {
  employeeId: string;
  employee_email: string;
  employee_id: string;
  employee_name: string;
  status: AttendanceStatus;
  standup_id: string;
  scheduled_at: Timestamp;
  markedAt: Timestamp;
  reason?: string;
};
