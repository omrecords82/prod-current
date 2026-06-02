/**
 * Developer tool routes — all /devel/*, /devel-tools/*, /tools/* paths
 * extracted from Router.tsx. Each route is a FullLayout child.
 */
import { lazy } from 'react';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import {
    ROLE_STAFF,
    ROLE_SUPER
} from './rolePresets';
import {
    featureRoute,
    guardedFeatureRoute,
    guardedRoute
} from './routeConfigHelpers';

/* ── Lazy imports ── */
const WorkSessionAdmin = Loadable(lazy(() => import('../features/devel-tools/work-sessions/WorkSessionAdminPage')));
const BadgeStateManagerPage = Loadable(lazy(() => import('../features/devel-tools/badge-state-manager/BadgeStateManagerPage')));
const OCRSettingsPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OCRSettingsPage')));
const OcrSetupWizardPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OcrSetupWizardPage')));
const OcrReviewPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OcrReviewPage')));
const OcrTableExtractorPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OcrTableExtractorPage')));
const LayoutTemplateEditorPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/LayoutTemplateEditorPage')));
const OcrActivityMonitor = Loadable(lazy(() => import('../features/admin/OcrActivityMonitor')));
const OCRStudioPage = Loadable(lazy(() => import('../features/ocr/pages/OCRStudioPage')));
const UploadRecordsPage = Loadable(lazy(() => import('../features/records-centralized/apps/upload-records/UploadRecordsPage')));

/**
 * All /devel/*, /devel-tools/*, /tools/* route definitions.
 * These are children of the FullLayout route.
 */
export const develRoutes = [
  // OM Tasks, Daily Tasks — retired from OM, now managed via OMAI OM Daily
  guardedRoute('/devel-tools/work-session-admin', <WorkSessionAdmin />, ROLE_SUPER),
  featureRoute('/devel-tools/badge-state-manager', <BadgeStateManagerPage />, ROLE_SUPER, { featureId: 'badge-state-manager' }),
  // OCR Studio routes
  guardedFeatureRoute('/devel/ocr-studio', <OCRStudioPage />, ROLE_STAFF, { featureId: 'ocr-studio', priority: 4, featureName: 'OCR Studio' }),
  guardedRoute('/devel/ocr-setup-wizard', <OcrSetupWizardPage />, ROLE_STAFF),
  guardedFeatureRoute('/devel/ocr-studio/upload', <UploadRecordsPage />, ROLE_STAFF, { featureId: 'enhanced-ocr-uploader', priority: 2, featureName: 'OCR Upload' }),
  guardedRoute('/devel/ocr-studio/review/:churchId/:jobId', <OcrReviewPage />, ROLE_STAFF),
  guardedRoute('/devel/ocr-studio/review/:churchId', <OcrReviewPage />, ROLE_STAFF),
  guardedRoute('/devel/ocr-studio/jobs', <OcrActivityMonitor />, ROLE_SUPER),
  guardedRoute('/devel/ocr-studio/table-extractor', <OcrTableExtractorPage />, ROLE_SUPER),
  guardedRoute('/devel/ocr-studio/layout-templates', <LayoutTemplateEditorPage />, ROLE_SUPER),
  guardedRoute('/devel/ocr-studio/settings', <OCRSettingsPage />, ROLE_STAFF),
];
