/**
 * @file FeedbackPage.tsx
 * @description This file contains the main feedback dashboard page for non-admin users.
 * It handles fetching and displaying user-specific feedback data, including quantitative charts
 * and qualitative AI-generated summaries. The user can filter the data by various timeframes.
 *
 * @requires react
 * @requires react-router-dom
 * @requires firebase
 * @requires chart.js
 * @requires date-fns
 * @requires lucide-react
 * @requires framer-motion
 * @requires @/components/ui/* - ShadCN UI components
 * @requires @/context/* - Authentication contexts
 */

import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useUserAuth } from "@/context/UserAuthContext";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { db } from "@/integrations/firebase/client";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, query, where, getDocs } from "firebase/firestore";

// UI Components & Icons
import AppNavbar from "@/components/AppNavbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Sparkles,
  MessageSquare,
  Quote,
  Lightbulb,
  Calendar as CalendarIcon,
} from "lucide-react";

// Animation & Utilities
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { format, isSameDay } from "date-fns";
import { DateRange } from "react-day-picker";

// Charting Libraries
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

// --- TYPE DEFINITIONS ---
type EmployeeData = {
  name: string;
  firebaseUid: string;
  customEmployeeId: string;
};
type SummaryGraphData = {
  totalFeedbacks: number;
  avgUnderstanding: number;
  avgInstructor: number;
};
type TimeseriesGraphData = {
  labels: string[];
  understanding: (number | null)[];
  instructor: (number | null)[];
};
type PositiveFeedback = { quote: string; keywords: string[] };
type ImprovementArea = { theme: string; suggestion: string };
type FeedbackSummary = {
  totalFeedbacks: number;
  positiveFeedback: PositiveFeedback[];
  improvementAreas: ImprovementArea[];
  graphData: SummaryGraphData | null;
  graphTimeseries: TimeseriesGraphData | null;
};
export type ActiveFilter = {
  mode: "daily" | "monthly" | "specific" | "range" | "full";
  date?: Date;
  dateRange?: DateRange;
};

// --- CHILD COMPONENTS ---

/**
 * Renders the filter controls for the feedback dashboard.
 * @param {object} props - The component props.
 * @param {(filter: ActiveFilter) => void} props.onFilterChange - Callback function when a filter is applied.
 * @param {boolean} props.isFiltering - Indicates if data is currently being fetched.
 */
const FeedbackFilters = ({
  onFilterChange,
  isFiltering,
}: {
  onFilterChange: (filter: ActiveFilter) => void;
  isFiltering: boolean;
}) => {
  const [activeButton, setActiveButton] =
    useState<ActiveFilter["mode"]>("daily");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedDateRange, setSelectedDateRange] = useState<
    DateRange | undefined
  >(undefined);

  const isRangeInvalid =
    !selectedDateRange?.from ||
    !selectedDateRange?.to ||
    isSameDay(selectedDateRange.from, selectedDateRange.to);

  const handleFilterClick = (filter: ActiveFilter) => {
    setActiveButton(filter.mode);
    onFilterChange(filter);
  };

  return (
    <Card className="p-4">
      <CardHeader className="p-0 pb-4">
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <Button
          onClick={() => handleFilterClick({ mode: "daily", date: new Date() })}
          variant={activeButton === "daily" ? "default" : "outline"}
          disabled={isFiltering}
          className="w-full sm:w-auto"
        >
          Today
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={activeButton === "specific" ? "default" : "outline"}
              className="w-full sm:w-[200px] justify-start text-left font-normal"
              disabled={isFiltering}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate && activeButton === "specific" ? (
                format(selectedDate, "PPP")
              ) : (
                <span>Specific Date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                if (date) handleFilterClick({ mode: "specific", date });
              }}
              disabled={{ after: new Date() }}
            />
          </PopoverContent>
        </Popover>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <Select
            value={String(selectedMonth)}
            onValueChange={(v) => setSelectedMonth(Number(v))}
            disabled={isFiltering}
          >
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...Array(12).keys()].map((i) => (
                <SelectItem key={i} value={String(i)}>
                  {format(new Date(0, i), "MMMM")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
            disabled={isFiltering}
          >
            <SelectTrigger className="w-full sm:w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2025, 2024, 2023].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() =>
              handleFilterClick({
                mode: "monthly",
                date: new Date(selectedYear, selectedMonth, 1),
              })
            }
            variant={activeButton === "monthly" ? "default" : "outline"}
            disabled={isFiltering}
            className="w-full sm:w-auto"
          >
            View Month
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full sm:w-[260px] justify-start text-left font-normal",
                  !selectedDateRange && "text-muted-foreground"
                )}
                disabled={isFiltering}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDateRange?.from ? (
                  selectedDateRange.to ? (
                    <>
                      {format(selectedDateRange.from, "LLL dd")} -{" "}
                      {format(selectedDateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(selectedDateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                min={2}
                selected={selectedDateRange}
                onSelect={setSelectedDateRange}
                disabled={{ after: new Date() }}
              />
            </PopoverContent>
          </Popover>
          <Button
            onClick={() =>
              handleFilterClick({ mode: "range", dateRange: selectedDateRange })
            }
            variant={activeButton === "range" ? "default" : "outline"}
            disabled={isFiltering || isRangeInvalid}
            className="w-full sm:w-auto"
          >
            Apply Range
          </Button>
        </div>
        <Button
          onClick={() => handleFilterClick({ mode: "full" })}
          variant={activeButton === "full" ? "default" : "outline"}
          disabled={isFiltering}
          className="w-full sm:w-auto"
        >
          Full History
        </Button>
      </CardContent>
    </Card>
  );
};

/**
 * Renders the quantitative feedback charts.
 * @param {{ summary: FeedbackSummary | null }} props
 */
const QuantitativeFeedback = ({
  summary,
}: {
  summary: FeedbackSummary | null;
}) => {
  if (!summary)
    return (
      <p className="text-muted-foreground text-center pt-8">
        No chart data available for this view.
      </p>
    );

  // Line Chart for Timeseries Data
  if (summary.graphTimeseries) {
    const lineChartData = {
      labels: summary.graphTimeseries.labels,
      datasets: [
        {
          label: "Understanding",
          data: summary.graphTimeseries.understanding,
          borderColor: "rgb(54, 162, 235)",
          backgroundColor: "rgba(54, 162, 235, 0.5)",
          tension: 0.3,
          datalabels: { display: false },
        },
        {
          label: "Instructor",
          data: summary.graphTimeseries.instructor,
          tension: 0.3,
          borderColor: "rgb(255, 99, 132)",
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          datalabels: {
            display: true,
            align: "top" as const,
            anchor: "end" as const,
            formatter: (value: number) => (value > 0 ? value.toFixed(1) : ""),
          },
        },
      ],
    };
    const lineChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" as const },
        title: {
          display: true,
          text: "Daily Average Ratings",
          font: { size: 16 },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 5,
          title: { display: true, text: "Rating (out of 5)" },
        },
      },
    };
    return <Line options={lineChartOptions} data={lineChartData} />;
  }

  // Bar Chart for Summary Data
  if (summary.graphData) {
    const barChartData = {
      labels: ["Understanding", "Instructor"],
      datasets: [
        {
          label: "Average Rating",
          data: [
            summary.graphData.avgUnderstanding,
            summary.graphData.avgInstructor,
          ],
          borderWidth: 1,
          backgroundColor: [
            "rgba(54, 162, 235, 0.6)",
            "rgba(75, 192, 192, 0.6)",
          ],
          borderColor: ["rgba(54, 162, 235, 1)", "rgba(75, 192, 192, 1)"],
        },
      ],
    };
    const barChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Average Ratings", font: { size: 16 } },
        datalabels: {
          display: true,
          anchor: "end" as const,
          align: "top" as const,
          formatter: (value: number) => value.toFixed(2),
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          min: 0,
          max: 5,
          title: { display: true, text: "Rating (out of 5)" },
        },
      },
    };
    return <Bar options={barChartOptions} data={barChartData} />;
  }

  return (
    <p className="text-muted-foreground text-center pt-8">
      No chart data available for this view.
    </p>
  );
};

/**
 * Renders a card for qualitative feedback (Positive or Improvement).
 * @param {{ title: string, icon: React.ReactNode, feedback: (PositiveFeedback[] | ImprovementArea[]), type: 'positive' | 'improvement' }} props
 */
const QualitativeFeedbackCard = ({
  title,
  icon,
  feedback,
  type,
}: {
  title: string;
  icon: React.ReactNode;
  feedback: any[] | undefined;
  type: "positive" | "improvement";
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {icon} {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {feedback?.length ? (
        feedback.map((item, i) => (
          <div key={i} className="p-3 bg-secondary rounded-lg border">
            {type === "positive" ? (
              <>
                <p className="italic flex gap-2">
                  <Quote className="h-4 w-4 shrink-0" /> {item.quote}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.keywords?.map((kw: string) => (
                    <Badge key={kw} variant="secondary">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="font-semibold">{item.theme}</p>
                <p className="text-sm text-muted-foreground">
                  {item.suggestion}
                </p>
              </>
            )}
          </div>
        ))
      ) : (
        <p className="text-muted-foreground">
          {type === "positive"
            ? "No positive comments found."
            : "No specific improvement areas found."}
        </p>
      )}
    </CardContent>
  </Card>
);

/**
 * Renders the main content of the dashboard, handling loading, error, and data states.
 * @param {{ isLoading: boolean, error: string | null, summary: FeedbackSummary | null }} props
 */
const DashboardContent = ({
  isLoading,
  error,
  summary,
}: {
  isLoading: boolean;
  error: string | null;
  summary: FeedbackSummary | null;
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 py-10">{error}</div>;
  }

  if (!summary || summary.totalFeedbacks === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        No feedback data found for this period.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare /> Quantitative Feedback
          </CardTitle>
          <CardDescription>
            Total Feedbacks Given: {summary.totalFeedbacks ?? 0}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] w-full">
          <QuantitativeFeedback summary={summary} />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QualitativeFeedbackCard
          title="AI Summary: Positive Feedback"
          icon={<Sparkles />}
          feedback={summary.positiveFeedback}
          type="positive"
        />
        <QualitativeFeedbackCard
          title="AI Summary: Areas for Improvement"
          icon={<Lightbulb />}
          feedback={summary.improvementAreas}
          type="improvement"
        />
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function FeedbackPage() {
  const { user, loading: userAuthLoading } = useUserAuth();
  const { admin, initialized: adminInitialized } = useAdminAuth();

  const [pageError, setPageError] = useState<string | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(true);
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);

  // Redirect admin users away from this page
  if (adminInitialized && admin) return <Navigate to="/admin" replace />;

  // Fetch the logged-in user's employee profile
  useEffect(() => {
    if (userAuthLoading || !user?.uid) return;
    const fetchEmployeeProfile = async () => {
      try {
        const q = query(
          collection(db, "employees"),
          where("uid", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setEmployeeData({
            name: doc.data().name,
            firebaseUid: doc.id,
            customEmployeeId: doc.data().employeeId,
          });
        } else {
          setPageError("Could not find your employee profile.");
        }
      } catch (error) {
        console.error("Error fetching employee profile:", error);
        setPageError("An error occurred while fetching your profile.");
      }
    };
    fetchEmployeeProfile();
  }, [user, userAuthLoading]);

  // Main data fetching function, memoized with useCallback
  const fetchFeedbackSummary = useCallback(
    async (filter: ActiveFilter) => {
      if (!employeeData?.firebaseUid) return;

      setIsFeedbackLoading(true);
      setPageError(null);

      try {
        const functions = getFunctions();
        const getFeedbackSummaryCallable = httpsCallable(
          functions,
          "getFeedbackSummary"
        );
        const params: any = {
          employeeId: employeeData.firebaseUid,
          timeFrame: filter.mode,
        };

        if (
          (filter.mode === "daily" || filter.mode === "specific") &&
          filter.date
        ) {
          // Format as YYYY-MM-DD to avoid timezone-related date shifts.
          // The backend's parseISO correctly handles this format.
          params.date = format(filter.date, "yyyy-MM-dd");
        } else if (filter.mode === "monthly" && filter.date) {
          params.date = new Date(
            Date.UTC(filter.date.getFullYear(), filter.date.getMonth(), 1)
          ).toISOString();
        } else if (
          filter.mode === "range" &&
          filter.dateRange?.from &&
          filter.dateRange?.to
        ) {
          params.startDate = format(filter.dateRange.from, "yyyy-MM-dd");
          params.endDate = format(filter.dateRange.to, "yyyy-MM-dd");
        }

        const result = await getFeedbackSummaryCallable(params);
        setSummary(result.data as FeedbackSummary);
      } catch (err) {
        console.error("Error fetching feedback summary:", err);
        setPageError(
          "Failed to load your feedback summary. Please try again later."
        );
      } finally {
        setIsFeedbackLoading(false);
      }
    },
    [employeeData]
  );

  // Initial data fetch for today's feedback once employee data is available
  useEffect(() => {
    if (employeeData) {
      fetchFeedbackSummary({ mode: "daily", date: new Date() });
    }
  }, [employeeData, fetchFeedbackSummary]);

  // Top-level loading state until authentication and initial profile fetch are complete
  if (userAuthLoading || (!employeeData && !pageError)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Your Feedback Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back,{" "}
                <strong>{employeeData?.name || "Employee"}</strong>! Here's your
                latest performance summary.
              </p>
            </div>
            <FeedbackFilters
              onFilterChange={fetchFeedbackSummary}
              isFiltering={isFeedbackLoading}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <DashboardContent
              isLoading={isFeedbackLoading}
              error={pageError}
              summary={summary}
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
