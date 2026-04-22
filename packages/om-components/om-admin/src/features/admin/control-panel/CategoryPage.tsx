/**
 * CategoryPage.tsx
 * Reusable category landing page for Admin Control Panel.
 * Shows a header, description, and a list of tool cards with links.
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
    ArrowBack as BackIcon,
    Launch as LaunchIcon,
} from '@mui/icons-material';
import {
    alpha,
    Box,
    Chip,
    IconButton,
    Paper,
    Typography,
    useTheme,
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

export interface ToolItem {
  title: string;
  description: string;
  href: string;
  icon?: React.ReactNode;
  chip?: string;
  chipColor?: 'primary' | 'success' | 'warning' | 'error' | 'default';
}

export interface CategorySection {
  sectionTitle: string;
  tools: ToolItem[];
}

interface CategoryPageProps {
  title: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  sections: CategorySection[];
  parentTrail?: { to: string; title: string }[];
}

const CategoryPage: React.FC<CategoryPageProps> = ({ title, description, color, icon, sections, parentTrail }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  const baseCrumbs = parentTrail || [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
  ];

  const BCrumb = [
    ...baseCrumbs,
    { title },
  ];

  // Trail to pass to destination pages when clicking tool cards
  const outgoingTrail = [
    ...baseCrumbs,
    { to: window.location.pathname, title },
  ];

  return (
    <PageContainer title={title} description={description}>
      <Breadcrumb title={title} items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton onClick={() => navigate('/admin/control-panel')} sx={{ bgcolor: alpha(color, 0.08), color }}>
            <BackIcon />
          </IconButton>
          <Box sx={{
            width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 2, bgcolor: alpha(color, isDark ? 0.15 : 0.08), color, flexShrink: 0,
          }}>
            {icon}
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>{title}</Typography>
            <Typography variant="body2" color="text.secondary">{description}</Typography>
          </Box>
        </Box>

        {/* Sections */}
        {sections.map((section) => (
          <Box key={section.sectionTitle} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.78rem', letterSpacing: 1 }}>
              {section.sectionTitle}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
              {section.tools.map((tool) => (
                <Paper
                  key={tool.href}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    '&:hover': {
                      borderColor: color,
                      bgcolor: alpha(color, 0.03),
                      transform: 'translateY(-1px)',
                      boxShadow: `0 2px 12px ${alpha(color, 0.1)}`,
                    },
                  }}
                  onClick={() => navigate(tool.href, { state: { breadcrumbTrail: outgoingTrail } })}
                >
                  {tool.icon && (
                    <Box sx={{ color, mt: 0.3, flexShrink: 0 }}>
                      {tool.icon}
                    </Box>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                      <Typography variant="body1" fontWeight={600} sx={{ fontSize: '0.92rem' }}>
                        {tool.title}
                      </Typography>
                      {tool.chip && (
                        <Chip size="small" label={tool.chip} color={tool.chipColor || 'default'} sx={{ fontSize: '0.62rem', height: 18 }} />
                      )}
                      <LaunchIcon sx={{ fontSize: 14, color: 'text.disabled', ml: 'auto' }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                      {tool.description}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </PageContainer>
  );
};

export default CategoryPage;
