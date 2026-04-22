/**
 * Badge State Manager — Developer tool for managing menu badge lifecycle
 *
 * Provides a management interface for all badge-enabled menu items.
 * Allows viewing, setting, acknowledging, resetting, and clearing badges.
 * Detects orphaned badge records (DB entries without matching menu items).
 *
 * Data sources:
 *   - GET    /api/badges              — all badge states
 *   - PUT    /api/badges/:itemKey     — create/update badge
 *   - POST   /api/badges/:itemKey/acknowledge — suppress badge
 *   - POST   /api/badges/:itemKey/reset       — restart lifecycle
 *   - DELETE /api/badges/:itemKey     — remove badge entry
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  useTheme,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
} from '@mui/material';
import {
  IconRefresh,
  IconBell,
  IconBellOff,
  IconTrash,
  IconPlayerPlay,
  IconSearch,
  IconAlertTriangle,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconClock,
  IconEdit,
  IconPlus,
} from '@tabler/icons-react';
import { apiClient } from '@/api/utils/axiosInstance';
import { BadgeData, BadgeState } from '@/utils/badgeResolver';
import StateBadge from '@/shared/ui/StateBadge';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';

// ── Known badge-capable items (mirrors badgeKey values in MenuItems.ts) ──

interface KnownItem {
  badgeKey: string;
  label: string;
  menuPath: string;
}

const KNOWN_BADGE_ITEMS: KnownItem[] = [
  { badgeKey: 'om-charts', label: 'OM Charts', menuPath: 'Dashboards > OM Charts' },
  { badgeKey: 'us-church-map', label: 'US Church Map', menuPath: 'Church Operations > US Church Map' },
  { badgeKey: 'baptism-records-v2', label: 'Baptism Records v2', menuPath: 'Records > Baptism Records v2' },
];

// ── Types ────────────────────────────────────────────────────────

interface MergedItem {
  badgeKey: string;
  label: string;
  menuPath: string;
  badgeData: BadgeData | null;
  isOrphaned: boolean;
}

type SortField = 'badgeKey' | 'label' | 'visible_state' | 'badge_started_at';
type SortDir = 'asc' | 'desc';
type FilterState = 'all' | 'new' | 'recently_updated' | 'none' | 'orphaned';

// ── Constants ────────────────────────────────────────────────────

const BCrumb = [
  { to: '/', title: 'Home' },
  { to: '/admin/control-panel', title: 'Control Panel' },
  { title: 'Badge State Manager' },
];

// ── Helpers ──────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function timeUntilExpiry(expiresAt: string | null): string {
  if (!expiresAt) return '—';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

// ── Main Component ───────────────────────────────────────────────

export default function BadgeStateManagerPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Data
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState<FilterState>('all');
  const [sortField, setSortField] = useState<SortField>('badgeKey');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Set badge dialog
  const [setDialogOpen, setSetDialogOpen] = useState(false);
  const [setDialogKey, setSetDialogKey] = useState('');
  const [setDialogState, setSetDialogState] = useState<'new' | 'recently_updated'>('new');
  const [setDialogDuration, setSetDialogDuration] = useState('');

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  // ── Fetch badges ─────────────────────────────────────────────

  const fetchBadges = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/badges');
      setBadges(res?.badges || []);
    } catch {
      setSnackbar({ open: true, message: 'Failed to fetch badge states', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBadges(); }, [fetchBadges]);

  // ── Merge known items with DB state ──────────────────────────

  const mergedItems = useMemo((): MergedItem[] => {
    const badgeMap = new Map(badges.map(b => [b.item_key, b]));
    const knownKeys = new Set(KNOWN_BADGE_ITEMS.map(k => k.badgeKey));

    // Start with known items
    const items: MergedItem[] = KNOWN_BADGE_ITEMS.map(known => ({
      badgeKey: known.badgeKey,
      label: known.label,
      menuPath: known.menuPath,
      badgeData: badgeMap.get(known.badgeKey) || null,
      isOrphaned: false,
    }));

    // Add orphaned DB records
    for (const badge of badges) {
      if (!knownKeys.has(badge.item_key)) {
        items.push({
          badgeKey: badge.item_key,
          label: badge.item_key,
          menuPath: '(no menu item)',
          badgeData: badge,
          isOrphaned: true,
        });
      }
    }

    return items;
  }, [badges]);

  // ── Filter + Search + Sort ───────────────────────────────────

  const filteredItems = useMemo(() => {
    let items = mergedItems;

    // Filter
    if (filterState === 'orphaned') {
      items = items.filter(i => i.isOrphaned);
    } else if (filterState !== 'all') {
      items = items.filter(i => (i.badgeData?.visible_state || 'none') === filterState);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.badgeKey.toLowerCase().includes(q) ||
        i.label.toLowerCase().includes(q) ||
        i.menuPath.toLowerCase().includes(q)
      );
    }

    // Sort
    items = [...items].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'badgeKey':
          cmp = a.badgeKey.localeCompare(b.badgeKey);
          break;
        case 'label':
          cmp = a.label.localeCompare(b.label);
          break;
        case 'visible_state': {
          const sa = a.badgeData?.visible_state || 'none';
          const sb = b.badgeData?.visible_state || 'none';
          cmp = sa.localeCompare(sb);
          break;
        }
        case 'badge_started_at': {
          const da = a.badgeData?.badge_started_at || '';
          const db = b.badgeData?.badge_started_at || '';
          cmp = da.localeCompare(db);
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [mergedItems, filterState, search, sortField, sortDir]);

  // ── Stats ────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const activeNew = mergedItems.filter(i => i.badgeData?.visible_state === 'new').length;
    const activeUpdated = mergedItems.filter(i => i.badgeData?.visible_state === 'recently_updated').length;
    const acknowledged = mergedItems.filter(i => i.badgeData?.badge_mode === 'acknowledged').length;
    const orphaned = mergedItems.filter(i => i.isOrphaned).length;
    return { activeNew, activeUpdated, acknowledged, orphaned, total: mergedItems.length };
  }, [mergedItems]);

  // ── Actions ──────────────────────────────────────────────────

  const handleSetBadge = async (itemKey: string, state: 'new' | 'recently_updated', durationDays?: number) => {
    setActionInProgress(itemKey);
    try {
      await apiClient.put(`/badges/${encodeURIComponent(itemKey)}`, {
        badge_state: state,
        badge_duration_days: durationDays || undefined,
      });
      setSnackbar({ open: true, message: `Badge set to ${state === 'new' ? 'NEW' : 'UPDATED'} for "${itemKey}"`, severity: 'success' });
      await fetchBadges();
    } catch {
      setSnackbar({ open: true, message: `Failed to set badge for "${itemKey}"`, severity: 'error' });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAcknowledge = async (itemKey: string) => {
    setActionInProgress(itemKey);
    try {
      await apiClient.post(`/badges/${encodeURIComponent(itemKey)}/acknowledge`, {
        acknowledged_by: 'badge-manager',
      });
      setSnackbar({ open: true, message: `Badge acknowledged for "${itemKey}"`, severity: 'success' });
      await fetchBadges();
    } catch {
      setSnackbar({ open: true, message: `Failed to acknowledge badge for "${itemKey}"`, severity: 'error' });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReset = async (itemKey: string) => {
    setActionInProgress(itemKey);
    try {
      await apiClient.post(`/badges/${encodeURIComponent(itemKey)}/reset`, {
        badge_state: 'new',
      });
      setSnackbar({ open: true, message: `Badge reset for "${itemKey}"`, severity: 'success' });
      await fetchBadges();
    } catch {
      setSnackbar({ open: true, message: `Failed to reset badge for "${itemKey}"`, severity: 'error' });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (itemKey: string) => {
    setActionInProgress(itemKey);
    try {
      await apiClient.delete(`/badges/${encodeURIComponent(itemKey)}`);
      setSnackbar({ open: true, message: `Badge entry deleted for "${itemKey}"`, severity: 'success' });
      await fetchBadges();
    } catch {
      setSnackbar({ open: true, message: `Failed to delete badge for "${itemKey}"`, severity: 'error' });
    } finally {
      setActionInProgress(null);
    }
  };

  // ── Set badge dialog ─────────────────────────────────────────

  const openSetDialog = (itemKey: string) => {
    setSetDialogKey(itemKey);
    setSetDialogState('new');
    setSetDialogDuration('');
    setSetDialogOpen(true);
  };

  const confirmSetBadge = () => {
    const duration = setDialogDuration ? parseInt(setDialogDuration, 10) : undefined;
    handleSetBadge(setDialogKey, setDialogState, duration && !isNaN(duration) ? duration : undefined);
    setSetDialogOpen(false);
  };

  // ── Sort handler ─────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ── Effective-state chip ─────────────────────────────────────

  const renderEffectiveState = (item: MergedItem) => {
    if (!item.badgeData) {
      return <Typography variant="caption" color="text.disabled">No record</Typography>;
    }

    const vs = item.badgeData.visible_state;

    if (vs === 'new' || vs === 'recently_updated') {
      return <StateBadge badgeData={item.badgeData} />;
    }

    // Inactive — show why
    if (item.badgeData.badge_mode === 'acknowledged') {
      return (
        <Chip
          size="small"
          variant="outlined"
          label="ACKNOWLEDGED"
          sx={{
            height: 20, fontSize: '0.625rem', fontWeight: 600,
            borderColor: isDark ? '#666' : '#aaa',
            color: isDark ? '#888' : '#666',
          }}
        />
      );
    }

    // Check if expired
    if (item.badgeData.badge_expires_at && new Date(item.badgeData.badge_expires_at) < new Date()) {
      return (
        <Chip
          size="small"
          variant="outlined"
          label="EXPIRED"
          sx={{
            height: 20, fontSize: '0.625rem', fontWeight: 600,
            borderColor: isDark ? '#555' : '#ccc',
            color: isDark ? '#777' : '#999',
          }}
        />
      );
    }

    return <Typography variant="caption" color="text.disabled">None</Typography>;
  };

  // ── Render ───────────────────────────────────────────────────

  const borderColor = isDark ? '#2a2a2a' : '#e4e4e4';

  return (
    <PageContainer title="Badge State Manager" description="Manage menu item badge lifecycle">
      <Breadcrumb title="Badge State Manager" items={BCrumb} />

      <Box sx={{ p: { xs: 1, md: 3 } }}>
        {/* ── Stats Summary ──────────────────────────────────── */}
        <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          {[
            { label: 'Total Items', value: stats.total, color: theme.palette.text.primary },
            { label: 'Active NEW', value: stats.activeNew, color: isDark ? '#d4af37' : '#2d1b4e' },
            { label: 'Active UPDATED', value: stats.activeUpdated, color: isDark ? '#60a5fa' : '#3b82f6' },
            { label: 'Acknowledged', value: stats.acknowledged, color: theme.palette.text.secondary },
            ...(stats.orphaned > 0 ? [{ label: 'Orphaned', value: stats.orphaned, color: theme.palette.warning.main }] : []),
          ].map(s => (
            <Paper
              key={s.label}
              elevation={0}
              sx={{
                px: 2, py: 1, border: `1px solid ${borderColor}`,
                borderRadius: 1.5, minWidth: 100, textAlign: 'center',
              }}
            >
              <Typography variant="h5" fontWeight={700} sx={{ color: s.color }}>
                {s.value}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {s.label}
              </Typography>
            </Paper>
          ))}
        </Stack>

        {/* ── Search + Filter + Refresh ──────────────────────── */}
        <Paper elevation={0} sx={{ p: 1.5, mb: 2, border: `1px solid ${borderColor}`, borderRadius: 1.5 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
            <TextField
              size="small"
              placeholder="Search by key, label, or menu path..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ minWidth: 250, flex: 1 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconSearch size={16} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Filter</InputLabel>
              <Select
                value={filterState}
                label="Filter"
                onChange={e => setFilterState(e.target.value as FilterState)}
              >
                <MenuItem value="all">All States</MenuItem>
                <MenuItem value="new">Active NEW</MenuItem>
                <MenuItem value="recently_updated">Active UPDATED</MenuItem>
                <MenuItem value="none">Inactive</MenuItem>
                <MenuItem value="orphaned">Orphaned</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchBadges} disabled={loading} size="small">
                {loading ? <CircularProgress size={18} /> : <IconRefresh size={18} />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>

        {/* ── Badge Table ────────────────────────────────────── */}
        <Paper elevation={0} sx={{ border: `1px solid ${borderColor}`, borderRadius: 1.5, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.02) }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                    <TableSortLabel
                      active={sortField === 'label'}
                      direction={sortField === 'label' ? sortDir : 'asc'}
                      onClick={() => handleSort('label')}
                    >
                      Menu Item
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                    <TableSortLabel
                      active={sortField === 'badgeKey'}
                      direction={sortField === 'badgeKey' ? sortDir : 'asc'}
                      onClick={() => handleSort('badgeKey')}
                    >
                      Badge Key
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                    <TableSortLabel
                      active={sortField === 'visible_state'}
                      direction={sortField === 'visible_state' ? sortDir : 'asc'}
                      onClick={() => handleSort('visible_state')}
                    >
                      Effective State
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>DB State / Mode</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                    <TableSortLabel
                      active={sortField === 'badge_started_at'}
                      direction={sortField === 'badge_started_at' ? sortDir : 'asc'}
                      onClick={() => handleSort('badge_started_at')}
                    >
                      Started
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Expires</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Time Left</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && badges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        {search || filterState !== 'all' ? 'No items match your filter' : 'No badge-capable items found'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map(item => (
                    <TableRow
                      key={item.badgeKey}
                      sx={{
                        '&:hover': { bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#000', 0.01) },
                        ...(item.isOrphaned ? {
                          bgcolor: isDark ? alpha(theme.palette.warning.main, 0.05) : alpha(theme.palette.warning.main, 0.03),
                        } : {}),
                      }}
                    >
                      {/* Menu Item */}
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>
                              {item.label}
                            </Typography>
                            {item.isOrphaned && (
                              <Tooltip title="Orphaned: no matching badgeKey in MenuItems.ts">
                                <IconAlertTriangle size={14} color={theme.palette.warning.main} />
                              </Tooltip>
                            )}
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                            {item.menuPath}
                          </Typography>
                        </Stack>
                      </TableCell>

                      {/* Badge Key */}
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: '0.78rem' }}>
                          {item.badgeKey}
                        </Typography>
                      </TableCell>

                      {/* Effective State */}
                      <TableCell>{renderEffectiveState(item)}</TableCell>

                      {/* DB State / Mode */}
                      <TableCell>
                        {item.badgeData ? (
                          <Stack spacing={0.25}>
                            <Typography variant="caption" sx={{ fontSize: '0.72rem' }}>
                              {item.badgeData.badge_state}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                              {item.badgeData.badge_mode}
                            </Typography>
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>

                      {/* Started */}
                      <TableCell>
                        <Typography variant="caption" sx={{ fontSize: '0.72rem' }}>
                          {formatDate(item.badgeData?.badge_started_at || null)}
                        </Typography>
                      </TableCell>

                      {/* Expires */}
                      <TableCell>
                        <Typography variant="caption" sx={{ fontSize: '0.72rem' }}>
                          {formatDate(item.badgeData?.badge_expires_at || null)}
                        </Typography>
                      </TableCell>

                      {/* Time Left */}
                      <TableCell>
                        <Typography
                          variant="caption"
                          fontFamily="monospace"
                          sx={{
                            fontSize: '0.72rem',
                            color: (() => {
                              const tl = timeUntilExpiry(item.badgeData?.badge_expires_at || null);
                              if (tl === 'Expired') return theme.palette.error.main;
                              if (tl !== '—') {
                                const d = parseInt(tl);
                                if (!isNaN(d) && d <= 1) return theme.palette.warning.main;
                              }
                              return undefined;
                            })(),
                          }}
                        >
                          {timeUntilExpiry(item.badgeData?.badge_expires_at || null)}
                        </Typography>
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right">
                        <Stack direction="row" spacing={0} justifyContent="flex-end">
                          {actionInProgress === item.badgeKey ? (
                            <CircularProgress size={16} sx={{ mx: 1 }} />
                          ) : (
                            <>
                              {/* Set badge */}
                              <Tooltip title="Set badge (NEW or UPDATED)">
                                <IconButton size="small" onClick={() => openSetDialog(item.badgeKey)} sx={{ p: 0.5 }}>
                                  <IconPlus size={15} />
                                </IconButton>
                              </Tooltip>

                              {/* Acknowledge — only if active */}
                              {item.badgeData && item.badgeData.visible_state !== 'none' && (
                                <Tooltip title="Acknowledge (suppress)">
                                  <IconButton size="small" onClick={() => handleAcknowledge(item.badgeKey)} sx={{ p: 0.5 }}>
                                    <IconBellOff size={15} />
                                  </IconButton>
                                </Tooltip>
                              )}

                              {/* Reset — only if has record */}
                              {item.badgeData && (
                                <Tooltip title="Reset badge lifecycle">
                                  <IconButton size="small" onClick={() => handleReset(item.badgeKey)} sx={{ p: 0.5 }}>
                                    <IconPlayerPlay size={15} />
                                  </IconButton>
                                </Tooltip>
                              )}

                              {/* Delete — only if has record */}
                              {item.badgeData && (
                                <Tooltip title="Delete badge entry">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDelete(item.badgeKey)}
                                    sx={{ p: 0.5, color: theme.palette.error.main }}
                                  >
                                    <IconTrash size={15} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* ── Orphan Notice ──────────────────────────────────── */}
        {stats.orphaned > 0 && filterState !== 'orphaned' && (
          <Alert
            severity="warning"
            icon={<IconAlertTriangle size={18} />}
            sx={{ mt: 2, borderRadius: 1.5 }}
            action={
              <Button size="small" color="inherit" onClick={() => setFilterState('orphaned')}>
                Show
              </Button>
            }
          >
            {stats.orphaned} orphaned badge record{stats.orphaned !== 1 ? 's' : ''} found
            (DB entries without matching menu items). These can be safely deleted.
          </Alert>
        )}

        {/* ── Legend ─────────────────────────────────────────── */}
        <Paper
          elevation={0}
          sx={{ mt: 2, p: 1.5, border: `1px solid ${borderColor}`, borderRadius: 1.5 }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            <strong>Lifecycle defaults:</strong> NEW badges expire after 14 days, UPDATED after 7 days.
            Acknowledged badges are immediately suppressed. Expired badges auto-clear.
            Use the Set action to create or restart a badge with optional custom duration.
          </Typography>
        </Paper>
      </Box>

      {/* ── Set Badge Dialog ──────────────────────────────────── */}
      <Dialog open={setDialogOpen} onClose={() => setSetDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          Set Badge State
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Item: <strong>{setDialogKey}</strong>
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Badge State</InputLabel>
              <Select
                value={setDialogState}
                label="Badge State"
                onChange={e => setSetDialogState(e.target.value as 'new' | 'recently_updated')}
              >
                <MenuItem value="new">NEW (default 14 days)</MenuItem>
                <MenuItem value="recently_updated">UPDATED (default 7 days)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Custom Duration (days)"
              type="number"
              value={setDialogDuration}
              onChange={e => setSetDialogDuration(e.target.value)}
              placeholder="Leave blank for default"
              fullWidth
              slotProps={{ htmlInput: { min: 1, max: 365 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSetDialogOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={confirmSetBadge} variant="contained" disableElevation>
            Set Badge
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ──────────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}
