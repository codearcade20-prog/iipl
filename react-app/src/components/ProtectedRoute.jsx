import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, module }) => {
    const { user, loading, hasPermission } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (module) {
        const modules = Array.isArray(module) ? module : [module];
        const canAccess = modules.some(m => hasPermission(m));
        if (!canAccess) {
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
