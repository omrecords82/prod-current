import OrthodoxChurchIcon from '@/shared/ui/OrthodoxChurchIcon';
import {
    IconActivity,
    IconBell,
    IconBorderAll,
    IconBug,
    IconChartBar,
    IconClock,
    IconCode,
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
    IconScan,
    IconSettings,
    IconClipboardCheck,
    IconShield,
    IconSitemap,
    IconTerminal,
    IconTool,
    IconUpload,
    IconUser,
    IconUserPlus,
    IconWriting
} from '@tabler/icons-react';
import { uniqueId } from 'lodash';

interface MenuitemsType {
  [x: string]: any;
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: string;
  children?: MenuitemsType[];
  chip?: string;
  chipColor?: string;
  variant?: string;
  external?: boolean;
  /** Key for metadata-driven badge state (NEW / UPDATED). Matches badge_states.item_key. */
  badgeKey?: string;
}

const Menuitems: MenuitemsType[] = [
  // ========================================================================
  // DASHBOARDS
  // ========================================================================
  {
    navlabel: true,
    subheader: '📊 Dashboards',
  },
  {
    id: uniqueId(),
    title: 'Control Panel',
    icon: IconSettings,
    href: '/admin/control-panel',
  },
  {
    id: uniqueId(),
    title: 'OMAI',
    icon: IconRocket,
    href: '/admin/omai',
    chip: 'AI',
    chipColor: 'primary',
  },
  {
    id: uniqueId(),
    title: 'Account Hub',
    icon: IconUser,
    href: '/account/profile',
  },
  {
    id: uniqueId(),
    title: 'Church User Dashboard',
    icon: IconShield,
    href: '/dashboards/modern',
  },
  {
    id: uniqueId(),
    title: 'OM Berryops',
    icon: IconLayoutDashboard,
    href: '/omai/dashboard/default',
    external: true,
  },

  // ========================================================================
  // CHURCH MANAGEMENT (matches Control Panel category 1)
  // ========================================================================
  {
    navlabel: true,
    subheader: '⛪ Church Management',
  },
  {
    id: uniqueId(),
    title: 'Church Management',
    icon: OrthodoxChurchIcon,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'All Churches',
        icon: IconPoint,
        href: '/apps/church-management',
      },
      {
        id: uniqueId(),
        title: 'Church Setup Wizard',
        icon: IconPoint,
        href: '/apps/church-management/wizard',
      },
      {
        id: uniqueId(),
        title: 'Records Branding',
        icon: IconPoint,
        href: '/admin/church-branding/records-landing',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'OM-Spec',
    icon: IconFileDescription,
    href: '/church/om-spec',
  },

  // ========================================================================
  // RECORDS & OCR (matches Control Panel category 2)
  // ========================================================================
  {
    navlabel: true,
    subheader: '📋 Records & OCR',
  },
  {
    id: uniqueId(),
    title: 'Upload Records',
    icon: IconUpload,
    href: '/apps/upload-records',
  },
  {
    id: uniqueId(),
    title: 'Records Systems',
    icon: IconFileDescription,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Church Metric Records',
        icon: IconDatabase,
        href: '/apps/records/baptism',
      },
      {
        id: uniqueId(),
        title: 'Editable Records',
        icon: IconEdit,
        href: '/apps/records/editable',
      },
      {
        id: uniqueId(),
        title: 'Live Table Builder',
        icon: IconBorderAll,
        href: '/devel-tools/live-table-builder',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'OM Charts',
    icon: IconChartBar,
    href: '/apps/om-charts',
    badgeKey: 'om-charts',
  },
  {
    id: uniqueId(),
    title: 'OCR Studio',
    icon: IconFileDescription,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'OCR Studio',
        icon: IconFileDescription,
        href: '/devel/ocr-studio',
      },
      {
        id: uniqueId(),
        title: 'Upload',
        icon: IconFileDescription,
        href: '/devel/ocr-studio/upload',
      },
      {
        id: uniqueId(),
        title: 'Job Monitor',
        icon: IconActivity,
        href: '/devel/ocr-studio/jobs',
      },
      {
        id: uniqueId(),
        title: 'Table Extractor',
        icon: IconBorderAll,
        href: '/devel/ocr-studio/table-extractor',
      },
      {
        id: uniqueId(),
        title: 'Layout Templates',
        icon: IconLayout,
        href: '/devel/ocr-studio/layout-templates',
      },
      {
        id: uniqueId(),
        title: 'Activity Monitor',
        icon: IconActivity,
        href: '/devel/ocr-activity-monitor',
      },
      {
        id: uniqueId(),
        title: 'OCR Settings',
        icon: IconSettings,
        href: '/devel/ocr-studio/settings',
      },
    ],
  },

  // ========================================================================
  // CRM & OUTREACH (matches Control Panel category 3)
  // ========================================================================
  {
    navlabel: true,
    subheader: '📣 Church Operations',
  },
  {
    id: uniqueId(),
    title: 'US Church Map',
    icon: IconPoint,
    href: '/devel-tools/us-church-map',
    badgeKey: 'us-church-map',
  },

  // ========================================================================
  // SYSTEM & SERVER (matches Control Panel category 4)
  // ========================================================================
  {
    navlabel: true,
    subheader: '🖥️ System & Server',
  },
  {
    id: uniqueId(),
    title: 'Site Management',
    icon: IconSettings,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Menu Management',
        icon: IconLayout,
        href: '/admin/menu-management',
      },
      {
        id: uniqueId(),
        title: 'Admin Settings',
        icon: IconSettings,
        href: '/admin/settings',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'Content Management',
    icon: IconFileDescription,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Blog Management',
        icon: IconWriting,
        href: '/admin/blog-admin',
      },
      {
        id: uniqueId(),
        title: 'Notes',
        icon: IconNotes,
        href: '/apps/notes',
      },
      {
        id: uniqueId(),
        title: 'Welcome Message',
        icon: IconMessage,
        href: '/frontend-pages/welcome-message',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'Social Features',
    icon: IconMessage,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Email',
        icon: IconMessage,
        href: '/apps/email',
      },
      {
        id: uniqueId(),
        title: 'Friends',
        icon: IconUserPlus,
        href: '/social/friends',
      },
      {
        id: uniqueId(),
        title: 'Chat',
        icon: IconMessage,
        href: '/social/chat',
      },
      {
        id: uniqueId(),
        title: 'Notifications',
        icon: IconBell,
        href: '/social/notifications',
      },
    ],
  },

  // ========================================================================
  // AI & AUTOMATION (matches Control Panel category 5)
  // ========================================================================
  {
    navlabel: true,
    subheader: '🤖 AI & Automation',
  },
  {
    id: uniqueId(),
    title: 'AI & Automation',
    icon: IconRocket,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'AI Admin Panel',
        icon: IconRocket,
        href: '/admin/ai',
      },
      {
        id: uniqueId(),
        title: 'Code Change Detection',
        icon: IconCode,
        href: '/admin/ai/code-changes',
      },
    ],
  },

  // ========================================================================
  // DEVELOPER TOOLS (super_admin only)
  // ========================================================================
  {
    navlabel: true,
    subheader: '🛠️ Developer Tools',
  },
  {
    id: uniqueId(),
    title: 'Development Console',
    icon: IconTerminal,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Router/Menu Studio',
        icon: IconSitemap,
        href: '/devel/router-menu-studio',
      },
      {
        id: uniqueId(),
        title: 'Menu Editor',
        icon: IconLayout,
        href: '/devel-tools/menu-editor',
      },
      {
        id: uniqueId(),
        title: 'Page Content Editor',
        icon: IconEdit,
        href: '/devel-tools/page-editor',
      },
      {
        id: uniqueId(),
        title: 'Page Edit Audit',
        icon: IconClipboardCheck,
        href: '/devel-tools/page-edit-audit',
      },
      {
        id: uniqueId(),
        title: 'Dynamic Records Inspector',
        icon: IconDatabase,
        href: '/devel/dynamic-records',
      },
      {
        id: uniqueId(),
        title: 'OMTrace Console',
        icon: IconSitemap,
        href: '/devel-tools/omtrace',
      },
      {
        id: uniqueId(),
        title: 'Refactor Console',
        icon: IconTool,
        href: '/devel-tools/refactor-console',
      },
      {
        id: uniqueId(),
        title: 'OM Permission Center',
        icon: IconShield,
        href: '/devel-tools/om-permission-center',
      },
      {
        id: uniqueId(),
        title: 'Interactive Report Jobs',
        icon: IconFileDescription,
        href: '/devel-tools/interactive-reports/jobs',
      },
      {
        id: uniqueId(),
        title: 'Repo Operations',
        icon: IconGitBranch,
        href: '/devel-tools/repo-ops',
      },
      {
        id: uniqueId(),
        title: 'Platform Status',
        icon: IconDatabase,
        href: '/devel-tools/platform-status',
      },
      {
        id: uniqueId(),
        title: 'Badge State Manager',
        icon: IconBell,
        href: '/devel-tools/badge-state-manager',
      },
      {
        id: uniqueId(),
        title: 'OCR Operations',
        icon: IconScan,
        href: '/devel-tools/ocr-operations',
      },
      {
        id: uniqueId(),
        title: 'OCR Batch Manager',
        icon: IconDatabase,
        href: '/devel-tools/ocr-batch-manager',
      },
      {
        id: uniqueId(),
        title: 'Work Session Admin',
        icon: IconClock,
        href: '/devel-tools/work-session-admin',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'Testing & QA',
    icon: IconBug,
    href: '#',
    children: [
      {
        id: uniqueId(),
        title: 'Site Survey',
        icon: IconBug,
        href: '/admin/tools/survey',
      },
    ],
  },
];

export const getMenuItems = (user: any) => {
  const churchId = user?.church_id || 46; // fallback to default church ID
  
  if (user && (user.role === 'super_admin' || user.role === 'admin')) {
    // Create dynamic menu items with church-aware URLs
    let dynamicMenuItems = Menuitems.map(item => {
      if (item.title === 'Records Systems' && item.children) {
        return {
          ...item,
          children: item.children.map(child => {
            switch (child.title) {
              default:
                return child;
            }
          })
        };
      }
      return item;
    });
    
    // Filter out Developer Tools for non-super_admin users
    if (user.role !== 'super_admin') {
      dynamicMenuItems = dynamicMenuItems.filter(item => {
        // Remove Developer Tools section and its items
        if (item.subheader === '🛠️ Developer Tools') return false;
        return true;
      });
    }
    
    return dynamicMenuItems;
  }
  
  // For priest role, show portal-focused menu
  if (user && user.role === 'priest') {
    return [
      {
        navlabel: true,
        subheader: '📊 Dashboards',
      },
      {
        id: uniqueId(),
        title: 'Portal',
        icon: IconLayoutDashboard,
        href: '/portal',
      },
      {
        navlabel: true,
        subheader: '⛪ Church',
      },
      {
        id: uniqueId(),
        title: 'Notes',
        icon: IconNotes,
        href: '/apps/notes',
      },
      {
        id: uniqueId(),
        title: 'Records System',
        icon: IconFileDescription,
        href: '#',
        children: [
          // Modern Enhanced Records
          {
            id: uniqueId(),
            title: 'Records',
            icon: IconRocket,
            href: '/apps/records/baptism',
            badgeKey: 'baptism-records-v2',
          },
          {
            id: uniqueId(),
            title: 'Upload Records',
            icon: IconUpload,
            href: '/apps/upload-records',
          },
        ],
      },
      {
        id: uniqueId(),
        title: 'OM Charts',
        icon: IconChartBar,
        href: '/apps/om-charts',
        badgeKey: 'om-charts',
      },
      {
        navlabel: true,
        subheader: '💬 Social',
      },
      {
        id: uniqueId(),
        title: 'Email',
        icon: IconMessage,
        href: '/apps/email',
      },
      {
        id: uniqueId(),
        title: 'Friends',
        icon: IconUserPlus,
        href: '/social/friends',
      },
      {
        id: uniqueId(),
        title: 'Chat',
        icon: IconMessage,
        href: '/social/chat',
      },
      {
        id: uniqueId(),
        title: 'Notifications',
        icon: IconBell,
        href: '/social/notifications',
      },
    ];
  }

  // For other non-admin users, show simplified menu with basic functionality
  return [
    {
      navlabel: true,
      subheader: '📊 Dashboards',
    },
    {
      id: uniqueId(),
      title: 'Enhanced Modern Dashboard',
      icon: IconLayoutDashboard,
      href: '/dashboards/modern',
    },
    {
      navlabel: true,
      subheader: '⛪ Church',
    },
    {
      id: uniqueId(),
      title: 'Notes',
      icon: IconNotes,
      href: '/apps/notes',
    },
    {
      id: uniqueId(),
      title: 'Records System',
      icon: IconFileDescription,
      href: '#',
      children: [
        {
          id: uniqueId(),
          title: 'Records',
          icon: IconRocket,
          href: '/apps/records/baptism',
          badgeKey: 'baptism-records-v2',
        },
        {
          id: uniqueId(),
          title: 'OCR Uploads',
          icon: IconFileDescription,
          href: `/devel/ocr-studio/upload`,
        },
      ],
    },
    {
      id: uniqueId(),
      title: 'OM Charts',
      icon: IconChartBar,
      href: '/apps/om-charts',
    },
    {
      navlabel: true,
      subheader: '💬 Social',
    },
    {
      id: uniqueId(),
      title: 'Email',
      icon: IconMessage,
      href: '/apps/email',
    },
    {
      id: uniqueId(),
      title: 'Friends',
      icon: IconUserPlus,
      href: '/social/friends',
    },
    {
      id: uniqueId(),
      title: 'Chat',
      icon: IconMessage,
      href: '/social/chat',
    },
    {
      id: uniqueId(),
      title: 'Notifications',
      icon: IconBell,
      href: '/social/notifications',
    },
  ];
};

export default Menuitems;
