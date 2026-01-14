/**
 * LandingPage component - The main landing page for NxtProf application.
 *
 * Features:
 * - Sticky navigation header with smooth transitions
 * - Hero section with enhanced visual hierarchy
 * - Feature cards with glass morphism and improved hover states
 * - Architecture section with modern layout
 * - Responsive design with framer-motion animations
 * - Enhanced footer with better structure
 *
 * @component
 * @returns {JSX.Element} The rendered landing page.
 */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  BrainCircuit,
  CheckSquare,
  ShieldCheck,
  KeyRound,
  FileSpreadsheet,
  Sparkles,
  Zap,
  Users,
  MessageSquare,
  Calendar,
  TrendingUp,
  GraduationCap,
  BarChart3,
  Lock,
  Flame,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { motion, easeOut, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// --- Animation Variants ---
// [LOGIC PRESERVED] - Animation variants structure unchanged
const sectionVariant = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0 },
};

const floatVariant = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

// --- Sticky Navigation Header ---
function StickyHeader({ onNavigateToAuth }: { onNavigateToAuth: () => void }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm"
          : "bg-transparent"
      )}
      role="banner"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <a
            href="#"
            className="flex items-center gap-2 group"
            aria-label="NxtProf Home"
          >
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                N
              </span>
            </div>
            <span className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">
              NxtProf
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex items-center gap-8"
            role="navigation"
            aria-label="Main navigation"
          >
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#admin"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              For Admins
            </a>
            <a
              href="#architecture"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Architecture
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {/* [LOGIC PRESERVED] - onClick handler unchanged */}
            <Button
              variant="ghost"
              className="text-sm font-medium"
              onClick={onNavigateToAuth}
            >
              Sign In
            </Button>
            <Button
              className="text-sm font-medium shadow-sm"
              onClick={onNavigateToAuth}
            >
              Get Started
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border/50 py-4"
              role="navigation"
              aria-label="Mobile navigation"
            >
              <div className="flex flex-col gap-3">
                <a
                  href="#features"
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Features
                </a>
                <a
                  href="#admin"
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  For Admins
                </a>
                <a
                  href="#architecture"
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Architecture
                </a>
                <div className="pt-3 border-t border-border/50 flex flex-col gap-2">
                  {/* [LOGIC PRESERVED] - onClick handler unchanged */}
                  <Button
                    variant="outline"
                    className="w-full justify-center"
                    onClick={onNavigateToAuth}
                  >
                    Sign In
                  </Button>
                  <Button
                    className="w-full justify-center"
                    onClick={onNavigateToAuth}
                  >
                    Get Started
                  </Button>
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

// --- Scroll Indicator ---
function ScrollIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.5 }}
      className="hidden lg:flex flex-col items-center gap-2 absolute bottom-8 left-1/2 -translate-x-1/2"
    >
      <span className="text-xs text-muted-foreground font-medium">
        Scroll to explore
      </span>
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown
          className="h-5 w-5 text-muted-foreground"
          aria-hidden="true"
        />
      </motion.div>
    </motion.div>
  );
}

// --- Section Divider ---
function SectionDivider({ className }: { className?: string }) {
  return (
    <div className={cn("container mx-auto px-4", className)} aria-hidden="true">
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

// --- Main Landing Page Component ---
export default function LandingPage() {
  // [LOGIC PRESERVED] - Navigation logic remains unchanged
  const navigate = useNavigate();

  // [LOGIC PRESERVED] - Handler remains unchanged
  const handleNavigateToAuth = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      {/* Sticky Header */}
      <StickyHeader onNavigateToAuth={handleNavigateToAuth} />

      {/* Animated Wave Background */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {/* Gradient orbs for ambient lighting */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/[0.02] rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />

        {/* Top Wave */}
        <div className="absolute top-0 left-0 right-0 h-[150px] opacity-25">
          <svg
            className="absolute w-[200%] h-full animate-wave-slow"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="currentColor"
              className="text-primary/10"
              d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,186.7C960,213,1056,235,1152,213.3C1248,192,1344,128,1392,96L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
            />
          </svg>
          <svg
            className="absolute w-[200%] h-full animate-wave-slower"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ animationDelay: "-5s" }}
          >
            <path
              fill="currentColor"
              className="text-secondary/20"
              d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,149.3C672,149,768,171,864,165.3C960,160,1056,128,1152,122.7C1248,117,1344,139,1392,149.3L1440,160L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
            />
          </svg>
        </div>

        {/* Middle Wave - subtle */}
        <div className="absolute top-1/2 left-0 right-0 h-[100px] opacity-15">
          <svg
            className="absolute w-[200%] h-full animate-wave-medium"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="currentColor"
              className="text-border"
              d="M0,224L48,208C96,192,192,160,288,170.7C384,181,480,235,576,234.7C672,235,768,181,864,165.3C960,149,1056,171,1152,186.7C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0 h-[150px] opacity-25">
          <svg
            className="absolute w-[200%] h-full animate-wave-slow"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="currentColor"
              className="text-primary/10"
              d="M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,106.7C672,117,768,171,864,197.3C960,224,1056,224,1152,197.3C1248,171,1344,117,1392,90.7L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
          <svg
            className="absolute w-[200%] h-full animate-wave-slower"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ animationDelay: "-3s" }}
          >
            <path
              fill="currentColor"
              className="text-secondary/20"
              d="M0,192L48,176C96,160,192,128,288,133.3C384,139,480,181,576,197.3C672,213,768,203,864,176C960,149,1056,107,1152,101.3C1248,96,1344,128,1392,144L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
        </div>
      </div>

      <main className="flex-1 relative z-10" role="main">
        {/* Section 1: Hero */}
        <section
          className="relative container mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 sm:pt-32 sm:pb-24 lg:pt-36 lg:pb-32 min-h-[90vh] flex flex-col justify-center"
          aria-labelledby="hero-heading"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-16">
            {/* Hero Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="lg:col-span-7 text-center lg:text-left order-2 lg:order-1"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 backdrop-blur-sm border border-border/50 mb-6 shadow-sm"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  AI-Powered Professional Development
                </span>
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              </motion.div>

              <h1
                id="hero-heading"
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.1]"
              >
                <span className="block">Your Team's</span>
                <span className="block text-gradient mt-2 relative">
                  Growth Engine
                  <motion.span
                    className="absolute -right-2 -top-2"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Sparkles
                      className="h-6 w-6 lg:h-8 lg:w-8 text-amber-400"
                      aria-hidden="true"
                    />
                  </motion.span>
                </span>
              </h1>

              <p className="mt-6 lg:mt-8 text-lg lg:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                <span className="font-semibold text-foreground">NxtProf</span>{" "}
                streamlines team coordination, enhances professional
                development, and provides deep AI-driven insights into employee
                performance—all built on Firebase for enterprise-grade security.
              </p>

              {/* CTA Group */}
              <div className="mt-8 lg:mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                {/* [LOGIC PRESERVED] - onClick handler unchanged */}
                <Button
                  size="lg"
                  className="group px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
                  onClick={handleNavigateToAuth}
                  aria-label="Get started with NxtProf"
                >
                  Get Started
                  <ArrowRight
                    className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-6 text-base font-medium w-full sm:w-auto"
                  onClick={handleNavigateToAuth}
                  aria-label="Learn more about NxtProf features"
                >
                  Watch Demo
                </Button>
              </div>

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-10 lg:mt-12"
              >
                <p className="text-xs text-muted-foreground/70 uppercase tracking-wider font-medium mb-4">
                  Trusted by teams for
                </p>
                <div className="flex flex-wrap items-center gap-6 justify-center lg:justify-start">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
                    <Flame
                      className="h-5 w-5 text-orange-500"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium">Streak Tracking</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
                    <MessageSquare
                      className="h-5 w-5 text-purple-500"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium">Peer Feedback</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50">
                    <BrainCircuit
                      className="h-5 w-5 text-blue-500"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium">AI Insights</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Hero Illustration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="lg:col-span-5 flex items-center justify-center order-1 lg:order-2"
            >
              <motion.div
                variants={floatVariant}
                animate="animate"
                className="relative w-full max-w-md lg:max-w-lg"
              >
                {/* Decorative rings */}
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 60,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-72 h-72 lg:w-96 lg:h-96 rounded-full border border-border/30"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{
                      duration: 45,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute w-56 h-56 lg:w-72 lg:h-72 rounded-full border border-border/20"
                  />
                </div>
                <HeroIllustration
                  className="relative z-10 w-full text-primary"
                  aria-hidden="true"
                />
              </motion.div>
            </motion.div>
          </div>

          <ScrollIndicator />
        </section>

        {/* Section 2: Team Member Features */}
        <motion.section
          id="features"
          variants={sectionVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="relative bg-secondary/30 py-20 sm:py-24 lg:py-32"
          aria-labelledby="team-features-heading"
        >
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            aria-hidden="true"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-background/50 rounded-full blur-3xl" />
          </div>

          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4"
              >
                <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                <span className="text-sm font-semibold text-primary">
                  For Team Members
                </span>
              </motion.div>
              <h2
                id="team-features-heading"
                className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
              >
                Everything You Need to{" "}
                <span className="text-gradient">Grow</span>
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                A personalized experience designed to boost your professional
                development and keep you engaged.
              </p>
            </div>

            {/* Feature Grid */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6"
            >
              <motion.div variants={cardVariant}>
                <FeatureCard
                  icon={
                    <TrendingUp
                      className="h-7 w-7 text-primary"
                      aria-hidden="true"
                    />
                  }
                  title="Personalized Dashboard"
                  description="Your central hub displaying attendance streaks for standups and learning hours, alerts for scheduled events, and quick access to all features."
                  onButtonClick={handleNavigateToAuth}
                />
              </motion.div>

              <motion.div variants={cardVariant}>
                <FeatureCard
                  icon={
                    <MessageSquare
                      className="h-7 w-7 text-primary"
                      aria-hidden="true"
                    />
                  }
                  title="Comprehensive Peer Feedback"
                  description="Request feedback from colleagues, give structured anonymous feedback to teammates, and view all feedback you've received in a unified, 100% anonymous view."
                  onButtonClick={handleNavigateToAuth}
                />
              </motion.div>

              <motion.div variants={cardVariant}>
                <FeatureCard
                  icon={
                    <BrainCircuit
                      className="h-7 w-7 text-primary"
                      aria-hidden="true"
                    />
                  }
                  title="AI-Powered Insights"
                  description="View personalized, AI-generated summaries of your performance feedback, including positive highlights and actionable areas for improvement."
                  onButtonClick={handleNavigateToAuth}
                />
              </motion.div>

              <motion.div variants={cardVariant}>
                <FeatureCard
                  icon={
                    <Calendar
                      className="h-7 w-7 text-primary"
                      aria-hidden="true"
                    />
                  }
                  title="Session Participation"
                  description="Easily view schedules and status for daily standups and dedicated learning hours. Never miss an important session again."
                  onButtonClick={handleNavigateToAuth}
                />
              </motion.div>

              <motion.div variants={cardVariant}>
                <FeatureCard
                  icon={
                    <GraduationCap
                      className="h-7 w-7 text-primary"
                      aria-hidden="true"
                    />
                  }
                  title="Comprehensive Onboarding"
                  description="A guided onboarding experience with training videos, essential resource checklists, and a knowledge assessment to ensure readiness."
                  onButtonClick={handleNavigateToAuth}
                />
              </motion.div>

              <motion.div variants={cardVariant}>
                <FeatureCard
                  icon={
                    <Flame
                      className="h-7 w-7 text-primary"
                      aria-hidden="true"
                    />
                  }
                  title="Streak Tracking"
                  description="Build momentum with consecutive attendance streaks for both standups and learning hours. Stay motivated and consistent."
                  onButtonClick={handleNavigateToAuth}
                />
              </motion.div>
            </motion.div>
          </div>
        </motion.section>

        <SectionDivider />

        {/* Section 3: Admin Features */}
        <section
          id="admin"
          className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-32"
          aria-labelledby="admin-features-heading"
        >
          <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary border border-border mb-4"
            >
              <ShieldCheck
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <span className="text-sm font-semibold text-foreground">
                For Admins
              </span>
            </motion.div>
            <h2
              id="admin-features-heading"
              className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
            >
              Powerful Tools for{" "}
              <span className="text-gradient">Team Leaders</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Complete visibility and control to drive team performance and
              organizational growth.
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6"
          >
            <motion.div variants={cardVariant}>
              <FeatureCard
                icon={
                  <BarChart3
                    className="h-7 w-7 text-primary"
                    aria-hidden="true"
                  />
                }
                title="Central Admin Dashboard"
                description="An at-a-glance summary of day's standups and learning hours with real-time attendance counts and employee metrics."
                onButtonClick={handleNavigateToAuth}
              />
            </motion.div>

            <motion.div variants={cardVariant}>
              <FeatureCard
                icon={
                  <BrainCircuit
                    className="h-7 w-7 text-primary"
                    aria-hidden="true"
                  />
                }
                title="AI Feedback Analysis"
                description="Analyze employee feedback from Google Sheets using Gemini AI with insights, charts, and actionable suggestions."
                onButtonClick={handleNavigateToAuth}
              />
            </motion.div>

            <motion.div variants={cardVariant}>
              <FeatureCard
                icon={
                  <Users className="h-7 w-7 text-primary" aria-hidden="true" />
                }
                title="Employee Management"
                description="View, search, and inline-edit employee details. Securely manage roles with Firebase Custom Claims."
                onButtonClick={handleNavigateToAuth}
              />
            </motion.div>

            <motion.div variants={cardVariant}>
              <FeatureCard
                icon={
                  <CheckSquare
                    className="h-7 w-7 text-primary"
                    aria-hidden="true"
                  />
                }
                title="Session Management"
                description="Schedule standups and learning hours. Monitor real-time attendance and manually edit records."
                onButtonClick={handleNavigateToAuth}
              />
            </motion.div>

            <motion.div variants={cardVariant}>
              <FeatureCard
                icon={
                  <ShieldCheck
                    className="h-7 w-7 text-primary"
                    aria-hidden="true"
                  />
                }
                title="Feedback Transparency"
                description="Real-time audit trail of all peer feedback across the organization with employee filtering."
                onButtonClick={handleNavigateToAuth}
              />
            </motion.div>

            <motion.div variants={cardVariant}>
              <FeatureCard
                icon={
                  <FileSpreadsheet
                    className="h-7 w-7 text-primary"
                    aria-hidden="true"
                  />
                }
                title="Google Sheets Sync"
                description="Sync all attendance data to a master Google Sheet with one click for record-keeping."
                onButtonClick={handleNavigateToAuth}
              />
            </motion.div>
          </motion.div>
        </section>

        {/* Section 4: Architecture / Built on Firebase */}
        <motion.section
          id="architecture"
          variants={sectionVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="relative bg-secondary/30 py-20 sm:py-24 lg:py-32"
          aria-labelledby="architecture-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-16">
              {/* Illustration */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="lg:col-span-5 flex items-center justify-center lg:order-2"
              >
                <div className="relative w-full max-w-md">
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-secondary to-muted rounded-3xl transform rotate-3 scale-105"
                    aria-hidden="true"
                  />
                  <div className="relative bg-card border border-border rounded-2xl p-8 lg:p-10 shadow-xl">
                    <StandOutIllustration
                      className="w-full text-primary"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Content */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="lg:col-span-7 lg:order-1"
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
                  <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-sm font-semibold text-primary">
                    Built on Firebase
                  </span>
                </div>
                <h2
                  id="architecture-heading"
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
                >
                  Enterprise-Grade{" "}
                  <span className="text-gradient">Architecture</span>
                </h2>
                <p className="mt-4 lg:mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl">
                  A secure and scalable architecture with clear separation
                  between the React frontend and Firebase Cloud Functions
                  backend.
                </p>

                {/* Benefits */}
                <div className="mt-8 lg:mt-10 space-y-4">
                  <BenefitItem
                    icon={
                      <Lock
                        className="h-6 w-6 text-primary"
                        aria-hidden="true"
                      />
                    }
                    title="Role-Based Access Control"
                    description="Distinct roles for Team Members and Admins enforced with Firebase Custom Claims. Users only see what they need to."
                    index={1}
                  />
                  <BenefitItem
                    icon={
                      <FileSpreadsheet
                        className="h-6 w-6 text-primary"
                        aria-hidden="true"
                      />
                    }
                    title="Seamless Google Integration"
                    description="Connect directly to private Google Sheets for feedback analysis and attendance syncing via secure service account authentication."
                    index={2}
                  />
                  <BenefitItem
                    icon={
                      <BrainCircuit
                        className="h-6 w-6 text-primary"
                        aria-hidden="true"
                      />
                    }
                    title="Gemini AI-Powered Analysis"
                    description="Transform raw feedback into structured, actionable intelligence with Google's Gemini 2.5 Flash Lite model."
                    index={3}
                  />
                  <BenefitItem
                    icon={
                      <Zap
                        className="h-6 w-6 text-primary"
                        aria-hidden="true"
                      />
                    }
                    title="Real-Time Everything"
                    description="Firestore's real-time listeners power instant updates across attendance tracking, feedback, and session management."
                    index={4}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Section 5: Final CTA */}
        <section
          className="relative py-20 sm:py-24 lg:py-32 overflow-hidden"
          aria-labelledby="cta-heading"
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              {/* Background Card */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/50 to-muted/30 rounded-3xl" />
              <div className="absolute inset-0 bg-card/50 backdrop-blur-sm border border-border rounded-3xl shadow-2xl" />

              {/* Decorative elements */}
              <div
                className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"
                aria-hidden="true"
              />
              <div
                className="absolute bottom-0 left-0 w-56 h-56 bg-secondary rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3"
                aria-hidden="true"
              />

              <div className="relative z-10 py-16 px-8 sm:py-20 sm:px-12 lg:py-24 lg:px-16 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6"
                >
                  <Sparkles
                    className="h-8 w-8 text-primary"
                    aria-hidden="true"
                  />
                </motion.div>

                <h2
                  id="cta-heading"
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
                >
                  Ready to Elevate Your{" "}
                  <span className="text-gradient">Team's Growth?</span>
                </h2>
                <p className="mt-4 lg:mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
                  Join teams already using NxtProf to streamline standups, track
                  development, and unlock AI-powered insights.
                </p>
                <div className="mt-8 lg:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  {/* [LOGIC PRESERVED] - onClick handler unchanged */}
                  <Button
                    size="lg"
                    className="group px-10 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
                    onClick={handleNavigateToAuth}
                    aria-label="Start using NxtProf for free"
                  >
                    Get Started
                    <ArrowRight
                      className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="relative py-12 lg:py-16 border-t border-border bg-card/50"
        role="contentinfo"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand Section */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">
                    N
                  </span>
                </div>
                <span className="text-xl font-bold">NxtProf</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm">
                Empowering teams to grow, learn, and succeed together with
                AI-powered insights and seamless collaboration tools.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                Product
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#features"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#admin"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    For Admins
                  </a>
                </li>
                <li>
                  <a
                    href="#architecture"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Architecture
                  </a>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                Company
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright Bar */}
          <div className="mt-12 pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} NxtProf. All Rights Reserved.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Built with Firebase & React
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Reusable Sub-components ---

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isDark?: boolean;
  onButtonClick: () => void; // [LOGIC PRESERVED] - Prop type unchanged
  size?: "default" | "large" | "wide";
}

function FeatureCard({
  icon,
  title,
  description,
  isDark = false,
  onButtonClick,
  size = "default",
}: FeatureCardProps) {
  const cardClasses = isDark
    ? "bg-primary text-primary-foreground"
    : "bg-card/80 backdrop-blur-sm";
  const titleClasses = isDark
    ? "text-primary-foreground"
    : "text-card-foreground";
  const descriptionClasses = isDark
    ? "text-primary-foreground/80"
    : "text-muted-foreground";

  const sizeClasses = {
    default: "p-6",
    large: "p-8 lg:p-10",
    wide: "p-6 lg:p-8",
  };

  return (
    // [LOGIC PRESERVED] - onClick handler unchanged
    <Card
      className={cn(
        "group h-full flex flex-col cursor-pointer",
        "border border-border/50 hover:border-border",
        "shadow-sm hover:shadow-xl",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1",
        sizeClasses[size],
        cardClasses
      )}
      onClick={onButtonClick}
      role="article"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onButtonClick()}
    >
      {/* Icon Container */}
      <div
        className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center mb-5",
          "transition-all duration-300 group-hover:scale-110 group-hover:shadow-md",
          isDark
            ? "bg-primary-foreground/10"
            : "bg-secondary border border-border/50"
        )}
      >
        {icon}
      </div>

      {/* Content */}
      <h3 className={cn("text-lg lg:text-xl font-semibold", titleClasses)}>
        {title}
      </h3>
      <p
        className={cn(
          "mt-3 text-sm lg:text-base leading-relaxed flex-grow",
          descriptionClasses
        )}
      >
        {description}
      </p>

      {/* Action indicator */}
      <div
        className={cn(
          "mt-6 flex items-center gap-2 text-sm font-medium",
          "opacity-60 group-hover:opacity-100 transition-opacity",
          isDark ? "text-primary-foreground" : "text-primary"
        )}
      >
        <span>{isDark ? "Learn More" : "Get Started"}</span>
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      </div>
    </Card>
  );
}

interface BenefitItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index?: number;
}

function BenefitItem({
  icon,
  title,
  description,
  index = 0,
}: BenefitItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group flex items-start gap-4 p-5 rounded-xl bg-card border border-border/50 hover:border-border hover:shadow-lg transition-all duration-300"
      role="article"
    >
      <div className="flex-shrink-0 w-12 h-12 bg-secondary border border-border/50 rounded-xl flex items-center justify-center group-hover:scale-105 group-hover:shadow-md transition-all duration-300">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-lg text-card-foreground">{title}</h4>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

// --- SVG Illustrations ---

function HeroIllustration(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 450 350"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      aria-label="Dashboard illustration"
    >
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="50" y="100" width="300" height="180" rx="12" />
        <path d="M150 280 L250 280" />
        <path d="M200 280 L200 310" />
        <path d="M170 310 L230 310" />
        <circle cx="350" cy="80" r="30" />
        <path d="M350 110 C 350 150, 320 180, 280 180" />
        <path d="M365 70 C 375 75, 380 85, 375 95" />
        <rect
          x="80"
          y="130"
          width="100"
          height="60"
          fill="currentColor"
          fillOpacity="0.1"
        />
        <rect
          x="190"
          y="140"
          width="80"
          height="40"
          rx="4"
          fill="currentColor"
          fillOpacity="0.1"
        />
        <path
          d="M280 120 L320 100 L300 140z"
          fill="currentColor"
          fillOpacity="0.1"
        />
        <circle
          cx="130"
          cy="220"
          r="15"
          fill="currentColor"
          fillOpacity="0.1"
        />
      </g>
    </svg>
  );
}

function StandOutIllustration(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 450 350"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      aria-label="Team collaboration illustration"
    >
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="100" r="30" />
        <path d="M100 130 C 100 180, 70 200, 50 220" />
        <circle cx="200" cy="90" r="30" />
        <path d="M200 120 C 200 170, 180 190, 150 210" />
        <path d="M200 120 C 200 170, 220 190, 250 210" />
        <circle cx="300" cy="100" r="30" />
        <path d="M300 130 C 300 180, 330 200, 350 220" />
        <path d="M130 140 C 180 120, 250 120, 270 140" />
        <path d="M70 140 C 20 160, 40 200, 80 180" />
        <path d="M330 140 C 380 160, 360 200, 320 180" />
      </g>
    </svg>
  );
}
