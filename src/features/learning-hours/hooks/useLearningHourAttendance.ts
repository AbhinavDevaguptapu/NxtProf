import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, query, where, writeBatch, doc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useToast } from '@/components/ui/use-toast';
import type { Employee, AttendanceRecord, AttendanceStatus, LearningHour } from '../types';
import { useUserAuth } from '@/context/UserAuthContext';

// FIX: Accept activeFilter as a parameter to ensure the hook can react to UI changes.
export const useLearningHourAttendance = (
    learningHour: LearningHour | null,
    todayDocId: string,
    activeFilter: AttendanceStatus | "all"
) => {
    const { user } = useUserAuth();
    const { toast } = useToast();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [tempAttendance, setTempAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [savedAttendance, setSavedAttendance] = useState<Record<string, AttendanceRecord>>({});
    const [currentUserAttendance, setCurrentUserAttendance] = useState<AttendanceRecord | null>(null);
    const [editingAbsence, setEditingAbsence] = useState<Employee | null>(null);
    const [absenceReasons, setAbsenceReasons] = useState<Record<string, string>>({});
    const [activeSearchQuery, setActiveSearchQuery] = useState("");
    const [finalSearchQuery, setFinalSearchQuery] = useState("");
    const [finalFilter, setFinalFilter] = useState<AttendanceStatus | "all">("all");

    const fetchInitialData = useCallback(async () => {
        try {
            const empSnapshot = await getDocs(query(collection(db, "employees"), where("archived", "!=", true)));
            const fetchedEmployees = empSnapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() } as Employee));
            setEmployees(fetchedEmployees);

            if (learningHour?.status === "active") {
                const initialAttendance: Record<string, AttendanceStatus> = {};
                fetchedEmployees.forEach(emp => {
                    initialAttendance[emp.id] = learningHour.tempAttendance?.[emp.id] || "Missed";
                });
                setTempAttendance(initialAttendance);
                setAbsenceReasons(learningHour.absenceReasons || {});
            }

            if (learningHour?.status === "ended") {
                const q = query(collection(db, "learning_hours_attendance"), where("learning_hour_id", "==", todayDocId));
                const attSnapshot = await getDocs(q);
                const fetchedAttendance: Record<string, AttendanceRecord> = {};
                attSnapshot.forEach((doc) => {
                    const data = doc.data() as AttendanceRecord;
                    fetchedAttendance[data.employee_id] = data;
                });
                setSavedAttendance(fetchedAttendance);

                if (user) {
                    const userAttendanceDocRef = doc(db, "learning_hours_attendance", `${todayDocId}_${user.uid}`);
                    const userAttendanceDoc = await getDoc(userAttendanceDocRef);
                    if (userAttendanceDoc.exists()) {
                        setCurrentUserAttendance(userAttendanceDoc.data() as AttendanceRecord);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ title: "Error loading data", variant: "destructive" });
        }
    }, [learningHour, todayDocId, toast, user]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const saveAbsenceReason = async (employeeId: string, reason: string) => {
        if (!reason.trim()) {
            toast({ title: "Reason is required", variant: "destructive" });
            return;
        }
        const newAbsenceReasons = { ...absenceReasons, [employeeId]: reason };
        const newTempAttendance = { ...tempAttendance, [employeeId]: "Not Available" as AttendanceStatus };
        
        setAbsenceReasons(newAbsenceReasons);
        setTempAttendance(newTempAttendance);
        setEditingAbsence(null);

        try {
            const learningHourRef = doc(db, "learning_hours", todayDocId);
            await updateDoc(learningHourRef, {
                absenceReasons: newAbsenceReasons,
                tempAttendance: newTempAttendance,
            });
            toast({ title: "Absence Recorded" });
        } catch (error) {
            console.error("Error saving absence reason:", error);
            toast({ title: "Error saving status", variant: "destructive" });
            // Revert optimistic update on failure
            setAbsenceReasons(absenceReasons);
            setTempAttendance(tempAttendance);
        }
    };

    const handleSetTempAttendance = async (employeeId: string, status: AttendanceStatus) => {
        const newTempAttendance = { ...tempAttendance, [employeeId]: status };
        setTempAttendance(newTempAttendance);
        try {
            const learningHourRef = doc(db, "learning_hours", todayDocId);
            await updateDoc(learningHourRef, {
                tempAttendance: newTempAttendance,
            });
        } catch (error) {
            console.error("Error updating temp attendance:", error);
            toast({ title: "Error saving status", variant: "destructive" });
            // Revert optimistic update on failure
            setTempAttendance(tempAttendance);
        }
    };

    const saveAttendance = async () => {
        if (!learningHour) return;
        const batch = writeBatch(db);
        for (const emp of employees) {
            const docRef = doc(collection(db, "learning_hours_attendance"), `${todayDocId}_${emp.id}`);
            const status = tempAttendance[emp.id] || "Missed";
            const record: Omit<AttendanceRecord, 'markedAt'> & { markedAt: any } = {
                learning_hour_id: todayDocId,
                employee_id: emp.id,
                employee_name: emp.name,
                employee_email: emp.email,
                employeeId: emp.employeeId,
                status: status,
                scheduled_at: learningHour.scheduledTime,
                markedAt: serverTimestamp(),
            };
            if (status === "Not Available") {
                record.reason = absenceReasons[emp.id] || "No reason provided";
            }
            batch.set(docRef, record);
        }
        await batch.commit();
    };

    const sessionStats = useMemo(() => {
        const total = employees.length;
        const values = Object.values(tempAttendance);
        return {
            total,
            present: values.filter(s => s === 'Present').length,
            absent: values.filter(s => s === 'Absent').length,
            missed: values.filter(s => s === 'Missed').length,
            notAvailable: values.filter(s => s === 'Not Available').length,
        };
    }, [tempAttendance, employees]);

    const activeFilteredEmployees = useMemo(() => {
        let filtered = employees;

        // FIX: Use the 'activeFilter' passed into the hook, not the 'finalFilter' state.
        // This was the core of the bug. The component's active filter state was not being used for filtering.
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
    // FIX: Add 'activeFilter' to the dependency array.
    // This ensures the list is re-calculated whenever the filter changes.
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

    return {
        employees,
        tempAttendance,
        setTempAttendance,
        savedAttendance,
        currentUserAttendance,
        editingAbsence,
        setEditingAbsence,
        absenceReasons,
        saveAbsenceReason,
        saveAttendance,
        handleSetTempAttendance,
        sessionStats,
        fetchInitialData,
        finalFilter,
        setFinalFilter,
        finalSearchQuery,
        setFinalSearchQuery,
        finalFilteredEmployees,
        activeFilteredEmployees,
        activeSearchQuery,
        setActiveSearchQuery,
    };
};
