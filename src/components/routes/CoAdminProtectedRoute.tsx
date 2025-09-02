import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserAuth } from '@/context/UserAuthContext';
import Loading from '@/components/common/Loading';

interface CoAdminProtectedRouteProps {
    children: React.ReactNode;
}

const CoAdminProtectedRoute: React.FC<CoAdminProtectedRouteProps> = ({ children }) => {
    const { user, loading, isAdmin, isCoAdmin } = useUserAuth();

    if (loading) {
        return <Loading />;
    }

    if (!user || (!isAdmin && !isCoAdmin)) {
        return <Navigate to="/auth" />;
    }

    return <>{children}</>;
};

export default CoAdminProtectedRoute;