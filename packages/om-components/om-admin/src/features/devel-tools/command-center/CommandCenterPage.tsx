/**
 * Command Center — Prompt Workflow Operations Dashboard
 *
 * Priority-sorted single-screen view of all workflow operations.
 * Sections: ACTION_REQUIRED > BLOCKED > MONITOR > SAFE_TO_IGNORE
 *
 * Provides:
 * - Blocked frontiers with gate explanations
 * - Deterministic classification of all items
 * - Quick actions (Release, Resume, Pause, Manual Only)
 * - Autonomy status panel with explanations
 * - Activity stream with importance filtering
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  Snackbar,
  Alert,
  Divider,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  IconRefresh,
  IconAlertTriangle,
  IconAlertCircle,
  IconShieldCheck,
  IconEye,
  IconChevronDown,
  IconChevronRight,
  IconRocket,
} from '@tabler/icons-react';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { apiClient } from '@/api/utils/axiosInstance';
import { CLASSIFICATION, SECTION } from '@/theme/adminTokens';
import { formatTime } from './types';
import type { DashboardData } from './types';
import ClassBadge from './components/ClassBadge';
import BlockedFrontiersPanel from './components/BlockedFrontiersPanel';
import WorkflowRow from './components/WorkflowRow';
import ReadyRow from './components/ReadyRow';
import AutonomyPanel from './components/AutonomyPanel';
import ActivityStream from './components/ActivityStream';
import ProgressionPanel from './components/ProgressionPanel';
import SummaryBar from './components/SummaryBar';

// ─── Main Component ────────────────────────────────────────────────

const CommandCenterPage: React.FC = () => {
  const theme = useTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [safeCollapsed, setSafeCollapsed] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/workflows/dashboard');
      setData(res as any);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // ─── Quick Actions ─────────────────────────────────────────────

  const handleRelease = async (promptId: number) => {
    try {
      await apiClient.post('/workflows/auto-execution/run');
      setSnackbar({ message: `Release triggered for prompt ${promptId}`, severity: 'success' });
      fetchDashboard();
    } catch (err: any) {
      setSnackbar({ message: err.message || 'Release failed', severity: 'error' });
    }
  };

  const handleResume = async (workflowId: number) => {
    try {
      await apiClient.post(`/workflows/${workflowId}/autonomy/resume`);
      setSnackbar({ message: `Workflow ${workflowId} resumed`, severity: 'success' });
      fetchDashboard();
    } catch (err: any) {
      setSnackbar({ message: err.message || 'Resume failed', severity: 'error' });
    }
  };

  const handlePause = async (workflowId: number) => {
    try {
      await apiClient.post(`/workflows/${workflowId}/autonomy/pause`, { reason: 'Paused by operator from Command Center' });
      setSnackbar({ message: `Workflow ${workflowId} paused`, severity: 'success' });
      fetchDashboard();
    } catch (err: any) {
      setSnackbar({ message: err.message || 'Pause failed', severity: 'error' });
    }
  };

  const handleManualOnly = async (workflowId: number, manual: boolean) => {
    try {
      await apiClient.post(`/workflows/${workflowId}/manual-only`, { manual_only: manual, target_type: 'workflow' });
      setSnackbar({ message: `Workflow ${workflowId} ${manual ? 'set to manual' : 'autonomy enabled'}`, severity: 'success' });
      fetchDashboard();
    } catch (err: any) {
      setSnackbar({ message: err.message || 'Update failed', severity: 'error' });
    }
  };

  // ─── Grouping ──────────────────────────────────────────────────

  const actionRequired = data?.active_workflows.filter(w => w.classification === 'action_required') || [];
  const monitored = data?.active_workflows.filter(w => w.classification === 'monitor') || [];
  const safeToIgnore = data?.active_workflows.filter(w => w.classification === 'safe_to_ignore') || [];

  // ─── Render ────────────────────────────────────────────────────

  if (loading && !data) {
    return (
      <PageContainer title="Command Center" description="Workflow Operations Dashboard">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Command Center" description="Workflow Operations Dashboard">
      <Breadcrumb title="Command Center" items={[{ title: 'Devel Tools' }, { title: 'Command Center' }]} />

      {/* Refresh bar */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {data ? `Updated ${formatTime(data.generated_at)}` : ''}
        </Typography>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={fetchDashboard} disabled={loading}>
            <IconRefresh size={16} />
          </IconButton>
        </Tooltip>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {data && (
        <>
          {/* Executive Summary */}
          <SummaryBar summary={data.summary} />

          <Grid container spacing={2}>
            <Grid item xs={12} lg={8}>
              {/* Blocked Frontiers — top priority */}
              <BlockedFrontiersPanel
                frontiers={data.blocked_frontiers}
                onResume={handleResume}
                onRelease={handleRelease}
              />

              {/* ACTION REQUIRED workflows */}
              {actionRequired.length > 0 && (
                <Box sx={{
                  mb: 3,
                  borderLeft: `${SECTION.accentWidth}px solid ${CLASSIFICATION.action_required.accent}`,
                  borderRadius: '0 12px 12px 0',
                  bgcolor: CLASSIFICATION.action_required.bg,
                  p: 2,
                }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <IconAlertCircle size={18} color={CLASSIFICATION.action_required.accent} />
                    <Typography variant="subtitle1" sx={{ color: CLASSIFICATION.action_required.text, fontWeight: 700 }}>
                      ACTION REQUIRED ({actionRequired.length})
                    </Typography>
                  </Stack>
                  {actionRequired.map(wf => (
                    <WorkflowRow key={wf.id} wf={wf} onResume={handleResume} onPause={handlePause} onManualOnly={handleManualOnly} />
                  ))}
                </Box>
              )}

              {/* MONITOR workflows */}
              {monitored.length > 0 && (
                <Box sx={{
                  mb: 3,
                  borderLeft: `${SECTION.accentWidth}px solid ${CLASSIFICATION.monitor.accent}`,
                  borderRadius: '0 12px 12px 0',
                  bgcolor: CLASSIFICATION.monitor.bg,
                  p: 2,
                }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <IconEye size={18} color={CLASSIFICATION.monitor.accent} />
                    <Typography variant="subtitle1" sx={{ color: CLASSIFICATION.monitor.text, fontWeight: 700 }}>
                      MONITOR ({monitored.length})
                    </Typography>
                  </Stack>
                  {monitored.map(wf => (
                    <WorkflowRow key={wf.id} wf={wf} onResume={handleResume} onPause={handlePause} onManualOnly={handleManualOnly} />
                  ))}
                </Box>
              )}

              {/* SAFE TO IGNORE — collapsed by default */}
              {safeToIgnore.length > 0 && (
                <Box sx={{
                  mb: 3,
                  borderLeft: `${SECTION.accentWidth}px solid ${CLASSIFICATION.safe_to_ignore.accent}`,
                  borderRadius: '0 12px 12px 0',
                  bgcolor: CLASSIFICATION.safe_to_ignore.bg,
                  p: 2,
                }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: 1, cursor: 'pointer' }}
                    onClick={() => setSafeCollapsed(!safeCollapsed)}
                  >
                    {safeCollapsed ? <IconChevronRight size={16} /> : <IconChevronDown size={16} />}
                    <IconShieldCheck size={18} color={CLASSIFICATION.safe_to_ignore.accent} />
                    <Typography variant="subtitle1" sx={{ color: CLASSIFICATION.safe_to_ignore.text, fontWeight: 700 }}>
                      SAFE TO IGNORE ({safeToIgnore.length})
                    </Typography>
                  </Stack>
                  <Collapse in={!safeCollapsed}>
                    {safeToIgnore.map(wf => (
                      <WorkflowRow key={wf.id} wf={wf} onResume={handleResume} onPause={handlePause} onManualOnly={handleManualOnly} />
                    ))}
                  </Collapse>
                </Box>
              )}

              {/* Ready to Release */}
              {data.ready_to_release.length > 0 && (
                <Paper sx={{ mb: 2, overflow: 'hidden' }}>
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <IconRocket size={16} />
                      <Typography variant="subtitle2" fontWeight={700}>
                        Ready to Release ({data.ready_to_release.length})
                      </Typography>
                    </Stack>
                  </Box>
                  <Divider />
                  {data.ready_to_release.map(item => (
                    <ReadyRow key={item.id} item={item} onRelease={handleRelease} />
                  ))}
                </Paper>
              )}

              {/* Exceptions */}
              {data.exceptions.length > 0 && (
                <Paper sx={{ mb: 2, overflow: 'hidden' }}>
                  <Box sx={{ px: 2, py: 1.5, bgcolor: CLASSIFICATION.monitor.bg }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <IconAlertTriangle size={16} color={theme.palette.warning.main} />
                      <Typography variant="subtitle2" fontWeight={700}>
                        Exceptions ({data.exceptions.length})
                      </Typography>
                    </Stack>
                  </Box>
                  <Divider />
                  {data.exceptions.map(exc => (
                    <Box key={exc.id} sx={{ px: 2, py: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ClassBadge classification={exc.classification} />
                        <Typography variant="body2" fontWeight={500} flex={1} noWrap>
                          {exc.title}
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          {exc.exception_types.map(t => (
                            <Chip
                              key={t}
                              label={t}
                              size="small"
                              color={t === 'escalated' ? 'error' : t === 'blocked' ? 'error' : 'warning'}
                              variant="outlined"
                              sx={{ fontSize: '0.6rem', height: 18 }}
                            />
                          ))}
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Paper>
              )}
            </Grid>

            <Grid item xs={12} lg={4}>
              {/* Autonomy Status Panel */}
              {data.autonomy && <AutonomyPanel autonomy={data.autonomy} />}

              {/* Progression Pipeline Panel */}
              <ProgressionPanel />

              {/* Activity Stream */}
              <ActivityStream events={data.activity} />
            </Grid>
          </Grid>
        </>
      )}

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </PageContainer>
  );
};

export default CommandCenterPage;
