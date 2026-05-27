/**
 * Developer tool routes — all /devel/*, /devel-tools/*, /tools/* paths
 * extracted from Router.tsx. Each route is a FullLayout child.
 */
import { lazy } from 'react';
import OMDeps from '../features/devel-tools/om-deps/OM-deps';
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
const OmtraceConsole = Loadable(lazy(() => import('../features/devel-tools/omtrace/OmtraceConsole')));
const LoadingDemo = Loadable(lazy(() => import('../features/devel-tools/loading-demo/LoadingDemo')));
const MenuEditor = Loadable(lazy(() => import('../features/devel-tools/menu-editor/MenuEditor')));
const PageEditor = Loadable(lazy(() => import('../features/devel-tools/page-editor/PageEditor')));
const PageEditAuditPage = Loadable(lazy(() => import('../features/devel-tools/page-edit-audit/PageEditAuditPage')));
const RouterMenuStudio = Loadable(lazy(() => import('../features/devel-tools/RouterMenuStudio/RouterMenuStudioPage')));
const DynamicRecordsInspector = Loadable(lazy(() => import('../features/records-centralized/components/dynamic/DynamicRecordsInspector')));
const RefactorConsole = Loadable(lazy(() => import('../features/devel-tools/refactor-console/RefactorConsole')));
const ButtonShowcase = Loadable(lazy(() => import('../features/devel-tools/button-showcase/ButtonShowcase')));
const OMMagicImage = Loadable(lazy(() => import('../features/devel-tools/om-magic-image/om-magic-image')));
const USChurchMapPage = Loadable(lazy(() => import('../features/devel-tools/us-church-map/USChurchMapPage')));
const RepoOpsPage = Loadable(lazy(() => import('../features/devel-tools/repo-ops/RepoOpsPage')));
const OcrOperationsDashboard = Loadable(lazy(() => import('../features/devel-tools/ocr-operations/OcrOperationsDashboard')));
const OcrBatchManager = Loadable(lazy(() => import('../features/devel-tools/ocr-operations/OcrBatchManager')));
const WorkSessionAdmin = Loadable(lazy(() => import('../features/devel-tools/work-sessions/WorkSessionAdminPage')));
// ApiExplorerPage — migrated to OMAI (PR #99, OMD-1283). Route below redirects.
const LiveTableBuilderPage = Loadable(lazy(() => import('../features/devel-tools/live-table-builder/LiveTableBuilderPage')));
const TranslationManagerPage = Loadable(lazy(() => import('../features/devel-tools/translation-manager/TranslationManagerPage')));
const OMPermissionCenter = Loadable(lazy(() => import('../features/devel-tools/om-permission-center/PermissionsManagement')));
const InteractiveReportJobsPage = Loadable(lazy(() => import('../features/devel-tools/interactive-reports/InteractiveReportJobsPage')));
const PlatformStatusPage = Loadable(lazy(() => import('../features/devel-tools/platform-status/PlatformStatusPage')));
const CommandCenterPage = Loadable(lazy(() => import('../features/devel-tools/command-center/CommandCenterPage')));
const BadgeStateManagerPage = Loadable(lazy(() => import('../features/devel-tools/badge-state-manager/BadgeStateManagerPage')));
const BuildInfoPage = Loadable(lazy(() => import('../features/devel-tools/build-info/BuildInfoPage')));
const OmOcrStudioPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OmOcrStudioPage')));
const OCRSettingsPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OCRSettingsPage')));
const OcrSetupWizardPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OcrSetupWizardPage')));
const OcrReviewPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OcrReviewPage')));
const OcrTableExtractorPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OcrTableExtractorPage')));
const LayoutTemplateEditorPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/LayoutTemplateEditorPage')));
const OcrActivityMonitor = Loadable(lazy(() => import('../features/admin/OcrActivityMonitor')));
const GitOperations = Loadable(lazy(() => import('../features/devel-tools/git-operations/GitOperations')));
const OCRStudioPage = Loadable(lazy(() => import('../features/ocr/pages/OCRStudioPage')));
const OcrUploader = Loadable(lazy(() => import('../features/ocr/OcrUploader')));
const ChurchOCRPage = Loadable(lazy(() => import('../features/ocr/pages/ChurchOCRPage')));
const UploadRecordsPage = Loadable(lazy(() => import('../features/records-centralized/apps/upload-records/UploadRecordsPage')));

/**
 * All /devel/*, /devel-tools/*, /tools/* route definitions.
 * These are children of the FullLayout route.
 */
export const develRoutes = [
  guardedRoute('/devel-tools/omtrace', <OmtraceConsole />, ROLE_ADMIN_SUPER),
  {
    ...protectedRoute('/tools/file-deps', <OMDeps />, ROLE_SUPER),
    meta: { requiresAuth: true, hidden: true },
  },
  guardedRoute('/devel/router-menu-studio', <RouterMenuStudio />, ROLE_SUPER),
  guardedRoute('/devel-tools/menu-editor', <MenuEditor />, ROLE_SUPER),
  featureRoute('/devel-tools/page-editor', <PageEditor />, ROLE_SUPER, { featureId: 'page-editor', priority: 2, featureName: 'Page Content Editor' }),
  guardedRoute('/devel-tools/page-edit-audit', <PageEditAuditPage />, ROLE_SUPER),
  guardedRoute('/devel/dynamic-records', <DynamicRecordsInspector />, ROLE_SUPER_ADMIN),
  guardedRoute('/devel-tools/refactor-console', <RefactorConsole />, ROLE_SUPER_ADMIN),
  guardedRoute('/devel-tools/button-showcase', <ButtonShowcase />, ROLE_SUPER_ADMIN),
  guardedRoute('/devel-tools/om-magic-image', <OMMagicImage />, ROLE_SUPER_ADMIN),
  redirectRoute('/devel-tools/crm', '/admin/control-panel'),
  guardedRoute('/devel-tools/us-church-map', <USChurchMapPage />, ROLE_ADMIN_SUPER),
  featureRoute('/devel-tools/repo-ops', <RepoOpsPage />, ROLE_SUPER, { featureId: 'repo-ops' }),
  redirectRoute('/devel-tools/git-operations', '/devel-tools/repo-ops'),
  // Record Creation Wizard — retired from OM, now on OMAI /omai/tools/om-seedlings
  redirectRoute('/devel-tools/record-creation-wizard', '/admin/control-panel'),
  guardedRoute('/devel-tools/ocr-operations', <OcrOperationsDashboard />, ROLE_SUPER),
  guardedRoute('/devel-tools/ocr-batch-manager', <OcrBatchManager />, ROLE_SUPER),
  // OM Tasks, Daily Tasks — retired from OM, now managed via OMAI OM Daily
  guardedRoute('/devel-tools/work-session-admin', <WorkSessionAdmin />, ROLE_SUPER),
  redirectRoute('/devel-tools/api-explorer', '/admin/control-panel'),
  guardedRoute('/apps/devel/loading-demo', <LoadingDemo />, ROLE_SUPER_ADMIN),
  guardedRoute('/devel-tools/live-table-builder', <LiveTableBuilderPage />, ROLE_SUPER_ADMIN),
  featureRoute('/devel-tools/translation-manager', <TranslationManagerPage />, ROLE_SUPER, { featureId: 'translation-manager', priority: 2, featureName: 'Translation Manager' }),
  guardedRoute('/devel-tools/om-permission-center', <OMPermissionCenter />, ROLE_SUPER_ADMIN),
  featureRoute('/devel-tools/interactive-reports/jobs', <InteractiveReportJobsPage />, ['admin', 'super_admin', 'church_admin', 'priest'], { featureId: 'interactive-report-jobs', priority: 4, featureName: 'Interactive Report Jobs' }),
  redirectRoute('/devel-tools/build-info', '/devel-tools/repo-ops'),
  protectedRoute('/devel-tools/platform-status', <PlatformStatusPage />, ROLE_SUPER),
  protectedRoute('/devel-tools/command-center', <CommandCenterPage />, ROLE_SUPER),
  featureRoute('/devel-tools/badge-state-manager', <BadgeStateManagerPage />, ROLE_SUPER, { featureId: 'badge-state-manager' }),
  // OCR Studio routes
  guardedFeatureRoute('/devel/ocr-studio', <OCRStudioPage />, ROLE_STAFF, { featureId: 'ocr-studio', priority: 4, featureName: 'OCR Studio' }),
  guardedRoute('/devel/ocr-studio/church/:churchId', <ChurchOCRPage />, ROLE_STAFF),
  guardedRoute('/devel/ocr-setup-wizard', <OcrSetupWizardPage />, ROLE_STAFF),
  guardedFeatureRoute('/devel/ocr-studio/upload', <UploadRecordsPage />, ROLE_STAFF, { featureId: 'enhanced-ocr-uploader', priority: 2, featureName: 'OCR Upload' }),
  guardedRoute('/devel/ocr-studio/review/:churchId/:jobId', <OcrReviewPage />, ROLE_STAFF),
  guardedRoute('/devel/ocr-studio/review/:churchId', <OcrReviewPage />, ROLE_STAFF),
  guardedRoute('/devel/ocr-studio/jobs', <OcrActivityMonitor />, ROLE_SUPER),
  guardedRoute('/devel/ocr-studio/table-extractor', <OcrTableExtractorPage />, ROLE_SUPER),
  guardedRoute('/devel/ocr-studio/layout-templates', <LayoutTemplateEditorPage />, ROLE_SUPER),
  guardedRoute('/devel/ocr-studio/settings', <OCRSettingsPage />, ROLE_STAFF),
  guardedRoute('/devel/om-ocr-studio', <UploadRecordsPage />, ROLE_STAFF),
  guardedRoute('/devel/ocr-settings', <OCRSettingsPage />, ROLE_STAFF),
  guardedRoute('/devel/ocr-activity-monitor', <OcrActivityMonitor />, ROLE_SUPER),
];
