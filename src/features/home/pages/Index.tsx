import { useUserAuth } from "@/context/UserAuthContext";
import { useAttendanceStreak } from "@/hooks/use-attendance-streak";
import { useLearningStreak } from "@/hooks/use-learning-streak";
import { Loader2, Flame, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { ViewState } from '@/layout/AppShell';
import MotivationalQuote from "@/components/common/MotivationalQuote";

interface UserHomeProps {
  setActiveView: (view: ViewState) => void;
}

const HomeStreakBanner = () => {
  const { attendanceStreak, attendanceLoading: loading } = useAttendanceStreak();

  if (loading) {
    return (
      <div className="flex items-center gap-2 bg-card p-3 rounded-lg border">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading streak...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
      <div className="flex items-center justify-center bg-orange-100 dark:bg-orange-900/50 rounded-full h-12 w-12">
        <Flame className="h-6 w-6 text-orange-500" />
      </div>
      <div>
        <h3 className="font-semibold">Standup Attendance Streak</h3>
        <p className="text-2xl font-bold text-muted-foreground">
          {attendanceStreak} <span className="text-base font-normal">days</span>
        </p>
      </div>
    </div>
  );
};

const LearningStreakBanner = () => {
  const { learningStreak, loading } = useLearningStreak();

  if (loading) {
    return (
      <div className="flex items-center gap-2 bg-card p-3 rounded-lg border">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading streak...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
      <div className="flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 rounded-full h-12 w-12">
        <BookOpen className="h-6 w-6 text-blue-500" />
      </div>
      <div>
        <h3 className="font-semibold">Learning Hours Streak</h3>
        <p className="text-2xl font-bold text-muted-foreground">
          {learningStreak} <span className="text-base font-normal">days</span>
        </p>
      </div>
    </div>
  );
}

export default function Index({ setActiveView }: UserHomeProps) {
  const { user } = useUserAuth();

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.displayName || "Team Member"}!</h1>
        <p className="text-lg text-muted-foreground">Here's your daily summary. Use the sidebar to navigate to other pages.</p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      >
        <HomeStreakBanner />
        <LearningStreakBanner />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
      >
        <MotivationalQuote />
      </motion.div>
    </div>
  );
}