import { AnimatePresence, motion, easeInOut } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useStandup } from "../hooks/useStandup";
import { AbsenceReasonModal } from "../components/AbsenceReasonModal";
import { StandupNotScheduledView } from "../views/StandupNotScheduledView";
import { StandupScheduledView } from "../views/StandupScheduledView";
import { StandupActiveAdminView } from "../views/StandupActiveAdminView";
import { StandupSummaryView } from "../views/StandupSummaryView";

const pageAnimationProps = {
  variants: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeInOut } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: easeInOut } },
  },
  initial: "initial",
  animate: "animate",
  exit: "exit",
};

export default function StandupsPage() {
  const {
    user,
    admin,
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

  const renderContent = () => {
    if (isLoadingPage) {
      return (
        <motion.div key="loading" className="flex-grow flex flex-col items-center justify-center" {...pageAnimationProps}>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading standup...</p>
        </motion.div>
      );
    }

    if (!standup) {
      return (
        <StandupNotScheduledView />
      );
    }

    switch (standup.status) {
      case "scheduled":
        return (
          <StandupScheduledView
            standup={standup}
          />
        );
      case "active":
        if (admin) {
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
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Standups</h1>
        <p className="text-muted-foreground">Manage and view daily standup sessions.</p>
      </div>
      <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
      <AbsenceReasonModal
        isOpen={!!editingAbsence}
        employee={editingAbsence}
        onClose={() => setEditingAbsence(null)}
        onSave={handleSaveAbsenceReason}
      />
    </>
  );
}
