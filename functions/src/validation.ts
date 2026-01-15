/**
 * @file Centralized Zod validation schemas for Cloud Functions
 * @description Provides reusable validation schemas for input validation across all functions
 */
import { z } from "zod";
import { HttpsError } from "firebase-functions/v2/https";

// ============================================
// Common Schemas
// ============================================

/** Firebase UID validation */
export const uidSchema = z
  .string()
  .min(1, "UID is required")
  .max(128, "UID too long");

/** Email validation */
export const emailSchema = z
  .string()
  .email("Invalid email format")
  .transform((s) => s.trim().toLowerCase());

/** Date string validation (YYYY-MM-DD format) */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

/** Month string validation (YYYY-MM format) */
export const monthStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format");

// ============================================
// Attendance Sync Schemas
// ============================================

export const syncToSheetSchema = z.object({
  date: dateStringSchema,
  sessionType: z.enum(["standups", "learning_hours"], {
    errorMap: () => ({
      message: "Session type must be 'standups' or 'learning_hours'",
    }),
  }),
});

export type SyncToSheetInput = z.infer<typeof syncToSheetSchema>;

// ============================================
// User Management Schemas
// ============================================

export const roleManagementSchema = z.object({
  email: emailSchema,
});

export const uidParamSchema = z.object({
  uid: uidSchema,
});

export type RoleManagementInput = z.infer<typeof roleManagementSchema>;
export type UidParamInput = z.infer<typeof uidParamSchema>;

// ============================================
// Feedback Schemas
// ============================================

export const feedbackRequestSchema = z
  .object({
    employeeId: uidSchema,
    timeFrame: z.enum(["daily", "monthly", "specific", "range", "full"]),
    date: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.timeFrame === "range") {
        return !!data.startDate && !!data.endDate;
      }
      if (data.timeFrame === "daily" || data.timeFrame === "specific") {
        return !!data.date;
      }
      return true;
    },
    { message: "Missing required date parameters for the selected time frame" }
  );

export type FeedbackRequestInput = z.infer<typeof feedbackRequestSchema>;

// ============================================
// Learning Sessions Schemas
// ============================================

export const sessionIdSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required").max(100),
});

export const syncByDateSchema = z.object({
  date: dateStringSchema,
});

export type SessionIdInput = z.infer<typeof sessionIdSchema>;
export type SyncByDateInput = z.infer<typeof syncByDateSchema>;

// ============================================
// Performance Schemas
// ============================================

export const performanceRequestSchema = z.object({
  employeeId: uidSchema,
  month: monthStringSchema,
});

export type PerformanceRequestInput = z.infer<typeof performanceRequestSchema>;

// ============================================
// Peer Feedback Schemas
// ============================================

export const peerFeedbackSchema = z.object({
  targetId: uidSchema,
  projectOrTask: z
    .string()
    .min(1)
    .max(255)
    .transform((s) => s.trim()),
  workEfficiency: z.number().min(0).max(5),
  easeOfWork: z.number().min(0).max(5),
  remarks: z
    .string()
    .min(1)
    .max(1000)
    .transform((s) => s.trim()),
});

export type PeerFeedbackInput = z.infer<typeof peerFeedbackSchema>;

// ============================================
// Task Analysis Schemas
// ============================================

export const analyzeTaskSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(20000, "Prompt is too long")
    .transform((s) => s.trim()),
});

export type AnalyzeTaskInput = z.infer<typeof analyzeTaskSchema>;

// ============================================
// Validation Helper
// ============================================

/**
 * Validates input data against a Zod schema and throws HttpsError on failure
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.errors.map((e) => e.message).join(", ");
    throw new HttpsError("invalid-argument", errorMessages);
  }
  return result.data;
}
