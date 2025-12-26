import { useState } from "react";
import { format } from "date-fns";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, Calendar as CalendarIcon, CloudUpload } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { AttendanceReport } from "./AttendanceReport";

type SessionType = "standups" | "learning_hours";

import { useUserAuth } from "@/context/UserAuthContext";

export const AdminAttendanceView = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const { isAdmin, isCoAdmin } = useUserAuth();

  const handleSync = async (sessionType: SessionType) => {
    setIsSyncing(true);
    try {
      const functions = getFunctions();
      const syncAttendanceToSheet = httpsCallable(
        functions,
        "syncAttendanceToSheet"
      );
      const date = format(selectedDate, "yyyy-MM-dd");

      toast({
        title: "Sync Started",
        description: `Syncing ${sessionType} data for ${date}...`,
      });

      const result = await syncAttendanceToSheet({ date, sessionType });

      toast({
        title: "Sync Successful",
        description: (result.data as any).message,
      });
    } catch (error: any) {
      console.error("Sync failed:", error);
      if (error.code === "functions/permission-denied") {
        toast({
          title: "Permission Denied",
          description:
            "Please try logging out and back in to refresh your admin permissions.",
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "Sync Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight">
              Attendance Records
            </CardTitle>
            <CardDescription className="mt-1">
              View, edit, and sync historical attendance records.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-[280px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                onClick={() => handleSync("standups")}
                disabled={isSyncing || (!isAdmin && !isCoAdmin)}
                className="w-full"
              >
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="mr-2 h-4 w-4" />
                )}
                <span className="sm:hidden">Standups</span>
                <span className="hidden sm:inline">Sync Standups</span>
              </Button>
              <Button
                onClick={() => handleSync("learning_hours")}
                disabled={isSyncing || (!isAdmin && !isCoAdmin)}
                className="w-full"
              >
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="mr-2 h-4 w-4" />
                )}
                <span className="sm:hidden">Learning</span>
                <span className="hidden sm:inline">Sync Learning Hours</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceReport sessionType="standups" selectedDate={selectedDate} />
        <AttendanceReport
          sessionType="learning_hours"
          selectedDate={selectedDate}
        />
      </div>
    </motion.div>
  );
};
