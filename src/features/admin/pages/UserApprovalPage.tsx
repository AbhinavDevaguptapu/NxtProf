import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { getUserFriendlyErrorMessage } from "@/lib/errorHandler";

interface PendingUser {
  id: string;
  name?: string;
  email?: string;
  employeeId?: string;
  [key: string]: any;
}

export default function UserApprovalPage() {
  const functions = getFunctions();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const getUnapprovedUsers = httpsCallable(functions, "getUnapprovedUsers");
      const result = await getUnapprovedUsers();
      const data = (result.data as PendingUser[]) || [];
      // Client-side sorting to avoid Firestore index requirement
      data.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      const message = getUserFriendlyErrorMessage(
        error,
        "Unable to load pending users. Please try again."
      );
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (uid: string) => {
    setProcessingId(uid);
    try {
      const approveUser = httpsCallable(functions, "approveUser");
      await approveUser({ uid });
      toast.success("User approved and account activated successfully!");
      // Remove user from list locally
      setUsers((prev) => prev.filter((u) => u.id !== uid));
    } catch (error) {
      console.error("Error approving user:", error);
      const message = getUserFriendlyErrorMessage(
        error,
        "Could not approve this user. Please try again."
      );
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">User Approval</h2>
        <Button variant="outline" onClick={fetchUsers} disabled={loading}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Pending Requests</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending approvals found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name || "N/A"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.employeeId || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(user.id)}
                        disabled={processingId === user.id}
                      >
                        {processingId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        Approve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
