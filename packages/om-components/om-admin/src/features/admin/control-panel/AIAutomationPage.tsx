/**
 * AIAutomationPage.tsx — Category landing for AI & Automation
 */

import {
    Psychology as AIIcon,
    BugReport as LoggerIcon,
    Tune as SpinIcon,
    BuildCircle as BuildIcon,
} from '@mui/icons-material';
import React from 'react';
import CategoryPage, { CategorySection } from './CategoryPage';

const sections: CategorySection[] = [
  {
    sectionTitle: 'AI Tools',
    tools: [
      { title: 'AI Admin Panel', description: 'Central AI configuration, model management, and feature toggles', href: '/admin/ai', icon: <AIIcon /> },
      { title: 'OMAI Ultimate Logger', description: 'Comprehensive logging and debugging for OMAI interactions', href: '/church/omai-logger', icon: <LoggerIcon /> },
      { title: 'OMAI Spin Settings', description: 'Configure OMAI spin parameters and automation behavior', href: '/admin/settings?tab=omai-spin', icon: <SpinIcon /> },
    ],
  },
  {
    sectionTitle: 'Automation',
    tools: [
      { title: 'Code Change Detection & Auto-Builds', description: 'Tracks page content edits, notifies admins, and triggers frontend rebuilds from the web UI', href: '/admin/ai/code-changes', icon: <BuildIcon />, chip: 'New', chipColor: 'warning' },
    ],
  },
];

const AIAutomationPage: React.FC = () => (
  <CategoryPage
    title="AI & Automation"
    description="AI admin panel, OMAI logger, and automation settings"
    color="#f57c00"
    icon={<AIIcon sx={{ fontSize: 40 }} />}
    sections={sections}
  />
);

export default AIAutomationPage;
