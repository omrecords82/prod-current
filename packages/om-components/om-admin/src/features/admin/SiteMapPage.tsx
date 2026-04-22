/**
 * SiteMapPage.tsx — Full site navigation map with "You Are Here" indicator
 * Two views: Admin (full site) and Regular User (portal + public pages)
 */

import {
  AccountCircle as ProfileIcon,
  AdminPanelSettings as AdminIcon,
  Article as BlogIcon,
  Assessment as AnalyticsIcon,
  Assignment as TaskIcon,
  AutoStories as BookIcon,
  Build as DevToolsIcon,
  CalendarMonth as CalendarIcon,
  Campaign as OutreachIcon,
  CardMembership as CertIcon,
  Chat as ChatIcon,
  Church as ChurchIcon,
  Code as CodeIcon,
  ContactMail as ContactIcon,
  Dashboard as DashIcon,
  Description as RecordIcon,
  DocumentScanner as OcrIcon,
  Email as EmailIcon,
  ExpandLess,
  ExpandMore,
  Folder as FolderIcon,
  Forum as SocialIcon,
  Help as HelpIcon,
  Home as HomeIcon,
  Image as ImageIcon,
  Inventory as InvoiceIcon,
  Lock as AuthIcon,
  Map as MapIcon,
  MyLocation as HereIcon,
  Notifications as NotifIcon,
  People as PeopleIcon,
  Public as PublicIcon,
  Scanner as ScanIcon,
  School as LearnIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  SmartToy as AIIcon,
  Storage as ServerIcon,
  TableChart as TableIcon,
  ViewKanban as KanbanIcon,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Chip,
  Collapse,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface SiteNode {
  label: string;
  path?: string;
  icon?: React.ReactNode;
  roles?: string[];
  children?: SiteNode[];
  badge?: string;
}

const ADMIN_MAP: SiteNode[] = [
  {
    label: 'Dashboards', icon: <DashIcon />, children: [
      { label: 'Modern Dashboard', path: '/dashboards/modern', icon: <DashIcon /> },
      { label: 'Analytics', path: '/dashboards/analytics', icon: <AnalyticsIcon /> },
      { label: 'Ecommerce', path: '/dashboards/ecommerce', icon: <DashIcon /> },
      { label: 'OrthodoxMetrics', path: '/dashboards/orthodoxmetrics', icon: <DashIcon />, roles: ['admin', 'super_admin'] },
    ],
  },
  {
    label: 'Church Portal', icon: <ChurchIcon />, children: [
      { label: 'Portal Hub', path: '/portal', icon: <HomeIcon /> },
      { label: 'Baptism Records', path: '/portal/records/baptism', icon: <RecordIcon /> },
      { label: 'New Baptism', path: '/portal/records/baptism/new', icon: <RecordIcon /> },
      { label: 'Marriage Records', path: '/portal/records/marriage', icon: <RecordIcon /> },
      { label: 'New Marriage', path: '/portal/records/marriage/new', icon: <RecordIcon /> },
      { label: 'Funeral Records', path: '/portal/records/funeral', icon: <RecordIcon /> },
      { label: 'New Funeral', path: '/portal/records/funeral/new', icon: <RecordIcon /> },
      { label: 'Upload Records', path: '/portal/upload', icon: <ScanIcon /> },
      { label: 'Charts', path: '/portal/charts', icon: <AnalyticsIcon /> },
      { label: 'Certificates', path: '/portal/certificates/generate', icon: <CertIcon /> },
      { label: 'OCR Studio', path: '/portal/ocr', icon: <OcrIcon /> },
      { label: 'OCR Jobs', path: '/portal/ocr/jobs', icon: <OcrIcon /> },
      { label: 'Sacramental Restrictions', path: '/portal/sacramental-restrictions', icon: <CalendarIcon /> },
      { label: 'Profile', path: '/account/profile', icon: <ProfileIcon /> },
      { label: 'User Guide', path: '/portal/guide', icon: <HelpIcon /> },
    ],
  },
  {
    label: 'Records', icon: <RecordIcon />, children: [
      { label: 'Centralized Records', path: '/apps/records/centralized', icon: <RecordIcon /> },
      { label: 'Baptism Records', path: '/apps/records/baptism', icon: <RecordIcon /> },
      { label: 'New Baptism Entry', path: '/apps/records/baptism/new', icon: <RecordIcon /> },
      { label: 'Marriage Records', path: '/apps/records/marriage', icon: <RecordIcon /> },
      { label: 'New Marriage Entry', path: '/apps/records/marriage/new', icon: <RecordIcon /> },
      { label: 'Funeral Records', path: '/apps/records/funeral', icon: <RecordIcon /> },
      { label: 'New Funeral Entry', path: '/apps/records/funeral/new', icon: <RecordIcon /> },
      { label: 'Records Grid', path: '/apps/records-grid', icon: <TableIcon /> },
      { label: 'Records UI', path: '/apps/records-ui', icon: <TableIcon /> },
      { label: 'Dynamic Records', path: '/apps/records/dynamic', icon: <RecordIcon /> },
      { label: 'Records Manager', path: '/apps/records/manager', icon: <RecordIcon /> },
      { label: 'Modern Records Manager', path: '/apps/records/modern-manager', icon: <RecordIcon /> },
      { label: 'Editable Record', path: '/apps/records/editable', icon: <RecordIcon /> },
      { label: 'Upload Records', path: '/apps/upload-records', icon: <ScanIcon />, badge: 'SDLC' },
      { label: 'Certificates', path: '/apps/certificates/generate', icon: <CertIcon /> },
      { label: 'Interactive Report Jobs', path: '/devel-tools/interactive-reports/jobs', icon: <RecordIcon />, badge: 'SDLC' },
    ],
  },
  {
    label: 'Apps', icon: <FolderIcon />, children: [
      { label: 'Contacts', path: '/apps/contacts', icon: <ContactIcon /> },
      { label: 'Email', path: '/apps/email', icon: <EmailIcon /> },
      { label: 'Notes', path: '/apps/notes', icon: <RecordIcon /> },
      { label: 'Tickets', path: '/apps/tickets', icon: <TaskIcon /> },
      { label: 'Image AI', path: '/apps/image-ai', icon: <ImageIcon /> },
      { label: 'Kanban Board', path: '/apps/kanban', icon: <KanbanIcon /> },
      { label: 'Gallery', path: '/apps/gallery', icon: <ImageIcon /> },
      { label: 'Page Image Index', path: '/apps/gallery/page-index', icon: <ImageIcon /> },
      {
        label: 'Invoices', icon: <InvoiceIcon />, children: [
          { label: 'Invoice List', path: '/apps/invoice/list', icon: <InvoiceIcon /> },
          { label: 'Create Invoice', path: '/apps/invoice/create', icon: <InvoiceIcon /> },
        ],
      },
      { label: 'OM Charts', path: '/apps/om-charts', icon: <AnalyticsIcon />, badge: 'SDLC' },
      { label: 'Liturgical Calendar', path: '/apps/liturgical-calendar', icon: <CalendarIcon />, badge: 'Proto' },
    ],
  },
  {
    label: 'Social', icon: <SocialIcon />, children: [
      { label: 'Chat', path: '/social/chat', icon: <ChatIcon /> },
      { label: 'Friends', path: '/social/friends', icon: <PeopleIcon /> },
      { label: 'Notifications', path: '/social/notifications', icon: <NotifIcon /> },
    ],
  },
  {
    label: 'User Profile', icon: <ProfileIcon />, children: [
      { label: 'Profile', path: '/apps/user-profile', icon: <ProfileIcon /> },
      { label: 'Followers', path: '/apps/user-profile/followers', icon: <PeopleIcon /> },
      { label: 'Friends', path: '/apps/user-profile/friends', icon: <PeopleIcon /> },
      { label: 'Gallery', path: '/apps/user-profile/gallery', icon: <ImageIcon /> },
    ],
  },
  {
    label: 'Church Management', icon: <ChurchIcon />, roles: ['admin', 'super_admin'], children: [
      { label: 'Church List', path: '/apps/church-management', icon: <ChurchIcon /> },
      { label: 'Create Church', path: '/apps/church-management/create', icon: <ChurchIcon /> },
      { label: 'Church Setup Wizard', path: '/apps/church-management/wizard', icon: <ChurchIcon />, roles: ['super_admin'] },
      { label: 'Church Admin List', path: '/admin/churches', icon: <ChurchIcon /> },
    ],
  },
  {
    label: 'Admin', icon: <AdminIcon />, roles: ['admin', 'super_admin'], children: [
      { label: 'Admin Home', path: '/admin', icon: <AdminIcon /> },
      // User Management — migrated to OMAI (/omai/ops/users)
      { label: 'Session Management', path: '/admin/sessions', icon: <SecurityIcon /> },
      { label: 'Admin Settings', path: '/admin/settings', icon: <SettingsIcon /> },
      { label: 'Activity Logs', path: '/admin/activity-logs', icon: <RecordIcon /> },
      { label: 'Log Search', path: '/admin/log-search', icon: <RecordIcon /> },
      { label: 'Menu Permissions', path: '/admin/menu-permissions', icon: <SecurityIcon /> },
      { label: 'Menu Management', path: '/admin/menu-management', icon: <SettingsIcon /> },
      { label: 'Blog Admin', path: '/admin/blog-admin', icon: <BlogIcon /> },
      // Tutorials — migrated to OMAI (/omai/ops/tutorials)
      { label: 'Headlines Config', path: '/admin/headlines-config', icon: <BlogIcon /> },
      { label: 'Script Runner', path: '/admin/script-runner', icon: <CodeIcon /> },
      { label: 'AI Admin Panel', path: '/admin/ai', icon: <AIIcon /> },
      { label: 'OrthodoxMetrics Admin', path: '/admin/orthodox-metrics', icon: <DashIcon /> },
      { label: 'Big Book', path: '/admin/bigbook', icon: <BookIcon /> },
      { label: 'OMAI Mobile', path: '/admin/omai/mobile', icon: <AIIcon />, roles: ['super_admin'] },
      { label: 'Ops Reports', path: '/admin/ops', icon: <AnalyticsIcon /> },
      { label: 'Build Console', path: '/admin/build', icon: <DevToolsIcon /> },
      { label: 'Publishing Guide', path: '/admin/publishing-guide', icon: <BookIcon /> },
      { label: 'Site Survey', path: '/admin/tools/survey', icon: <DevToolsIcon />, roles: ['super_admin'] },
    ],
  },
  {
    label: 'Control Panel', icon: <SettingsIcon />, roles: ['super_admin'], children: [
      { label: 'Control Panel Home', path: '/admin/control-panel', icon: <SettingsIcon /> },
      { label: 'Church Management', path: '/admin/control-panel/church-management', icon: <ChurchIcon /> },
      { label: 'Sacramental Restrictions', path: '/admin/control-panel/church-management/sacramental-restrictions', icon: <CalendarIcon /> },
      { label: 'Pending Members', path: '/admin/control-panel/pending-members', icon: <PeopleIcon /> },
      { label: 'Records & OCR', path: '/admin/control-panel/records-ocr', icon: <OcrIcon /> },
      { label: 'CRM & Outreach', path: '/admin/control-panel/crm-outreach', icon: <OutreachIcon /> },
      { label: 'System & Server', path: '/admin/control-panel/system-server', icon: <ServerIcon /> },
      { label: 'AI & Automation', path: '/admin/control-panel/ai-automation', icon: <AIIcon /> },
      { label: 'Feature Lifecycle (SDLC)', path: '/admin/control-panel/sdlc', icon: <CodeIcon /> },
      {
        label: 'System & Server Sub-Pages', icon: <ServerIcon />, children: [
          { label: 'Users & Security', path: '/admin/control-panel/system-server/users-security', icon: <SecurityIcon /> },
          { label: 'Content & Media', path: '/admin/control-panel/system-server/content-media', icon: <ImageIcon /> },
          { label: 'Social & Comms', path: '/admin/control-panel/system-server/social-comms', icon: <SocialIcon /> },
          { label: 'Server & DevOps', path: '/admin/control-panel/system-server/server-devops', icon: <DevToolsIcon /> },
          { label: 'Platform Config', path: '/admin/control-panel/system-server/platform-config', icon: <SettingsIcon /> },
          { label: 'Code Safety System', path: '/admin/control-panel/system-server/code-safety', icon: <SecurityIcon /> },
        ],
      },
    ],
  },
  {
    label: 'Developer Tools', icon: <DevToolsIcon />, roles: ['admin', 'super_admin'], children: [
      { label: 'OMTrace Console', path: '/devel-tools/omtrace', icon: <CodeIcon /> },
      { label: 'Menu Editor', path: '/devel-tools/menu-editor', icon: <SettingsIcon />, roles: ['super_admin'] },
      { label: 'Refactor Console', path: '/devel-tools/refactor-console', icon: <CodeIcon /> },
      { label: 'Basic Refactor', path: '/devel-tools/basic-refactor', icon: <CodeIcon /> },
      { label: 'Button Showcase', path: '/devel-tools/button-showcase', icon: <DevToolsIcon /> },
      { label: 'OM Magic Image', path: '/devel-tools/om-magic-image', icon: <ImageIcon /> },
      { label: 'CRM Page', path: '/devel-tools/crm', icon: <ContactIcon /> },
      { label: 'US Church Map', path: '/devel-tools/us-church-map', icon: <MapIcon /> },
      { label: 'Git Operations', path: '/devel-tools/git-operations', icon: <CodeIcon />, roles: ['super_admin'] },
      // Conversation Log, OM Tasks, Daily Tasks — retired, now on OMAI Operations Hub
      // API Explorer — migrated to OMAI (OMD-1283)
      { label: 'Loading Demo', path: '/apps/devel/loading-demo', icon: <DevToolsIcon /> },
      { label: 'Live Table Builder', path: '/devel-tools/live-table-builder', icon: <TableIcon /> },
      { label: 'Permission Center', path: '/devel-tools/om-permission-center', icon: <SecurityIcon /> },
      { label: 'Build Info', path: '/devel-tools/build-info', icon: <DevToolsIcon /> },
      { label: 'Router Menu Studio', path: '/devel/router-menu-studio', icon: <CodeIcon />, roles: ['super_admin'] },
      { label: 'Dynamic Records Inspector', path: '/devel/dynamic-records', icon: <TableIcon /> },
      { label: 'File Dependencies', path: '/tools/file-deps', icon: <CodeIcon />, roles: ['super_admin'] },
      { label: 'OCR Operations', path: '/devel-tools/ocr-operations', icon: <OcrIcon />, roles: ['super_admin'] },
      { label: 'OCR Batch Manager', path: '/devel-tools/ocr-batch-manager', icon: <OcrIcon />, roles: ['super_admin'] },
    ],
  },
  {
    label: 'OCR Studio', icon: <OcrIcon />, roles: ['admin', 'super_admin'], children: [
      { label: 'OCR Upload', path: '/apps/ocr-upload', icon: <ScanIcon />, badge: 'SDLC' },
      { label: 'OCR Studio', path: '/devel/ocr-studio', icon: <OcrIcon />, badge: 'SDLC' },
      { label: 'OCR Uploader', path: '/records/ocr-uploader', icon: <ScanIcon /> },
      { label: 'OM OCR Studio', path: '/devel/om-ocr-studio', icon: <OcrIcon /> },
      { label: 'OCR Studio Upload', path: '/devel/ocr-studio/upload', icon: <ScanIcon /> },
      { label: 'OCR Setup Wizard', path: '/devel/ocr-setup-wizard', icon: <OcrIcon /> },
      { label: 'OCR Activity Monitor', path: '/devel/ocr-activity-monitor', icon: <AnalyticsIcon />, roles: ['super_admin'] },
      { label: 'OCR Jobs', path: '/devel/ocr-studio/jobs', icon: <OcrIcon />, roles: ['super_admin'] },
      { label: 'Table Extractor', path: '/devel/ocr-studio/table-extractor', icon: <TableIcon />, roles: ['super_admin'] },
      { label: 'Layout Templates', path: '/devel/ocr-studio/layout-templates', icon: <OcrIcon />, roles: ['super_admin'] },
      { label: 'OCR Settings', path: '/devel/ocr-studio/settings', icon: <SettingsIcon /> },
    ],
  },
  // Berry Components section removed — prototypes retired
  {
    label: 'Reference & Documentation', icon: <BookIcon />, roles: ['admin', 'super_admin'], children: [
      { label: 'OM Library / Spec', path: '/church/om-spec', icon: <BookIcon /> },
      { label: 'OMAI Logger', path: '/church/omai-logger', icon: <AIIcon /> },
      { label: 'OMLearn', path: '/bigbook/omlearn', icon: <LearnIcon /> },
      { label: 'User Guide', path: '/help/user-guide', icon: <HelpIcon /> },
    ],
  },
  {
    label: 'Public Pages', icon: <PublicIcon />, children: [
      { label: 'Homepage', path: '/frontend-pages/homepage', icon: <HomeIcon /> },
      { label: 'About', path: '/frontend-pages/about', icon: <PublicIcon /> },
      { label: 'Contact', path: '/frontend-pages/contact', icon: <ContactIcon /> },
      { label: 'Portfolio', path: '/frontend-pages/portfolio', icon: <PublicIcon /> },
      { label: 'Pricing', path: '/frontend-pages/pricing', icon: <PublicIcon /> },
      { label: 'Blog', path: '/frontend-pages/blog', icon: <BlogIcon /> },
      { label: 'FAQ', path: '/frontend-pages/faq', icon: <HelpIcon /> },
      { label: 'OCA Timeline', path: '/frontend-pages/oca-timeline', icon: <PublicIcon /> },
      { label: 'Welcome Message', path: '/frontend-pages/welcome-message', icon: <PublicIcon /> },
      { label: 'Tour', path: '/tour', icon: <PublicIcon /> },
      { label: 'Samples', path: '/samples', icon: <PublicIcon /> },
      { label: 'Gallery', path: '/frontend-pages/gallery', icon: <ImageIcon /> },
      { label: 'Sacramental Restrictions', path: '/frontend-pages/sacramental-restrictions', icon: <CalendarIcon /> },
      { label: 'Tasks Board', path: '/tasks', icon: <TaskIcon /> },
      { label: 'Menu Index', path: '/frontend-pages/menu', icon: <FolderIcon /> },
    ],
  },
  {
    label: 'Auth Pages', icon: <AuthIcon />, children: [
      { label: 'Login', path: '/auth/login', icon: <AuthIcon /> },
      { label: 'Login (v2)', path: '/auth/login2', icon: <AuthIcon /> },
      { label: 'Register', path: '/auth/register', icon: <AuthIcon /> },
      { label: 'Register (v2)', path: '/auth/register2', icon: <AuthIcon /> },
      { label: 'Forgot Password', path: '/auth/forgot-password', icon: <AuthIcon /> },
      { label: 'Two-Step Verification', path: '/auth/two-steps', icon: <SecurityIcon /> },
      { label: 'Coming Soon', path: '/auth/coming-soon', icon: <PublicIcon /> },
    ],
  },
];

const USER_MAP: SiteNode[] = [
  {
    label: 'My Portal', icon: <ChurchIcon />, children: [
      { label: 'Portal Hub', path: '/portal', icon: <HomeIcon /> },
      { label: 'Baptism Records', path: '/portal/records/baptism', icon: <RecordIcon /> },
      { label: 'New Baptism', path: '/portal/records/baptism/new', icon: <RecordIcon /> },
      { label: 'Marriage Records', path: '/portal/records/marriage', icon: <RecordIcon /> },
      { label: 'New Marriage', path: '/portal/records/marriage/new', icon: <RecordIcon /> },
      { label: 'Funeral Records', path: '/portal/records/funeral', icon: <RecordIcon /> },
      { label: 'New Funeral', path: '/portal/records/funeral/new', icon: <RecordIcon /> },
      { label: 'Upload Records', path: '/portal/upload', icon: <ScanIcon /> },
      { label: 'Charts & Analytics', path: '/portal/charts', icon: <AnalyticsIcon /> },
      { label: 'Generate Certificates', path: '/portal/certificates/generate', icon: <CertIcon /> },
      { label: 'OCR Digitization', path: '/portal/ocr', icon: <OcrIcon /> },
      { label: 'OCR Job History', path: '/portal/ocr/jobs', icon: <OcrIcon /> },
      { label: 'Sacramental Restrictions', path: '/portal/sacramental-restrictions', icon: <CalendarIcon /> },
    ],
  },
  {
    label: 'My Account', icon: <ProfileIcon />, children: [
      { label: 'Profile', path: '/account/profile', icon: <ProfileIcon /> },
      { label: 'User Guide', path: '/portal/guide', icon: <HelpIcon /> },
    ],
  },
  {
    label: 'Apps & Tools', icon: <FolderIcon />, children: [
      { label: 'Dashboard', path: '/dashboards/modern', icon: <DashIcon /> },
      { label: 'Contacts', path: '/apps/contacts', icon: <ContactIcon /> },
      { label: 'Email', path: '/apps/email', icon: <EmailIcon /> },
      { label: 'Notes', path: '/apps/notes', icon: <RecordIcon /> },
      { label: 'Tickets', path: '/apps/tickets', icon: <TaskIcon /> },
      { label: 'Kanban Board', path: '/apps/kanban', icon: <KanbanIcon /> },
      { label: 'Gallery', path: '/apps/gallery', icon: <ImageIcon /> },
    ],
  },
  {
    label: 'Social', icon: <SocialIcon />, children: [
      { label: 'Chat', path: '/social/chat', icon: <ChatIcon /> },
      { label: 'Friends', path: '/social/friends', icon: <PeopleIcon /> },
      { label: 'Notifications', path: '/social/notifications', icon: <NotifIcon /> },
    ],
  },
  {
    label: 'Invoices', icon: <InvoiceIcon />, children: [
      { label: 'Invoice List', path: '/apps/invoice/list', icon: <InvoiceIcon /> },
      { label: 'Create Invoice', path: '/apps/invoice/create', icon: <InvoiceIcon /> },
    ],
  },
  {
    label: 'Public Pages', icon: <PublicIcon />, children: [
      { label: 'Homepage', path: '/frontend-pages/homepage', icon: <HomeIcon /> },
      { label: 'About', path: '/frontend-pages/about', icon: <PublicIcon /> },
      { label: 'Contact', path: '/frontend-pages/contact', icon: <ContactIcon /> },
      { label: 'Blog', path: '/frontend-pages/blog', icon: <BlogIcon /> },
      { label: 'FAQ', path: '/frontend-pages/faq', icon: <HelpIcon /> },
      { label: 'Sacramental Restrictions', path: '/frontend-pages/sacramental-restrictions', icon: <CalendarIcon /> },
      { label: 'Tour', path: '/tour', icon: <PublicIcon /> },
    ],
  },
];

// Flatten tree to find which sections contain current path
function findPathInTree(nodes: SiteNode[], path: string): string[] {
  for (const node of nodes) {
    if (node.path && path === node.path) return [node.label];
    if (node.children) {
      const found = findPathInTree(node.children, path);
      if (found.length) return [node.label, ...found];
    }
  }
  return [];
}

const SiteMapNode: React.FC<{
  node: SiteNode;
  currentPath: string;
  depth: number;
  navigate: (path: string) => void;
  expandedSections: Set<string>;
  toggleSection: (label: string) => void;
  pathKey: string;
}> = ({ node, currentPath, depth, navigate, expandedSections, toggleSection, pathKey }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isHere = node.path === currentPath;
  const hasChildren = node.children && node.children.length > 0;
  const uniqueKey = pathKey + '/' + node.label;
  const isExpanded = expandedSections.has(uniqueKey);

  const hereColor = '#1976d2';
  const hoverBg = isDark ? alpha('#fff', 0.04) : alpha('#000', 0.03);

  return (
    <Box>
      <Box
        onClick={() => {
          if (hasChildren) {
            toggleSection(uniqueKey);
          } else if (node.path) {
            navigate(node.path);
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 0.6,
          px: 1.5,
          pl: 1.5 + depth * 2.5,
          cursor: node.path || hasChildren ? 'pointer' : 'default',
          borderRadius: 1,
          transition: 'background 0.1s',
          '&:hover': { bgcolor: hoverBg },
          ...(isHere && {
            bgcolor: alpha(hereColor, isDark ? 0.15 : 0.08),
            borderLeft: `3px solid ${hereColor}`,
            pl: 1.5 + depth * 2.5 - 0.375,
          }),
        }}
      >
        {node.icon && (
          <Box sx={{
            color: isHere ? hereColor : 'text.secondary',
            display: 'flex', alignItems: 'center', flexShrink: 0,
            '& .MuiSvgIcon-root': { fontSize: depth === 0 ? 20 : 18 },
          }}>
            {node.icon}
          </Box>
        )}
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            fontWeight: isHere ? 700 : (depth === 0 ? 600 : 400),
            fontSize: depth === 0 ? '0.88rem' : '0.82rem',
            color: isHere ? hereColor : 'text.primary',
          }}
        >
          {node.label}
        </Typography>
        {isHere && (
          <Chip
            icon={<HereIcon sx={{ fontSize: '14px !important' }} />}
            label="You are here"
            size="small"
            sx={{
              height: 22,
              fontSize: '0.7rem',
              fontWeight: 700,
              bgcolor: alpha(hereColor, 0.12),
              color: hereColor,
              '& .MuiChip-icon': { color: hereColor },
            }}
          />
        )}
        {node.badge && (
          <Chip
            label={node.badge}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.62rem',
              fontWeight: 600,
              bgcolor: alpha('#ff9800', 0.12),
              color: '#ff9800',
            }}
          />
        )}
        {node.roles && (
          <Chip
            label={node.roles.includes('super_admin') && node.roles.length === 1 ? 'SA' : 'Admin'}
            size="small"
            variant="outlined"
            sx={{
              height: 18,
              fontSize: '0.6rem',
              fontWeight: 600,
              borderColor: alpha('#9e9e9e', 0.3),
              color: 'text.disabled',
            }}
          />
        )}
        {node.path && !isHere && (
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem', fontFamily: 'monospace', flexShrink: 0 }}>
            {node.path}
          </Typography>
        )}
        {hasChildren && (
          <Box sx={{ color: 'text.disabled', display: 'flex' }}>
            {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </Box>
        )}
      </Box>
      {hasChildren && (
        <Collapse in={isExpanded}>
          {node.children!.map((child) => (
            <SiteMapNode
              key={child.label + (child.path || '')}
              node={child}
              currentPath={currentPath}
              depth={depth + 1}
              navigate={navigate}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              pathKey={uniqueKey}
            />
          ))}
        </Collapse>
      )}
    </Box>
  );
};

const SiteMapPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const location = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState<'admin' | 'user'>('admin');

  const map = view === 'admin' ? ADMIN_MAP : USER_MAP;
  const currentPath = location.pathname;

  // Auto-expand sections that contain the current path
  const autoExpanded = useMemo(() => {
    const result = new Set<string>();
    function walk(nodes: SiteNode[], prefix: string) {
      for (const node of nodes) {
        const key = prefix + '/' + node.label;
        if (node.path === currentPath) {
          result.add(prefix);
          result.add(key);
        }
        if (node.children) {
          walk(node.children, key);
          // If any child matched, expand this node too
          for (const child of node.children) {
            const childKey = key + '/' + child.label;
            if (result.has(childKey) || result.has(key)) {
              result.add(key);
            }
          }
        }
      }
    }
    walk(map, '');
    return result;
  }, [currentPath, map]);

  const [manualExpanded, setManualExpanded] = useState<Set<string>>(new Set());
  const [manualCollapsed, setManualCollapsed] = useState<Set<string>>(new Set());

  const expandedSections = useMemo(() => {
    const s = new Set(autoExpanded);
    manualExpanded.forEach(k => s.add(k));
    manualCollapsed.forEach(k => s.delete(k));
    return s;
  }, [autoExpanded, manualExpanded, manualCollapsed]);

  const toggleSection = (key: string) => {
    if (expandedSections.has(key)) {
      setManualCollapsed(prev => { const n = new Set(prev); n.add(key); return n; });
      setManualExpanded(prev => { const n = new Set(prev); n.delete(key); return n; });
    } else {
      setManualExpanded(prev => { const n = new Set(prev); n.add(key); return n; });
      setManualCollapsed(prev => { const n = new Set(prev); n.delete(key); return n; });
    }
  };

  const expandAll = () => {
    const all = new Set<string>();
    function walk(nodes: SiteNode[], prefix: string) {
      for (const node of nodes) {
        const key = prefix + '/' + node.label;
        if (node.children) {
          all.add(key);
          walk(node.children, key);
        }
      }
    }
    walk(map, '');
    setManualExpanded(all);
    setManualCollapsed(new Set());
  };

  const collapseAll = () => {
    setManualExpanded(new Set());
    setManualCollapsed(new Set([...autoExpanded]));
  };

  // Count total pages
  const countPages = (nodes: SiteNode[]): number => {
    let c = 0;
    for (const n of nodes) {
      if (n.path) c++;
      if (n.children) c += countPages(n.children);
    }
    return c;
  };
  const totalPages = countPages(map);

  const breadcrumb = findPathInTree(map, currentPath);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 960, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, bgcolor: alpha('#1976d2', isDark ? 0.15 : 0.08), flexShrink: 0 }}>
          <MapIcon sx={{ fontSize: 28, color: '#1976d2' }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h5" fontWeight={700}>Site Map</Typography>
          <Typography variant="body2" color="text.secondary">
            {totalPages} pages &middot; Click any page to navigate
          </Typography>
        </Box>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(_, v) => { if (v) { setView(v); setManualExpanded(new Set()); setManualCollapsed(new Set()); } }}
          size="small"
        >
          <ToggleButton value="admin" sx={{ textTransform: 'none', fontSize: '0.8rem', px: 2 }}>
            <AdminIcon sx={{ fontSize: 18, mr: 0.5 }} /> Admin View
          </ToggleButton>
          <ToggleButton value="user" sx={{ textTransform: 'none', fontSize: '0.8rem', px: 2 }}>
            <ProfileIcon sx={{ fontSize: 18, mr: 0.5 }} /> User View
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* You Are Here breadcrumb */}
      {breadcrumb.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 1.5, mb: 2,
            border: `1px solid ${alpha('#1976d2', 0.3)}`,
            bgcolor: alpha('#1976d2', isDark ? 0.08 : 0.04),
            borderRadius: 2,
            display: 'flex', alignItems: 'center', gap: 1,
          }}
        >
          <HereIcon sx={{ fontSize: 20, color: '#1976d2' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
            You are here:
          </Typography>
          {breadcrumb.map((crumb, i) => (
            <React.Fragment key={crumb}>
              {i > 0 && <Typography variant="body2" color="text.disabled">/</Typography>}
              <Typography variant="body2" sx={{ fontWeight: i === breadcrumb.length - 1 ? 700 : 400 }}>
                {crumb}
              </Typography>
            </React.Fragment>
          ))}
        </Paper>
      )}

      {/* Expand/Collapse controls */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
        <Typography
          variant="caption"
          onClick={expandAll}
          sx={{ cursor: 'pointer', color: '#1976d2', '&:hover': { textDecoration: 'underline' } }}
        >
          Expand All
        </Typography>
        <Typography variant="caption" color="text.disabled">|</Typography>
        <Typography
          variant="caption"
          onClick={collapseAll}
          sx={{ cursor: 'pointer', color: '#1976d2', '&:hover': { textDecoration: 'underline' } }}
        >
          Collapse All
        </Typography>
      </Box>

      {/* Tree */}
      <Paper
        elevation={0}
        sx={{
          border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
          borderRadius: 2,
          overflow: 'hidden',
          py: 1,
        }}
      >
        {map.map((section) => (
          <SiteMapNode
            key={section.label}
            node={section}
            currentPath={currentPath}
            depth={0}
            navigate={navigate}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            pathKey=""
          />
        ))}
      </Paper>

      {/* Legend */}
      <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>Legend:</Typography>
        <Chip icon={<HereIcon sx={{ fontSize: '14px !important' }} />} label="Current page" size="small" sx={{ height: 22, fontSize: '0.7rem', bgcolor: alpha('#1976d2', 0.1), color: '#1976d2', '& .MuiChip-icon': { color: '#1976d2' } }} />
        <Chip label="SA" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.62rem', color: 'text.disabled' }} />
        <Typography variant="caption" color="text.disabled">= Super Admin only</Typography>
        <Chip label="Admin" size="small" variant="outlined" sx={{ height: 18, fontSize: '0.62rem', color: 'text.disabled' }} />
        <Typography variant="caption" color="text.disabled">= Admin role required</Typography>
        <Chip label="SDLC" size="small" sx={{ height: 18, fontSize: '0.62rem', bgcolor: alpha('#ff9800', 0.12), color: '#ff9800' }} />
        <Typography variant="caption" color="text.disabled">= Feature lifecycle gated</Typography>
        <Chip label="Proto" size="small" sx={{ height: 18, fontSize: '0.62rem', bgcolor: alpha('#ff9800', 0.12), color: '#ff9800' }} />
        <Typography variant="caption" color="text.disabled">= Prototype stage</Typography>
      </Box>
    </Box>
  );
};

export default SiteMapPage;
