"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeTaskSchema = exports.peerFeedbackSchema = exports.performanceRequestSchema = exports.syncByDateSchema = exports.sessionIdSchema = exports.feedbackRequestSchema = exports.uidParamSchema = exports.roleManagementSchema = exports.syncToSheetSchema = exports.monthStringSchema = exports.dateStringSchema = exports.emailSchema = exports.uidSchema = void 0;
exports.validateInput = validateInput;
/**
 * @file Centralized Zod validation schemas for Cloud Functions
 * @description Provides reusable validation schemas for input validation across all functions
 */
const zod_1 = require("zod");
const https_1 = require("firebase-functions/v2/https");
// ============================================
// Common Schemas
// ============================================
/** Firebase UID validation */
exports.uidSchema = zod_1.z
    .string()
    .min(1, "UID is required")
    .max(128, "UID too long");
/** Email validation */
exports.emailSchema = zod_1.z
    .string()
    .email("Invalid email format")
    .transform((s) => s.trim().toLowerCase());
/** Date string validation (YYYY-MM-DD format) */
exports.dateStringSchema = zod_1.z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");
/** Month string validation (YYYY-MM format) */
exports.monthStringSchema = zod_1.z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format");
// ============================================
// Attendance Sync Schemas
// ============================================
exports.syncToSheetSchema = zod_1.z.object({
    date: exports.dateStringSchema,
    sessionType: zod_1.z.enum(["standups", "learning_hours"], {
        errorMap: () => ({
            message: "Session type must be 'standups' or 'learning_hours'",
        }),
    }),
});
// ============================================
// User Management Schemas
// ============================================
exports.roleManagementSchema = zod_1.z.object({
    email: exports.emailSchema,
});
exports.uidParamSchema = zod_1.z.object({
    uid: exports.uidSchema,
});
// ============================================
// Feedback Schemas
// ============================================
exports.feedbackRequestSchema = zod_1.z
    .object({
    employeeId: exports.uidSchema,
    timeFrame: zod_1.z.enum(["daily", "monthly", "specific", "range", "full"]),
    date: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
})
    .refine((data) => {
    if (data.timeFrame === "range") {
        return !!data.startDate && !!data.endDate;
    }
    if (data.timeFrame === "daily" || data.timeFrame === "specific") {
        return !!data.date;
    }
    return true;
}, { message: "Missing required date parameters for the selected time frame" });
// ============================================
// Learning Sessions Schemas
// ============================================
exports.sessionIdSchema = zod_1.z.object({
    sessionId: zod_1.z.string().min(1, "Session ID is required").max(100),
});
exports.syncByDateSchema = zod_1.z.object({
    date: exports.dateStringSchema,
});
// ============================================
// Performance Schemas
// ============================================
exports.performanceRequestSchema = zod_1.z.object({
    employeeId: exports.uidSchema,
    month: exports.monthStringSchema,
});
// ============================================
// Peer Feedback Schemas
// ============================================
exports.peerFeedbackSchema = zod_1.z.object({
    targetId: exports.uidSchema,
    projectOrTask: zod_1.z
        .string()
        .min(1)
        .max(255)
        .transform((s) => s.trim()),
    workEfficiency: zod_1.z.number().min(0).max(5),
    easeOfWork: zod_1.z.number().min(0).max(5),
    remarks: zod_1.z
        .string()
        .min(1)
        .max(1000)
        .transform((s) => s.trim()),
});
// ============================================
// Task Analysis Schemas
// ============================================
exports.analyzeTaskSchema = zod_1.z.object({
    prompt: zod_1.z
        .string()
        .min(1, "Prompt is required")
        .max(20000, "Prompt is too long")
        .transform((s) => s.trim()),
});
// ============================================
// Validation Helper
// ============================================
/**
 * Validates input data against a Zod schema and throws HttpsError on failure
 */
function validateInput(schema, data) {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errorMessages = result.error.errors.map((e) => e.message).join(", ");
        throw new https_1.HttpsError("invalid-argument", errorMessages);
    }
    return result.data;
}
//# sourceMappingURL=validation.js.map