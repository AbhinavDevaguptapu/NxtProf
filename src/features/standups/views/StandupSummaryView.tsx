"use client"

import { Input } from "@/components/ui/input";
import { format, formatDistanceStrict } from "date-fns";
import { motion, AnimatePresence, LayoutGroup, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Check, CheckCircle2, Users, UserX, UserMinus, AlertCircle, Search } from "lucide-react";
import { AttendanceCard } from "../components/AttendanceCard";
import type { Standup, Employee, AttendanceRecord, AttendanceStatus } from "../types";
import { FC } from "react";

// --- Animation Variants (Correctly Typed) ---
const transition = { type: "spring" as const, stiffness: 400, damping: 30 };
const containerVariants: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const itemVariants: Variants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition } };
const pageVariants: Variants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1, transition },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.2 } },
};

// --- Main Component ---
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
        key={props.standup.status} // Animate when status changes
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
    >
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
        <div className="relative flex items-center justify-center h-24 w-24">
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-primary/20 rounded-full"
            />
            <div className="relative h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
            </div>
        </div>
        <h2 className="text-2xl font-bold mt-6">Standup is in Progress</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
            The admin is currently taking attendance. Results will be displayed here as soon as the session is complete.
        </p>
    </div>
);

const EndedViewLayout = ({ standup, savedAttendance, employees, finalFilter, setFinalFilter, finalFilteredEmployees, finalSearchQuery, setFinalSearchQuery }: StandupSummaryViewProps) => {
    const activeEmployees = employees.filter(emp => !emp.archived);

    const activeEmployeeIds = new Set(activeEmployees.map(emp => emp.id));

    const summaryStats = {
        Present: Object.values(savedAttendance).filter(a => a.status === "Present" && activeEmployeeIds.has(a.employee_id)).length,
        Absent: Object.values(savedAttendance).filter(a => a.status === "Absent" && activeEmployeeIds.has(a.employee_id)).length,
        Missed: Object.values(savedAttendance).filter(a => a.status === "Missed" && activeEmployeeIds.has(a.employee_id)).length,
        'Not Available': Object.values(savedAttendance).filter(a => a.status === "Not Available" && activeEmployeeIds.has(a.employee_id)).length,
        'Total Team': activeEmployees.length,
    };

    const StandupCompletedCard = (
        <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><CheckCircle2 className="w-6 h-6" /></div>
                <div>
                    <CardTitle className="text-lg font-bold">Standup Completed</CardTitle>
                    <CardDescription>{`Concluded at ${standup.endedAt ? format(standup.endedAt.toDate(), "p") : "N/A"}`}</CardDescription>
                </div>
            </CardHeader>
            {standup.startedAt && standup.endedAt && (
                <CardContent className="border-t pt-4">
                    <p className="text-xs text-muted-foreground">TOTAL DURATION</p>
                    <p className="text-xl font-semibold">{formatDistanceStrict(standup.endedAt.toDate(), standup.startedAt.toDate())}</p>
                </CardContent>
            )}
        </Card>
    );

    return (
        <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Right Column: Summary (appears first on mobile) */}
            <div className="w-full lg:w-1/3 lg:order-2 space-y-6 lg:sticky lg:top-24">
                {StandupCompletedCard}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Final Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <SummaryStat icon={Check} label="Present" value={summaryStats.Present} />
                        <SummaryStat icon={UserMinus} label="Absent" value={summaryStats.Absent} />
                        <SummaryStat icon={UserX} label="Missed" value={summaryStats.Missed} />
                        <SummaryStat icon={AlertCircle} label="N/A" value={summaryStats['Not Available']} />
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
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email..."
                            value={finalSearchQuery}
                            onChange={(e) => setFinalSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
                <FilterControls currentFilter={finalFilter} onFilterChange={setFinalFilter} />
                <motion.div
                    key={finalFilter + finalSearchQuery}
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {finalFilteredEmployees.length > 0 ? (
                        finalFilteredEmployees.map((emp) => (
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
    );
};

// --- Helper UI Components ---

const FilterControls: FC<{ currentFilter: string; onFilterChange: (filter: any) => void }> = ({ currentFilter, onFilterChange }) => (
    <LayoutGroup id="filter-group">
        <div className="inline-flex flex-wrap items-center bg-muted p-1 rounded-lg">
            {(['all', 'Present', 'Absent', 'Missed', 'Not Available'] as const).map(filter => {
                const isActive = currentFilter === filter;
                return (
                    <Button key={filter} size="sm" variant="ghost" className="relative text-xs sm:text-sm" onClick={() => onFilterChange(filter)}>
                        {isActive && (
                            <motion.div
                                layoutId="active-filter-highlight"
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