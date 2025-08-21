import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/alert-dialog';
import { Edit, Trash2, ShieldCheck, ShieldOff, Loader2, Archive } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';

import { useAdminAuth } from '@/context/AdminAuthContext';

interface Employee {
  id: string;
  name: string;
  email: string;
  employeeId?: string;
  feedbackSheetUrl?: string;
  isAdmin?: boolean;
}

interface ActionsCardProps {
  employee: Employee;
  onActionCompletes: () => void; // To refetch employee list after an action
}

interface EditableEmployeeData {
  name: string;
  employeeId: string;
  feedbackSheetUrl: string;
}

interface CallableResponse {
  message: string;
}

// Firestore update function
const updateEmployee = async (id: string, data: Partial<EditableEmployeeData>): Promise<void> => {
  const employeeRef = doc(db, "employees", id);
  await updateDoc(employeeRef, data);
};

export default function ActionsCard({ employee, onActionCompletes }: ActionsCardProps) {
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<EditableEmployeeData>({
    name: '',
    employeeId: '',
    feedbackSheetUrl: '',
  });

  // Sync form data when the selected employee changes
  useEffect(() => {
    if (employee) {
      setEditFormData({
        name: employee.name || '',
        employeeId: employee.employeeId || '',
        feedbackSheetUrl: employee.feedbackSheetUrl || '',
      });
    }
  }, [employee]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleUpdateEmployee = async () => {
    if (!editFormData.name.trim()) {
      toast({ title: "Validation Error", description: "Name cannot be empty.", variant: "destructive" });
      return;
    }
    setProcessingAction('update');
    try {
      await updateEmployee(employee.id, editFormData);
      toast({ title: "Success", description: `${employee.name}'s profile updated.`, className: "bg-green-500 text-white" });
      onActionCompletes();
      setIsEditDialogOpen(false);
    } catch (err) {
      const error = err as Error;
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setProcessingAction(null);
    }
  };

  // Promote or demote admin
  const handleRoleChange = async (action: 'promote' | 'demote') => {
    setProcessingAction(action);
    const fnName = action === 'promote' ? 'addAdminRole' : 'removeAdminRole';
    try {
      const functions = getFunctions();
      const callable = httpsCallable<unknown, CallableResponse>(functions, fnName);
      const result = await callable({ email: employee.email });
      toast({ title: "Success", description: result.data.message, className: "bg-blue-500 text-white" });
      onActionCompletes();
    } catch (err) {
      const error = err as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingAction(null);
    }
  };

  // Delete employee
  const handleDeleteEmployee = async () => {
    setProcessingAction('delete');
    try {
      const functions = getFunctions();
      const deleteFn = httpsCallable(functions, 'deleteEmployee');
      await deleteFn({ uid: employee.id });
      toast({ title: "Deleted", description: `${employee.name} has been removed.`, className: "bg-green-500 text-white" });
      onActionCompletes();
    } catch (err) {
      const error = err as Error;
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleArchiveEmployee = async () => {
    setProcessingAction('archive');
    try {
      const functions = getFunctions();
      const archiveFn = httpsCallable(functions, 'archiveEmployee');
      await archiveFn({ uid: employee.id });
      toast({ title: "Archived", description: `${employee.name} has been archived.`, className: "bg-green-500 text-white" });
      onActionCompletes();
    } catch (err) {
      const error = err as Error;
      toast({ title: "Archive failed", description: error.message, variant: "destructive" });
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Edit className="h-4 w-4 text-muted-foreground" /> Edit Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit {employee.name}</DialogTitle>
              <DialogDescription>
                Make changes to the employee's profile. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={editFormData.name} onChange={handleInputChange} />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input id="employeeId" value={editFormData.employeeId} onChange={handleInputChange} />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="feedbackSheetUrl">Feedback URL</Label>
                <Input id="feedbackSheetUrl" value={editFormData.feedbackSheetUrl} onChange={handleInputChange} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleUpdateEmployee} disabled={processingAction === 'update'}>
                {processingAction === 'update' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {employee.isAdmin ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2 text-orange-600 hover:text-orange-600 border-orange-300 hover:bg-orange-50" disabled={!!processingAction}>
                {processingAction === 'demote' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4 text-orange-600" />}
                Remove Admin
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Admin Rights?</AlertDialogTitle>
                <AlertDialogDescription>This will revoke admin privileges for {employee.name}. They will no longer be able to access administrative functions.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleRoleChange('demote')}>Yes, Remove Admin</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2 text-blue-600 hover:text-blue-600 border-blue-300 hover:bg-blue-50" disabled={!!processingAction}>
                {processingAction === 'promote' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 text-blue-600" />}
                Make Admin
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Make {employee.name} an Admin?</AlertDialogTitle>
                <AlertDialogDescription>This will grant admin privileges to {employee.email}. They will be able to manage other employees and system settings.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleRoleChange('promote')}>Promote to Admin</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2" disabled={!!processingAction || employee.id === admin?.uid}>
              {processingAction === 'archive' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
              Archive Employee
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to archive {employee.name}?</AlertDialogTitle>
              <AlertDialogDescription>This action will move the employee to the archived list. They will not be able to log in until unarchived.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchiveEmployee}>Yes, Archive</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>

      <CardFooter className="flex-col items-start gap-y-3 border-t px-6 py-4">
        <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full justify-start gap-2" disabled={!!processingAction}>
              {processingAction === 'delete' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Employee
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone. This will permanently delete {employee.name}'s account, profile, and all associated data.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteEmployee}>Yes, Permanently Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}