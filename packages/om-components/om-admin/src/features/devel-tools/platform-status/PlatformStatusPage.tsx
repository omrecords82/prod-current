/**
 * PlatformStatusPage — High-signal operational dashboard
 * Displays live DB, service, and system metrics with state-driven UI
 * Auto-refreshes every 60 seconds with threshold-based alerting
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  CircularProgress,
  IconButton,
  Tooltip,
  Skeleton,
  useTheme,
  alpha,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  IconRefresh,
  IconPointFilled,
  IconAlertTriangle,
  IconDeviceDesktop,
  IconShieldCheck,
  IconAlertCircle,
  IconUrgent,
  IconReload,
  IconFileText,
} from '@tabler/icons-react';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { apiClient } from '@/api/utils/axiosInstance';
import type { BackendAlert, PlatformStatus, Severity, SystemHealth, ServiceHealth } from './platformStatusTypes';
import { POLL_INTERVAL_MS, BCrumb, useTimeAgo, useSevColors, SystemBar } from './platformStatusTypes';
import DatabaseSection from './DatabaseSection';
import TrendHistory from './TrendHistory';
import { useActionToast, handleActionError, RestartConfirmDialog, ServiceLogsModal } from './PlatformStatusDialogs';
import type { ActionResult } from './PlatformStatusDialogs';
import RecentActivityPanel from './RecentActivityPanel';


// ─── 1. Global Status Bar ────────────────────────────────────────

const STATUS_CONFIG = {
  ok:    { label: 'HEALTHY',  Icon: IconShieldCheck,  msg: 'All systems operating normally' },
  warn:  { label: 'WARNING',  Icon: IconAlertCircle,  msg: 'Some metrics need attention' },
  error: { label: 'CRITICAL', Icon: IconUrgent,       msg: 'Immediate attention required' },
} as const;

const GlobalStatusBar: React.FC<{
  severity: Severity;
  alerts: BackendAlert[];
  lastFetchedAt: string | null;
  pollActive: boolean;
  onTogglePoll: () => void;
  onRefresh: () => void;
  loading: boolean;
  responseTime?: number;
}> = ({ severity, alerts, lastFetchedAt, pollActive, onTogglePoll, onRefresh, loading, responseTime }) => {
  const theme = useTheme();
  const sev = useSevColors();
  const timeAgo = useTimeAgo(lastFetchedAt);
  const color = sev.get(severity);
  const cfg = STATUS_CONFIG[severity];

  const alertMsg = alerts.length > 0
    ? alerts[0].message + (alerts.length > 1 ? ` (+${alerts.length - 1} more)` : '')
    : cfg.msg;

  return (
    <Paper
      elevation={0}
      sx={{
        px: 2.5,
        py: 1.5,
        mb: 2,
        border: `1px solid ${alpha(color, 0.3)}`,
        borderRadius: 1.5,
        bgcolor: alpha(color, severity === 'ok' ? 0.04 : 0.08),
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 1, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          bgcolor: alpha(color, 0.12), color,
        }}>
          <cfg.Icon size={20} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle2" fontWeight={800} letterSpacing={1} sx={{ color, fontSize: '0.78rem' }}>
              {cfg.label}
            </Typography>
            {alerts.length > 0 && (
              <Box sx={{
                px: 0.8, py: 0.1, borderRadius: 0.5,
                bgcolor: alpha(color, 0.15), fontSize: '0.68rem',
                fontWeight: 700, color, lineHeight: 1.4,
              }}>
                {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
              </Box>
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', mt: 0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {alertMsg}
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" spacing={1}>
          {lastFetchedAt && (
            <Tooltip title={pollActive ? 'Auto-refresh every 60s — click to pause' : 'Paused — click to resume'}>
              <Box
                onClick={onTogglePoll}
                sx={{
                  cursor: 'pointer', px: 1, py: 0.3, borderRadius: 0.75,
                  bgcolor: alpha(theme.palette.text.primary, 0.04),
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.08) },
                }}
              >
                <IconPointFilled size={8} style={{ color: pollActive ? sev.ok : theme.palette.text.disabled }} />
                <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                  {pollActive ? timeAgo || 'live' : 'paused'}
                </Typography>
              </Box>
            </Tooltip>
          )}
          {responseTime != null && (
            <Typography variant="caption" fontFamily="monospace" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
              {responseTime}ms
            </Typography>
          )}
          <Tooltip title="Refresh now">
            <IconButton size="small" onClick={onRefresh} disabled={loading} sx={{ p: 0.5 }}>
              {loading ? <CircularProgress size={16} /> : <IconRefresh size={16} />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
};

// ─── 2. Services Strip ──────────────────────────────────────────

const ServicesStrip: React.FC<{
  services: ServiceHealth[];
  onRestart?: (serviceName: string, label: string) => void;
  onViewLogs?: (serviceName: string, label: string) => void;
  actionInProgress?: string | null; // service_name currently being acted on
}> = ({ services, onRestart, onViewLogs, actionInProgress }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const sev = useSevColors();

  return (
    <Paper elevation={0} sx={{ p: 1.5, border: `1px solid ${isDark ? '#2a2a2a' : '#e4e4e4'}`, borderRadius: 1.5, mb: 2 }}>
      <Stack direction="row" spacing={0} sx={{ overflow: 'auto' }}>
        {services.map((s, i) => {
          const isOk = s.status === 'ok';
          const isStarting = s.status === 'starting';
          const color = isOk ? sev.ok : isStarting ? sev.warn : sev.error;

          return (
            <Box
              key={s.service_name}
              sx={{
                flex: 1, minWidth: 150, px: 1.5, py: 0.8,
                borderRight: i < services.length - 1 ? `1px solid ${isDark ? '#2a2a2a' : '#e8e8e8'}` : undefined,
                display: 'flex', alignItems: 'center', gap: 1,
              }}
            >
              <Box sx={{
                width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0,
                boxShadow: !isOk ? `0 0 6px ${alpha(color, 0.5)}` : undefined,
              }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.78rem', lineHeight: 1.2 }}>
                  {s.label}
                </Typography>
                <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  {isOk && s.uptime ? `up ${s.uptime}` : isStarting ? 'starting...' : s.status === 'down' ? 'down' : s.status}
                </Typography>
              </Box>
              {/* Action buttons */}
              <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
                {actionInProgress === s.service_name && (
                  <CircularProgress size={12} sx={{ mr: 0.5 }} />
                )}
                <Tooltip title="View logs">
                  <IconButton size="small" onClick={() => onViewLogs?.(s.service_name, s.label)} sx={{ p: 0.3 }}>
                    <IconFileText size={13} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Restart service">
                  <IconButton size="small" onClick={() => onRestart?.(s.service_name, s.label)} disabled={actionInProgress === s.service_name} sx={{ p: 0.3 }}>
                    <IconReload size={13} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
};

// ─── 3. System Health Panel ─────────────────────────────────────

const SystemHealthPanel: React.FC<{ system: SystemHealth; overallSeverity: Severity }> = ({ system, overallSeverity }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const cpuSev: Severity = system.cpu_usage_pct > 95 ? 'error' : system.cpu_usage_pct > 85 ? 'warn' : 'ok';
  const memSev: Severity = system.memory_used_pct > 95 ? 'error' : system.memory_used_pct > 85 ? 'warn' : 'ok';
  const diskSev: Severity = system.disk_usage_pct > 90 ? 'error' : system.disk_usage_pct > 80 ? 'warn' : 'ok';

  return (
    <Paper elevation={0} sx={{ p: 2, border: `1px solid ${isDark ? '#2a2a2a' : '#e4e4e4'}`, borderRadius: 1.5, mb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.8}>
          <IconDeviceDesktop size={16} color={theme.palette.text.secondary} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.8rem' }}>App VM</Typography>
        </Stack>
        <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
          load {system.load_average.map(l => l.toFixed(2)).join(' / ')} &middot; {system.cpu_count} cores
        </Typography>
      </Stack>

      <SystemBar label="CPU" value={system.cpu_usage_pct} detail={`${system.cpu_usage_pct}%`} thresholds={[85, 95]} severity={cpuSev} />
      <SystemBar label="Memory" value={system.memory_used_pct} detail={`${system.memory_used_gb}G / ${system.memory_total_gb}G`} thresholds={[85, 95]} severity={memSev} />
      <SystemBar label="Disk" value={system.disk_usage_pct} detail={`${system.disk_used} / ${system.disk_total}`} thresholds={[80, 90]} severity={diskSev} />
    </Paper>
  );
};

// ─── Main Page ───────────────────────────────────────────────────

const PlatformStatusPage: React.FC = () => {
  const theme = useTheme();
  const [data, setData] = useState<PlatformStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [pollActive, setPollActive] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Action state
  const { toast, show: showToast, close: closeToast } = useActionToast();
  const [restartDialog, setRestartDialog] = useState<{ open: boolean; serviceName: string; label: string }>({ open: false, serviceName: '', label: '' });
  const [restartLoading, setRestartLoading] = useState(false);
  const [logsModal, setLogsModal] = useState<{ open: boolean; serviceName: string; label: string }>({ open: false, serviceName: '', label: '' });
  const [pingLoading, setPingLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const bumpActivity = useCallback(() => setActivityRefreshKey(k => k + 1), []);

  const fetchStatus = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<PlatformStatus>('/platform/status');
      setData(res);
      setLastFetchedAt(new Date().toISOString());
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch platform status');
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  useEffect(() => {
    if (!pollActive) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => fetchStatus(true), POLL_INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [pollActive, fetchStatus]);

  // ─── Action handlers ────────────────────────────────────────────

  const handleRestart = useCallback(async () => {
    setRestartLoading(true);
    try {
      const res = await apiClient.post<ActionResult>(`/platform/actions/service/${restartDialog.serviceName}/restart`);
      const sev = res.status === 'started' ? 'info' : 'success';
      showToast(sev as any, res.message || `${restartDialog.label} restarted`);
      setRestartDialog(d => ({ ...d, open: false }));
      bumpActivity();
      // Auto-refresh status after service stabilizes
      if (restartDialog.serviceName !== 'orthodox-backend') {
        setTimeout(() => fetchStatus(true), 3000);
      }
    } catch (err: any) {
      handleActionError(err, showToast, 'Restart failed');
    } finally {
      setRestartLoading(false);
    }
  }, [restartDialog.serviceName, restartDialog.label, fetchStatus, showToast, bumpActivity]);

  const handlePing = useCallback(async () => {
    setPingLoading(true);
    try {
      const res = await apiClient.get<ActionResult & { latency_ms?: number }>('/platform/actions/database/ping');
      showToast('success', res.message || `Ping: ${res.latency_ms}ms`);
      bumpActivity();
    } catch (err: any) {
      handleActionError(err, showToast, 'Ping failed');
    } finally {
      setPingLoading(false);
    }
  }, [showToast, bumpActivity]);

  const handleBackup = useCallback(async () => {
    if (!window.confirm('Run a database backup now? This may take a minute or two.')) return;
    setBackupLoading(true);
    try {
      const res = await apiClient.post<ActionResult>('/platform/actions/database/backup');
      showToast('success', res.message || 'Backup completed');
      bumpActivity();
      setTimeout(() => fetchStatus(true), 2000);
    } catch (err: any) {
      handleActionError(err, showToast, 'Backup failed');
    } finally {
      setBackupLoading(false);
    }
  }, [showToast, fetchStatus, bumpActivity]);

  const db = data?.database;
  const services = data?.services;
  const system = data?.system;

  const alerts: BackendAlert[] = data?.alerts || [];
  const overallSeverity: Severity = data?.overall_status || (error ? 'error' : 'ok');
  const serviceList = services ? Object.values(services) : [];

  return (
    <PageContainer title="Platform Status" description="Live platform health — DB, services, and system">
      <Breadcrumb title="Platform Status" items={BCrumb} />
      <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>

        {/* 1. Global Status Bar */}
        <GlobalStatusBar
          severity={overallSeverity}
          alerts={alerts}
          lastFetchedAt={lastFetchedAt}
          pollActive={pollActive}
          onTogglePoll={() => setPollActive(p => !p)}
          onRefresh={() => fetchStatus(false)}
          loading={loading}
          responseTime={data?.response_time_ms}
        />

        {/* Connection error state */}
        {error && !db && !services && (
          <Paper elevation={0} sx={{ p: 2, mb: 2, border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`, borderRadius: 1.5, bgcolor: alpha(theme.palette.error.main, 0.04) }}>
            <Typography variant="body2" color="error" fontWeight={600}>{error}</Typography>
          </Paper>
        )}

        {/* Loading skeleton */}
        {loading && !db && !services && (
          <Stack spacing={1.5}>
            <Skeleton variant="rounded" height={50} />
            <Skeleton variant="rounded" height={80} />
            <Skeleton variant="rounded" height={120} />
          </Stack>
        )}

        {/* 2. Services Strip (with action buttons) */}
        {serviceList.length > 0 && (
          <ServicesStrip
            services={serviceList}
            onRestart={(name, label) => setRestartDialog({ open: true, serviceName: name, label })}
            onViewLogs={(name, label) => setLogsModal({ open: true, serviceName: name, label })}
            actionInProgress={restartLoading ? restartDialog.serviceName : null}
          />
        )}

        {/* 3. System Health Panel */}
        {system && <SystemHealthPanel system={system} overallSeverity={overallSeverity} />}

        {/* 4. Database Section (with action buttons) */}
        {db && (
          <DatabaseSection
            db={db}
            overallSeverity={overallSeverity}
            onPing={handlePing}
            onBackup={handleBackup}
            pingLoading={pingLoading}
            backupLoading={backupLoading}
          />
        )}

        {/* DB unreachable but services/system available */}
        {!db && data?.error && services && (
          <Paper elevation={0} sx={{ p: 2, mb: 2, border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`, borderRadius: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.04) }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconAlertTriangle size={16} color={theme.palette.warning.main} />
              <Typography variant="body2" fontWeight={600} color="warning.main">Database unreachable</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{data.error}</Typography>
          </Paper>
        )}

        {/* 5. Trend History */}
        {(db || services) && <TrendHistory />}

        {/* 6. Recent Activity */}
        {(db || services) && <RecentActivityPanel refreshKey={activityRefreshKey} />}

        {/* Footer */}
        {(db || services) && (
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ py: 0.5 }}>
            <Typography variant="caption" fontFamily="monospace" color="text.disabled" sx={{ fontSize: '0.62rem' }}>
              DB Host: 192.168.1.241
            </Typography>
            <Typography variant="caption" fontFamily="monospace" color="text.disabled" sx={{ fontSize: '0.62rem' }}>
              Polling: {pollActive ? '60s' : 'paused'}
            </Typography>
          </Stack>
        )}
      </Box>

      {/* Dialogs & Toasts */}
      <RestartConfirmDialog
        open={restartDialog.open}
        serviceName={restartDialog.serviceName}
        serviceLabel={restartDialog.label}
        loading={restartLoading}
        onConfirm={handleRestart}
        onCancel={() => !restartLoading && setRestartDialog(d => ({ ...d, open: false }))}
      />
      <ServiceLogsModal
        open={logsModal.open}
        serviceName={logsModal.serviceName}
        serviceLabel={logsModal.label}
        onClose={() => setLogsModal(d => ({ ...d, open: false }))}
      />
      <Snackbar open={toast.open} autoHideDuration={5000} onClose={closeToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeToast} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default PlatformStatusPage;
