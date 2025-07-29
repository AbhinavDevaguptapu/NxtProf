import React from "react";

import { useAdminAuth } from "@/context/AdminAuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Edit, Trash2, Check, X, Loader2, ShieldCheck, Search, Link2, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { getFunctions, httpsCallable } from "firebase/functions";
import { motion } from "framer-motion";
import { TableCell, TableRow } from "@/components/ui/table";

// Types
interface Employee {
  id: string;
  name: string;
  email: string;
  employeeId?: string;
  feedbackSheetUrl?: string;
  isAdmin?: boolean;
}

interface EditableEmployeeData {
  name: string;
  email: string;
  employeeId: string;
  feedbackSheetUrl: string;
}

// Fetch employees with admin status via Cloud Function
const fetchEmployeesWithStatus = async (): Promise<Employee[]> => {
  const functions = getFunctions();
  const getEmployees = httpsCallable(functions, "getEmployeesWithAdminStatus");
  const result = await getEmployees();
  return result.data as Employee[];
};

// Update Firestore document for inline edits
const updateEmployee = async (id: string, data: EditableEmployeeData): Promise<void> => {
  const employeeRef = doc(db, "employees", id);
  await updateDoc(employeeRef, data as { [x: string]: any });
};

import { ViewState, ViewType } from "@/layout/AppShell";

interface AdminEmployeesProps {
  setActiveView: (view: ViewState) => void;
}

export default function AdminEmployees({ setActiveView }: AdminEmployeesProps) {
  const { admin } = useAdminAuth();
  const { toast } = useToast();

  const [employees, setEmployees] = React.useState<Employee[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [processingId, setProcessingId] = React.useState<string | null>(null); // For any per-row loading state

  // Inline edit states
  const [editingEmployeeId, setEditingEmployeeId] = React.useState<string | null>(null);
  const [editFormData, setEditFormData] = React.useState<EditableEmployeeData | null>(null);

  // Load employees on mount or after actions
  const loadEmployees = React.useCallback(() => {
    setLoading(true);
    setError(null);
    fetchEmployeesWithStatus()
      .then(setEmployees)
      .catch((e) => setError(e.message || "Error fetching employees"))
      .finally(() => setLoading(false));
  }, []);

  // --- REPLACE WITH THIS ---
  React.useEffect(() => {
    if (admin) {
      loadEmployees();
    }
    // Auth is handled by ProtectedRoute, no need for navigation here.
  }, [admin, loadEmployees]);

  // Search filter
  const filteredEmployees = React.useMemo(() => {
    if (!employees) return [];
    if (!searchQuery) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter((emp) =>
      emp.name.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      (emp.employeeId && emp.employeeId.toLowerCase().includes(q))
    );
  }, [employees, searchQuery]);

  // Start inline editing
  const startEditing = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setEditFormData({
      name: emp.name,
      email: emp.email,
      employeeId: emp.employeeId || "",
      feedbackSheetUrl: emp.feedbackSheetUrl || "",
    });
  };

  // Cancel inline editing
  const cancelEditing = () => {
    setEditingEmployeeId(null);
    setEditFormData(null);
  };

  // Save inline edits
  const handleSaveEdit = async (id: string) => {
    if (!editFormData || !editFormData.name.trim() || !editFormData.email.trim()) {
      toast({ title: "Error", description: "Name and Email are required", variant: "destructive" });
      return;
    }
    setProcessingId(id);
    try {
      await updateEmployee(id, editFormData);
      toast({ title: "Success", description: "Employee updated successfully", className: "bg-green-500 text-white" });
      cancelEditing();
      loadEmployees();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message || "Error updating", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  // Promote or demote admin
  const handleRoleChange = async (action: 'promote' | 'demote', email: string, id: string) => {
    setProcessingId(id);
    const fnName = action === 'promote' ? 'addAdminRole' : 'removeAdminRole';
    try {
      const functions = getFunctions();
      const callable = httpsCallable(functions, fnName);
      const result = await callable({ email });
      toast({ title: "Success", description: (result.data as any).message, className: "bg-blue-500 text-white" });
      loadEmployees();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  // Delete employee
  const handleDeleteEmployee = async (id: string) => {
    setProcessingId(id);
    try {
      const functions = getFunctions();
      const deleteFn = httpsCallable(functions, 'deleteEmployee');
      await deleteFn({ uid: id });
      toast({ title: "Deleted", description: "Employee removed", className: "bg-green-500 text-white" });
      loadEmployees();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-7xl"
    >
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-2xl font-bold">
              Manage Employees {filteredEmployees ? `(${filteredEmployees.length})` : ''}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <div className="flex justify-center items-center py-8"><Loader2 className="h-6 w-6 animate-spin" /><span className="ml-2">Loading...</span></div>}
          {error && <div className="text-red-600 p-4 rounded-md bg-red-50">{error}</div>}
          {employees && (
            <div className="overflow-x-auto rounded-md border mt-4">
              <table className="w-full text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="bg-muted/40">
                    <th className="h-12 px-4 text-left font-medium">Name</th>
                    <th className="h-12 px-4 text-left font-medium">Employee ID</th>
                    <th className="h-12 px-4 text-left font-medium">Email</th>
                    <th className="h-12 px-4 text-left font-medium">Feedback Sheet</th>
                    <th className="h-12 px-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {filteredEmployees.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No employees found.</TableCell></TableRow>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <TableRow key={emp.id} className="border-b">
                        <TableCell className="p-4 font-medium align-middle">
                          {editingEmployeeId === emp.id ? (
                            <Input value={editFormData?.name || ''} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} className="h-8" />
                          ) : (
                            <div className="flex items-center gap-2">
                                  <span
                                    className="text-primary cursor-pointer hover:underline"
                                    onClick={() => setActiveView({ view: 'employee-detail', context: emp.id })}
                                  >
                                    {emp.name}
                                  </span>
                                  {emp.isAdmin && <Badge>Admin</Badge>}
                                </div>
                          )}
                        </TableCell>
                        <TableCell className="p-4 align-middle font-mono text-xs">
                          {editingEmployeeId === emp.id ? (
                            <Input value={editFormData?.employeeId || ''} onChange={(e) => setEditFormData({ ...editFormData, employeeId: e.target.value })} className="h-8" placeholder="NW..." />
                          ) : (emp.employeeId || <span className="text-muted-foreground">Not Set</span>)}
                        </TableCell>
                        <TableCell className="p-4 align-middle">
                          {editingEmployeeId === emp.id ? (
                            <Input type="email" value={editFormData?.email || ''} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} className="h-8" />
                          ) : (emp.email)}
                        </TableCell>
                        <TableCell className="p-4 align-middle">
                          {editingEmployeeId === emp.id ? (
                            <Input type="url" value={editFormData?.feedbackSheetUrl || ''} onChange={(e) => setEditFormData({ ...editFormData, feedbackSheetUrl: e.target.value })} className="h-8" placeholder="https://..." />
                          ) : emp.feedbackSheetUrl ? (
                            <a href={emp.feedbackSheetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1"><Link2 className="h-3 w-3" />Open Link</a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not Set</span>
                          )}
                        </TableCell>
                        <TableCell className="p-4 align-middle">
                          <div className="flex justify-end gap-2">
                            {editingEmployeeId === emp.id ? (
                              <>
                                <Button size="icon" variant="ghost" onClick={cancelEditing} disabled={processingId === emp.id}><X className="h-4 w-4" /></Button>
                                <Button size="icon" onClick={() => handleSaveEdit(emp.id)} disabled={processingId === emp.id}>
                                  {processingId === emp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="icon" variant="outline" onClick={() => startEditing(emp)}><Edit className="h-4 w-4" /></Button>
                                {emp.isAdmin ? (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild><Button size="icon" variant="outline" className="text-orange-600 border-orange-600 hover:bg-orange-100" disabled={processingId === emp.id}>{processingId === emp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}</Button></AlertDialogTrigger>
                                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove Admin Rights?</AlertDialogTitle><AlertDialogDescription>This will revoke admin privileges for {emp.name}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleRoleChange('demote', emp.email, emp.id)}>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                  </AlertDialog>
                                ) : (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild><Button size="icon" variant="outline" className="text-blue-600 border-blue-600 hover:bg-blue-100" disabled={processingId === emp.id}>{processingId === emp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}</Button></AlertDialogTrigger>
                                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Make {emp.name} an Admin?</AlertDialogTitle><AlertDialogDescription>This will grant admin privileges to {emp.email}.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleRoleChange('promote', emp.email, emp.id)}>Promote</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                  </AlertDialog>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button size="icon" variant="destructive" disabled={processingId === emp.id}>{processingId === emp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button></AlertDialogTrigger>
                                  <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {emp.name}'s account and profile.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDeleteEmployee(emp.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}