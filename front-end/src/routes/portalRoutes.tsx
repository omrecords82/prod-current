/**
 * Church Portal routes — the /portal/* layout block extracted from Router.tsx.
 * Exports the full top-level route object with ChurchPortalLayout wrapper.
 */
import { lazy } from 'react';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import { ROLE_ALL_CHURCH, ROLE_STAFF } from './rolePresets';
import { protectedRoute, redirectRoute } from './routeConfigHelpers';

/* ── Lazy imports ── */
const ChurchPortalLayout = Loadable(lazy(() => import('../layouts/portal/ChurchPortalLayout')));
const ChurchPortalHub = Loadable(lazy(() => import('../features/portal/ChurchPortalHub')));
const PortalSettingsPage = Loadable(lazy(() => import('../features/portal/PortalSettingsPage')));
const PortalRecordsPage = Loadable(lazy(() => import('../features/portal/PortalRecordsPage')));
const PortalCertificatesPage = Loadable(lazy(() => import('../features/portal/PortalCertificatesPage')));
const BaptismRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/baptism/BaptismRecordsPage')));
const MarriageRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/marriage/MarriageRecordsPage')));
const FuneralRecordsPage = Loadable(lazy(() => import('../features/records-centralized/components/death/FuneralRecordsPage')));
const BaptismRecordEntryPage = Loadable(lazy(() => import('../features/records-centralized/baptism/BaptismRecordEntryPage')));
const MarriageRecordEntryPage = Loadable(lazy(() => import('../features/records-centralized/marriage/MarriageRecordEntryPage')));
const FuneralRecordEntryPage = Loadable(lazy(() => import('../features/records-centralized/funeral/FuneralRecordEntryPage')));
const UploadRecordsPage = Loadable(lazy(() => import('../features/records-centralized/apps/upload-records/UploadRecordsPage')));
const OMChartsPage = Loadable(lazy(() => import('../features/church/apps/om-charts/OMChartsPage')));
const CertificateGeneratorPage = Loadable(lazy(() => import('../features/certificates/CertificateGeneratorPage')));
const OrthodoxScheduleGuidelinesPage = Loadable(lazy(() => import('../features/admin/control-panel/OrthodoxScheduleGuidelinesPage')));
const OCRStudioPage = Loadable(lazy(() => import('../features/ocr/pages/OCRStudioPage')));
const OcrReviewPage = Loadable(lazy(() => import('../features/devel-tools/om-ocr/pages/OcrReviewPage')));
const UserGuide = Loadable(lazy(() => import('../features/help/UserGuide')));
const SiteMapPage = Loadable(lazy(() => import('../features/admin/SiteMapPage')));

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
    redirectRoute('records/baptism', '/portal/records'),
    protectedRoute('records/baptism/new', <BaptismRecordEntryPage />, ROLE_ALL_CHURCH),
    protectedRoute('records/baptism/edit/:id', <BaptismRecordEntryPage />, ROLE_ALL_CHURCH),
    redirectRoute('records/marriage', '/portal/records'),
    protectedRoute('records/marriage/new', <MarriageRecordEntryPage />, ROLE_ALL_CHURCH),
    protectedRoute('records/marriage/edit/:id', <MarriageRecordEntryPage />, ROLE_ALL_CHURCH),
    redirectRoute('records/funeral', '/portal/records'),
    protectedRoute('records/funeral/new', <FuneralRecordEntryPage />, ROLE_ALL_CHURCH),
    protectedRoute('records/funeral/edit/:id', <FuneralRecordEntryPage />, ROLE_ALL_CHURCH),
    // Upload Records (church_admin + priest)
    protectedRoute('upload', <UploadRecordsPage />, ROLE_STAFF),
    // Charts (church_admin + priest)
    protectedRoute('charts', <OMChartsPage />, ROLE_STAFF),
    // Certificates — new template-based flow
    protectedRoute('certificates', <PortalCertificatesPage />, ROLE_ALL_CHURCH),
    // Certificates — legacy drag-and-drop generator
    protectedRoute('certificates/generate', <CertificateGeneratorPage />, ROLE_ALL_CHURCH),
    // Parish Settings
    protectedRoute('settings', <PortalSettingsPage />, ROLE_STAFF),
    // User Profile → redirect to Account Hub
    redirectRoute('profile', '/account/profile'),
    // User Guide
    protectedRoute('guide', <UserGuide />),
    // OCR Studio (portal version)
    protectedRoute('ocr', <OCRStudioPage />, ROLE_STAFF),
    // OCR Jobs History (portal version)
    protectedRoute('ocr/jobs', <OcrReviewPage />, ROLE_STAFF),
    // Sacramental Restrictions (portal version)
    protectedRoute('sacramental-restrictions', <OrthodoxScheduleGuidelinesPage />, ROLE_ALL_CHURCH),
    // Site Map (portal version)
    protectedRoute('site-map', <SiteMapPage />),
  ],
};
