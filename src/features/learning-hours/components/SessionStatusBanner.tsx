import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarClock, PlayCircle } from "lucide-react";
import { format } from 'date-fns';
import type { LearningHour } from '../types';

type SessionStatusBannerProps = {
    learningHour: LearningHour | null;
};

export const SessionStatusBanner = ({ learningHour }: SessionStatusBannerProps) => {
    if (!learningHour || learningHour.status === 'ended') {
        // The "ended" state is handled by the lock message in the points list.
        // The "no session" state is handled by a different view entirely.
        return null;
    }

    if (learningHour.status === 'scheduled') {
        return (
            <Alert className="mb-6 border-blue-400 text-blue-800">
                <CalendarClock className="h-4 w-4 !text-blue-800" />
                <AlertTitle>Session Scheduled</AlertTitle>
                <AlertDescription>
                    Today's learning session is scheduled for {format(learningHour.scheduledTime.toDate(), 'p')}. You can add your learning points now.
                </AlertDescription>
            </Alert>
        );
    }

    if (learningHour.status === 'active') {
        return (
            <Alert className="mb-6 border-green-400 text-green-800 bg-green-50">
                 <PlayCircle className="h-4 w-4 !text-green-800" />
                 <AlertTitle>Session in Progress</AlertTitle>
                 <AlertDescription>
                    The learning session is currently active. You can add and edit your points.
                 </AlertDescription>
            </Alert>
        );
    }

    return null;
};
