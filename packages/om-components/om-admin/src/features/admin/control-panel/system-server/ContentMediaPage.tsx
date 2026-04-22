/**
 * ContentMediaPage.tsx — Content & Media sub-section of System & Server
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
    ArrowBack as BackIcon,
    AutoStories as BigBookIcon,
    Article as BlogIcon,
    Settings as ContentSettingsIcon,
    Image as GalleryIcon,
    Launch as LaunchIcon,
    Photo as MediaIcon,
    Notes as NotesIcon,
    Message as WelcomeIcon,
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
  { title: 'Gallery', description: 'Image gallery management, organization, and church image paths', href: '/apps/gallery', icon: <GalleryIcon /> },
  { title: 'Blog Management', description: 'Create and manage blog posts and articles', href: '/admin/blog-admin', icon: <BlogIcon /> },
  { title: 'Notes', description: 'Personal and shared notes workspace', href: '/apps/notes', icon: <NotesIcon /> },
  { title: 'Welcome Message', description: 'Configure the platform welcome message for users', href: '/frontend-pages/welcome-message', icon: <WelcomeIcon /> },
  { title: 'Content Settings', description: 'Content management configuration and preferences', href: '/admin/settings?tab=content', icon: <ContentSettingsIcon /> },
  { title: 'OM Big Book', description: 'Orthodox Metrics reference documentation and knowledge base', href: '/admin/settings?tab=bigbook', icon: <BigBookIcon /> },
];

const ContentMediaPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const color = '#6a1b9a';

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { to: '/admin/control-panel/system-server', title: 'System & Server' },
    { title: 'Content & Media' },
  ];

  return (
    <PageContainer title="Content & Media" description="Gallery, image AI, blog, notes, and welcome message">
      <Breadcrumb title="Content & Media" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton onClick={() => navigate('/admin/control-panel/system-server')} sx={{ bgcolor: alpha(color, 0.08), color }}>
            <BackIcon />
          </IconButton>
          <Box sx={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, bgcolor: alpha(color, isDark ? 0.15 : 0.08), color, flexShrink: 0 }}>
            <MediaIcon sx={{ fontSize: 40 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>Content & Media</Typography>
            <Typography variant="body2" color="text.secondary">Gallery, image AI, blog, notes, and welcome message</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
          {TOOLS.map((tool) => (
            <Paper key={tool.href} elevation={0} sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`, borderRadius: 2, cursor: 'pointer', transition: 'all 0.15s ease', display: 'flex', alignItems: 'flex-start', gap: 1.5, '&:hover': { borderColor: color, bgcolor: alpha(color, 0.03), transform: 'translateY(-1px)', boxShadow: `0 2px 12px ${alpha(color, 0.1)}` } }} onClick={() => navigate(tool.href, { state: { breadcrumbTrail: BCrumb.slice(0, -1).concat({ to: '/admin/control-panel/system-server/content-media', title: 'Content & Media' }) } })}>
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

export default ContentMediaPage;
