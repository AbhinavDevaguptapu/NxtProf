import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, UserMinus, UserX, Info } from "lucide-react";
import type { Employee, AttendanceStatus } from "../types";

type AttendanceCardProps = {
    employee: Employee;
    status: AttendanceStatus;
    reason?: string;
    onSetStatus: (id: string, s: AttendanceStatus) => void;
    onMarkUnavailable: (e: Employee) => void;
    isInteractive: boolean;
};

export const AttendanceCard = ({ employee, status, reason, onSetStatus, onMarkUnavailable, isInteractive }: AttendanceCardProps) => {
    const getBadgeStyle = () => {
        switch (status) {
            case "Present": return "bg-green-600 text-white";
            case "Absent": return "bg-red-600 text-white";
            case "Missed": return "bg-yellow-500 text-white";
            case "Not Available": return "bg-gray-500 text-white";
            default: return "bg-gray-200 text-gray-800";
        }
    };

    return (
        <Card className="flex flex-col justify-between h-full transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">{employee.name}</CardTitle>
                    <CardDescription className="text-xs">{employee.email}</CardDescription>
                </div>
                <Badge className={cn("border-transparent", getBadgeStyle())}>
                    {status === "Not Available" ? "N/A" : status}
                </Badge>
            </CardHeader>
            <CardContent className="pt-2 flex-grow flex flex-col">
                {status === "Not Available" && reason && (
                    <div className="flex-grow text-sm text-muted-foreground mb-4">
                        <div className="border-l-2 pl-3 flex items-start gap-2">
                            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <p className="italic">{reason}</p>
                        </div>
                    </div>
                )}
                <div className="flex-grow"></div>
                {isInteractive && (
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                        <Button size="sm" variant={status === "Present" ? "default" : "outline"} onClick={() => onSetStatus(employee.id, "Present")}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />Present
                        </Button>
                        <Button size="sm" variant={status === "Absent" ? "destructive" : "outline"} onClick={() => onSetStatus(employee.id, "Absent")}>
                            <UserMinus className="h-4 w-4 mr-1" />Absent
                        </Button>
                        <Button size="sm" variant={status === "Missed" ? "secondary" : "outline"} className={cn(status === 'Missed' && "bg-yellow-500 hover:bg-yellow-600 text-white")} onClick={() => onSetStatus(employee.id, "Missed")}>
                            <UserX className="h-4 w-4 mr-1" />Missed
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => onMarkUnavailable(employee)}>N/A</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
