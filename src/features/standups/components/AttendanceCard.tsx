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
import { Check, Info, UserMinus, UserX, X, Mail } from "lucide-react";
import { motion, LayoutGroup } from "framer-motion";
import type { Employee, AttendanceStatus } from "../types";

// --- Configuration ---
// [LOGIC PRESERVED] - Status config unchanged
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

// --- Component Props ---
// [LOGIC PRESERVED] - Props interface unchanged
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
  // [LOGIC PRESERVED] - Initials logic unchanged
  const getInitials = (name: string) => {
    const names = name.split(" ");
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2);
  };

  // Get status indicator color
  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case "Present":
        return "bg-green-500";
      case "Absent":
        return "bg-red-500";
      case "Missed":
        return "bg-amber-500";
      default:
        return "bg-muted-foreground/30";
    }
  };

  return (
    <Card
      className={cn(
        "flex flex-col h-full transition-all duration-200 rounded-xl overflow-hidden",
        "border border-border/50 hover:border-border",
        "shadow-sm hover:shadow-lg",
        isInteractive && "cursor-default"
      )}
    >
      <CardHeader className="flex flex-row items-center gap-3 p-4 pb-3">
        {/* Avatar with status indicator */}
        <div className="relative">
          <Avatar className="h-11 w-11 border-2 border-background shadow-sm">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {getInitials(employee.name)}
            </AvatarFallback>
          </Avatar>
          {/* Status dot */}
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card",
              getStatusColor(status)
            )}
            aria-hidden="true"
          />
        </div>

        <div className="flex-1 min-w-0">
          <CardTitle className="text-base font-semibold truncate text-foreground">
            {employee.name}
          </CardTitle>
          <CardDescription className="text-xs truncate flex items-center gap-1 mt-0.5">
            <Mail className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{employee.email}</span>
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-end gap-3">
        {/* Reason Display */}
        {status === "Not Available" && reason && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg flex items-start gap-2 border border-border/30"
          >
            <Info
              className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/70"
              aria-hidden="true"
            />
            <p className="leading-relaxed">{reason}</p>
          </motion.div>
        )}

        {/* Interactive or Display controls */}
        {isInteractive ? (
          <InteractiveControls
            employeeId={employee.id}
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
  employeeId: string;
  currentStatus: AttendanceStatus;
  onSetStatus: (status: AttendanceStatus) => void;
  onMarkUnavailable: () => void;
}) => {
  // [LOGIC PRESERVED] - Controls array unchanged
  const controls: AttendanceStatus[] = [
    "Present",
    "Absent",
    "Missed",
    "Not Available",
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-muted/50 p-1.5 rounded-xl border border-border/30">
      <LayoutGroup id={`controls-${employeeId}`}>
        {controls.map((status) => {
          const isActive = currentStatus === status;
          const { label, icon: Icon, className } = statusConfig[status];
          return (
            <TooltipProvider key={status} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* [LOGIC PRESERVED] - Click handlers unchanged */}
                  <motion.button
                    onClick={() =>
                      status === "Not Available"
                        ? onMarkUnavailable()
                        : onSetStatus(status)
                    }
                    className={cn(
                      "relative h-9 px-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center",
                      !isActive &&
                        "hover:bg-background/80 text-muted-foreground"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-pill"
                        className={cn(
                          "absolute inset-0 rounded-lg border shadow-sm",
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
                      className="relative z-10 flex items-center gap-1"
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sm:hidden">
                        {status === "Not Available" ? "N/A" : label}
                      </span>
                    </motion.span>
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {status}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </LayoutGroup>
    </div>
  );
};

const StatusDisplay = ({ status }: { status: AttendanceStatus }) => {
  const { label, icon: Icon, className } = statusConfig[status];
  return (
    <div
      className={cn(
        "h-10 px-4 text-sm font-semibold rounded-lg flex items-center justify-center border shadow-sm",
        className
      )}
    >
      <Icon className="h-4 w-4 mr-2" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
};
