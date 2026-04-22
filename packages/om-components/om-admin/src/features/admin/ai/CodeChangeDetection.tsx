/**
 * Code Change Detection & Auto-Builds
 *
 * Tracks source-code edits from the Page Content Editor,
 * shows change history, build status, and lets admins trigger
 * frontend rebuilds from the web UI.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Divider,
  Paper,
  LinearProgress,
  Tooltip,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  IconBuildingFactory2,
  IconRefresh,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconClock,
  IconCode,
  IconFileText,
  IconBell,
  IconPlayerPlay,
  IconChevronDown,
  IconChevronUp,
  IconTerminal2,
} from '@tabler/icons-react';
import apiClient from '@/api/utils/axiosInstance';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';

// ── Types ──

interface ContentChange {
  id: number;
  page_id: string;
  page_name: string;
  files_changed: string[];
  items_changed: number;
  build_triggered: boolean | number;
  created_at: string;
  editor_name: string;
  editor_email: string;
}

interface BuildRecord {
  id: number;
  run_id: string;
  status: 'running' | 'success' | 'failed';
  duration_ms: number | null;
  output_tail: string | null;
  created_at: string;
  triggered_by_name: string;
  triggered_by_email: string;
}

interface BuildStatus {
  building: boolean;
  runId?: string;
  startedAt?: string;
  elapsedMs?: number;
  triggeredBy?: string;
}

// ── Helpers ──

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ── Main Component ──

export default function CodeChangeDetection() {
  const [changes, setChanges] = useState<ContentChange[]>([]);
  const [builds, setBuilds] = useState<BuildRecord[]>([]);
  const [buildStatus, setBuildStatus] = useState<BuildStatus>({ building: false });
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [buildLog, setBuildLog] = useState('');
  const [showLog, setShowLog] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { to: '/admin/control-panel/ai', title: 'AI & Automation' },
    { title: 'Code Change Detection' },
  ];

  const fetchAll = useCallback(async () => {
    try {
      const [changesRes, buildsRes, statusRes] = await Promise.all([
        apiClient.get('/page-content-builds/changes?limit=30'),
        apiClient.get('/page-content-builds/builds?limit=10'),
        apiClient.get('/page-content-builds/build-status'),
      ]);

      setChanges(changesRes.data || changesRes || []);
      setPendingCount(changesRes.pendingBuildCount ?? (changesRes.data ? 0 : 0));
      setBuilds(buildsRes.data || buildsRes || []);
      setBuildStatus(statusRes || { building: false });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Poll build status when a build is running
  useEffect(() => {
    if (buildStatus.building && buildStatus.runId) {
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await apiClient.get('/page-content-builds/build-status');
          setBuildStatus(statusRes || { building: false });

          if (buildStatus.runId) {
            const logRes = await apiClient.get(`/page-content-builds/build-log/${buildStatus.runId}`);
            setBuildLog(logRes.log || '');
          }

          // Build finished
          if (!statusRes.building) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setSuccess('Build completed! Refreshing...');
            fetchAll();
          }
        } catch {
          // ignore poll errors
        }
      }, 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [buildStatus.building, buildStatus.runId, fetchAll]);

  // Auto-clear success
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const triggerBuild = async () => {
    setError('');
    try {
      const res = await apiClient.post('/page-content-builds/trigger-build');
      setBuildStatus({ building: true, runId: res.runId });
      setShowLog(true);
      setSuccess('Frontend build triggered');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Code Change Detection" description="Track page content edits and trigger builds">
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Code Change Detection" description="Track page content edits and trigger builds">
      <Breadcrumb title="Code Change Detection" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Code Change Detection & Auto-Builds
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitors source code edits made via the Page Content Editor and manages frontend rebuilds
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<IconRefresh size={18} />} onClick={fetchAll} size="small">
              Refresh
            </Button>
            <Button
              variant="contained"
              color={pendingCount > 0 ? 'warning' : 'primary'}
              startIcon={buildStatus.building ? <CircularProgress size={16} color="inherit" /> : <IconPlayerPlay size={18} />}
              onClick={triggerBuild}
              disabled={buildStatus.building}
              size="small"
            >
              {buildStatus.building ? 'Building...' : pendingCount > 0 ? `Build Now (${pendingCount} pending)` : 'Trigger Build'}
            </Button>
          </Stack>
        </Stack>

        {/* Alerts */}
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

        {/* Build in progress banner */}
        {buildStatus.building && (
          <Alert
            severity="info"
            icon={<IconBuildingFactory2 size={22} />}
            sx={{ mb: 2 }}
            action={
              <Button size="small" color="inherit" onClick={() => setShowLog(!showLog)}>
                {showLog ? 'Hide Log' : 'Show Log'}
              </Button>
            }
          >
            <Typography variant="body2" fontWeight={600}>
              Frontend build in progress
              {buildStatus.triggeredBy && ` (triggered by ${buildStatus.triggeredBy})`}
              {buildStatus.elapsedMs && ` — ${formatDuration(buildStatus.elapsedMs)}`}
            </Typography>
            <LinearProgress sx={{ mt: 1 }} />
          </Alert>
        )}

        {/* Build log */}
        <Collapse in={showLog && !!buildLog}>
          <Paper sx={{ p: 2, mb: 2, bgcolor: '#1a1a2e', maxHeight: 300, overflow: 'auto' }}>
            <Typography variant="caption" fontFamily="monospace" color="#a0a0a0" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: 11, m: 0 }}>
              {buildLog || 'Waiting for output...'}
            </Typography>
          </Paper>
        </Collapse>

        {/* Pending changes alert */}
        {pendingCount > 0 && !buildStatus.building && (
          <Alert severity="warning" icon={<IconAlertTriangle size={20} />} sx={{ mb: 2 }}>
            <strong>{pendingCount} change{pendingCount > 1 ? 's' : ''}</strong> pending rebuild.
            Source code has been modified but the frontend has not been rebuilt yet. Changes won't be visible to users until you trigger a build.
          </Alert>
        )}

        {/* Stats cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
          <StatCard
            label="Total Changes"
            value={changes.length}
            icon={<IconCode size={24} />}
            color="#5c6bc0"
          />
          <StatCard
            label="Pending Build"
            value={pendingCount}
            icon={<IconAlertTriangle size={24} />}
            color={pendingCount > 0 ? '#ff9800' : '#4caf50'}
          />
          <StatCard
            label="Total Builds"
            value={builds.length}
            icon={<IconBuildingFactory2 size={24} />}
            color="#26a69a"
          />
          <StatCard
            label="Last Build"
            value={builds[0] ? (builds[0].status === 'success' ? 'OK' : 'Failed') : 'Never'}
            icon={builds[0]?.status === 'success' ? <IconCheck size={24} /> : <IconClock size={24} />}
            color={builds[0]?.status === 'success' ? '#4caf50' : builds[0]?.status === 'failed' ? '#f44336' : '#9e9e9e'}
            subtitle={builds[0] ? timeAgo(builds[0].created_at) : undefined}
          />
        </Box>

        {/* Build History */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <IconBuildingFactory2 size={20} />
              <Typography variant="h6" fontWeight={600}>Build History</Typography>
              <Chip label={builds.length} size="small" />
            </Stack>
            <Divider sx={{ mb: 1 }} />
            {builds.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No builds yet. Trigger a build after making page content changes.
              </Typography>
            ) : (
              builds.map((build) => (
                <BuildRow key={build.id} build={build} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Change Log */}
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <IconBell size={20} />
              <Typography variant="h6" fontWeight={600}>Change Log</Typography>
              <Chip label={changes.length} size="small" />
            </Stack>
            <Divider sx={{ mb: 1 }} />
            {changes.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No changes recorded yet. Edit page content via the Page Content Editor to see changes here.
              </Typography>
            ) : (
              changes.map((change) => (
                <ChangeRow key={change.id} change={change} />
              ))
            )}
          </CardContent>
        </Card>
      </Box>
    </PageContainer>
  );
}

// ── Sub-components ──

function StatCard({ label, value, icon, color, subtitle }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box sx={{ color, opacity: 0.8 }}>{icon}</Box>
        <Box>
          <Typography variant="h5" fontWeight={700}>{value}</Typography>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          {subtitle && (
            <Typography variant="caption" display="block" color="text.disabled">{subtitle}</Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

function BuildRow({ build }: { build: BuildRecord }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = build.status === 'success' ? 'success' : build.status === 'failed' ? 'error' : 'info';
  const statusIcon = build.status === 'success' ? <IconCheck size={14} /> : build.status === 'failed' ? <IconX size={14} /> : <CircularProgress size={14} />;

  return (
    <Box sx={{
      py: 1.5, px: 1.5,
      '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' },
    }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Chip icon={statusIcon} label={build.status} size="small" color={statusColor} variant="outlined" sx={{ fontSize: 11 }} />
          <Typography variant="body2" fontWeight={500}>
            {build.triggered_by_name || build.triggered_by_email || 'System'}
          </Typography>
          {build.duration_ms && (
            <Typography variant="caption" color="text.secondary">
              {formatDuration(build.duration_ms)}
            </Typography>
          )}
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="caption" color="text.disabled">{timeAgo(build.created_at)}</Typography>
          {build.output_tail && (
            <Tooltip title="Toggle build log">
              <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                {expanded ? <IconChevronUp size={16} /> : <IconTerminal2 size={16} />}
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>
      <Collapse in={expanded}>
        <Paper sx={{ mt: 1, p: 1.5, bgcolor: '#1a1a2e', maxHeight: 200, overflow: 'auto' }}>
          <Typography variant="caption" fontFamily="monospace" color="#a0a0a0" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: 11, m: 0 }}>
            {build.output_tail}
          </Typography>
        </Paper>
      </Collapse>
    </Box>
  );
}

function ChangeRow({ change }: { change: ContentChange }) {
  const isPending = !change.build_triggered;

  return (
    <Box sx={{
      py: 1.5, px: 1.5,
      bgcolor: isPending ? 'rgba(255, 152, 0, 0.03)' : 'transparent',
      borderLeft: isPending ? '3px solid #ff9800' : '3px solid transparent',
      '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' },
    }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconFileText size={18} style={{ opacity: 0.5 }} />
          <Typography variant="body2" fontWeight={600}>{change.page_name}</Typography>
          <Chip
            label={`${change.items_changed} edit${change.items_changed > 1 ? 's' : ''}`}
            size="small"
            variant="outlined"
            sx={{ fontSize: 11, height: 20 }}
          />
          {isPending && <Chip label="pending build" size="small" color="warning" sx={{ fontSize: 10, height: 18 }} />}
          {!isPending && <Chip label="built" size="small" color="success" variant="outlined" sx={{ fontSize: 10, height: 18 }} />}
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="caption" color="text.secondary">
            {change.editor_name || change.editor_email}
          </Typography>
          <Typography variant="caption" color="text.disabled">{timeAgo(change.created_at)}</Typography>
        </Stack>
      </Stack>
      {change.files_changed && change.files_changed.length > 0 && (
        <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap" sx={{ pl: 4 }}>
          {change.files_changed.map((f) => (
            <Chip
              key={f}
              icon={<IconCode size={12} />}
              label={f.split('/').slice(-2).join('/')}
              size="small"
              variant="outlined"
              sx={{ fontSize: 10, height: 18, fontFamily: 'monospace' }}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
