import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { Loader2, CalendarClock } from "lucide-react";

// --- Firebase Imports ---
import { collection, addDoc, getDocs, query, orderBy, Timestamp, serverTimestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";

// --- date-fns and Shadcn UI Imports ---
import { format, startOfDay } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type LearningHour = {
    id: string;
    scheduledTime: Timestamp;
    createdAt?: Timestamp;
};

// The component now accepts an onAfterSchedule callback to refresh the parent page
type AdminScheduleLearningHourProps = {
    onAfterSchedule?: () => void;
};

export default function AdminScheduleLearningHour({ onAfterSchedule }: AdminScheduleLearningHourProps) {
    const { admin } = useAdminAuth();
    const { toast } = useToast();

    // State for the new UI controls
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [time, setTime] = useState<string>("10:00");
    const [loading, setLoading] = useState(false);
    const [hours, setHours] = useState<LearningHour[]>([]);

    const fetchLearningHours = useCallback(async () => {
        setLoading(true);
        try {
            const col = collection(db, "learning_hours");
            const q = query(col, orderBy("scheduledTime", "asc"));
            const snap = await getDocs(q);
            setHours(
                snap.docs.map((doc) => ({
                    id: doc.id,
                    ...(doc.data() as Omit<LearningHour, "id">),
                }))
            );
        } catch (err: any) {
            console.error(err);
            toast({ title: "Error", description: "Could not fetch learning hours.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchLearningHours();
    }, [fetchLearningHours]);

    const handleSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admin) {
            toast({ title: "Forbidden", description: "Only admins can schedule.", variant: "destructive" });
            return;
        }
        if (!date) {
            toast({ title: "Invalid Date", description: "Please select a date.", variant: "destructive" });
            return;
        }

        const [hh, mm] = time.split(":").map(Number);
        if (isNaN(hh) || isNaN(mm)) {
            toast({ title: "Invalid Time", description: "Please enter a valid time.", variant: "destructive" });
            return;
        }

        // Clone the date to avoid mutating state
        const scheduledDate = new Date(date);
        scheduledDate.setHours(hh, mm, 0, 0);

        // Prevent scheduling in the past
        if (scheduledDate < new Date()) {
            toast({ title: "Invalid Time", description: "Cannot schedule a time in the past.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, "learning_hours"), {
                scheduledTime: Timestamp.fromDate(scheduledDate),
                createdAt: serverTimestamp(),
                createdBy: admin.uid,
            });
            toast({ title: "Scheduled!", description: `Learning hour set for ${format(scheduledDate, "PPP p")}` });
            setDate(new Date());
            setTime("10:00");
            await fetchLearningHours(); // Refresh the list
            if (onAfterSchedule) onAfterSchedule();
        } catch (err: any) {
            console.error(err);
            toast({ title: "Error", description: "Failed to schedule learning hour.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto mt-8">
            <CardHeader>
                <CardTitle>Schedule a Learning Hour</CardTitle>
                <CardDescription>Add a new learning session for the team.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSchedule} className="flex flex-wrap items-end gap-4 mb-6 p-4 border rounded-lg bg-slate-50">
                    <div className="grid gap-1.5">
                        <label className="text-sm font-medium">Date</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    disabled={(d) => startOfDay(d) < startOfDay(new Date())}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="grid gap-1.5">
                        <label className="text-sm font-medium">Time (24h)</label>
                        <Input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            required
                            className="w-32"
                        />
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}
                        Schedule
                    </Button>
                    <div className="mt-6">
                        <h4 className="font-semibold mb-3 text-lg">Upcoming Learning Hours</h4>
                        {loading ? (
                            <div>Loading...</div>
                        ) : (
                            <ul className="space-y-2">
                                {hours.length > 0 ? (
                                    hours.map((lh) => (
                                        <li key={lh.id} className="flex justify-between items-center border-b p-2 hover:bg-slate-50">
                                            <span className="font-medium text-slate-800">
                                                {format(lh.scheduledTime.toDate(), "eeee, MMM d, yyyy 'at' p")}
                                            </span>
                                            {lh.createdAt && (
                                                <span className="text-xs text-slate-500">
                                                    Created: {format(lh.createdAt.toDate(), "P")}
                                                </span>
                                            )}
                                        </li>
                                    ))
                                ) : (
                                    <li className="text-slate-500">No learning hours scheduled yet.</li>
                                )}
                            </ul>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
