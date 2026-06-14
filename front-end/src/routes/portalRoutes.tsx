/**
 * Church Portal routes — the /portal/* layout block extracted from Router.tsx.
 * Exports the full top-level route object with ChurchPortalLayout wrapper.
 */
import { lazy } from 'react';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import { ROLE_ALL_CHURCH, ROLE_STAFF } from './rolePresets';
import { protectedRoute, redirectRoute } from './routeConfigHelpers';
import ProtectedRoute from '../components/auth/ProtectedRoute';

/* ── Lazy imports ── */
const ChurchPortalLayout = Loadable(lazy(() => import('../layouts/portal/ChurchPortalLayout')));
const ChurchPortalHub = Loadable(lazy(() => import('../features/portal/ChurchPortalHub')));
const PortalRecordsPage = Loadable(lazy(() => import('../features/portal/PortalRecordsPage')));
const PortalCertificatesPage = Loadable(lazy(() => import('../features/portal/PortalCertificatesPage')));
const BaptismRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/baptism/BaptismRecordsPage')));
const MarriageRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/marriage/MarriageRecordsPage')));
const FuneralRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/death/FuneralRecordsPage')));
const BaptismRecordEntryPage = Loadable(lazy(() => import('../features/records-centralized/baptism/BaptismRecordEntryPage')));
const MarriageRecordEntryPage = Loadable(lazy(() => import('../features/records-centralized/marriage/MarriageRecordEntryPage')));
const FuneralRecordEntryPage = Loadable(lazy(() => import('../features/records-centralized/funeral/FuneralRecordEntryPage')));
const OMChartsPage = Loadable(lazy(() => import('../features/church/apps/om-charts/OMChartsPage')));
const CertificateGeneratorPage = Loadable(lazy(() => import('../features/certificates/CertificateGeneratorPage')));
const OrthodoxScheduleGuidelinesPage = Loadable(lazy(() => import('../features/admin/control-panel/OrthodoxScheduleGuidelinesPage')));
const OcrSetupWizardPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OcrSetupWizardPage')));
const UserGuide = Loadable(lazy(() => import('../features/help/UserGuide')));
const SiteMapPage = Loadable(lazy(() => import('../features/admin/SiteMapPage')));
const OcrStudioLayout = Loadable(lazy(() => import('../features/devel-tools/om-ocr/studio-interface/OcrStudioLayout')));
const OcrStudioCommandCenterPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/studio-interface/pages/OcrStudioCommandCenterPage')));
const OcrStudioUploadPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/studio-interface/pages/OcrStudioUploadPage')));
const OcrStudioReviewQueuePage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/studio-interface/pages/OcrStudioReviewQueuePage')));
const OcrStudioReviewDetailPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/studio-interface/pages/OcrStudioReviewDetailPage')));
const OcrStudioSettingsPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/studio-interface/pages/OcrStudioSettingsPage')));

const portalOcrShell = (
  <ProtectedRoute requiredRole={ROLE_STAFF}>
    <OcrStudioLayout mode="portal" />
  </ProtectedRoute>
);

/**
 * Top-level portal route object with ChurchPortalLayout.
 */
export const portalRoute = {
  path: '/portal',
  element: <ChurchPortalLayout />,
  children: [
    { index: true, element: <ChurchPortalHub /> },
    // Records hub — all church staff
    protectedRoute('records', <PortalRecordsPage />, ROLE_ALL_CHURCH),
    // Legacy records list routes → redirect to unified records page
    redirectRoute('records/baptism', '/portal/records?type=baptism'),
    protectedRoute('records/baptism/new', <BaptismRecordEntryPage />, ROLE_ALL_CHURCH),
    protectedRoute('records/baptism/edit/:id', <BaptismRecordEntryPage />, ROLE_ALL_CHURCH),
    redirectRoute('records/marriage', '/portal/records?type=marriage'),
    protectedRoute('records/marriage/new', <MarriageRecordEntryPage />, ROLE_ALL_CHURCH),
    protectedRoute('records/marriage/edit/:id', <MarriageRecordEntryPage />, ROLE_ALL_CHURCH),
    redirectRoute('records/funeral', '/portal/records?type=funeral'),
    protectedRoute('records/funeral/new', <FuneralRecordEntryPage />, ROLE_ALL_CHURCH),
    protectedRoute('records/funeral/edit/:id', <FuneralRecordEntryPage />, ROLE_ALL_CHURCH),
    // Upload Records → OCR Studio upload (canonical portal digitization flow)
    redirectRoute('upload', '/portal/ocr/upload'),
    // Charts (church_admin + priest)
    protectedRoute('charts', <OMChartsPage />, ROLE_STAFF),
    // Certificates — new template-based flow
    protectedRoute('certificates', <PortalCertificatesPage />, ROLE_ALL_CHURCH),
    // Certificates — legacy drag-and-drop generator
    protectedRoute('certificates/generate', <CertificateGeneratorPage />, ROLE_ALL_CHURCH),
    // User Profile → redirect to Account Hub
    redirectRoute('profile', '/account/profile'),
    // User Guide
    protectedRoute('guide', <UserGuide />),
    // OCR Studio (portal — Figma shell)
    {
      path: 'ocr',
      element: portalOcrShell,
      children: [
        { index: true, element: <OcrStudioCommandCenterPage /> },
        { path: 'upload', element: <OcrStudioUploadPage /> },
        { path: 'review', element: <OcrStudioReviewQueuePage /> },
        { path: 'review/:churchId', element: <OcrStudioReviewDetailPage /> },
        { path: 'review/:churchId/:jobId', element: <OcrStudioReviewDetailPage /> },
        { path: 'settings', element: <OcrStudioSettingsPage /> },
      ],
    },
    protectedRoute('ocr/setup', <OcrSetupWizardPage />, ROLE_STAFF),
    redirectRoute('ocr/jobs', '/portal/ocr'),
    // Sacramental Restrictions (portal version)
    protectedRoute('sacramental-restrictions', <OrthodoxScheduleGuidelinesPage />, ROLE_ALL_CHURCH),
    // Site Map (portal version)
    protectedRoute('site-map', <SiteMapPage />),
  ],
};
