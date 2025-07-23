import React, { useState, useMemo } from "react";
import { format, formatDistanceStrict } from "date-fns";
import { AnimatePresence, motion, Variants } from "framer-motion";
import { getFunctions, httpsCallable } from 'firebase/functions';


// Auth Hooks
import { useUserAuth } from "@/context/UserAuthContext";
import { useAdminAuth } from "@/context/AdminAuthContext";

// UI Components

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, PlayCircle, StopCircle, CheckCircle2, AlertTriangle, BrainCircuit, Users, Bot } from "lucide-react";

// Feature Components & Hooks
import { useLearningHourSession } from "@/features/learning-hours/hooks/useLearningHourSession";
import { useLearningHourAttendance } from "@/features/learning-hours/hooks/useLearningHourAttendance";
import { useLearningPoints } from "@/features/learning-hours/hooks/useLearningPoints";
import { ScheduleLearningHourForm } from "@/features/learning-hours/components/ScheduleLearningHourForm";
import { AttendanceCard } from "@/features/learning-hours/components/AttendanceCard";
import { SessionStatistics } from "@/features/learning-hours/components/SessionStatistics";
import { AbsenceReasonModal } from "@/features/learning-hours/components/AbsenceReasonModal";
import { LearningPointsList } from "@/features/learning-hours/components/LearningPointsList";
import { SessionStatusBanner } from "@/features/learning-hours/components/SessionStatusBanner";
import type { AttendanceStatus } from "@/features/learning-hours/types";

// Animation Variants
const pageVariants: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeInOut" } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeInOut" } }
};
const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants: Variants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

import { ViewState, ViewType } from "@/layout/AppShell";

// --- MAIN PAGE COMPONENT ---
interface LearningHoursPageProps {
  setActiveView: (view: ViewState) => void;
}

export default function LearningHours({ setActiveView }: LearningHoursPageProps) {
    const { user } = useUserAuth();
    const { admin } = useAdminAuth();
    const { toast } = useToast();

    const { learningHour, isLoading, isUpdating, sessionTime, todayDocId, startSession, endSession } = useLearningHourSession();
    const { employees, tempAttendance, setTempAttendance, savedAttendance, currentUserAttendance, editingAbsence, setEditingAbsence, absenceReasons, saveAbsenceReason, saveAttendance, sessionStats, fetchInitialData } = useLearningHourAttendance(learningHour, todayDocId);
    const { learningPoints, isLoading: isLoadingPoints, addLearningPoint, updateLearningPoint, deleteLearningPoint } = useLearningPoints(todayDocId);

    const [activeFilter, setActiveFilter] = useState<AttendanceStatus | 'all'>('all');
    const [finalFilter, setFinalFilter] = useState<AttendanceStatus | 'all'>('all');

    const activeFilteredEmployees = useMemo(() => {
        if (activeFilter === 'all') return employees;
        return employees.filter(emp => (tempAttendance[emp.id] || 'Missed') === activeFilter);
    }, [activeFilter, employees, tempAttendance]);

    const finalFilteredEmployees = useMemo(() => {
        if (finalFilter === 'all') return employees;
        return employees.filter(emp => (savedAttendance[emp.id]?.status || 'Missed') === finalFilter);
    }, [finalFilter, employees, savedAttendance]);

    const handleStartSession = async () => {
        await startSession();
        fetchInitialData();
    };

    const handleEndSession = async () => {
        const functions = getFunctions();
        const endSessionFunction = httpsCallable(functions, 'endLearningSessionAndLockPoints');

        try {
            await endSessionFunction({ sessionId: todayDocId });
            await saveAttendance(); // This might be redundant if the cloud function handles it, but good for client-side state update
            await endSession(); // This updates the client-side session state
            fetchInitialData();
            toast({ title: "Success", description: "Session ended and points have been locked." });
        } catch (error: any) {
            console.error("Error ending session:", error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const [isRescheduling, setIsRescheduling] = useState(false);

    const handleAddPoint = (data: any) => {
        addLearningPoint(data, todayDocId);
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <motion.div key="loading" className="flex-grow flex items-center justify-center" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </motion.div>
            );
        }

        // --- USER VIEW ---
        if (!admin) {
            return (
                <motion.div key="user-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <SessionStatusBanner learningHour={learningHour} />
                    
                    <LearningPointsList
                        points={learningPoints}
                        isLoading={isLoadingPoints}
                        onAddPoint={handleAddPoint}
                        onUpdatePoint={updateLearningPoint}
                        onDeletePoint={deleteLearningPoint}
                        isDayLocked={learningHour?.status === 'ended'}
                    />

                    {learningHour?.status === 'ended' && (
                        <div className="mt-12">
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
                            <motion.div key={finalFilter} className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={containerVariants} initial="hidden" animate="visible">
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
                    )}
                </motion.div>
            );
        }

        // --- ADMIN VIEW ---
        if (!learningHour || isRescheduling) {
            return (
                <motion.div key="schedule" className="flex-grow flex items-center justify-center p-4" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <ScheduleLearningHourForm
                        todayDocId={todayDocId}
                        adminName={user?.displayName || "Admin"}
                        onSuccess={() => setIsRescheduling(false)}
                    />
                </motion.div>
            );
        }

        if (learningHour.status === "scheduled") {
            return (
                <motion.div key="scheduled" className="flex-grow flex items-center justify-center p-4" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <Card className="text-center p-8 max-w-lg mx-auto rounded-xl border-gray-400">
                        <CardHeader className="mb-4">
                            <div className="mx-auto bg-gray-100 text-black rounded-full h-16 w-16 flex items-center justify-center mb-4">
                                <BrainCircuit className="h-8 w-8" />
                            </div>
                            <CardTitle className="text-3xl font-extrabold text-gray-900">Learning Session</CardTitle>
                            <CardDescription className="text-gray-600 text-md mt-2">
                                Scheduled for <span className="font-semibold text-black-700">{format(learningHour.scheduledTime.toDate(), 'p')}</span> today.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            <Button
                                size="lg"
                                onClick={() => setIsRescheduling(true)}
                                variant="outline"
                            >
                                Reschedule
                            </Button>
                            <Button size="lg" onClick={handleStartSession} disabled={isUpdating} className="w-full bg-black hover:bg-gray-700 text-white font-bold py-3 text-lg">
                                {isUpdating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlayCircle className="mr-2 h-6 w-6" />}
                                {isUpdating ? 'Starting...' : 'Start Session Now'}
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            );
        }

        if (learningHour.status === "active") {
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
                            <Button size="lg" variant="destructive" onClick={handleEndSession} disabled={isUpdating}>
                                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <StopCircle className="mr-2 h-5 w-5" />}
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
                                        <AttendanceCard employee={emp} status={tempAttendance[emp.id] || 'Missed'} reason={absenceReasons[emp.id]} onSetStatus={(id, status) => setTempAttendance(p => ({ ...p, [id]: status }))} onMarkUnavailable={setEditingAbsence} isInteractive={true} />
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

        if (learningHour.status === "ended") {
            return (
                <motion.div key="summary-view-container" className="w-full space-y-8" variants={pageVariants} initial="initial" animate="animate" exit="exit">
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
                        <motion.div key={finalFilter} className="grid grid-cols-1 md:grid-cols-2 gap-6" variants={containerVariants} initial="hidden" animate="visible">
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
                </motion.div>
            );
        }

        return null;
    };

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Learning Hours</h1>
                    <Button variant="outline" onClick={() => setActiveView({ view: 'task-analyzer' })}>
                        <Bot className="mr-2 h-4 w-4" />
                        AI Task Analysis
                    </Button>
                </div>
            <AnimatePresence mode="wait">
                {renderContent()}
            </AnimatePresence>
            <AbsenceReasonModal isOpen={!!editingAbsence} employee={editingAbsence} onClose={() => setEditingAbsence(null)} onSave={saveAbsenceReason} />
        </>
    );
}
