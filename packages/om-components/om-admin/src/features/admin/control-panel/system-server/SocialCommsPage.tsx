/**
 * SocialCommsPage.tsx — Social & Communication sub-section of System & Server
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
    ArrowBack as BackIcon,
    Chat as ChatIcon,
    Email as EmailIcon,
    PersonAdd as FriendsIcon,
    Launch as LaunchIcon,
    Notifications as NotifIcon,
    Tune as NotifMgmtIcon,
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
  { title: 'Email', description: 'Internal email and messaging system', href: '/apps/email', icon: <EmailIcon /> },
  { title: 'Chat', description: 'Real-time chat between platform users', href: '/social/chat', icon: <ChatIcon /> },
  { title: 'Friends', description: 'Friend connections and user networking', href: '/social/friends', icon: <FriendsIcon /> },
  { title: 'Notifications', description: 'Notification management and settings', href: '/social/notifications', icon: <NotifIcon /> },
  { title: 'Notification Management', description: 'System-wide notification types, custom notifications, and notification queue', href: '/admin/settings?tab=notifications', icon: <NotifMgmtIcon /> },
];

const SocialCommsPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const color = '#00838f';

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { to: '/admin/control-panel/system-server', title: 'System & Server' },
    { title: 'Social & Communication' },
  ];

  return (
    <PageContainer title="Social & Communication" description="Email, chat, friends, and notifications">
      <Breadcrumb title="Social & Communication" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton onClick={() => navigate('/admin/control-panel/system-server')} sx={{ bgcolor: alpha(color, 0.08), color }}>
            <BackIcon />
          </IconButton>
          <Box sx={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, bgcolor: alpha(color, isDark ? 0.15 : 0.08), color, flexShrink: 0 }}>
            <ChatIcon sx={{ fontSize: 40 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Social & Communication</Typography>
            <Typography variant="body2" color="text.secondary">Email, chat, friends, and notifications</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {TOOLS.map((tool) => (
            <Paper key={tool.href} elevation={0} sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`, borderRadius: 2, cursor: 'pointer', transition: 'all 0.15s ease', display: 'flex', alignItems: 'flex-start', gap: 1.5, '&:hover': { borderColor: color, bgcolor: alpha(color, 0.03), transform: 'translateY(-1px)', boxShadow: `0 2px 12px ${alpha(color, 0.1)}` } }} onClick={() => navigate(tool.href, { state: { breadcrumbTrail: BCrumb.slice(0, -1).concat({ to: '/admin/control-panel/system-server/social-comms', title: 'Social & Communication' }) } })}>
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

export default SocialCommsPage;
