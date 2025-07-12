import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  parseISO,
  isSameMonth,
  eachDayOfInterval,
  isSunday,
  startOfDay,
} from "date-fns";
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
import { getFunctions, httpsCallable } from "firebase/functions";

// Context and Auth Hooks
import { useUserAuth } from "@/context/UserAuthContext";
import { useAdminAuth } from "@/context/AdminAuthContext";

// Component Imports
import AppNavbar from "@/components/common/AppNavbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Loader2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  MinusCircle,
  CloudUpload,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// --- Type Definitions ---
type Employee = { id: string; name: string; email: string; employeeId: string };
type AttendanceStatus = "Present" | "Absent" | "Missed" | "Not Available";
type AttendanceRecord = {
  employee_id: string;
  status: AttendanceStatus;
  reason?: string;
};
type SessionType = "standups" | "learning_hours";
type DailyCombinedStatus = {
  standup?: AttendanceStatus;
  learning?: AttendanceStatus;
};

// --- Main Component ---
export default function Attendance() {
  const { admin, loading: adminLoading } = useAdminAuth();
  const { user, loading: userLoading } = useUserAuth();

  // --- ROBUST LOADING LOGIC ---
  // The page is only ready when BOTH authentication checks are complete.
  const isLoading = adminLoading || userLoading;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container mx-auto p-4 md:p-8 flex flex-col">
        {isLoading ? (
          <div className="flex-grow flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : admin ? (
          <AdminAttendanceView />
        ) : user ? (
          <UserAttendanceView userId={user.uid} />
        ) : (
          <div className="flex-grow flex items-center justify-center">
            <Card className="p-6 text-center">
              <CardHeader>
                <CardTitle>Authentication Required</CardTitle>
                <CardDescription>
                  Please log in to view your attendance records.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

// --- ADMIN VIEW ---
const AdminAttendanceView = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async (sessionType: SessionType) => {
    setIsSyncing(true);
    try {
      const functions = getFunctions();
      const syncAttendanceToSheet = httpsCallable(
        functions,
        "syncAttendanceToSheet"
      );
      const date = format(selectedDate, "yyyy-MM-dd");

      toast({
        title: "Sync Started",
        description: `Syncing ${sessionType} data for ${date}...`,
      });

      const result = await syncAttendanceToSheet({ date, sessionType });

      toast({
        title: "Sync Successful",
        description: (result.data as any).message,
      });
    } catch (error: any) {
      console.error("Sync failed:", error);
      // --- SMART ERROR HANDLING ---
      // This specifically helps the admin if their auth token is stale.
      if (error.code === "functions/permission-denied") {
        toast({
          title: "Permission Denied",
          description:
            "Please try logging out and back in to refresh your admin permissions.",
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "Sync Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-3xl font-bold tracking-tight">
              Attendance Records
            </CardTitle>
            <CardDescription>
              View, edit, and sync historical attendance records.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={() => handleSync("standups")}
              disabled={isSyncing}
              className="w-full"
            >
              {isSyncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CloudUpload className="mr-2 h-4 w-4" />
              )}
              Sync Standups
            </Button>
            <Button
              onClick={() => handleSync("learning_hours")}
              disabled={isSyncing}
              className="w-full"
            >
              {isSyncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CloudUpload className="mr-2 h-4 w-4" />
              )}
              Sync Learning Hours
            </Button>
          </div>
        </CardHeader>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceReport sessionType="standups" selectedDate={selectedDate} />
        <AttendanceReport
          sessionType="learning_hours"
          selectedDate={selectedDate}
        />
      </div>
    </motion.div>
  );
};

// --- USER VIEW ---
const UserAttendanceView = ({ userId }: { userId: string }) => {
  const [month, setMonth] = useState(new Date());
  const [allAttendance, setAllAttendance] = useState<
    Record<string, DailyCombinedStatus>
  >({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    const standupQuery = query(
      collection(db, "attendance"),
      where("employee_id", "==", userId)
    );
    const learningQuery = query(
      collection(db, "learning_hours_attendance"),
      where("employee_id", "==", userId)
    );

    try {
      const [standupSnap, learningSnap] = await Promise.all([
        getDocs(standupQuery),
        getDocs(learningQuery),
      ]);
      const combinedData: Record<string, DailyCombinedStatus> = {};

      standupSnap.forEach((doc) => {
        const dateKey = doc.id.split("_")[0];
        if (!combinedData[dateKey]) combinedData[dateKey] = {};
        combinedData[dateKey].standup = doc.data().status as AttendanceStatus;
      });
      learningSnap.forEach((doc) => {
        const dateKey = doc.id.split("_")[0];
        if (!combinedData[dateKey]) combinedData[dateKey] = {};
        combinedData[dateKey].learning = doc.data().status as AttendanceStatus;
      });

      setAllAttendance(combinedData);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      toast({ title: "Failed to load your data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const monthlyStats = useMemo(() => {
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonth(month),
    });
    const totalWorkingDays = daysInMonth.filter((day) => !isSunday(day)).length;
    let standupCount = 0;
    let learningHourCount = 0;
    Object.entries(allAttendance).forEach(([dateStr, statuses]) => {
      const date = parseISO(dateStr);
      if (isSameMonth(date, month)) {
        if (statuses.standup === "Present") standupCount++;
        if (statuses.learning === "Present") learningHourCount++;
      }
    });
    return { standupCount, learningHourCount, totalWorkingDays };
  }, [allAttendance, month]);

  const DayContent = ({ date }: { date: Date }) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const status = allAttendance[dateKey];

    const getStatusClass = (s?: AttendanceStatus) => {
      switch (s) {
        case "Present":
          return "text-green-500";
        case "Absent":
          return "text-yellow-500";
        case "Missed":
          return "text-red-500";
        case "Not Available":
          return "text-gray-500";
        default:
          return "text-gray-300 dark:text-gray-700";
      }
    };

    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative h-full w-full flex flex-col items-center justify-center">
              {format(date, "d")}
              {!isSunday(date) && (
                <div className="absolute -bottom-1 flex items-center justify-center gap-1 font-bold text-xs">
                  <span className={getStatusClass(status?.standup)}>S</span>
                  <span className={getStatusClass(status?.learning)}>L</span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm space-y-1 p-1">
              <p>
                Standup:{" "}
                <span className="font-semibold">
                  {status?.standup === "Not Available" ? "N/A" : status?.standup || "N/A"}
                </span>
              </p>
              <p>
                Learning:{" "}
                <span className="font-semibold">
                  {status?.learning === "Not Available" ? "N/A" : status?.learning || "N/A"}
                </span>
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Monthly Attendance Summary</CardTitle>
          <CardDescription>
            Your "Present" status for {format(month, "MMMM yyyy")}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Standups Attended"
            value={`${monthlyStats.standupCount} / ${monthlyStats.totalWorkingDays}`}
            icon={<Users />}
          />
          <StatCard
            title="Learning Hours Attended"
            value={`${monthlyStats.learningHourCount} / ${monthlyStats.totalWorkingDays}`}
            icon={<BookOpen />}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Attendance Calendar</CardTitle>
            {/* <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="w-32 text-center font-semibold">
                {format(month, "MMMM yyyy")}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMonth(addMonths(month, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div> */}
          </div>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            month={month}
            onMonthChange={setMonth}
            components={{ Day: DayContent }}
            className="p-0"
          />
        </CardContent>
        <CardFooter className="flex-col items-start gap-3 pt-4 border-t">
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="font-bold text-green-500">S/L</span>: Present
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-yellow-500">S/L</span>: Absent
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-red-500">S/L</span>: Missed
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-gray-500">S/L</span>: N/A
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-gray-300">S/L</span>: Not Marked
            </div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

// --- SHARED ADMIN REPORT COMPONENT ---
const AttendanceReport = ({
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
          const empSnap = await getDocs(collection(db, "employees"));
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
        // For a new retroactive entry, default the time to the start of the day.
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
          scheduled_at: sessionTimestamp, // <-- Use the correct session timestamp
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
    const data = editing
      ? editedAtt
      : Object.fromEntries(
        Object.entries(attendance).map(([k, v]) => [k, v.status])
      );
    const values = Object.values(data);
    return {
      present: values.filter((s) => s === "Present").length,
      absent: values.filter((s) => s === "Absent").length,
      missed: values.filter((s) => s === "Missed").length,
      notAvailable: values.filter((s) => s === "Not Available").length,
    };
  }, [attendance, editing, editedAtt]);

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

// --- Reusable Modal for Reasons ---
const ReasonModal = ({
  employee,
  isOpen,
  onClose,
  onSave,
}: {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, r: string) => void;
}) => {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);
  if (!isOpen || !employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reason for Unavailability: {employee.name}</DialogTitle>
          <DialogDescription>
            Provide a brief reason why this member is unavailable.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="absence-reason" className="sr-only">
            Reason
          </Label>
          <Textarea
            id="absence-reason"
            placeholder="e.g., On leave, sick day, client meeting..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(employee.id, reason)}>
            Save Reason
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
