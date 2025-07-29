import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider, useAdminAuth } from "@/context/AdminAuthContext";
import { UserAuthProvider, useUserAuth } from "@/context/UserAuthContext";
import ProtectedRoute from "@/components/routes/ProtectedRoute";
import AuthPage from "@/features/auth/pages/AuthPage";
import AdminLogin from "@/features/auth/pages/AdminLogin";
import EmployeeSetup from "@/features/auth/pages/EmployeeSetup";
import LandingPage from "@/features/home/pages/LandingPage";
import AppShell from "@/layout/AppShell";
import NotFound from "@/features/not-found/pages/NotFound";

const queryClient = new QueryClient();

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
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/" />} />
      <Route path="/admin/login" element={!user ? <AdminLogin /> : <Navigate to="/" />} />
      <Route path="/setup" element={<ProtectedRoute><EmployeeSetup /></ProtectedRoute>} />
      <Route
        path="/*"
        element={
          user ? (
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          ) : (
            <Navigate to="/landing" replace />
          )
        }
      />
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
