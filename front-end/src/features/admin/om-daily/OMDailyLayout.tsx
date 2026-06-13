/**
 * OMDailyLayout — Shared sub-navigation wrapper for all OM Daily sub-pages.
 *
 * Provides a horizontal tab bar linking to Dashboard, Items, Board,
 * Change Sets, Prompt Plans, and Changelog. Renders child routes via <Outlet />.
 */

import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Tab,
  Tabs,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  FormatListBulleted as ItemsIcon,
  ViewKanban as BoardIcon,
  Inventory2 as ChangeSetsIcon,
  AutoFixHigh as PromptPlansIcon,
  History as ChangelogIcon,
} from '@mui/icons-material';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';

const BASE = '/om-daily';

interface NavTab {
  label: string;
  path: string;
  icon: React.ReactElement;
  /** If true, match any path starting with this prefix (for sub-routes like :id) */
  matchPrefix?: boolean;
}

const NAV_TABS: NavTab[] = [
  { label: 'Dashboard', path: BASE, icon: <DashboardIcon fontSize="small" /> },
  { label: 'Items', path: `${BASE}/items`, icon: <ItemsIcon fontSize="small" /> },
  { label: 'Board', path: `${BASE}/board`, icon: <BoardIcon fontSize="small" /> },
  { label: 'Change Sets', path: `${BASE}/change-sets`, icon: <ChangeSetsIcon fontSize="small" />, matchPrefix: true },
  { label: 'Prompt Plans', path: `${BASE}/prompt-plans`, icon: <PromptPlansIcon fontSize="small" />, matchPrefix: true },
  { label: 'Changelog', path: `${BASE}/changelog`, icon: <ChangelogIcon fontSize="small" /> },
];

/** Routes that should hide the sub-nav (full-page experiences) */
const HIDDEN_NAV_ROUTES = [
  `${BASE}/sdlc-wizard`,
];

function resolveActiveTab(pathname: string): number | false {
  // Exact match first
  for (let i = 0; i < NAV_TABS.length; i++) {
    if (pathname === NAV_TABS[i].path || pathname === `${NAV_TABS[i].path}/`) {
      return i;
    }
  }
  // Prefix match for sub-routes (e.g., /change-sets/:id, /prompt-plans/:id)
  for (let i = NAV_TABS.length - 1; i >= 0; i--) {
    if (NAV_TABS[i].matchPrefix && pathname.startsWith(NAV_TABS[i].path + '/')) {
      return i;
    }
  }
  return false;
}

const OMDailyLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const activeTab = resolveActiveTab(location.pathname);
  const hideNav = HIDDEN_NAV_ROUTES.some((r) => location.pathname.startsWith(r));

  return (
    <PageContainer title="OM Daily" description="Work pipeline management">
      <Breadcrumb title="OM Daily" items={[{ to: '/', title: 'Home' }, { title: 'OM Daily' }]} />
      <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, pb: 3 }}>
      {!hideNav && (
        <Box
          sx={{
            mb: 2,
            borderBottom: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'divider',
            bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
            borderRadius: '8px 8px 0 0',
            px: 1,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_e, newVal) => navigate(NAV_TABS[newVal].path)}
            variant="scrollable"
            scrollButtons="auto"
            textColor="primary"
            indicatorColor="primary"
            sx={{
              minHeight: 42,
              '& .MuiTab-root': {
                minHeight: 42,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.8125rem',
                py: 0.75,
                px: 1.5,
                gap: 0.75,
              },
            }}
          >
            {NAV_TABS.map((tab) => (
              <Tab
                key={tab.path}
                icon={tab.icon}
                iconPosition="start"
                label={tab.label}
              />
            ))}
          </Tabs>
        </Box>
      )}

      <Outlet />
      </Box>
    </PageContainer>
  );
};

export default OMDailyLayout;
