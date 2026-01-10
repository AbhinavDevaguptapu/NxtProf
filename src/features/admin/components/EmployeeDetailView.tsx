import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MoreVertical,
  Edit,
  Archive,
  Trash2,
  Loader2,
  User,
  Star,
  Calendar,
  TrendingUp,
  Activity,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import EmployeeAvatar from "./EmployeeAvatar";
import { getFunctions, httpsCallable } from "firebase/functions";
import { format, subMonths } from "date-fns";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { getUserFriendlyErrorMessage } from "@/lib/errorHandler";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

// --- TYPE DEFINITIONS ---
interface Employee {
  id: string;
  name: string;
  email: string;
  employeeId?: string;
  feedbackSheetUrl?: string;
  isAdmin?: boolean;
  isCoAdmin?: boolean;
  role?: string;
}

interface AttendanceStats {
  present: number;
  absent: number;
  missed: number;
  unavailable: number;
}

interface PerformanceData {
  standupAttendance: AttendanceStats;
  learningAttendance: AttendanceStats;
  monthlyChart: { standupDays: number; learningDays: number };
  presenceChart: AttendanceStats & { presencePercentage: string };
  workingDays: number;
}

interface EditableEmployeeData {
  name: string;
  employeeId: string;
  feedbackSheetUrl: string;
}

// Firestore update function
const updateEmployee = async (
  id: string,
  data: Partial<EditableEmployeeData>
): Promise<void> => {
  const employeeRef = doc(db, "employees", id);
  await updateDoc(employeeRef, data);
};

// --- CHART COMPONENTS ---

const PresencePieChart = ({
  data,
  title,
}: {
  data: AttendanceStats;
  title: string;
}) => {
  const allLabels = ["Present", "Absent", "Missed", "Not Available"];
  const allData = [data.present, data.absent, data.missed, data.unavailable];
  const allColors = ["#059669", "#D97706", "#DC2626", "#4B5563"];

  const filteredLabels = allLabels.filter((_, index) => allData[index] > 0);
  const filteredData = allData.filter((value) => value > 0);
  const filteredColors = allColors.filter((_, index) => allData[index] > 0);

  const chartData = {
    labels: filteredLabels,
    datasets: [
      {
        data: filteredData,
        backgroundColor: filteredColors,
        borderColor: "#fff",
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: "bold" as const,
        },
        padding: {
          bottom: 15,
        },
      },
      legend: {
        position: "bottom" as const,
        labels: {
          padding: 20,
          font: {
            size: 14,
          },
        },
      },
      datalabels: {
        display: true,
        color: "#fff",
        font: {
          size: 14,
          weight: "bold" as const,
        },
        formatter: (value) => {
          return value > 0 ? value : "";
        },
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#1f2937",
        bodyColor: "#4b5563",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        callbacks: {
          label: function (context: any) {
            let label = context.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed !== null) {
              label += context.parsed;
            }
            return label;
          },
        },
      },
    },
  };

  if (filteredData.length === 0) {
    return (
      <div className="h-80 flex flex-col items-center justify-center text-center">
        <div className="text-muted-foreground mb-2">{title}</div>
        <p className="text-sm text-gray-500">
          No attendance data for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="h-80">
      <Pie data={chartData} options={options} />
    </div>
  );
};

// --- Feedback Tab ---

interface Feedback {
  date: string;
  understanding: number;
  instructor: number;
  comment: string;
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center">
    {Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.round(rating)
            ? "text-amber-500 fill-amber-500"
            : "text-gray-300"
        }`}
      />
    ))}
    <span className="ml-2 text-sm text-muted-foreground">
      {rating.toFixed(1)}
    </span>
  </div>
);

const FeedbackTabContent = ({
  employeeId,
  month,
}: {
  employeeId: string;
  month: string;
}) => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      if (!employeeId || !month) return;
      setLoading(true);
      setError(null);
      try {
        const functions = getFunctions();
        const getRawFeedback = httpsCallable<any, Feedback[]>(
          functions,
          "getRawFeedback"
        );
        const result = await getRawFeedback({
          employeeId,
          timeFrame: "monthly",
          date: `${month}-01`,
        });
        setFeedback(result.data);
      } catch (err) {
        console.error("Error fetching feedback:", err);
        setError("Failed to load feedback.");
      } finally {
        setLoading(false);
      }
    };
    fetchFeedback();
  }, [employeeId, month]);

  const averageRating =
    feedback.length > 0
      ? feedback.reduce((acc, f) => acc + f.instructor, 0) / feedback.length
      : 0;

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-4 w-1/3 mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-6 w-40" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <div className="text-destructive mb-2">{error}</div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (feedback.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Qualitative Feedback</h2>
          <p className="text-sm text-muted-foreground">
            Feedback for {format(new Date(`${month}-01`), "MMMM yyyy")}
          </p>
        </div>
        <div className="py-12 text-center border rounded-lg">
          <div className="text-muted-foreground mb-4">
            No feedback submitted for this month.
          </div>
          <Calendar className="h-12 w-12 text-muted-foreground opacity-40 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 px-6 py-4 border-b">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Qualitative Feedback</h2>
          <p className="text-sm text-muted-foreground">
            Feedback for {format(new Date(`${month}-01`), "MMMM yyyy")}
          </p>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Average Instructor Rating
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="text-3xl font-bold text-gray-900">
              {averageRating.toFixed(2)}
            </div>
            <StarRating rating={averageRating} />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-4 p-6">
        <h3 className="font-medium text-gray-700">Feedback Sessions</h3>
        {feedback.map((item, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                <div className="text-sm text-muted-foreground">
                  {format(new Date(item.date), "MMM dd, yyyy")}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StarRating rating={item.instructor} />
                </div>
              </div>
              <div className="p-4">
                <p className="text-gray-800">
                  {item.comment || "No comment provided."}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// --- HEADER COMPONENT ---
const EmployeeDetailHeader = ({
  employee,
  onActionComplete,
}: {
  employee: Employee;
  onActionComplete: () => void;
}) => {
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<EditableEmployeeData>({
    name: "",
    employeeId: "",
    feedbackSheetUrl: "",
  });

  useEffect(() => {
    if (employee) {
      setEditFormData({
        name: employee.name || "",
        employeeId: employee.employeeId || "",
        feedbackSheetUrl: employee.feedbackSheetUrl || "",
      });
    }
  }, [employee]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleUpdateEmployee = async () => {
    if (!editFormData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    setProcessingAction("update");
    try {
      await updateEmployee(employee.id, editFormData);
      toast({
        title: "Profile Updated",
        description: `${employee.name}'s profile has been updated successfully.`,
        className: "bg-green-500 text-white",
      });
      onActionComplete();
      setIsEditDialogOpen(false);
    } catch (err) {
      const message = getUserFriendlyErrorMessage(
        err,
        "Could not update profile. Please try again."
      );
      toast({
        title: "Update Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRoleChange = async (
    action: "promote" | "demote" | "promoteCoAdmin" | "demoteCoAdmin"
  ) => {
    setProcessingAction(action);
    let fnName = "";
    let actionLabel = "";
    switch (action) {
      case "promote":
        fnName = "addAdminRole";
        actionLabel = "promoted to Admin";
        break;
      case "demote":
        fnName = "removeAdminRole";
        actionLabel = "removed from Admin";
        break;
      case "promoteCoAdmin":
        fnName = "addCoAdminRole";
        actionLabel = "promoted to Co-Admin";
        break;
      case "demoteCoAdmin":
        fnName = "removeCoAdminRole";
        actionLabel = "removed from Co-Admin";
        break;
    }
    try {
      const functions = getFunctions();
      const callable = httpsCallable(functions, fnName);
      await callable({ email: employee.email });

      toast({
        title: "Role Updated",
        description: `${employee.name} has been ${actionLabel}.`,
        className: "bg-blue-500 text-white",
      });
      onActionComplete();
    } catch (err) {
      const message = getUserFriendlyErrorMessage(
        err,
        `Could not change role. Please try again.`
      );
      toast({
        title: "Role Change Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDeleteEmployee = async () => {
    setProcessingAction("delete");
    try {
      const functions = getFunctions();
      const deleteFn = httpsCallable(functions, "deleteEmployee");
      await deleteFn({ uid: employee.id });
      toast({
        title: "Employee Deleted",
        description: `${employee.name} has been permanently removed from the system.`,
        className: "bg-green-500 text-white",
      });
      onActionComplete();
    } catch (err) {
      const message = getUserFriendlyErrorMessage(
        err,
        `Could not delete this employee. Please try again.`
      );
      toast({
        title: "Deletion Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleArchiveEmployee = async () => {
    setProcessingAction("archive");
    try {
      const functions = getFunctions();
      const archiveFn = httpsCallable(functions, "archiveEmployee");
      await archiveFn({ uid: employee.id });
      toast({
        title: "Employee Archived",
        description: `${employee.name} has been archived successfully.`,
        className: "bg-green-500 text-white",
      });
      onActionComplete();
    } catch (err) {
      const message = getUserFriendlyErrorMessage(
        err,
        `Could not archive this employee. Please try again.`
      );
      toast({
        title: "Archive Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const renderActionButtons = (isDropdown: boolean) => {
    const props: any = {};
    if (isDropdown) {
      props.onSelect = (e: Event) => e.preventDefault();
    }

    const TriggerComponent = isDropdown ? DropdownMenuItem : Button;

    return (
      <>
        {/* Edit Action */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <TriggerComponent
              variant={isDropdown ? undefined : "outline"}
              size={isDropdown ? undefined : "sm"}
              className="gap-2"
            >
              <Edit className="h-4 w-4" /> Edit
            </TriggerComponent>
          </DialogTrigger>
          <DialogContent>
            {/* ... Edit dialog content is unchanged ... */}
            <DialogHeader>
              <DialogTitle>Edit {employee.name}</DialogTitle>
              <DialogDescription>
                Make changes to the employee&rsquo;s profile. Click save when
                you&rsquo;re done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editFormData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  value={editFormData.employeeId}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="feedbackSheetUrl">Feedback URL</Label>
                <Input
                  id="feedbackSheetUrl"
                  value={editFormData.feedbackSheetUrl}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleUpdateEmployee}
                disabled={processingAction === "update"}
              >
                {processingAction === "update" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin/Co-Admin Role Actions */}
        {employee.isAdmin ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <TriggerComponent
                {...props}
                className="gap-2 text-orange-600 focus:text-orange-700"
                variant={isDropdown ? undefined : "outline"}
                size={isDropdown ? undefined : "sm"}
              >
                {processingAction === "demote" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldOff className="h-4 w-4" />
                )}
                Remove Admin
              </TriggerComponent>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Admin Rights?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will revoke admin privileges for {employee.name}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleRoleChange("demote")}>
                  Yes, Remove Admin
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <TriggerComponent
                {...props}
                className="gap-2 text-blue-600 focus:text-blue-700"
                variant={isDropdown ? undefined : "outline"}
                size={isDropdown ? undefined : "sm"}
              >
                {processingAction === "promote" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Make Admin
              </TriggerComponent>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Make {employee.name} an Admin?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will grant admin privileges to {employee.email}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleRoleChange("promote")}>
                  Promote to Admin
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Co-Admin Management */}
        {employee.isCoAdmin ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <TriggerComponent
                {...props}
                className="gap-2 text-orange-600 focus:text-orange-700"
                variant={isDropdown ? undefined : "outline"}
                size={isDropdown ? undefined : "sm"}
              >
                {processingAction === "demoteCoAdmin" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldOff className="h-4 w-4" />
                )}
                Remove Co-Admin
              </TriggerComponent>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Co-Admin Rights?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will revoke co-admin privileges for {employee.name}.
                  They&rsquo;ll retain standard employee access.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleRoleChange("demoteCoAdmin")}
                >
                  Yes, Remove Co-Admin
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <TriggerComponent
                {...props}
                className="gap-2 text-orange-600 focus:text-orange-700"
                variant={isDropdown ? undefined : "outline"}
                size={isDropdown ? undefined : "sm"}
              >
                {processingAction === "promoteCoAdmin" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {employee.isAdmin ? "Also Co-Admin" : "Make Co-Admin"}
              </TriggerComponent>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {employee.isAdmin
                    ? "Add Co-Admin Rights?"
                    : `Make ${employee.name} a Co-Admin?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {employee.isAdmin
                    ? `This will grant ${employee.name} co-admin privileges in addition to their admin role.`
                    : `This will grant co-admin privileges to ${employee.email}, allowing them to manage both sessions and their own learning points.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleRoleChange("promoteCoAdmin")}
                >
                  {employee.isAdmin ? "Add Rights" : "Promote to Co-Admin"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Separator for dropdown */}
        {isDropdown && <DropdownMenuSeparator />}

        {/* Archive Action */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <TriggerComponent
              {...props}
              className="gap-2"
              variant={isDropdown ? undefined : "outline"}
              size={isDropdown ? undefined : "sm"}
              disabled={
                employee.id === admin?.uid || processingAction === "archive"
              }
            >
              {processingAction === "archive" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              Archive
            </TriggerComponent>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive {employee.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will move the employee to the archived list.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchiveEmployee}>
                Yes, Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Action */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <TriggerComponent
              {...props}
              className="gap-2 text-red-600 focus:text-red-700"
              variant={isDropdown ? undefined : "outline"}
              size={isDropdown ? undefined : "sm"}
              disabled={processingAction === "delete"}
            >
              {processingAction === "delete" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </TriggerComponent>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Permanently Delete {employee.name}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleDeleteEmployee}
              >
                Yes, Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b">
      <div className="flex items-center gap-4">
        <EmployeeAvatar name={employee.name} className="h-16 w-16 text-lg" />
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">
              {employee.name}
            </h1>
            {employee.isAdmin && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin
              </span>
            )}
            {employee.isCoAdmin && !employee.isAdmin && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold border border-orange-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Co-Admin
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{employee.email}</p>
          {employee.employeeId && (
            <p className="text-xs text-muted-foreground">
              ID: {employee.employeeId}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 w-full md:w-auto">
        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          {renderActionButtons(false)}
        </div>

        {/* Mobile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden ml-auto">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {renderActionButtons(true)}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

// --- MONTH SELECTOR (Minimalist) ---
const MonthSelector = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) => (
  <div className="flex items-center gap-2">
    <Calendar className="h-4 w-4 text-muted-foreground" />
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select month" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

// --- STATS CARDS (Minimalist) ---
const StatCard = ({
  title,
  value,
  icon: Icon,
  color = "text-gray-900",
}: {
  title: string;
  value: number | string;
  icon?: any;
  color?: string;
}) => (
  <Card className="overflow-hidden">
    <CardContent className="p-4 flex items-center">
      {Icon && (
        <Icon
          className={`h-5 w-5 mr-3 ${color.replace(
            "text-",
            "text-"
          )} opacity-70`}
        />
      )}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">
          {title}
        </p>
        <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      </div>
    </CardContent>
  </Card>
);

const StatCardSkeleton = () => (
  <Card className="overflow-hidden">
    <CardContent className="p-4 flex items-center">
      <Skeleton className="h-5 w-5 mr-3 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-12" />
      </div>
    </CardContent>
  </Card>
);

// --- MAIN COMPONENT ---
interface EmployeeDetailViewProps {
  employee: Employee;
  onActionComplete: () => void;
}

export default function EmployeeDetailView({
  employee,
  onActionComplete,
}: EmployeeDetailViewProps) {
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM")
  );
  const [performanceData, setPerformanceData] =
    useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      if (!employee.id || !selectedMonth) return;
      setLoading(true);
      setError(null);
      try {
        const functions = getFunctions();
        const getPerformanceSummary = httpsCallable<any, PerformanceData>(
          functions,
          "getEmployeePerformanceSummary"
        );
        const result = await getPerformanceSummary({
          employeeId: employee.id,
          month: selectedMonth,
        });
        setPerformanceData(result.data);
      } catch (err) {
        console.error("Error fetching performance data:", err);
        setError("Failed to load performance data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchPerformanceData();
  }, [employee.id, selectedMonth]);

  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
  });

  return (
    <div className="space-y-8 py-4">
      <EmployeeDetailHeader
        employee={employee}
        onActionComplete={onActionComplete}
      />

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Performance Overview
        </h2>
        <MonthSelector
          value={selectedMonth}
          onChange={setSelectedMonth}
          options={monthOptions}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : error ? (
        <Card className="p-6 text-center">
          <div className="text-destructive mb-2">{error}</div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </Card>
      ) : performanceData ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Working Days"
              value={performanceData.workingDays}
              icon={Calendar}
              color="text-gray-700"
            />
            <StatCard
              title="Overall Presence"
              value={`${performanceData.presenceChart.presencePercentage}%`}
              icon={User}
              color="text-green-600"
            />
            <StatCard
              title="Standup Attendance"
              value={`${Math.round(
                ((performanceData.standupAttendance.present +
                  performanceData.standupAttendance.absent +
                  performanceData.standupAttendance.unavailable) /
                  performanceData.workingDays) *
                  100
              )}%`}
              icon={Activity}
              color="text-blue-600"
            />
            <StatCard
              title="Learning Attendance"
              value={`${Math.round(
                ((performanceData.learningAttendance.present +
                  performanceData.learningAttendance.absent +
                  performanceData.learningAttendance.unavailable) /
                  performanceData.workingDays) *
                  100
              )}%`}
              icon={TrendingUp}
              color="text-purple-600"
            />
          </div>
        </>
      ) : null}

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Activity className="h-4 w-4" /> Performance
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <Star className="h-4 w-4" /> Feedback
          </TabsTrigger>
        </TabsList>
        <TabsContent value="performance" className="mt-2 space-y-6">
          {loading ? (
            <>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-1/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-1/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            </>
          ) : error ? (
            <Card className="p-6 text-center text-destructive">{error}</Card>
          ) : performanceData ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Presence Breakdown</CardTitle>
                  <CardDescription>
                    Comparison of attendance distribution for different
                    activities
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <PresencePieChart
                    data={performanceData.standupAttendance}
                    title="Standup Attendance"
                  />
                  <PresencePieChart
                    data={performanceData.learningAttendance}
                    title="Learning Hours Attendance"
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center">
              <div className="text-muted-foreground mb-4">
                No performance data available for this month.
              </div>
              <Calendar className="h-12 w-12 text-muted-foreground opacity-40 mx-auto" />
            </Card>
          )}
        </TabsContent>
        <TabsContent value="feedback" className="mt-2">
          <Card>
            <CardContent className="p-0">
              <FeedbackTabContent
                employeeId={employee.id}
                month={selectedMonth}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
