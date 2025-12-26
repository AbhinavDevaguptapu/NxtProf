import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2, Info } from "lucide-react";
import { usePeerFeedbackLock } from "@/features/peer-feedback/hooks/usePeerFeedbackLock";
import FeedbackCard from "@/features/peer-feedback/components/FeedbackCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { calculateOverallRating } from "@/features/peer-feedback/utils/ratingUtils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GivenFeedback {
  id: string;
  giverId: string;
  targetId: string;
  projectOrTask: string;
  workEfficiency: number;
  easeOfWork: number;
  remarks: string;
  createdAt: {
    toDate: () => Date;
  };
  type: "direct" | "requested";
}

interface Employee {
  id: string;
  name: string;
}

const AdminPeerFeedback = () => {
  const [allFeedback, setAllFeedback] = useState<GivenFeedback[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"given" | "received">("received");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const {
    isLocked,
    isLoading: isLoadingLock,
    toggleLock,
  } = usePeerFeedbackLock();

  useEffect(() => {
    // Listener for employee names
    const unsubEmployees = onSnapshot(
      collection(db, "employees"),
      (snapshot) => {
        const empList: Employee[] = [];
        snapshot.forEach((doc) => {
          empList.push({ id: doc.id, name: doc.data().name || "Unknown" });
        });
        setEmployees(empList.sort((a, b) => a.name.localeCompare(b.name)));
      }
    );

    // Listener for feedback
    const q = query(
      collection(db, "givenPeerFeedback"),
      orderBy("createdAt", "desc")
    );
    const unsubFeedback = onSnapshot(
      q,
      (snapshot) => {
        const fetchedFeedback: GivenFeedback[] = [];
        snapshot.forEach((doc) => {
          fetchedFeedback.push({ id: doc.id, ...doc.data() } as GivenFeedback);
        });
        setAllFeedback(fetchedFeedback);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching peer feedback:", error);
        toast.error("Failed to load peer feedback.");
        setIsLoading(false);
      }
    );

    return () => {
      unsubEmployees();
      unsubFeedback();
    };
  }, []);

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    allFeedback.forEach((fb) => {
      months.add(format(fb.createdAt.toDate(), "yyyy-MM"));
    });
    const sortedMonths = Array.from(months).sort((a, b) => b.localeCompare(a));
    const currentMonth = format(new Date(), "yyyy-MM");
    if (sortedMonths.includes(currentMonth)) {
      setSelectedMonth(currentMonth);
    }
    return sortedMonths;
  }, [allFeedback]);

  const filteredFeedback = useMemo(() => {
    let feedback = allFeedback;

    // Filter by month
    if (selectedMonth !== "all") {
      feedback = feedback.filter(
        (item) => format(item.createdAt.toDate(), "yyyy-MM") === selectedMonth
      );
    }

    // Filter by employee
    if (selectedEmployeeId !== "all") {
      if (viewMode === "given") {
        feedback = feedback.filter(
          (item) => item.giverId === selectedEmployeeId
        );
      } else {
        feedback = feedback.filter(
          (item) => item.targetId === selectedEmployeeId
        );
      }
    }

    return feedback;
  }, [allFeedback, selectedEmployeeId, viewMode, selectedMonth]);

  const overallRating = useMemo(() => {
    const feedbackWithSubmittedAt = filteredFeedback.map((item) => ({
      ...item,
      submittedAt: item.createdAt.toDate().toISOString(),
    }));
    return calculateOverallRating(feedbackWithSubmittedAt);
  }, [filteredFeedback]);

  const employeeMap = useMemo(() => {
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp.name;
      return acc;
    }, {} as Record<string, string>);
  }, [employees]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Loading all feedback...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Peer Feedback (Real-time)</CardTitle>
        <CardDescription>
          Filter the feedback records by selecting an employee.
        </CardDescription>
        <div className="pt-4 flex flex-col gap-4">
          {selectedEmployeeId !== "all" && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                Overall Rating ({viewMode === "given" ? "Given" : "Received"})
              </h3>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-primary">
                  {overallRating.averageRating.toFixed(2)}
                </span>{" "}
                average |{" "}
                <span className="font-bold text-primary">
                  {overallRating.finalRating} ★
                </span>{" "}
                final rating from {overallRating.totalEntries} entries.
              </p>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <Switch
              id="feedback-lock"
              checked={isLocked}
              onCheckedChange={toggleLock}
              disabled={isLoadingLock}
            />
            <Label htmlFor="feedback-lock">
              Lock Peer Feedback Submissions
            </Label>
          </div>
          {isLocked && (
            <Alert variant="destructive" className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Feedback submissions are temporarily disabled.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex gap-4 flex-wrap">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by month..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {monthOptions.map((month) => (
                  <SelectItem key={month} value={month}>
                    {format(new Date(month), "MMMM yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Filter by employee..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEmployeeId !== "all" && (
              <Select
                value={viewMode}
                onValueChange={(value) =>
                  setViewMode(value as "given" | "received")
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Feedback Received</SelectItem>
                  <SelectItem value="given">Feedback Given</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] w-full">
          <div className="space-y-4">
            {filteredFeedback.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <p>No feedback found for the selected filters.</p>
              </div>
            ) : (
              filteredFeedback.map((item) => (
                <FeedbackCard
                  key={item.id}
                  item={{
                    ...item,
                    submittedAt: item.createdAt.toDate().toISOString(),
                  }}
                  isAdminView={true}
                  giverName={employeeMap[item.giverId] || "Unknown"}
                  receiverName={employeeMap[item.targetId] || "Unknown"}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AdminPeerFeedback;
