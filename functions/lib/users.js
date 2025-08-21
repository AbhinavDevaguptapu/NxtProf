"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArchivedEmployees = exports.getEmployeesWithAdminStatus = exports.unarchiveEmployee = exports.archiveEmployee = exports.deleteEmployee = exports.removeAdminRole = exports.addAdminRole = void 0;
/**
 * @file User and role management Cloud Functions.
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
exports.addAdminRole = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Login required.");
    const caller = request.auth.token;
    if (caller.isAdmin !== true)
        throw new https_1.HttpsError("permission-denied", "Admins only.");
    const email = (_a = request.data.email) === null || _a === void 0 ? void 0 : _a.trim();
    if (!email)
        throw new https_1.HttpsError("invalid-argument", "Provide a valid email.");
    try {
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(user.uid, Object.assign(Object.assign({}, user.customClaims), { isAdmin: true }));
        return { message: `${email} is now an admin.` };
    }
    catch (err) {
        if (err.code === "auth/user-not-found") {
            throw new https_1.HttpsError("not-found", "User not found.");
        }
        console.error("addAdminRole error:", err);
        throw new https_1.HttpsError("internal", "Could not set admin role.");
    }
});
exports.removeAdminRole = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.isAdmin) !== true) {
        throw new https_1.HttpsError("permission-denied", "Only admins can modify roles.");
    }
    const email = (_b = request.data.email) === null || _b === void 0 ? void 0 : _b.trim();
    if (!email) {
        throw new https_1.HttpsError("invalid-argument", "Provide a valid email.");
    }
    try {
        const user = await admin.auth().getUserByEmail(email);
        await admin.auth().setCustomUserClaims(user.uid, Object.assign(Object.assign({}, user.customClaims), { isAdmin: false }));
        return { message: `Admin role removed for ${email}.` };
    }
    catch (err) {
        if (err.code === "auth/user-not-found") {
            throw new https_1.HttpsError("not-found", "User not found.");
        }
        console.error("removeAdminRole error:", err);
        throw new https_1.HttpsError("internal", "Could not remove admin role.");
    }
});
exports.deleteEmployee = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const uid = request.data.uid;
    if (!uid) {
        throw new https_1.HttpsError("invalid-argument", "Missing or invalid `uid` parameter.");
    }
    // A user can delete their own account, or an admin can delete any account.
    if (request.auth.uid !== uid && request.auth.token.isAdmin !== true) {
        throw new https_1.HttpsError("permission-denied", "You do not have permission to delete this account.");
    }
    try {
        await admin.auth().deleteUser(uid);
        await admin.firestore().doc(`employees/${uid}`).delete();
        return { message: "User account and profile deleted." };
    }
    catch (error) {
        console.error("deleteEmployee error:", error);
        throw new https_1.HttpsError("internal", error.message || "An unknown error occurred.");
    }
});
exports.archiveEmployee = (0, https_1.onCall)(async (request) => {
    var _a;
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.isAdmin) !== true) {
        throw new https_1.HttpsError("permission-denied", "Only admins can archive employees.");
    }
    const uid = request.data.uid;
    if (!uid) {
        throw new https_1.HttpsError("invalid-argument", "Missing or invalid `uid` parameter.");
    }
    if (request.auth.uid === uid) {
        throw new https_1.HttpsError("permission-denied", "Admins cannot archive their own account.");
    }
    try {
        await admin.auth().updateUser(uid, { disabled: true });
        await admin.firestore().doc(`employees/${uid}`).update({ archived: true });
        return { message: "Employee archived successfully." };
    }
    catch (error) {
        console.error("archiveEmployee error:", error);
        throw new https_1.HttpsError("internal", error.message || "An unknown error occurred.");
    }
});
exports.unarchiveEmployee = (0, https_1.onCall)(async (request) => {
    var _a;
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.isAdmin) !== true) {
        throw new https_1.HttpsError("permission-denied", "Only admins can unarchive employees.");
    }
    const uid = request.data.uid;
    if (!uid) {
        throw new https_1.HttpsError("invalid-argument", "Missing or invalid `uid` parameter.");
    }
    try {
        await admin.auth().updateUser(uid, { disabled: false });
        await admin.firestore().doc(`employees/${uid}`).update({ archived: false });
        return { message: "Employee unarchived successfully." };
    }
    catch (error) {
        console.error("unarchiveEmployee error:", error);
        throw new https_1.HttpsError("internal", error.message || "An unknown error occurred.");
    }
});
exports.getEmployeesWithAdminStatus = (0, https_1.onCall)(async (request) => {
    var _a;
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.isAdmin) !== true) {
        throw new https_1.HttpsError("permission-denied", "Only admins can view the employee list.");
    }
    try {
        const listUsersResult = await admin.auth().listUsers(1000);
        const adminUids = new Set(listUsersResult.users
            .filter(u => { var _a; return ((_a = u.customClaims) === null || _a === void 0 ? void 0 : _a.isAdmin) === true; })
            .map(u => u.uid));
        const employeesSnapshot = await admin.firestore().collection("employees").orderBy("name").get();
        const employeesWithStatus = employeesSnapshot.docs
            .filter(doc => doc.data().archived !== true) // Filter in code
            .map(doc => (Object.assign(Object.assign({ id: doc.id }, doc.data()), { isAdmin: adminUids.has(doc.id) })));
        return employeesWithStatus;
    }
    catch (error) {
        console.error("Error fetching employees with admin status:", error);
        throw new https_1.HttpsError("internal", "Failed to fetch employee data.");
    }
});
exports.getArchivedEmployees = (0, https_1.onCall)(async (request) => {
    var _a;
    if (((_a = request.auth) === null || _a === void 0 ? void 0 : _a.token.isAdmin) !== true) {
        throw new https_1.HttpsError("permission-denied", "Only admins can view the archived employee list.");
    }
    try {
        const employeesSnapshot = await admin.firestore().collection("employees").where("archived", "==", true).orderBy("name").get();
        const employees = employeesSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return employees;
    }
    catch (error) {
        console.error("Error fetching archived employees:", error);
        throw new https_1.HttpsError("internal", "Failed to fetch archived employee data.");
    }
});
//# sourceMappingURL=users.js.map