"use client";

import { useUserAuth } from "@/context/UserAuthContext";
import { useAttendanceStreak } from "@/hooks/use-attendance-streak";
import { useLearningStreak } from "@/hooks/use-learning-streak";
import {
  Activity,
  BookOpen,
  Box,
  Calendar,
  Flame,
  LucideIcon,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Users,
  TrendingUp,
  Clock,
} from "lucide-react";
import { motion, Variants } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ViewState } from "@/layout/AppShell";
import MotivationalQuote from "@/components/common/MotivationalQuote";
import { cn } from "@/lib/utils";

// --- Animation Variants ---
// [LOGIC PRESERVED] - All animation variants unchanged
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

const scaleIn: Variants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

// --- Prop Interfaces ---
// [LOGIC PRESERVED] - All interfaces unchanged
interface UserHomeProps {
  setActiveView: (view: ViewState) => void;
}

interface StreakBannerProps {
  title: string;
  streak: number;
  loading: boolean;
  icon: LucideIcon;
  colors: {
    icon: string;
    bgGradient: string;
    iconBg: string;
  };
}

// --- Reusable Sub-Components ---

const StreakSkeleton = () => (
  <Card className="h-full min-h-[140px] relative overflow-hidden">
    <CardContent className="p-5 h-full">
      <div className="flex items-start gap-4 animate-pulse h-full">
        <div className="rounded-2xl bg-muted h-14 w-14 flex-shrink-0" />
        <div className="space-y-3 flex-1 pt-1">
          <div className="h-3 w-24 rounded-full bg-muted" />
          <div className="h-8 w-16 rounded-lg bg-muted" />
          <div className="h-3 w-20 rounded-full bg-muted" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const StreakBanner = ({
  title,
  streak,
  loading,
  icon: Icon,
  colors,
}: StreakBannerProps) => {
  // [LOGIC PRESERVED] - Loading state logic unchanged
  if (loading) return <StreakSkeleton />;

  const isActiveStreak = streak > 0;

  return (
    <Card
      className={cn(
        "relative h-full min-h-[140px] border-0 shadow-sm overflow-hidden group transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
        colors.bgGradient
      )}
    >
      {/* Decorative Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute -right-8 -top-8 w-32 h-32 rounded-full border-8 border-current"
          style={{ borderColor: "currentColor" }}
        />
        <div
          className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full border-4 border-current"
          style={{ borderColor: "currentColor" }}
        />
      </div>

      <CardContent className="relative z-10 p-5 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider mb-2">
              {title}
            </h3>
            <div className="flex items-baseline gap-2">
              <p className="text-5xl font-bold text-card-foreground tracking-tight tabular-nums">
                {streak}
              </p>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-card-foreground/80">
                  day{streak !== 1 ? "s" : ""}
                </span>
                <span className="text-xs text-muted-foreground">streak</span>
              </div>
            </div>
          </div>

          <div
            className={cn(
              "flex items-center justify-center rounded-2xl h-14 w-14 flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
              colors.iconBg
            )}
          >
            <Icon className={cn("h-7 w-7", colors.icon)} aria-hidden="true" />
          </div>
        </div>

        {/* Streak Status Indicator */}
        <div className="flex items-center gap-2 mt-4">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              isActiveStreak
                ? "bg-green-500 animate-pulse"
                : "bg-muted-foreground/30"
            )}
            aria-hidden="true"
          />
          <span className="text-xs text-muted-foreground font-medium">
            {isActiveStreak ? "Active streak" : "Start your streak today!"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const QuickActionButton = ({
  action,
}: {
  action: {
    title: string;
    description: string;
    icon: LucideIcon;
    action: () => void;
    color: string;
    bg: string;
  };
}) => {
  const ActionIcon = action.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {/* [LOGIC PRESERVED] - onClick handler unchanged */}
      <button
        onClick={action.action}
        className="flex items-center gap-4 w-full h-full text-left p-4 rounded-xl 
          bg-card border border-border/50 
          hover:border-border hover:shadow-md 
          transition-all duration-200 group"
        aria-label={`Navigate to ${action.title}`}
      >
        <div
          className={cn(
            "rounded-xl p-3 transition-transform duration-200 group-hover:scale-110",
            action.bg
          )}
        >
          <ActionIcon
            className={cn("h-5 w-5", action.color)}
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground group-hover:text-foreground/90 transition-colors">
            {action.title}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {action.description}
          </p>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ArrowRight
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      </button>
    </motion.div>
  );
};

const QuickActions = ({
  setActiveView,
}: {
  setActiveView: (view: ViewState) => void;
}) => {
  // [LOGIC PRESERVED] - All action handlers unchanged
  const actions = [
    {
      title: "Join Standup",
      description: "View today's session",
      icon: Users,
      action: () => setActiveView({ view: "standups" }),
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      title: "Learning Hours",
      description: "Add learning points here",
      icon: BookOpen,
      action: () => setActiveView({ view: "learning-hours" }),
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Students Feedback",
      description: "Get insights",
      icon: MessageSquare,
      action: () => setActiveView({ view: "feedback" }),
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Attendance",
      description: "Check your record",
      icon: Calendar,
      action: () => setActiveView({ view: "attendance" }),
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Today Learning Points",
      description: "Check today's learning points",
      icon: TrendingUp,
      action: () => setActiveView({ view: "learning-hours-points" }),
      color: "text-teal-500",
      bg: "bg-teal-500/10",
    },
    {
      title: "Onboarding Kit",
      description: "Find resources",
      icon: Box,
      action: () => setActiveView({ view: "onboardingKit" }),
      color: "text-pink-500",
      bg: "bg-pink-500/10",
    },
  ];

  return (
    <Card className="border shadow-sm overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                Quick Actions
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Navigate to key sections
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-full">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Quick access</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action) => (
            <QuickActionButton key={action.title} action={action} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// --- Date Display Component ---
const DateDisplay = () => {
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Calendar className="h-4 w-4" aria-hidden="true" />
      <span>{formattedDate}</span>
    </div>
  );
};

// --- Main Page Component ---
export default function UserHome({ setActiveView }: UserHomeProps) {
  // [LOGIC PRESERVED] - All hooks and state logic unchanged
  const { user } = useUserAuth();
  const { attendanceStreak, attendanceLoading } = useAttendanceStreak();
  const { learningStreak, loading: learningIsLoading } = useLearningStreak();

  // [LOGIC PRESERVED] - Greeting logic unchanged
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
      ? "Good afternoon"
      : "Good evening";

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Welcome Section */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative"
        aria-labelledby="welcome-heading"
      >
        {/* Decorative Background */}
        <div
          className="absolute inset-0 -z-10 overflow-hidden rounded-3xl"
          aria-hidden="true"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.03] rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary rounded-full blur-2xl transform -translate-x-1/2 translate-y-1/2" />
        </div>

        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
        >
          <div className="space-y-2">
            <DateDisplay />
            <h1
              id="welcome-heading"
              className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground flex flex-wrap items-center gap-x-3"
            >
              <span>{greeting},</span>
              <span className="break-words text-gradient">
                {user?.displayName || "Member"}
              </span>
              <motion.span
                animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                transition={{
                  duration: 2.5,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: 3,
                }}
              >
                <Sparkles
                  className="h-7 w-7 text-amber-400"
                  aria-hidden="true"
                />
              </motion.span>
            </h1>
            <p className="text-muted-foreground text-base max-w-lg">
              Welcome back! Here's your personal dashboard with today's overview
              and quick actions.
            </p>
          </div>
        </motion.div>
      </motion.section>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Streak Cards */}
          <motion.section
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            aria-label="Streak statistics"
          >
            <motion.div variants={scaleIn}>
              <StreakBanner
                title="Standup Attendance"
                streak={
                  typeof attendanceStreak === "number" ? attendanceStreak : 0
                }
                loading={attendanceLoading}
                icon={Flame}
                colors={{
                  icon: "text-orange-500",
                  bgGradient:
                    "bg-gradient-to-br from-orange-50 via-orange-50/50 to-amber-100/80 dark:from-orange-950/50 dark:via-orange-950/30 dark:to-amber-950/50",
                  iconBg: "bg-orange-500/10",
                }}
              />
            </motion.div>
            <motion.div variants={scaleIn}>
              <StreakBanner
                title="Learning Hours"
                streak={typeof learningStreak === "number" ? learningStreak : 0}
                loading={learningIsLoading}
                icon={BookOpen}
                colors={{
                  icon: "text-blue-500",
                  bgGradient: "bg-blue-50/50 dark:bg-blue-950/20",
                  iconBg: "bg-blue-500/10",
                }}
              />
            </motion.div>
          </motion.section>

          {/* Quick Actions */}
          <motion.section
            initial="hidden"
            animate="visible"
            variants={itemVariants}
            transition={{ delay: 0.15 }}
            aria-label="Quick actions"
          >
            <QuickActions setActiveView={setActiveView} />
          </motion.section>
        </div>

        {/* Right Column - Sidebar */}
        <aside className="lg:col-span-4" aria-label="Daily inspiration">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
            transition={{ delay: 0.25 }}
            className="lg:sticky lg:top-24 space-y-4"
          >
            {/* Section Label */}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" aria-hidden="true" />
              <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-2">
                Daily Inspiration
              </span>
              <div className="h-px flex-1 bg-border" aria-hidden="true" />
            </div>

            <MotivationalQuote />
          </motion.div>
        </aside>
      </div>
    </div>
  );
}
