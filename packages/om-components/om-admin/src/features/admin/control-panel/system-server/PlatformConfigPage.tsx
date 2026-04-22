/**
 * PlatformConfigPage.tsx — Platform Configuration sub-section of System & Server
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
    ArrowBack as BackIcon,
    Extension as ComponentsIcon,
    Settings as ConfigIcon,
    Launch as LaunchIcon,
    Edit as MenuEditIcon,
    ViewModule as MenuMgmtIcon,
    Security as SSLIcon,
    Tune as SettingsConsoleIcon,
    Schedule as TasksIcon,
} from '@mui/icons-material';
import {
    alpha,
    Box,
    IconButton,
    Paper,
    Typography,
    useTheme,
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const TOOLS = [
  { title: 'Router / Menu Studio', description: 'Visual editor for application routes and menus', href: '/devel/router-menu-studio', icon: <ConfigIcon /> },
  { title: 'Menu Editor', description: 'Edit sidebar menu structure and items', href: '/devel-tools/menu-editor', icon: <MenuEditIcon /> },
  { title: 'Menu Management', description: 'Admin menu visibility and role-based access control', href: '/admin/menu-management', icon: <MenuMgmtIcon /> },
  // Daily Tasks — retired, now on OMAI Operations Hub
  { title: 'Settings Console', description: 'VMware-style key-value settings management with override scopes and audit history', href: '/admin/settings?tab=settings-console', icon: <SettingsConsoleIcon /> },
  { title: 'Component Manager', description: 'Manage platform UI components and feature toggles', href: '/admin/settings?tab=components', icon: <ComponentsIcon /> },
  { title: 'Site Map', description: 'Full navigational map of all routes, admin and user views', href: '/site-map', icon: <MenuMgmtIcon /> },
  { title: 'SSL Certificates', description: 'View, update, and install SSL/TLS certificates for the site', href: '/admin/control-panel/system-server/platform-config/ssl-certificates', icon: <SSLIcon /> },
];

const PlatformConfigPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const color = '#e65100';

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { to: '/admin/control-panel/system-server', title: 'System & Server' },
    { title: 'Platform Configuration' },
  ];

  return (
    <PageContainer title="Platform Configuration" description="Route/menu studio, menu editor, permissions, and scheduled tasks">
      <Breadcrumb title="Platform Configuration" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton onClick={() => navigate('/admin/control-panel/system-server')} sx={{ bgcolor: alpha(color, 0.08), color }}>
            <BackIcon />
          </IconButton>
          <Box sx={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, bgcolor: alpha(color, isDark ? 0.15 : 0.08), color, flexShrink: 0 }}>
            <ConfigIcon sx={{ fontSize: 40 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Platform Configuration</Typography>
            <Typography variant="body2" color="text.secondary">Route/menu studio, menu editor, permissions, and scheduled tasks</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {TOOLS.map((tool) => (
            <Paper key={tool.href} elevation={0} sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`, borderRadius: 2, cursor: 'pointer', transition: 'all 0.15s ease', display: 'flex', alignItems: 'flex-start', gap: 1.5, '&:hover': { borderColor: color, bgcolor: alpha(color, 0.03), transform: 'translateY(-1px)', boxShadow: `0 2px 12px ${alpha(color, 0.1)}` } }} onClick={() => navigate(tool.href, { state: { breadcrumbTrail: BCrumb.slice(0, -1).concat({ to: '/admin/control-panel/system-server/platform-config', title: 'Platform Configuration' }) } })}>
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

export default PlatformConfigPage;
