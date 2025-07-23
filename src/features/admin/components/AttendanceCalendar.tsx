import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

type AttendanceData = {
    [date: string]: 'Present' | 'Absent' | 'Missed' | 'Not Available';
};

interface AttendanceCalendarProps {
    month: Date;
    standupData: AttendanceData;
    learningHourData: AttendanceData;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AttendanceCalendar = ({ month, standupData, learningHourData }: AttendanceCalendarProps) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Create an array of empty cells for the days before the first of the month
    const startingDayIndex = getDay(monthStart);
    const leadingEmptyDays = Array.from({ length: startingDayIndex }, (_, i) => (
        <div key={`empty-${i}`} className="border rounded-md" />
    ));

    const getStatusIndicator = (status?: string) => {
        switch (status) {
            case 'Present':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'Absent':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'Missed':
                 return <XCircle className="h-4 w-4 text-yellow-500" />;
            case 'Not Available':
                return <MinusCircle className="h-4 w-4 text-gray-400" />;
            default:
                return <div className="h-4 w-4" />;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Monthly Attendance Calendar</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold text-muted-foreground">
                    {WEEKDAYS.map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2 mt-2">
                    {leadingEmptyDays}
                    {daysInMonth.map(day => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const standupStatus = standupData[dateKey];
                        const learningHourStatus = learningHourData[dateKey];
                        const isToday = isSameDay(day, new Date());

                        return (
                            <div
                                key={dateKey}
                                className={cn(
                                    "border rounded-md p-2 flex flex-col justify-between h-24",
                                    isToday && "bg-blue-50 border-blue-200"
                                )}
                            >
                                <div className={cn("font-bold", isToday ? "text-blue-600" : "text-foreground")}>
                                    {format(day, 'd')}
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-1" title={`Standup: ${standupStatus || 'N/A'}`}>
                                        <span className="text-xs font-bold">S:</span>
                                        {getStatusIndicator(standupStatus)}
                                    </div>
                                    <div className="flex items-center gap-1" title={`Learning: ${learningHourStatus || 'N/A'}`}>
                                        <span className="text-xs font-bold">L:</span>
                                        {getStatusIndicator(learningHourStatus)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default AttendanceCalendar;