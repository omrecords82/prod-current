/**
 * Admin Page Fallback Component
 * Simple fallback admin page when the main admin dashboard has issues
 */

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  Stack,
  Paper,
  Divider,
  useTheme
} from '@mui/material';
import {
  Settings as SettingsIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
  Dashboard as DashboardIcon,
  RefreshOutlined as RefreshIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import OrthodoxBanner from '@/shared/ui/OrthodoxBanner';

const AdminPageFallback: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();

  const adminModules = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: <PeopleIcon />,
      path: '/admin/users',
      color: '#1976d2'
    },
    {
      title: 'Admin Settings',
      description: 'Configure system settings and preferences',
      icon: <SettingsIcon />,
      path: '/admin/settings',
      color: '#388e3c'
    },
    {
      title: 'Security & Logs',
      description: 'View system logs and security events',
      icon: <SecurityIcon />,
      path: '/admin/logs',
      color: '#f57c00'
    },
    {
      title: 'Analytics',
      description: 'View system analytics and reports',
      icon: <AnalyticsIcon />,
      path: '/admin/analytics',
      color: '#7b1fa2'
    }
  ];

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/dashboards/modern');
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: theme.palette.mode === 'dark' 
        ? theme.palette.background.default 
        : theme.palette.grey[100]
    }}>
      {/* Orthodox Banner */}
      <OrthodoxBanner 
        title="Orthodox Metrics"
        subtitle="Administrative Control Panel"
        compact={true}
        autoRotate={true}
        initialLanguage="en"
      />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Paper 
          elevation={theme.palette.mode === 'dark' ? 0 : 1} 
          sx={{ 
            p: 3, 
            mb: 4,
            backgroundColor: theme.palette.mode === 'dark' 
              ? theme.palette.background.paper 
              : undefined
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Admin Panel
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Welcome back, {user?.first_name || 'Admin'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<HomeIcon />}
                onClick={handleGoHome}
              >
                Dashboard
              </Button>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
              >
                Refresh
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Error Notice */}
        <Alert severity="warning" sx={{ mb: 4 }}>
          <Typography variant="body1" gutterBottom>
            <strong>Notice:</strong> The main admin dashboard is experiencing issues.
          </Typography>
          <Typography variant="body2">
            This is a simplified admin interface. You can still access all admin functions using the navigation links below.
          </Typography>
        </Alert>

        {/* Admin Modules Grid */}
        <Box 
          sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 3 
          }}
        >
          {adminModules.map((module) => (
            <Card 
              key={module.title}
              sx={{ 
                height: '100%', 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3
                }
              }}
              onClick={() => navigate(module.path)}
            >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        backgroundColor: module.color,
                        color: 'white',
                        mr: 2
                      }}
                    >
                      {module.icon}
                    </Box>
                    <Typography variant="h6" component="h2">
                      {module.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {module.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

        {/* Quick Actions */}
        <Paper 
          elevation={theme.palette.mode === 'dark' ? 0 : 1} 
          sx={{ 
            p: 3, 
            mt: 4,
            backgroundColor: theme.palette.mode === 'dark' 
              ? theme.palette.background.paper 
              : undefined
          }}
        >
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="outlined"
              onClick={() => navigate('/admin/users')}
              startIcon={<PeopleIcon />}
            >
              Manage Users
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/admin/settings')}
              startIcon={<SettingsIcon />}
            >
              System Settings
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/admin/logs')}
              startIcon={<SecurityIcon />}
            >
              View Logs
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/admin/dashboard')}
              startIcon={<DashboardIcon />}
            >
              Full Dashboard
            </Button>
          </Stack>
        </Paper>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Orthodox Metrics Admin Panel - {new Date().getFullYear()}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default AdminPageFallback;
