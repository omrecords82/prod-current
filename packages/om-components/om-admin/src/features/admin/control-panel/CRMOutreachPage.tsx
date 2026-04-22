/**
 * CRMOutreachPage.tsx — Category landing for CRM & Outreach
 */

import {
  Campaign as OutreachIcon,
  Map as MapIcon,
  People as CRMIcon,
  School as TutorialIcon,
} from '@mui/icons-material';
import React from 'react';
import CategoryPage, { CategorySection } from './CategoryPage';

const sections: CategorySection[] = [
  {
    sectionTitle: 'Customer Relationship Management',
    tools: [
      { title: 'CRM Dashboard', description: 'Full CRM with pipeline, contacts, activities, follow-ups, and provisioning', href: '/devel-tools/crm', icon: <CRMIcon /> },
      { title: 'US Church Map', description: 'Interactive choropleth map of Orthodox churches with state-level drill-down', href: '/devel-tools/us-church-map', icon: <MapIcon /> },
    ],
  },
  {
    sectionTitle: 'Tutorials & Onboarding',
    tools: [
      { title: 'Tutorial Management', description: 'Create and manage welcome popups and multi-step tutorials for different audiences', href: '/admin/tutorials', icon: <TutorialIcon /> },
    ],
  },
];

const CRMOutreachPage: React.FC = () => (
  <CategoryPage
    title="CRM & Outreach"
    description="Customer relationship management, US church map, and sales pipeline"
    color="#7b1fa2"
    icon={<OutreachIcon sx={{ fontSize: 40 }} />}
    sections={sections}
  />
);

export default CRMOutreachPage;
