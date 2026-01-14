"use client";

import { useEffect, useState } from "react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { db } from "@/integrations/firebase/client";
import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import {
  Loader2,
  Users,
  CalendarPlus,
  AlertTriangle,
  Clock,
  UserCheck,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Calendar,
  BarChart3,
  LucideIcon,
  ArrowRight,
  LayoutDashboard,
  ChevronRight,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, type Variants } from "framer-motion";
import type { ViewState } from "@/layout/AppShell";
import MotivationalQuote from "@/components/common/MotivationalQuote";
import { cn } from "@/lib/utils";

// --- Component Props & Types ---
interface AdminHomeProps {
  setActiveView: (view: ViewState) => void;
}
type StatCardColor = "indigo" | "green" | "amber" | "purple";

// --- Animation Variants ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
};

// --- Main Component ---
const AdminHome = ({ setActiveView }: AdminHomeProps) => {
  const { admin } = useAdminAuth();
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [standupTime, setStandupTime] = useState<string | null>(null);
  const [standupAttendanceCount, setStandupAttendanceCount] =
    useState<number>(0);
  const [learningHourTime, setLearningHourTime] = useState<string | null>(null);
  const [learningHourAttendanceCount, setLearningHourAttendanceCount] =
    useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // --- Data Fetching (Functionality Unchanged) ---
  useEffect(() => {
    if (!admin) return;

    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [employeeDocs, standupSnapshot, learningHourSnapshot] =
          await Promise.all([
            getDocs(collection(db, "employees")),
            getDocs(
              query(
                collection(db, "standups"),
                where("scheduledTime", ">=", Timestamp.fromDate(today)),
                where("scheduledTime", "<", Timestamp.fromDate(tomorrow)),
                orderBy("scheduledTime", "desc"),
                limit(1)
              )
            ),
            getDocs(
              query(
                collection(db, "learning_hours"),
                where("scheduledTime", ">=", Timestamp.fromDate(today)),
                where("scheduledTime", "<", Timestamp.fromDate(tomorrow)),
                orderBy("scheduledTime", "desc"),
                limit(1)
              )
            ),
          ]);

        const activeEmployees = employeeDocs.docs.filter(
          (doc) => doc.data().archived !== true
        );
        setEmployeeCount(activeEmployees.length);

        if (!standupSnapshot.empty) {
          const standupDoc = standupSnapshot.docs[0];
          setStandupTime(
            standupDoc
              .data()
              .scheduledTime.toDate()
              .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          );
          const attSnapshot = await getCountFromServer(
            query(
              collection(db, "attendance"),
              where("standup_id", "==", standupDoc.id),
              where("status", "==", "Present")
            )
          );
          setStandupAttendanceCount(attSnapshot.data().count);
        }

        if (!learningHourSnapshot.empty) {
          const learningHourDoc = learningHourSnapshot.docs[0];
          setLearningHourTime(
            learningHourDoc
              .data()
              .scheduledTime.toDate()
              .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          );
          const attSnapshot = await getCountFromServer(
            query(
              collection(db, "learning_hours_attendance"),
              where("learning_hour_id", "==", learningHourDoc.id),
              where("status", "==", "Present")
            )
          );
          setLearningHourAttendanceCount(attSnapshot.data().count);
        }
      } catch (error) {
        console.error("Failed to fetch admin dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [admin]);

  const attendanceRate =
    employeeCount > 0
      ? Math.round(
          ((standupAttendanceCount + learningHourAttendanceCount) /
            (employeeCount * 2)) *
            100
        )
      : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">
          Loading Dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-8"
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <LayoutDashboard className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">
              Welcome back,{" "}
              <span className="font-medium text-foreground">
                {admin?.email?.split("@")[0] || "Admin"}
              </span>
              . Here is your organization's daily pulse.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Action Alert Banner */}
        {(!standupTime || !learningHourTime) && (
          <motion.div variants={itemVariants}>
            <ActionAlert
              standupTime={standupTime}
              learningHourTime={learningHourTime}
              setActiveView={setActiveView}
            />
          </motion.div>
        )}
        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column: Attendance & Detailed Metrics */}
          <motion.div
            className="xl:col-span-2 space-y-6"
            variants={containerVariants}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">
                Attendance Overview
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div variants={itemVariants}>
                <AttendanceCard
                  title="Daily Standup"
                  icon={UserCheck}
                  presentCount={standupAttendanceCount}
                  totalCount={employeeCount}
                  onActionClick={() => setActiveView({ view: "attendance" })}
                  color="indigo"
                  subtitle="Team sync participation"
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <AttendanceCard
                  title="Learning Hour"
                  icon={BookOpen}
                  presentCount={learningHourAttendanceCount}
                  totalCount={employeeCount}
                  onActionClick={() =>
                    setActiveView({ view: "learning-hours" })
                  }
                  color="green"
                  subtitle="Continuous improvement"
                />
              </motion.div>
            </div>

            {/* Quote of the Day */}
            <motion.div variants={itemVariants} className="pt-4">
              <MotivationalQuote />
            </motion.div>
          </motion.div>

          {/* Right Column: Quick Actions & Side Widgets */}
          <motion.div
            className="xl:col-span-1 space-y-6"
            variants={containerVariants}
          >
            <h2 className="text-xl font-semibold tracking-tight">
              Quick Actions
            </h2>
            <motion.div variants={itemVariants}>
              <QuickActions setActiveView={setActiveView} />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

// --- Modernized Reusable Components ---

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  description,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: StatCardColor;
  description?: string;
}) => {
  const colorStyles = {
    indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30",
    green: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-950/30",
  };

  const borderStyles = {
    indigo: "border-l-indigo-500",
    green: "border-l-emerald-500",
    amber: "border-l-amber-500",
    purple: "border-l-purple-500",
  };

  return (
    <Card
      className={cn(
        "overflow-hidden border-l-4 shadow-sm hover:shadow-md transition-all duration-300",
        borderStyles[color]
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-xl", colorStyles[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

const AttendanceCard = ({
  title,
  icon: Icon,
  presentCount,
  totalCount,
  color,
  onActionClick,
  subtitle,
}: {
  title: string;
  icon: LucideIcon;
  presentCount: number;
  totalCount: number;
  color: StatCardColor;
  onActionClick: () => void;
  subtitle?: string;
}) => {
  const percentage =
    totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Dynamic color for progress indicator text
  const progressColorClass =
    percentage >= 80
      ? "text-emerald-600"
      : percentage >= 50
      ? "text-amber-500"
      : "text-red-500";

  return (
    <Card className="flex flex-col h-full shadow-sm hover:shadow-md transition-all duration-300 group">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div
              className={cn(
                "p-2 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors"
              )}
            >
              <Icon className={cn("h-4 w-4", `text-${color}-600`)} />
            </div>
            {title}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onActionClick}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-end space-y-4">
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{presentCount}</span>
              <span className="text-sm text-muted-foreground font-medium">
                / {totalCount}
              </span>
            </div>
            <span className={cn("text-sm font-bold", progressColorClass)}>
              {percentage}%
            </span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
};

const QuickActions = ({
  setActiveView,
}: {
  setActiveView: (view: ViewState) => void;
}) => (
  <Card className="border-none shadow-none bg-transparent">
    <CardContent className="p-0 grid grid-cols-1 gap-3">
      <QuickActionCard
        icon={Users}
        title="Manage Employees"
        description="Add, edit, or archive members"
        onClick={() => setActiveView({ view: "manage-employees" })}
      />
      <QuickActionCard
        icon={Calendar}
        title="View Attendance"
        description="Check daily logs & history"
        onClick={() => setActiveView({ view: "attendance" })}
      />
      <QuickActionCard
        icon={BarChart3}
        title="Standup Reports"
        description="Review team submissions"
        onClick={() => setActiveView({ view: "standups" })}
      />
    </CardContent>
  </Card>
);

const QuickActionCard = ({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex items-start gap-4 p-4 w-full rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-md hover:-translate-y-0.5 text-left group"
  >
    <div className="mt-1 p-2 bg-primary/5 rounded-lg group-hover:bg-background transition-colors">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div className="flex-1 space-y-1">
      <p className="font-semibold text-sm leading-none flex items-center justify-between">
        {title}
        <ChevronRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
      </p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  </button>
);

const ActionAlert = ({
  standupTime,
  learningHourTime,
  setActiveView,
}: {
  standupTime: string | null;
  learningHourTime: string | null;
  setActiveView: (view: ViewState) => void;
}) => (
  <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/20 backdrop-blur-sm">
    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
    <div className="ml-2 w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <AlertTitle className="text-amber-900 dark:text-amber-200 font-semibold">
          Action Required
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-400">
          Some daily sessions are not scheduled. Set them up to keep your team
          on track.
        </AlertDescription>
      </div>
      <div className="flex items-center gap-2">
        {!standupTime && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveView({ view: "standups" })}
            className="border-amber-200 hover:bg-amber-100 text-amber-900 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/50"
          >
            <CalendarPlus className="mr-2 h-3.5 w-3.5" />
            Schedule Standup
          </Button>
        )}
        {!learningHourTime && (
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white border-none"
            onClick={() => setActiveView({ view: "learning-hours" })}
          >
            <CalendarPlus className="mr-2 h-3.5 w-3.5" />
            Schedule Learning
          </Button>
        )}
      </div>
    </div>
  </Alert>
);

export default AdminHome;
