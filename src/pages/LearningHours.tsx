import React, { useEffect, useState, useCallback, useMemo } from "react";
import { format, formatDistanceStrict, setHours, setMinutes, startOfDay, startOfMinute } from "date-fns";

// Firebase Imports
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

// Context and Auth Hooks
import { useUserAuth } from "@/context/UserAuthContext";
import { useAdminAuth } from "@/context/AdminAuthContext";

// Component Imports
import AppNavbar from "@/components/AppNavbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarClock, PlayCircle, StopCircle, CheckCircle2, AlertTriangle, CalendarIcon, Users, UserCheck, UserX, UserRoundPlus, Info, UserMinus, BrainCircuit } from "lucide-react";
import { AnimatePresence, motion, Variants } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// --- TYPE DEFINITIONS ---
type AttendanceStatus = "Present" | "Absent" | "Missed" | "Not Available";
type LearningHour = { status: "scheduled" | "active" | "ended", scheduledTime: Timestamp, startedAt?: Timestamp, endedAt?: Timestamp, scheduledBy: string };
type Employee = { id: string; name: string; email: string; employeeId: string; };
type AttendanceRecord = { employeeId: string, employee_email: string, employee_id: string, employee_name: string, status: AttendanceStatus, learning_hour_id: string, scheduled_at: Timestamp, markedAt: Timestamp, reason?: string };

// --- ANIMATION VARIANTS ---
const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants: Variants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

// Updated Animation Pattern
const pageVariants: Variants = {
    initial: {
        opacity: 0,
        y: 20,
        transition: { duration: 0.3, ease: "easeInOut" }
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeInOut" }
    },
    exit: {
        opacity: 0,
        y: -20,
        transition: { duration: 0.3, ease: "easeInOut" }
    }
};

// --- MAIN PAGE COMPONENT ---
export default function LearningHours() {
    const { user } = useUserAuth();
    const { admin } = useAdminAuth();
    const { toast } = useToast();

    // State
    const [isLoadingPage, setIsLoadingPage] = useState(true);
    const [learningHour, setLearningHour] = useState<LearningHour | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [tempAttendance, setTempAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [savedAttendance, setSavedAttendance] = useState<Record<string, AttendanceRecord>>({});
    const [editingAbsence, setEditingAbsence] = useState<Employee | null>(null);
    const [absenceReasons, setAbsenceReasons] = useState<Record<string, string>>({});
    const [sessionTime, setSessionTime] = useState("0s");

    // Filter states
    const [activeFilter, setActiveFilter] = useState<AttendanceStatus | 'all'>('all');
    const [finalFilter, setFinalFilter] = useState<AttendanceStatus | 'all'>('all');

    // Memoized lists for filtered rosters
    const activeFilteredEmployees = useMemo(() => {
        if (activeFilter === 'all') return employees;
        return employees.filter(emp => (tempAttendance[emp.id] || 'Missed') === activeFilter);
    }, [activeFilter, employees, tempAttendance]);

    const finalFilteredEmployees = useMemo(() => {
        if (finalFilter === 'all') return employees;
        return employees.filter(emp => (savedAttendance[emp.id]?.status || 'Missed') === finalFilter);
    }, [finalFilter, employees, savedAttendance]);

    // Effect for the live session timer
    useEffect(() => {
        if (learningHour?.status === 'active' && learningHour.startedAt) {
            const intervalId = setInterval(() => {
                const duration = formatDistanceStrict(new Date(), learningHour.startedAt.toDate());
                setSessionTime(duration);
            }, 1000);
            return () => clearInterval(intervalId);
        }
    }, [learningHour?.status, learningHour?.startedAt]);

    const todayDocId = format(new Date(), "yyyy-MM-dd");

    // Real-time listener for the learning hour document
    useEffect(() => {
        const ref = doc(db, "learning_hours", todayDocId);
        const unsubscribe = onSnapshot(ref, (snap) => {
            setLearningHour(snap.exists() ? (snap.data() as LearningHour) : null);
            setIsLoadingPage(false);
        });
        return () => unsubscribe();
    }, [todayDocId]);

    // Fetch initial employee and attendance data
    const fetchInitialData = useCallback(async () => {
        try {
            const empSnapshot = await getDocs(collection(db, "employees"));
            setEmployees(empSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Employee[]);

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

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    // --- ADMIN ACTIONS ---
    const handleStart = async () => {
        setIsUpdatingStatus(true);
        const initialAttendance: Record<string, AttendanceStatus> = {};
        employees.forEach(emp => { initialAttendance[emp.id] = "Missed"; });
        setTempAttendance(initialAttendance);
        setAbsenceReasons({});

        try {
            await updateDoc(doc(db, "learning_hours", todayDocId), { status: "active", startedAt: serverTimestamp() });
            toast({ title: "Learning Session Started" });
        } catch (e) {
            console.error(e);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleBeginMarkUnavailable = (employee: Employee) => {
        setEditingAbsence(employee);
    };

    const handleSaveAbsenceReason = (employeeId: string, reason: string) => {
        if (!reason.trim()) {
            toast({ title: "Reason is required.", variant: "destructive" });
            return;
        }
        setAbsenceReasons(prev => ({ ...prev, [employeeId]: reason }));
        setTempAttendance(prev => ({ ...prev, [employeeId]: "Not Available" }));
        setEditingAbsence(null);
        toast({ title: "Absence reason saved." });
    };

    const handleStop = async () => {
        if (!learningHour) return;
        setIsUpdatingStatus(true);
        try {
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
            await updateDoc(doc(db, "learning_hours", todayDocId), { status: "ended", endedAt: serverTimestamp() });
            toast({ title: "Session Ended", description: "Attendance saved." });
            await fetchInitialData();
        } catch (e) {
            console.error(e);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // Memoized statistics for the active session
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

    // --- RENDER LOGIC ---
    const renderContent = () => {
        if (isLoadingPage) {
            return (
                <motion.div key="loading" className="flex-grow flex items-center justify-center" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </motion.div>
            );
        }

        if (!learningHour) {
            if (admin) {
                return (
                    <motion.div key="schedule" className="flex-grow flex items-center justify-center p-4" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                        <ScheduleLearningHourForm todayDocId={todayDocId} adminName={user?.displayName || "Admin"} />
                    </motion.div>
                );
            }
            return (
                <motion.div key="no-session" className="flex-grow flex items-center justify-center p-4" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <Alert className="max-w-md border-gray-400 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>No Learning Session Scheduled</AlertTitle>
                        <AlertDescription>There is no session scheduled for today. Please check back later.</AlertDescription>
                    </Alert>
                </motion.div>
            );
        }

        if (learningHour.status === "scheduled") {
            return (
                <motion.div key="scheduled" className="flex-grow flex items-center justify-center p-4" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <Card className="text-center p-8  max-w-lg mx-auto rounded-xl  border-gray-400">
                        <CardHeader className="mb-4">
                            <div className="mx-auto bg-gray-100 text-black rounded-full h-16 w-16 flex items-center justify-center mb-4">
                                <BrainCircuit className="h-8 w-8" />
                            </div>
                            <CardTitle className="text-3xl font-extrabold text-gray-900">Learning Session</CardTitle>
                            <CardDescription className="text-gray-600 text-md mt-2">
                                Scheduled for <span className="font-semibold text-black-700">{format(learningHour.scheduledTime.toDate(), 'p')}</span> today.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {admin ? (
                                <Button size="lg" onClick={handleStart} disabled={isUpdatingStatus} className="w-full bg-black hover:bg-gray-700 text-white font-bold py-3 text-lg">
                                    {isUpdatingStatus ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlayCircle className="mr-2 h-6 w-6" />}
                                    {isUpdatingStatus ? 'Starting...' : 'Start Session Now'}
                                </Button>
                            ) : (
                                <p className="text-md text-gray-800 bg-gray-100 p-3 rounded-lg">The session has not started yet. Get ready to learn!</p>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            );
        }

        if (learningHour.status === "active" && admin) {
            return (
                <motion.div key="active-admin" className="w-full mx-auto space-y-8" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <div className="flex flex-wrap gap-4 justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                                <h1 className="text-3xl font-bold tracking-tight">Learning Session in Progress</h1>
                            </div>
                            <p className="text-muted-foreground mt-1">Mark attendance for each team member.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-2xl font-semibold text-gray-800">{sessionTime}</p>
                                <p className="text-xs text-muted-foreground">SESSION TIME</p>
                            </div>
                            <Button size="lg" variant="destructive" onClick={handleStop} disabled={isUpdatingStatus}>
                                {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <StopCircle className="mr-2 h-5 w-5" />}
                                End & Save
                            </Button>
                        </div>
                    </div>

                    <SessionStatistics stats={sessionStats} />

                    <div>
                        <div className="flex flex-wrap gap-4 items-center mb-4">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">Attendance Roster</h2>
                                <p className="text-sm text-muted-foreground">Click a member's status to mark their attendance.</p>
                            </div>
                            <div className="flex items-center border border-gray-200 rounded-lg p-1 space-x-1">
                                <Button size="sm" variant={activeFilter === 'all' ? 'secondary' : 'ghost'} onClick={() => setActiveFilter('all')}>All</Button>
                                <Button size="sm" variant={activeFilter === 'Present' ? 'secondary' : 'ghost'} onClick={() => setActiveFilter('Present')}>Present</Button>
                                <Button size="sm" variant={activeFilter === 'Absent' ? 'secondary' : 'ghost'} onClick={() => setActiveFilter('Absent')}>Absent</Button>
                                <Button size="sm" variant={activeFilter === 'Missed' ? 'secondary' : 'ghost'} onClick={() => setActiveFilter('Missed')}>Missed</Button>
                                <Button size="sm" variant={activeFilter === 'Not Available' ? 'secondary' : 'ghost'} onClick={() => setActiveFilter('Not Available')}>N/A</Button>
                            </div>
                        </div>
                        <motion.div key={activeFilter} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" variants={containerVariants} initial="hidden" animate="visible">
                            {activeFilteredEmployees.length > 0 ? (
                                activeFilteredEmployees.map((emp) => (
                                    <motion.div key={emp.id} variants={itemVariants}>
                                        <AttendanceCard employee={emp} status={tempAttendance[emp.id] || 'Missed'} reason={absenceReasons[emp.id]} onSetStatus={(id, status) => setTempAttendance(p => ({ ...p, [id]: status }))} onMarkUnavailable={handleBeginMarkUnavailable} isInteractive={true} />
                                    </motion.div>
                                ))
                            ) : (
                                <motion.div className="col-span-full flex flex-col items-center justify-center text-center p-10 border border-gray rounded-lg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                    <Users className="h-12 w-12 text-gray-400 mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-700">No Members Found</h3>
                                    <p className="text-muted-foreground">There are no team members in the "{activeFilter}" category.</p>
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                </motion.div>
            );
        }

        if (learningHour.status === "ended" || (learningHour.status === 'active' && !admin)) {
            return (
                <motion.div key="summary-view-container" className="w-full flex-grow flex flex-col items-center justify-center p-4" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    {learningHour.status === 'ended' ? (
                        <div className="w-full space-y-8">
                            <div className="p-6 rounded-lg border border-gray-200">
                                <div className="flex flex-wrap gap-4 justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 text-black flex items-center justify-center flex-shrink-0"><CheckCircle2 className="w-7 h-7" /></div>
                                        <div>
                                            <h1 className="text-3xl font-bold tracking-tight">Learning Session Completed</h1>
                                            <p className="text-muted-foreground">{`Concluded at ${learningHour.endedAt ? format(learningHour.endedAt.toDate(), 'p') : 'N/A'}.`}</p>
                                        </div>
                                    </div>
                                    {learningHour.startedAt && learningHour.endedAt && (
                                        <div className="text-right">
                                            <p className="text-2xl font-semibold text-gray-800">{formatDistanceStrict(learningHour.endedAt.toDate(), learningHour.startedAt.toDate())}</p>
                                            <p className="text-xs text-muted-foreground">TOTAL DURATION</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold mb-4 tracking-tight">Final Summary</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    <Card className="p-4"><p className="text-sm font-medium text-muted-foreground">Present</p><p className="text-3xl font-bold">{Object.values(savedAttendance).filter(a => a.status === 'Present').length}</p></Card>
                                    <Card className="p-4"><p className="text-sm font-medium text-muted-foreground">Absent</p><p className="text-3xl font-bold">{Object.values(savedAttendance).filter(a => a.status === 'Absent').length}</p></Card>
                                    <Card className="p-4"><p className="text-sm font-medium text-muted-foreground">Missed</p><p className="text-3xl font-bold">{Object.values(savedAttendance).filter(a => a.status === 'Missed').length}</p></Card>
                                    <Card className="p-4"><p className="text-sm font-medium text-muted-foreground">Unavailable</p><p className="text-3xl font-bold">{Object.values(savedAttendance).filter(a => a.status === 'Not Available').length}</p></Card>
                                    <Card className="p-4"><p className="text-sm font-medium text-muted-foreground">Total Team</p><p className="text-3xl font-bold">{employees.length}</p></Card>
                                </div>
                            </div>

                            <div>
                                <div className="flex flex-wrap gap-4 items-center mb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold tracking-tight">Final Roster</h2>
                                        <p className="text-sm text-muted-foreground">Showing {finalFilteredEmployees.length} of {employees.length} members.</p>
                                    </div>
                                    <div className="flex items-center border border-gray-200 rounded-lg p-1 space-x-1">
                                        <Button size="sm" variant={finalFilter === 'all' ? 'secondary' : 'ghost'} onClick={() => setFinalFilter('all')}>All</Button>
                                        <Button size="sm" variant={finalFilter === 'Present' ? 'secondary' : 'ghost'} onClick={() => setFinalFilter('Present')}>Present</Button>
                                        <Button size="sm" variant={finalFilter === 'Absent' ? 'secondary' : 'ghost'} onClick={() => setFinalFilter('Absent')}>Absent</Button>
                                        <Button size="sm" variant={finalFilter === 'Missed' ? 'secondary' : 'ghost'} onClick={() => setFinalFilter('Missed')}>Missed</Button>
                                        <Button size="sm" variant={finalFilter === 'Not Available' ? 'secondary' : 'ghost'} onClick={() => setFinalFilter('Not Available')}>N/A</Button>
                                    </div>
                                </div>
                                <motion.div key={finalFilter} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" variants={containerVariants} initial="hidden" animate="visible">
                                    {finalFilteredEmployees.length > 0 ? (
                                        finalFilteredEmployees.map((emp) => (
                                            <motion.div key={emp.id} variants={itemVariants}>
                                                <AttendanceCard employee={emp} status={savedAttendance[emp.id]?.status || 'Missed'} reason={savedAttendance[emp.id]?.reason} onSetStatus={() => { }} onMarkUnavailable={() => { }} isInteractive={false} />
                                            </motion.div>
                                        ))
                                    ) : (
                                        <motion.div className="col-span-full flex flex-col items-center justify-center text-center p-10 bg-gray-50 rounded-lg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                            <Users className="h-12 w-12 text-gray-400 mb-4" />
                                            <h3 className="text-xl font-semibold text-gray-700">No Members Found</h3>
                                            <p className="text-muted-foreground">There are no team members in the "{finalFilter}" category.</p>
                                        </motion.div>
                                    )}
                                </motion.div>
                            </div>
                        </div>
                    ) : (
                        <Card className="text-center p-8 shadow-xl max-w-lg mx-auto rounded-2xl bg-white">
                            <CardHeader>
                                <div className="mx-auto bg-blue-100 text-blue-600 rounded-full h-20 w-20 flex items-center justify-center mb-5">
                                    <Loader2 className="h-10 w-10 animate-spin" />
                                </div>
                                <CardTitle className="text-3xl font-bold text-gray-800">Session in Progress</CardTitle>
                                <CardDescription className="text-gray-500 text-lg mt-2">The host is currently taking attendance.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">The results will be displayed here once the session ends.</p>
                            </CardContent>
                        </Card>
                    )}
                </motion.div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <AppNavbar />
            <main className="flex-1 container mx-auto p-4 md:p-8 flex flex-col">
                <AnimatePresence mode="wait">
                    {renderContent()}
                </AnimatePresence>
            </main>
            <AbsenceReasonModal isOpen={!!editingAbsence} employee={editingAbsence} onClose={() => setEditingAbsence(null)} onSave={handleSaveAbsenceReason} />
        </div>
    );
}

// --- CHILD COMPONENTS ---

const AttendanceCard = ({ employee, status, reason, onSetStatus, onMarkUnavailable, isInteractive }: { employee: Employee, status: AttendanceStatus, reason?: string, onSetStatus: (id: string, s: AttendanceStatus) => void, onMarkUnavailable: (e: Employee) => void, isInteractive: boolean }) => {
    const getBadgeStyle = () => {
        switch (status) {
            case "Present": return "bg-green-600 text-white";
            case "Absent": return "bg-red-600 text-white";
            case "Missed": return "bg-yellow-500 text-white";
            case "Not Available": return "bg-gray-500 text-white";
            default: return "bg-gray-200 text-gray-800";
        }
    };

    return (
        <Card className="flex flex-col justify-between h-full transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">{employee.name}</CardTitle>
                    <CardDescription className="text-xs">{employee.email}</CardDescription>
                </div>
                <Badge className={cn("border-transparent", getBadgeStyle())}>
                    {status === "Not Available" ? "N/A" : status}
                </Badge>
            </CardHeader>
            <CardContent className="pt-2 flex-grow flex flex-col">
                {status === "Not Available" && reason && (
                    <div className="flex-grow text-sm text-muted-foreground mb-4">
                        <div className="border-l-2 pl-3 flex items-start gap-2"><Info className="h-4 w-4 mt-0.5 flex-shrink-0" /><p className="italic">{reason}</p></div>
                    </div>
                )}
                <div className="flex-grow"></div>
                {isInteractive && (
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                        <Button size="sm" variant={status === "Present" ? "default" : "outline"} onClick={() => onSetStatus(employee.id, "Present")}><CheckCircle2 className="h-4 w-4 mr-1" />Present</Button>
                        <Button size="sm" variant={status === "Absent" ? "destructive" : "outline"} onClick={() => onSetStatus(employee.id, "Absent")}><UserMinus className="h-4 w-4 mr-1" />Absent</Button>
                        <Button size="sm" variant={status === "Missed" ? "secondary" : "outline"} className={cn(status === 'Missed' && "bg-yellow-500 hover:bg-yellow-600 text-white")} onClick={() => onSetStatus(employee.id, "Missed")}><UserX className="h-4 w-4 mr-1" />Missed</Button>
                        <Button size="sm" variant="outline" onClick={() => onMarkUnavailable(employee)}>N/A</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

const SessionStatistics = ({ stats }: { stats: Record<string, number> }) => (
    <motion.div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5" variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}><StatCard title="Total Employees" value={stats.total} icon={<Users />} /></motion.div>
        <motion.div variants={itemVariants}><StatCard title="Present" value={stats.present} icon={<UserCheck />} /></motion.div>
        <motion.div variants={itemVariants}><StatCard title="Absent" value={stats.absent} icon={<UserMinus />} /></motion.div>
        <motion.div variants={itemVariants}><StatCard title="Missed" value={stats.missed} icon={<UserX />} /></motion.div>
        <motion.div variants={itemVariants}><StatCard title="Not Available" value={stats.notAvailable} icon={<UserRoundPlus />} /></motion.div>
    </motion.div>
);

const AbsenceReasonModal = ({ employee, isOpen, onClose, onSave }: { employee: Employee | null, isOpen: boolean, onClose: () => void, onSave: (id: string, r: string) => void }) => {
    const [reason, setReason] = useState("");
    useEffect(() => { if (isOpen) setReason(""); }, [isOpen]);
    if (!isOpen || !employee) return null;
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reason for Unavailability: {employee.name}</DialogTitle>
                    <DialogDescription>Provide a brief reason why this member is unavailable for the session.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="absence-reason" className="sr-only">Reason</Label>
                    <Textarea id="absence-reason" placeholder="e.g., On leave, sick day, client meeting..." value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave(employee.id, reason)}>Save Reason</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ScheduleLearningHourForm = ({ todayDocId, adminName }: { todayDocId: string, adminName: string }) => {
    const { toast } = useToast();
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
    const [scheduledTimeInput, setScheduledTimeInput] = useState<string>(format(new Date(), 'HH:mm'));

    const handleSchedule = async () => {
        if (!scheduledDate) { toast({ title: "Please select a date.", variant: "destructive" }); return; }
        const [hours, minutes] = scheduledTimeInput.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes) || hours > 23 || minutes > 59) { toast({ title: "Invalid time format.", variant: "destructive" }); return; }
        let finalDateTime = setHours(setMinutes(startOfDay(scheduledDate), minutes), hours);
        const nowAtStartOfMinute = startOfMinute(new Date());
        if (finalDateTime < nowAtStartOfMinute) {
            toast({ title: "Cannot schedule in the past.", variant: "destructive" });
            return;
        }

        setIsScheduling(true);
        try {
            await setDoc(doc(db, "learning_hours", todayDocId), { status: "scheduled", scheduledTime: Timestamp.fromDate(finalDateTime), scheduledBy: adminName });
            toast({ title: "Success", description: `Session scheduled for ${format(finalDateTime, 'p')}.` });
        } catch (error) {
            console.error(error);
            toast({ title: "Scheduling Failed", description: "An unexpected error occurred.", variant: "destructive" });
        } finally {
            setIsScheduling(false);
        }
    };
    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Schedule Today's Session</CardTitle>
                <CardDescription>Set the time for the daily learning session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="date-picker">Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="date-picker" variant="outline" className={cn("w-full justify-start text-left font-normal", !scheduledDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {scheduledDate ? format(scheduledDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus disabled={(d) => startOfDay(d) < startOfDay(new Date())} />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="time-input">Time (24-hour)</Label>
                    <Input id="time-input" type="time" value={scheduledTimeInput} onChange={(e) => setScheduledTimeInput(e.target.value)} />
                </div>
                <Button onClick={handleSchedule} disabled={isScheduling} className="w-full">
                    {isScheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />} Schedule Now
                </Button>
            </CardContent>
        </Card>
    );
};