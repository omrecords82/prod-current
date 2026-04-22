/**
 * SystemServerPage.tsx — Sub-hub for System & Server
 * Displays 5 sub-category tiles (like a mini control panel).
 * Each tile links to its own detail page with individual tool listings.
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
    ArrowBack as BackIcon,
    Settings as ConfigIcon,
    Build as DevOpsIcon,
    Photo as MediaIcon,
    Security as SecurityIcon,
    Dns as ServerIcon,
    Chat as SocialIcon,
} from '@mui/icons-material';
import {
    alpha,
    Box,
    IconButton,
    Link as MuiLink,
    Paper,
    Typography,
    useTheme,
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SubCategory {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  quickLinks: { label: string; href: string }[];
}

const SUB_CATEGORIES: SubCategory[] = [
  {
    key: 'users',
    title: 'Users & Security',
    description: 'User accounts, sessions, permissions, and activity logs',
    icon: <SecurityIcon sx={{ fontSize: 40 }} />,
    color: '#1565c0',
    href: '/admin/control-panel/system-server/users-security',
    quickLinks: [
      { label: 'User Management', href: '/admin/users' },
      { label: 'Session Management', href: '/admin/sessions' },
      { label: 'Activity Logs', href: '/admin/logs' },
    ],
  },
  {
    key: 'content',
    title: 'Content & Media',
    description: 'Gallery, image AI, blog, notes, and welcome message',
    icon: <MediaIcon sx={{ fontSize: 40 }} />,
    color: '#6a1b9a',
    href: '/admin/control-panel/system-server/content-media',
    quickLinks: [
      { label: 'Gallery', href: '/apps/gallery' },
      { label: 'Blog Management', href: '/admin/blog-admin' },
    ],
  },
  {
    key: 'social',
    title: 'Social & Communication',
    description: 'Email, chat, friends, and notifications',
    icon: <SocialIcon sx={{ fontSize: 40 }} />,
    color: '#00838f',
    href: '/admin/control-panel/system-server/social-comms',
    quickLinks: [
      { label: 'Email', href: '/apps/email' },
      { label: 'Chat', href: '/social/chat' },
    ],
  },
  {
    key: 'devops',
    title: 'Server & DevOps',
    description: 'Build info, tracing, refactoring, and QA tools',
    icon: <DevOpsIcon sx={{ fontSize: 40 }} />,
    color: '#c62828',
    href: '/admin/control-panel/system-server/server-devops',
    quickLinks: [
      // API Explorer — migrated to OMAI (OMD-1283)
      { label: 'Code Safety System', href: '/admin/control-panel/system-server/code-safety' },
      { label: 'Feature Lifecycle (SDLC)', href: '/admin/control-panel/sdlc' },
    ],
  },
  {
    key: 'config',
    title: 'Platform Configuration',
    description: 'Route/menu studio, menu editor, permissions, and scheduled tasks',
    icon: <ConfigIcon sx={{ fontSize: 40 }} />,
    color: '#e65100',
    href: '/admin/control-panel/system-server/platform-config',
    quickLinks: [
      { label: 'Router / Menu Studio', href: '/devel/router-menu-studio' },
      { label: 'Menu Editor', href: '/devel-tools/menu-editor' },
    ],
  },
];

const SystemServerPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { title: 'System & Server' },
  ];

  return (
    <PageContainer title="System & Server" description="System administration and server management">
      <Breadcrumb title="System & Server" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton onClick={() => navigate('/admin/control-panel')} sx={{ bgcolor: alpha('#d32f2f', 0.08), color: '#d32f2f' }}>
            <BackIcon />
          </IconButton>
          <Box sx={{
            width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 2, bgcolor: alpha('#d32f2f', isDark ? 0.15 : 0.08), color: '#d32f2f', flexShrink: 0,
          }}>
            <ServerIcon sx={{ fontSize: 40 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>System & Server</Typography>
            <Typography variant="body2" color="text.secondary">
              Users, security, content, server diagnostics, monitoring, and social features
            </Typography>
          </Box>
        </Box>

        {/* Sub-category tiles */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
        }}>
          {SUB_CATEGORIES.map((cat) => (
            <Paper
              key={cat.key}
              elevation={0}
              sx={{
                p: 3,
                border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: cat.color,
                  bgcolor: alpha(cat.color, 0.03),
                  boxShadow: `0 4px 20px ${alpha(cat.color, 0.12)}`,
                  transform: 'translateY(-2px)',
                },
              }}
              onClick={() => navigate(cat.href, {
                state: {
                  breadcrumbTrail: [
                    { to: '/', title: 'Home' },
                    { to: '/admin/control-panel', title: 'Control Panel' },
                    { to: '/admin/control-panel/system-server', title: 'System & Server' },
                  ],
                },
              })}
            >
              <Box sx={{ display: 'flex', gap: 2.5 }}>
                <Box sx={{
                  width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 2, bgcolor: alpha(cat.color, isDark ? 0.15 : 0.08), color: cat.color, flexShrink: 0,
                }}>
                  {cat.icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" fontWeight={700} sx={{ color: cat.color, mb: 0.5, fontSize: '1.02rem' }}>
                    {cat.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.4 }}>
                    {cat.description}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                    {cat.quickLinks.map((link) => (
                      <MuiLink
                        key={link.href}
                        component="span"
                        variant="body2"
                        sx={{
                          cursor: 'pointer', textDecoration: 'none',
                          color: theme.palette.primary.main, fontSize: '0.82rem',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          navigate(link.href, {
                            state: {
                              breadcrumbTrail: [
                                { to: '/', title: 'Home' },
                                { to: '/admin/control-panel', title: 'Control Panel' },
                                { to: '/admin/control-panel/system-server', title: 'System & Server' },
                                { to: cat.href, title: cat.title },
                              ],
                            },
                          });
                        }}
                      >
                        {link.label}
                      </MuiLink>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    </PageContainer>
  );
};

export default SystemServerPage;
