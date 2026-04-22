import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.tsx';
import { UserRole } from '../../types/orthodox-metrics.types.ts';
import { Box, CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  requiredPermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
}) => {
  const { authenticated, loading, hasRole, hasPermission, user } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!authenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  // Helper function to get redirect path for non-superadmin users
  const getNonSuperAdminRedirect = (): string | null => {
    if (user && user.role !== 'super_admin' && user.church_id) {
      return '/portal';
    }
    return null;
  };

  // Check role requirements
  if (requiredRole && !hasRole(requiredRole)) {
    // For non-superadmin users, redirect to their baptism records page instead of unauthorized
    const redirectPath = getNonSuperAdminRedirect();
    if (redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }
    return <Navigate to="/auth/unauthorized" replace />;
  }

  // Check permission requirements
  if (requiredPermission && !hasPermission(requiredPermission)) {
    // For non-superadmin users, redirect to their baptism records page instead of unauthorized
    const redirectPath = getNonSuperAdminRedirect();
    if (redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }
    return <Navigate to="/auth/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
