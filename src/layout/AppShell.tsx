import React, { useState, useEffect, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "@/components/common/Sidebar";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useUserAuth } from "@/context/UserAuthContext";
import FloatingNav from "@/components/common/FloatingNav";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

// Lazy load feature components for code splitting
const UserHome = lazy(() => import("@/features/home/pages/Index"));
const AdminHome = lazy(() => import("@/features/admin/pages/AdminHome"));
const ProfilePage = lazy(() => import("@/features/profile/pages/ProfilePage"));
const StandupsPage = lazy(() => import("@/features/standups/pages/Standups"));
const Attendance = lazy(() => import("@/features/attendance/pages/Attendance"));
const FeedbackPage = lazy(
  () => import("@/features/feedback/pages/FeedbackPage")
);
const LearningHours = lazy(
  () => import("@/features/learning-hours/pages/LearningHours")
);
const OnboardingVideoPage = lazy(
  () => import("@/features/onboarding/pages/OnBoardingPage")
);
const AdminEmployeeDashboard = lazy(
  () => import("@/features/admin/pages/AdminEmployeeDashboard")
);
const PeerFeedbackPage = lazy(
  () => import("@/features/peer-feedback/pages/PeerFeedbackPage")
);
const AdminPeerFeedback = lazy(
  () => import("@/features/admin/pages/AdminPeerFeedback")
);
const AdminLearningHours = lazy(
  () => import("@/features/admin/pages/AdminLearningHours")
);
const DailyObservationsPage = lazy(
  () => import("@/features/daily-observations/pages/DailyObservationsPage")
);
const ArchivedEmployeesPage = lazy(
  () => import("@/features/admin/pages/ArchivedEmployeesPage")
);
const CoAdminAddLearningPoints = lazy(
  () => import("@/features/co-admin/pages/CoAdminAddLearningPoints")
);
const UserApprovalPage = lazy(
  () => import("@/features/admin/pages/UserApprovalPage")
);

export type ViewType =
  | "home"
  | "standups"
  | "attendance"
  | "learning-hours"
  | "feedback"
  | "profile"
  | "onboardingKit"
  | "manage-employees"
  | "employee-detail"
  | "peer-feedback"
  | "admin-peer-feedback"
  | "learning-hours-points"
  | "daily-observations"
  | "archived-employees"
  | "add-learning-points"
  | "user-approval";

export interface ViewState {
  view: ViewType;
  context?: unknown;
}

const AccessDenied = () => (
  <p className="text-lg md:text-base">
    You do not have permission to view this page.
  </p>
);

// Loading fallback for lazy-loaded components
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="relative h-12 w-12">
      <div className="absolute inset-0 rounded-full border-[3px] border-muted animate-spin"></div>
      <div className="absolute inset-2 rounded-full border-[3px] border-primary border-t-transparent animate-spin"></div>
    </div>
  </div>
);

// Function to get the initial view from the URL hash
const getInitialView = (): ViewState => {
  const hash = window.location.hash.replace("#", "");
  if (hash) {
    // You might want to add more robust parsing here if you use context in the URL
    return { view: hash as ViewType };
  }
  return { view: "home" };
};

export default function AppShell() {
  const { admin } = useAdminAuth();
  const { isCoAdmin, isAdmin } = useUserAuth();
  const [activeView, setActiveView] = useState<ViewState>(getInitialView);

  // This effect handles the browser's back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        setActiveView(event.state);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // This function centralizes navigation logic
  const handleSetActiveView = (newViewState: ViewState) => {
    // Only push a new state if the view is actually changing
    if (
      newViewState.view !== activeView.view ||
      JSON.stringify(newViewState.context) !==
        JSON.stringify(activeView.context)
    ) {
      setActiveView(newViewState);
      const newUrl = `#${newViewState.view}`;
      // Use pushState to add to history
      window.history.pushState(newViewState, "", newUrl);
    }
  };

  const renderContent = () => {
    const { view } = activeView;

    const viewMap: Record<
      string,
      React.ComponentType<{ setActiveView: (view: ViewState) => void }>
    > = {
      home: admin ? AdminHome : UserHome,
      standups: StandupsPage,
      attendance: Attendance,
      "learning-hours": LearningHours,
      feedback: FeedbackPage,
      profile: ProfilePage,
      onboardingKit: OnboardingVideoPage,

      "peer-feedback": PeerFeedbackPage,
      "admin-peer-feedback": admin ? AdminPeerFeedback : AccessDenied,
      "learning-hours-points": AdminLearningHours,
      "manage-employees": admin ? AdminEmployeeDashboard : AccessDenied,
      "daily-observations": DailyObservationsPage,
      "archived-employees": admin ? ArchivedEmployeesPage : AccessDenied,
      "add-learning-points":
        isAdmin || isCoAdmin ? CoAdminAddLearningPoints : AccessDenied,
      "user-approval": admin ? UserApprovalPage : AccessDenied,
    };

    const ComponentToRender = viewMap[view] || viewMap.home;

    return <ComponentToRender setActiveView={handleSetActiveView} />;
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        activeView={activeView.view}
        setActiveView={handleSetActiveView}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <div
        className={`flex flex-col flex-1 w-full transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "lg:pl-72" : "lg:pl-0"
        }`}
      >
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 pb-8 pt-24 lg:pt-8 text-lg md:text-base">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView.view}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <Suspense fallback={<PageLoader />}>
                <ErrorBoundary>{renderContent()}</ErrorBoundary>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <FloatingNav setActiveView={handleSetActiveView} />
    </div>
  );
}
