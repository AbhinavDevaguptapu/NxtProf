import { Input } from "@/components/ui/input";
import { motion, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader2, StopCircle, Users, Timer, Search } from "lucide-react";
import { AttendanceCard } from "../components/AttendanceCard";
import { SessionStatistics } from "../components/SessionStatistics";
import type { Employee, AttendanceStatus, Standup } from "../types";
import { useEffect, useState } from "react";
import { differenceInSeconds } from "date-fns";

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
                setAutoCloseTime(`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
            }, 1000);
            return () => clearInterval(intervalId);
        }
    }, [standup]);

    const activeEmployees = activeFilteredEmployees.filter(emp => !emp.archived);
    
    return (
    <motion.div
        key="active-admin"
        className="w-full mx-auto space-y-8"
        {...pageAnimationProps}
    >
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
            <div>
                <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Standup in Progress
                    </h1>
                </div>
                <p className="text-muted-foreground mt-1">
                    Mark attendance for each team member.
                </p>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-2xl font-semibold text-gray-800">
                        {sessionTime}
                    </p>
                    <p className="text-xs text-muted-foreground">SESSION TIME</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-semibold text-red-500">
                        {autoCloseTime}
                    </p>
                    <p className="text-xs text-muted-foreground">AUTO-CLOSE</p>
                </div>
                <Button
                    size="lg"
                    variant="destructive"
                    onClick={onStop}
                    disabled={isUpdatingStatus}
                >
                    {isUpdatingStatus ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <StopCircle className="mr-2 h-5 w-5" />
                    )}
                    End & Save
                </Button>
            </div>
        </div>

        <SessionStatistics stats={sessionStats} />

        <div>
            <div className="flex flex-wrap gap-4 items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        Attendance Roster
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Click a member's status to mark their attendance.
                    </p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or email..."
                        value={activeSearchQuery}
                        onChange={(e) => setActiveSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex flex-wrap items-center border border-gray-200 rounded-lg p-1 space-x-1">
                    <Button size="sm" variant={activeFilter === "all" ? "secondary" : "ghost"} onClick={() => setActiveFilter("all")}>All</Button>
                    <Button size="sm" variant={activeFilter === "Present" ? "secondary" : "ghost"} onClick={() => setActiveFilter("Present")}>Present</Button>
                    <Button size="sm" variant={activeFilter === "Absent" ? "secondary" : "ghost"} onClick={() => setActiveFilter("Absent")}>Absent</Button>
                    <Button size="sm" variant={activeFilter === "Missed" ? "secondary" : "ghost"} onClick={() => setActiveFilter("Missed")}>Missed</Button>
                    <Button size="sm" variant={activeFilter === "Not Available" ? "secondary" : "ghost"} onClick={() => setActiveFilter("Not Available")}>N/A</Button>
                </div>
            </div>
            <motion.div
                key={activeFilter + activeSearchQuery}
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {activeEmployees.length > 0 ? (
                    activeEmployees.map((emp) => (
                        <motion.div key={emp.id} variants={itemVariants}>
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
                        className="col-span-full flex flex-col items-center justify-center text-center p-10 border border-gray rounded-lg"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Users className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text font-semibold text-gray-700">
                            No Members Found
                        </h3>
                        <p className="text-muted-foreground">
                            There are no team members in the "{activeFilter}" category.
                        </p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    </motion.div>
)};
