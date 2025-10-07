import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserAuth } from '@/context/UserAuthContext';
import Loading from '@/components/common/Loading';

interface CoAdminOnlyProtectedRouteProps {
    children: React.ReactNode;
}

const CoAdminOnlyProtectedRoute: React.FC<CoAdminOnlyProtectedRouteProps> = ({ children }) => {
    const { user, loading, isCoAdmin } = useUserAuth();

    if (loading) {
        return <Loading />;
    }

    if (!user || !isCoAdmin) {
        return <Navigate to="/auth" />;
    }

    return <>{children}</>;
};

export default CoAdminOnlyProtectedRoute;