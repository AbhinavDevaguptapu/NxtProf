"use client";

import { useState } from "react";
import {
  format,
  setHours,
  setMinutes,
  startOfDay,
  startOfMinute,
  parse,
} from "date-fns";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CalendarClock,
  CalendarIcon,
  Clock,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  formatErrorForDisplay,
} from "@/lib/errorHandler";

export const ScheduleStandupForm = ({
  todayDocId,
  adminName,
  onSuccess,
}: {
  todayDocId: string;
  adminName: string;
  onSuccess?: () => void;
}) => {
  const { toast } = useToast();
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    new Date()
  );
  const [scheduledTimeInput, setScheduledTimeInput] = useState<string>(
    format(new Date(), "HH:mm")
  );

  const handleSchedule = async () => {
    if (!scheduledDate) {
      toast({
        title: "Date Required",
        description: "Please select a date for the standup.",
        variant: "destructive",
      });
      return;
    }
    const [hours, minutes] = scheduledTimeInput.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours > 23 || minutes > 59) {
      toast({
        title: "Invalid Time",
        description: "Please enter a valid time in HH:MM format (24-hour).",
        variant: "destructive",
      });
      return;
    }
    const finalDateTime = setHours(
      setMinutes(startOfDay(scheduledDate), minutes),
      hours
    );
    if (finalDateTime < startOfMinute(new Date())) {
      toast({
        title: "Date & Time Invalid",
        description:
          "The standup cannot be scheduled for the past. Please choose a future time.",
        variant: "destructive",
      });
      return;
    }

    setIsScheduling(true);
    try {
      await setDoc(doc(db, "standups", todayDocId), {
        status: "scheduled",
        scheduledTime: Timestamp.fromDate(finalDateTime),
        scheduledBy: adminName,
      });
      toast({
        title: "Standup Scheduled!",
        description: `The standup has been scheduled for ${format(
          finalDateTime,
          "EEEE, MMM dd 'at' h:mm a"
        )}.`,
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      const { title, description } = formatErrorForDisplay(
        error,
        "Scheduling Failed",
        "scheduling"
      );
      toast({
        title,
        description,
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const timeSuggestions = ["08:45", "08:50", "08:55", "09:00"];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card className="w-full max-w-md shadow-2xl shadow-primary/10 border-border/50">
        <CardHeader className="text-center p-6">
          <div className="mx-auto bg-primary/10 text-primary rounded-full h-14 w-14 flex items-center justify-center mb-2 ring-4 ring-background">
            <CalendarClock className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Schedule Today&rsquo;s Standup
          </CardTitle>
          <CardDescription>
            Set the date and time for the daily meeting.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-0 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-picker">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-picker"
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? (
                      format(scheduledDate, "MMM dd, yyyy")
                    ) : (
                      <span>Select date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    initialFocus
                    disabled={(d) => startOfDay(d) < startOfDay(new Date())}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time-input">Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="time-input"
                  type="time"
                  value={scheduledTimeInput}
                  onChange={(e) => setScheduledTimeInput(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Quick Select
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {timeSuggestions.map((time) => (
                <Button
                  key={time}
                  variant="outline"
                  size="sm"
                  onClick={() => setScheduledTimeInput(time)}
                  className={cn(
                    scheduledTimeInput === time &&
                      "bg-primary/10 border-primary text-primary"
                  )}
                >
                  {format(parse(time, "HH:mm", new Date()), "h:mm a")}
                </Button>
              ))}
            </div>
          </div>

          <Alert className="bg-muted/50 border-border/50">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Standups can only be scheduled for today or future dates in
              24-hour format.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="p-6 pt-0">
          <Button
            onClick={handleSchedule}
            disabled={isScheduling}
            size="lg"
            className="w-full text-base"
          >
            {isScheduling ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Scheduling...
              </>
            ) : (
              <>
                <CalendarClock className="mr-2 h-5 w-5" /> Schedule Standup
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
