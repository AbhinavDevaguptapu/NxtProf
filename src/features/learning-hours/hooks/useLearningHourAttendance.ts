import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, query, where, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { useToast } from '@/components/ui/use-toast';
import type { Employee, AttendanceRecord, AttendanceStatus, LearningHour } from '../types';

export const useLearningHourAttendance = (learningHour: LearningHour | null, todayDocId: string) => {
    const { toast } = useToast();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [tempAttendance, setTempAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [savedAttendance, setSavedAttendance] = useState<Record<string, AttendanceRecord>>({});
    const [editingAbsence, setEditingAbsence] = useState<Employee | null>(null);
    const [absenceReasons, setAbsenceReasons] = useState<Record<string, string>>({});

    const fetchInitialData = useCallback(async () => {
        try {
            const empSnapshot = await getDocs(collection(db, "employees"));
            const fetchedEmployees = empSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Employee[];
            setEmployees(fetchedEmployees);

            if (learningHour?.status === "active") {
                const initialAttendance: Record<string, AttendanceStatus> = {};
                fetchedEmployees.forEach(emp => { initialAttendance[emp.id] = "Missed"; });
                setTempAttendance(initialAttendance);
                setAbsenceReasons({});
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
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ title: "Error loading data", variant: "destructive" });
        }
    }, [learningHour?.status, todayDocId, toast]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const saveAbsenceReason = (employeeId: string, reason: string) => {
        if (!reason.trim()) {
            toast({ title: "Reason is required.", variant: "destructive" });
            return;
        }
        setAbsenceReasons(prev => ({ ...prev, [employeeId]: reason }));
        setTempAttendance(prev => ({ ...prev, [employeeId]: "Not Available" }));
        setEditingAbsence(null);
        toast({ title: "Absence reason saved." });
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
        await fetchInitialData();
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

    return {
        employees,
        tempAttendance,
        setTempAttendance,
        savedAttendance,
        editingAbsence,
        setEditingAbsence,
        absenceReasons,
        saveAbsenceReason,
        saveAttendance,
        sessionStats,
        fetchInitialData,
    };
};
