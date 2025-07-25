import React, { useState, Dispatch, SetStateAction, ReactNode } from 'react';
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
import AdminEmployees from '@/features/admin/pages/AdminEmployees';
import AdminEmployeeDetail from '@/features/admin/pages/AdminEmployeeDetail';
import TaskAnalyzerPage from '@/features/task-analyzer/pages/TaskAnalyzerPage';

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
    | 'task-analyzer';

export interface ViewState {
    view: ViewType;
    context?: any;
}

const AccessDenied = () => <p className="text-lg md:text-base">You do not have permission to view this page.</p>;

export default function AppShell() {
    const { admin } = useAdminAuth();
    const [activeView, setActiveView] = useState<ViewState>({ view: 'home' });

    const renderContent = () => {
        const { view, context } = activeView;

        if (view === 'employee-detail') {
            return admin
                ? <AdminEmployeeDetail employeeId={context} setActiveView={setActiveView} />
                : <AccessDenied />;
        }

        const viewMap: Record<string, React.ComponentType<any>> = {
            'home': admin ? AdminHome : UserHome,
            'standups': StandupsPage,
            'attendance': Attendance,
            'learning-hours': LearningHours,
            'feedback': FeedbackPage,
            'profile': ProfilePage,
            'onboardingKit': OnboardingVideoPage,
            'task-analyzer': TaskAnalyzerPage,
            'manage-employees': admin ? AdminEmployees : AccessDenied,
        };

        const ComponentToRender = viewMap[view] || viewMap.home;

        return <ComponentToRender setActiveView={setActiveView} />;
    };

    return (
        <div className="flex min-h-screen w-full">
            <Sidebar activeView={activeView.view} setActiveView={setActiveView} />
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
        </div>
    );
}