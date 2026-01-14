"use client";

import { Input } from "@/components/ui/input";
import { format, formatDistanceStrict } from "date-fns";
import { motion, LayoutGroup, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Check,
  CheckCircle2,
  Users,
  UserX,
  UserMinus,
  AlertCircle,
  Search,
  Clock,
  Calendar,
  Timer,
} from "lucide-react";
import { AttendanceCard } from "../components/AttendanceCard";
import type {
  Standup,
  Employee,
  AttendanceRecord,
  AttendanceStatus,
} from "../types";
import { FC } from "react";
import { cn } from "@/lib/utils";

// --- Animation Variants ---
// [LOGIC PRESERVED] - Animation variants unchanged
const transition = { type: "spring" as const, stiffness: 400, damping: 30 };
const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition },
};
const pageVariants: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } },
};

// --- Main Component ---
// [LOGIC PRESERVED] - Props interface unchanged
interface StandupSummaryViewProps {
  standup: Standup;
  savedAttendance: Record<string, AttendanceRecord>;
  employees: Employee[];
  finalFilter: AttendanceStatus | "all";
  setFinalFilter: (filter: AttendanceStatus | "all") => void;
  finalFilteredEmployees: Employee[];
  finalSearchQuery: string;
  setFinalSearchQuery: (query: string) => void;
}

export const StandupSummaryView = (props: StandupSummaryViewProps) => (
  <motion.div
    key={props.standup.status}
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
  >
    {/* [LOGIC PRESERVED] - Conditional rendering unchanged */}
    {props.standup.status === "ended" ? (
      <EndedViewLayout {...props} />
    ) : (
      <ActiveViewLayout />
    )}
  </motion.div>
);

// --- State-Specific Layouts ---

const ActiveViewLayout = () => (
  <div className="flex flex-col items-center justify-center text-center min-h-[50vh] p-4">
    <div className="relative flex items-center justify-center h-28 w-28">
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-primary/20 rounded-full"
        aria-hidden="true"
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
        className="absolute inset-4 bg-primary/10 rounded-full"
        aria-hidden="true"
      />
      <div className="relative h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
        <Users className="h-8 w-8 text-primary" aria-hidden="true" />
      </div>
    </div>
    <h2 className="text-2xl font-bold mt-6">Standup is in Progress</h2>
    <p className="text-muted-foreground mt-2 max-w-md">
      The admin is currently taking attendance. Results will be displayed here
      as soon as the session is complete.
    </p>
    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <span>Live session</span>
    </div>
  </div>
);

const EndedViewLayout = ({
  standup,
  savedAttendance,
  employees,
  finalFilter,
  setFinalFilter,
  finalFilteredEmployees,
  finalSearchQuery,
  setFinalSearchQuery,
}: StandupSummaryViewProps) => {
  // [LOGIC PRESERVED] - All filtering and stats logic unchanged
  const activeEmployees = employees.filter((emp) => !emp.archived);
  const activeEmployeeIds = new Set(activeEmployees.map((emp) => emp.id));

  const summaryStats = {
    Present: Object.values(savedAttendance).filter(
      (a) => a.status === "Present" && activeEmployeeIds.has(a.employee_id)
    ).length,
    Absent: Object.values(savedAttendance).filter(
      (a) => a.status === "Absent" && activeEmployeeIds.has(a.employee_id)
    ).length,
    Missed: Object.values(savedAttendance).filter(
      (a) => a.status === "Missed" && activeEmployeeIds.has(a.employee_id)
    ).length,
    "Not Available": Object.values(savedAttendance).filter(
      (a) =>
        a.status === "Not Available" && activeEmployeeIds.has(a.employee_id)
    ).length,
    "Total Team": activeEmployees.length,
  };

  const attendanceRate =
    summaryStats["Total Team"] > 0
      ? Math.round((summaryStats.Present / summaryStats["Total Team"]) * 100)
      : 0;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* Right Column: Summary (appears first on mobile) */}
      <aside
        className="w-full lg:w-1/3 lg:order-2 space-y-6 lg:sticky lg:top-24"
        aria-label="Session summary"
      >
        {/* Completion Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-green-50 via-green-50/50 to-emerald-50/30 dark:from-green-950/30 dark:via-green-950/20 dark:to-emerald-950/10 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-200 dark:border-green-800/50">
                <CheckCircle2
                  className="w-7 h-7 text-green-600 dark:text-green-400"
                  aria-hidden="true"
                />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-foreground">
                  Standup Completed
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {standup.endedAt
                    ? `Concluded at ${format(standup.endedAt.toDate(), "p")}`
                    : "Session ended"}
                </CardDescription>
              </div>
            </div>
          </div>

          {standup.startedAt && standup.endedAt && (
            <CardContent className="p-6 border-t border-border/50">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <Timer
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {formatDistanceStrict(
                        standup.endedAt.toDate(),
                        standup.startedAt.toDate()
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <Users
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      {attendanceRate}%
                    </p>
                    <p className="text-xs text-muted-foreground">Attendance</p>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Summary Stats Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              Final Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <SummaryStat
              icon={Check}
              label="Present"
              value={summaryStats.Present}
              color="text-green-600 dark:text-green-400"
              bgColor="bg-green-500/10"
            />
            <SummaryStat
              icon={UserMinus}
              label="Absent"
              value={summaryStats.Absent}
              color="text-red-600 dark:text-red-400"
              bgColor="bg-red-500/10"
            />
            <SummaryStat
              icon={UserX}
              label="Missed"
              value={summaryStats.Missed}
              color="text-amber-600 dark:text-amber-400"
              bgColor="bg-amber-500/10"
            />
            <SummaryStat
              icon={AlertCircle}
              label="N/A"
              value={summaryStats["Not Available"]}
              color="text-muted-foreground"
              bgColor="bg-muted/50"
            />
          </CardContent>
        </Card>
      </aside>

      {/* Left Column: Roster (appears second on mobile) */}
      <main className="w-full lg:w-2/3 lg:order-1 space-y-6" role="main">
        <Card className="border shadow-sm">
          <CardHeader className="pb-4 border-b border-border/50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <Users
                    className="h-5 w-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  Final Roster
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Showing {finalFilteredEmployees.length} of {employees.length}{" "}
                  members.
                </p>
              </div>
              <div className="relative w-full md:w-64">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                {/* [LOGIC PRESERVED] - Search handler unchanged */}
                <Input
                  placeholder="Search by name or email..."
                  value={finalSearchQuery}
                  onChange={(e) => setFinalSearchQuery(e.target.value)}
                  className="pl-10"
                  aria-label="Search employees"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {/* [LOGIC PRESERVED] - Filter handler unchanged */}
            <FilterControls
              currentFilter={finalFilter}
              onFilterChange={setFinalFilter}
            />

            <motion.div
              key={finalFilter + finalSearchQuery}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {finalFilteredEmployees.length > 0 ? (
                finalFilteredEmployees.map((emp) => (
                  <motion.div key={emp.id} variants={itemVariants}>
                    {/* [LOGIC PRESERVED] - AttendanceCard props unchanged */}
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
                <EmptyState
                  filter={finalFilter}
                  searchQuery={finalSearchQuery}
                />
              )}
            </motion.div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

// --- Helper UI Components ---

const FilterControls: FC<{
  currentFilter: string;
  onFilterChange: (filter: any) => void;
}> = ({ currentFilter, onFilterChange }) => (
  <LayoutGroup id="filter-group">
    <div className="inline-flex flex-wrap items-center bg-muted p-1 rounded-lg">
      {(["all", "Present", "Absent", "Missed", "Not Available"] as const).map(
        (filter) => {
          const isActive = currentFilter === filter;
          return (
            <Button
              key={filter}
              size="sm"
              variant="ghost"
              className="relative text-xs sm:text-sm"
              onClick={() => onFilterChange(filter)}
            >
              {isActive && (
                <motion.div
                  layoutId="active-filter-highlight"
                  className="absolute inset-0 bg-background rounded-md shadow-sm border border-border"
                  transition={transition}
                />
              )}
              <span className="relative z-10">
                {filter === "all"
                  ? "All"
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

const EmptyState: FC<{ filter: string; searchQuery?: string }> = ({
  filter,
  searchQuery,
}) => (
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
    <h3 className="text-lg font-semibold text-foreground">No Members Found</h3>
    <p className="text-muted-foreground mt-1 max-w-sm">
      There are no team members in the &quot;{filter}&quot; category
      {searchQuery && ` matching "${searchQuery}"`}.
    </p>
  </motion.div>
);

const SummaryStat: FC<{
  label: string;
  value: number;
  icon: React.ElementType;
  color?: string;
  bgColor?: string;
}> = ({
  label,
  value,
  icon: Icon,
  color = "text-muted-foreground",
  bgColor = "bg-muted/50",
}) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
    <div className={cn("p-2 rounded-lg", bgColor)}>
      <Icon className={cn("h-4 w-4", color)} aria-hidden="true" />
    </div>
    <div>
      <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  </div>
);
