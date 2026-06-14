/**
 * OCR Studio routes — Figma interface shell replacing legacy per-page MUI chrome.
 */
import { lazy } from 'react';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import { ROLE_STAFF, ROLE_SUPER } from './rolePresets';
import { guardedRoute, redirectRoute } from './routeConfigHelpers';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AdminErrorBoundary from '../components/ErrorBoundary/AdminErrorBoundary';
import EnvironmentAwarePage from '../components/routing/EnvironmentAwarePage';

const OcrStudioLayout = Loadable(
  lazy(() => import('../features/devel-tools/om-ocr/studio-interface/OcrStudioLayout')),
);
const OcrStudioCommandCenterPage = Loadable(
  lazy(() => import('../features/devel-tools/om-ocr/studio-interface/pages/OcrStudioCommandCenterPage')),
);
const OcrStudioUploadPage = Loadable(
  lazy(() => import('../features/devel-tools/om-ocr/studio-interface/pages/OcrStudioUploadPage')),
);
const OcrStudioBatchHistoryPage = Loadable(
  lazy(() => import('../features/devel-tools/om-ocr/studio-interface/pages/OcrStudioBatchHistoryPage')),
);
const OcrStudioJobOperationsPage = Loadable(
  lazy(() => import('../features/devel-tools/om-ocr/studio-interface/pages/OcrStudioJobOperationsPage')),
);
const OcrStudioReviewQueuePage = Loadable(
  lazy(() => import('../features/devel-tools/om-ocr/studio-interface/pages/OcrStudioReviewQueuePage')),
);
const OcrStudioReviewDetailPage = Loadable(
  lazy(() => import('../features/devel-tools/om-ocr/studio-interface/pages/OcrStudioReviewDetailPage')),
);
const OcrStudioRecordHeadersPage = Loadable(
  lazy(() => import('../features/devel-tools/om-ocr/studio-interface/pages/OcrStudioRecordHeadersPage')),
);
const OcrStudioTableExtractorPage = Loadable(
  lazy(() => import('../features/devel-tools/om-ocr/studio-interface/pages/OcrStudioTableExtractorPage')),
);
const OcrStudioLayoutTemplatesPage = Loadable(
  lazy(() => import('../features/devel-tools/om-ocr/studio-interface/pages/OcrStudioLayoutTemplatesPage')),
);
const OcrStudioSettingsPage = Loadable(
  lazy(() => import('../features/devel-tools/om-ocr/studio-interface/pages/OcrStudioSettingsPage')),
);
const OcrStudioAnalyzePage = Loadable(
  lazy(() => import('../features/devel-tools/om-ocr/studio-interface/pages/OcrStudioAnalyzePage')),
);
const OcrSetupWizardPage = Loadable(
  lazy(() => import('../features/devel-tools/om-ocr/pages/OcrSetupWizardPage')),
);

const ocrStudioShell = (
  <ProtectedRoute requiredRole={ROLE_STAFF}>
    <AdminErrorBoundary>
      <EnvironmentAwarePage featureId="ocr-studio" priority={4} featureName="OCR Studio">
        <OcrStudioLayout mode="devel" />
      </EnvironmentAwarePage>
    </AdminErrorBoundary>
  </ProtectedRoute>
);

export const ocrStudioRoutes = {
  path: '/devel/ocr-studio',
  element: ocrStudioShell,
  children: [
    { index: true, element: <OcrStudioCommandCenterPage /> },
    { path: 'analyze', element: <OcrStudioAnalyzePage /> },
    { path: 'upload', element: <OcrStudioUploadPage /> },
    { path: 'batch-history', element: <OcrStudioBatchHistoryPage /> },
    { path: 'jobs', element: <ProtectedRoute requiredRole={ROLE_SUPER}><OcrStudioJobOperationsPage /></ProtectedRoute> },
    { path: 'review', element: <OcrStudioReviewQueuePage /> },
    { path: 'review/:churchId', element: <OcrStudioReviewDetailPage /> },
    { path: 'review/:churchId/:jobId', element: <OcrStudioReviewDetailPage /> },
    { path: 'record-fields', element: <OcrStudioRecordHeadersPage /> },
    { path: 'table-extractor', element: <ProtectedRoute requiredRole={ROLE_SUPER}><OcrStudioTableExtractorPage /></ProtectedRoute> },
    { path: 'layout-templates', element: <ProtectedRoute requiredRole={ROLE_SUPER}><OcrStudioLayoutTemplatesPage /></ProtectedRoute> },
    { path: 'settings', element: <OcrStudioSettingsPage /> },
  ],
};

/**
 * All /devel/* developer tool routes (OCR Studio + setup wizard + legacy redirects).
 */
export const develRoutes = [
  ocrStudioRoutes,
  guardedRoute('/devel/ocr-setup-wizard', <OcrSetupWizardPage />, ROLE_STAFF),
  redirectRoute('/devel/enhanced-ocr-uploader', '/devel/ocr-studio/upload'),
  redirectRoute('/devel/om-ocr-studio', '/devel/ocr-studio'),
  redirectRoute('/devel/ocr-activity-monitor', '/devel/ocr-studio/jobs'),
];
