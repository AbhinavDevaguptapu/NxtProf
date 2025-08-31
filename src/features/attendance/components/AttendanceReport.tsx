import React, { useEffect, useState, useCallback, useMemo } from "react";
import { format, startOfDay } from "date-fns";
import { db } from "@/integrations/firebase/client";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  writeBatch,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ReasonModal } from "./ReasonModal";

type Employee = {
  archived: boolean; id: string; name: string; email: string; employeeId: string 
};
type AttendanceStatus = "Present" | "Absent" | "Missed" | "Not Available";
type AttendanceRecord = {
  employee_id: string;
  status: AttendanceStatus;
  reason?: string;
};
type SessionType = "standups" | "learning_hours";

export const AttendanceReport = ({
  sessionType,
  selectedDate,
}: {
  sessionType: SessionType;
  selectedDate: Date;
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceRecord>
  >({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedAtt, setEditedAtt] = useState<Record<string, AttendanceStatus>>(
    {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [editingReasonFor, setEditingReasonFor] = useState<Employee | null>(
    null
  );
  const [editedReasons, setEditedReasons] = useState<Record<string, string>>(
    {}
  );

  const fetchData = useCallback(
    async (date: Date) => {
      setLoading(true);
      try {
        if (employees.length === 0) {
          const empSnap = await getDocs(query(collection(db, "employees"), where("archived", "!=", true)));
          setEmployees(
            empSnap.docs
              .map((d) => ({ id: d.id, ...d.data() } as Employee))
              .sort((a, b) => a.name.localeCompare(b.name))
          );
        }
        const sessionId = format(date, "yyyy-MM-dd");
        const collectionName =
          sessionType === "standups"
            ? "attendance"
            : "learning_hours_attendance";
        const idField =
          sessionType === "standups" ? "standup_id" : "learning_hour_id";
        const q = query(
          collection(db, collectionName),
          where(idField, "==", sessionId)
        );
        const attSnap = await getDocs(q);
        const map: Record<string, AttendanceRecord> = {};
        const reasons: Record<string, string> = {};
        attSnap.forEach((d) => {
          const a = d.data() as AttendanceRecord;
          map[a.employee_id] = a;
          if (a.status === "Not Available" && a.reason) {
            reasons[a.employee_id] = a.reason;
          }
        });
        setAttendance(map);
        setEditedReasons(reasons);
      } catch (err) {
        console.error(`Failed to fetch ${sessionType} data:`, err);
        toast({ title: "Error fetching data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [employees.length, toast, sessionType]
  );

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate, fetchData]);

  const handleEdit = () => {
    const initialEdits: Record<string, AttendanceStatus> = {};
    employees.forEach((emp) => {
      initialEdits[emp.id] = attendance[emp.id]?.status || "Missed";
    });
    setEditedAtt(initialEdits);
    setEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const sessionId = format(selectedDate, "yyyy-MM-dd");
    const sessionRef = doc(db, sessionType, sessionId);
    const attendanceCollectionName =
      sessionType === "standups" ? "attendance" : "learning_hours_attendance";
    const idField =
      sessionType === "standups" ? "standup_id" : "learning_hour_id";

    try {
      const sessionSnap = await getDoc(sessionRef);
      let sessionTimestamp: Timestamp;

      if (sessionSnap.exists()) {
        sessionTimestamp = sessionSnap.data().scheduledTime as Timestamp;
      } else {
        sessionTimestamp = Timestamp.fromDate(startOfDay(selectedDate));
        await setDoc(sessionRef, {
          scheduledTime: sessionTimestamp,
          status: "ended",
          scheduledBy: "Admin (Manual Edit)",
        });
      }

      const batch = writeBatch(db);
      employees.forEach((emp) => {
        const attRef = doc(
          db,
          attendanceCollectionName,
          `${sessionId}_${emp.id}`
        );
        const status = editedAtt[emp.id];
        const record: any = {
          [idField]: sessionId,
          employee_id: emp.id,
          employee_name: emp.name,
          employeeId: emp.employeeId,
          employee_email: emp.email,
          status: status,
          scheduled_at: sessionTimestamp,
          markedAt: serverTimestamp(),
        };
        if (status === "Not Available") {
          record.reason = editedReasons[emp.id] || "No reason provided";
        }
        batch.set(attRef, record, { merge: true });
      });
      await batch.commit();
      toast({ title: "Attendance saved successfully." });
      setEditing(false);
      fetchData(selectedDate);
    } catch (error) {
      console.error(error);
      toast({ title: "Failed to save attendance.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveReason = (employeeId: string, reason: string) => {
    setEditedReasons((p) => ({ ...p, [employeeId]: reason }));
    setEditedAtt((p) => ({ ...p, [employeeId]: "Not Available" }));
    setEditingReasonFor(null);
  };

  const getBadgeStyle = (status?: AttendanceStatus) => {
    switch (status) {
      case "Present":
        return "bg-green-100 text-green-800 border-green-300";
      case "Absent":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Missed":
        return "bg-red-100 text-red-800 border-red-300";
      case "Not Available":
        return "bg-gray-200 text-gray-900 border-gray-300";
      default:
        return "bg-gray-100 text-gray-500 border-gray-200";
    }
  };

  const dailyStats = useMemo(() => {
    const sourceData = editing ? editedAtt : attendance;
    let present = 0, absent = 0, missed = 0, notAvailable = 0;

    employees.forEach(emp => {
      const record = sourceData[emp.id];
      const status = editing ? (record as unknown as AttendanceStatus) : (record as AttendanceRecord)?.status;

      switch (status) {
        case "Present": present++; break;
        case "Absent": absent++; break;
        case "Not Available": notAvailable++; break;
        case "Missed": missed++; break;
        default: missed++; break;
      }
    });

    return { present, absent, missed, notAvailable };
  }, [attendance, editing, editedAtt, employees]);

  return (
    <>
      <ReasonModal
        isOpen={!!editingReasonFor}
        employee={editingReasonFor}
        onClose={() => setEditingReasonFor(null)}
        onSave={handleSaveReason}
      />
      <Card className="flex flex-col">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">
              {sessionType === "standups"
                ? "Standup Report"
                : "Learning Session Report"}
            </CardTitle>
          </div>
          <div className="flex gap-2 items-center">
            {editing ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={handleEdit} disabled={isSaving}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Present
                  </p>
                  <p className="text-2xl font-bold">{dailyStats.present}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Absent
                  </p>
                  <p className="text-2xl font-bold">{dailyStats.absent}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Missed
                  </p>
                  <p className="text-2xl font-bold">{dailyStats.missed}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Unavailable
                  </p>
                  <p className="text-2xl font-bold">
                    {dailyStats.notAvailable}
                  </p>
                </Card>
              </div>
              <div className="overflow-auto rounded-md border max-h-[50vh]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10">
                    <TableRow>
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">
                          {emp.name}
                        </TableCell>
                        <TableCell>
                          {editing ? (
                            <Select
                              value={editedAtt[emp.id] || "Missed"}
                              onValueChange={(v) => {
                                const newStatus = v as AttendanceStatus;
                                if (newStatus === "Not Available") {
                                  setEditingReasonFor(emp);
                                } else {
                                  setEditedAtt((p) => ({
                                    ...p,
                                    [emp.id]: newStatus,
                                  }));
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Present">Present</SelectItem>
                                <SelectItem value="Absent">Absent</SelectItem>
                                <SelectItem value="Missed">Missed</SelectItem>
                                <SelectItem value="Not Available">
                                  Not Available
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-sm",
                                getBadgeStyle(attendance[emp.id]?.status)
                              )}
                            >
                              {attendance[emp.id]?.status === "Not Available"
                                ? "N/A"
                                : attendance[emp.id]?.status || "Not Marked"}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
};
