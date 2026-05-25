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
    guardedFeatureRoute,
    guardedRoute,
    protectedRoute,
    redirectRoute,
} from './routeConfigHelpers';

/* ── Lazy imports ── */
const OmaiBridge = Loadable(lazy(() => import('../features/admin/OmaiBridge')));
const MenuPermissions = Loadable(lazy(() => import('../features/admin/MenuPermissions')));
const MenuManagement = Loadable(lazy(() => import('../features/admin/MenuManagement')));
const AdminSettings = Loadable(lazy(() => import('../features/admin/AdminSettings')));
const ChurchPublishingGuide = Loadable(lazy(() => import('../features/admin/components/ChurchPublishingGuide')));
const OMSiteSurvey = Loadable(lazy(() => import('../features/admin/tools/OMSiteSurvey')));
const BlogAdmin = Loadable(lazy(() => import('../features/admin/BlogAdmin')));
const SessionManagement = Loadable(lazy(() => import('../features/auth/admin/SessionManagement')));
const ActivityLogs = Loadable(lazy(() => import('../features/admin/ActivityLogs')));
const ScriptRunner = Loadable(lazy(() => import('../features/admin/ScriptRunner')));
const AIAdminPanel = Loadable(lazy(() => import('../features/admin/ai/AIAdminPanel')));
const AdminPageFallback = Loadable(lazy(() => import('../features/admin/AdminPageFallback')));
const AdminControlPanel = Loadable(lazy(() => import('../features/admin/control-panel/AdminControlPanel')));
const ChurchManagementPage = Loadable(lazy(() => import('../features/admin/control-panel/ChurchManagementPage')));
const OrthodoxScheduleGuidelinesPage = Loadable(lazy(() => import('../features/admin/control-panel/OrthodoxScheduleGuidelinesPage')));
const PendingMembersPage = Loadable(lazy(() => import('../features/admin/control-panel/PendingMembersPage')));
const JurisdictionsPage = Loadable(lazy(() => import('../features/admin/control-panel/JurisdictionsPage')));
const DemoChurchesPage = Loadable(lazy(() => import('../features/admin/control-panel/DemoChurchesPage')));
const CertificateTemplatesPage = Loadable(lazy(() => import('../features/admin/control-panel/CertificateTemplatesPage')));
const ChurchLifecycleDetailPage = Loadable(lazy(() => import('../features/admin/control-panel/ChurchLifecycleDetailPage')));
const RecordsOCRPage = Loadable(lazy(() => import('../features/admin/control-panel/RecordsOCRPage')));
const SystemServerPage = Loadable(lazy(() => import('../features/admin/control-panel/SystemServerPage')));
const AIAutomationPage = Loadable(lazy(() => import('../features/admin/control-panel/AIAutomationPage')));
const CodeChangeDetection = Loadable(lazy(() => import('../features/admin/ai/CodeChangeDetection')));
const RecordsLandingConfig = Loadable(lazy(() => import('../features/admin/church-branding/RecordsLandingConfig')));
const OMAppSuitePage = Loadable(lazy(() => import('../features/admin/control-panel/OMAppSuitePage')));
const ComponentsInDevelopmentPage = Loadable(lazy(() => import('../features/admin/control-panel/ComponentsInDevelopmentPage')));
const DeprecatedComponentsPage = Loadable(lazy(() => import('../features/admin/control-panel/DeprecatedComponentsPage')));
const SDLCPage = Loadable(lazy(() => import('../features/admin/control-panel/SDLCPage')));
const UsersSecurityPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/UsersSecurityPage')));
const ContentMediaPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/ContentMediaPage')));
const SocialCommsPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/SocialCommsPage')));
const ServerDevOpsPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/ServerDevOpsPage')));
const PlatformConfigPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/PlatformConfigPage')));
const CodeSafetyPage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/CodeSafetyPage')));
const SSLCertificatePage = Loadable(lazy(() => import('../features/admin/control-panel/system-server/SSLCertificatePage')));
const OpsReportsPage = Loadable(lazy(() => import('../features/admin/ops/OpsReportsPage')));
const OrthodoxMetricsDash = Loadable(lazy(() => import('../features/admin/dashboard/OrthodoxMetrics')));
const OMBigBook = Loadable(lazy(() => import('../features/admin/OMBigBook')));
const OMAIDiscoveryPanelMobile = Loadable(lazy(() => import('../features/admin/OMAIDiscoveryPanelMobile')));
const LogSearch = Loadable(lazy(() => import('../features/admin/dashboard/LogSearch')));
const ChurchAdminList = Loadable(lazy(() => import('../features/admin/ChurchAdminList')));
const ChurchAdminPanel = Loadable(lazy(() => import('../features/admin/ChurchAdminPanelWorking')));
const EcosystemRoadmapPage = Loadable(lazy(() => import('../features/admin/ecosystem-roadmap/EcosystemRoadmapPage')));

/**
 * All /admin/* route definitions.
 * These are children of the FullLayout route.
 */
export const adminRoutes = [
  // OMAI Bridge — redirect to OMAI Berry with auth token
  protectedRoute('/admin/omai', <OmaiBridge />, ROLE_STAFF),
  guardedRoute('/admin/menu-permissions', <MenuPermissions />, ROLE_SUPER_ADMIN),
  guardedRoute('/admin/menu-management', <MenuManagement />, ROLE_SUPER_ADMIN),
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
  guardedRoute('/admin/control-panel', <AdminControlPanel />, ROLE_SUPER),
  guardedRoute('/admin/control-panel/church-management', <ChurchManagementPage />, ROLE_SUPER),
  guardedRoute('/admin/control-panel/church-management/sacramental-restrictions', <OrthodoxScheduleGuidelinesPage />, ROLE_SUPER),
  guardedFeatureRoute('/admin/control-panel/pending-members', <PendingMembersPage />, ROLE_SUPER_ADMIN, { featureId: 'pending-members', priority: 4, featureName: 'Pending Members' }),
  redirectRoute('/admin/control-panel/church-onboarding', '/admin/control-panel'),
  redirectRoute('/admin/control-panel/church-onboarding/:churchId', '/admin/control-panel'),
  guardedFeatureRoute('/admin/control-panel/jurisdictions', <JurisdictionsPage />, ROLE_SUPER_ADMIN, { featureId: 'jurisdictions', priority: 4, featureName: 'Jurisdictions' }),
  guardedFeatureRoute('/admin/control-panel/demo-churches', <DemoChurchesPage />, ROLE_SUPER_ADMIN, { featureId: 'demo-churches', priority: 4, featureName: 'Demo Churches' }),
  guardedRoute('/admin/control-panel/certificate-templates', <CertificateTemplatesPage />, ROLE_SUPER),
  redirectRoute('/admin/control-panel/church-pipeline', '/admin/control-panel'),
  // church-lifecycle list — retired from OM, feature now owned by OMAI (PP-0003)
  redirectRoute('/admin/control-panel/church-lifecycle', '/admin/control-panel'),
  // church-lifecycle detail — OMAI opens this URL via window.open(); keep route for OMAI consumption
  guardedFeatureRoute('/admin/control-panel/church-lifecycle/:churchId', <ChurchLifecycleDetailPage />, ROLE_SUPER_ADMIN, { featureId: 'church-lifecycle-detail', priority: 4, featureName: 'Church Lifecycle Detail' }),
  // Deprecated: onboarding-pipeline routes → redirect to church lifecycle (PP-0003 Stage 4)
  redirectRoute('/admin/control-panel/onboarding-pipeline', '/admin/control-panel'),
  redirectRoute('/admin/control-panel/onboarding-pipeline/:id', '/admin/control-panel'),
  guardedRoute('/admin/control-panel/records-ocr', <RecordsOCRPage />, ROLE_SUPER),
  // /admin/control-panel/crm-outreach — migrated to OMAI
  guardedRoute('/admin/control-panel/system-server', <SystemServerPage />, ROLE_SUPER),
  guardedRoute('/admin/control-panel/ai-automation', <AIAutomationPage />, ROLE_SUPER),
  featureRoute('/admin/ai/code-changes', <CodeChangeDetection />, ROLE_SUPER_ADMIN, { featureId: 'code-change-detection', priority: 2, featureName: 'Code Change Detection' }),
  featureRoute('/admin/church-branding/records-landing', <RecordsLandingConfig />, ['super_admin', 'admin', 'church_admin'], { featureId: 'records-landing-branding', priority: 2, featureName: 'Records Landing Branding' }),
  guardedRoute('/admin/control-panel/om-app-suite', <OMAppSuitePage />, ROLE_SUPER),
  guardedRoute('/admin/control-panel/components-in-development', <ComponentsInDevelopmentPage />, ROLE_SUPER),
  guardedRoute('/admin/control-panel/deprecated-components', <DeprecatedComponentsPage />, ROLE_SUPER),
  guardedRoute('/admin/control-panel/sdlc', <SDLCPage />, ROLE_SUPER),
  guardedRoute('/admin/control-panel/system-server/users-security', <UsersSecurityPage />, ROLE_SUPER),
  guardedRoute('/admin/control-panel/system-server/content-media', <ContentMediaPage />, ROLE_SUPER),
  guardedRoute('/admin/control-panel/system-server/social-comms', <SocialCommsPage />, ROLE_SUPER),
  guardedRoute('/admin/control-panel/system-server/server-devops', <ServerDevOpsPage />, ROLE_SUPER),
  guardedRoute('/admin/control-panel/system-server/platform-config', <PlatformConfigPage />, ROLE_SUPER),
  guardedRoute('/admin/control-panel/system-server/code-safety', <CodeSafetyPage />, ROLE_SUPER),
  guardedRoute('/admin/control-panel/system-server/platform-config/ssl-certificates', <SSLCertificatePage />, ROLE_SUPER),
  guardedRoute('/admin/ops', <OpsReportsPage />, ROLE_ADMIN_SUPER),
  guardedRoute('/admin/orthodox-metrics', <OrthodoxMetricsDash />, ROLE_SUPER_ADMIN),
  guardedRoute('/admin/bigbook', <OMBigBook />, ROLE_ADMIN_SUPER),
  guardedRoute('/admin/omai/mobile', <OMAIDiscoveryPanelMobile />, ROLE_SUPER),
  guardedRoute('/admin/log-search', <LogSearch />, ROLE_ADMIN_SUPER),
  protectedRoute('/admin/churches', <ChurchAdminList />, ROLE_ADMIN_SUPER),
  protectedRoute('/admin/church/:id', <ChurchAdminPanel />, ROLE_ADMIN_SUPER),
  guardedRoute('/admin/ecosystem-roadmap', <EcosystemRoadmapPage />, ROLE_SUPER_ADMIN),
];
