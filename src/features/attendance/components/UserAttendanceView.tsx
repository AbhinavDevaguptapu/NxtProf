import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  parseISO,
  isSameMonth,
  eachDayOfInterval,
  isSunday,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { db } from "@/integrations/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Users,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils"; // Assuming you have a cn utility from shadcn

// --- Types and Helper Data ---

type AttendanceStatus = "Present" | "Absent" | "Missed" | "Not Available";
type DailyCombinedStatus = {
  standup?: AttendanceStatus;
  learning?: AttendanceStatus;
};

// --- Helper function for status styling ---
const getStatusClass = (s?: AttendanceStatus) => {
  switch (s) {
    case "Present":
      return "text-green-500";
    case "Absent":
      return "text-yellow-500";
    case "Missed":
      return "text-red-500";
    case "Not Available":
      return "text-gray-500";
    default:
      return "text-gray-300 dark:text-gray-700";
  }
};

const getStatusLabel = (s?: AttendanceStatus) => {
  switch (s) {
    case "Present":
      return "Present";
    case "Absent":
      return "Absent";
    case "Missed":
      return "Missed";
    case "Not Available":
      return "N/A";
    default:
      return "Not Marked";
  }
};

// --- Main Component ---

export const UserAttendanceView = ({ userId }: { userId: string }) => {
  const [month, setMonth] = useState(new Date());
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [allAttendance, setAllAttendance] = useState<
    Record<string, DailyCombinedStatus>
  >({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAllData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // ... (fetching logic remains the same)
    const standupQuery = query(
      collection(db, "attendance"),
      where("employee_id", "==", userId)
    );
    const learningQuery = query(
      collection(db, "learning_hours_attendance"),
      where("employee_id", "==", userId)
    );

    try {
      const [standupSnap, learningSnap] = await Promise.all([
        getDocs(standupQuery),
        getDocs(learningQuery),
      ]);
      const combinedData: Record<string, DailyCombinedStatus> = {};

      standupSnap.forEach((doc) => {
        const dateKey = doc.id.split("_")[0];
        if (!combinedData[dateKey]) combinedData[dateKey] = {};
        combinedData[dateKey].standup = doc.data().status as AttendanceStatus;
      });
      learningSnap.forEach((doc) => {
        const dateKey = doc.id.split("_")[0];
        if (!combinedData[dateKey]) combinedData[dateKey] = {};
        combinedData[dateKey].learning = doc.data().status as AttendanceStatus;
      });

      setAllAttendance(combinedData);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      toast({ title: "Failed to load your data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const monthlyStats = useMemo(() => {
    const stats = {
      standup: { present: 0, missed: 0, absent: 0, notAvailable: 0 },
      learning: { present: 0, missed: 0, absent: 0, notAvailable: 0 },
    };

    Object.entries(allAttendance).forEach(([dateStr, statuses]) => {
      try {
        const date = parseISO(dateStr);
        if (isSameMonth(date, month) && !isSunday(date)) {
          // Standup stats
          if (statuses.standup === "Present") stats.standup.present++;
          else if (statuses.standup === "Missed") stats.standup.missed++;
          else if (statuses.standup === "Absent") stats.standup.absent++;
          else if (statuses.standup === "Not Available")
            stats.standup.notAvailable++;

          // Learning Hour stats
          if (statuses.learning === "Present") stats.learning.present++;
          else if (statuses.learning === "Missed") stats.learning.missed++;
          else if (statuses.learning === "Absent") stats.learning.absent++;
          else if (statuses.learning === "Not Available")
            stats.learning.notAvailable++;
        }
      } catch (error) {
        console.error("Error parsing date:", dateStr, error);
      }
    });

    return stats;
  }, [allAttendance, month]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [month]);

  const handleMonthChange = (direction: "next" | "prev") => {
    setDirection(direction);
    setMonth((prevMonth) =>
      direction === "next" ? addMonths(prevMonth, 1) : subMonths(prevMonth, 1)
    );
  };

  // --- Reusable Sub-components ---

  const StatCard = ({
    title,
    stats,
    icon,
  }: {
    title: string;
    stats: {
      present: number;
      missed: number;
      absent: number;
      notAvailable: number;
    };
    icon: React.ReactNode;
  }) => {
    const considered = stats.present + stats.missed;
    const totalConducted = considered + stats.absent + stats.notAvailable;
    const percentage =
      considered > 0
        ? Math.round(
            ((stats.present + stats.absent + stats.notAvailable) /
              totalConducted) *
              100
          )
        : 0;

    const colorClass = useMemo(() => {
      if (percentage >= 90) return "bg-green-500";
      if (percentage >= 75) return "bg-yellow-500";
      return "bg-red-500";
    }, [percentage]);

    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {icon} {title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Total:{" "}
              <span className="font-bold text-primary">{totalConducted}</span>
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <p>
              Present: <span className="font-bold">{stats.present}</span>
            </p>
            <p>
              Missed: <span className="font-bold">{stats.missed}</span>
            </p>
            <p>
              Absent: <span className="font-bold">{stats.absent}</span>
            </p>
            <p>
              N/A: <span className="font-bold">{stats.notAvailable}</span>
            </p>
          </div>
          <div>
            <div className="flex justify-between items-end mb-1">
              <h5 className="text-sm font-medium text-muted-foreground">
                Attendance
              </h5>
              <p className="font-bold">{percentage}%</p>
            </div>
            <Progress
              value={percentage}
              className="h-2"
              indicatorClassName={colorClass}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  const DayCell = ({ date }: { date: Date }) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const status = allAttendance[dateKey];
    const isCurrentMonth = isSameMonth(date, month);
    const isTodayDate = isToday(date);
    const isSundayDate = isSunday(date);

    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "relative h-16 w-full flex flex-col items-center justify-center rounded-lg cursor-pointer transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                !isCurrentMonth && "text-muted-foreground/50 bg-muted/20",
                isSundayDate && !isTodayDate && "text-red-500/70",
                isTodayDate &&
                  "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
            >
              <span className="text-sm font-medium">{format(date, "d")}</span>
              {!isSundayDate && isCurrentMonth && (
                <div className="absolute bottom-1.5 flex items-center justify-center gap-1 font-bold text-xs">
                  <span className={getStatusClass(status?.standup)}>S</span>
                  <span className={getStatusClass(status?.learning)}>L</span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm space-y-1.5 p-1">
              <p className="font-semibold">{format(date, "MMMM d, yyyy")}</p>
              {!isSundayDate ? (
                <>
                  <p>
                    Standup:{" "}
                    <span
                      className={cn(
                        "font-medium",
                        getStatusClass(status?.standup)
                      )}
                    >
                      {getStatusLabel(status?.standup)}
                    </span>
                  </p>
                  <p>
                    Learning:{" "}
                    <span
                      className={cn(
                        "font-medium",
                        getStatusClass(status?.learning)
                      )}
                    >
                      {getStatusLabel(status?.learning)}
                    </span>
                  </p>
                </>
              ) : (
                <p className="font-medium text-red-500">Sunday (Off-day)</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const Legend = () => {
    const legendItems: Array<{ status?: AttendanceStatus; label: string }> = [
      { status: "Present", label: "Present" },
      { status: "Absent", label: "Absent" },
      { status: "Missed", label: "Missed" },
      { status: "Not Available", label: "N/A" },
      { status: undefined, label: "Not Marked" },
    ];
    return (
      <div className="mt-4 pt-4 border-t">
        <h4 className="text-sm font-medium text-muted-foreground mb-2">
          Legend (S=Standup, L=Learning)
        </h4>
        <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
          {legendItems.map(({ status, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <span className={cn("font-bold", getStatusClass(status))}>
                S/L
              </span>
              : {label}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading)
    return (
      <div className="space-y-6">
        {/* Monthly Summary Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-7 w-48 bg-muted animate-pulse rounded-lg" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded-lg mt-2" />
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {[1, 2, 3, 4].map((j) => (
                      <div
                        key={j}
                        className="h-4 w-20 bg-muted animate-pulse rounded"
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="h-2 w-full bg-muted animate-pulse rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Calendar Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="h-6 w-40 bg-muted animate-pulse rounded" />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                <div className="h-8 w-8 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Week headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-8 flex items-center justify-center">
                  <div className="h-4 w-8 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-muted/50 animate-pulse rounded-lg"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );

  const calendarAnimationVariants = {
    // ... (animation logic remains the same)
    enter: (direction: "next" | "prev") => ({
      opacity: 0,
      x: direction === "next" ? 50 : -50,
    }),
    center: { opacity: 1, x: 0 },
    exit: (direction: "next" | "prev") => ({
      opacity: 0,
      x: direction === "next" ? -50 : 50,
    }),
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Monthly Summary</CardTitle>
          <CardDescription>
            Your attendance for {format(month, "MMMM yyyy")}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Standups"
            stats={monthlyStats.standup}
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
          />
          <StatCard
            title="Learning Hours"
            stats={monthlyStats.learning}
            icon={<BookOpen className="h-5 w-5 text-muted-foreground" />}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Attendance Calendar</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleMonthChange("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-center w-32">
                {format(month, "MMMM yyyy")}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleMonthChange("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-hidden">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="h-8 flex items-center justify-center text-xs font-semibold text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Animated Calendar grid */}
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={format(month, "yyyy-MM")}
              className="grid grid-cols-7 gap-1"
              variants={calendarAnimationVariants}
              initial="enter"
              animate="center"
              exit="exit"
              custom={direction}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {calendarDays.map((date) => (
                <DayCell key={date.toISOString()} date={date} />
              ))}
            </motion.div>
          </AnimatePresence>

          <Legend />
        </CardContent>
      </Card>
    </motion.div>
  );
};
