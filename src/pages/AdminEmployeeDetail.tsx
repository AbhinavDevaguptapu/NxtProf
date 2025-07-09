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
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
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

type ChartData = {
  totalFeedbacks: number;
  graphData: {
    totalFeedbacks: number;
    avgUnderstanding: number;
    avgInstructor: number;
  } | null;
  graphTimeseries: {
    labels: string[];
    understanding: (number | null)[];
    instructor: (number | null)[];
  } | null;
};

type AiSummaryData = {
  positiveFeedback: { quote: string; keywords: string[] }[];
  improvementAreas: { theme: string; suggestion: string }[];
};

type ActiveFilter = {
  mode: "daily" | "monthly" | "specific" | "range" | "full";
  date?: Date;
  dateRange?: DateRange;
};

// --- CHILD COMPONENTS ---

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

  const isRangeInvalid = !selectedDateRange?.from || !selectedDateRange?.to;

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
              {[
                new Date().getFullYear(),
                ...[2024, 2023].filter((y) => y !== new Date().getFullYear()),
              ].map((y) => (
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
                variant={activeButton === "range" ? "default" : "outline"}
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

const QuantitativeFeedback = ({
  chartData,
}: {
  chartData: ChartData | null;
}) => {
  if (!chartData) {
    return (
      <p className="text-muted-foreground text-center pt-8">
        No chart data available for this view.
      </p>
    );
  }

  if (chartData.graphTimeseries) {
    const lineChartData = {
      labels: chartData.graphTimeseries.labels,
      datasets: [
        {
          label: "Understanding",
          data: chartData.graphTimeseries.understanding,
          borderColor: "rgb(54, 162, 235)",
          backgroundColor: "rgba(54, 162, 235, 0.5)",
          tension: 0.3,
          datalabels: { display: false },
        },
        {
          label: "Instructor",
          data: chartData.graphTimeseries.instructor,
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

  if (chartData.graphData) {
    const barChartData = {
      labels: ["Understanding", "Instructor"],
      datasets: [
        {
          label: "Average Rating",
          data: [
            chartData.graphData.avgUnderstanding,
            chartData.graphData.avgInstructor,
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

const QualitativeFeedbackCard = ({
  title,
  icon,
  feedback,
  type,
  isLoading,
}: {
  title: string;
  icon: React.ReactNode;
  feedback: any[] | undefined;
  type: "positive" | "improvement";
  isLoading: boolean;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {icon} {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4 min-h-[100px]">
      {isLoading ? (
        <div className="flex items-center justify-center h-full pt-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : feedback?.length ? (
        feedback.map((item, i) => (
          <div key={i} className="p-3 bg-secondary rounded-lg border">
            {type === "positive" ? (
              <>
                <p className="italic flex gap-2">
                  <Quote className="h-4 w-4 shrink-0" />
                  {item.quote}
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
            ? "No positive comments found for this period."
            : "No specific improvement areas found."}
        </p>
      )}
    </CardContent>
  </Card>
);

const DashboardContent = ({
  isChartLoading,
  isAiLoading,
  chartData,
  aiSummary,
  chartError,
  aiError,
}: {
  isChartLoading: boolean;
  isAiLoading: boolean;
  chartData: ChartData | null;
  aiSummary: AiSummaryData | null;
  chartError: string | null;
  aiError: string | null;
}) => {
  if (isChartLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-4 text-muted-foreground">
          Loading Feedback Data...
        </span>
      </div>
    );
  }

  if (chartError) {
    return <div className="text-center text-red-500 py-10">{chartError}</div>;
  }

  if (!chartData || chartData.totalFeedbacks === 0) {
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
            Total Feedbacks Given: {chartData.totalFeedbacks ?? 0}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] w-full">
          <QuantitativeFeedback chartData={chartData} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QualitativeFeedbackCard
          title="AI Summary: Positive Feedback"
          icon={<Sparkles />}
          feedback={aiSummary?.positiveFeedback}
          type="positive"
          isLoading={isAiLoading}
        />
        <QualitativeFeedbackCard
          title="AI Summary: Areas for Improvement"
          icon={<Lightbulb />}
          feedback={aiSummary?.improvementAreas}
          type="improvement"
          isLoading={isAiLoading}
        />
      </div>

      {aiError && (
        <div className="flex items-center justify-center text-sm text-yellow-600 p-3 bg-yellow-50 rounded-md border border-yellow-200">
          <AlertCircle className="h-4 w-4 mr-2" />
          Could not load AI summary at this time. Chart data is displayed.
        </div>
      )}
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function AdminEmployeeDetail() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummaryData | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
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
        setChartError("Could not find employee details.");
      }
    };
    fetchEmployeeDetails();
  }, [employeeId]);

  // Main data fetching function
  const fetchFeedbackData = useCallback(
    async (filter: ActiveFilter) => {
      if (!employeeId) return;

      setIsChartLoading(true);
      setIsAiLoading(true);
      setChartError(null);
      setAiError(null);

      const functions = getFunctions();
      const getChartDataCallable = httpsCallable<any, ChartData>(
        functions,
        "getFeedbackChartData"
      );
      const getAiSummaryCallable = httpsCallable<any, AiSummaryData>(
        functions,
        "getFeedbackAiSummary"
      );

      const params: any = {
        employeeId: employeeId,
        timeFrame: filter.mode,
      };

      if (
        (filter.mode === "daily" ||
          filter.mode === "specific" ||
          filter.mode === "monthly") &&
        filter.date
      ) {
        params.date = format(filter.date, "yyyy-MM-dd");
      } else if (
        filter.mode === "range" &&
        filter.dateRange?.from &&
        filter.dateRange?.to
      ) {
        params.startDate = format(filter.dateRange.from, "yyyy-MM-dd");
        params.endDate = format(filter.dateRange.to, "yyyy-MM-dd");
      }

      // We call both functions and handle their success/failure independently
      const chartPromise = getChartDataCallable(params);
      const aiPromise = getAiSummaryCallable(params);

      try {
        const chartResult = await chartPromise;
        setChartData(chartResult.data);
      } catch (err) {
        console.error("Error fetching chart data:", err);
        setChartError(
          err instanceof Error
            ? err.message
            : "Failed to load your feedback charts. Please try refreshing."
        );
      } finally {
        setIsChartLoading(false);
      }

      try {
        const aiResult = await aiPromise;
        setAiSummary(aiResult.data);
      } catch (err) {
        console.error("Error fetching AI summary:", err);
        setAiError("Could not generate AI analysis.");
      } finally {
        setIsAiLoading(false);
      }
    },
    [employeeId]
  );

  // Initial fetch for "Today"
  useEffect(() => {
    if (employeeId) {
      fetchFeedbackData({ mode: "daily", date: new Date() });
    }
  }, [employeeId, fetchFeedbackData]);

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
              onFilterChange={fetchFeedbackData}
              isFiltering={isChartLoading || isAiLoading}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <DashboardContent
              isChartLoading={isChartLoading}
              isAiLoading={isAiLoading}
              chartData={chartData}
              aiSummary={aiSummary}
              chartError={chartError}
              aiError={aiError}
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
