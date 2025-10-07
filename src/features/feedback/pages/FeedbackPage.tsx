import { useState, useEffect, useCallback } from "react";

import { useUserAuth } from "@/context/UserAuthContext";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { db } from "@/integrations/firebase/client";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, query, where, getDocs } from "firebase/firestore";

// UI Components & Icons

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Sparkles,
  MessageSquare,
  Quote,
  Lightbulb,
  Calendar as CalendarIcon,
  AlertCircle,
  BookOpen,
} from "lucide-react";

// Animation & Utilities
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useMobile } from "@/hooks/use-mobile";

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
  firebaseUid: string; // This is the Firestore Document ID
  customEmployeeId: string;
};

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

export type ActiveFilter = {
  mode: "daily" | "monthly" | "specific" | "range" | "full";
  date?: Date;
  dateRange?: DateRange;
};

type RawFeedbackData = {
    date: string;
    understanding: number;
    instructor: number;
    comment: string;
}[];


// --- CHILD COMPONENTS ---

const FeedbackDetailsModal = ({
    isOpen,
    onClose,
    feedbackData,
    isLoading,
    error,
    isMobile,
}: {
    isOpen: boolean;
    onClose: () => void;
    feedbackData: RawFeedbackData | null;
    isLoading: boolean;
    error: string | null;
    isMobile: boolean;
}) => {
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            );
        }
        if (error) {
            return <div className="text-red-500 text-center">{error}</div>;
        }
        if (!feedbackData || feedbackData.length === 0) {
            return <p className="text-center text-muted-foreground">No detailed feedback to display.</p>;
        }

        if (isMobile) {
            return (
                <div className="space-y-4">
                    {feedbackData.map((item, index) => (
                        <Card key={index} className="p-4">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-medium">{format(new Date(item.date), "PPP p")}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <div>
                                    <p className="text-xs text-muted-foreground">Understanding</p>
                                    <p className="font-semibold">{item.understanding}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Instructor</p>
                                    <p className="font-semibold">{item.instructor}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Comment</p>
                                <p className="text-sm break-words">{item.comment || "-"}</p>
                            </div>
                        </Card>
                    ))}
                </div>
            );
        }

        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Understanding</TableHead>
                        <TableHead>Instructor</TableHead>
                        <TableHead>Comment</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {feedbackData.map((item, index) => (
                        <TableRow key={index}>
                            <TableCell>{format(new Date(item.date), "PPP p")}</TableCell>
                            <TableCell>{item.understanding}</TableCell>
                            <TableCell>{item.instructor}</TableCell>
                            <TableCell>{item.comment || "-"}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>All Feedback Entries</DialogTitle>
                    <DialogDescription>
                        Here are all the individual feedback entries for the selected period.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    {renderContent()}
                </ScrollArea>
                <DialogFooter>
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


const FeedbackFilters = ({
  onFilterChange,
  isFiltering,
}: {
  onFilterChange: (filter: ActiveFilter) => void;
  isFiltering: boolean;
}) => {
  const [activeButton, setActiveButton] =
    useState<ActiveFilter["mode"] | ''>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [selectedDateRange, setSelectedDateRange] = useState<
    DateRange | undefined
  >(undefined);

  // FIX: Simplified range validation. A range is invalid only if a start or end date is missing.
  // This allows selecting a single day in the range picker.
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
          <Popover>
            <PopoverTrigger asChild>
              {/* FIX: The trigger button now also gets the "default" variant when its filter is active for UI consistency. */}
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
                // FIX: Removed invalid 'min={2}' prop. Disabling the "Apply" button is the correct approach.
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
            formatter: (value: number) => (value > 0 ? value.toFixed(3) : ""),
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
  hasSearched,
  onViewAllClick,
}: {
  isChartLoading: boolean;
  isAiLoading: boolean;
  chartData: ChartData | null;
  aiSummary: AiSummaryData | null;
  chartError: string | null;
  aiError: string | null;
  hasSearched: boolean;
  onViewAllClick: () => void;
}) => {
  if (!hasSearched) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-muted-foreground">
          Please select a filter to view feedback data.
        </p>
      </div>
    );
  }

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
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare /> Quantitative Feedback
            </CardTitle>
            <CardDescription>
              Total Feedbacks Given: {chartData.totalFeedbacks ?? 0}
            </CardDescription>
          </div>
          <Button onClick={onViewAllClick} variant="secondary">
            <BookOpen className="mr-2 h-4 w-4" />
            View All Feedback
          </Button>
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

import { ViewState, ViewType } from "@/layout/AppShell";

// --- MAIN PAGE COMPONENT ---
interface FeedbackPageProps {
  setActiveView: (view: ViewState) => void;
}

export default function FeedbackPage({ setActiveView }: FeedbackPageProps) {
  const { user, loading: userAuthLoading } = useUserAuth();
  const { admin, initialized: adminInitialized } = useAdminAuth();
  const isMobile = useMobile();

  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummaryData | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null);

  // State for the new detailed feedback modal
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [rawFeedback, setRawFeedback] = useState<RawFeedbackData | null>(null);
  const [isRawFeedbackLoading, setIsRawFeedbackLoading] = useState(false);
  const [rawFeedbackError, setRawFeedbackError] = useState<string | null>(null);
  
  const fetchRawFeedback = async () => {
      if (!employeeData?.firebaseUid || !activeFilter) return;

      setIsRawFeedbackLoading(true);
      setRawFeedbackError(null);
      setIsFeedbackModalOpen(true); // Open modal immediately

      const functions = getFunctions();
      const getRawFeedbackCallable = httpsCallable<any, RawFeedbackData>(functions, "getRawFeedback");

      const params: any = {
          employeeId: employeeData.firebaseUid,
          timeFrame: activeFilter.mode,
      };
      if ((activeFilter.mode === "daily" || activeFilter.mode === "specific" || activeFilter.mode === "monthly") && activeFilter.date) {
          params.date = format(activeFilter.date, "yyyy-MM-dd");
      } else if (activeFilter.mode === "range" && activeFilter.dateRange?.from && activeFilter.dateRange?.to) {
          params.startDate = format(activeFilter.dateRange.from, "yyyy-MM-dd");
          params.endDate = format(activeFilter.dateRange.to, "yyyy-MM-dd");
      }

      try {
          const result = await getRawFeedbackCallable(params);
          setRawFeedback(result.data);
      } catch (err) {
          console.error("Error fetching raw feedback:", err);
          setRawFeedbackError("Failed to load detailed feedback. Please try again.");
      } finally {
          setIsRawFeedbackLoading(false);
      }
  };

  // The admin check is now handled by AppShell, so the Navigate component is removed.

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
          if (doc.data().archived === true) {
            setChartError("This employee is archived.");
            return;
          }
          setEmployeeData({
            name: doc.data().name,
            firebaseUid: doc.id, // This is the Document ID
            customEmployeeId: doc.data().employeeId,
          });
        } else {
          setChartError("Could not find your employee profile.");
        }
      } catch (error) {
        console.error("Error fetching employee profile:", error);
        setChartError("An error occurred while fetching your profile.");
      }
    };
    fetchEmployeeProfile();
  }, [user, userAuthLoading]);

  const fetchFeedbackData = useCallback(
    async (filter: ActiveFilter) => {
      if (!employeeData?.firebaseUid) return;

      setHasSearched(true);
      setActiveFilter(filter); // Store the active filter
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
        employeeId: employeeData.firebaseUid,
        timeFrame: filter.mode,
      };

      // FIX: Standardized all date formats to 'yyyy-MM-dd' for consistency and to avoid timezone issues.
      // This simplifies the logic required in the backend Cloud Function.
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
          "Failed to load your feedback charts. Please try refreshing."
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
    [employeeData] // Dependency array is correct
  );

  // Initial loading screen for auth and profile fetching
  if (userAuthLoading || (!employeeData && !chartError)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading Your Dashboard...</p>
      </div>
    );
  }

  return (
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
          hasSearched={hasSearched}
          isChartLoading={isChartLoading}
          isAiLoading={isAiLoading}
          chartData={chartData}
          aiSummary={aiSummary}
          chartError={chartError}
          aiError={aiError}
          onViewAllClick={fetchRawFeedback}
        />
      </motion.div>
      <FeedbackDetailsModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        feedbackData={rawFeedback}
        isLoading={isRawFeedbackLoading}
        error={rawFeedbackError}
        isMobile={isMobile}
      />
    </div>
  );
}
