/**
 * OMAppSuitePage.tsx — Category landing for OM App Suite
 * Internal productivity tools, analytics, documentation, and learning.
 */

import {
  Assignment as TasksIcon,
  AutoStories as LibraryIcon,
  BarChart as ChartsIcon,
  School as LearnIcon,
  Widgets as SuiteIcon,
} from '@mui/icons-material';
import React from 'react';
import CategoryPage, { CategorySection } from './CategoryPage';

const sections: CategorySection[] = [
  // Productivity section: OM Tasks retired — now on OMAI Operations Hub
  {
    sectionTitle: 'Analytics & Visualization',
    tools: [
      { title: 'OM Charts', description: 'Church sacramental analytics with year-over-year trends, seasonal patterns, and priest breakdowns', href: '/apps/om-charts', icon: <ChartsIcon /> },
    ],
  },
  {
    sectionTitle: 'Knowledge & Documentation',
    tools: [
      { title: 'OM Library', description: 'Auto-indexing documentation system with search, file management, and relationship mapping', href: '/church/om-spec', icon: <LibraryIcon /> },
      { title: 'OMLearn', description: 'Learning hub with tutorials, guides, and FAQs for platform users', href: '/bigbook/omlearn', icon: <LearnIcon />, chip: 'In Progress', chipColor: 'warning' as const },
    ],
  },
];

const OMAppSuitePage: React.FC = () => (
  <CategoryPage
    title="OM App Suite"
    description="Internal productivity tools, analytics, documentation, and learning"
    color="#0277bd"
    icon={<SuiteIcon sx={{ fontSize: 40 }} />}
    sections={sections}
  />
);

export default OMAppSuitePage;
