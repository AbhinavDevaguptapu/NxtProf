import React, { useState, Dispatch, SetStateAction, ReactNode, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from '@/components/common/Sidebar';
import { useAdminAuth } from '@/context/AdminAuthContext';
import UserHome from '@/features/home/pages/Index';
import AdminHome from '@/features/admin/pages/AdminHome';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import StandupsPage from '@/features/standups/pages/Standups';
import Attendance from '@/features/attendance/pages/Attendance';
import FeedbackPage from '@/features/feedback/pages/FeedbackPage';
import LearningHours from '@/features/learning-hours/pages/LearningHours';
import OnboardingVideoPage from '@/features/onboarding/pages/OnBoardingPage';
import AdminEmployeeDashboard from '@/features/admin/pages/AdminEmployeeDashboard';
import AdminEmployeeDetail from '@/features/admin/pages/AdminEmployeeDetail';
import TaskAnalyzerPage from '@/features/task-analyzer/pages/TaskAnalyzerPage';
import PeerFeedbackPage from '@/features/peer-feedback/pages/PeerFeedbackPage';
import AdminPeerFeedback from '@/features/admin/pages/AdminPeerFeedback';
import AdminLearningHours from '@/features/admin/pages/AdminLearningHours';
import FloatingNav from '@/components/common/FloatingNav';
import DailyObservationsPage from '@/features/daily-observations/pages/DailyObservationsPage';
import ArchivedEmployeesPage from '@/features/admin/pages/ArchivedEmployeesPage';

export type ViewType =
    | 'home'
    | 'standups'
    | 'attendance'
    | 'learning-hours'
    | 'feedback'
    | 'profile'
    | 'onboardingKit'
    | 'manage-employees'
    | 'employee-detail'
    | 'task-analyzer'
    | 'peer-feedback'
    | 'admin-peer-feedback'
    | 'learning-hours-points'
    | 'daily-observations'
    | 'archived-employees';

export interface ViewState {
    view: ViewType;
    context?: unknown;
}

const AccessDenied = () => <p className="text-lg md:text-base">You do not have permission to view this page.</p>;

// Function to get the initial view from the URL hash
const getInitialView = (): ViewState => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        // You might want to add more robust parsing here if you use context in the URL
        return { view: hash as ViewType };
    }
    return { view: 'home' };
};

export default function AppShell() {
    const { admin } = useAdminAuth();
    const [activeView, setActiveView] = useState<ViewState>(getInitialView);

    // This effect handles the browser's back/forward buttons
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (event.state) {
                setActiveView(event.state);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    // This function centralizes navigation logic
    const handleSetActiveView = (newViewState: ViewState) => {
        // Only push a new state if the view is actually changing
        if (newViewState.view !== activeView.view || JSON.stringify(newViewState.context) !== JSON.stringify(activeView.context)) {
            setActiveView(newViewState);
            const newUrl = `#${newViewState.view}`;
            // Use pushState to add to history
            window.history.pushState(newViewState, '', newUrl);
        }
    };
    
    const renderContent = () => {
        const { view, context } = activeView;

        if (view === 'employee-detail') {
            return admin
                ? <AdminEmployeeDetail employeeId={context as string} />
                : <AccessDenied />;
        }

        const viewMap: Record<string, React.ComponentType<{ setActiveView: (view: ViewState) => void }>> = {
            'home': admin ? AdminHome : UserHome,
            'standups': StandupsPage,
            'attendance': Attendance,
            'learning-hours': LearningHours,
            'feedback': FeedbackPage,
            'profile': ProfilePage,
            'onboardingKit': OnboardingVideoPage,
            'task-analyzer': TaskAnalyzerPage,
            'peer-feedback': PeerFeedbackPage,
            'admin-peer-feedback': admin ? AdminPeerFeedback : AccessDenied,
            'learning-hours-points': AdminLearningHours,
            'manage-employees': admin ? AdminEmployeeDashboard : AccessDenied,
            'daily-observations': DailyObservationsPage,
            'archived-employees': admin ? ArchivedEmployeesPage : AccessDenied,
        };

        const ComponentToRender = viewMap[view] || viewMap.home;

        return <ComponentToRender setActiveView={handleSetActiveView} />;
    };

    return (
        <div className="flex min-h-screen w-full">
            <Sidebar activeView={activeView.view} setActiveView={handleSetActiveView} />
            <div className="flex flex-col flex-1 w-full lg:pl-72">
                <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 pb-8 pt-24 lg:pt-8 text-lg md:text-base">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeView.view}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
            <FloatingNav setActiveView={handleSetActiveView} />
        </div>
    );
}