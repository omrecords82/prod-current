/**
 * Admin routes — all /admin/* paths extracted from Router.tsx
 * Each route is a FullLayout child (no layout wrapper needed here).
 */
import { lazy } from 'react';
import HeadlineSourcePicker from '../features/admin/headlines/HeadlineSourcePicker';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import {
    ROLE_ADMIN_SUPER,
    ROLE_STAFF,
    ROLE_SUPER,
    ROLE_SUPER_ADMIN,
} from './rolePresets';
import {
    featureRoute,
    guardedRoute,
    protectedRoute
} from './routeConfigHelpers';

/* ── Lazy imports ── */
const OmaiBridge = Loadable(lazy(() => import('../features/admin/OmaiBridge')));
const MenuPermissions = Loadable(lazy(() => import('../features/admin/MenuPermissions')));
const AdminSettings = Loadable(lazy(() => import('../features/admin/AdminSettings')));
const ChurchPublishingGuide = Loadable(lazy(() => import('../features/admin/components/ChurchPublishingGuide')));
const OMSiteSurvey = Loadable(lazy(() => import('../features/admin/tools/OMSiteSurvey')));
const BlogAdmin = Loadable(lazy(() => import('../features/admin/BlogAdmin')));
const SessionManagement = Loadable(lazy(() => import('../features/auth/admin/SessionManagement')));
const ActivityLogs = Loadable(lazy(() => import('../features/admin/ActivityLogs')));
const ScriptRunner = Loadable(lazy(() => import('../features/admin/ScriptRunner')));
const AIAdminPanel = Loadable(lazy(() => import('../features/admin/ai/AIAdminPanel')));
const AdminPageFallback = Loadable(lazy(() => import('../features/admin/AdminPageFallback')));
const CodeChangeDetection = Loadable(lazy(() => import('../features/admin/ai/CodeChangeDetection')));
const RecordsLandingConfig = Loadable(lazy(() => import('../features/admin/church-branding/RecordsLandingConfig')));
const OpsReportsPage = Loadable(lazy(() => import('../features/admin/ops/OpsReportsPage')));
const OrthodoxMetricsDash = Loadable(lazy(() => import('../features/admin/dashboard/OrthodoxMetrics')));
const OMBigBook = Loadable(lazy(() => import('../features/admin/OMBigBook')));
const OMAIDiscoveryPanelMobile = Loadable(lazy(() => import('../features/admin/OMAIDiscoveryPanelMobile')));
const LogSearch = Loadable(lazy(() => import('../features/admin/dashboard/LogSearch')));
const ChurchAdminList = Loadable(lazy(() => import('../features/admin/ChurchAdminList')));
const ChurchAdminPanel = Loadable(lazy(() => import('../features/admin/ChurchAdminPanelWorking')));

/**
 * All /admin/* route definitions.
 * These are children of the FullLayout route.
 */
export const adminRoutes = [
  // OMAI Bridge — redirect to OMAI Berry with auth token
  protectedRoute('/admin/omai', <OmaiBridge />, ROLE_STAFF),
  guardedRoute('/admin/menu-permissions', <MenuPermissions />, ROLE_SUPER_ADMIN),
  protectedRoute('/admin/settings', <AdminSettings />, ROLE_ADMIN_SUPER),
  protectedRoute('/admin/publishing-guide', <ChurchPublishingGuide />, ['admin', 'super_admin', 'church_admin']),
  guardedRoute('/admin/tools/survey', <OMSiteSurvey />, ROLE_SUPER),
  guardedRoute('/admin/blog-admin', <BlogAdmin />, ['super_admin', 'church_admin', 'admin']),
  // /admin/tutorials — migrated to OMAI (/omai/ops/tutorials)
  protectedRoute('/admin/logs', <ActivityLogs />, ROLE_ADMIN_SUPER),
  protectedRoute('/admin/sessions', <SessionManagement />, ROLE_ADMIN_SUPER),
  protectedRoute('/admin/activity-logs', <ActivityLogs />, ROLE_ADMIN_SUPER),
  guardedRoute('/admin/script-runner', <ScriptRunner />, ROLE_ADMIN_SUPER),
  protectedRoute('/admin/ai', <AIAdminPanel />, ROLE_ADMIN_SUPER),
  // Removed: /admin/jit-terminal route
  guardedRoute('/admin/headlines-config', <HeadlineSourcePicker />, ROLE_ADMIN_SUPER),
  protectedRoute('/admin', <AdminPageFallback />, ROLE_ADMIN_SUPER),
  // All /admin/control-panel/* routes removed — Control Panel retired
  featureRoute('/admin/ai/code-changes', <CodeChangeDetection />, ROLE_SUPER_ADMIN, { featureId: 'code-change-detection', priority: 2, featureName: 'Code Change Detection' }),
  featureRoute('/admin/church-branding/records-landing', <RecordsLandingConfig />, ['super_admin', 'admin', 'church_admin'], { featureId: 'records-landing-branding', priority: 2, featureName: 'Records Landing Branding' }),
  guardedRoute('/admin/ops', <OpsReportsPage />, ROLE_ADMIN_SUPER),
  guardedRoute('/admin/orthodox-metrics', <OrthodoxMetricsDash />, ROLE_SUPER_ADMIN),
  guardedRoute('/admin/bigbook', <OMBigBook />, ROLE_ADMIN_SUPER),
  guardedRoute('/admin/omai/mobile', <OMAIDiscoveryPanelMobile />, ROLE_SUPER),
  guardedRoute('/admin/log-search', <LogSearch />, ROLE_ADMIN_SUPER),
  protectedRoute('/admin/churches', <ChurchAdminList />, ROLE_ADMIN_SUPER),
  protectedRoute('/admin/church/:id', <ChurchAdminPanel />, ROLE_ADMIN_SUPER),
];
