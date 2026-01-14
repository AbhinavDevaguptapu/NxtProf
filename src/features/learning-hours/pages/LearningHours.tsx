import { AnimatePresence, motion, Variants, LayoutGroup } from "framer-motion";
import { getFunctions, httpsCallable } from "firebase/functions";
import { format, formatDistanceStrict } from "date-fns";
import React, { useState, useEffect, FC } from "react";

// Auth Hooks
import { useUserAuth } from "@/context/UserAuthContext";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  PlayCircle,
  StopCircle,
  CheckCircle2,
  AlertTriangle,
  BrainCircuit,
  Users,
  UserMinus,
  UserX,
  Check,
  Search,
  CalendarClock,
  Timer,
  LayoutGrid,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton"; // Assuming this exists, if not I'll fallback

// Feature Components & Hooks
import { useLearningHourSession } from "@/features/learning-hours/hooks/useLearningHourSession";
import { useLearningHourAttendance } from "@/features/learning-hours/hooks/useLearningHourAttendance";
import { useLearningPoints } from "@/features/learning-hours/hooks/useLearningPoints";
import { ScheduleLearningHourForm } from "@/features/learning-hours/components/ScheduleLearningHourForm";
import { AttendanceCard } from "@/features/learning-hours/components/AttendanceCard";
import { formatErrorForDisplay } from "@/lib/errorHandler";
import { SessionStatistics } from "@/features/learning-hours/components/SessionStatistics";
import { AbsenceReasonModal } from "@/features/learning-hours/components/AbsenceReasonModal"; // Ensure you have this
import { LearningPointsList } from "@/features/learning-hours/components/LearningPointsList";
import { SessionStatusBanner } from "@/features/learning-hours/components/SessionStatusBanner";
import { syncLearningPointsToSheet } from "@/features/learning-hours/services/syncService";
import type { AttendanceStatus } from "@/features/learning-hours/types";
import { cn } from "@/lib/utils";

// --- ANIMATION VARIANTS ---
const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.3, ease: "easeIn" },
  },
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

// --- HELPER COMPONENTS ---

const PageHeader = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Learning Hours
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage daily team learning sessions and points.
        </p>
      </div>
      <div className="flex items-center gap-3 bg-muted/50 p-2 rounded-xl border border-border/50">
        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-foreground">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div className="pr-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
            {format(currentTime, "EEEE, MMMM do")}
          </p>
          <p className="text-sm font-bold tabular-nums">
            {format(currentTime, "h:mm a")}
          </p>
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded-md" />
        <div className="h-4 w-64 bg-muted rounded-md" />
      </div>
      <div className="h-12 w-40 bg-muted rounded-lg" />
    </div>
    <div className="h-40 w-full bg-muted rounded-xl" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-24 bg-muted rounded-xl" />
      ))}
    </div>
  </div>
);

export const FilterControls: FC<{
  currentFilter: string;
  onFilterChange: (filter: any) => void;
  layoutId: string;
}> = ({ currentFilter, onFilterChange, layoutId }) => (
  <LayoutGroup id={layoutId}>
    <div className="inline-flex flex-wrap items-center bg-muted/50 p-1.5 rounded-xl border border-border/50 overflow-hidden">
      {(["all", "Present", "Absent", "Missed", "Not Available"] as const).map(
        (filter) => {
          const isActive = currentFilter === filter;
          return (
            <Button
              key={filter}
              size="sm"
              variant="ghost"
              className={cn(
                "relative text-xs font-medium px-3 h-8 transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onFilterChange(filter)}
            >
              {isActive && (
                <motion.div
                  layoutId={`${layoutId}-highlight`}
                  className="absolute inset-0 bg-background rounded-lg shadow-sm border border-border/50"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                {filter === "all"
                  ? "All Users"
                  : filter === "Not Available"
                  ? "N/A"
                  : filter}
              </span>
            </Button>
          );
        }
      )}
    </div>
  </LayoutGroup>
);

const SummaryStat: FC<{
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass?: string;
}> = ({ label, value, icon: Icon, colorClass = "text-muted-foreground" }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
    <div className={cn("p-2 rounded-md bg-background shadow-sm", colorClass)}>
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">
        {label}
      </p>
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
  finalSearchQuery: string;
  setFinalSearchQuery: (query: string) => void;
}

const EndedViewLayout = ({
  learningHour,
  savedAttendance,
  employees,
  finalFilter,
  setFinalFilter,
  finalFilteredEmployees,
  finalSearchQuery,
  setFinalSearchQuery,
}: EndedViewLayoutProps) => {
  const activeEmployees = employees.filter((emp: any) => !emp.archived);
  const activeEmployeeIds = new Set(activeEmployees.map((emp: any) => emp.id));

  const summaryStats = {
    Present: Object.values(savedAttendance).filter(
      (a: any) => a.status === "Present" && activeEmployeeIds.has(a.employee_id)
    ).length,
    Absent: Object.values(savedAttendance).filter(
      (a: any) => a.status === "Absent" && activeEmployeeIds.has(a.employee_id)
    ).length,
    Missed: Object.values(savedAttendance).filter(
      (a: any) => a.status === "Missed" && activeEmployeeIds.has(a.employee_id)
    ).length,
    "Not Available": Object.values(savedAttendance).filter(
      (a: any) =>
        a.status === "Not Available" && activeEmployeeIds.has(a.employee_id)
    ).length,
  };

  return (
    <motion.div
      key="summary-admin"
      className="w-full space-y-8"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Statistics Column */}
        <div className="w-full lg:col-span-1 space-y-6 lg:sticky lg:top-8">
          <Card className="overflow-hidden border-green-200 dark:border-green-900 bg-gradient-to-br from-white to-green-50 dark:from-background dark:to-green-950/20 shadow-md">
            <CardHeader className="pb-4">
              <div className="h-12 w-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center mb-2 shadow-sm dark:bg-green-900/40 dark:text-green-300">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <CardTitle className="text-lg">Session Completed</CardTitle>
              <CardDescription>
                Concluded at{" "}
                <span className="font-medium text-foreground">
                  {learningHour.endedAt
                    ? format(learningHour.endedAt.toDate(), "p")
                    : "N/A"}
                </span>
              </CardDescription>
            </CardHeader>
            {learningHour.startedAt && learningHour.endedAt && (
              <CardContent className="pt-0 pb-6">
                <div className="flex items-center gap-2 p-3 bg-white/60 dark:bg-black/20 rounded-lg border border-green-100 dark:border-green-900/50 backdrop-blur-sm">
                  <Timer className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Duration
                  </span>
                  <span className="ml-auto font-bold text-green-700 dark:text-green-400">
                    {formatDistanceStrict(
                      learningHour.endedAt.toDate(),
                      learningHour.startedAt.toDate()
                    )}
                  </span>
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 pt-4">
              <SummaryStat
                icon={Check}
                label="Present"
                value={summaryStats.Present}
                colorClass="text-green-600 bg-green-50 dark:bg-green-900/20"
              />
              <SummaryStat
                icon={UserMinus}
                label="Absent"
                value={summaryStats.Absent}
                colorClass="text-red-600 bg-red-50 dark:bg-red-900/20"
              />
              <SummaryStat
                icon={UserX}
                label="Missed"
                value={summaryStats.Missed}
                colorClass="text-amber-600 bg-amber-50 dark:bg-amber-900/20"
              />
              <SummaryStat
                icon={AlertTriangle}
                label="N/A"
                value={summaryStats["Not Available"]}
                colorClass="text-muted-foreground"
              />
            </CardContent>
          </Card>
        </div>

        {/* Roster Column */}
        <div className="w-full lg:col-span-2 space-y-4">
          <Card className="border-none shadow-none bg-transparent">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Final Roster
                </h2>
                <p className="text-sm text-muted-foreground">
                  Showing {finalFilteredEmployees.length} of {employees.length}{" "}
                  members.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search roster..."
                    value={finalSearchQuery}
                    onChange={(e) => setFinalSearchQuery(e.target.value)}
                    className="pl-9 bg-background"
                  />
                </div>
                <FilterControls
                  currentFilter={finalFilter}
                  onFilterChange={setFinalFilter}
                  layoutId="admin-final-filter"
                />
              </div>
            </div>

            <motion.div
              key={finalFilter + finalSearchQuery}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
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
                      onSetStatus={() => {}}
                      onMarkUnavailable={() => {}}
                      isInteractive={false}
                    />
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center bg-muted/30 rounded-xl border border-dashed border-muted-foreground/20">
                  <p className="text-muted-foreground">
                    No members found matching your filters.
                  </p>
                </div>
              )}
            </motion.div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function LearningHours() {
  const { user, isAdmin, isCoAdmin } = useUserAuth();
  const { toast } = useToast();

  const {
    learningHour,
    isLoading,
    isUpdating,
    sessionTime,
    todayDocId,
    startSession,
  } = useLearningHourSession();

  const [activeFilter, setActiveFilter] = useState<AttendanceStatus | "all">(
    "all"
  );

  const {
    employees,
    tempAttendance,
    handleSetTempAttendance,
    savedAttendance,
    editingAbsence,
    setEditingAbsence,
    absenceReasons, // Ensure this hook provides this
    saveAbsenceReason, // Ensure this hook provides this
    saveAttendance,
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
  } = useLearningHourAttendance(learningHour, todayDocId, activeFilter);

  const {
    learningPoints,
    isLoading: isLoadingPoints,
    addLearningPoint,
    updateLearningPoint,
    deleteLearningPoint,
  } = useLearningPoints(todayDocId);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [showStartConfirmation, setShowStartConfirmation] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // --- HANDLERS (Preserved) ---
  const handleStartSession = async () => {
    setShowStartConfirmation(true);
  };

  const confirmStartSession = async () => {
    setShowStartConfirmation(false);

    if (learningHour?.scheduledTime) {
      const now = new Date();
      const scheduled = learningHour.scheduledTime.toDate();
      const remainingMinutes = Math.max(
        0,
        Math.ceil((scheduled.getTime() - now.getTime()) / (1000 * 60))
      );

      toast({
        title: `Session Starting`,
        description: `Session will start in ${remainingMinutes} minute(s).`,
      });

      // Simple wait simulation for UX
      setTimeout(async () => {
        await startSession();
        fetchInitialData();
      }, 1500);
    } else {
      await startSession();
      fetchInitialData();
    }
  };

  const cancelStartSession = () => {
    setShowStartConfirmation(false);
  };

  const handleEndSession = async () => {
    setIsEndingSession(true);
    const functions = getFunctions();
    const endSessionFunction = httpsCallable(
      functions,
      "endLearningSessionAndLockPoints"
    );

    try {
      await saveAttendance(); // Auto-save before end
      await endSessionFunction({ sessionId: todayDocId });
      toast({
        title: "Session Ended",
        description: "Learning session ended and points have been locked.",
      });
    } catch (error: any) {
      console.error("Error ending session:", error);
      const { title, description } = formatErrorForDisplay(
        error,
        "Unable to End Session",
        "ending"
      );
      toast({ title, description, variant: "destructive" });
    } finally {
      setIsEndingSession(false);
    }
  };

  const handleAddPoint = (data: any) => {
    addLearningPoint(data);
  };

  // --- SUB-RENDERERS ---

  const renderAdminContent = () => {
    if (!learningHour || isRescheduling) {
      return (
        <motion.div
          key="schedule"
          variants={pageVariants}
          className="flex justify-center pt-8"
        >
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
        <motion.div
          key="scheduled"
          variants={pageVariants}
          className="flex justify-center pt-8"
        >
          <Card className="w-full max-w-lg border-border/60 shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-transparent pointer-events-none" />
            <CardHeader className="text-center pb-2 relative z-10">
              <div className="mx-auto bg-secondary text-foreground rounded-2xl h-16 w-16 flex items-center justify-center mb-4 ring-4 ring-background shadow-sm">
                <BrainCircuit className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Learning Session Scheduled
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Set for{" "}
                <span className="font-bold text-foreground">
                  {format(learningHour.scheduledTime.toDate(), "p")}
                </span>{" "}
                today.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-6 relative z-10">
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Date
                  </span>
                  <p className="font-medium">
                    {format(learningHour.scheduledTime.toDate(), "MMM dd")}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Time
                  </span>
                  <p className="font-medium">
                    {format(learningHour.scheduledTime.toDate(), "h:mm a")}
                  </p>
                </div>
              </div>

              <AlertDialog
                open={showStartConfirmation}
                onOpenChange={setShowStartConfirmation}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    size="lg"
                    onClick={handleStartSession}
                    disabled={isUpdating}
                    className="w-full shadow-md transition-all hover:shadow-lg"
                  >
                    {isUpdating ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <PlayCircle className="mr-2 h-5 w-5" />
                    )}
                    {isUpdating ? "Starting..." : "Start Session Now"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Start Learning Session</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will begin the session for all team members
                      immediately.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={cancelStartSession}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={confirmStartSession}
                      className="text-white"
                    >
                      Start Session
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="outline"
                onClick={() => setIsRescheduling(true)}
                className="w-full border-border/50"
              >
                Reschedule or Edit
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      );
    }

    if (learningHour.status === "active") {
      return (
        <motion.div
          key="active-admin"
          className="w-full space-y-6"
          variants={pageVariants}
        >
          {/* Active Header Card */}
          <div className="rounded-xl border border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-25" />
                <div className="relative h-12 w-12 bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300 rounded-full flex items-center justify-center border-2 border-background">
                  <PlayCircle className="h-6 w-6" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-green-900 dark:text-green-100">
                  Session in Progress
                </h2>
                <p className="text-green-700/80 dark:text-green-300/80 text-sm">
                  Manage attendance and oversee the learning session.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 w-full md:w-auto bg-background/50 p-3 rounded-lg border border-green-100 dark:border-green-900/30">
              <div className="text-center px-2">
                <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider block">
                  Duration
                </span>
                <span className="text-2xl font-mono font-bold tracking-tight">
                  {sessionTime}
                </span>
              </div>
              <div className="h-8 w-px bg-border" />
              <Button
                variant="destructive"
                onClick={handleEndSession}
                disabled={isUpdating || isEndingSession}
                className="h-10 px-6 shadow-sm hover:shadow-md transition-all"
              >
                {isUpdating || isEndingSession ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <StopCircle className="mr-2 h-4 w-4" />
                )}
                End Session
              </Button>
            </div>
          </div>

          <SessionStatistics stats={sessionStats} />

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4 border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg">Live Attendance</CardTitle>
                  <CardDescription>
                    Mark attendance for active members.
                  </CardDescription>
                </div>

                <div className="flex gap-2">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      value={activeSearchQuery}
                      onChange={(e) => setActiveSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  {/* Mobile filter could go here */}
                </div>
              </div>
              <div className="pt-2">
                <FilterControls
                  currentFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  layoutId="active-filter"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <motion.div
                key={activeFilter + activeSearchQuery}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {activeFilteredEmployees.length > 0 ? (
                  activeFilteredEmployees.map((emp) => (
                    <motion.div key={emp.id} variants={itemVariants}>
                      <AttendanceCard
                        employee={emp}
                        status={tempAttendance[emp.id] || "Missed"}
                        reason={absenceReasons[emp.id]}
                        onSetStatus={handleSetTempAttendance}
                        onMarkUnavailable={setEditingAbsence}
                        isInteractive={true}
                      />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center text-muted-foreground">
                    No members found.
                  </div>
                )}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      );
    }

    if (learningHour.status === "ended") {
      const alreadySynced = !!learningHour.synced;

      const handleSync = async () => {
        setIsSyncing(true);
        try {
          const res = await syncLearningPointsToSheet(todayDocId);
          toast({
            title: "Sync complete",
            description: `${res.appended} rows appended.`,
          });
          await fetchInitialData();
        } catch (e: any) {
          console.error(e);
          toast({
            title: "Sync failed",
            description: e.message || "Failed to sync",
            variant: "destructive",
          });
        } finally {
          setIsSyncing(false);
        }
      };

      return (
        <motion.div variants={pageVariants} className="space-y-6">
          <div className="flex justify-end">
            <Button
              onClick={handleSync}
              disabled={alreadySynced || isSyncing}
              variant={alreadySynced ? "outline" : "default"}
              className={cn(
                alreadySynced
                  ? "border-green-200 text-green-700 bg-green-50"
                  : ""
              )}
            >
              {isSyncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {alreadySynced ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Synced to Sheets
                </>
              ) : (
                "Sync to Learning Hours Sheet"
              )}
            </Button>
          </div>

          <EndedViewLayout
            learningHour={learningHour}
            savedAttendance={savedAttendance}
            employees={employees}
            finalFilter={finalFilter}
            setFinalFilter={setFinalFilter}
            finalFilteredEmployees={finalFilteredEmployees}
            finalSearchQuery={finalSearchQuery}
            setFinalSearchQuery={setFinalSearchQuery}
          />
        </motion.div>
      );
    }

    return null;
  };

  // Render User View - This is mostly static content + logic
  const renderUserContent = () => {
    const isSessionEnded = learningHour?.status === "ended";

    return (
      <motion.div key="user-view" variants={pageVariants} className="space-y-8">
        <SessionStatusBanner learningHour={learningHour} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div
            className={cn("lg:col-span-12", isSessionEnded && "lg:col-span-8")}
          >
            <LearningPointsList
              points={learningPoints}
              isLoading={isLoadingPoints}
              onAddPoint={handleAddPoint}
              onUpdatePoint={updateLearningPoint}
              onDeletePoint={deleteLearningPoint}
              isDayLocked={isSessionEnded}
            />
          </div>

          {isSessionEnded && (
            <div className="hidden lg:block lg:col-span-4 sticky top-8">
              <Card className="border-border/60 shadow-sm">
                <CardHeader className="bg-muted/30 pb-3">
                  <CardTitle className="text-base">Team Attendance</CardTitle>
                  <CardDescription>
                    Today's roster availability.
                  </CardDescription>
                </CardHeader>
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      className="pl-8 h-9 text-xs"
                      value={finalSearchQuery}
                      onChange={(e) => setFinalSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                  <div className="divide-y">
                    {finalFilteredEmployees.map((emp: any) => {
                      const status =
                        savedAttendance[emp.id]?.status || "Missed";
                      const color =
                        status === "Present"
                          ? "text-green-600"
                          : status === "Absent"
                          ? "text-red-600"
                          : "text-muted-foreground";
                      return (
                        <div
                          key={emp.id}
                          className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-sm"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                              {emp.name.charAt(0)}
                            </div>
                            <span className="truncate font-medium">
                              {emp.name}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] h-5", color)}
                          >
                            {status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl py-10 px-4 space-y-8">
        <PageHeader />
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl py-10 px-4 min-h-screen">
      <PageHeader />

      <AnimatePresence mode="wait" initial={false}>
        {isAdmin || isCoAdmin ? (
          <motion.div
            key="admin-root"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderAdminContent()}
          </motion.div>
        ) : (
          <motion.div
            key="user-root"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderUserContent()}
          </motion.div>
        )}
      </AnimatePresence>

      <AbsenceReasonModal
        employee={editingAbsence}
        isOpen={!!editingAbsence}
        onClose={() => setEditingAbsence(null)}
        onSave={(id, reason) => {
          saveAbsenceReason(id, reason);
          setEditingAbsence(null);
        }}
      />
    </div>
  );
}
