/**
 * OM Daily — work pipeline hub (restored from om-studio / control-panel).
 * Replaces the task-wheel landing page for platform operators.
 */
import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { ROLE_SUPER } from './rolePresets';

const OMDailyLayout = Loadable(lazy(() => import('../features/admin/om-daily/OMDailyLayout')));
const OMDailyDashboardPage = Loadable(lazy(() => import('../features/admin/om-daily/pages/OMDailyDashboardPage')));
const OMDailyItemsPage = Loadable(lazy(() => import('../features/admin/om-daily/pages/OMDailyItemsPage')));
const OMDailyBoardPage = Loadable(lazy(() => import('../features/admin/om-daily/pages/OMDailyBoardPage')));
const OMDailyChangelogPage = Loadable(lazy(() => import('../features/admin/om-daily/pages/OMDailyChangelogPage')));
const ChangeSetsDashboard = Loadable(lazy(() => import('../features/devel-tools/change-sets/ChangeSetsDashboard')));
const ChangeSetDetailPage = Loadable(lazy(() => import('../features/devel-tools/change-sets/ChangeSetDetailPage')));
const ReleaseHistoryPage = Loadable(lazy(() => import('../features/devel-tools/change-sets/ReleaseHistoryPage')));
const SDLCWizardPage = Loadable(lazy(() => import('../features/admin/sdlc-wizard/SDLCWizardPage')));
const PromptPlansPage = Loadable(lazy(() => import('../features/devel-tools/prompt-plans/PromptPlansPage')));
const PromptPlanDetailPage = Loadable(lazy(() => import('../features/devel-tools/prompt-plans/PromptPlanDetailPage')));

const omDailyShell = (
  <ProtectedRoute requiredRole={ROLE_SUPER}>
    <OMDailyLayout />
  </ProtectedRoute>
);

/** Nested route tree mounted at /om-daily */
export const omDailyRoutes = {
  path: '/om-daily',
  element: omDailyShell,
  children: [
    { index: true, element: <OMDailyDashboardPage /> },
    { path: 'items', element: <OMDailyItemsPage /> },
    { path: 'board', element: <OMDailyBoardPage /> },
    { path: 'changelog', element: <OMDailyChangelogPage /> },
    { path: 'change-sets', element: <ChangeSetsDashboard /> },
    { path: 'change-sets/releases', element: <ReleaseHistoryPage /> },
    { path: 'change-sets/:id', element: <ChangeSetDetailPage /> },
    { path: 'sdlc-wizard', element: <SDLCWizardPage /> },
    { path: 'prompt-plans', element: <PromptPlansPage /> },
    { path: 'prompt-plans/:id', element: <PromptPlanDetailPage /> },
  ],
};

/** Legacy paths → OM Daily */
export const omDailyLegacyRoutes = [
  { path: '/task-wheel', element: <Navigate to="/om-daily" replace /> },
  { path: '/admin/control-panel/om-daily', element: <Navigate to="/om-daily" replace /> },
  { path: '/admin/control-panel/om-daily/*', element: <Navigate to="/om-daily" replace /> },
];
