/**
 * LearningHours Page
 *
 * This page manages the scheduling, activation, attendance marking, and completion of daily learning hour sessions for a team.
 * It mirrors the Standups page UI and functionality, using the same Shadcn UI components, Framer Motion animations, and date/time logic.
 *
 * Features:
 * - Admins can schedule a learning hour for today, specifying date and time.
 * - Real-time updates for session status: scheduled, active, or ended.
 * - Admins can start the session, mark attendance for each employee, and end the session.
 * - Attendance is saved in Firestore and displayed after the session ends.
 * - Regular users can view session status and attendance results.
 *
 * Components:
 * - `ScheduleLearningHourForm`: Form for admins to schedule a session.
 * - Main content dynamically renders based on session status and user role.
 *
 * State Management:
 * - `learningHour`: Current session document for today.
 * - `employees`: List of employees fetched from Firestore.
 * - `tempAttendance`: Temporary attendance state for marking during an active session.
 * - `savedAttendance`: Attendance records fetched after session ends.
 *
 * Firebase Integration:
 * - Uses Firestore for learning_hours, employees, and attendance data.
 * - Real-time listeners for session document.
 * - Batch writes for attendance records.
 *
 * UI:
 * - Uses Shadcn UI components, Framer Motion for animations, and Lucide icons.
 * - Responsive and accessible design.
 *
 * @module LearningHours
 * @file LearningHours.tsx
 */

import React, { useEffect, useState, useCallback } from "react";
import { format, setHours, setMinutes, startOfDay } from "date-fns";

// --- Firebase Imports ---
import { db } from "@/integrations/firebase/client";
import {
    doc,
    onSnapshot,
    setDoc,
    updateDoc,
    serverTimestamp,
    Timestamp,
    collection,
    query,
    getDocs,
    where,
    writeBatch,
} from "firebase/firestore";

// --- Context and Auth Hooks ---
import { useUserAuth } from "@/context/UserAuthContext";
import { useAdminAuth } from "@/context/AdminAuthContext";

// --- Component Imports ---
import AppNavbar from "@/components/AppNavbar";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import {
    Loader2,
    CalendarClock,
    PlayCircle,
    StopCircle,
    CheckCircle2,
    AlertTriangle,
    CalendarIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// --- Type Definitions ---
type LearningHour = {
    status: "scheduled" | "active" | "ended";
    scheduledTime: Timestamp;
    startedAt?: Timestamp;
    endedAt?: Timestamp;
    scheduledBy: string;
};

type Employee = { id: string; name: string; email: string };
type AttendanceRecord = {
    employee_id: string;
    status: "Present" | "Missed";
    learning_hour_id: string;
    scheduled_at: Timestamp;
};

// --- Schedule Form Component ---
const ScheduleLearningHourForm = ({
    todayDocId,
    adminName,
}: {
    todayDocId: string;
    adminName: string;
}) => {
    const { toast } = useToast();
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
    const [scheduledTimeInput, setScheduledTimeInput] = useState(
        format(new Date(), "HH:mm")
    );

    const handleSchedule = async () => {
        if (!scheduledDate) {
            toast({
                title: "Error",
                description: "Please select a date.",
                variant: "destructive",
            });
            return;
        }

        const [hours, minutes] = scheduledTimeInput.split(":").map(Number);
        if (
            isNaN(hours) ||
            isNaN(minutes) ||
            hours < 0 ||
            hours > 23 ||
            minutes < 0 ||
            minutes > 59
        ) {
            toast({
                title: "Error",
                description: "Please enter a valid time (HH:MM).",
                variant: "destructive",
            });
            return;
        }

        const finalScheduled = setHours(
            setMinutes(scheduledDate, minutes),
            hours
        );

        // Clean 'now' to zero seconds/ms
        const nowClean = new Date();
        nowClean.setSeconds(0, 0);

        const todayFmt = format(new Date(), "yyyy-MM-dd");
        const selFmt = format(finalScheduled, "yyyy-MM-dd");

        if (selFmt === todayFmt && finalScheduled.getTime() < nowClean.getTime()) {
            toast({
                title: "Error",
                description:
                    "Scheduled time cannot be in the past for today's session.",
                variant: "destructive",
            });
            return;
        }

        setIsScheduling(true);
        try {
            const ref = doc(db, "learning_hours", todayDocId);
            await setDoc(ref, {
                status: "scheduled",
                scheduledTime: Timestamp.fromDate(finalScheduled),
                scheduledBy: adminName,
            });
            toast({
                title: "Success",
                description: `Session scheduled for today at ${format(
                    finalScheduled,
                    "p"
                )}.`,
            });
        } catch (e) {
            console.error(e);
            toast({
                title: "Error",
                description: "Could not schedule session.",
                variant: "destructive",
            });
        } finally {
            setIsScheduling(false);
        }
    };

    return (
        <Card className="text-center p-6 shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl font-bold">
                    No Session Today
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    There is no learning hour scheduled for today. Schedule one now.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "w-[280px] justify-start text-left font-normal",
                                !scheduledDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate
                                ? format(scheduledDate, "PPP")
                                : "Pick a date"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            initialFocus
                            disabled={(date) =>
                                startOfDay(date) < startOfDay(new Date())
                            }
                        />
                    </PopoverContent>
                </Popover>

                <Input
                    type="time"
                    value={scheduledTimeInput}
                    onChange={(e) => setScheduledTimeInput(e.target.value)}
                    className="w-[120px]"
                />

                <Button onClick={handleSchedule} disabled={isScheduling}>
                    {isScheduling ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <CalendarClock className="mr-2 h-4 w-4" />
                    )}
                    Schedule Session
                </Button>
            </CardContent>
        </Card>
    );
};

export default function LearningHours() {
    const { user } = useUserAuth();
    const { admin } = useAdminAuth();
    const { toast } = useToast();

    const [isLoadingPage, setIsLoadingPage] = useState(true);
    const [learningHour, setLearningHour] =
        useState<LearningHour | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] =
        useState(false);

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [tempAttendance, setTempAttendance] =
        useState<Record<string, boolean>>({});
    const [savedAttendance, setSavedAttendance] =
        useState<Record<string, AttendanceRecord>>({});

    const todayDocId = format(new Date(), "yyyy-MM-dd");

    // Real-time listener
    useEffect(() => {
        const ref = doc(db, "learning_hours", todayDocId);
        const unsub = onSnapshot(
            ref,
            (snap) => {
                setLearningHour(
                    snap.exists()
                        ? (snap.data() as LearningHour)
                        : null
                );
                setIsLoadingPage(false);
            },
            (err) => {
                console.error(err);
                toast({
                    title: "Error",
                    description:
                        "Could not connect to learning hour service.",
                    variant: "destructive",
                });
                setIsLoadingPage(false);
            }
        );
        return () => unsub();
    }, [todayDocId, toast]);

    // Fetch employees & attendance
    const fetchData = useCallback(async () => {
        setIsLoadingPage(true);

        if (!employees.length) {
            try {
                const empSnap = await getDocs(
                    collection(db, "employees")
                );
                setEmployees(
                    empSnap.docs.map((d) => ({
                        id: d.id,
                        ...(d.data() as Omit<Employee, "id">),
                    }))
                );
            } catch (e) {
                console.error(e);
                toast({
                    title: "Error",
                    description: "Failed to load employees.",
                    variant: "destructive",
                });
            }
        }

        if (learningHour?.status === "ended") {
            try {
                const q = query(
                    collection(db, "learning_hours_attendance"),
                    where("learning_hour_id", "==", todayDocId)
                );
                const attSnap = await getDocs(q);
                const recs: Record<string, AttendanceRecord> = {};
                attSnap.forEach((d) => {
                    const data = d.data() as AttendanceRecord;
                    recs[data.employee_id] = data;
                });
                setSavedAttendance(recs);
            } catch (e) {
                console.error(e);
                toast({
                    title: "Error",
                    description: "Failed to load attendance.",
                    variant: "destructive",
                });
            }
        }

        setIsLoadingPage(false);
    }, [learningHour, todayDocId, toast, employees.length]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Start session
    const handleStart = async () => {
        setIsUpdatingStatus(true);
        const ref = doc(db, "learning_hours", todayDocId);
        setTempAttendance(
            employees.reduce((a, e) => ({ ...a, [e.id]: false }), {})
        );

        try {
            await updateDoc(ref, {
                status: "active",
                startedAt: serverTimestamp(),
            });
            toast({
                title: "Session Started",
                description:
                    "Learning hour is now active. Mark attendance.",
            });
        } catch (e) {
            console.error(e);
            toast({
                title: "Error",
                description: "Could not start session.",
                variant: "destructive",
            });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // End session
    const handleStop = async () => {
        if (!learningHour) return;
        setIsUpdatingStatus(true);

        try {
            const batch = writeBatch(db);
            const colRef = collection(
                db,
                "learning_hours_attendance"
            );

            employees.forEach((emp) => {
                const status = tempAttendance[emp.id]
                    ? "Present"
                    : "Missed";
                const docRef = doc(
                    colRef,
                    `${todayDocId}_${emp.id}`
                );
                batch.set(docRef, {
                    learning_hour_id: todayDocId,
                    employee_id: emp.id,
                    employee_name: emp.name,
                    status,
                    scheduled_at: learningHour.scheduledTime,
                    markedAt: serverTimestamp(),
                });
            });

            await batch.commit();
            const ref = doc(db, "learning_hours", todayDocId);
            await updateDoc(ref, {
                status: "ended",
                endedAt: serverTimestamp(),
            });

            toast({
                title: "Session Ended",
                description: "Attendance saved.",
            });
            await fetchData();
        } catch (e) {
            console.error(e);
            toast({
                title: "Error",
                description: "Could not end session.",
                variant: "destructive",
            });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleAttendance = (id: string, v: boolean) =>
        setTempAttendance((p) => ({ ...p, [id]: v }));

    // Render UI
    const renderContent = () => {
        if (isLoadingPage) {
            return (
                <div className="flex justify-center items-center h-full min-h-[300px]">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            );
        }

        // 1. No session
        if (!learningHour) {
            return admin ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-lg mx-auto"
                >
                    <ScheduleLearningHourForm
                        todayDocId={todayDocId}
                        adminName={user?.displayName || "Admin"}
                    />
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-lg mx-auto"
                >
                    <Alert variant="default" className="border-yellow-300 bg-yellow-50">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertTitle className="text-yellow-800">
                            No Session Scheduled
                        </AlertTitle>
                        <AlertDescription className="text-yellow-700">
                            There is no learning hour scheduled for today.
                        </AlertDescription>
                    </Alert>
                </motion.div>
            );
        }

        // 2. Scheduled
        if (learningHour.status === "scheduled") {
            return (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-lg mx-auto"
                >
                    <Card className="text-center p-6 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold">
                                Today's Learning Hour
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-700">
                                <CalendarClock className="h-4 w-4" />
                                <AlertTitle>Session Scheduled</AlertTitle>
                                <AlertDescription>
                                    Scheduled at{" "}
                                    {format(
                                        learningHour.scheduledTime.toDate(),
                                        "p"
                                    )}
                                </AlertDescription>
                            </Alert>
                            {admin && (
                                <Button
                                    size="lg"
                                    className="w-full font-bold"
                                    onClick={handleStart}
                                    disabled={isUpdatingStatus}
                                >
                                    {isUpdatingStatus ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <PlayCircle className="mr-2 h-5 w-5" />
                                    )}
                                    Start Session
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            );
        }

        // 3. Active
        if (learningHour.status === "active") {
            return (
                <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                    }}
                    className="w-full max-w-lg mx-auto"
                >
                    <Card className="p-6 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold mb-4">
                                {admin
                                    ? "Mark Attendance"
                                    : "Learning Hour is LIVE!"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert className="mb-6 bg-red-50 border-red-200 text-red-700">
                                <PlayCircle className="h-4 w-4" />
                                <AlertTitle>Session is LIVE!</AlertTitle>
                            </Alert>

                            {admin ? (
                                <>
                                    <div className="max-h-[300px] overflow-y-auto pr-2 mb-4">
                                        <ul className="space-y-3">
                                            {employees.map((emp) => (
                                                <li
                                                    key={emp.id}
                                                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Checkbox
                                                            id={`att-${emp.id}`}
                                                            checked={
                                                                !!tempAttendance[emp.id]
                                                            }
                                                            onCheckedChange={(v) =>
                                                                handleAttendance(
                                                                    emp.id,
                                                                    v as boolean
                                                                )
                                                            }
                                                            disabled={isUpdatingStatus}
                                                        />
                                                        <label
                                                            htmlFor={`att-${emp.id}`}
                                                            className="text-lg font-medium cursor-pointer"
                                                        >
                                                            {emp.name}
                                                        </label>
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            "text-sm font-semibold",
                                                            tempAttendance[emp.id]
                                                                ? "text-green-600"
                                                                : "text-orange-600"
                                                        )}
                                                    >
                                                        {tempAttendance[emp.id]
                                                            ? "Present"
                                                            : "Missed"}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <Button
                                        size="lg"
                                        className="w-full"
                                        onClick={handleStop}
                                        disabled={isUpdatingStatus}
                                    >
                                        {isUpdatingStatus ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <StopCircle className="mr-2 h-5 w-5" />
                                        )}
                                        End Session & Save
                                    </Button>
                                </>
                            ) : (
                                <p className="text-muted-foreground text-center mt-4">
                                    The session is ongoing. Attendance is being
                                    marked by an admin.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            );
        }

        // 4. Ended
        if (learningHour.status === "ended") {
            return (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-lg mx-auto"
                >
                    <Card className="p-6 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold mb-4">
                                Attendance Report
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert className="mb-6 bg-green-50 border-green-200 text-green-700">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertTitle>Session Completed!</AlertTitle>
                                <AlertDescription>
                                    Concluded at{" "}
                                    {learningHour.endedAt
                                        ? format(
                                            learningHour.endedAt.toDate(),
                                            "p"
                                        )
                                        : ""}
                                </AlertDescription>
                            </Alert>

                            <ul className="max-h-[300px] overflow-y-auto pr-2 space-y-3">
                                {employees.map((emp) => {
                                    const pres =
                                        savedAttendance[emp.id]?.status ===
                                        "Present";
                                    return (
                                        <li
                                            key={emp.id}
                                            className="flex items-center justify-between py-2 px-3 rounded-md"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    id={`view-${emp.id}`}
                                                    checked={pres}
                                                    disabled
                                                />
                                                <label
                                                    htmlFor={`view-${emp.id}`}
                                                    className="text-lg font-medium"
                                                >
                                                    {emp.name}
                                                </label>
                                            </div>
                                            <span
                                                className={cn(
                                                    "text-sm font-semibold",
                                                    pres
                                                        ? "text-green-600"
                                                        : "text-orange-600"
                                                )}
                                            >
                                                {pres ? "Present" : "Missed"}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </CardContent>
                    </Card>
                </motion.div>
            );
        }

        return null;
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <AppNavbar />
            <main className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl">{renderContent()}</div>
            </main>
        </div>
    );
}
