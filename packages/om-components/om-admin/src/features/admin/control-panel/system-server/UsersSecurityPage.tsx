/**
 * UsersSecurityPage.tsx — Users & Security sub-section of System & Server
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
    ArrowBack as BackIcon,
    Launch as LaunchIcon,
    ListAlt as LogsIcon,
    Security as PermIcon,
    Shield as SecurityIcon,
    Lock as SessionIcon,
    People as UsersIcon,
} from '@mui/icons-material';
import {
    alpha,
    Box,
    IconButton,
    Paper,
    Typography,
    useTheme
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ToolItem {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

const TOOLS: ToolItem[] = [
  { title: 'User Management', description: 'Manage user accounts, roles, and permissions across the platform', href: '/admin/users', icon: <UsersIcon /> },
  { title: 'Session Management', description: 'View active sessions, force sign-outs, and monitor login activity', href: '/admin/sessions', icon: <SessionIcon /> },
  { title: 'OM Permission Center', description: 'Fine-grained permission and access control management', href: '/devel-tools/om-permission-center', icon: <PermIcon /> },
  { title: 'Activity Logs', description: 'System-wide activity and audit log viewer with filtering and search', href: '/admin/logs', icon: <LogsIcon /> },
  { title: 'Security Settings', description: 'Password policy, session timeout, and security configuration', href: '/admin/settings?tab=security', icon: <SecurityIcon /> },
];

const UsersSecurityPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const color = '#1565c0';

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { to: '/admin/control-panel/system-server', title: 'System & Server' },
    { title: 'Users & Security' },
  ];

  return (
    <PageContainer title="Users & Security" description="User accounts, sessions, permissions, and activity logs">
      <Breadcrumb title="Users & Security" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton onClick={() => navigate('/admin/control-panel/system-server')} sx={{ bgcolor: alpha(color, 0.08), color }}>
            <BackIcon />
          </IconButton>
          <Box sx={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, bgcolor: alpha(color, isDark ? 0.15 : 0.08), color, flexShrink: 0 }}>
            <PermIcon sx={{ fontSize: 40 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Users & Security</Typography>
            <Typography variant="body2" color="text.secondary">User accounts, sessions, permissions, and activity logs</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
          {TOOLS.map((tool) => (
            <Paper key={tool.href} elevation={0} sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`, borderRadius: 2, cursor: 'pointer', transition: 'all 0.15s ease', display: 'flex', alignItems: 'flex-start', gap: 1.5, '&:hover': { borderColor: color, bgcolor: alpha(color, 0.03), transform: 'translateY(-1px)', boxShadow: `0 2px 12px ${alpha(color, 0.1)}` } }} onClick={() => navigate(tool.href, { state: { breadcrumbTrail: BCrumb.slice(0, -1).concat({ to: '/admin/control-panel/system-server/users-security', title: 'Users & Security' }) } })}>
              <Box sx={{ color, mt: 0.3, flexShrink: 0 }}>{tool.icon}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                  <Typography variant="body1" fontWeight={600} sx={{ fontSize: '0.92rem' }}>{tool.title}</Typography>
                  <LaunchIcon sx={{ fontSize: 14, color: 'text.disabled', ml: 'auto' }} />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>{tool.description}</Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    </PageContainer>
  );
};

export default UsersSecurityPage;
