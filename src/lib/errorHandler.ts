/**
 * Error Handler Utility
 * Converts backend errors and exceptions into user-friendly, readable messages
 */

// Error message mapping for common error types
const errorMessageMap: Record<string, string> = {
  // Authentication Errors
  "auth/invalid-email":
    "The email address is not valid. Please check and try again.",
  "auth/user-disabled":
    "This account has been disabled. Contact the administrator.",
  "auth/user-not-found":
    "No account found with this email. Please sign up first.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/email-already-in-use":
    "This email is already registered. Try logging in instead.",
  "auth/weak-password": "Password is too weak. Use at least 6 characters.",
  "auth/too-many-requests": "Too many failed attempts. Please try again later.",

  // Firestore Errors
  "permission-denied": "You don't have permission to perform this action.",
  "not-found": "The requested item was not found.",
  "already-exists": "This item already exists.",
  "invalid-argument":
    "Some of the information provided is invalid. Please check and try again.",
  "failed-precondition":
    "Unable to complete this action at this time. Please try again later.",
  aborted: "The operation was cancelled. Please try again.",
  "out-of-range": "The value provided is out of valid range.",
  unimplemented: "This feature is not available yet.",
  internal: "An internal server error occurred. Please try again later.",
  unavailable:
    "The service is temporarily unavailable. Please try again later.",
  "data-loss": "Data loss detected. Please refresh and try again.",
  unauthenticated: "You need to be logged in to perform this action.",

  // Firebase Cloud Functions Errors
  "functions/not-found": "The requested function was not found.",
  "functions/permission-denied":
    "You don't have permission to call this function.",
  "functions/resource-exhausted":
    "The service is currently busy. Please try again later.",
  "functions/unauthenticated": "Please log in to continue.",
  "functions/invalid-argument": "The information provided is invalid.",
  "functions/deadline-exceeded": "The request took too long. Please try again.",
  "functions/internal": "A server error occurred. Please try again later.",

  // Network Errors
  "network-error":
    "Network connection failed. Please check your internet connection.",
  timeout: "Request timeout. Please check your connection and try again.",

  // Custom API Errors
  "user-already-exists": "This user account already exists.",
  "invalid-credentials": "The credentials provided are invalid.",
  "session-expired": "Your session has expired. Please log in again.",
  "insufficient-permissions":
    "You don't have the required permissions for this action.",
  "resource-in-use":
    "This resource is currently in use and cannot be modified.",
  "validation-error": "Please check the information you entered and try again.",
  "duplicate-entry":
    "This entry already exists. Please use different information.",
  "rate-limited": "Too many requests. Please wait a moment and try again.",
};

/**
 * Parse Firebase error code
 */
function getErrorCode(error: any): string {
  // Handle Firebase error objects
  if (error?.code) {
    return error.code;
  }

  // Handle Firebase function error codes
  if (error?.message) {
    const message = error.message.toLowerCase();
    // Check for common error patterns in error messages
    if (message.includes("permission")) return "permission-denied";
    if (message.includes("not found") || message.includes("404"))
      return "not-found";
    if (message.includes("already exists")) return "already-exists";
    if (message.includes("invalid")) return "invalid-argument";
    if (message.includes("authenticated") || message.includes("logged in"))
      return "unauthenticated";
    if (message.includes("timeout") || message.includes("took too long"))
      return "deadline-exceeded";
    if (message.includes("network")) return "network-error";
    if (message.includes("unavailable")) return "unavailable";
  }

  return "unknown-error";
}

/**
 * Get user-friendly error message from any error object
 * @param error - The error object (can be any type)
 * @param defaultMessage - Default message if no specific mapping found
 * @returns User-friendly error message
 */
export function getUserFriendlyErrorMessage(
  error: any,
  defaultMessage: string = "Something went wrong. Please try again."
): string {
  // Handle null or undefined errors
  if (!error) {
    return defaultMessage;
  }

  // If error has a custom user message already
  if (error?.userMessage) {
    return error.userMessage;
  }

  // Get the error code
  const errorCode = getErrorCode(error);

  // Check if we have a mapping for this error code
  if (errorMessageMap[errorCode]) {
    return errorMessageMap[errorCode];
  }

  // Try to extract meaningful message from error object
  if (typeof error === "string") {
    return error;
  }

  if (error?.message && typeof error.message === "string") {
    // Clean up the message
    const message = error.message
      .replace(/\(.*?\)/g, "") // Remove parentheses content
      .replace(/^\[.*?\]\s*/g, "") // Remove brackets
      .trim();

    // If it's not a generic Firebase message, use it
    if (
      message &&
      !message.includes("Firebase error") &&
      !message.includes("unknown error")
    ) {
      return message;
    }
  }

  return defaultMessage;
}

/**
 * Get actionable error message with context
 * @param error - The error object
 * @param context - Additional context about what was being done
 * @returns User-friendly error message with context
 */
export function getContextualErrorMessage(error: any, context: string): string {
  const baseMessage = getUserFriendlyErrorMessage(error);

  const contextMessages: Record<string, string> = {
    creating: `Failed to create: ${baseMessage}`,
    updating: `Failed to update: ${baseMessage}`,
    deleting: `Failed to delete: ${baseMessage}`,
    submitting: `Failed to submit: ${baseMessage}`,
    loading: `Failed to load: ${baseMessage}`,
    fetching: `Failed to fetch: ${baseMessage}`,
    approving: `Failed to approve: ${baseMessage}`,
    rejecting: `Failed to reject: ${baseMessage}`,
    scheduling: `Failed to schedule: ${baseMessage}`,
    analyzing: `Analysis failed: ${baseMessage}`,
    saving: `Failed to save: ${baseMessage}`,
    uploading: `Failed to upload: ${baseMessage}`,
    synchronizing: `Failed to sync: ${baseMessage}`,
    logging: `Failed to log in: ${baseMessage}`,
  };

  return contextMessages[context.toLowerCase()] || baseMessage;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  const errorCode = getErrorCode(error);
  return (
    errorCode === "network-error" ||
    errorCode === "deadline-exceeded" ||
    (error?.message && error.message.toLowerCase().includes("network"))
  );
}

/**
 * Check if error is a permission/auth error
 */
export function isAuthError(error: any): boolean {
  const errorCode = getErrorCode(error);
  return (
    errorCode === "permission-denied" ||
    errorCode === "unauthenticated" ||
    errorCode.includes("auth/")
  );
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: any): boolean {
  const errorCode = getErrorCode(error);
  return (
    errorCode === "invalid-argument" ||
    errorCode === "validation-error" ||
    (error?.message && error.message.toLowerCase().includes("invalid"))
  );
}

/**
 * Format error for display in UI
 * @param error - The error object
 * @param title - Optional title for the error
 * @param context - Optional context about what was being done
 * @returns Object with title and description for toast/dialog
 */
export function formatErrorForDisplay(
  error: any,
  title?: string,
  context?: string
): { title: string; description: string } {
  const message = context
    ? getContextualErrorMessage(error, context)
    : getUserFriendlyErrorMessage(error);

  const defaultTitle = (() => {
    if (isAuthError(error)) return "Access Denied";
    if (isNetworkError(error)) return "Connection Error";
    if (isValidationError(error)) return "Invalid Information";
    return "Error";
  })();

  return {
    title: title || defaultTitle,
    description: message,
  };
}
