// AdminEmployeeDetail.tsx – Chart.js only version
import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  MessageSquare,
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

// Register Chart.js components and plugins
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
    useState<ActiveFilter["mode"] | "">("");
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Filters</CardTitle>
        <CardDescription>Select a filter to view feedback data for different periods.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* --- Row 1: Quick Filters & Specific Date --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Button
            onClick={() => handleFilterClick({ mode: "daily", date: new Date() })}
            variant={activeButton === "daily" ? "default" : "outline"}
            disabled={isFiltering}
          >
            Today's Feedback
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={activeButton === "specific" ? "default" : "outline"}
                className="w-full justify-start font-normal"
                disabled={isFiltering}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                {selectedDate && activeButton === "specific"
                  ? format(selectedDate, "PP")
                  : "Pick a Date"}
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
          <Button
            onClick={() => handleFilterClick({ mode: "full" })}
            variant={activeButton === "full" ? "default" : "outline"}
            disabled={isFiltering}
            className="sm:col-span-2 lg:col-span-1"
          >
            Full History
          </Button>
        </div>

        {/* --- Row 2: Monthly Filter --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="sm:col-span-2 grid grid-cols-2 gap-3">
            <Select
              value={String(selectedMonth)}
              onValueChange={(v) => setSelectedMonth(Number(v))}
              disabled={isFiltering}
            >
              <SelectTrigger>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[new Date().getFullYear(), 2024, 2023]
                  .filter((y, i, arr) => arr.indexOf(y) === i)
                  .map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() =>
              handleFilterClick({
                mode: "monthly",
                date: new Date(selectedYear, selectedMonth, 1),
              })
            }
            variant={activeButton === "monthly" ? "default" : "outline"}
            disabled={isFiltering}
          >
            View Month
          </Button>
        </div>

        {/* --- Row 3: Date Range Filter --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="sm:col-span-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={activeButton === "range" ? "default" : "outline"}
                  className={cn(
                    "w-full justify-start font-normal",
                    !selectedDateRange && "text-muted-foreground"
                  )}
                  disabled={isFiltering}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
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
                    "Pick a Date Range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={selectedDateRange}
                  onSelect={setSelectedDateRange}
                  disabled={{ after: new Date() }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button
            onClick={() =>
              handleFilterClick({ mode: "range", dateRange: selectedDateRange })
            }
            variant={activeButton === "range" ? "default" : "outline"}
            disabled={isFiltering || isRangeInvalid}
          >
            Apply Range
          </Button>
        </div>
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
      <p className="text-muted-foreground text-center py-10">
        No chart data available for this view.
      </p>
    );
  }

  // Display Line Chart for time series data (e.g., monthly view)
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
            formatter: (value: number) => (value > 0 ? value.toFixed(2) : ""),
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

  // Display Bar Chart for aggregated data (e.g., daily, range, full history)
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
          formatter: (value: number) => value.toFixed(3),
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
    <p className="text-muted-foreground text-center py-10">
      No chart data available for this view.
    </p>
  );
};

const DashboardContent = ({
  isChartLoading,
  chartData,
  chartError,
  hasSearched,
}: {
  isChartLoading: boolean;
  chartData: ChartData | null;
  chartError: string | null;
  hasSearched: boolean;
}) => {
  // Initial state before any filter is selected
  if (!hasSearched) {
    return (
      <Card className="flex justify-center items-center min-h-[280px] shadow-sm">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="mx-auto h-12 w-12" />
          <h3 className="mt-4 text-lg font-medium">View Feedback Data</h3>
          <p className="mt-1 text-sm">Please select a filter above to get started.</p>
        </div>
      </Card>
    );
  }

  // Loading state
  if (isChartLoading) {
    return (
      <Card className="flex justify-center items-center min-h-[280px] shadow-sm">
        <div className="flex items-center text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="ml-4 text-lg">Loading Feedback Data...</span>
        </div>
      </Card>
    );
  }

  // Error state
  if (chartError) {
    return <Card className="min-h-[400px] shadow-sm flex items-center justify-center"><div className="text-center text-destructive py-10">{chartError}</div></Card>;
  }

  // No data found for the selected period
  if (!chartData || chartData.totalFeedbacks === 0) {
    return (
      <Card className="min-h-[400px] shadow-sm flex items-center justify-center">
        <div className="text-center text-muted-foreground py-10">
          <h3 className="text-lg font-medium">No Feedback Found</h3>
          <p className="text-sm">There is no feedback data for the selected period.</p>
        </div>
      </Card>
    );
  }

  // Success state: display the chart
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <MessageSquare /> Quantitative Feedback
        </CardTitle>
        <CardDescription>
          Total Feedbacks Found: {chartData.totalFeedbacks ?? 0}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[350px] sm:h-[400px] w-full">
        <QuantitativeFeedback chartData={chartData} />
      </CardContent>
    </Card>
  );
};

// --- MAIN PAGE COMPONENT ---
interface AdminEmployeeDetailProps {
  employeeId: string;
}

export default function AdminEmployeeDetail({
  employeeId,
}: AdminEmployeeDetailProps) {
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

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

      setHasSearched(true);
      setIsChartLoading(true);
      setChartError(null);
      setChartData(null); // Clear previous data

      const functions = getFunctions();
      const getChartDataCallable = httpsCallable<object, ChartData>(
        functions,
        "getFeedbackChartData"
      );

      // Prepare parameters for the Firebase Cloud Function
      const params: {
        employeeId: string;
        timeFrame: ActiveFilter["mode"];
        date?: string;
        startDate?: string;
        endDate?: string;
      } = {
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

      // Call the function to get chart data
      try {
        const chartResult = await getChartDataCallable(params);
        setChartData(chartResult.data);
      } catch (err) {
        const error = err as Error;
        console.error("Error fetching chart data:", error);
        setChartError(
          error.message || "Failed to load feedback charts. Please try again."
        );
      } finally {
        setIsChartLoading(false);
      }
    },
    [employeeId]
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight">
            Feedback Dashboard
          </h1>
          {employeeData ? (
            <p className="text-base text-muted-foreground">
              Viewing data for: <strong>{employeeData.name}</strong> (ID:{" "}
              {employeeData.employeeId})
            </p>
          ) : (
            <p className="text-sm text-muted-foreground h-6">
              {/* Placeholder for loading state to prevent layout shift */}
            </p>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <FeedbackFilters
          onFilterChange={fetchFeedbackData}
          isFiltering={isChartLoading}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <DashboardContent
          hasSearched={hasSearched}
          isChartLoading={isChartLoading}
          chartData={chartData}
          chartError={chartError}
        />
      </motion.div>
    </div>
  );
}
