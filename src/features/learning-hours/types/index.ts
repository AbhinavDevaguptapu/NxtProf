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
    id: string;
    userId: string;
    createdAt: Timestamp;
    date: Timestamp;
    task_name: string;
    task_link?: string;
    // Fields for R2/R3
    situation?: string;
    behavior?: string;
    impact?: string;
    // Fields for R1
    problem?: string;
    core_point_missed?: string;
    // Optional for R3
    action_item?: string;
    point_type: 'R1' | 'R2' | 'R3';
    framework_category: string; // No longer a primary enum in the form
    subcategory: string;
    recipient: string;
    editable: boolean;
    sessionId: string;
};