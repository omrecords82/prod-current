import {
  IconHome,
  IconPoint,
  IconApps,
  IconAppWindow,
} from '@tabler/icons-react';
import { uniqueId } from 'lodash';

const Menuitems = [
  {
    id: uniqueId(),
    title: 'Dashboard',
    icon: IconHome,
    href: '/dashboards/',
    children: [
      {
        id: uniqueId(),
        title: 'Modern',
        icon: IconPoint,
        href: '/dashboards/modern',
        chip: 'New',
        chipColor: 'secondary',
      },
      {
        id: uniqueId(),
        title: 'eCommerce',
        icon: IconPoint,
        href: '/dashboards/ecommerce',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'Frontend pages',
    icon: IconAppWindow,
    href: '/frontend-pages/',
    children: [
      {
        id: uniqueId(),
        title: 'Homepage',
        icon: IconPoint,
        href: '/frontend-pages/homepage',
      },
      {
        id: uniqueId(),
        title: 'About Us',
        icon: IconPoint,
        href: '/frontend-pages/about',
      },
      {
        id: uniqueId(),
        title: 'Blog',
        icon: IconPoint,
        href: '/frontend-pages/blog',
      },
      {
        id: uniqueId(),
        title: 'Blog Details',
        icon: IconPoint,
        href: '/frontend-pages/blog/Blog_1',
      },
      {
        id: uniqueId(),
        title: 'Contact',
        icon: IconPoint,
        href: '/frontend-pages/contact',
      },
      {
        id: uniqueId(),
        title: 'Portfolio',
        icon: IconPoint,
        href: '/frontend-pages/portfolio',
      },
      {
        id: uniqueId(),
        title: 'Pricing',
        icon: IconPoint,
        href: '/frontend-pages/pricing',
      },
    ],
  },
  {
    id: uniqueId(),
    title: 'Apps',
    icon: IconApps,
    href: '/apps/',
    children: [
      {
        id: uniqueId(),
        title: 'Contacts',
        icon: IconPoint,
        href: '/apps/contacts',
      },
      {
        id: uniqueId(),
        title: 'Chats',
        icon: IconPoint,
        href: '/apps/chats',
      },
      {
        id: uniqueId(),
        title: 'Notes',
        icon: IconPoint,
        href: '/apps/notes',
      },
      {
        id: uniqueId(),
        title: 'Email',
        icon: IconPoint,
        href: '/apps/email',
      },
      {
        id: uniqueId(),
        title: 'Tickets',
        icon: IconPoint,
        href: '/apps/tickets',
      },
      {
        id: uniqueId(),
        title: 'Kanban',
        icon: IconPoint,
        href: '/apps/kanban',
      },
      {
        id: uniqueId(),
        title: 'Invoice',
        icon: IconPoint,
        href: '/apps/invoice/',
        children: [
          {
            id: uniqueId(),
            title: 'List',
            icon: IconPoint,
            href: '/apps/invoice/list',
          },
          {
            id: uniqueId(),
            title: 'Create',
            icon: IconPoint,
            href: '/apps/invoice/create',
          },
          {
            id: uniqueId(),
            title: 'Detail',
            icon: IconPoint,
            href: '/apps/invoice/detail/PineappleInc.',
          },
          {
            id: uniqueId(),
            title: 'Edit',
            icon: IconPoint,
            href: '/apps/invoice/edit/PineappleInc.',
          },
        ],
      },
      {
        id: uniqueId(),
        title: 'User Profile',
        icon: IconPoint,
        href: '/user-profile',
        children: [
          {
            id: uniqueId(),
            title: 'Profile',
            icon: IconPoint,
            href: '/user-profile',
          },
          {
            id: uniqueId(),
            title: 'Followers',
            icon: IconPoint,
            href: '/apps/followers',
          },
          {
            id: uniqueId(),
            title: 'Friends',
            icon: IconPoint,
            href: '/apps/friends',
          },
          {
            id: uniqueId(),
            title: 'Gallery',
            icon: IconPoint,
            href: '/apps/gallery',
          },
        ],
      },
      {
        id: uniqueId(),
        title: 'Ecommerce',
        icon: IconPoint,
        href: '/apps/ecommerce/',
        children: [
          {
            id: uniqueId(),
            title: 'Shop',
            icon: IconPoint,
            href: '/apps/ecommerce/shop',
          },
          {
            id: uniqueId(),
            title: 'Detail',
            icon: IconPoint,
            href: '/apps/ecommerce/detail/1',
          },
          {
            id: uniqueId(),
            title: 'List',
            icon: IconPoint,
            href: '/apps/ecommerce/eco-product-list',
          },
          {
            id: uniqueId(),
            title: 'Checkout',
            icon: IconPoint,
            href: '/apps/ecommerce/eco-checkout',
          },
          {
            id: uniqueId(),
            title: 'Add Product',
            icon: IconPoint,
            href: '/apps/ecommerce/add-product',
          },
          {
            id: uniqueId(),
            title: 'Edit Product',
            icon: IconPoint,
            href: '/apps/ecommerce/edit-product',
          },
        ],
      },
      {
        id: uniqueId(),
        title: 'Blog',
        icon: IconPoint,
        href: '/frontend-pages/blog/',
        children: [
          {
            id: uniqueId(),
            title: 'Posts',
            icon: IconPoint,
            href: '/frontend-pages/blog/',
          },
          {
            id: uniqueId(),
            title: 'Detail',
            icon: IconPoint,
            href: '/frontend-pages/blog/detail/streaming-video-way-before-it-was-cool-go-dark-tomorrow',
          },
        ],
      },
    ],
  },






];
export default Menuitems;
