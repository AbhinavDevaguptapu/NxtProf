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
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { formatErrorForDisplay } from "@/lib/errorHandler";

export const ScheduleStandupForm = ({
  todayDocId,
  adminName,
  onSuccess,
}: {
  todayDocId: string;
  adminName: string;
  onSuccess?: () => void;
}) => {
  // [LOGIC PRESERVED] - State and handlers unchanged
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
      className="w-full max-w-md mx-auto"
    >
      <Card className="shadow-xl border-border/50 overflow-hidden">
        {/* Decorative Header */}
        <div className="relative bg-muted/20 pt-8 pb-10 px-6 text-center">
          {/* Background Decorations */}
          <div
            className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/30 rounded-full blur-2xl"
            aria-hidden="true"
          />

          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mx-auto bg-background/50 backdrop-blur-sm p-3 rounded-2xl w-16 h-16 flex items-center justify-center border border-border/50 mb-4 shadow-sm"
            >
              <CalendarClock className="h-8 w-8 text-primary" />
            </motion.div>
            <CardTitle className="text-2xl font-bold">
              Schedule Standup
            </CardTitle>
            <CardDescription className="max-w-xs mx-auto mt-2 text-muted-foreground">
              Set the date and time for the daily team meeting.
            </CardDescription>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-5">
            <div className="space-y-2">
              <Label htmlFor="date-picker" className="text-sm font-semibold">
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-picker"
                    variant="outline"
                    className={cn(
                      "w-full h-11 justify-start text-left font-normal border-input hover:bg-accent/50",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {scheduledDate ? (
                      format(scheduledDate, "MMMM dd, yyyy")
                    ) : (
                      <span>Select date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    initialFocus
                    disabled={(d) => startOfDay(d) < startOfDay(new Date())}
                    className="rounded-md border"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-input" className="text-sm font-semibold">
                Time
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="time-input"
                  type="time"
                  value={scheduledTimeInput}
                  onChange={(e) => setScheduledTimeInput(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Quick Select
              </Label>
              <Sparkles className="h-3 w-3 text-amber-500" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {timeSuggestions.map((time) => (
                <Button
                  key={time}
                  variant="outline"
                  size="sm"
                  onClick={() => setScheduledTimeInput(time)}
                  className={cn(
                    "text-xs h-9 transition-all hover:border-primary/50 hover:bg-primary/5",
                    scheduledTimeInput === time &&
                      "bg-primary/10 border-primary text-primary font-medium ring-1 ring-primary/20"
                  )}
                >
                  {format(parse(time, "HH:mm", new Date()), "h:mm a")}
                </Button>
              ))}
            </div>
          </div>

          <Alert className="bg-muted/30 border-dashed border-border text-xs">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
            <AlertDescription className="text-muted-foreground ml-2">
              Standups can only be scheduled for today or future dates using
              24-hour format.
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="p-6 pt-0">
          <Button
            onClick={handleSchedule}
            disabled={isScheduling}
            size="lg"
            className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
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
