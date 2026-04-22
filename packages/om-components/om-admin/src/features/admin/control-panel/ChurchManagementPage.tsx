/**
 * ChurchManagementPage.tsx — Category landing for Church Management
 */

import {
  Business as ChurchIcon,
  Settings as WizardIcon,
  TableChart as FieldIcon,
  HowToReg as PendingIcon,
  Rocket as OnboardingIcon,
  EventBusy as RestrictionsIcon,
  Map as SiteMapIcon,
} from '@mui/icons-material';
import React from 'react';
import CategoryPage, { CategorySection } from './CategoryPage';

const sections: CategorySection[] = [
  {
    sectionTitle: 'Church Operations',
    tools: [
      { title: 'All Churches', description: 'View and manage all registered churches in the system', href: '/apps/church-management', icon: <ChurchIcon /> },
      { title: 'Church Setup Wizard', description: 'Step-by-step wizard to onboard and configure a new church', href: '/apps/church-management/wizard', icon: <WizardIcon /> },
      { title: 'Sacramental Date Restrictions', description: 'Calendar viewer for Orthodox sacramental date restrictions (baptisms, marriages, funerals)', href: '/admin/control-panel/church-management/sacramental-restrictions', icon: <RestrictionsIcon /> },
    ],
  },
  {
    sectionTitle: 'Member Management',
    tools: [
      { title: 'Church Onboarding Pipeline', description: 'Generate registration tokens, track onboarding stages, and manage church setup progress', href: '/admin/control-panel/church-onboarding', icon: <OnboardingIcon />, chip: 'Phase 3', chipColor: 'primary' as const },
      { title: 'Pending Members', description: 'Review and approve users who registered via church token', href: '/admin/control-panel/pending-members', icon: <PendingIcon />, chip: 'New', chipColor: 'success' as const },
    ],
  },
  {
    sectionTitle: 'Configuration',
    tools: [
      { title: 'Field Mapper', description: 'Configure database field mappings, record settings, and themes per church', href: '/apps/church-management/46/field-mapper', icon: <FieldIcon /> },
      { title: 'Site Map', description: 'Full navigational map of all routes with "You Are Here" indicator', href: '/site-map', icon: <SiteMapIcon /> },
    ],
  },
];

const ChurchManagementPage: React.FC = () => (
  <CategoryPage
    title="Church Management"
    description="Manage churches, setup wizards, field mapping, and provisioning"
    color="#1976d2"
    icon={<ChurchIcon sx={{ fontSize: 40 }} />}
    sections={sections}
  />
);

export default ChurchManagementPage;
