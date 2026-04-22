/**
 * RecordsOCRPage.tsx — Category landing for Records & OCR
 */

import {
    Search as InspectorIcon,
    Work as JobsIcon,
    DocumentScanner as OCRIcon,
    Description as RecordsIcon,
    Assessment as ReportsIcon,
    Settings as SettingsIcon,
    TableChart as TableIcon,
    Upload as UploadIcon,
} from '@mui/icons-material';
import React from 'react';
import CategoryPage, { CategorySection } from './CategoryPage';

const sections: CategorySection[] = [
  {
    sectionTitle: 'Records',
    tools: [
      { title: 'Church Metric Records', description: 'Baptism, marriage, and funeral records management with search and autocomplete', href: '/apps/records/baptism', icon: <RecordsIcon /> },
      { title: 'Dynamic Records Inspector', description: 'Inspect and debug dynamic record configurations', href: '/devel/dynamic-records', icon: <InspectorIcon /> },
      { title: 'Live Table Builder', description: 'Build and test table layouts with live data preview', href: '/devel-tools/live-table-builder', icon: <TableIcon /> },
      { title: 'Interactive Report Jobs', description: 'Generate and manage interactive data reports', href: '/devel-tools/interactive-reports/jobs', icon: <ReportsIcon /> },
    ],
  },
  {
    sectionTitle: 'OCR Studio',
    tools: [
      { title: 'OCR Hub', description: 'Central OCR dashboard with access to all OCR tools', href: '/devel/ocr-studio', icon: <OCRIcon /> },
      { title: 'Upload Documents', description: 'Upload and process documents through OCR pipeline', href: '/devel/ocr-studio/upload', icon: <UploadIcon /> },
      { title: 'Job History', description: 'View OCR processing jobs, status, and results', href: '/devel/ocr-studio/jobs', icon: <JobsIcon /> },
      { title: 'Table Extractor', description: 'Extract structured table data from OCR results', href: '/devel/ocr-studio/table-extractor', icon: <TableIcon /> },
      { title: 'OCR Settings', description: 'Configure OCR processing parameters and extraction rules', href: '/devel/ocr-studio/settings', icon: <SettingsIcon /> },
    ],
  },
];

const RecordsOCRPage: React.FC = () => (
  <CategoryPage
    title="Records & OCR"
    description="Church metric records, OCR document processing, data tools, and reports"
    color="#388e3c"
    icon={<RecordsIcon sx={{ fontSize: 40 }} />}
    sections={sections}
  />
);

export default RecordsOCRPage;
