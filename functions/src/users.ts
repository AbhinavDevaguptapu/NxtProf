/**
 * @file User and role management Cloud Functions.
 */
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { DecodedIdToken } from "firebase-admin/auth";

interface RoleManagementData { email: string; }
interface CustomDecodedIdToken extends DecodedIdToken { isAdmin?: boolean; }

export const addAdminRole = onCall<RoleManagementData>(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
    const caller = request.auth.token as CustomDecodedIdToken;
    if (caller.isAdmin !== true) throw new HttpsError("permission-denied", "Admins only.");

    const email = request.data.email?.trim();
    if (!email) throw new HttpsError("invalid-argument", "Provide a valid email.");

    try {
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(user.uid, { ...user.customClaims, isAdmin: true });
        return { message: `${email} is now an admin.` };
    } catch (err: any) {
        if (err.code === "auth/user-not-found") {
            throw new HttpsError("not-found", "User not found.");
        }
        console.error("addAdminRole error:", err);
        throw new HttpsError("internal", "Could not set admin role.");
    }
});

export const removeAdminRole = onCall<RoleManagementData>(async (request) => {
    if (request.auth?.token.isAdmin !== true) {
        throw new HttpsError("permission-denied", "Only admins can modify roles.");
    }
    const email = request.data.email?.trim();
    if (!email) {
        throw new HttpsError("invalid-argument", "Provide a valid email.");
    }
    try {
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(user.uid, { ...user.customClaims, isAdmin: false });
        return { message: `Admin role removed for ${email}.` };
    } catch (err: any) {
        if (err.code === "auth/user-not-found") {
            throw new HttpsError("not-found", "User not found.");
        }
        console.error("removeAdminRole error:", err);
        throw new HttpsError("internal", "Could not remove admin role.");
    }
});

export const deleteEmployee = onCall<{ uid?: string }>(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const uid = request.data.uid;
    if (!uid) {
        throw new HttpsError("invalid-argument", "Missing or invalid `uid` parameter.");
    }

    // A user can delete their own account, or an admin can delete any account.
    if (request.auth.uid !== uid && request.auth.token.isAdmin !== true) {
        throw new HttpsError("permission-denied", "You do not have permission to delete this account.");
    }

    try {
        await admin.auth().deleteUser(uid);
        await admin.firestore().doc(`employees/${uid}`).delete();
        return { message: "User account and profile deleted." };
    } catch (error: any) {
        console.error("deleteEmployee error:", error);
        throw new HttpsError("internal", error.message || "An unknown error occurred.");
    }
});

export const getEmployeesWithAdminStatus = onCall(async (request) => {
    if (request.auth?.token.isAdmin !== true) {
        throw new HttpsError("permission-denied", "Only admins can view the employee list.");
    }

    try {
        const listUsersResult = await admin.auth().listUsers(1000);
        const adminUids = new Set(
            listUsersResult.users
                .filter(u => u.customClaims?.isAdmin === true)
                .map(u => u.uid)
        );

        const employeesSnapshot = await admin.firestore().collection("employees").orderBy("name").get();
        const employeesWithStatus = employeesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            isAdmin: adminUids.has(doc.id),
        }));
        return employeesWithStatus;
    } catch (error: any) {
        console.error("Error fetching employees with admin status:", error);
        throw new HttpsError("internal", "Failed to fetch employee data.");
    }
});
