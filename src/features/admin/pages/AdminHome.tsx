"use client"

import { useEffect, useState } from "react"
import { useAdminAuth } from "@/context/AdminAuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/integrations/firebase/client"
import { collection, query, where, getDocs, getCountFromServer, orderBy, limit, Timestamp } from "firebase/firestore"
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
  ArrowRight
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { motion, type Variants } from "framer-motion"
import type { ViewState } from "@/layout/AppShell"
import MotivationalQuote from "@/components/common/MotivationalQuote"
import { cn } from "@/lib/utils"

// --- Component Props & Types ---
interface AdminHomeProps {
  setActiveView: (view: ViewState) => void
}
type StatCardColor = "blue" | "green" | "amber" | "purple";

// --- Animation Variants ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

// --- Main Component ---
const AdminHome = ({ setActiveView }: AdminHomeProps) => {
  const { admin } = useAdminAuth()
  const [employeeCount, setEmployeeCount] = useState<number>(0)
  const [standupTime, setStandupTime] = useState<string | null>(null)
  const [standupAttendanceCount, setStandupAttendanceCount] = useState<number>(0)
  const [learningHourTime, setLearningHourTime] = useState<string | null>(null)
  const [learningHourAttendanceCount, setLearningHourAttendanceCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  // --- Data Fetching (Functionality Unchanged) ---
  useEffect(() => {
    if (!admin) return

    const fetchDashboardData = async () => {
      setIsLoading(true)
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const [employeeSnapshot, standupSnapshot, learningHourSnapshot] = await Promise.all([
          getCountFromServer(collection(db, "employees")),
          getDocs(query(collection(db, "standups"), where("scheduledTime", ">=", Timestamp.fromDate(today)), where("scheduledTime", "<", Timestamp.fromDate(tomorrow)), orderBy("scheduledTime", "desc"), limit(1))),
          getDocs(query(collection(db, "learning_hours"), where("scheduledTime", ">=", Timestamp.fromDate(today)), where("scheduledTime", "<", Timestamp.fromDate(tomorrow)), orderBy("scheduledTime", "desc"), limit(1)))
        ])

        setEmployeeCount(employeeSnapshot.data().count)

        if (!standupSnapshot.empty) {
          const standupDoc = standupSnapshot.docs[0]
          setStandupTime(standupDoc.data().scheduledTime.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
          const attSnapshot = await getCountFromServer(query(collection(db, "attendance"), where("standup_id", "==", standupDoc.id), where("status", "==", "Present")))
          setStandupAttendanceCount(attSnapshot.data().count)
        }

        if (!learningHourSnapshot.empty) {
          const learningHourDoc = learningHourSnapshot.docs[0]
          setLearningHourTime(learningHourDoc.data().scheduledTime.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
          const attSnapshot = await getCountFromServer(query(collection(db, "learning_hours_attendance"), where("learning_hour_id", "==", learningHourDoc.id), where("status", "==", "Present")))
          setLearningHourAttendanceCount(attSnapshot.data().count)
        }
      } catch (error) {
        console.error("Failed to fetch admin dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [admin])

  const attendanceRate = employeeCount > 0
    ? Math.round(((standupAttendanceCount + learningHourAttendanceCount) / (employeeCount * 2)) * 100)
    : 0

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <motion.header
        initial="hidden" animate="visible" variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-base text-muted-foreground mt-1">
            Welcome back, {admin?.email?.split("@")[0] || "Admin"}. Here's your daily overview.
          </p>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-5"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}><StatCard title="Total Employees" value={employeeCount} icon={Users} color={"blue"} /></motion.div>
            <motion.div variants={itemVariants}><StatCard title="Attendance Rate" value={`${attendanceRate}%`} icon={TrendingUp} color={"blue"} /></motion.div>
            <motion.div variants={itemVariants}><StatCard title="Standup Time" value={standupTime || "Not Set"} icon={Clock} color={"blue"} /></motion.div>
            <motion.div variants={itemVariants}><StatCard title="Learning Hour" value={learningHourTime || "Not Set"} icon={GraduationCap} color={"blue"} /></motion.div>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <AttendanceCard title="Standup Attendance" icon={UserCheck} presentCount={standupAttendanceCount} totalCount={employeeCount} onActionClick={() => setActiveView({ view: "attendance" })} color={"blue"} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <AttendanceCard title="Learning Attendance" icon={BookOpen} presentCount={learningHourAttendanceCount} totalCount={employeeCount} onActionClick={() => setActiveView({ view: "learning-hours" })} color={"green"} />
            </motion.div>
          </motion.div>

          {(!standupTime || !learningHourTime) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <ActionAlert standupTime={standupTime} learningHourTime={learningHourTime} setActiveView={setActiveView} />
            </motion.div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <motion.div variants={itemVariants} className="lg:sticky lg:top-24 space-y-6">
            <QuickActions setActiveView={setActiveView} />
            <MotivationalQuote />
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// --- Reusable UI Sub-Components (UI/Styling Changed, Functionality Preserved) ---

const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: LucideIcon; color: StatCardColor }) => {
  const colors: Record<StatCardColor, string> = {
    blue: "text-blue-600 bg-blue-100 dark:bg-blue-950 dark:text-blue-400",
    green: "text-green-600 bg-green-100 dark:bg-green-950 dark:text-green-400",
    amber: "text-amber-600 bg-amber-100 dark:bg-amber-950 dark:text-amber-400",
    purple: "text-purple-600 bg-purple-100 dark:bg-purple-950 dark:text-purple-400",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn("h-10 w-10 shrink-0 rounded-full flex items-center justify-center", colors[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const AttendanceCard = ({ title, icon: Icon, presentCount, totalCount, color, onActionClick }: { title: string; icon: LucideIcon; presentCount: number; totalCount: number, color: StatCardColor; onActionClick: () => void; }) => {
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  const getProgressBarClass = (p: number) => {
    if (p >= 80) return "bg-green-500";
    if (p >= 50) return "bg-amber-500";
    return "bg-red-500";
  };
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Icon className={cn("h-5 w-5", `text-${color}-500`)} /> {title}
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={onActionClick}>View</Button>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="text-2xl font-bold text-foreground">{presentCount} <span className="text-base font-medium text-muted-foreground">/ {totalCount} Present</span></div>
        <div className="mt-2 space-y-1">
          <div className="w-full bg-muted rounded-full h-2.5">
            <div className={cn("h-2.5 rounded-full transition-all duration-500", getProgressBarClass(percentage))} style={{ width: `${percentage}%` }} />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{percentage}% of employees were present.</span>
        </div>
      </CardContent>
    </Card>
  );
};

const QuickActions = ({ setActiveView }: { setActiveView: (view: ViewState) => void; }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-1">
      <QuickActionButton icon={Users} label="Manage Employees" onClick={() => setActiveView({ view: "manage-employees" })} />
      <QuickActionButton icon={Calendar} label="View Attendance" onClick={() => setActiveView({ view: "attendance" })} />
      <QuickActionButton icon={BarChart3} label="Standup Reports" onClick={() => setActiveView({ view: "standups" })} />
    </CardContent>
  </Card>
);

const QuickActionButton = ({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void; }) => (
  <button onClick={onClick} className="flex items-center gap-3 w-full p-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted">
    <Icon className="h-5 w-5" />
    <span>{label}</span>
    <ArrowRight className="h-4 w-4 ml-auto" />
  </button>
);

const ActionAlert = ({ standupTime, learningHourTime, setActiveView }: { standupTime: string | null; learningHourTime: string | null; setActiveView: (view: ViewState) => void }) => (
  <Alert variant="default" className="border-amber-300 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
    <AlertTriangle className="h-5 w-5 text-amber-500" />
    <AlertTitle className="font-semibold text-amber-900 dark:text-amber-200">Action Required</AlertTitle>
    <AlertDescription className="mt-1 text-amber-700 dark:text-amber-400">
      Some daily sessions are not scheduled. Set them up to keep your team on track.
    </AlertDescription>
    <div className="flex flex-col sm:flex-row gap-3 mt-4">
      {!standupTime && (
        <Button onClick={() => setActiveView({ view: "standups" })} size="sm">
          <CalendarPlus className="mr-2 h-4 w-4" /> Schedule Standup
        </Button>
      )}
      {!learningHourTime && (
        <Button onClick={() => setActiveView({ view: "learning-hours" })} size="sm" variant="secondary">
          <CalendarPlus className="mr-2 h-4 w-4" /> Schedule Learning Hour
        </Button>
      )}
    </div>
  </Alert>
);

export default AdminHome