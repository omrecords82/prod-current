/**
 * Default Super Admin Menu Template
 * 
 * This file defines the canonical super_admin menu structure that can be seeded
 * into the database via the Menu Editor's template system.
 * 
 * IMPORTANT:
 * - IDs are STABLE (namespace.slug format, not uniqueId())
 * - Icons are component references (will be converted to strings by transformer)
 * - This template is for super_admin role only
 * - Parent items use href: "#"
 * - Section headers (navlabel) are skipped during transformation
 */

import OrthodoxChurchIcon from '@/shared/ui/OrthodoxChurchIcon';
import {
    IconActivity,
    IconBell,
    IconBorderAll,
    IconBug,
    IconComponents,
    IconDatabase,
    IconEdit,
    IconFileDescription,
    IconGitBranch,
    IconLayout,
    IconLayoutDashboard,
    IconMessage,
    IconNotes,
    IconPalette,
    IconPoint,
    IconRocket,
    IconSettings,
    IconClipboardCheck,
    IconShield,
    IconSitemap,
    IconTerminal,
    IconTool,
    IconUserPlus,
    IconUsers,
    IconWriting
} from '@tabler/icons-react';

export interface MenuTemplateItem {
  id: string;                     // Stable identifier (namespace.slug)
  navlabel?: boolean;             // Section header flag
  subheader?: string;             // Section header text
  title?: string;                 // Menu item title
  icon?: any;                     // React component
  href?: string;                  // Route path or "#" for parents
  children?: MenuTemplateItem[];  // Nested items
  chip?: string;                  // Badge text
  chipColor?: string;             // Badge color
  variant?: string;
  external?: boolean;
}

/**
 * Default Super Admin Menu Template
 * 
 * Namespace conventions:
 * - dashboards.*  = Dashboard items
 * - admin.*       = Admin/site management
 * - church.*      = Church-related features
 * - devel.*       = Developer tools
 * - social.*      = Social features
 * - testing.*     = Testing/QA tools
 * - broken.*      = Broken links (temporary)
 */
export const SuperAdminMenuTemplate: MenuTemplateItem[] = [
  // ========================================================================
  // DASHBOARDS SECTION
  // ========================================================================
  {
    id: 'section.dashboards',
    navlabel: true,
    subheader: '📊 Dashboards',
  },
  {
    id: 'dashboards.control-panel',
    title: 'Control Panel',
    icon: IconLayoutDashboard,
    href: '/admin/control-panel',
  },
  {
    id: 'dashboards.admin',
    title: 'Admin Dashboard',
    icon: IconShield,
    href: '/dashboards/orthodmetrics',
  },

  // ========================================================================
  // SITE CONFIG SECTION
  // ========================================================================
  {
    id: 'section.site-config',
    navlabel: true,
    subheader: '⚙️ Site Config',
  },
  {
    id: 'admin.control-panel',
    title: 'Control Panel',
    icon: IconSettings,
    href: '/admin/control-panel',
  },
  {
    id: 'admin.site-management',
    title: 'Site Management',
    icon: IconSettings,
    href: '#',
    children: [
      {
        id: 'admin.menu-management',
        title: 'Menu Management',
        icon: IconLayout,
        href: '/admin/menu-management',
      },
    ],
  },
  {
    id: 'admin.content-management',
    title: 'Content Management',
    icon: IconFileDescription,
    href: '#',
    children: [
      {
        id: 'admin.blog',
        title: 'Blog Management',
        icon: IconWriting,
        href: '/admin/blog-admin',
      },
      {
        id: 'admin.notes',
        title: 'Notes',
        icon: IconNotes,
        href: '/apps/notes',
      },
      {
        id: 'admin.welcome-message',
        title: 'Welcome Message',
        icon: IconMessage,
        href: '/frontend-pages/welcome-message',
      },
    ],
  },
  {
    id: 'social.features',
    title: 'Social Features',
    icon: IconMessage,
    href: '#',
    children: [
      {
        id: 'social.email',
        title: 'Email',
        icon: IconMessage,
        href: '/apps/email',
      },
      {
        id: 'social.friends',
        title: 'Friends',
        icon: IconUserPlus,
        href: '/social/friends',
      },
      {
        id: 'social.chat',
        title: 'Chat',
        icon: IconMessage,
        href: '/social/chat',
      },
      {
        id: 'social.notifications',
        title: 'Notifications',
        icon: IconBell,
        href: '/social/notifications',
      },
    ],
  },

  // ========================================================================
  // CHURCH SECTION
  // ========================================================================
  {
    id: 'section.church',
    navlabel: true,
    subheader: '⛪ Church',
  },
  {
    id: 'church.management',
    title: 'Church Management',
    icon: OrthodoxChurchIcon,
    href: '#',
    children: [
      {
        id: 'church.all-churches',
        title: 'All Churches',
        icon: IconPoint,
        href: '/apps/church-management',
      },
      {
        id: 'church.setup-wizard',
        title: 'Church Setup Wizard',
        icon: IconPoint,
        href: '/apps/church-management/wizard',
      },
    ],
  },
  {
    id: 'church.records-systems',
    title: 'Records Systems',
    icon: IconFileDescription,
    href: '#',
    children: [
      {
        id: 'church.records-baptism',
        title: 'Church Metric Records',
        icon: IconDatabase,
        href: '/apps/records/baptism',
      },
      {
        id: 'church.records-manager',
        title: 'Dynamic Records Manager',
        icon: IconDatabase,
        href: '/apps/records/manager',
        chip: 'NEW',
        chipColor: 'primary',
      },
      {
        id: 'church.records-modern',
        title: 'Modern Records Manager',
        icon: IconRocket,
        href: '/apps/records/modern-manager',
        chip: 'NEW',
        chipColor: 'secondary',
      },
      {
        id: 'church.records-editable',
        title: 'Editable Records',
        icon: IconEdit,
        href: '/apps/records/editable',
      },
      {
        id: 'church.ocr-uploader',
        title: 'OCR Enhanced Uploader',
        icon: IconFileDescription,
        href: '/devel/enhanced-ocr-uploader',
      },
    ],
  },
  {
    id: 'church.gallery',
    title: 'Gallery',
    icon: IconPalette,
    href: '/apps/gallery',
  },
  {
    id: 'church.om-spec',
    title: 'OM-Spec',
    icon: IconFileDescription,
    href: '/church/om-spec',
  },
  {
    id: 'church.omai-logger',
    title: 'OMAI Ultimate Logger',
    icon: IconBug,
    href: '/church/omai-logger',
  },

  // ========================================================================
  // DEVELOPER TOOLS SECTION
  // ========================================================================
  {
    id: 'section.devel-tools',
    navlabel: true,
    subheader: '🛠️ Developer Tools',
  },
  {
    id: 'devel.om-spec',
    title: 'OM Spec / Tasks',
    icon: IconFileDescription,
    href: '/church/om-spec',
  },
  {
    id: 'devel.console',
    title: 'Development Console',
    icon: IconTerminal,
    href: '#',
    children: [
      {
        id: 'devel.router-menu-studio',
        title: 'Router/Menu Studio',
        icon: IconSitemap,
        href: '/devel/router-menu-studio',
      },
      {
        id: 'devel.menu-editor',
        title: 'Menu Editor',
        icon: IconLayout,
        href: '/devel-tools/menu-editor',
      },
      {
        id: 'devel.dynamic-records-inspector',
        title: 'Dynamic Records Inspector',
        icon: IconDatabase,
        href: '/devel/dynamic-records',
      },
      {
        id: 'devel.omtrace',
        title: 'OMTrace Console',
        icon: IconSitemap,
        href: '/devel-tools/omtrace',
      },
      {
        id: 'devel.refactor-console',
        title: 'Refactor Console',
        icon: IconTool,
        href: '/devel-tools/refactor-console',
      },
      {
        id: 'devel.page-edit-audit',
        title: 'Page Edit Audit',
        icon: IconClipboardCheck,
        href: '/devel-tools/page-edit-audit',
      },
      {
        id: 'devel.live-table-builder',
        title: 'Live Table Builder',
        icon: IconBorderAll,
        href: '/devel-tools/live-table-builder',
      },
      {
        id: 'devel.loading-demo',
        title: 'Loading Demo',
        icon: IconComponents,
        href: '/apps/devel/loading-demo',
      },
      {
        id: 'devel.ocr-studio',
        title: 'OCR Studio',
        icon: IconFileDescription,
        href: '/devel/ocr-studio',
      },
      {
        id: 'devel.ocr-setup-wizard',
        title: 'OCR Setup Wizard',
        icon: IconSettings,
        href: '/devel/ocr-setup-wizard',
      },
      {
        id: 'devel.ocr-uploader',
        title: 'Enhanced OCR Uploader',
        icon: IconFileDescription,
        href: '/devel/enhanced-ocr-uploader',
      },
      {
        id: 'devel.ocr-settings',
        title: 'OCR Settings',
        icon: IconFileDescription,
        href: '/devel/ocr-settings',
      },
      {
        id: 'devel.permission-center',
        title: 'OM Permission Center',
        icon: IconShield,
        href: '/devel-tools/om-permission-center',
      },
      {
        id: 'devel.interactive-reports',
        title: 'Interactive Report Jobs',
        icon: IconFileDescription,
        href: '/devel-tools/interactive-reports/jobs',
      },
      {
        id: 'devel.build-info',
        title: 'Build Info',
        icon: IconGitBranch,
        href: '/devel-tools/build-info',
      },
      {
        id: 'devel.component-library',
        title: 'Component Library',
        icon: IconBorderAll,
        href: '/sandbox/component-library',
      },
      {
        id: 'devel.core-components',
        title: 'Core Components',
        icon: IconComponents,
        href: '/sandbox/component-preview/core',
      },
      {
        id: 'devel.orthodoxmetrics-components',
        title: 'Orthodox Metrics Components',
        icon: IconLayoutDashboard,
        href: '/sandbox/component-preview/modernize',
      },
    ],
  },
  {
    id: 'devel.ai-automation',
    title: 'AI & Automation',
    icon: IconRocket,
    href: '#',
    children: [
      {
        id: 'devel.omai-lab',
        title: 'OMAI Lab',
        icon: IconRocket,
        href: '/sandbox/ai-lab',
      },
      {
        id: 'devel.project-generator',
        title: 'Project Generator',
        icon: IconEdit,
        href: '/sandbox/project-generator',
      },
      {
        id: 'devel.ai-admin',
        title: 'AI Admin Panel',
        icon: IconRocket,
        href: '/admin/ai',
      },
    ],
  },
  {
    id: 'devel.testing',
    title: 'Testing & QA',
    icon: IconBug,
    href: '#',
    children: [
      {
        id: 'testing.site-survey',
        title: 'Site Survey',
        icon: IconBug,
        href: '/admin/tools/survey',
      },
    ],
  },

  // ========================================================================
  // BROKEN LINKS SECTION (Temporary - for tracking)
  // ========================================================================
  {
    id: 'section.broken-links',
    navlabel: true,
    subheader: '🔗 Broken Links',
  },
  {
    id: 'broken.links',
    title: 'Broken Links',
    icon: IconBug,
    href: '#',
    children: [
      {
        id: 'broken.user-profile',
        title: 'User Profile',
        icon: IconUsers,
        href: '/user-profile',
      },
      {
        id: 'broken.gallery',
        title: 'Gallery',
        icon: IconPoint,
        href: '/apps/gallery',
      },
      {
        id: 'broken.permission-center',
        title: 'OM Permission Center',
        icon: IconShield,
        href: '/devel-tools/om-permission-center',
      },
      {
        id: 'broken.admin-settings',
        title: 'Admin Settings',
        icon: IconSettings,
        href: '/admin/settings',
      },
      {
        id: 'broken.task-assignment',
        title: 'Task Assignment',
        icon: IconEdit,
        href: '/admin/settings',
      },
    ],
  },
];

/**
 * Template Metadata
 */
export const SuperAdminMenuMetadata = {
  id: 'default-superadmins',
  name: 'Default Super Admin Menu',
  description: 'Standard menu for super_admin role with all tools and features',
  role: 'super_admin',
  version: '1.0.0',
  createdAt: '2026-02-07',
  author: 'system',
};

export default SuperAdminMenuTemplate;
