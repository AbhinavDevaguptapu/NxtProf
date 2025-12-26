import { Timestamp } from "firebase/firestore";

export type AttendanceStatus = "Present" | "Absent" | "Missed" | "Not Available";

export type LearningHour = {
    synced: any;
    status: "scheduled" | "active" | "ended";
    scheduledTime: Timestamp;
    startedAt?: Timestamp;
    endedAt?: Timestamp;
    scheduledBy: string;
    tempAttendance?: Record<string, AttendanceStatus>;
    absenceReasons?: Record<string, string>;
};

export type Employee = {
    archived: boolean;
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
    learning_hour_id: string;
    scheduled_at: Timestamp;
    markedAt: Timestamp;
    reason?: string;
};

export type LearningPoint = {
  problem: any;
  core_point_missed: any;
    id: string;
    userId: string;
    createdAt: Timestamp;
    date: Timestamp;
        task_name: string;
        task_link?: string;
        situation: string;
        behavior: string;
        impact: string;
        action_item?: string; // Required for R1 points in the form
        point_type: 'R1' | 'R2' | 'R3';
        framework_category: string; // No longer a primary enum in the form
        subcategory: string;
        recipient: string;
        editable: boolean;
        sessionId: string;
    };