"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Check, Info, UserMinus, UserX, X } from "lucide-react";
import { motion, LayoutGroup } from "framer-motion";
import type { Employee, AttendanceStatus } from "../types";

// --- Configuration (No changes needed) ---
const statusConfig: Record<
  AttendanceStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  Present: {
    label: "Present",
    icon: Check,
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 border-green-200 dark:border-green-800",
  },
  Absent: {
    label: "Absent",
    icon: UserMinus,
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border-red-200 dark:border-red-800",
  },
  Missed: {
    label: "Missed",
    icon: UserX,
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 border-amber-200 dark:border-amber-800",
  },
  "Not Available": {
    label: "N/A",
    icon: X,
    className: "bg-muted text-muted-foreground border-border",
  },
};

// --- Component Props (No changes needed) ---
interface AttendanceCardProps {
  employee: Employee;
  status: AttendanceStatus;
  reason?: string;
  onSetStatus: (employeeId: string, status: AttendanceStatus) => void;
  onMarkUnavailable: (employee: Employee) => void;
  isInteractive: boolean;
}

// --- Main Component ---
export const AttendanceCard = ({
  employee,
  status,
  reason,
  onSetStatus,
  onMarkUnavailable,
  isInteractive,
}: AttendanceCardProps) => {
  const getInitials = (name: string) => {
    const names = name.split(" ");
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2);
  };

  return (
    <Card className="flex flex-col h-full transition-shadow hover:shadow-lg rounded-xl overflow-hidden">
      {/* IMPROVEMENT: Added responsive gap for better spacing on small screens */}
      <CardHeader className="flex flex-row items-center gap-3 sm:gap-4 p-4">
        <Avatar>
          <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base font-semibold truncate">
            {employee.name}
          </CardTitle>
          <CardDescription className="text-xs truncate">
            {employee.email}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-end">
        {status === "Not Available" && reason && (
          <div className="mb-4 text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-md flex items-start gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>{reason}</p>
          </div>
        )}

        {isInteractive ? (
          <InteractiveControls
            employeeId={employee.id} // Pass employeeId for stable key
            currentStatus={status}
            onSetStatus={(newStatus) => onSetStatus(employee.id, newStatus)}
            onMarkUnavailable={() => onMarkUnavailable(employee)}
          />
        ) : (
          <StatusDisplay status={status} />
        )}
      </CardContent>
    </Card>
  );
};

// --- Sub-Components ---

const InteractiveControls = ({
  employeeId,
  currentStatus,
  onSetStatus,
  onMarkUnavailable,
}: {
  employeeId: string; // Use a stable ID
  currentStatus: AttendanceStatus;
  onSetStatus: (status: AttendanceStatus) => void;
  onMarkUnavailable: () => void;
}) => {
  const controls: AttendanceStatus[] = [
    "Present",
    "Absent",
    "Missed",
    "Not Available",
  ];
  return (
    // CHANGED: Replaced flexbox with a responsive CSS Grid layout.
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-muted p-1 rounded-lg">
      {/* IMPROVEMENT: Use a stable, unique ID for LayoutGroup to prevent re-render issues. */}
      <LayoutGroup id={`controls-${employeeId}`}>
        {controls.map((status) => {
          const isActive = currentStatus === status;
          const { label, icon: Icon, className } = statusConfig[status];
          return (
            <TooltipProvider key={status} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={() =>
                      status === "Not Available"
                        ? onMarkUnavailable()
                        : onSetStatus(status)
                    }
                    // CHANGED: Removed `flex-1` and adjusted styling for grid.
                    className={cn(
                      "relative h-9 px-2 text-xs font-semibold rounded-md transition-colors flex items-center justify-center",
                      !isActive &&
                        "hover:bg-background/50 text-muted-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-pill"
                        className={cn(
                          "absolute inset-0 rounded-md border",
                          className
                        )}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    )}
                    <motion.span
                      animate={{ opacity: 1, scale: 1 }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      // CHANGED: Removed redundant active class, color is inherited correctly.
                      className="relative z-10 flex items-center"
                    >
                      <Icon className="h-3.5 w-3.5 mr-1.5" />
                      <span className="hidden sm:inline">{label}</span>
                      {/* IMPROVEMENT: Show only the icon on the smallest screens to save space. */}
                      <span className="sm:hidden">
                        {status === "Not Available" ? "N/A" : label}
                      </span>
                    </motion.span>
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>{status}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </LayoutGroup>
    </div>
  );
};

// No changes needed for StatusDisplay, it's already solid.
const StatusDisplay = ({ status }: { status: AttendanceStatus }) => {
  const { label, icon: Icon, className } = statusConfig[status];
  return (
    <div
      className={cn(
        "h-9 px-3 text-sm font-semibold rounded-md flex items-center justify-center border",
        className
      )}
    >
      <Icon className="h-4 w-4 mr-2" /> {label}
    </div>
  );
};
