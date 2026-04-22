/**
 * Orthodox Metrics - Admin Dashboard Layout
 * Wrapper component for admin-specific layouts and features
 */

import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { ThemedLayout } from '@/components/Theme/ThemedLayout';
import { Navigate } from 'react-router-dom';

interface AdminDashboardLayoutProps {
  children?: React.ReactNode;
  requireSuperAdmin?: boolean;
}

/**
 * AdminDashboardLayout Component
 * Provides layout and access control for admin dashboard pages
 */
export const AdminDashboardLayout: React.FC<AdminDashboardLayoutProps> = ({
  children,
  requireSuperAdmin = false
}) => {
  const theme = useTheme();
  const { user, hasRole, authenticated } = useAuth();

  // Redirect if not authenticated
  if (!authenticated) {
    return <Navigate to="/frontend-pages/homepage" replace />;
  }

  // Check super admin access if required
  if (requireSuperAdmin && !hasRole('super_admin')) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check basic admin access
  if (!hasRole('admin') && !hasRole('super_admin')) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <ThemedLayout>
      <Box
        sx={{
          minHeight: '100vh',
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.98) 0%, rgba(31, 41, 55, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(248, 250, 252, 0.98) 0%, rgba(241, 245, 249, 0.95) 100%)',
          backgroundAttachment: 'fixed',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: theme.palette.mode === 'dark'
              ? `
                radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.12) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.12) 0%, transparent 50%),
                radial-gradient(circle at 60% 40%, rgba(34, 197, 94, 0.08) 0%, transparent 50%)
              `
              : `
                radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(239, 68, 68, 0.06) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, rgba(34, 197, 94, 0.06) 0%, transparent 50%),
                radial-gradient(circle at 60% 40%, rgba(168, 85, 247, 0.04) 0%, transparent 50%)
              `,
            pointerEvents: 'none',
            zIndex: -1,
          },
          '&::after': {
            content: '""',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: theme.palette.mode === 'dark'
              ? `
                linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.02) 50%, transparent 100%),
                linear-gradient(0deg, transparent 0%, rgba(255,255,255,0.02) 50%, transparent 100%)
              `
              : `
                linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.02) 50%, transparent 100%),
                linear-gradient(0deg, transparent 0%, rgba(0,0,0,0.02) 50%, transparent 100%)
              `,
            pointerEvents: 'none',
            zIndex: -1,
          }
        }}
      >
        {children || (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ mb: 2 }}>
              Admin Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Select an option from the menu to get started.
            </Typography>
          </Box>
        )}
      </Box>
    </ThemedLayout>
  );
};

export default AdminDashboardLayout;
