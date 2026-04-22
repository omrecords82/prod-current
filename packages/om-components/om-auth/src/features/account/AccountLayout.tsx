/**
 * AccountLayout — Left nav sidebar + content area for /account/* pages.
 * Renders inside FullLayout (admin shell).
 *
 * Nav items are capability-filtered: self-service pages always show,
 * church-scoped pages only show when the user has a church context.
 */

import React, { useMemo } from 'react';
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
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import ChurchIcon from '@mui/icons-material/Church';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PaletteIcon from '@mui/icons-material/Palette';
import DevicesIcon from '@mui/icons-material/Devices';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import DashboardCustomizeOutlinedIcon from '@mui/icons-material/DashboardCustomizeOutlined';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { hasChurchContext, canManageOcrPreferences } from './accountPermissions';

interface NavItem {
  labelKey: string;
  path: string;
  icon: React.ReactNode;
  descriptionKey: string;
  /** When set, item only shows if predicate returns true. */
  visible?: (user: any) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  // ── Self-service (always visible) ──
  {
    labelKey: 'account.profile_overview',
    path: '/account/profile',
    icon: <PersonOutlineIcon />,
    descriptionKey: 'account.account_summary',
  },
  {
    labelKey: 'account.personal_info',
    path: '/account/personal-info',
    icon: <EditIcon />,
    descriptionKey: 'account.edit_your_details',
  },
  {
    labelKey: 'account.password_and_auth',
    path: '/account/password',
    icon: <LockIcon />,
    descriptionKey: 'account.security_settings',
  },
  {
    labelKey: 'account.active_sessions',
    path: '/account/sessions',
    icon: <DevicesIcon />,
    descriptionKey: 'account.manage_signed_in_devices',
  },
  {
    labelKey: 'account.notifications_label',
    path: '/account/notifications',
    icon: <NotificationsActiveIcon />,
    descriptionKey: 'account.notification_preferences',
  },
  // ── Church-context (visible when user has a church) ──
  {
    labelKey: 'account.parish_info',
    path: '/account/parish',
    icon: <ChurchIcon />,
    descriptionKey: 'account.your_church_and_role',
    visible: (user) => hasChurchContext(user),
  },
  {
    labelKey: 'account.church_details',
    path: '/account/church-details',
    icon: <InfoOutlinedIcon />,
    descriptionKey: 'account.parish_information',
    visible: (user) => hasChurchContext(user),
  },
  {
    labelKey: 'account.branding',
    path: '/account/branding',
    icon: <PaletteIcon />,
    descriptionKey: 'account.logo_and_brand_identity',
    visible: (user) => hasChurchContext(user),
  },
  {
    labelKey: 'account.ocr_preferences',
    path: '/account/ocr-preferences',
    icon: <DocumentScannerIcon />,
    descriptionKey: 'account.document_scanning_settings',
    visible: (user) => canManageOcrPreferences(user),
  },
  // ── Parish Management ──
  {
    labelKey: 'account.parish_management',
    path: '/account/parish-management',
    icon: <DashboardCustomizeOutlinedIcon />,
    descriptionKey: 'account.database_mapping_themes_settings',
    visible: (user) => hasChurchContext(user),
  },
];

const AccountLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.visible || item.visible(user)),
    [user],
  );

  return (
    <PageContainer title={t('account.hub_title')} description={t('account.hub_description')}>
      <Breadcrumb
        title={t('account.hub_title')}
        items={[
          { to: '/', title: t('nav.home') },
          { title: t('account.hub_title') },
        ]}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '260px 1fr' },
          gap: 3,
          mt: 1,
        }}
      >
        {/* Left Nav */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            alignSelf: 'start',
            position: 'sticky',
            top: 80,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(45, 27, 78, 0.06)',
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#fff',
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              px: 1.5,
              pb: 1,
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: isDark ? '#6b7280' : '#9ca3af',
            }}
          >
            {t('account.account_settings')}
          </Typography>
          <List disablePadding>
            {visibleItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <ListItemButton
                  key={item.path}
                  selected={isActive}
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: '0 6px 6px 0',
                    mb: 0.5,
                    py: 0.75,
                    px: 1.5,
                    transition: 'color 0.15s ease, background-color 0.15s ease',
                    color: isDark ? '#9ca3af' : '#6b7280',
                    '&:hover': {
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(45, 27, 78, 0.04)',
                      color: isDark ? '#f3f4f6' : '#2d1b4e',
                    },
                    '&.Mui-selected': {
                      bgcolor: isDark ? 'rgba(212, 175, 55, 0.08)' : 'rgba(45, 27, 78, 0.05)',
                      color: isDark ? '#d4af37' : '#2d1b4e',
                      borderLeft: '2.5px solid',
                      borderLeftColor: isDark ? '#d4af37' : '#2d1b4e',
                      '& .MuiListItemIcon-root': {
                        color: isDark ? '#d4af37' : '#2d1b4e',
                        opacity: 1,
                      },
                      '&:hover': {
                        bgcolor: isDark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(45, 27, 78, 0.08)',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 36,
                      color: 'inherit',
                      opacity: isActive ? 1 : 0.6,
                      transition: 'opacity 0.15s ease',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={t(item.labelKey)}
                    secondary={t(item.descriptionKey)}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: isActive ? 500 : 400,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.875rem',
                    }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      sx: { opacity: 0.7 },
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Paper>

        {/* Content Area */}
        <Box>
          <Outlet />
        </Box>
      </Box>
    </PageContainer>
  );
};

export default AccountLayout;
