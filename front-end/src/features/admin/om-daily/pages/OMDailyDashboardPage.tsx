/**
 * OMDailyDashboardPage — Overview/KPI dashboard for OM Daily.
 * Extracted from OMDailyPage Tab 0 (renderOverview).
 */
import { apiClient } from '@/api/utils/axiosInstance';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, LinearProgress, Collapse,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Snackbar, Alert, CircularProgress, Paper, useTheme, alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as PlayArrowIcon,
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  Sync as SyncIcon,
  ArrowForward as ArrowForwardIcon,
  OpenInNew as OpenInNewIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import {
  DashboardData, ExtendedDashboard, GitHubSyncStatus, DailyItem,
  formatDate, formatShortDate, timeAgo,
  HORIZONS, HORIZON_LABELS,
  STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS,
  AGENT_TOOL_LABELS, AGENT_TOOL_COLORS,
  DEFAULT_FORM,
} from '../omDailyTypes';
import { HBar, SparkLine, StatusChip, PriorityChip } from '../components/chips';
import { useToast } from '../hooks/useToast';
import ItemFormDialog from '../components/ItemFormDialog';
import type { ItemFormData } from '../omDailyTypes';

const BASE = '/om-daily';

const OMDailyDashboardPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const { toast, showToast, closeToast } = useToast();

  // Bucketed state: overview (10 fields)
  type GhSyncProgress = { phase: string; current: number; total: number; summary: any; error: string | null } | null;
  interface OverviewState {
    dashboard: DashboardData | null;
    extended: ExtendedDashboard | null;
    ghStatus: GitHubSyncStatus | null;
    ghSyncing: boolean;
    ghSyncProgress: GhSyncProgress;
    buildInfo: any;
    csList: any[];
    expandedPhase: string | null;
    loading: boolean;
    pushing: boolean;
  }
  const [overviewState, setOverviewState] = useState<OverviewState>({
    dashboard: null,
    extended: null,
    ghStatus: null,
    ghSyncing: false,
    ghSyncProgress: null,
    buildInfo: null,
    csList: [],
    expandedPhase: null,
    loading: true,
    pushing: false,
  });
  const setOverviewField = useCallback(<K extends keyof OverviewState>(key: K, value: OverviewState[K]) => {
    setOverviewState(prev => ({ ...prev, [key]: value }));
  }, []);
  const { dashboard, extended, ghStatus, ghSyncing, ghSyncProgress, buildInfo, csList, expandedPhase, loading, pushing } = overviewState;
  const setDashboard = useCallback((v: DashboardData | null) => setOverviewField('dashboard', v), [setOverviewField]);
  const setExtended = useCallback((v: ExtendedDashboard | null) => setOverviewField('extended', v), [setOverviewField]);
  const setGhStatus = useCallback((v: GitHubSyncStatus | null) => setOverviewField('ghStatus', v), [setOverviewField]);
  const setGhSyncing = useCallback((v: boolean) => setOverviewField('ghSyncing', v), [setOverviewField]);
  const setGhSyncProgress = useCallback((v: GhSyncProgress) => setOverviewField('ghSyncProgress', v), [setOverviewField]);
  const setBuildInfo = useCallback((v: any) => setOverviewField('buildInfo', v), [setOverviewField]);
  const setCsList = useCallback((v: any[]) => setOverviewField('csList', v), [setOverviewField]);
  const setExpandedPhase = useCallback((v: string | null) => setOverviewField('expandedPhase', v), [setOverviewField]);
  const setLoading = useCallback((v: boolean) => setOverviewField('loading', v), [setOverviewField]);
  const setPushing = useCallback((v: boolean) => setOverviewField('pushing', v), [setOverviewField]);

  // Bucketed state: dialogs (6 fields)
  interface DialogsState {
    dialogOpen: boolean;
    editingItem: DailyItem | null;
    form: ItemFormData;
    promptDialogOpen: boolean;
    promptForm: { title: string; description: string; agent_tool: string };
    promptSubmitting: boolean;
  }
  const [dialogsState, setDialogsState] = useState<DialogsState>({
    dialogOpen: false,
    editingItem: null,
    form: DEFAULT_FORM,
    promptDialogOpen: false,
    promptForm: { title: '', description: '', agent_tool: 'claude_cli' },
    promptSubmitting: false,
  });
  const setDialogsField = useCallback(<K extends keyof DialogsState>(key: K, value: DialogsState[K]) => {
    setDialogsState(prev => ({ ...prev, [key]: value }));
  }, []);
  const { dialogOpen, editingItem, form, promptDialogOpen, promptForm, promptSubmitting } = dialogsState;
  const setDialogOpen = useCallback((v: boolean) => setDialogsField('dialogOpen', v), [setDialogsField]);
  const setEditingItem = useCallback((v: DailyItem | null) => setDialogsField('editingItem', v), [setDialogsField]);
  const setForm = useCallback((v: ItemFormData) => setDialogsField('form', v), [setDialogsField]);
  const setPromptDialogOpen = useCallback((v: boolean) => setDialogsField('promptDialogOpen', v), [setDialogsField]);
  const setPromptForm = useCallback((v: DialogsState['promptForm']) => setDialogsField('promptForm', v), [setDialogsField]);
  const setPromptSubmitting = useCallback((v: boolean) => setDialogsField('promptSubmitting', v), [setDialogsField]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetchers ──
  const fetchDashboard = useCallback(async () => {
    try {
      const data = await apiClient.get<any>('/omai-daily/dashboard');
      setDashboard(data);
    } catch {}
  }, []);

  const fetchExtended = useCallback(async () => {
    try {
      const data = await apiClient.get<any>('/omai-daily/dashboard/extended');
      setExtended(data);
    } catch {}
  }, []);

  const fetchGhStatus = useCallback(async () => {
    try {
      const data = await apiClient.get<any>('/omai-daily/github/status');
      setGhStatus(data);
    } catch {}
  }, []);

  const fetchBuildInfo = useCallback(async () => {
    try {
      const data = await apiClient.get<any>('/omai-daily/build-info');
      setBuildInfo(data);
    } catch {}
  }, []);

  const fetchCsList = useCallback(async () => {
    try {
      const data = await apiClient.get<any>('/admin/change-sets?status=active');
      setCsList(Array.isArray(data) ? data : data.changeSets || []);
    } catch {}
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDashboard(), fetchExtended(), fetchGhStatus(), fetchBuildInfo(), fetchCsList()])
      .finally(() => setLoading(false));
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── GitHub Sync ──
  const triggerGhSync = async () => {
    setGhSyncing(true);
    try {
      await apiClient.post<any>('/omai-daily/github/sync');
      showToast('GitHub sync started');
      pollRef.current = setInterval(async () => {
        try {
          const data = await apiClient.get<any>('/omai-daily/github/sync/progress');
          setGhSyncProgress(data);
          if (data.status === 'complete' || data.status === 'error') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setGhSyncing(false);
            setGhSyncProgress(null);
            fetchGhStatus();
            showToast(data.status === 'complete' ? 'GitHub sync complete' : 'Sync error', data.status === 'complete' ? 'success' : 'error');
          }
        } catch {}
      }, 2000);
    } catch {
      setGhSyncing(false);
      showToast('Sync failed', 'error');
    }
  };

  const pushToOrigin = async () => {
    setPushing(true);
    try {
      await apiClient.post<any>('/omai-daily/push-to-origin');
      showToast('Pushed to origin');
    } catch {
      showToast('Push failed', 'error');
    } finally {
      setPushing(false);
    }
  };

  // ── Item Dialog Save ──
  const handleSave = async () => {
    if (!form.title.trim()) return;
    try {
      if (editingItem) {
        await apiClient.put<any>(`/omai-daily/items/${editingItem.id}`, form);
      } else {
        await apiClient.post<any>('/omai-daily/items', form);
      }
      showToast(editingItem ? 'Item updated' : 'Item created');
      setDialogOpen(false);
      fetchDashboard();
      fetchExtended();
    } catch {
      showToast('Failed to save', 'error');
    }
  };

  // ── Prompt Plan Submit ──
  const handlePromptSubmit = async () => {
    if (!promptForm.title.trim()) return;
    setPromptSubmitting(true);
    try {
      await apiClient.post<any>('/prompt-plans', promptForm);
      showToast('Prompt plan created');
      setPromptDialogOpen(false);
      setPromptForm({ title: '', description: '', agent_tool: 'claude_cli' });
    } catch {
      showToast('Failed to create prompt plan', 'error');
    } finally {
      setPromptSubmitting(false);
    }
  };

  // ── Helpers ──
  const openNewItem = () => {
    setEditingItem(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!dashboard) return <Typography color="error">Failed to load dashboard</Typography>;

  // Computed KPIs from actual API shape
  const totalAll = Object.values(dashboard.horizons).reduce((sum, h) => sum + h.total, 0);
  const totalDone = Object.values(dashboard.horizons).reduce((sum, h) => sum + (h.statuses?.done || 0), 0);
  const overallPct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

  return (
    <Box sx={{ pb: 4 }}>
      {/* ── SDLC Pipeline Actions Bar ── */}
      <Paper sx={{ p: 1.5, mb: 3, bgcolor: alpha(theme.palette.primary.main, isDark ? 0.12 : 0.04), border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
            SDLC Pipeline Actions
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openNewItem}>New Item</Button>
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setPromptDialogOpen(true)}>New Prompt Plan</Button>
            <Button size="small" variant="outlined" onClick={() => navigate(`${BASE}/change-sets`)}>Change Sets</Button>
          </Box>
        </Box>
      </Paper>

      {/* ── Top KPI Row ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 2, mb: 3 }}>
        {[
          { value: dashboard.totalActive, label: 'Active Items', color: '#1976d2', icon: <AssignmentIcon sx={{ fontSize: 20 }} />, action: () => navigate(`${BASE}/items`) },
          { value: dashboard.overdue, label: 'Overdue', color: '#f44336', icon: <WarningIcon sx={{ fontSize: 20 }} />, action: dashboard.overdue > 0 ? () => navigate(`${BASE}/items?due=overdue`) : undefined },
          { value: dashboard.dueToday, label: 'Due Today', color: '#ff9800', icon: <ScheduleIcon sx={{ fontSize: 20 }} />, action: dashboard.dueToday > 0 ? () => navigate(`${BASE}/items?due=today`) : undefined },
          { value: dashboard.recentlyCompleted, label: 'Done (7d)', color: '#4caf50', icon: <CheckCircleIcon sx={{ fontSize: 20 }} />, action: () => navigate(`${BASE}/items?status=done`) },
          { value: `${overallPct}%`, label: 'Overall Progress', color: '#8c249d', icon: <TrendingUpIcon sx={{ fontSize: 20 }} /> },
        ].map((kpi, i) => (
          <Paper key={i} onClick={kpi.action} sx={{ p: 2, textAlign: 'center', border: `1px solid ${isDark ? '#333' : '#e8e8e8'}`, cursor: kpi.action ? 'pointer' : 'default', transition: 'all 0.15s', '&:hover': kpi.action ? { borderColor: kpi.color, transform: 'translateY(-1px)' } : {} }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5, color: kpi.color }}>{kpi.icon}</Box>
            <Typography variant="h3" sx={{ color: kpi.color, fontWeight: 700 }}>{kpi.value}</Typography>
            <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* ── Two-column layout: In Progress + Distribution ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 3 }}>
        {/* In Progress */}
        <Paper sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e8e8e8'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PlayArrowIcon sx={{ color: '#ff9800', fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={700}>In Progress</Typography>
            <Chip size="small" label={extended?.inProgressItems?.length || 0} sx={{ height: 20, fontSize: '0.7rem', bgcolor: alpha('#ff9800', 0.12), color: '#ff9800', fontWeight: 700 }} />
          </Box>
          {extended?.inProgressItems && extended.inProgressItems.length > 0 ? (
            <Box>
              {extended.inProgressItems.slice(0, 8).map((item) => (
                <Box key={item.id} onClick={() => navigate(`${BASE}/items?id=${item.id}`)} sx={{
                  display: 'flex', alignItems: 'center', gap: 1, py: 1, cursor: 'pointer',
                  borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}`,
                  '&:last-child': { borderBottom: 'none' },
                  '&:hover': { bgcolor: alpha('#ff9800', 0.06) },
                }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: PRIORITY_COLORS[item.priority] || '#999', flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: '0.84rem' }}>{item.title}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3 }}>
                      {item.category && <Chip size="small" label={item.category} sx={{ height: 16, fontSize: '0.6rem' }} />}
                      <Chip size="small" label={HORIZON_LABELS[item.horizon]} sx={{ height: 16, fontSize: '0.6rem', bgcolor: alpha('#00897b', 0.1), color: '#00897b' }} />
                      {item.agent_tool && (
                        <Chip size="small" label={AGENT_TOOL_LABELS[item.agent_tool] || item.agent_tool}
                          sx={{ height: 16, fontSize: '0.6rem', bgcolor: alpha(AGENT_TOOL_COLORS[item.agent_tool] || '#666', 0.12), color: AGENT_TOOL_COLORS[item.agent_tool] || '#666' }} />
                      )}
                    </Box>
                  </Box>
                  {item.due_date && (
                    <Typography variant="caption" color={new Date(item.due_date) < new Date() ? 'error.main' : 'text.secondary'} sx={{ fontSize: '0.68rem', flexShrink: 0 }}>
                      {formatShortDate(item.due_date)}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No items currently in progress</Typography>
          )}
        </Paper>

        {/* Status & Priority Distribution */}
        <Paper sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e8e8e8'}` }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Status Distribution</Typography>
          {extended?.statusDistribution ? (
            <Box sx={{ mb: 2.5 }}>
              {(() => {
                const maxVal = Math.max(...extended.statusDistribution.map(s => s.count), 1);
                return extended.statusDistribution.map((s) => (
                  <HBar key={s.status} label={STATUS_LABELS[s.status] || s.status} value={s.count} max={maxVal} color={STATUS_COLORS[s.status] || '#999'} isDark={isDark} />
                ));
              })()}
            </Box>
          ) : <CircularProgress size={20} />}

          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Priority (Active)</Typography>
          {extended?.priorityDistribution ? (
            <Box>
              {(() => {
                const maxVal = Math.max(...extended.priorityDistribution.map(p => p.count), 1);
                return extended.priorityDistribution.map((p) => (
                  <HBar key={p.priority} label={p.priority} value={p.count} max={maxVal} color={PRIORITY_COLORS[p.priority] || '#999'} isDark={isDark} />
                ));
              })()}
            </Box>
          ) : <CircularProgress size={20} />}
        </Paper>
      </Box>

      {/* ── Velocity + Due Soon Row ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 3 }}>
        {/* Velocity */}
        <Paper sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e8e8e8'}` }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Completion Velocity (14d)</Typography>
          {extended?.velocity && extended.velocity.length > 1 ? (
            <Box>
              <SparkLine data={extended.velocity} color="#4caf50" height={50} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">{formatShortDate(extended.velocity[0]?.date)}</Typography>
                <Typography variant="caption" color="text.secondary">{formatShortDate(extended.velocity[extended.velocity.length - 1]?.date)}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Avg: {(extended.velocity.reduce((s, v) => s + v.count, 0) / extended.velocity.length).toFixed(1)} items/day
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">Not enough data yet</Typography>
          )}
        </Paper>

        {/* Due Soon */}
        <Paper sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e8e8e8'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <ScheduleIcon sx={{ color: '#ff9800', fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={700}>Due This Week</Typography>
          </Box>
          {extended?.dueSoon && extended.dueSoon.length > 0 ? (
            <Box>
              {extended.dueSoon.slice(0, 6).map((item) => (
                <Box key={item.id} onClick={() => navigate(`${BASE}/items?due=soon`)} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.8, cursor: 'pointer', borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}`, '&:last-child': { borderBottom: 'none' }, '&:hover': { bgcolor: alpha('#ff9800', 0.06) } }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: PRIORITY_COLORS[item.priority] || '#999', flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ flex: 1, fontSize: '0.82rem' }} noWrap>{item.title}</Typography>
                  <StatusChip status={item.status} />
                  <Typography variant="caption" sx={{ color: new Date(item.due_date) <= new Date() ? '#f44336' : '#ff9800', fontWeight: 600, fontSize: '0.7rem', flexShrink: 0 }}>
                    {formatShortDate(item.due_date)}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No items due this week</Typography>
          )}
        </Paper>
      </Box>

      {/* ── Change Set Pipeline ── */}
      {csList.length > 0 && (
        <Paper sx={{ p: 2.5, mb: 3, border: `1px solid ${isDark ? '#333' : '#e8e8e8'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>Change Set Pipeline</Typography>
            <Button size="small" onClick={() => navigate(`${BASE}/change-sets`)}>View All</Button>
          </Box>
          {csList.filter(cs => ['staged', 'in_review', 'approved', 'ready_for_staging', 'active'].includes(cs.status)).length === 0 ? (
            <Typography variant="body2" color="text.secondary">No change sets need attention</Typography>
          ) : (
            <Box>
              {csList.filter(cs => ['staged', 'in_review', 'approved', 'ready_for_staging', 'active'].includes(cs.status)).map(cs => (
                <Box key={cs.change_set_id} onClick={() => navigate(`${BASE}/change-sets/${cs.change_set_id}`)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, cursor: 'pointer', borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}`, '&:last-child': { borderBottom: 'none' }, '&:hover': { bgcolor: alpha('#9c27b0', 0.04) } }}>
                  <Chip size="small" label={cs.status.replace(/_/g, ' ')} sx={{
                    fontSize: '0.65rem', height: 20, fontWeight: 600,
                    bgcolor: cs.status === 'in_review' ? alpha('#0288d1', 0.12) : cs.status === 'approved' ? alpha('#2e7d32', 0.12) : cs.status === 'staged' ? alpha('#9c27b0', 0.12) : cs.status === 'ready_for_staging' ? alpha('#ed6c02', 0.12) : alpha('#1976d2', 0.12),
                    color: cs.status === 'in_review' ? '#0288d1' : cs.status === 'approved' ? '#2e7d32' : cs.status === 'staged' ? '#9c27b0' : cs.status === 'ready_for_staging' ? '#ed6c02' : '#1976d2',
                  }} />
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#9c27b0', fontWeight: 600 }}>{cs.code}</Typography>
                  <Typography variant="body2" sx={{ flex: 1 }} noWrap>{cs.title}</Typography>
                  <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* ── Phase Tracking ── */}
      {extended?.phaseGroups && extended.phaseGroups.length > 0 && (
        <Paper sx={{ p: 2.5, mb: 3, border: `1px solid ${isDark ? '#333' : '#e8e8e8'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FlagIcon sx={{ color: '#8c249d', fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={700}>Phase Tracking</Typography>
            <Typography variant="caption" color="text.secondary">Multi-step projects</Typography>
          </Box>
          {extended.phaseGroups.map((group: any) => {
            const pct = group.total > 0 ? Math.round((group.done_count / group.total) * 100) : 0;
            const key = `${group.source}-${group.category}`;
            const isExpanded = expandedPhase === key;
            const phaseItems = group.items_summary ? group.items_summary.split('||').map((s: string) => {
              const [id, title, status, priority] = s.split(':');
              return { id: Number(id), title, status, priority };
            }) : [];

            return (
              <Box key={key} sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
                <Box onClick={() => setExpandedPhase(isExpanded ? null : key)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', py: 1, px: 1, borderRadius: 1, '&:hover': { bgcolor: alpha('#8c249d', 0.04) } }}>
                  <ExpandMoreIcon sx={{ fontSize: 18, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s', color: 'text.secondary' }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.88rem' }}>
                      {group.category || group.source}
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>via {group.source}</Typography>
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <LinearProgress variant="determinate" value={pct} sx={{ flex: 1, height: 6, borderRadius: 3, maxWidth: 200 }} />
                      <Typography variant="caption" fontWeight={600} sx={{ color: pct === 100 ? '#4caf50' : '#ff9800' }}>{pct}%</Typography>
                    </Box>
                  </Box>
                  <Chip size="small" label={`${group.done_count}/${group.total} done`} sx={{ height: 22, fontSize: '0.7rem', bgcolor: alpha(pct === 100 ? '#4caf50' : '#ff9800', 0.12), color: pct === 100 ? '#4caf50' : '#ff9800', fontWeight: 600 }} />
                  {group.active_count > 0 && (
                    <Chip size="small" label={`${group.active_count} active`} sx={{ height: 22, fontSize: '0.7rem', bgcolor: alpha('#2196f3', 0.12), color: '#2196f3', fontWeight: 600 }} />
                  )}
                </Box>
                <Collapse in={isExpanded}>
                  <Box sx={{ pl: 5, pr: 1, py: 1 }}>
                    {phaseItems.map((pi: any, idx: number) => (
                      <Box key={pi.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.6, borderBottom: idx < phaseItems.length - 1 ? `1px solid ${isDark ? '#222' : '#f0f0f0'}` : 'none' }}>
                        {pi.status === 'done' ? (
                          <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} />
                        ) : pi.status === 'in_progress' ? (
                          <PlayArrowIcon sx={{ fontSize: 16, color: '#ff9800' }} />
                        ) : (
                          <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${isDark ? '#555' : '#ccc'}` }} />
                        )}
                        <Typography variant="body2" sx={{ flex: 1, fontSize: '0.82rem', textDecoration: pi.status === 'done' ? 'line-through' : 'none', opacity: pi.status === 'done' ? 0.6 : 1 }}>
                          {pi.title}
                        </Typography>
                        <StatusChip status={pi.status} />
                        <PriorityChip priority={pi.priority} />
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Paper>
      )}

      {/* ── Category Breakdown + Recent Completions ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, mb: 3 }}>
        {/* Category Breakdown */}
        <Paper sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e8e8e8'}` }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Categories</Typography>
          {extended?.categoryBreakdown && extended.categoryBreakdown.length > 0 ? (
            <Box>
              {(() => {
                const maxVal = Math.max(...extended.categoryBreakdown.map(c => c.count), 1);
                return extended.categoryBreakdown.slice(0, 10).map((c) => (
                  <Box key={c.category} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.8 }}>
                    <Typography variant="caption" sx={{ width: 100, textAlign: 'right', color: 'text.secondary', fontSize: '0.72rem', flexShrink: 0 }} noWrap>{c.category}</Typography>
                    <Box sx={{ flex: 1, height: 18, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: 1, overflow: 'hidden', position: 'relative' }}>
                      <Box sx={{ position: 'absolute', width: maxVal > 0 ? `${(c.count / maxVal) * 100}%` : '0%', height: '100%', bgcolor: alpha('#8c249d', 0.15), borderRadius: 1 }} />
                      <Box sx={{ position: 'absolute', width: maxVal > 0 ? `${(Number(c.done_count) / maxVal) * 100}%` : '0%', height: '100%', bgcolor: alpha('#4caf50', 0.5), borderRadius: 1 }} />
                    </Box>
                    <Typography variant="caption" sx={{ width: 50, fontWeight: 600, fontSize: '0.7rem', color: 'text.secondary', flexShrink: 0 }}>
                      {c.done_count}/{c.count}
                    </Typography>
                  </Box>
                ));
              })()}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No categories yet</Typography>
          )}
        </Paper>

        {/* Recent Completions */}
        <Paper sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e8e8e8'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight={700}>Recently Completed</Typography>
          </Box>
          {extended?.recentCompleted && extended.recentCompleted.length > 0 ? (
            <Box>
              {extended.recentCompleted.slice(0, 8).map((item) => (
                <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.7, borderBottom: `1px solid ${isDark ? '#222' : '#f0f0f0'}`, '&:last-child': { borderBottom: 'none' } }}>
                  <CheckCircleIcon sx={{ fontSize: 14, color: '#4caf50', flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ flex: 1, fontSize: '0.82rem', opacity: 0.85 }} noWrap>{item.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', flexShrink: 0 }}>
                    {item.completed_at ? timeAgo(item.completed_at) : ''}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No recent completions</Typography>
          )}
        </Paper>
      </Box>

      {/* ── Horizon Cards + GitHub Row ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
        {HORIZONS.map((h) => {
          const data = dashboard.horizons[h];
          const total = data?.total || 0;
          const done = data?.statuses?.done || 0;
          const inProgress = data?.statuses?.in_progress || 0;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <Paper key={h} sx={{ p: 2, cursor: 'pointer', border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`, '&:hover': { borderColor: '#00897b', bgcolor: alpha('#00897b', 0.03) } }}
              onClick={() => navigate(`${BASE}/items?horizon=${h}`)}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#00897b' }}>{HORIZON_LABELS[h]}</Typography>
                <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{total} items</Typography>
              <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, mb: 0.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">{done} done</Typography>
                <Typography variant="caption" color="text.secondary">{inProgress} active</Typography>
              </Box>
            </Paper>
          );
        })}

        {/* GitHub Sync Card */}
        <Paper sx={{ p: 2, border: `1px solid ${isDark ? '#333' : '#e0e0e0'}` }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#8c249d', mb: 1 }}>GitHub Sync</Typography>
          <Typography variant="h4" sx={{ color: '#8c249d' }}>{ghStatus?.unsyncedCount ?? '—'}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Unsynced Issues</Typography>
          <Button size="small" variant="outlined" startIcon={ghSyncing ? <CircularProgress size={14} /> : <SyncIcon />}
            onClick={triggerGhSync} disabled={ghSyncing} sx={{ fontSize: '0.7rem', py: 0.25 }}>
            {ghSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          {ghSyncing && ghSyncProgress && (
            <Box sx={{ mt: 1, width: '100%' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.3 }}>
                {ghSyncProgress.phase === 'creating' ? 'Creating issues' : ghSyncProgress.phase === 'updating' ? 'Updating issues' : ghSyncProgress.phase === 'pulling' ? 'Pulling from GitHub' : 'Working'}
                {ghSyncProgress.total > 0 ? ` (${ghSyncProgress.current}/${ghSyncProgress.total})` : '...'}
              </Typography>
              <LinearProgress variant={ghSyncProgress.total > 0 ? 'determinate' : 'indeterminate'}
                value={ghSyncProgress.total > 0 ? Math.round((ghSyncProgress.current / ghSyncProgress.total) * 100) : 0}
                sx={{ height: 4, borderRadius: 2 }} />
            </Box>
          )}
          {!ghSyncing && ghStatus?.lastSync && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>Last: {formatDate(ghStatus.lastSync)}</Typography>
          )}
          {ghStatus?.issuesUrl && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.3 }}>
              <a href={ghStatus.issuesUrl} target="_blank" rel="noreferrer" style={{ color: '#8c249d', textDecoration: 'none' }}>
                GitHub Issues <OpenInNewIcon sx={{ fontSize: 10, verticalAlign: 'middle' }} />
              </a>
            </Typography>
          )}
          {buildInfo && (
            <Box sx={{ mt: 1.5, pt: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 0.2)}` }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Build: {buildInfo.version || buildInfo.hash?.slice(0, 7) || '—'}
              </Typography>
              {buildInfo.date && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Built: {timeAgo(buildInfo.date)}
                </Typography>
              )}
            </Box>
          )}
          <Box sx={{ mt: 1 }}>
            <Button size="small" variant="outlined" onClick={pushToOrigin} disabled={pushing} sx={{ fontSize: '0.7rem', py: 0.25 }}>
              {pushing ? 'Pushing...' : 'Push to Origin'}
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* ── Dialogs ── */}
      <ItemFormDialog
        open={dialogOpen}
        editingItem={editingItem}
        form={form}
        onFormChange={setForm}
        onSave={handleSave}
        onClose={() => setDialogOpen(false)}
      />

      <Dialog open={promptDialogOpen} onClose={() => setPromptDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Prompt Plan</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Title" fullWidth required value={promptForm.title} onChange={(e) => setPromptForm({ ...promptForm, title: e.target.value })} />
            <TextField label="Description" fullWidth multiline rows={3} value={promptForm.description} onChange={(e) => setPromptForm({ ...promptForm, description: e.target.value })} />
            <TextField label="Agent Tool" select fullWidth value={promptForm.agent_tool} onChange={(e) => setPromptForm({ ...promptForm, agent_tool: e.target.value })}>
              {Object.entries(AGENT_TOOL_LABELS).map(([val, label]) => (
                <MenuItem key={val} value={val}>{label as string}</MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromptDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handlePromptSubmit} disabled={promptSubmitting || !promptForm.title.trim()}>
            {promptSubmitting ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Toast ── */}
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={closeToast} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={closeToast} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OMDailyDashboardPage;
