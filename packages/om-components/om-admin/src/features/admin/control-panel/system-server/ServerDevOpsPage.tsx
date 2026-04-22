/**
 * ServerDevOpsPage.tsx — Server & DevOps sub-section of System & Server
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
    ArrowBack as BackIcon,
    Backup as BackupIcon,
    Build as BuildIcon,
    Launch as LaunchIcon,
    Straighten as RefactorIcon,
    Flag as SDLCIcon,
    Dns as ServicesIcon,
    BugReport as SurveyIcon,
    Storage as DbStatusIcon,
    Info as SysInfoIcon,
    Timeline as TraceIcon,
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
  { title: 'System Information', description: 'Node.js version, uptime, memory, CPU, and application settings', href: '/admin/settings?tab=general', icon: <SysInfoIcon /> },
  { title: 'Backup & Restore', description: 'Backup configuration, storage info, job history, and restore points', href: '/admin/settings?tab=backup', icon: <BackupIcon /> },
  { title: 'Services Monitor', description: 'System health, running services status, and process management', href: '/admin/settings?tab=services', icon: <ServicesIcon /> },
  // API Explorer — migrated to OMAI (OMD-1283)
  { title: 'Build Info', description: 'Current build version, commit hash, and deployment details', href: '/devel-tools/build-info', icon: <BuildIcon /> },
  { title: 'OMTrace Console', description: 'Real-time system tracing and debug output', href: '/devel-tools/omtrace', icon: <TraceIcon /> },
  { title: 'Refactor Console', description: 'Code refactoring tools and analysis', href: '/devel-tools/refactor-console', icon: <RefactorIcon /> },
  { title: 'Site Survey', description: 'Automated testing and quality assurance checks', href: '/admin/tools/survey', icon: <SurveyIcon /> },
  { title: 'Feature Lifecycle (SDLC)', description: 'Five-stage feature pipeline, registry status, and promotion workflow', href: '/admin/control-panel/sdlc', icon: <SDLCIcon /> },
  { title: 'Code Safety System', description: 'Snapshot management, backup verification, and change tracking for uncommitted work', href: '/admin/control-panel/system-server/code-safety', icon: <BackupIcon /> },
  { title: 'Platform Status', description: 'Live health metrics for database, services, and app VM', href: '/devel-tools/platform-status', icon: <DbStatusIcon /> },
];

const ServerDevOpsPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const color = '#c62828';

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { to: '/admin/control-panel/system-server', title: 'System & Server' },
    { title: 'Server & DevOps' },
  ];

  return (
    <PageContainer title="Server & DevOps" description="Build info, tracing, refactoring, and QA tools">
      <Breadcrumb title="Server & DevOps" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton onClick={() => navigate('/admin/control-panel/system-server')} sx={{ bgcolor: alpha(color, 0.08), color }}>
            <BackIcon />
          </IconButton>
          <Box sx={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, bgcolor: alpha(color, isDark ? 0.15 : 0.08), color, flexShrink: 0 }}>
            <BuildIcon sx={{ fontSize: 40 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Server & DevOps</Typography>
            <Typography variant="body2" color="text.secondary">Build info, tracing, refactoring, and QA tools</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
          {TOOLS.map((tool) => (
            <Paper key={tool.href} elevation={0} sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`, borderRadius: 2, cursor: 'pointer', transition: 'all 0.15s ease', display: 'flex', alignItems: 'flex-start', gap: 1.5, '&:hover': { borderColor: color, bgcolor: alpha(color, 0.03), transform: 'translateY(-1px)', boxShadow: `0 2px 12px ${alpha(color, 0.1)}` } }} onClick={() => navigate(tool.href, { state: { breadcrumbTrail: BCrumb.slice(0, -1).concat({ to: '/admin/control-panel/system-server/server-devops', title: 'Server & DevOps' }) } })}>
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

export default ServerDevOpsPage;
