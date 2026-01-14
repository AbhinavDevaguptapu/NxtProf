import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarClock, PlayCircle, CalendarX } from "lucide-react";
import { format } from "date-fns";
import type { LearningHour } from "../types";
import { cn } from "@/lib/utils";

type SessionStatusBannerProps = {
  learningHour: LearningHour | null;
};

// Helper for consistent icon styling
const IconWrapper = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("p-2 rounded-lg shrink-0", className)}>{children}</div>
);

export const SessionStatusBanner = ({
  learningHour,
}: SessionStatusBannerProps) => {
  if (!learningHour) {
    return (
      <Alert className="mb-8 border border-border/50 bg-muted/30 shadow-sm">
        <div className="flex gap-4 items-start">
          <IconWrapper className="bg-muted text-muted-foreground">
            <CalendarX className="h-5 w-5" />
          </IconWrapper>
          <div>
            <AlertTitle className="text-base font-semibold text-foreground">
              No Session Scheduled
            </AlertTitle>
            <AlertDescription className="text-muted-foreground mt-1 leading-relaxed">
              There is no learning session scheduled for today. You can still
              add learning points, but they will not be locked until a session
              is run.
            </AlertDescription>
          </div>
        </div>
      </Alert>
    );
  }

  if (learningHour.status === "ended") {
    // The "ended" state is handled by the lock message in the points list or separate component.
    return null;
  }

  if (learningHour.status === "scheduled") {
    return (
      <Alert className="mb-8 border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10 shadow-sm">
        <div className="flex gap-4 items-start">
          <IconWrapper className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <CalendarClock className="h-5 w-5" />
          </IconWrapper>
          <div>
            <AlertTitle className="text-base font-semibold text-blue-900 dark:text-blue-100">
              Session Scheduled
            </AlertTitle>
            <AlertDescription className="text-blue-800/80 dark:text-blue-200/80 mt-1 leading-relaxed">
              Today&rsquo;s learning session is scheduled for{" "}
              <span className="font-semibold text-blue-900 dark:text-blue-100">
                {format(learningHour.scheduledTime.toDate(), "p")}
              </span>
              . You can add your learning points now.
            </AlertDescription>
          </div>
        </div>
      </Alert>
    );
  }

  if (learningHour.status === "active") {
    return (
      <Alert className="mb-8 border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/10 shadow-sm">
        <div className="flex gap-4 items-start">
          <IconWrapper className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            <PlayCircle className="h-5 w-5" />
          </IconWrapper>
          <div>
            <div className="flex items-center gap-2">
              <AlertTitle className="text-base font-semibold text-green-900 dark:text-green-100">
                Session in Progress
              </AlertTitle>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </div>
            <AlertDescription className="text-green-800/80 dark:text-green-200/80 mt-1 leading-relaxed">
              The learning session is currently active. You can add and edit
              your points.
            </AlertDescription>
          </div>
        </div>
      </Alert>
    );
  }

  return null;
};
