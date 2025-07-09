import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import AppNavbar from "@/components/AppNavbar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  Loader2,
  Sparkles,
  MessageSquare,
  Quote,
  Lightbulb,
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { getFunctions, httpsCallable } from "firebase/functions";
import { motion } from "framer-motion";
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
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";

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
type EmployeeData = { name: string; employeeId: string };
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
type ActiveFilter = {
  mode: "daily" | "monthly" | "specific" | "range" | "full";
  date?: Date;
  dateRange?: DateRange;
};

// --- FILTER COMPONENT ---
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

export default function AdminEmployeeDetail() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);

  // Fetch employee's static details once
  useEffect(() => {
    if (!employeeId) return;
    const fetchEmployeeDetails = async () => {
      const employeeDocRef = doc(db, "employees", employeeId);
      const docSnap = await getDoc(employeeDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEmployeeData({
          name: data.name || "Unknown Name",
          employeeId: data.employeeId || "N/A",
        });
      } else {
        setError("Could not find employee details.");
      }
    };
    fetchEmployeeDetails();
  }, [employeeId]);

  // Main data fetching function
  const fetchSummary = useCallback(
    async (filter: ActiveFilter) => {
      if (!employeeId) return;
      setLoading(true);
      setError(null);
      try {
        const functions = getFunctions();
        const getFeedbackSummary = httpsCallable(
          functions,
          "getFeedbackSummary"
        );
        const params: any = { employeeId, timeFrame: filter.mode };

        if (filter.mode === "monthly" && filter.date) {
          params.date = new Date(
            Date.UTC(filter.date.getFullYear(), filter.date.getMonth(), 1)
          ).toISOString();
        } else if (filter.mode === "daily" || filter.mode === "specific") {
          // Format as YYYY-MM-DD to avoid timezone-related date shifts.
          // The backend's parseISO correctly handles this format.
          if (filter.date)
            params.date = format(filter.date, "yyyy-MM-dd");
        } else if (
          filter.mode === "range" &&
          filter.dateRange?.from &&
          filter.dateRange?.to
        ) {
          params.startDate = format(filter.dateRange.from, "yyyy-MM-dd");
          params.endDate = format(filter.dateRange.to, "yyyy-MM-dd");
        }

        const result = await getFeedbackSummary(params);
        setSummary(result.data as FeedbackSummary);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load feedback data."
        );
      } finally {
        setLoading(false);
      }
    },
    [employeeId]
  );

  // Initial fetch for "Today"
  useEffect(() => {
    fetchSummary({ mode: "daily", date: new Date() });
  }, [fetchSummary]);

  // --- RENDER LOGIC ---

  const renderChart = () => {
    if (!summary) return null;

    // Render LINE chart for range/full history
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
            datalabels: {
              display: false,
            },
          },
          {
            label: "Instructor",
            data: summary.graphTimeseries.instructor,
            borderColor: "rgb(255, 99, 132)",
            backgroundColor: "rgba(255, 99, 132, 0.5)",
            tension: 0.3,
            datalabels: {
              display: true,
              align: "top" as const,
              anchor: "end" as const,
              color: "#555",
              font: { weight: "bold" as const, size: 10 },
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
            text: `Daily Average Ratings`,
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

    // Render BAR chart for daily/monthly/specific summaries
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
            backgroundColor: [
              "rgba(54, 162, 235, 0.6)",
              "rgba(75, 192, 192, 0.6)",
            ],
            borderColor: ["rgba(54, 162, 235, 1)", "rgba(75, 192, 192, 1)"],
            borderWidth: 1,
          },
        ],
      };
      const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: `Average Ratings`, font: { size: 16 } },
          datalabels: {
            display: true,
            anchor: "end" as const,
            align: "top" as const,
            color: "#333",
            font: { weight: "bold" as const },
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
      <p className="text-muted-foreground">
        No chart data available for this view.
      </p>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            {renderChart()}
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles /> AI Summary: Positive Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.positiveFeedback?.length ? (
                summary.positiveFeedback.map((fb, i) => (
                  <div key={i} className="p-3 bg-secondary rounded-lg border">
                    <p className="italic flex gap-2">
                      <Quote className="h-4 w-4 shrink-0" />
                      {fb.quote}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {fb.keywords?.map((kw) => (
                        <Badge key={kw} variant="secondary">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p>No positive comments found.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb /> AI Summary: Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.improvementAreas?.length ? (
                summary.improvementAreas.map((item, i) => (
                  <div key={i} className="p-3 bg-secondary rounded-lg border">
                    <p className="font-semibold">{item.theme}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.suggestion}
                    </p>
                  </div>
                ))
              ) : (
                <p>No specific improvement areas found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

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
              <h1 className="text-3xl font-bold">Feedback Dashboard</h1>
              {employeeData ? (
                <p className="text-muted-foreground">
                  Viewing data for: <strong>{employeeData.name}</strong> (ID:{" "}
                  {employeeData.employeeId})
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Loading employee details...
                </p>
              )}
            </div>
            <FeedbackFilters
              onFilterChange={fetchSummary}
              isFiltering={loading}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
