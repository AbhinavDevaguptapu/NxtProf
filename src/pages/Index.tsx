// src/pages/Index.tsx

import AppNavbar from "@/components/AppNavbar";
import { NavigationCard } from "@/components/NavigationCard";
import { useUserAuth } from "@/context/UserAuthContext";
import { useAttendanceStreak } from "@/hooks/use-attendance-streak";
import { useLearningStreak } from "@/hooks/use-learning-streak"; // <-- 1. IMPORT new hook
import { Navigate } from "react-router-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { Loader2, Flame, BookOpen, User } from "lucide-react"; // <-- 2. IMPORT new icon
import { motion, Variants } from "framer-motion";

// Import icons for the navigation cards
import { MessageSquareQuote, Users, GraduationCap, Box, CalendarCheck } from "lucide-react";

// The dashboardItems array remains the same
const dashboardItems = [
  { to: "/feedback", icon: <MessageSquareQuote className="h-8 w-8" />, title: "AI Feedback", description: "View AI-powered summaries and trends of your performance feedback." },
  { to: "/standups", icon: <Users className="h-8 w-8" />, title: "Standups", description: "Check the daily standup schedule and status." },
  { to: "/learning-hours", icon: <GraduationCap className="h-8 w-8" />, title: "Learning Hours", description: "Log and track your professional development and learning time." },
  { to: "/onboardingKit", icon: <Box className="h-8 w-8" />, title: "Onboarding Kit", description: "Access essential resources, checklists, and guides." },
  { to: "/attendance", icon: <CalendarCheck className="h-8 w-8" />, title: "Attendance", description: "Review your personal attendance records and history." },
  {
    to: "/profile",
    icon: <User className="h-8 w-8" />,
    title: "Your Profile",
    description: "Update your name, picture, and feedback sheet URL.",
  }
];

// --- 2. DEFINE ANIMATION VARIANTS ---
// This is a clean way to manage animations for lists.
// The parent container will stagger the animation of its children.
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // This will apply a 0.1s delay to each child's animation
    },
  },
};

// Each item in the grid will have this animation.
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};
// ---

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

// --- 3. CREATE NEW LearningStreakBanner COMPONENT ---
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
// ---

export default function Index() {
  const { user, loading: userAuthLoading } = useUserAuth();
  const { admin, initialized: adminInitialized } = useAdminAuth();

  // Loading and redirect logic remains the same
  if (userAuthLoading || !adminInitialized) {
    return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (admin) return <Navigate to="/admin" replace />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1">
        <div className="container mx-auto p-4 md:p-8">
          <motion.div className="mb-8 space-y-2" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.displayName || "Team Member"}!</h1>
            <p className="text-lg text-muted-foreground">Here's your central hub. Choose an option below to get started.</p>
          </motion.div>

          {/* --- 4. UPDATE BANNERS TO BE IN A GRID --- */}
          <motion.div
            className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          >
            <HomeStreakBanner />
            <LearningStreakBanner />
          </motion.div>
          {/* --- */}

          <motion.div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" variants={containerVariants} initial="hidden" animate="visible" transition={{ delayChildren: 0.4, staggerChildren: 0.1 }}>
            {dashboardItems.map((item) => (
              <motion.div key={item.title} variants={itemVariants} whileHover={{ scale: 1.05, y: -5 }} transition={{ duration: 0.2 }}>
                <NavigationCard to={item.to} icon={item.icon} title={item.title} description={item.description} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
  );
}