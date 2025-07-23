import React, { useState } from 'react';
import { Sidebar } from '@/components/common/Sidebar';
import { useAdminAuth } from '@/context/AdminAuthContext';
import UserHome from "@/features/home/pages/Index";
import AdminHome from "@/features/admin/pages/AdminHome";
import ProfilePage from "@/features/profile/pages/ProfilePage";
import StandupsPage from "@/features/standups/pages/Standups";
import Attendance from "@/features/attendance/pages/Attendance";
import FeedbackPage from "@/features/feedback/pages/FeedbackPage";
import LearningHours from "@/features/learning-hours/pages/LearningHours";
import OnboardingVideoPage from "@/features/onboarding/pages/OnBoardingPage";
import AdminEmployees from "@/features/admin/pages/AdminEmployees";
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

export default function AppShell() {
    const { admin } = useAdminAuth();
    const [activeView, setActiveView] = useState<ViewState>({ view: 'home' });

    const renderContent = () => {
        const { view, context } = activeView;

        switch (view) {
            case 'home':
                return admin
                    ? <AdminHome setActiveView={setActiveView} />
                    : <UserHome setActiveView={setActiveView} />;
            case 'standups':
                return <StandupsPage setActiveView={setActiveView} />;
            case 'attendance':
                return <Attendance setActiveView={setActiveView} />;
            case 'learning-hours':
                return <LearningHours setActiveView={setActiveView} />;
            case 'feedback':
                return <FeedbackPage setActiveView={setActiveView} />;
            case 'profile':
                return <ProfilePage setActiveView={setActiveView} />;
            case 'onboardingKit':
                return <OnboardingVideoPage setActiveView={setActiveView} />;
            case 'manage-employees':
                return admin ? <AdminEmployees setActiveView={setActiveView} /> : <p>Access Denied</p>;
            case 'employee-detail':
                return admin ? <AdminEmployeeDetail employeeId={context} setActiveView={setActiveView} /> : <p>Access Denied</p>;
            case 'task-analyzer':
                return <TaskAnalyzerPage setActiveView={setActiveView} />;
            default:
                return admin
                    ? <AdminHome setActiveView={setActiveView} />
                    : <UserHome setActiveView={setActiveView} />;
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-background">
            <Sidebar activeView={activeView.view} setActiveView={setActiveView} />

            <div className="flex flex-col flex-1 md:ml-64">
                <main className="flex-1 p-4 md:p-8 flex flex-col">
                    <div className="container mx-auto flex-1 flex flex-col">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
}