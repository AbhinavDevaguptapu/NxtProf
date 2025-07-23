import { useState } from "react";
import { format, setHours, setMinutes, startOfDay, startOfMinute } from "date-fns";
import { Timestamp, doc, setDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarClock, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ScheduleLearningHourFormProps = {
    todayDocId: string;
    adminName: string;
    onSuccess?: () => void;
};

export const ScheduleLearningHourForm = ({ todayDocId, adminName, onSuccess }: ScheduleLearningHourFormProps) => {
    const { toast } = useToast();
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
    const [scheduledTimeInput, setScheduledTimeInput] = useState<string>(format(new Date(), 'HH:mm'));

    const handleSchedule = async () => {
        if (!scheduledDate) {
            toast({ title: "Please select a date.", variant: "destructive" });
            return;
        }
        const [hours, minutes] = scheduledTimeInput.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes) || hours > 23 || minutes > 59) {
            toast({ title: "Invalid time format.", variant: "destructive" });
            return;
        }
        let finalDateTime = setHours(setMinutes(startOfDay(scheduledDate), minutes), hours);
        const nowAtStartOfMinute = startOfMinute(new Date());
        if (finalDateTime < nowAtStartOfMinute) {
            toast({ title: "Cannot schedule in the past.", variant: "destructive" });
            return;
        }

        setIsScheduling(true);
        try {
            await setDoc(doc(db, "learning_hours", todayDocId), {
                status: "scheduled",
                scheduledTime: Timestamp.fromDate(finalDateTime),
                scheduledBy: adminName,
            });
            toast({ title: "Success", description: `Session scheduled for ${format(finalDateTime, 'p')}.` });
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(error);
            toast({ title: "Scheduling Failed", description: "An unexpected error occurred.", variant: "destructive" });
        } finally {
            setIsScheduling(false);
        }
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Schedule Today's Session</CardTitle>
                <CardDescription>Set the time for the daily learning session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="date-picker">Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button id="date-picker" variant="outline" className={cn("w-full justify-start text-left font-normal", !scheduledDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {scheduledDate ? format(scheduledDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus disabled={(d) => startOfDay(d) < startOfDay(new Date())} />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="time-input">Time (24-hour)</Label>
                    <Input id="time-input" type="time" value={scheduledTimeInput} onChange={(e) => setScheduledTimeInput(e.target.value)} />
                </div>
                <Button onClick={handleSchedule} disabled={isScheduling} className="w-full">
                    {isScheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />} Schedule Now
                </Button>
            </CardContent>
        </Card>
    );
};
