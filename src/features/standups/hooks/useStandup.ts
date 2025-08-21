import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  getDocs,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { useToast } from "@/components/ui/use-toast";
import { useUserAuth } from "@/context/UserAuthContext";
import { useAdminAuth } from "@/context/AdminAuthContext";
import type { Standup, Employee, AttendanceRecord, AttendanceStatus } from "../types";

export const useStandup = () => {
  const { user } = useUserAuth();
  const { admin } = useAdminAuth();
  const { toast } = useToast();

  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [standup, setStandup] = useState<Standup | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tempAttendance, setTempAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [savedAttendance, setSavedAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [editingAbsence, setEditingAbsence] = useState<Employee | null>(null);
  const [absenceReasons, setAbsenceReasons] = useState<Record<string, string>>({});
  const [sessionTime, setSessionTime] = useState("0s");

  const [activeFilter, setActiveFilter] = useState<AttendanceStatus | "all">("all");
  const [finalFilter, setFinalFilter] = useState<AttendanceStatus | "all">("all");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [finalSearchQuery, setFinalSearchQuery] = useState("");

  const todayDocId = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  useEffect(() => {
    const standupRef = doc(db, "standups", todayDocId);
    const unsubscribe = onSnapshot(standupRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Standup;
        setStandup(data);
        if (data.tempAttendance) {
          setTempAttendance(data.tempAttendance);
        }
        if (data.absenceReasons) {
          setAbsenceReasons(data.absenceReasons);
        }
      } else {
        setStandup(null);
      }
      setIsLoadingPage(false);
    });
    return () => unsubscribe();
  }, [todayDocId]);

  // Fetch employees only once on component mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const empSnapshot = await getDocs(collection(db, "employees"));
        setEmployees(
          empSnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as Employee))
            .filter(emp => emp.archived !== true)
        );
      } catch (error) {
        console.error("Error fetching employees:", error);
        toast({ title: "Error loading employee data", variant: "destructive" });
      }
    };
    fetchEmployees();
  }, [toast]);

  // Fetch final attendance only when the standup has ended
  useEffect(() => {
    const fetchFinalAttendance = async () => {
      if (standup?.status === "ended") {
        try {
          const q = query(
            collection(db, "attendance"),
            where("standup_id", "==", todayDocId)
          );
          const attSnapshot = await getDocs(q);
          const fetchedAttendance: Record<string, AttendanceRecord> = {};
          attSnapshot.forEach((doc) => {
            const data = doc.data() as AttendanceRecord;
            fetchedAttendance[data.employee_id] = data;
          });
          setSavedAttendance(fetchedAttendance);
        } catch (error) {
          console.error("Error fetching final attendance:", error);
          toast({ title: "Error loading final attendance", variant: "destructive" });
        }
      }
    };
    fetchFinalAttendance();
  }, [standup?.status, todayDocId, toast]);

  useEffect(() => {
    if (standup?.status === "active" && standup.startedAt) {
      const intervalId = setInterval(() => {
        const now = new Date();
        const start = standup.startedAt!.toDate();
        const seconds = Math.floor((now.getTime() - start.getTime()) / 1000);
        
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        
        const hStr = String(h).padStart(2, '0');
        const mStr = String(m).padStart(2, '0');
        const sStr = String(s).padStart(2, '0');
        
        if (h > 0) {
          setSessionTime(`${hStr}:${mStr}:${sStr}`);
        } else {
          setSessionTime(`${mStr}:${sStr}`);
        }
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [standup?.status, standup?.startedAt]);

  

  const handleStopStandup = async () => {
    if (!standup) return;
    setIsUpdatingStatus(true);
    try {
      const batch = writeBatch(db);
      for (const emp of employees) {
        const attendanceDocRef = doc(collection(db, "attendance"), `${todayDocId}_${emp.id}`);
        const status = tempAttendance[emp.id] || "Missed";
        const record: Omit<AttendanceRecord, "markedAt"> & { markedAt: any } = {
          standup_id: todayDocId,
          employee_id: emp.id,
          employee_name: emp.name,
          employee_email: emp.email,
          employeeId: emp.employeeId,
          status: status,
          scheduled_at: standup.scheduledTime,
          markedAt: serverTimestamp(),
        };
        if (status === "Not Available") {
          record.reason = absenceReasons[emp.id] || "No reason provided";
        }
        batch.set(attendanceDocRef, record);
      }
      await batch.commit();
      await updateDoc(doc(db, "standups", todayDocId), {
        status: "ended",
        endedAt: serverTimestamp(),
      });
      toast({ title: "Standup Ended", description: "Attendance has been saved." });
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveAbsenceReason = async (employeeId: string, reason: string) => {
    if (!reason.trim()) {
      toast({ title: "Reason is required", variant: "destructive" });
      return;
    }
    setAbsenceReasons((prev) => ({ ...prev, [employeeId]: reason }));
    setTempAttendance((prev) => ({ ...prev, [employeeId]: "Not Available" }));
    setEditingAbsence(null);
    
    try {
      await updateDoc(doc(db, "standups", todayDocId), {
        [`tempAttendance.${employeeId}`]: "Not Available",
        [`absenceReasons.${employeeId}`]: reason,
      });
      toast({ title: "Absence Recorded" });
    } catch (error) {
      console.error("Error saving absence reason:", error);
      toast({ title: "Error saving status", variant: "destructive" });
    }
  };

  const handleSetTempAttendance = async (employeeId: string, status: AttendanceStatus) => {
    setTempAttendance((prev) => ({ ...prev, [employeeId]: status }));
    try {
      await updateDoc(doc(db, "standups", todayDocId), {
        [`tempAttendance.${employeeId}`]: status,
      });
    } catch (error) {
      console.error("Error updating temp attendance:", error);
      toast({ title: "Error saving status", variant: "destructive" });
    }
  };

  const activeFilteredEmployees = useMemo(() => {
    let filtered = employees;

    if (activeFilter !== "all") {
      filtered = filtered.filter(
        (emp) => (tempAttendance[emp.id] || "Missed") === activeFilter
      );
    }

    if (activeSearchQuery) {
      const lowercasedQuery = activeSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.name.toLowerCase().includes(lowercasedQuery) ||
          emp.email.toLowerCase().includes(lowercasedQuery)
      );
    }

    return filtered;
  }, [activeFilter, employees, tempAttendance, activeSearchQuery]);

  const finalFilteredEmployees = useMemo(() => {
    let filtered = employees;

    if (finalFilter !== "all") {
      filtered = filtered.filter(
        (emp) => (savedAttendance[emp.id]?.status || "Missed") === finalFilter
      );
    }

    if (finalSearchQuery) {
      const lowercasedQuery = finalSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.name.toLowerCase().includes(lowercasedQuery) ||
          emp.email.toLowerCase().includes(lowercasedQuery)
      );
    }

    return filtered;
  }, [finalFilter, employees, savedAttendance, finalSearchQuery]);

  const sessionStats = useMemo(() => {
    const total = employees.length;
    const values = Object.values(tempAttendance);
    return {
      total,
      present: values.filter((s) => s === "Present").length,
      absent: values.filter((s) => s === "Absent").length,
      missed: values.filter((s) => s === "Missed").length,
      notAvailable: values.filter((s) => s === "Not Available").length,
    };
  }, [tempAttendance, employees]);

  return {
    user,
    admin,
    isLoadingPage,
    standup,
    isUpdatingStatus,
    employees,
    tempAttendance,
    setTempAttendance,
    savedAttendance,
    editingAbsence,
    setEditingAbsence,
    absenceReasons,
    sessionTime,
    activeFilter,
    setActiveFilter,
    activeSearchQuery,
    setActiveSearchQuery,
    finalFilter,
    setFinalFilter,
    finalSearchQuery,
    setFinalSearchQuery,
    todayDocId,
    handleStopStandup,
    handleSaveAbsenceReason,
    activeFilteredEmployees,
    finalFilteredEmployees,
    sessionStats,
    handleBeginMarkUnavailable: setEditingAbsence,
    handleSetTempAttendance,
  };
};
