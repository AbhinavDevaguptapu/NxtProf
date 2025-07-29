import { AnimatePresence, motion, Variants, LayoutGroup } from "framer-motion";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { format, formatDistanceStrict } from "date-fns";
import React, { useState, useMemo, FC } from "react";

// Auth Hooks
import { useUserAuth } from "@/context/UserAuthContext";
import { useAdminAuth } from "@/context/AdminAuthContext";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, PlayCircle, StopCircle, CheckCircle2, AlertTriangle, BrainCircuit, Users, Bot, UserMinus, UserX, Check } from "lucide-react";

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
import { syncLearningPointsToSheet } from "@/features/learning-hours/services/syncService";
import type { AttendanceStatus } from "@/features/learning-hours/types";

// Animation Variants
const pageVariants: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeInOut" } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeInOut" } }
};
const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants: Variants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };
const transition = { type: "spring" as const, stiffness: 400, damping: 30 };

import { ViewState, ViewType } from "@/layout/AppShell";

// --- HELPER COMPONENTS ---

const FilterControls: FC<{ currentFilter: string; onFilterChange: (filter: any) => void, layoutId: string }> = ({ currentFilter, onFilterChange, layoutId }) => (
    <LayoutGroup id={layoutId}>
        <div className="flex flex-wrap items-center bg-muted p-1 rounded-lg">
            {(['all', 'Present', 'Absent', 'Missed', 'Not Available'] as const).map(filter => {
                const isActive = currentFilter === filter;
                return (
                    <Button key={filter} size="sm" variant="ghost" className="relative text-xs sm:text-sm" onClick={() => onFilterChange(filter)}>
                        {isActive && (
                            <motion.div
                                layoutId={`${layoutId}-highlight`}
                                className="absolute inset-0 bg-background rounded-md shadow-sm"
                                transition={transition}
                            />
                        )}
                        <span className="relative z-10">{filter === 'all' ? 'All' : filter === 'Not Available' ? 'N/A' : filter}</span>
                    </Button>
                );
            })}
        </div>
    </LayoutGroup>
);

const EmptyState: FC<{ filter: string }> = ({ filter }) => (
    <motion.div className="col-span-full flex flex-col items-center justify-center text-center p-10 bg-muted/50 rounded-lg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-semibold">No Members Found</h3>
        <p className="text-muted-foreground">There are no team members in the "{filter}" category.</p>
    </motion.div>
);

const SummaryStat: FC<{ label: string, value: number, icon: React.ElementType }> = ({ label, value, icon: Icon }) => (
    <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs font-medium text-muted-foreground -mt-1">{label}</p>
        </div>
    </div>
);

interface EndedViewLayoutProps {
    learningHour: any;
    savedAttendance: any;
    employees: any[];
    finalFilter: any;
    setFinalFilter: (filter: any) => void;
    finalFilteredEmployees: any[];
}

const EndedViewLayout = ({ learningHour, savedAttendance, employees, finalFilter, setFinalFilter, finalFilteredEmployees }: EndedViewLayoutProps) => {
    const summaryStats = {
        Present: Object.values(savedAttendance).filter((a: any) => a.status === "Present").length,
        Absent: Object.values(savedAttendance).filter((a: any) => a.status === "Absent").length,
        Missed: Object.values(savedAttendance).filter((a: any) => a.status === "Missed").length,
        'Not Available': Object.values(savedAttendance).filter((a: any) => a.status === "Not Available").length,
    };

    const SessionCompletedCard = (
        <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><CheckCircle2 className="w-6 h-6" /></div>
                <div>
                    <CardTitle className="text-lg font-bold">Session Completed</CardTitle>
                    <CardDescription>{`Concluded at ${learningHour.endedAt ? format(learningHour.endedAt.toDate(), "p") : "N/A"}`}</CardDescription>
                </div>
            </CardHeader>
            {learningHour.startedAt && learningHour.endedAt && (
                <CardContent className="border-t pt-4">
                    <p className="text-xs text-muted-foreground">TOTAL DURATION</p>
                    <p className="text-xl font-semibold">{formatDistanceStrict(learningHour.endedAt.toDate(), learningHour.startedAt.toDate())}</p>
                </CardContent>
            )}
        </Card>
    );

    return (
        <motion.div key="summary-admin" className="w-full" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Right Column: Summary (appears first on mobile) */}
                <div className="w-full lg:w-1/3 lg:order-2 space-y-6 lg:sticky lg:top-24">
                    {SessionCompletedCard}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Final Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <SummaryStat icon={Check} label="Present" value={summaryStats.Present} />
                            <SummaryStat icon={UserMinus} label="Absent" value={summaryStats.Absent} />
                            <SummaryStat icon={UserX} label="Missed" value={summaryStats.Missed} />
                            <SummaryStat icon={AlertTriangle} label="N/A" value={summaryStats['Not Available']} />
                        </CardContent>
                    </Card>
                </div>

                {/* Left Column: Roster (appears second on mobile) */}
                <div className="w-full lg:w-2/3 lg:order-1 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Final Roster</h2>
                            <p className="text-sm text-muted-foreground">Showing {finalFilteredEmployees.length} of {employees.length} members.</p>
                        </div>
                        <FilterControls currentFilter={finalFilter} onFilterChange={setFinalFilter} layoutId="admin-final-filter" />
                    </div>
                    <motion.div
                        key={finalFilter}
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {finalFilteredEmployees.length > 0 ? (
                            finalFilteredEmployees.map((emp: any) => (
                                <motion.div key={emp.id} variants={itemVariants}>
                                    <AttendanceCard
                                        employee={emp}
                                        status={savedAttendance[emp.id]?.status || "Missed"}
                                        reason={savedAttendance[emp.id]?.reason}
                                        onSetStatus={() => { }}
                                        onMarkUnavailable={() => { }}
                                        isInteractive={false}
                                    />
                                </motion.div>
                            ))
                        ) : (
                            <EmptyState filter={finalFilter} />
                        )}
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};


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
    const [isSyncing, setIsSyncing] = useState(false);
    const [isEndingSession, setIsEndingSession] = useState(false);

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
        setIsEndingSession(true);
        endSession(); // Immediately stop the timer on the client-side

        const functions = getFunctions();
        const endSessionFunction = httpsCallable(functions, 'endLearningSessionAndLockPoints');

        try {
            await endSessionFunction({ sessionId: todayDocId });
            await saveAttendance();
            await fetchInitialData(); // Force a refresh of the attendance data
            toast({ title: "Success", description: "Session ended and points have been locked." });
        } catch (error: any) {
            console.error("Error ending session:", error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsEndingSession(false);
        }
    };

    const [isRescheduling, setIsRescheduling] = useState(false);

    const handleAddPoint = (data: any) => {
        addLearningPoint(data);
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
            const isSessionEnded = learningHour?.status === 'ended';
            return (
                <motion.div key="user-view" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                    <SessionStatusBanner learningHour={learningHour} />

                    <div className="flex flex-col lg:flex-row gap-8 items-start mt-8">
                        <div className="w-full lg:flex-1">
                            <LearningPointsList
                                points={learningPoints}
                                isLoading={isLoadingPoints}
                                onAddPoint={handleAddPoint}
                                onUpdatePoint={updateLearningPoint}
                                onDeletePoint={deleteLearningPoint}
                                isDayLocked={isSessionEnded}
                            />
                        </div>

                        <AnimatePresence>
                            {isSessionEnded && (
                                <motion.div
                                    className="w-full lg:w-1/3 lg:sticky lg:top-24 space-y-6"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Final Roster</CardTitle>
                                            <CardDescription>
                                                Showing {finalFilteredEmployees.length} of {employees.length} members.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <FilterControls currentFilter={finalFilter} onFilterChange={setFinalFilter} layoutId="user-final-filter" />
                                            <motion.div
                                                key={finalFilter}
                                                className="space-y-4 mt-4 max-h-96 overflow-y-auto pr-2"
                                                variants={containerVariants}
                                                initial="hidden"
                                                animate="visible"
                                            >
                                                {finalFilteredEmployees.length > 0 ? (
                                                    finalFilteredEmployees.map((emp) => (
                                                        <motion.div key={emp.id} variants={itemVariants}>
                                                            <AttendanceCard employee={emp} status={savedAttendance[emp.id]?.status || 'Missed'} reason={savedAttendance[emp.id]?.reason} onSetStatus={() => { }} onMarkUnavailable={() => { }} isInteractive={false} />
                                                        </motion.div>
                                                    ))
                                                ) : (
                                                    <EmptyState filter={finalFilter} />
                                                )}
                                            </motion.div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
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
                    <Card className="text-center p-8 max-w-lg mx-auto rounded-xl border-gray-200">
                        <CardHeader className="mb-4">
                            <div className="mx-auto bg-gray-100 text-black rounded-full h-16 w-16 flex items-center justify-center mb-4">
                                <BrainCircuit className="h-8 w-8" />
                            </div>
                            <CardTitle className="text-3xl font-extrabold text-gray-900">Learning Session</CardTitle>
                            <CardDescription className="text-gray-600 text-md mt-2">
                                Scheduled for <span className="font-semibold text-black">{format(learningHour.scheduledTime.toDate(), 'p')}</span> today.
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
                            <Button size="lg" onClick={handleStartSession} disabled={isUpdating} className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3 text-lg">
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
                            <Button size="lg" variant="destructive" onClick={handleEndSession} disabled={isUpdating || isEndingSession}>
                                {isUpdating || isEndingSession ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <StopCircle className="mr-2 h-5 w-5" />}
                                {isUpdating || isEndingSession ? 'Ending...' : 'End & Save'}
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
                            <FilterControls currentFilter={activeFilter} onFilterChange={setActiveFilter} layoutId="active-filter" />
                        </div>
                        <motion.div key={activeFilter} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" variants={containerVariants} initial="hidden" animate="visible">
                            {activeFilteredEmployees.length > 0 ? (
                                activeFilteredEmployees.map((emp) => (
                                    <motion.div key={emp.id} variants={itemVariants}>
                                        <AttendanceCard employee={emp} status={tempAttendance[emp.id] || 'Missed'} reason={absenceReasons[emp.id]} onSetStatus={(id, status) => setTempAttendance(p => ({ ...p, [id]: status }))} onMarkUnavailable={setEditingAbsence} isInteractive={true} />
                                    </motion.div>
                                ))
                            ) : (
                                <EmptyState filter={activeFilter} />
                            )}
                        </motion.div>
                    </div>
                </motion.div>
            );
        }

        if (learningHour.status === "ended") {
            const alreadySynced = !!learningHour.synced;

            const handleSync = async () => {
                setIsSyncing(true);
                try {
                    const res = await syncLearningPointsToSheet(todayDocId);
                    toast({ title: "Sync complete", description: `${res.appended} rows appended.` });
                    // force-refresh session doc to get synced:true
                    await fetchInitialData();
                } catch (e: any) {
                    console.error(e);
                    toast({ title: "Sync failed", description: e.message, variant: "destructive" });
                } finally {
                    setIsSyncing(false);
                }
            };

            return (
                <>
                    {/* SYNC BUTTON */}
                    <div className="mb-6">
                        <Button
                            onClick={handleSync}
                            disabled={alreadySynced || isSyncing}
                        >
                            {isSyncing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {alreadySynced ? "Synced" : "Sync to Learning Hours Sheet"}
                        </Button>
                    </div>

                    {/* existing ended-view layout */}
                    <EndedViewLayout
                        learningHour={learningHour}
                        savedAttendance={savedAttendance}
                        employees={employees}
                        finalFilter={finalFilter}
                        setFinalFilter={setFinalFilter}
                        finalFilteredEmployees={finalFilteredEmployees}
                    />
                </>
            );
        }

        return null;
    };

    return (
        <>
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Learning Hours</h1>
                <p className="text-muted-foreground">Manage and view daily learning sessions.</p>
            </div>
            <AnimatePresence mode="wait">
                {renderContent()}
            </AnimatePresence>
            <AbsenceReasonModal isOpen={!!editingAbsence} employee={editingAbsence} onClose={() => setEditingAbsence(null)} onSave={saveAbsenceReason} />
        </>
    );
}
