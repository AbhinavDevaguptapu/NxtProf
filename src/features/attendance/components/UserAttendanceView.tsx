import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  parseISO,
  isSameMonth,
  eachDayOfInterval,
  isSunday,
} from "date-fns";
import { db } from "@/integrations/firebase/client";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Loader2,
  Users,
  BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Calendar } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatCard } from "@/components/common/StatCard";

type AttendanceStatus = "Present" | "Absent" | "Missed" | "Not Available";
type DailyCombinedStatus = {
  standup?: AttendanceStatus;
  learning?: AttendanceStatus;
};

export const UserAttendanceView = ({ userId }: { userId: string }) => {
  const [month, setMonth] = useState(new Date());
  const [allAttendance, setAllAttendance] = useState<
    Record<string, DailyCombinedStatus>
  >({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAllData = useCallback(async () => {
    setLoading(true);
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
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(month),
      end: endOfMonth(month),
    });
    const totalWorkingDays = daysInMonth.filter((day) => !isSunday(day)).length;
    let standupCount = 0;
    let learningHourCount = 0;
    Object.entries(allAttendance).forEach(([dateStr, statuses]) => {
      const date = parseISO(dateStr);
      if (isSameMonth(date, month)) {
        if (statuses.standup === "Present") standupCount++;
        if (statuses.learning === "Present") learningHourCount++;
      }
    });
    return { standupCount, learningHourCount, totalWorkingDays };
  }, [allAttendance, month]);

  const DayContent = ({ date }: { date: Date }) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const status = allAttendance[dateKey];

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

    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative h-full w-full flex flex-col items-center justify-center">
              {format(date, "d")}
              {!isSunday(date) && (
                <div className="absolute -bottom-1 flex items-center justify-center gap-1 font-bold text-xs">
                  <span className={getStatusClass(status?.standup)}>S</span>
                  <span className={getStatusClass(status?.learning)}>L</span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm space-y-1 p-1">
              <p>
                Standup:{" "}
                <span className="font-semibold">
                  {status?.standup === "Not Available" ? "N/A" : status?.standup || "N/A"}
                </span>
              </p>
              <p>
                Learning:{" "}
                <span className="font-semibold">
                  {status?.learning === "Not Available" ? "N/A" : status?.learning || "N/A"}
                </span>
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Monthly Attendance Summary</CardTitle>
          <CardDescription>
            Your "Present" status for {format(month, "MMMM yyyy")}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Standups Attended"
            value={`${monthlyStats.standupCount} / ${monthlyStats.totalWorkingDays}`}
            icon={<Users />}
          />
          <StatCard
            title="Learning Hours Attended"
            value={`${monthlyStats.learningHourCount} / ${monthlyStats.totalWorkingDays}`}
            icon={<BookOpen />}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Attendance Calendar</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            month={month}
            onMonthChange={setMonth}
            components={{ Day: DayContent }}
            className="p-0"
          />
        </CardContent>
        <CardFooter className="flex-col items-start gap-3 pt-4 border-t">
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="font-bold text-green-500">S/L</span>: Present
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-yellow-500">S/L</span>: Absent
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-red-500">S/L</span>: Missed
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-gray-500">S/L</span>: N/A
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-gray-300">S/L</span>: Not Marked
            </div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
