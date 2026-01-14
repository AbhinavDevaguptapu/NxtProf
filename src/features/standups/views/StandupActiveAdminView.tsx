import { Input } from "@/components/ui/input";
import { motion, Variants, LayoutGroup } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, StopCircle, Users, Search } from "lucide-react";
import { AttendanceCard } from "../components/AttendanceCard";
import { SessionStatistics } from "../components/SessionStatistics";
import type { Employee, AttendanceStatus, Standup } from "../types";
import { useEffect, useState } from "react";
import { differenceInSeconds } from "date-fns";
import { cn } from "@/lib/utils";

// [LOGIC PRESERVED] - Animation variants unchanged
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};
const pageAnimationProps: {
  variants: Variants;
  initial: string;
  animate: string;
  exit: string;
} = {
  variants: {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeInOut" },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: { duration: 0.3, ease: "easeInOut" },
    },
  },
  initial: "initial",
  animate: "animate",
  exit: "exit",
};

// [LOGIC PRESERVED] - Props interface unchanged
interface StandupActiveAdminViewProps {
  sessionTime: string;
  isUpdatingStatus: boolean;
  onStop: () => void;
  sessionStats: Record<string, number>;
  activeFilter: AttendanceStatus | "all";
  setActiveFilter: (filter: AttendanceStatus | "all") => void;
  activeSearchQuery: string;
  setActiveSearchQuery: (query: string) => void;
  activeFilteredEmployees: Employee[];
  tempAttendance: Record<string, AttendanceStatus>;
  absenceReasons: Record<string, string>;
  onSetTempAttendance: (employeeId: string, status: AttendanceStatus) => void;
  onMarkUnavailable: (employee: Employee) => void;
  standup: Standup;
}

// --- Timer Card Component ---
const TimerCard = ({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "warning";
}) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center p-4 rounded-xl border min-w-[100px]",
      variant === "warning"
        ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50"
        : "bg-muted/50 border-border/50"
    )}
  >
    <p
      className={cn(
        "text-2xl sm:text-3xl font-bold tabular-nums",
        variant === "warning"
          ? "text-red-600 dark:text-red-400"
          : "text-foreground"
      )}
    >
      {value}
    </p>
    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
      {label}
    </p>
  </div>
);

// --- Filter Button Component ---
const FilterButton = ({
  label,
  filterValue,
  currentFilter,
  onFilter,
}: {
  label: string;
  filterValue: AttendanceStatus | "all";
  currentFilter: AttendanceStatus | "all";
  onFilter: (filter: AttendanceStatus | "all") => void;
}) => {
  const isActive = currentFilter === filterValue;
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => onFilter(filterValue)}
      className="relative text-xs sm:text-sm"
    >
      {isActive && (
        <motion.div
          layoutId="active-admin-filter"
          className="absolute inset-0 bg-background rounded-md shadow-sm border border-border"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </Button>
  );
};

export const StandupActiveAdminView = ({
  sessionTime,
  isUpdatingStatus,
  onStop,
  sessionStats,
  activeFilter,
  setActiveFilter,
  activeSearchQuery,
  setActiveSearchQuery,
  activeFilteredEmployees,
  tempAttendance,
  absenceReasons,
  onSetTempAttendance,
  onMarkUnavailable,
  standup,
}: StandupActiveAdminViewProps) => {
  // [LOGIC PRESERVED] - Auto-close timer logic unchanged
  const [autoCloseTime, setAutoCloseTime] = useState("");

  useEffect(() => {
    if (standup?.scheduledTime) {
      const intervalId = setInterval(() => {
        const now = new Date();
        const scheduled = standup.scheduledTime.toDate();
        scheduled.setMinutes(scheduled.getMinutes() + 15);
        const diff = differenceInSeconds(scheduled, now);

        if (diff <= 0) {
          setAutoCloseTime("00:00");
          clearInterval(intervalId);
          return;
        }

        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        setAutoCloseTime(
          `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
            2,
            "0"
          )}`
        );
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [standup]);

  // [LOGIC PRESERVED] - Filtering logic unchanged
  const activeEmployees = activeFilteredEmployees.filter(
    (emp) => !emp.archived
  );

  const isAutoCloseWarning =
    autoCloseTime && parseInt(autoCloseTime.split(":")[0]) < 5;

  return (
    <motion.div
      key="active-admin"
      className="w-full mx-auto space-y-8"
      {...pageAnimationProps}
    >
      {/* Header Section */}
      <Card className="border-green-200 dark:border-green-800/50 bg-gradient-to-r from-green-50/50 via-green-50/30 to-transparent dark:from-green-950/30 dark:via-green-950/20 dark:to-transparent overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
            {/* Left: Status */}
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-200 dark:border-green-800/50">
                  <Users
                    className="h-6 w-6 text-green-600 dark:text-green-400"
                    aria-hidden="true"
                  />
                </div>
                {/* Live indicator */}
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </span>
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Standup in Progress
                </h2>
                <p className="text-muted-foreground mt-1">
                  Mark attendance for each team member below.
                </p>
              </div>
            </div>

            {/* Right: Timers & End Button */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-3 flex-1 lg:flex-initial">
                <TimerCard
                  label="Session"
                  value={sessionTime}
                  variant="default"
                />
                <TimerCard
                  label="Auto-close"
                  value={autoCloseTime || "--:--"}
                  variant={isAutoCloseWarning ? "warning" : "default"}
                />
              </div>
              {/* [LOGIC PRESERVED] - onStop handler unchanged */}
              <Button
                size="lg"
                variant="destructive"
                onClick={onStop}
                disabled={isUpdatingStatus}
                className="shadow-md hover:shadow-lg transition-shadow"
              >
                {isUpdatingStatus ? (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <StopCircle className="mr-2 h-5 w-5" aria-hidden="true" />
                )}
                End & Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <SessionStatistics stats={sessionStats} />

      {/* Attendance Roster Section */}
      <section aria-labelledby="roster-heading">
        <Card className="border shadow-sm">
          <CardHeader className="pb-4 border-b border-border/50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <CardTitle
                  id="roster-heading"
                  className="text-xl font-bold tracking-tight flex items-center gap-2"
                >
                  <Users
                    className="h-5 w-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  Attendance Roster
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Click a member&apos;s status to mark their attendance.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input */}
                <div className="relative w-full md:w-64">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {/* [LOGIC PRESERVED] - Search handler unchanged */}
                  <Input
                    placeholder="Search by name or email..."
                    value={activeSearchQuery}
                    onChange={(e) => setActiveSearchQuery(e.target.value)}
                    className="pl-10"
                    aria-label="Search employees"
                  />
                </div>

                {/* Filter Buttons */}
                <LayoutGroup id="admin-filter-group">
                  <div className="inline-flex flex-wrap items-center bg-muted p-1 rounded-lg">
                    {/* [LOGIC PRESERVED] - Filter handlers unchanged */}
                    <FilterButton
                      label="All"
                      filterValue="all"
                      currentFilter={activeFilter}
                      onFilter={setActiveFilter}
                    />
                    <FilterButton
                      label="Present"
                      filterValue="Present"
                      currentFilter={activeFilter}
                      onFilter={setActiveFilter}
                    />
                    <FilterButton
                      label="Absent"
                      filterValue="Absent"
                      currentFilter={activeFilter}
                      onFilter={setActiveFilter}
                    />
                    <FilterButton
                      label="Missed"
                      filterValue="Missed"
                      currentFilter={activeFilter}
                      onFilter={setActiveFilter}
                    />
                    <FilterButton
                      label="N/A"
                      filterValue="Not Available"
                      currentFilter={activeFilter}
                      onFilter={setActiveFilter}
                    />
                  </div>
                </LayoutGroup>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <motion.div
              key={activeFilter + activeSearchQuery}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {activeEmployees.length > 0 ? (
                activeEmployees.map((emp) => (
                  <motion.div key={emp.id} variants={itemVariants}>
                    {/* [LOGIC PRESERVED] - AttendanceCard handlers unchanged */}
                    <AttendanceCard
                      employee={emp}
                      status={tempAttendance[emp.id] || "Missed"}
                      reason={absenceReasons[emp.id]}
                      onSetStatus={onSetTempAttendance}
                      onMarkUnavailable={onMarkUnavailable}
                      isInteractive={true}
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  className="col-span-full flex flex-col items-center justify-center text-center py-16 px-6 bg-muted/30 rounded-xl border border-dashed border-border"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="p-4 rounded-full bg-muted/50 mb-4">
                    <Users
                      className="h-10 w-10 text-muted-foreground/50"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    No Members Found
                  </h3>
                  <p className="text-muted-foreground mt-1 max-w-sm">
                    There are no team members in the &quot;{activeFilter}&quot;
                    category
                    {activeSearchQuery && ` matching "${activeSearchQuery}"`}.
                  </p>
                </motion.div>
              )}
            </motion.div>
          </CardContent>
        </Card>
      </section>
    </motion.div>
  );
};
