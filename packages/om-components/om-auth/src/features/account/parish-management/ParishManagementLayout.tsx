/**
 * ParishManagementLayout — Sidebar + content area for /account/parish-management/* pages.
 *
 * Grouped navigation: Overview, Data Configuration, Appearance, Advanced.
 * Renders inside AccountLayout → ChurchPortalLayout.
 */

import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useLanguage } from '@/context/LanguageContext';

interface NavItem {
  labelKey: string;
  path: string;
  icon: React.ReactNode;
}

interface NavGroup {
  sectionKey: string;
  items: NavItem[];
}

const BASE = '/account/parish-management';

const NAV_GROUPS: NavGroup[] = [
  {
    sectionKey: 'parish.overview',
    items: [
      { labelKey: 'parish.parish_dashboard', path: `${BASE}`, icon: <DashboardOutlinedIcon fontSize="small" /> },
    ],
  },
  {
    sectionKey: 'parish.data_configuration',
    items: [
      { labelKey: 'parish.database_mapping', path: `${BASE}/database-mapping`, icon: <StorageOutlinedIcon fontSize="small" /> },
      { labelKey: 'parish.record_settings', path: `${BASE}/record-settings`, icon: <DescriptionOutlinedIcon fontSize="small" /> },
    ],
  },
  {
    sectionKey: 'parish.appearance',
    items: [
      { labelKey: 'parish.landing_page_branding', path: `${BASE}/landing-page-branding`, icon: <BrushOutlinedIcon fontSize="small" /> },
      { labelKey: 'parish.theme_studio', path: `${BASE}/theme-studio`, icon: <PaletteOutlinedIcon fontSize="small" /> },
      { labelKey: 'parish.ui_theme', path: `${BASE}/ui-theme`, icon: <TuneOutlinedIcon fontSize="small" /> },
    ],
  },
  {
    sectionKey: 'parish.advanced',
    items: [
      { labelKey: 'parish.search_configuration', path: `${BASE}/search-configuration`, icon: <SearchOutlinedIcon fontSize="small" /> },
      { labelKey: 'parish.system_behavior', path: `${BASE}/system-behavior`, icon: <SettingsOutlinedIcon fontSize="small" /> },
    ],
  },
];

const ParishManagementLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { t } = useLanguage();

  const isActive = (path: string) => {
    if (path === BASE) return location.pathname === BASE || location.pathname === `${BASE}/`;
    return location.pathname.startsWith(path);
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '240px 1fr' },
        gap: 3,
        minHeight: '70vh',
      }}
    >
      {/* Sidebar */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          alignSelf: 'start',
          position: 'sticky',
          top: 80,
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(45,27,78,0.06)',
          bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
          borderRadius: 2,
        }}
      >
        {NAV_GROUPS.map((group) => (
          <Box key={group.sectionKey} sx={{ mb: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{
                px: 1.5,
                pb: 0.75,
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.625rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: isDark ? '#6b7280' : '#9ca3af',
              }}
            >
              {t(group.sectionKey)}
            </Typography>
            <List disablePadding>
              {group.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <ListItemButton
                    key={item.path}
                    selected={active}
                    onClick={() => navigate(item.path)}
                    sx={{
                      borderRadius: '0 6px 6px 0',
                      mb: 0.25,
                      py: 0.6,
                      px: 1.5,
                      transition: 'color 0.15s ease, background-color 0.15s ease',
                      color: isDark ? '#9ca3af' : '#6b7280',
                      '&:hover': {
                        bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(45,27,78,0.04)',
                        color: isDark ? '#f3f4f6' : '#2d1b4e',
                      },
                      '&.Mui-selected': {
                        bgcolor: isDark ? 'rgba(212,175,55,0.08)' : 'rgba(45,27,78,0.05)',
                        color: isDark ? '#d4af37' : '#2d1b4e',
                        borderLeft: '2.5px solid',
                        borderLeftColor: isDark ? '#d4af37' : '#2d1b4e',
                        '& .MuiListItemIcon-root': {
                          color: isDark ? '#d4af37' : '#2d1b4e',
                          opacity: 1,
                        },
                        '&:hover': {
                          bgcolor: isDark ? 'rgba(212,175,55,0.12)' : 'rgba(45,27,78,0.08)',
                        },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 32,
                        color: 'inherit',
                        opacity: active ? 1 : 0.6,
                        transition: 'opacity 0.15s ease',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={t(item.labelKey)}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: active ? 500 : 400,
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.8125rem',
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Paper>

      {/* Content */}
      <Box sx={{ minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default ParishManagementLayout;
