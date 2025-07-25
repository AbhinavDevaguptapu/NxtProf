"use client"

import React from "react"
import { useUserAuth } from "@/context/UserAuthContext"
import { useAttendanceStreak } from "@/hooks/use-attendance-streak"
import { useLearningStreak } from "@/hooks/use-learning-streak"
import { Activity, BookOpen, Box, Calendar, Flame, LucideIcon, MessageSquare, ArrowRight, Sparkles, Users } from "lucide-react"
import { motion, Variants } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ViewState } from "@/layout/AppShell"
import MotivationalQuote from "@/components/common/MotivationalQuote"
import { cn } from "@/lib/utils"

// --- Animation Variants ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
}

// --- Prop Interfaces ---
interface UserHomeProps {
  setActiveView: (view: ViewState) => void
}

interface StreakBannerProps {
  title: string
  streak: number
  loading: boolean
  icon: LucideIcon
  colors: {
    icon: string
    bgGradient: string
    iconBg: string
  }
}

// --- Reusable Sub-Components ---

const StreakSkeleton = () => (
  <Card className="h-[98px] md:h-[110px]">
    <CardContent className="p-4 md:p-5 h-full">
      <div className="flex items-center gap-4 animate-pulse h-full">
        <div className="rounded-full bg-muted h-14 w-14 flex-shrink-0"></div>
        <div className="space-y-2 flex-1">
          <div className="h-4 w-3/4 rounded bg-muted"></div>
          <div className="h-6 w-1/2 rounded bg-muted"></div>
        </div>
      </div>
    </CardContent>
  </Card>
)

const StreakBanner = ({ title, streak, loading, icon: Icon, colors }: StreakBannerProps) => {
  if (loading) return <StreakSkeleton />

  return (
    <Card className={cn("border-0 shadow-sm overflow-hidden", colors.bgGradient)}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center gap-4">
          <div className={cn("flex items-center justify-center rounded-full h-14 w-14 flex-shrink-0", colors.iconBg)}>
            <Icon className={cn("h-7 w-7", colors.icon)} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-muted-foreground text-sm">{title}</h3>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-bold text-card-foreground">{streak}</p>
              <span className="text-sm font-medium text-muted-foreground">day streak</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const QuickActions = ({ setActiveView }: { setActiveView: (view: ViewState) => void }) => {
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
      description: "Access materials",
      icon: BookOpen,
      action: () => setActiveView({ view: "learning-hours" }),
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "AI Feedback",
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
      title: "Onboarding Kit",
      description: "Find resources",
      icon: Box,
      action: () => setActiveView({ view: "onboardingKit" }),
      color: "text-pink-500",
      bg: "bg-pink-500/10",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" />
          Quick Actions
        </CardTitle>
        <p className="text-sm text-muted-foreground">Navigate to key sections of the app.</p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((action) => (
          <motion.div
            key={action.title}
            whileHover={{ scale: 1.03 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <button
              onClick={action.action}
              className="flex items-center gap-3 w-full h-full text-left p-3 rounded-lg bg-background hover:bg-muted transition-colors"
            >
              <div className={cn("rounded-lg p-2", action.bg)}>
                <action.icon className={cn("h-5 w-5", action.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-card-foreground">{action.title}</p>
                <p className="text-xs text-muted-foreground truncate">{action.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  )
}

// --- Main Page Component ---
export default function UserHome({ setActiveView }: UserHomeProps) {
  const { user } = useUserAuth()
  const { attendanceStreak, attendanceLoading } = useAttendanceStreak()
  const { learningStreak, loading: learningIsLoading } = useLearningStreak()

  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening"

  return (
    <div className="space-y-6 lg:space-y-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        className="space-y-1"
      >
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex flex-wrap items-center gap-x-2">
          {greeting}, <span className="break-words">{user?.displayName || "Member"}!</span>
          <Sparkles className="h-6 w-6 text-amber-400" />
        </h1>
        <p className="text-muted-foreground text-base">
          Welcome back, here's your overview for today.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <StreakBanner
                title="Standup Attendance"
                streak={typeof attendanceStreak === 'number' ? attendanceStreak : 0}
                loading={attendanceLoading}
                icon={Flame}
                colors={{
                  icon: "text-orange-500",
                  bgGradient: "bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/50 dark:to-amber-950/50",
                  iconBg: "bg-orange-500/10",
                }}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <StreakBanner
                title="Learning Hours"
                streak={typeof learningStreak === 'number' ? learningStreak : 0}
                loading={learningIsLoading}
                icon={BookOpen}
                colors={{
                  icon: "text-blue-500",
                  bgGradient: "bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50",
                  iconBg: "bg-blue-500/10",
                }}
              />
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
            transition={{ delay: 0.1 }}
          >
            <QuickActions setActiveView={setActiveView} />
          </motion.div>
        </div>

        <div className="lg:col-span-1">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
            transition={{ delay: 0.2 }}
            className="lg:sticky lg:top-24"
          >
            <MotivationalQuote />
          </motion.div>
        </div>
      </div>
    </div>
  )
}