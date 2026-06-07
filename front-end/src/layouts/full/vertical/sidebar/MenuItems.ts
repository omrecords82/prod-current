import {
    IconBell,
    IconChartBar,
    IconFileDescription,
    IconLayoutDashboard,
    IconMessage,
    IconNotes,
    IconRocket,
    IconUpload,
    IconUser,
    IconUserPlus
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
    title: 'Account Hub',
    icon: IconUser,
    href: '/account/profile',
  },
  {
    id: uniqueId(),
    title: 'Studio Hub',
    icon: IconFileDescription,
    href: '/devel/ocr-studio',
  },
  {
    id: uniqueId(),
    title: 'OM Berryops',
    icon: IconLayoutDashboard,
    href: '/omai/dashboard/default',
    external: true,
  },
];

export const getMenuItems = (user: any) => {
  if (user && (user.role === 'super_admin' || user.role === 'admin')) {
    return Menuitems;
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
