/**
 * AdminControlPanel.tsx
 * Windows Control Panel-style admin hub for super_admin users.
 * Located at /admin/control-panel
 *
 * Includes platform status widget + category tiles
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { DEPRECATION_REGISTRY } from '@/config/deprecationRegistry';
import { FEATURE_REGISTRY } from '@/config/featureRegistry';
import PageContainer from '@/shared/ui/PageContainer';
import {
    Psychology as AIIcon,
    Business as ChurchIcon,
    Description as RecordsIcon,
    Dns as ServerIcon,
    Widgets as SuiteIcon,
    Code as DevIcon,
    FolderOff as DeprecatedIcon,
    NotificationsActive as OverdueIcon,
    Today as TodayIcon,
    TrendingUp as PipelineIcon,
} from '@mui/icons-material';
import {
    Storage as DbIcon,
    CheckCircle as HealthyIcon,
    Warning as WarnIcon,
    Error as ErrorIcon,
} from '@mui/icons-material';
import {
    alpha,
    Box,
    Chip,
    LinearProgress,
    Skeleton,
    Tooltip,
    useTheme,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/api/utils/axiosInstance';

// ─── Category definitions ────────────────────────────────────────

interface QuickLink {
  label: string;
  href: string;
}

interface Category {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgLight: string;
  bgDark: string;
  href: string;
  quickLinks: QuickLink[];
}

const CATEGORIES: Category[] = [
  {
    key: 'church',
    title: 'Church Management',
    description: 'Manage churches, setup wizards, field mapping, and provisioning',
    icon: <ChurchIcon sx={{ fontSize: 28 }} />,
    color: '#1976d2',
    bgLight: 'rgba(25, 118, 210, 0.08)',
    bgDark: 'rgba(25, 118, 210, 0.15)',
    href: '/admin/control-panel/church-management',
    quickLinks: [
      { label: 'All Churches', href: '/apps/church-management' },
      { label: 'Jurisdictions', href: '/admin/control-panel/jurisdictions' },
      { label: 'Demo Churches', href: '/admin/control-panel/demo-churches' },
      { label: 'Sacramental Restrictions', href: '/admin/control-panel/church-management/sacramental-restrictions' },
    ],
  },
  {
    key: 'records',
    title: 'Records & OCR',
    description: 'Church metric records, OCR document processing, data tools, and reports',
    icon: <RecordsIcon sx={{ fontSize: 28 }} />,
    color: '#388e3c',
    bgLight: 'rgba(56, 142, 60, 0.08)',
    bgDark: 'rgba(56, 142, 60, 0.15)',
    href: '/admin/control-panel/records-ocr',
    quickLinks: [
      { label: 'Church Metric Records', href: '/apps/records/baptism' },
      { label: 'Certificate Templates', href: '/admin/control-panel/certificate-templates' },
      { label: 'OCR Studio', href: '/devel/ocr-studio' },
      { label: 'Live Table Builder', href: '/devel-tools/live-table-builder' },
    ],
  },
  // CRM & Outreach — migrated to OMAI
  {
    key: 'system',
    title: 'System & Server',
    description: 'Users, security, content, server diagnostics, monitoring, and social features',
    icon: <ServerIcon sx={{ fontSize: 28 }} />,
    color: '#d32f2f',
    bgLight: 'rgba(211, 47, 47, 0.08)',
    bgDark: 'rgba(211, 47, 47, 0.15)',
    href: '/admin/control-panel/system-server',
    quickLinks: [
      // User Management — migrated to OMAI (/omai/ops/users)
      { label: 'Code Safety System', href: '/admin/control-panel/system-server/code-safety' },
      { label: 'Site Map', href: '/site-map' },
      // API Explorer — migrated to OMAI (OMD-1283)
    ],
  },
  {
    key: 'ai',
    title: 'AI & Automation',
    description: 'AI admin panel, OMAI logger, and automation settings',
    icon: <AIIcon sx={{ fontSize: 28 }} />,
    color: '#f57c00',
    bgLight: 'rgba(245, 124, 0, 0.08)',
    bgDark: 'rgba(245, 124, 0, 0.15)',
    href: '/admin/control-panel/ai-automation',
    quickLinks: [
      { label: 'AI Admin Panel', href: '/admin/ai' },
      { label: 'OMAI Logger', href: '/church/omai-logger' },
    ],
  },
  {
    key: 'suite',
    title: 'OM App Suite',
    description: 'Internal productivity tools, analytics, documentation, and learning',
    icon: <SuiteIcon sx={{ fontSize: 28 }} />,
    color: '#0277bd',
    bgLight: 'rgba(2, 119, 189, 0.08)',
    bgDark: 'rgba(2, 119, 189, 0.15)',
    href: '/admin/control-panel/om-app-suite',
    quickLinks: [
      { label: 'OM Charts', href: '/apps/om-charts' },
      { label: 'OM Library', href: '/church/om-spec' },
    ],
  },
  {
    key: 'dev-components',
    title: 'Components In Development',
    description: `${FEATURE_REGISTRY.filter(f => f.stage >= 1 && f.stage <= 4).length} features progressing through the SDLC pipeline (stages 1-4)`,
    icon: <DevIcon sx={{ fontSize: 28 }} />,
    color: '#7b1fa2',
    bgLight: 'rgba(123, 31, 162, 0.08)',
    bgDark: 'rgba(123, 31, 162, 0.15)',
    href: '/admin/control-panel/components-in-development',
    quickLinks: [
      { label: 'Overview (All Stages)', href: '/admin/control-panel/components-in-development' },
      { label: 'Stabilizing (Stage 4)', href: '/admin/control-panel/components-in-development?stage=4' },
      { label: 'Review (Stage 3)', href: '/admin/control-panel/components-in-development?stage=3' },
      { label: 'Development (Stage 2)', href: '/admin/control-panel/components-in-development?stage=2' },
      { label: 'Prototype (Stage 1)', href: '/admin/control-panel/components-in-development?stage=1' },
    ],
  },
  {
    key: 'deprecated-components',
    title: 'Deprecated Components',
    description: `${DEPRECATION_REGISTRY.length} components tracked through the deprecation pipeline`,
    icon: <DeprecatedIcon sx={{ fontSize: 28 }} />,
    color: '#c62828',
    bgLight: 'rgba(198, 40, 40, 0.08)',
    bgDark: 'rgba(198, 40, 40, 0.15)',
    href: '/admin/control-panel/deprecated-components',
    quickLinks: [
      { label: 'Overview (All Stages)', href: '/admin/control-panel/deprecated-components' },
      { label: 'Deprecated', href: '/admin/control-panel/deprecated-components?stage=1' },
      { label: 'Quarantined', href: '/admin/control-panel/deprecated-components?stage=2' },
      { label: 'Verified', href: '/admin/control-panel/deprecated-components?stage=3' },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────

/* ─── Platform Status Widget ─────────────────────────────────── */

interface PlatformWidgetService {
  status: string;
  label: string;
  service_name: string;
  uptime: string | null;
}

interface PlatformWidgetSystem {
  cpu_usage_pct: number;
  memory_used_pct: number;
  disk_usage_pct: number;
}

interface PlatformWidgetData {
  status: string;
  overall_status?: 'ok' | 'warn' | 'error';
  alerts?: { metric: string; severity: 'warn' | 'error'; message: string }[];
  database: {
    status: string;
    connections: number;
    max_connections: number;
    latency_ms: number;
    disk_usage_pct: number;
    disk_used: string;
    disk_total: string;
    last_backup_age_hours: number;
    buffer_pool_used_pct: number;
  } | null;
  services?: Record<string, PlatformWidgetService>;
  system?: PlatformWidgetSystem | null;
}

const chipSx = { fontWeight: 500, fontSize: '0.72rem', height: 24, cursor: 'pointer', fontFamily: 'monospace' };

const PlatformStatusWidget: React.FC<{ isDark: boolean; navigate: ReturnType<typeof useNavigate> }> = ({ isDark, navigate }) => {
  const [data, setData] = useState<PlatformWidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiClient.get<PlatformWidgetData>('/platform/status')
      .then((r) => setData(r))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="om-admin-card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <DbIcon sx={{ fontSize: 20, color: '#546e7a' }} />
        <Skeleton width={120} height={20} />
        <Skeleton width={80} height={20} />
        <Skeleton width={100} height={20} />
      </div>
    </div>
  );

  if (error || (!data?.database && !data?.services)) return (
    <div
      className="om-admin-card"
      onClick={() => navigate('/devel-tools/platform-status')}
      style={{ marginBottom: '1.5rem', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <DbIcon sx={{ fontSize: 20, color: '#f44336' }} />
        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f44336' }}>Platform Status</span>
        <Chip label="Unreachable" size="small" sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22, bgcolor: alpha('#f44336', isDark ? 0.2 : 0.1), color: '#f44336' }} />
      </div>
    </div>
  );

  const db = data!.database;
  const services = data!.services;
  const system = data!.system;
  const severity: 'ok' | 'warn' | 'error' = data!.overall_status || 'ok';
  const sevColor = severity === 'error' ? '#f44336' : severity === 'warn' ? '#ff9800' : '#4caf50';
  const SevIcon = severity === 'error' ? ErrorIcon : severity === 'warn' ? WarnIcon : HealthyIcon;

  const svcList = services ? Object.values(services) : [];
  const svcOk = svcList.filter(s => s.status === 'ok').length;
  const svcDown = svcList.filter(s => s.status !== 'ok' && s.status !== 'starting');

  return (
    <div
      className="om-admin-card"
      onClick={() => navigate('/devel-tools/platform-status')}
      style={{ marginBottom: '1.5rem', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Overall status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SevIcon sx={{ fontSize: 18, color: sevColor }} />
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Platform</span>
          <Chip
            label={severity === 'ok' ? 'Healthy' : severity === 'warn' ? 'Warning' : 'Critical'}
            size="small"
            sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22, bgcolor: alpha(sevColor, isDark ? 0.2 : 0.1), color: sevColor, border: `1px solid ${alpha(sevColor, 0.3)}` }}
          />
        </div>

        {/* Metrics chips */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
          {/* Services summary */}
          {svcList.length > 0 && (
            <Tooltip title={svcDown.length > 0 ? `Down: ${svcDown.map(s => s.label).join(', ')}` : 'All services running'}>
              <Chip
                label={`${svcOk}/${svcList.length} svc`}
                size="small" variant="outlined"
                sx={{
                  ...chipSx,
                  ...(svcDown.length > 0 ? { borderColor: '#f44336', color: '#f44336' } : {}),
                }}
              />
            </Tooltip>
          )}

          {/* DB metrics */}
          {db && (
            <>
              <Tooltip title={`DB: ${db.connections}/${db.max_connections} connections`}>
                <Chip label={`DB ${db.latency_ms}ms`} size="small" variant="outlined" sx={chipSx} />
              </Tooltip>
              <Tooltip title={`DB Disk: ${db.disk_used} / ${db.disk_total}`}>
                <Chip label={`DB Disk ${db.disk_usage_pct}%`} size="small" variant="outlined" sx={chipSx} />
              </Tooltip>
              <Tooltip title="Last backup age">
                <Chip
                  label={db.last_backup_age_hours >= 0 ? `Backup ${db.last_backup_age_hours}h` : 'No backup'}
                  size="small" variant="outlined"
                  sx={{
                    ...chipSx,
                    ...(db.last_backup_age_hours > 12 ? { borderColor: '#ff9800', color: '#ff9800' } : {}),
                    ...(db.last_backup_age_hours > 24 || db.last_backup_age_hours < 0 ? { borderColor: '#f44336', color: '#f44336' } : {}),
                  }}
                />
              </Tooltip>
            </>
          )}

          {/* System metrics */}
          {system && (
            <>
              <Tooltip title={`App VM CPU: ${system.cpu_usage_pct}%`}>
                <Chip
                  label={`CPU ${system.cpu_usage_pct}%`}
                  size="small" variant="outlined"
                  sx={{
                    ...chipSx,
                    ...(system.cpu_usage_pct > 95 ? { borderColor: '#f44336', color: '#f44336' } : system.cpu_usage_pct > 85 ? { borderColor: '#ff9800', color: '#ff9800' } : {}),
                  }}
                />
              </Tooltip>
              <Tooltip title={`App VM Memory: ${system.memory_used_pct}%`}>
                <Chip
                  label={`Mem ${system.memory_used_pct}%`}
                  size="small" variant="outlined"
                  sx={{
                    ...chipSx,
                    ...(system.memory_used_pct > 95 ? { borderColor: '#f44336', color: '#f44336' } : system.memory_used_pct > 85 ? { borderColor: '#ff9800', color: '#ff9800' } : {}),
                  }}
                />
              </Tooltip>
            </>
          )}
        </div>

        {/* Alert count if any */}
        {data!.alerts && data!.alerts.length > 0 && (
          <Chip
            label={`${data!.alerts.length} alert${data!.alerts.length > 1 ? 's' : ''}`}
            size="small"
            sx={{
              fontWeight: 600, fontSize: '0.7rem', height: 22,
              bgcolor: alpha(data!.alerts.some(a => a.severity === 'error') ? '#f44336' : '#ff9800', isDark ? 0.2 : 0.1),
              color: data!.alerts.some(a => a.severity === 'error') ? '#f44336' : '#ff9800',
            }}
          />
        )}
      </div>
    </div>
  );
};

/* ─── CRM Activity Widget ────────────────────────────────────── */

interface CRMDashboardData {
  pipeline: { pipeline_stage: string; label: string; color: string; count: number }[];
  overdue: number;
  todayFollowups: number;
  totalChurches: number;
  totalClients: number;
}

const CRMActivityWidget: React.FC<{ isDark: boolean; navigate: ReturnType<typeof useNavigate> }> = ({ isDark, navigate }) => {
  const [data, setData] = useState<CRMDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<CRMDashboardData>('/crm/dashboard')
      .then((r) => setData(r))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="om-admin-card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <PipelineIcon sx={{ fontSize: 20, color: '#546e7a' }} />
        <Skeleton width={120} height={20} />
        <Skeleton width={80} height={20} />
      </div>
    </div>
  );

  if (!data) return null;

  const activeStages = (data.pipeline || []).filter(s => s.count > 0 && s.pipeline_stage !== 'new_lead');

  return (
    <div
      className="om-admin-card"
      onClick={() => navigate('/admin/control-panel/church-lifecycle')}
      style={{ marginBottom: '1.5rem', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PipelineIcon sx={{ fontSize: 18, color: '#1976d2' }} />
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Church Pipeline</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
          {/* Overdue follow-ups */}
          {data.overdue > 0 && (
            <Tooltip title={`${data.overdue} overdue follow-up${data.overdue > 1 ? 's' : ''} — click to view`}>
              <Chip
                icon={<OverdueIcon sx={{ fontSize: 14 }} />}
                label={`${data.overdue} overdue`}
                size="small"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  navigate('/admin/control-panel/church-lifecycle', { state: { tab: 'follow-ups' } });
                }}
                sx={{
                  ...chipSx,
                  bgcolor: alpha('#f44336', isDark ? 0.2 : 0.1),
                  color: '#f44336',
                  border: `1px solid ${alpha('#f44336', 0.3)}`,
                  '& .MuiChip-icon': { color: '#f44336' },
                }}
              />
            </Tooltip>
          )}

          {/* Today's follow-ups */}
          {data.todayFollowups > 0 && (
            <Tooltip title={`${data.todayFollowups} follow-up${data.todayFollowups > 1 ? 's' : ''} due today`}>
              <Chip
                icon={<TodayIcon sx={{ fontSize: 14 }} />}
                label={`${data.todayFollowups} today`}
                size="small"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  navigate('/admin/control-panel/church-lifecycle', { state: { tab: 'follow-ups' } });
                }}
                sx={{
                  ...chipSx,
                  bgcolor: alpha('#ff9800', isDark ? 0.2 : 0.1),
                  color: '#ff9800',
                  border: `1px solid ${alpha('#ff9800', 0.3)}`,
                  '& .MuiChip-icon': { color: '#ff9800' },
                }}
              />
            </Tooltip>
          )}

          {/* No follow-ups indicator */}
          {data.overdue === 0 && data.todayFollowups === 0 && (
            <Chip label="No pending follow-ups" size="small" variant="outlined" sx={{ ...chipSx, color: '#4caf50', borderColor: '#4caf50' }} />
          )}

          {/* Pipeline stage counts */}
          {activeStages.map(s => (
            <Tooltip key={s.pipeline_stage} title={`${s.count} church${s.count > 1 ? 'es' : ''} at ${s.label}`}>
              <Chip
                label={`${s.label} ${s.count}`}
                size="small"
                variant="outlined"
                sx={{ ...chipSx, borderColor: s.color || '#757575', color: s.color || '#757575' }}
              />
            </Tooltip>
          ))}

          {/* Totals */}
          <Chip label={`${data.totalChurches} total`} size="small" variant="outlined" sx={chipSx} />
          {data.totalClients > 0 && (
            <Chip label={`${data.totalClients} client${data.totalClients > 1 ? 's' : ''}`} size="small" variant="outlined" sx={{ ...chipSx, color: '#4caf50', borderColor: '#4caf50' }} />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Component ──────────────────────────────────────────────────

const AdminControlPanel: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  const BCrumb = [
    { to: '/', title: 'Home' },
    { title: 'Admin Control Panel' },
  ];

  return (
    <PageContainer title="Admin Control Panel" description="Orthodox Metrics Administration Hub">
      <Breadcrumb title="Admin Control Panel" items={BCrumb} />
      <Box sx={{ px: { xs: 1, md: 2 } }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <h2 className="om-admin-heading" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
            Orthodox Metrics Administration
          </h2>
          <p className="om-admin-description" style={{ margin: 0 }}>
            Manage your Orthodox community platform. Select a category to get started.
          </p>
        </Box>

        {/* Platform Status Widget */}
        <PlatformStatusWidget isDark={isDark} navigate={navigate} />

        {/* CRM Activity Widget */}
        <CRMActivityWidget isDark={isDark} navigate={navigate} />

        {/* Category tiles — 2-column grid */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2.5,
        }}>
          {CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              className="om-admin-card"
              onClick={() => navigate(cat.href)}
            >
              <div style={{ display: 'flex', gap: '1rem' }}>
                {/* Icon */}
                <div
                  className="om-admin-icon"
                  style={{
                    backgroundColor: isDark ? cat.bgDark : cat.bgLight,
                    color: cat.color,
                  }}
                >
                  {cat.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                      fontSize: '0.9375rem',
                      color: cat.color,
                      marginBottom: '0.25rem',
                    }}
                  >
                    {cat.title}
                  </div>
                  <p className="om-text-tertiary" style={{
                    margin: '0 0 0.75rem',
                    fontSize: '0.8125rem',
                    lineHeight: 1.5,
                  }}>
                    {cat.description}
                  </p>

                  {/* Quick links */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                    {cat.quickLinks.map((link) => (
                      <span
                        key={link.href}
                        className="om-quick-link"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          navigate(link.href, {
                            state: {
                              breadcrumbTrail: [
                                { to: '/', title: 'Home' },
                                { to: '/admin/control-panel', title: 'Control Panel' },
                                { to: cat.href, title: cat.title },
                              ],
                            },
                          });
                        }}
                      >
                        {link.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Box>

      </Box>
    </PageContainer>
  );
};

export default AdminControlPanel;
