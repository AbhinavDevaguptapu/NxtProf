import { useEffect, useState } from "react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/common/StatCard";
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
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, Variants } from "framer-motion";
import { ViewState } from "@/layout/AppShell";
import MotivationalQuote from "@/components/common/MotivationalQuote";

interface AdminHomeProps {
  setActiveView: (view: ViewState) => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

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

  useEffect(() => {
    if (!admin) return;
    async function fetchDashboardData() {
      setIsLoading(true);
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const employeeCountPromise = getCountFromServer(
          collection(db, "employees")
        );

        const standupsQuery = query(
          collection(db, "standups"),
          where("scheduledTime", ">=", Timestamp.fromDate(today)),
          where("scheduledTime", "<", Timestamp.fromDate(tomorrow)),
          orderBy("scheduledTime", "desc"),
          limit(1)
        );
        const standupPromise = getDocs(standupsQuery);

        const learningHoursQuery = query(
          collection(db, "learning_hours"),
          where("scheduledTime", ">=", Timestamp.fromDate(today)),
          where("scheduledTime", "<", Timestamp.fromDate(tomorrow)),
          orderBy("scheduledTime", "desc"),
          limit(1)
        );
        const learningHourPromise = getDocs(learningHoursQuery);

        const [employeeSnapshot, standupSnapshot, learningHourSnapshot] =
          await Promise.all([
            employeeCountPromise,
            standupPromise,
            learningHourPromise,
          ]);

        setEmployeeCount(employeeSnapshot.data().count);

        if (!standupSnapshot.empty) {
          const standupDoc = standupSnapshot.docs[0];
          setStandupTime(
            (standupDoc.data().scheduledTime as Timestamp)
              .toDate()
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
        } else {
          setStandupTime(null);
          setStandupAttendanceCount(0);
        }

        if (!learningHourSnapshot.empty) {
          const learningHourDoc = learningHourSnapshot.docs[0];
          setLearningHourTime(
            (learningHourDoc.data().scheduledTime as Timestamp)
              .toDate()
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
        } else {
          setLearningHourTime(null);
          setLearningHourAttendanceCount(0);
        }
      } catch (error) {
        console.error("Failed to fetch admin dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboardData();
  }, [admin]);

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {admin?.email ? admin.email.split("@")[0] : "Admin"}
          ! Here's your daily summary. Use the sidebar to manage the application.
        </p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-12">
          <motion.div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <StatCard
                title="Today's Standup"
                value={standupTime || "Not Scheduled"}
                icon={<Clock className="h-5 w-5" />}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <StatCard
                title="Standup Attendance"
                value={`${standupAttendanceCount} / ${employeeCount}`}
                icon={<UserCheck className="h-5 w-5" />}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <StatCard
                title="Today's Learning Hour"
                value={learningHourTime || "Not Scheduled"}
                icon={<BookOpen className="h-5 w-5" />}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <StatCard
                title="Learning Attendance"
                value={`${learningHourAttendanceCount} / ${employeeCount}`}
                icon={<GraduationCap className="h-5 w-5" />}
              />
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="xl:col-span-1 md:col-span-2 lg:col-span-3"
            >
              <StatCard
                title="Total Employees"
                value={employeeCount}
                icon={<Users className="h-5 w-5" />}
              />
            </motion.div>
          </motion.div>

          {(!standupTime || !learningHourTime) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Alert
                variant="default"
                className="bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
              >
                <AlertTriangle className="h-4 w-4 text-blue-500" />
                <AlertTitle className="font-semibold text-blue-800 dark:text-blue-300">
                  Action Required
                </AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400">
                  A daily session is not scheduled. Use the sidebar to
                  set one up.
                </AlertDescription>
                <div className="mt-4 flex flex-wrap gap-4">
                  {!standupTime && (
                    <Button onClick={() => setActiveView({ view: "standups" })}>
                      <CalendarPlus className="mr-2 h-4 w-4" /> Schedule
                      Standup
                    </Button>
                  )}
                  {!learningHourTime && (
                    <Button
                      onClick={() => setActiveView({ view: "learning-hours" })}
                    >
                      <CalendarPlus className="mr-2 h-4 w-4" /> Schedule
                      Learning Hour
                    </Button>
                  )}
                </div>
              </Alert>
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <MotivationalQuote />
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminHome;