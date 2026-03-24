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
  Sparkles,
  Menu,
  X,
  ChevronDown,
  Users,
  TrendingUp,
  MessageSquare,
  BrainCircuit,
  Calendar,
  GraduationCap,
  Flame,
} from "lucide-react";
import { motion, easeOut, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// --- Animation Variants ---
// [LOGIC PRESERVED] - Animation variants structure unchanged
const sectionVariant = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
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

const cardVariant = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0 },
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
          : "bg-transparent",
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
              <div className="flex flex-col gap-2">
                <a
                  href="#features"
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Features
                </a>
                <div className="pt-2 border-t border-border/50 flex flex-col gap-2">
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

      {/* Simple Background Elements */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/[0.02] rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
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
              </div>
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

        {/* Section 2: Features */}
        <motion.section
          id="features"
          variants={sectionVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="relative py-20 sm:py-24 lg:py-32 bg-secondary/20"
          aria-labelledby="features-heading"
        >
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            aria-hidden="true"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-secondary/50 rounded-full blur-3xl" />
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
                  Key Capabilities
                </span>
              </motion.div>
              <h2
                id="features-heading"
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

        {/* Section 3: Final CTA */}
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
  onButtonClick: () => void;
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
    <Card
      className={cn(
        "group h-full flex flex-col cursor-pointer",
        "border border-border/50 hover:border-border",
        "shadow-sm hover:shadow-xl",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1",
        sizeClasses[size],
        cardClasses,
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
            : "bg-secondary border border-border/50",
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
          descriptionClasses,
        )}
      >
        {description}
      </p>

      {/* Action indicator */}
      <div
        className={cn(
          "mt-6 flex items-center gap-2 text-sm font-medium",
          "opacity-60 group-hover:opacity-100 transition-opacity",
          isDark ? "text-primary-foreground" : "text-primary",
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
