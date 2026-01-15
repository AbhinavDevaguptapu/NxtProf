/**
 * @file User and role management Cloud Functions.
 */
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { DecodedIdToken } from "firebase-admin/auth";
import { isUserSuperAdmin } from "./utils";
import { roleManagementSchema, validateInput } from "./validation";

interface RoleManagementData {
  email: string;
}
interface CustomDecodedIdToken extends DecodedIdToken {
  isAdmin?: boolean;
  isCoAdmin?: boolean;
}

export const addAdminRole = onCall<RoleManagementData>(
  { cors: true },
  async (request) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Login required.");
    const caller = request.auth.token as CustomDecodedIdToken;
    if (caller.isAdmin !== true)
      throw new HttpsError("permission-denied", "Admins only.");

    // Validate input using Zod
    const { email } = validateInput(roleManagementSchema, request.data);

    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin
        .auth()
        .setCustomUserClaims(user.uid, { ...user.customClaims, isAdmin: true });
      logger.info("Admin role added", { email, addedBy: request.auth.uid });
      return { message: `${email} is now an admin.` };
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        throw new HttpsError("not-found", "User not found.");
      }
      logger.error("addAdminRole failed", { error: err.message, email });
      throw new HttpsError("internal", "Could not set admin role.");
    }
  }
);

export const removeAdminRole = onCall<RoleManagementData>(
  { cors: true },
  async (request) => {
    if (request.auth?.token.isAdmin !== true) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can modify roles."
      );
    }
    const email = request.data.email?.trim();
    if (!email) {
      throw new HttpsError("invalid-argument", "Provide a valid email.");
    }
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(user.uid, {
        ...user.customClaims,
        isAdmin: false,
      });
      return { message: `Admin role removed for ${email}.` };
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        throw new HttpsError("not-found", "User not found.");
      }
      console.error("removeAdminRole error:", err);
      throw new HttpsError("internal", "Could not remove admin role.");
    }
  }
);

export const addCoAdminRole = onCall<RoleManagementData>(
  { cors: true },
  async (request) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Login required.");
    const caller = request.auth.token as CustomDecodedIdToken;
    if (caller.isAdmin !== true)
      throw new HttpsError("permission-denied", "Admins only.");

    const email = request.data.email?.trim();
    if (!email)
      throw new HttpsError("invalid-argument", "Provide a valid email.");

    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(user.uid, {
        ...user.customClaims,
        isCoAdmin: true,
      });
      return { message: `${email} is now a Co-Admin.` };
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        throw new HttpsError("not-found", "User not found.");
      }
      console.error("addCoAdminRole error:", err);
      throw new HttpsError("internal", "Could not set Co-Admin role.");
    }
  }
);

export const removeCoAdminRole = onCall<RoleManagementData>(
  { cors: true },
  async (request) => {
    if (request.auth?.token.isAdmin !== true) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can modify roles."
      );
    }
    const email = request.data.email?.trim();
    if (!email) {
      throw new HttpsError("invalid-argument", "Provide a valid email.");
    }
    try {
      const user = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(user.uid, {
        ...user.customClaims,
        isCoAdmin: false,
      });
      return { message: `Co-Admin role removed for ${email}.` };
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        throw new HttpsError("not-found", "User not found.");
      }
      console.error("removeCoAdminRole error:", err);
      throw new HttpsError("internal", "Could not remove Co-Admin role.");
    }
  }
);

export const deleteEmployee = onCall<{ uid?: string }>(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }
    const uid = request.data.uid;
    if (!uid) {
      throw new HttpsError(
        "invalid-argument",
        "Missing or invalid `uid` parameter."
      );
    }

    // A user can delete their own account, or an admin can delete any account.
    if (request.auth.uid !== uid && !isUserSuperAdmin(request.auth)) {
      throw new HttpsError(
        "permission-denied",
        "You do not have permission to delete this account."
      );
    }

    try {
      await admin.auth().deleteUser(uid);
      await admin.firestore().doc(`employees/${uid}`).delete();
      return { message: "User account and profile deleted." };
    } catch (error: any) {
      console.error("deleteEmployee error:", error);
      throw new HttpsError(
        "internal",
        error.message || "An unknown error occurred."
      );
    }
  }
);

export const archiveEmployee = onCall<{ uid?: string }>(
  { cors: true },
  async (request) => {
    if (request.auth?.token.isAdmin !== true) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can archive employees."
      );
    }
    const uid = request.data.uid;
    if (!uid) {
      throw new HttpsError(
        "invalid-argument",
        "Missing or invalid `uid` parameter."
      );
    }
    if (request.auth.uid === uid) {
      throw new HttpsError(
        "permission-denied",
        "Admins cannot archive their own account."
      );
    }

    try {
      await admin.auth().updateUser(uid, { disabled: true });
      await admin
        .firestore()
        .doc(`employees/${uid}`)
        .update({ archived: true });
      return { message: "Employee archived successfully." };
    } catch (error: any) {
      console.error("archiveEmployee error:", error);
      throw new HttpsError(
        "internal",
        error.message || "An unknown error occurred."
      );
    }
  }
);

export const unarchiveEmployee = onCall<{ uid?: string }>(
  { cors: true },
  async (request) => {
    if (request.auth?.token.isAdmin !== true) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can unarchive employees."
      );
    }
    const uid = request.data.uid;
    if (!uid) {
      throw new HttpsError(
        "invalid-argument",
        "Missing or invalid `uid` parameter."
      );
    }

    try {
      await admin.auth().updateUser(uid, { disabled: false });
      await admin
        .firestore()
        .doc(`employees/${uid}`)
        .update({ archived: false });
      return { message: "Employee unarchived successfully." };
    } catch (error: any) {
      console.error("unarchiveEmployee error:", error);
      throw new HttpsError(
        "internal",
        error.message || "An unknown error occurred."
      );
    }
  }
);

export const getEmployeesWithAdminStatus = onCall(
  { cors: true },
  async (request) => {
    const caller = request.auth?.token as CustomDecodedIdToken | undefined;
    if (!caller?.isAdmin && !caller?.isCoAdmin) {
      throw new HttpsError(
        "permission-denied",
        "Only admins and co-admins can view the employee list."
      );
    }

    try {
      // Execute both queries in parallel for better performance
      const [listUsersResult, employeesSnapshot] = await Promise.all([
        admin.auth().listUsers(1000),
        admin.firestore().collection("employees").orderBy("name").get(),
      ]);

      const adminUids = new Set();
      const coAdminUids = new Set();
      listUsersResult.users.forEach((u) => {
        if (u.customClaims?.isAdmin) adminUids.add(u.uid);
        if (u.customClaims?.isCoAdmin) coAdminUids.add(u.uid);
      });
      const employeesWithStatus = employeesSnapshot.docs
        .filter((doc) => doc.data().archived !== true) // Filter in code
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          isAdmin: adminUids.has(doc.id),
          isCoAdmin: coAdminUids.has(doc.id),
        }));
      return employeesWithStatus;
    } catch (error: any) {
      console.error("Error fetching employees with admin status:", error);
      throw new HttpsError("internal", "Failed to fetch employee data.");
    }
  }
);

export const getArchivedEmployees = onCall({ cors: true }, async (request) => {
  if (request.auth?.token.isAdmin !== true) {
    throw new HttpsError(
      "permission-denied",
      "Only admins can view the archived employee list."
    );
  }

  try {
    const employeesSnapshot = await admin
      .firestore()
      .collection("employees")
      .where("archived", "==", true)
      .orderBy("name")
      .get();
    const employees = employeesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return employees;
  } catch (error: any) {
    console.error("Error fetching archived employees:", error);
    throw new HttpsError("internal", "Failed to fetch archived employee data.");
  }
});

export const getUnapprovedUsers = onCall({ cors: true }, async (request) => {
  if (request.auth?.token.isAdmin !== true) {
    throw new HttpsError(
      "permission-denied",
      "Only admins can view unapproved users."
    );
  }

  try {
    const employeesSnapshot = await admin
      .firestore()
      .collection("employees")
      .where("admin_approval_required", "==", true)
      .get();

    const users = employeesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return users;
  } catch (error: any) {
    console.error("Error fetching unapproved users:", error);
    throw new HttpsError("internal", "Failed to fetch unapproved users.");
  }
});

export const approveUser = onCall<{ uid: string }>(
  { cors: true },
  async (request) => {
    if (request.auth?.token.isAdmin !== true) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can approve users."
      );
    }
    const uid = request.data.uid;
    if (!uid) {
      throw new HttpsError("invalid-argument", "Missing uid.");
    }

    try {
      await admin.firestore().doc(`employees/${uid}`).update({
        admin_approval_required: false,
      });
      return { message: "User approved successfully." };
    } catch (error: any) {
      console.error("Error approving user:", error);
      throw new HttpsError("internal", "Failed to approve user.");
    }
  }
);
