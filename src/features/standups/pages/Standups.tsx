import { AnimatePresence, motion, easeInOut } from "framer-motion";
import { Loader2, Users, Calendar, Clock } from "lucide-react";
import { useStandup } from "../hooks/useStandup";
import { AbsenceReasonModal } from "../components/AbsenceReasonModal";
import { StandupNotScheduledView } from "../views/StandupNotScheduledView";
import { StandupScheduledView } from "../views/StandupScheduledView";
import { StandupActiveAdminView } from "../views/StandupActiveAdminView";
import { StandupSummaryView } from "../views/StandupSummaryView";

// [LOGIC PRESERVED] - Animation variants unchanged
const pageAnimationProps = {
  variants: {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: easeInOut },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: { duration: 0.3, ease: easeInOut },
    },
  },
  initial: "initial",
  animate: "animate",
  exit: "exit",
};

// --- Loading Skeleton ---
const LoadingSkeleton = () => (
  <motion.div
    key="loading"
    className="flex-grow flex flex-col items-center justify-center py-20"
    {...pageAnimationProps}
  >
    <div className="relative">
      {/* Pulsing background ring */}
      <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
      <div className="relative h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center">
        <Loader2
          className="h-10 w-10 animate-spin text-primary"
          aria-hidden="true"
        />
      </div>
    </div>
    <p className="mt-6 text-muted-foreground font-medium">Loading standup...</p>
    <p className="text-sm text-muted-foreground/60 mt-1">
      Fetching session data...
    </p>
  </motion.div>
);

// --- Page Header Component ---
const PageHeader = () => {
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-8"
    >
      {/* Breadcrumb / Context */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Calendar className="h-4 w-4" aria-hidden="true" />
        <span>{formattedDate}</span>
      </div>

      {/* Main Title */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 hidden sm:flex">
              <Users className="h-7 w-7 text-primary" aria-hidden="true" />
            </div>
            Daily Standups
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and view daily standup sessions for your team.
          </p>
        </div>

        {/* Time Indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
          <Clock className="h-4 w-4" aria-hidden="true" />
          <span>
            {today.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </motion.header>
  );
};

// --- Main Page Component ---
export default function StandupsPage() {
  // [LOGIC PRESERVED] - All hook usage and state management unchanged
  const {
    isAdmin,
    isCoAdmin,
    isLoadingPage,
    standup,
    isUpdatingStatus,
    employees,
    tempAttendance,
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
    handleStopStandup,
    handleSaveAbsenceReason,
    activeFilteredEmployees,
    finalFilteredEmployees,
    sessionStats,
    handleBeginMarkUnavailable,
    handleSetTempAttendance,
  } = useStandup();

  // [LOGIC PRESERVED] - Render logic unchanged
  const renderContent = () => {
    if (isLoadingPage) {
      return <LoadingSkeleton />;
    }

    if (!standup) {
      return <StandupNotScheduledView />;
    }

    switch (standup.status) {
      case "scheduled":
        return <StandupScheduledView standup={standup} />;
      case "active":
        if (isAdmin || isCoAdmin) {
          return (
            <StandupActiveAdminView
              standup={standup}
              sessionTime={sessionTime}
              isUpdatingStatus={isUpdatingStatus}
              onStop={handleStopStandup}
              sessionStats={sessionStats}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              activeSearchQuery={activeSearchQuery}
              setActiveSearchQuery={setActiveSearchQuery}
              activeFilteredEmployees={activeFilteredEmployees}
              tempAttendance={tempAttendance}
              absenceReasons={absenceReasons}
              onSetTempAttendance={handleSetTempAttendance}
              onMarkUnavailable={handleBeginMarkUnavailable}
            />
          );
        }
        return (
          <StandupSummaryView
            standup={standup}
            savedAttendance={savedAttendance}
            employees={employees}
            finalFilter={finalFilter}
            setFinalFilter={setFinalFilter}
            finalFilteredEmployees={finalFilteredEmployees}
            finalSearchQuery={finalSearchQuery}
            setFinalSearchQuery={setFinalSearchQuery}
          />
        );
      case "ended":
        return (
          <StandupSummaryView
            standup={standup}
            savedAttendance={savedAttendance}
            employees={employees}
            finalFilter={finalFilter}
            setFinalFilter={setFinalFilter}
            finalFilteredEmployees={finalFilteredEmployees}
            finalSearchQuery={finalSearchQuery}
            setFinalSearchQuery={setFinalSearchQuery}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader />

      {/* Main Content Area */}
      <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>

      {/* [LOGIC PRESERVED] - Modal unchanged */}
      <AbsenceReasonModal
        isOpen={!!editingAbsence}
        employee={editingAbsence}
        onClose={() => setEditingAbsence(null)}
        onSave={handleSaveAbsenceReason}
      />
    </div>
  );
}
