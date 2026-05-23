// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { useAuth } from '@/context/AuthContext';
import AppErrorBoundary from '@/shared/ui/AppErrorBoundary';
import { RecordsRouteErrorBoundary } from '@/shared/ui/RecordsRouteErrorBoundary';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AdminErrorBoundary from '../components/ErrorBoundary/AdminErrorBoundary';
import SmartRedirect from '../components/routing/SmartRedirect';
import RootGate from '../components/routing/RootGate';
import Loadable from '../layouts/full/shared/loadable/Loadable';

// Route sub-modules
import { adminRoutes } from './adminRoutes';
import { develRoutes } from './develRoutes';
import { portalRoute } from './portalRoutes';

// Records Pages
import { isInteractiveReportRecipientsEnabled } from '../config/featureFlags';

// Environment-Gated Feature Components
import EnvironmentAwarePage from '../components/routing/EnvironmentAwarePage';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));
const PublicLayout = Loadable(lazy(() => import('../layouts/public/PublicLayout')));
const ChurchPortalLayout = Loadable(lazy(() => import('../layouts/portal/ChurchPortalLayout')));

/* ****Pages***** */
const ModernDash = Loadable(lazy(() => import('../features/dashboard/ModernDashboard')));
const EcommerceDash = Loadable(lazy(() => import('../features/dashboard/Ecommerce')));

/* ****Apps***** */
const Contacts = Loadable(lazy(() => import('../features/apps/contacts/Contacts')));
const Notes = Loadable(lazy(() => import('../features/apps/notes/Notes')));
const Tickets = Loadable(lazy(() => import('../features/apps/tickets/Tickets')));
const Kanban = Loadable(lazy(() => import('../features/apps/kanban/Kanban')));
const DynamicRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/dynamic/DynamicRecordsPage')));
const AnalyticsDashboard = Loadable(lazy(() => import('../features/admin/AnalyticsDashboard')));
const WebsiteStatsPage = Loadable(lazy(() => import('../features/admin/website-stats/WebsiteStatsPage')));
// OMOD-1502: Tenant Portal Config Registry (Phase 5 of 8 of OMSD-1491)
const TenantPortalConfigPage = Loadable(lazy(() => import('../features/admin/tenant-portal-config/TenantPortalConfigPage')));
const Followers = Loadable(lazy(() => import('../features/apps/user-profile/Followers')));
const Friends = Loadable(lazy(() => import('../features/apps/user-profile/Friends')));
const UserProfileGallery = Loadable(lazy(() => import('../features/apps/user-profile/Gallery')));
const Email = Loadable(lazy(() => import('../features/apps/email/Email')));

/* ****Social Features***** */
const SocialChat = Loadable(lazy(() => import('../features/social/chat/SocialChat')));
const NotificationCenter = Loadable(lazy(() => import('../features/social/notifications/NotificationCenter')));
const SocialFriends = Loadable(lazy(() => import('../features/social/friends/FriendsList')));

// 404 Page
const NotFound404 = Loadable(lazy(() => import('../features/auth/authentication/NotFound404')));
const ComingSoon = Loadable(lazy(() => import('../features/auth/authentication/ComingSoon')));

// Church Management
const ChurchList = Loadable(lazy(() => import('../features/church/apps/church-management/ChurchList')));
const ChurchForm = Loadable(lazy(() => import('../features/church/apps/church-management/ChurchForm')));
const ChurchSetupWizard = Loadable(lazy(() => import('../features/devel-tools/om-church-wizard/ChurchSetupWizard')));

// Records Management
const AdvancedGridPage = Loadable(lazy(() => import('../features/tables/AdvancedGridPage')));

// Records Centralized Pages
const BaptismRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/baptism/BaptismRecordsPage')));
const MarriageRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/marriage/MarriageRecordsPage')));
const FuneralRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/death/FuneralRecordsPage')));
const CentralizedRecordsPageWrapper = Loadable(lazy(() => import('../features/records-centralized/components/records/RecordsPageWrapper')));

// Record Entry Forms
const BaptismRecordEntryPage = Loadable(lazy(() => import('../features/records-centralized/baptism/BaptismRecordEntryPage')));
const MarriageRecordEntryPage = Loadable(lazy(() => import('../features/records-centralized/marriage/MarriageRecordEntryPage')));
const FuneralRecordEntryPage = Loadable(lazy(() => import('../features/records-centralized/funeral/FuneralRecordEntryPage')));
const DynamicRecordsManager = Loadable(lazy(() => import('../features/records-centralized/components/records/DynamicRecordsManager')));
const ModernDynamicRecordsManager = Loadable(lazy(() => import('../features/records-centralized/components/records/ModernDynamicRecordsManager')));
const EditableRecordPage = Loadable(lazy(() => import('../features/records-centralized/components/records/EditableRecordPage')));

const InteractiveReportReview = Loadable(lazy(() => import('../features/records-centralized/components/interactiveReport/InteractiveReportReview')));
const InteractiveReportsPage = Loadable(lazy(() => import('../features/records-centralized/components/interactiveReport/InteractiveReportsPage')));
const RecipientSubmissionPage = Loadable(lazy(() => import('../features/records-centralized/components/interactiveReport/RecipientSubmissionPage')));
const PublicCollaborationPage = Loadable(lazy(() => import('../features/records-centralized/components/collaborationLinks/PublicCollaborationPage')));

const OMChartsPage = Loadable(lazy(() => import('../features/church/apps/om-charts/OMChartsPage')));
const OMAIUltimateLogger = Loadable(lazy(() => import('../features/devel-tools/om-ultimatelogger/LoggerDashboard')));
const SiteMapPage = Loadable(lazy(() => import('../features/admin/SiteMapPage')));
const OmaiBridge = Loadable(lazy(() => import('../features/admin/OmaiBridge')));
// Governance
const ComponentIntelligenceRegistry = Loadable(lazy(() => import('../features/admin/governance/ComponentIntelligenceRegistry')));

// OCR
const OCRStudioPage = Loadable(lazy(() => import('../features/ocr/pages/OCRStudioPage')));
const OcrUploader = Loadable(lazy(() => import('../features/ocr/OcrUploader')));
const UploadRecordsPage = Loadable(lazy(() => import('../features/records-centralized/apps/upload-records/UploadRecordsPage')));

// Big Book System
const OMLearn = Loadable(lazy(() => import('../features/omlearn/OMLearn')));
const BigBookDynamicRoute = Loadable(lazy(() => import('../features/admin/BigBookDynamicRoute')));

const Gallery = Loadable(lazy(() => import('../features/devel-tools/om-gallery/Gallery')));
const PageImageIndex = Loadable(lazy(() => import('../features/devel-tools/PageImageIndex')));
const LiturgicalCalendarPage = Loadable(lazy(() => import('../features/liturgical-calendar/LiturgicalCalendarPage')));

// Records UI Page
const RecordsUIPage = Loadable(lazy(() => import('../features/records-centralized/apps/records-ui/index')));

/* ****Account Hub***** */
const AccountLayout = Loadable(lazy(() => import('../features/account/AccountLayout')));
const AccountProfilePage = Loadable(lazy(() => import('../features/account/AccountProfilePage')));
const AccountPersonalInfoPage = Loadable(lazy(() => import('../features/account/AccountPersonalInfoPage')));
const AccountPasswordPage = Loadable(lazy(() => import('../features/account/AccountPasswordPage')));
const AccountParishInfoPage = Loadable(lazy(() => import('../features/account/AccountParishInfoPage')));
const AccountChurchDetailsPage = Loadable(lazy(() => import('../features/account/AccountChurchDetailsPage')));
const AccountBrandingPage = Loadable(lazy(() => import('../features/account/AccountBrandingPage')));
const AccountSessionsPage = Loadable(lazy(() => import('../features/account/AccountSessionsPage')));
const AccountNotificationsPage = Loadable(lazy(() => import('../features/account/AccountNotificationsPage')));
const AccountOcrPreferencesPage = Loadable(lazy(() => import('../features/account/AccountOcrPreferencesPage')));

/* ****Parish Management Hub***** */
const ParishManagementLayout = Loadable(lazy(() => import('../features/account/parish-management/ParishManagementLayout')));
const ParishDashboard = Loadable(lazy(() => import('../features/account/parish-management/ParishDashboard')));
const DatabaseMappingPage = Loadable(lazy(() => import('../features/account/parish-management/DatabaseMappingPage')));
const PMRecordSettingsPage = Loadable(lazy(() => import('../features/account/parish-management/RecordSettingsPage')));
const LandingPageBrandingPage = Loadable(lazy(() => import('../features/account/parish-management/LandingPageBrandingPage')));
const ThemeStudioPage = Loadable(lazy(() => import('../features/account/parish-management/ThemeStudioPage')));
const UIThemePage = Loadable(lazy(() => import('../features/account/parish-management/UIThemePage')));
const SearchConfigurationPage = Loadable(lazy(() => import('../features/account/parish-management/SearchConfigurationPage')));
const SystemBehaviorPage = Loadable(lazy(() => import('../features/account/parish-management/SystemBehaviorPage')));

/* ****Help & Documentation***** */
const UserGuide = Loadable(lazy(() => import('../features/help/UserGuide')));

// tables
const BasicTable = Loadable(lazy(() => import('../features/tables/BasicTable')));
const EnhanceTable = Loadable(lazy(() => import('../features/tables/EnhanceTable')));
const PaginationTable = Loadable(lazy(() => import('../features/tables/PaginationTable')));
const FixedHeaderTable = Loadable(lazy(() => import('../features/tables/FixedHeaderTable')));
const CollapsibleTable = Loadable(lazy(() => import('../features/tables/CollapsibleTable')));
const SearchTable = Loadable(lazy(() => import('../features/tables/SearchTable')));

// react tables
const ReactBasicTable = Loadable(lazy(() => import('../features/tables/react-tables/basic/page')));
const ReactColumnVisibilityTable = Loadable(
  lazy(() => import('../features/tables/react-tables/columnvisibility/page')),
);
const ReactDenseTable = Loadable(lazy(() => import('../features/tables/react-tables/dense/page')));
const ReactDragDropTable = Loadable(lazy(() => import('../features/tables/react-tables/drag-drop/page')));
const ReactEditableTable = Loadable(lazy(() => import('../features/tables/react-tables/editable/page')));
const ReactEmptyTable = Loadable(lazy(() => import('../features/tables/react-tables/empty/page')));
const ReactExpandingTable = Loadable(lazy(() => import('../features/tables/react-tables/expanding/page')));
const ReactFilterTable = Loadable(lazy(() => import('../features/tables/react-tables/filtering/page')));
const ReactPaginationTable = Loadable(lazy(() => import('../features/tables/react-tables/pagination/page')));
const ReactRowSelectionTable = Loadable(
  lazy(() => import('../features/tables/react-tables/row-selection/page')),
);
const ReactSortingTable = Loadable(lazy(() => import('../features/tables/react-tables/sorting/page')));
const ReactStickyTable = Loadable(lazy(() => import('../features/tables/react-tables/sticky/page')));

// authentication
const Login2 = Loadable(lazy(() => import('../features/auth/authentication/auth2/Login2')));
const Register = Loadable(lazy(() => import('../features/auth/authentication/auth1/Register')));
const Register2 = Loadable(lazy(() => import('../features/auth/authentication/auth2/Register2')));
const RegisterToken = Loadable(lazy(() => import('../features/auth/authentication/authForms/AuthRegisterToken')));
const AcceptInvite = Loadable(lazy(() => import('../features/auth/AcceptInvite')));
const ForgotPassword = Loadable(lazy(() => import('../features/auth/authentication/auth1/ForgotPassword')));
const ForgotPassword2 = Loadable(lazy(() => import('../features/auth/authentication/auth2/ForgotPassword2')));
const VerifyEmailPage = Loadable(lazy(() => import('../features/auth/VerifyEmailPage')));
const Unauthorized = Loadable(lazy(() => import('../features/auth/authentication/Unauthorized')));
const Maintenance = Loadable(lazy(() => import('../features/auth/authentication/Maintenance')));

// front end pages
const Homepage = Loadable(lazy(() => import('../features/pages/frontend-pages/Homepage')));
const About = Loadable(lazy(() => import('../features/pages/frontend-pages/About')));
const Contact = Loadable(lazy(() => import('../features/pages/frontend-pages/Contact')));
const Enrollment = Loadable(lazy(() => import('../features/pages/frontend-pages/Enrollment')));
const Portfolio = Loadable(lazy(() => import('../features/pages/frontend-pages/Portfolio')));
const PagePricing = Loadable(lazy(() => import('../features/pages/frontend-pages/Pricing')));
const BlogPage = Loadable(lazy(() => import('../features/pages/frontend-pages/Blog')));
const BlogPost = Loadable(lazy(() => import('../features/pages/frontend-pages/BlogPost')));
const PagesMenu = Loadable(lazy(() => import('../features/pages/frontend-pages/PagesMenu')));
const HTMLViewer = Loadable(lazy(() => import('../features/pages/frontend-pages/HTMLViewer')));
const GreekRecordsViewer = Loadable(lazy(() => import('../features/pages/frontend-pages/GreekRecordsViewer')));
const Samples = Loadable(lazy(() => import('../features/pages/frontend-pages/Samples')));
const SampleRecordsExplorer = Loadable(lazy(() => import('../features/pages/frontend-pages/SampleRecordsExplorer')));
const OCATimeline = Loadable(lazy(() => import('../features/pages/frontend-pages/OCATimeline')));
const PublicTasksListPage = Loadable(lazy(() => import('../features/pages/frontend-pages/PublicTasksListPage')));
const PublicTaskDetailPage = Loadable(lazy(() => import('../features/pages/frontend-pages/PublicTaskDetailPage')));
const WelcomeMessage = Loadable(lazy(() => import('../features/pages/frontend-pages/WelcomeMessage')));
const Tour = Loadable(lazy(() => import('../features/pages/frontend-pages/Tour')));
const Faq = Loadable(lazy(() => import('../features/pages/frontend-pages/Faq')));
const SacramentalRestrictionsPublicPage = Loadable(lazy(() => import('../features/pages/frontend-pages/SacramentalRestrictionsPublicPage')));
const Privacy = Loadable(lazy(() => import('../features/pages/frontend-pages/Privacy')));
const Terms = Loadable(lazy(() => import('../features/pages/frontend-pages/Terms')));
const Security = Loadable(lazy(() => import('../features/pages/frontend-pages/Security')));

const CertificateGeneratorPage = Loadable(lazy(() => import('../features/certificates/CertificateGeneratorPage')));

/**
 * Super admins stay in FullLayout (admin shell with sidebar).
 * All other users get ChurchPortalLayout (portal-style, no sidebar).
 */
function AccountLayoutSwitcher() {
  const { user } = useAuth();
  if (user?.role === 'super_admin') return <FullLayout />;
  return <ChurchPortalLayout />;
}

/**
 * Interactive Reports layout switcher.
 * super_admin / admin → FullLayout admin shell.
 * Everyone else (church_admin, priest, deacon, …) → ChurchPortalLayout, so
 * church staff using Interactive Reports never leave their portal chrome.
 */
function InteractiveReportsLayoutSwitcher() {
  const { user } = useAuth();
  const role = user?.role;
  if (role === 'super_admin' || role === 'admin') return <FullLayout />;
  return <ChurchPortalLayout />;
}

const Router = [
  // Root: unauthenticated visitors see the marketing Homepage; authenticated
  // users are redirected to their role-appropriate dashboard. Renders its own
  // HpHeader + SiteFooter so it does not need FullLayout (which gates on auth).
  {
    path: '/',
    element: <RootGate />,
  },
  {
    path: '/',
    element: <FullLayout />,
    children: [
      {
        path: '/dashboards/modern',
        exact: true,
        element: (
          <ProtectedRoute requiredPermission="view_dashboard">
            <AppErrorBoundary>
              <ModernDash />
            </AppErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/dashboards/ecommerce',
        exact: true,
        element: (
          <ProtectedRoute requiredPermission="view_dashboard">
            <EcommerceDash />
          </ProtectedRoute>
        )
      },

      // Apps
      {
        path: '/apps/contacts',
        element: (
          <ProtectedRoute>
            <Contacts />
          </ProtectedRoute>
        )
      },

      // Chat redirect from legacy route
      {
        path: '/apps/chats',
        element: <Navigate to="/social/chat" replace />
      },

      // Social Features Routes
      {
        path: '/social/chat',
        element: (
          <ProtectedRoute>
            <SocialChat />
          </ProtectedRoute>
        )
      },
      {
        path: '/social/friends',
        element: (
          <ProtectedRoute>
            <SocialFriends />
          </ProtectedRoute>
        )
      },
      {
        path: '/social/notifications',
        element: (
          <ProtectedRoute>
            <NotificationCenter />
          </ProtectedRoute>
        )
      },
      {
        path: '/notifications',
        element: (
          <ProtectedRoute>
            <NotificationCenter />
          </ProtectedRoute>
        )
      },

      {
        path: '/apps/email',
        element: (
          <ProtectedRoute>
            <Email />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/notes',
        element: (
          <ProtectedRoute>
            <Notes />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/tickets',
        element: (
          <ProtectedRoute>
            <Tickets />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/followers',
        element: (
          <ProtectedRoute>
            <Followers />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/friends',
        element: (
          <ProtectedRoute>
            <Friends />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/gallery',
        element: (
          <ProtectedRoute>
            <Gallery />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/gallery/page-index',
        element: (
          <ProtectedRoute>
            <PageImageIndex />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/kanban',
        element: (
          <ProtectedRoute>
            <Kanban />
          </ProtectedRoute>
        )
      },

      // Church Management Routes
      {
        path: '/apps/church-management',
        element: (
          <ProtectedRoute requiredPermission="manage_churches">
            <ChurchList />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/church-management/create',
        element: (
          <ProtectedRoute>
            <ChurchForm />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/church-management/wizard',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <ChurchSetupWizard />
          </ProtectedRoute>
        )
      },
      // OMOD-1502: Tenant Portal Config Registry (Phase 5 of OMSD-1491)
      {
        path: '/admin/tenant-portal-config',
        element: (
          <ProtectedRoute requiredRole={['super_admin', 'admin']}>
            <TenantPortalConfigPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/church-management/edit/:id',
        element: (
          <ProtectedRoute requiredPermission="manage_churches">
            <ChurchForm />
          </ProtectedRoute>
        )
      },
      // OM Charts — graphical charts from church sacramental records
      {
        path: '/apps/om-charts',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest']}>
            <EnvironmentAwarePage featureId="om-charts" priority={2} featureName="OM Charts">
              <OMChartsPage />
            </EnvironmentAwarePage>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/church-management/:churchId/charts',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <EnvironmentAwarePage featureId="om-charts" priority={2} featureName="OM Charts">
              <OMChartsPage />
            </EnvironmentAwarePage>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/church-management/:id/field-mapper',
        element: <Navigate to="/account/parish-management/database-mapping" replace />,
      },
      {
        path: '/church/omai-logger',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <OMAIUltimateLogger />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      // Help & Documentation
      {
        path: '/help/user-guide',
        element: (
          <ProtectedRoute>
            <UserGuide />
          </ProtectedRoute>
        )
      },
      // Site Map — full navigation tree with "you are here"
      {
        path: '/site-map',
        element: (
          <ProtectedRoute>
            <SiteMapPage />
          </ProtectedRoute>
        )
      },
      // Modernize User Profile Routes → redirect to Account Hub
      {
        path: '/apps/user-profile',
        element: <Navigate to="/account/profile" replace />,
      },
      {
        path: '/apps/user-profile/followers',
        element: (
          <ProtectedRoute>
            <Followers />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/user-profile/friends',
        element: (
          <ProtectedRoute>
            <Friends />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/user-profile/gallery',
        element: (
          <ProtectedRoute>
            <UserProfileGallery />
          </ProtectedRoute>
        )
      },
      // Legacy user profile routes → redirect to Account Hub
      {
        path: '/user-profile',
        element: <Navigate to="/account/profile" replace />,
      },

      // ── Admin routes (extracted to adminRoutes.tsx) ──
      ...adminRoutes,

      // ── Developer tool routes (extracted to develRoutes.tsx) ──
      ...develRoutes,

      // Big Book
      {
        path: '/bigbook/omlearn/*',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <OMLearn />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },

      // Governance
      {
        path: '/governance/component-intelligence',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin']}>
            <AdminErrorBoundary>
              <ComponentIntelligenceRegistry />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      // OMB Editor placeholder
      {
        path: '/omb/editor',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <AdminErrorBoundary>
              <div>OMB Editor</div>
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/centralized',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <CentralizedRecordsPageWrapper />
          </ProtectedRoute>
        )
      },
      // Church Records UI - Advanced Grid Route
      {
        path: '/apps/records-grid',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <AdvancedGridPage />
          </ProtectedRoute>
        )
      },
      // Records UI Page
      {
        path: '/apps/records-ui',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsUIPage />
          </ProtectedRoute>
        )
      },
      // Church Records UI with churchId
      {
        path: '/apps/records-ui/:churchId',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsUIPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/dynamic',
        element: (
          <ProtectedRoute>
            <DynamicRecordsPage />
          </ProtectedRoute>
        )
      },
      {
        path: '/dashboards/analytics',
        element: (
          <ProtectedRoute requiredPermission="view_dashboard">
            <AnalyticsDashboard />
          </ProtectedRoute>
        )
      },
      {
        // Public-website traffic stats — admin/super_admin only.
        // Reads from the configured analytics provider via /api/admin/website-stats;
        // shows a "configuration needed" empty state when no provider is set.
        path: '/admin/website-stats',
        element: (
          <ProtectedRoute requiredRole={['super_admin', 'admin']}>
            <WebsiteStatsPage />
          </ProtectedRoute>
        ),
      },
      {
        // Deprecated: old /apps/logs page was silently broken (missing imports).
        // Real logs page is /admin/logs (ActivityLogs). Redirect preserves old bookmarks.
        path: '/apps/logs',
        element: <Navigate to="/admin/logs" replace />,
      },

      // BIG BOOK CUSTOM COMPONENT ROUTES
      {
        path: '/bigbook/:componentId',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'editor']}>
            <AdminErrorBoundary>
              <BigBookDynamicRoute />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },

      {
        path: '/apps/liturgical-calendar',
        element: (
          <ProtectedRoute requiredRole={['super_admin']}>
            <EnvironmentAwarePage featureId="liturgical-calendar" priority={1} featureName="Liturgical Calendar">
              <LiturgicalCalendarPage />
            </EnvironmentAwarePage>
          </ProtectedRoute>
        )
      },

      { path: '/tables/basic', element: <BasicTable /> },
      { path: '/tables/enhanced', element: <EnhanceTable /> },
      { path: '/tables/pagination', element: <PaginationTable /> },
      { path: '/tables/fixed-header', element: <FixedHeaderTable /> },
      { path: '/tables/collapsible', element: <CollapsibleTable /> },
      { path: '/tables/search', element: <SearchTable /> },
      { path: '/react-tables/basic', element: <ReactBasicTable /> },
      { path: '/react-tables/column-visiblity', element: <ReactColumnVisibilityTable /> },
      { path: '/react-tables/drag-drop', element: <ReactDragDropTable /> },
      { path: '/react-tables/dense', element: <ReactDenseTable /> },
      { path: '/react-tables/editable', element: <ReactEditableTable /> },
      { path: '/react-tables/empty', element: <ReactEmptyTable /> },
      { path: '/react-tables/expanding', element: <ReactExpandingTable /> },
      { path: '/react-tables/filter', element: <ReactFilterTable /> },
      { path: '/react-tables/pagination', element: <ReactPaginationTable /> },
      { path: '/react-tables/row-selection', element: <ReactRowSelectionTable /> },
      { path: '/react-tables/sorting', element: <ReactSortingTable /> },
      { path: '/react-tables/sticky', element: <ReactStickyTable /> },

      // Records Centralized Routes
      {
        path: '/apps/records/baptism',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsRouteErrorBoundary>
              <EnvironmentAwarePage
                featureId="baptism-records-v2"
                priority={0}
                featureName="Baptism Records"
              >
                <BaptismRecordsPage />
              </EnvironmentAwarePage>
            </RecordsRouteErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/baptism/new',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsRouteErrorBoundary>
              <BaptismRecordEntryPage />
            </RecordsRouteErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/baptism/edit/:id',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsRouteErrorBoundary>
              <BaptismRecordEntryPage />
            </RecordsRouteErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/marriage',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsRouteErrorBoundary>
              <EnvironmentAwarePage
                featureId="marriage-records-v2"
                priority={0}
                featureName="Marriage Records"
              >
                <MarriageRecordsPage />
              </EnvironmentAwarePage>
            </RecordsRouteErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/marriage/new',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsRouteErrorBoundary>
              <MarriageRecordEntryPage />
            </RecordsRouteErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/marriage/edit/:id',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsRouteErrorBoundary>
              <MarriageRecordEntryPage />
            </RecordsRouteErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/funeral',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsRouteErrorBoundary>
              <EnvironmentAwarePage
                featureId="funeral-records-v2"
                priority={0}
                featureName="Funeral Records"
              >
                <FuneralRecordsPage />
              </EnvironmentAwarePage>
            </RecordsRouteErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/funeral/new',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsRouteErrorBoundary>
              <FuneralRecordEntryPage />
            </RecordsRouteErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/records/funeral/edit/:id',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <RecordsRouteErrorBoundary>
              <FuneralRecordEntryPage />
            </RecordsRouteErrorBoundary>
          </ProtectedRoute>
        )
      },
      // Upload Records
      {
        path: '/apps/upload-records',
        element: (
          <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
            <AdminErrorBoundary>
              <EnvironmentAwarePage
                featureId="upload-records"
                priority={4}
                featureName="Upload Records"
              >
                <UploadRecordsPage />
              </EnvironmentAwarePage>
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/apps/ocr-upload',
        element: (
          <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
            <AdminErrorBoundary>
              <EnvironmentAwarePage
                featureId="ocr-studio"
                priority={4}
                featureName="OCR Upload"
              >
                <OCRStudioPage />
              </EnvironmentAwarePage>
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      {
        path: '/records/ocr-uploader',
        element: (
          <ProtectedRoute requiredRole={['super_admin', 'admin', 'church_admin', 'priest']}>
            <AdminErrorBoundary>
              <OcrUploader />
            </AdminErrorBoundary>
          </ProtectedRoute>
        )
      },
      // Certificates
      {
        path: '/apps/certificates',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest', 'deacon', 'editor']}>
            <CertificateGeneratorPage />
          </ProtectedRoute>
        )
      },
      // Interactive Reports — moved out of FullLayout block so non-admin users
      // (priest, church_admin, …) render inside ChurchPortalLayout instead of
      // the admin shell. See InteractiveReportsLayoutSwitcher block below.
      { path: '/apps/records/manager', element: <DynamicRecordsManager /> },
      { path: '/apps/records/modern-manager', element: <ModernDynamicRecordsManager /> },
      { path: '/apps/records/editable', element: <EditableRecordPage /> },
    ],
  },
  // ── Church Portal (extracted to portalRoutes.tsx) ──
  portalRoute,
  // ── Interactive Reports — admins use FullLayout, church staff stay in portal ──
  {
    path: '/apps/records/interactive-reports',
    element: <InteractiveReportsLayoutSwitcher />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest']}>
            <EnvironmentAwarePage
              featureId="interactive-reports"
              priority={4}
              featureName="Interactive Reports"
            >
              <InteractiveReportsPage />
            </EnvironmentAwarePage>
          </ProtectedRoute>
        ),
      },
      {
        path: ':reportId',
        element: (
          <ProtectedRoute requiredRole={['admin', 'super_admin', 'church_admin', 'priest']}>
            <EnvironmentAwarePage
              featureId="interactive-reports"
              priority={4}
              featureName="Interactive Reports Review"
            >
              <InteractiveReportReview />
            </EnvironmentAwarePage>
          </ProtectedRoute>
        ),
      },
    ],
  },
  // ── Account Hub — super_admin uses FullLayout, others use portal ──
  {
    path: '/account',
    element: <AccountLayoutSwitcher />,
    children: [
      {
        element: (
          <ProtectedRoute>
            <AccountLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="/account/profile" replace /> },
          { path: 'profile', element: <AccountProfilePage /> },
          { path: 'personal-info', element: <AccountPersonalInfoPage /> },
          { path: 'password', element: <AccountPasswordPage /> },
          { path: 'sessions', element: <AccountSessionsPage /> },
          { path: 'notifications', element: <AccountNotificationsPage /> },
          { path: 'parish', element: <AccountParishInfoPage /> },
          { path: 'church-details', element: <AccountChurchDetailsPage /> },
          { path: 'branding', element: <AccountBrandingPage /> },
          { path: 'ocr-preferences', element: <AccountOcrPreferencesPage /> },
        ],
      },
      // Parish Management Hub — own sidebar layout
      {
        path: 'parish-management',
        element: (
          <ProtectedRoute>
            <ParishManagementLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <ParishDashboard /> },
          { path: 'database-mapping', element: <DatabaseMappingPage /> },
          { path: 'database-mapping/:step', element: <DatabaseMappingPage /> },
          { path: 'record-settings', element: <PMRecordSettingsPage /> },
          { path: 'landing-page-branding', element: <LandingPageBrandingPage /> },
          { path: 'theme-studio', element: <ThemeStudioPage /> },
          { path: 'ui-theme', element: <UIThemePage /> },
          { path: 'search-configuration', element: <SearchConfigurationPage /> },
          { path: 'system-behavior', element: <SystemBehaviorPage /> },
        ],
      },
    ],
  },
  {
    path: '/',
    element: <BlankLayout />,
    children: [
      // Auth routes - explicitly public, NO ProtectedRoute wrapper
      {
        path: 'auth',
        children: [
          { index: true, element: <Navigate to="/auth/login" replace /> },
          { path: '404', element: <NotFound404 /> },
          { path: 'coming-soon', element: <ComingSoon /> },
          { path: 'unauthorized', element: <Unauthorized /> },
          { path: 'login', element: <Login2 /> },
          { path: 'login2', element: <Login2 /> },
          { path: 'register', element: <Register /> },
          { path: 'register-token', element: <RegisterToken /> },
          { path: 'register2', element: <Register2 /> },
          { path: 'forgot-password', element: <ForgotPassword /> },
          { path: 'forgot-password2', element: <ForgotPassword2 /> },
          { path: 'maintenance', element: <Maintenance /> },
          { path: 'accept-invite/:token', element: <AcceptInvite /> },
          { path: 'verify-email', element: <VerifyEmailPage /> },
          { path: '*', element: <NotFound404 /> },
        ]
      },
      // Root login redirect
      { path: 'login', element: <Navigate to="/auth/login2" replace /> },
      // Public "Get Started" entry — same Register inquiry wizard.
      // /auth/register stays as an alias for admin-issued registration-token links.
      { path: '/get-started', element: <Register /> },
      { path: '/landingpage', element: <Navigate to="/admin/control-panel" replace /> },
      { path: '/pages/pricing', element: <Navigate to="/admin/control-panel" replace /> },
      { path: '/pages/faq', element: <Faq /> },
      { path: '/frontend-pages/faq', element: <Faq /> },
      { path: '/frontend-pages/menu', element: <PagesMenu /> },
      { path: '/frontend-pages/portfolio', element: <Portfolio /> },
      { path: '/frontend-pages/oca-timeline', element: <OCATimeline /> },
      { path: '/frontend-pages/welcome-message', element: <WelcomeMessage /> },
      { path: '/blog/:slug', element: <BlogPost /> },
      { path: '/frontend-pages/blog/detail/:id', element: <BlogPost /> },
      { path: '/frontend-pages/gallery', element: <Gallery /> },
      { path: '/frontend-pages/sacramental-restrictions', element: <SacramentalRestrictionsPublicPage /> },
      // Public pages with shared header/footer via PublicLayout
      {
        element: <PublicLayout />,
        children: [
          { path: '/frontend-pages/homepage', element: <Homepage /> },
          { path: '/frontend-pages/about', element: <About /> },
          { path: '/frontend-pages/contact', element: <Contact /> },
          { path: '/frontend-pages/enroll', element: <Enrollment /> },
          { path: '/frontend-pages/pricing', element: <PagePricing /> },
          { path: '/frontend-pages/blog', element: <BlogPage /> },
          { path: '/samples', element: <Samples /> },
          { path: '/frontend-pages/samples', element: <Samples /> },
          { path: '/samples/explorer', element: <SampleRecordsExplorer /> },
          { path: '/tour', element: <Tour /> },
          { path: '/privacy', element: <Privacy /> },
          { path: '/terms', element: <Terms /> },
          { path: '/security', element: <Security /> },
        ],
      },
      { path: '/greek_baptism_table_demo.html', element: <GreekRecordsViewer /> },
      { path: '/russian_wedding_table_demo.html', element: <HTMLViewer htmlFile="/russian_wedding_table_demo.html" /> },
      { path: '/romanian_funeral_table_demo.html', element: <HTMLViewer htmlFile="/romanian_funeral_table_demo.html" /> },
      // Public Task Pages (no authentication required)
      { path: '/tasks', element: <PublicTasksListPage /> },
      { path: '/tasks/:id', element: <PublicTaskDetailPage /> },
      // Interactive Report Recipient Page (public, token-based)
      ...(isInteractiveReportRecipientsEnabled() ? [
        { path: '/r/interactive/:token', element: <RecipientSubmissionPage /> },
      ] : []),
      // Collaboration Links (public, token-based)
      { path: '/c/:token', element: <PublicCollaborationPage /> },

      { path: '*', element: <NotFound404 /> },
    ],
  },
];

// Wrap every route under a tiny layout so AnalyticsRouterListener
// sits inside the router context and can call useLocation. The
// listener is a render-null component that fires pageviews on
// route change — and no-ops if no analytics provider is configured.
const AnalyticsRouterListener = lazy(
  () => import('@/components/analytics/AnalyticsRouterListener'),
);
const RouterRootLayout = () => (
  <>
    <Suspense fallback={null}>
      <AnalyticsRouterListener />
    </Suspense>
    <Outlet />
  </>
);

const router = createBrowserRouter([
  {
    element: <RouterRootLayout />,
    children: Router,
  },
]);

export default router;
