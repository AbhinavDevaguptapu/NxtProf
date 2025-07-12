// src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AdminAuthProvider, useAdminAuth } from "@/context/AdminAuthContext";
import { UserAuthProvider, useUserAuth } from "@/context/UserAuthContext";
import ProtectedRoute from "@/components/routes/ProtectedRoute";
import AdminProtectedRoute from "@/components/routes/AdminProtectedRoute";

// --- Feature-based Page Imports ---
import AdminHome from "@/features/admin/pages/AdminHome";
import AdminEmployees from "@/features/admin/pages/AdminEmployees";
import AdminEmployeeDetail from "@/features/admin/pages/AdminEmployeeDetail";
import AuthPage from "@/features/auth/pages/AuthPage";
import AdminLogin from "@/features/auth/pages/AdminLogin";
import EmployeeSetup from "@/features/auth/pages/EmployeeSetup";
import Attendance from "@/features/attendance/pages/Attendance";
import FeedbackPage from "@/features/feedback/pages/FeedbackPage";
import Index from "@/features/home/pages/Index";
import LandingPage from "@/features/home/pages/LandingPage";
import LearningHours from "@/features/learning-hours/pages/LearningHours";
import OnboardingVideoPage from "@/features/onboarding/pages/OnBoardingPage";
import ProfilePage from "@/features/profile/pages/ProfilePage";
import Standups from "@/features/standups/pages/Standups";
import NotFound from "@/features/not-found/pages/NotFound";

const queryClient = new QueryClient();

// Global loading spinner (no changes here)
const GlobalLoading = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background">
    <div className="relative">
      <div className="absolute inset-0 blur-xl opacity-20 rounded-full animate-pulse-slow h-24 w-24"></div>
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 rounded-full border-[3px] border-muted animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-[3px] border-primary border-t-transparent animate-spin-slow"></div>
      </div>
    </div>
    <div className="mt-6 space-y-2">
      <p className="text-lg text-muted-foreground font-medium animate-text-fade">
        Verifying session
      </p>
      <div className="flex justify-center">
        <div className="h-1 w-12 bg-gradient-to-r from-transparent via-primary to-transparent animate-line-expand"></div>
      </div>
    </div>
  </div>
);


const AppContent = () => {
  const { user, initialized: userInitialized } = useUserAuth();
  const { admin, initialized: adminInitialized } = useAdminAuth();

  if (!userInitialized || !adminInitialized) {
    return <GlobalLoading />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Root Path Logic */}
      <Route
        path="/"
        element={
          !user ? (
            <LandingPage />
          ) : admin ? (
            <Navigate to="/admin" replace />
          ) : (
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          )
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <AdminProtectedRoute>
            <ProfilePage />
          </AdminProtectedRoute>
        }
      />

      {/* Employee-only Routes */}
      <Route path="/setup" element={<ProtectedRoute><EmployeeSetup /></ProtectedRoute>} />
      <Route path="/standups" element={<ProtectedRoute><Standups /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
      <Route path="/learning-hours" element={<ProtectedRoute><LearningHours /></ProtectedRoute>} />

      {/* --- 2. ADD THE NEW FEEDBACK ROUTE HERE --- */}
      <Route
        path="/feedback"
        element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>}
      />

      {/* Onboarding Kit might be public or protected, adjust as needed */}
      <Route path="/onboardingKit" element={<OnboardingVideoPage />} />

      {/* Admin-only Routes */}
      <Route path="/admin" element={<AdminProtectedRoute><AdminHome /></AdminProtectedRoute>} />
      <Route path="/admin/employees" element={<AdminProtectedRoute><AdminEmployees /></AdminProtectedRoute>} />
      <Route path="/admin/employees/:employeeId" element={<AdminProtectedRoute><AdminEmployeeDetail /></AdminProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <UserAuthProvider>
          <AdminAuthProvider>
            <AppContent />
          </AdminAuthProvider>
        </UserAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;