/**
 * DynamicRecordsInspector — Dev tool for creating test churches and seeding records.
 * Route: /devel/dynamic-records
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Slider,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Church as ChurchIcon,
  Delete as DeleteIcon,
  PlayArrow as SeedIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Storage as DatabaseIcon,
} from '@mui/icons-material';
import { apiClient } from '@/shared/lib/axiosInstance';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Church {
  id: number;
  name: string;
  church_name?: string;
  database_name?: string;
}

interface Stats {
  totalRecords: number;
  byType: { baptism: number; marriage: number; funeral: number };
  byChurch: Record<string, { name: string; counts: Record<string, number> }>;
}

const RECORD_TYPES = [
  { key: 'baptism', label: 'Baptism', color: '#1976d2' },
  { key: 'marriage', label: 'Marriage', color: '#9c27b0' },
  { key: 'funeral', label: 'Funeral', color: '#546e7a' },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

const DynamicRecordsInspector: React.FC = () => {
  // setSeedCounts uses updater fn pattern — keep standalone
  const [seedCounts, setSeedCounts] = useState({ baptism: 100, marriage: 50, funeral: 50 });
  // toast kept standalone for clarity
  const [toast, setToast] = useState<{ msg: string; sev: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // ── Church + create dialog bucket ───────────────────────────────────────
  const [church, setChurch] = useState<{
    churches: Church[];
    churchId: string;
    loadingChurches: boolean;
    createDialogOpen: boolean;
    newChurchName: string;
    newChurchEmail: string;
    creating: boolean;
  }>({
    churches: [],
    churchId: '',
    loadingChurches: true,
    createDialogOpen: false,
    newChurchName: '',
    newChurchEmail: '',
    creating: false,
  });
  const setChurchField = useCallback(<K extends keyof typeof church>(key: K, value: typeof church[K]) => {
    setChurch(prev => ({ ...prev, [key]: value }));
  }, []);
  const setChurches = useCallback((v: Church[]) => setChurchField('churches', v), [setChurchField]);
  const setChurchId = useCallback((v: string) => setChurchField('churchId', v), [setChurchField]);
  const setLoadingChurches = useCallback((v: boolean) => setChurchField('loadingChurches', v), [setChurchField]);
  const setCreateDialogOpen = useCallback((v: boolean) => setChurchField('createDialogOpen', v), [setChurchField]);
  const setNewChurchName = useCallback((v: string) => setChurchField('newChurchName', v), [setChurchField]);
  const setNewChurchEmail = useCallback((v: string) => setChurchField('newChurchEmail', v), [setChurchField]);
  const setCreating = useCallback((v: boolean) => setChurchField('creating', v), [setChurchField]);
  const { churches, churchId, loadingChurches, createDialogOpen, newChurchName, newChurchEmail, creating } = church;

  // ── Stats + seeding bucket ──────────────────────────────────────────────
  const [statsSeed, setStatsSeed] = useState<{
    stats: Stats | null;
    loadingStats: boolean;
    yearRange: [number, number];
    seeding: boolean;
    seedProgress: { current: number; total: number; type: string } | null;
    purgeDialogOpen: boolean;
    purging: boolean;
  }>({
    stats: null,
    loadingStats: false,
    yearRange: [1940, 2024],
    seeding: false,
    seedProgress: null,
    purgeDialogOpen: false,
    purging: false,
  });
  const setStatsSeedField = useCallback(<K extends keyof typeof statsSeed>(key: K, value: typeof statsSeed[K]) => {
    setStatsSeed(prev => ({ ...prev, [key]: value }));
  }, []);
  const setStats = useCallback((v: Stats | null) => setStatsSeedField('stats', v), [setStatsSeedField]);
  const setLoadingStats = useCallback((v: boolean) => setStatsSeedField('loadingStats', v), [setStatsSeedField]);
  const setYearRange = useCallback((v: [number, number]) => setStatsSeedField('yearRange', v), [setStatsSeedField]);
  const setSeeding = useCallback((v: boolean) => setStatsSeedField('seeding', v), [setStatsSeedField]);
  const setSeedProgress = useCallback((v: { current: number; total: number; type: string } | null) => setStatsSeedField('seedProgress', v), [setStatsSeedField]);
  const setPurgeDialogOpen = useCallback((v: boolean) => setStatsSeedField('purgeDialogOpen', v), [setStatsSeedField]);
  const setPurging = useCallback((v: boolean) => setStatsSeedField('purging', v), [setStatsSeedField]);
  const { stats, loadingStats, yearRange, seeding, seedProgress, purgeDialogOpen, purging } = statsSeed;

  // ── Records browser bucket ──────────────────────────────────────────────
  const [recordsState, setRecordsState] = useState<{
    records: any[];
    recordsTotal: number;
    recordsPage: number;
    recordsPerPage: number;
    recordsFilter: string;
    recordsSearch: string;
    loadingRecords: boolean;
    showRecords: boolean;
  }>({
    records: [],
    recordsTotal: 0,
    recordsPage: 0,
    recordsPerPage: 50,
    recordsFilter: 'all',
    recordsSearch: '',
    loadingRecords: false,
    showRecords: false,
  });
  const setRecordsField = useCallback(<K extends keyof typeof recordsState>(key: K, value: typeof recordsState[K]) => {
    setRecordsState(prev => ({ ...prev, [key]: value }));
  }, []);
  const setRecords = useCallback((v: any[]) => setRecordsField('records', v), [setRecordsField]);
  const setRecordsTotal = useCallback((v: number) => setRecordsField('recordsTotal', v), [setRecordsField]);
  const setRecordsPage = useCallback((v: number) => setRecordsField('recordsPage', v), [setRecordsField]);
  const setRecordsPerPage = useCallback((v: number) => setRecordsField('recordsPerPage', v), [setRecordsField]);
  const setRecordsFilter = useCallback((v: string) => setRecordsField('recordsFilter', v), [setRecordsField]);
  const setRecordsSearch = useCallback((v: string) => setRecordsField('recordsSearch', v), [setRecordsField]);
  const setLoadingRecords = useCallback((v: boolean) => setRecordsField('loadingRecords', v), [setRecordsField]);
  const setShowRecords = useCallback((v: boolean) => setRecordsField('showRecords', v), [setRecordsField]);
  const { records, recordsTotal, recordsPage, recordsPerPage, recordsFilter, recordsSearch, loadingRecords, showRecords } = recordsState;

  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  // ── Helpers ──
  const notify = useCallback((msg: string, sev: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ msg, sev });
  }, []);

  const selectedChurch = churches.find((c) => String(c.id) === churchId);
  const churchDisplayName = selectedChurch?.church_name || selectedChurch?.name || '';

  // ── Load churches ──
  const loadChurches = useCallback(async () => {
    setLoadingChurches(true);
    try {
      const res: any = await apiClient.get('/api/admin/records-inspector/churches');
      const list = res?.data?.churches || [];
      setChurches(Array.isArray(list) ? list : []);
    } catch {
      setChurches([]);
    }
    setLoadingChurches(false);
  }, []);

  useEffect(() => {
    loadChurches();
  }, [loadChurches]);

  // ── Load stats when church changes ──
  const loadStats = useCallback(async () => {
    if (!churchId) { setStats(null); return; }
    setLoadingStats(true);
    try {
      const res: any = await apiClient.get(`/api/admin/records-inspector/summary?church_id=${churchId}`);
      const d = res?.data || {};
      setStats({
        totalRecords: d.totalRecords || 0,
        byType: d.byType || { baptism: 0, marriage: 0, funeral: 0 },
        byChurch: d.byChurch || {},
      });
    } catch {
      setStats(null);
    }
    setLoadingStats(false);
  }, [churchId]);

  useEffect(() => {
    loadStats();
    setShowRecords(false);
    setRecords([]);
  }, [churchId, loadStats]);

  // ── Load records ──
  const loadRecords = useCallback(async () => {
    if (!churchId) return;
    setLoadingRecords(true);
    try {
      const params = new URLSearchParams({ church_id: churchId, page: String(recordsPage + 1), limit: String(recordsPerPage) });
      if (recordsFilter !== 'all') params.set('type', recordsFilter);
      if (recordsSearch) params.set('search', recordsSearch);
      const res: any = await apiClient.get(`/api/admin/records-inspector/records?${params}`);
      const d = res?.data || {};
      setRecords(d.records || []);
      setRecordsTotal(d.totalCount || 0);
    } catch {
      setRecords([]);
      setRecordsTotal(0);
    }
    setLoadingRecords(false);
  }, [churchId, recordsPage, recordsPerPage, recordsFilter, recordsSearch]);

  useEffect(() => {
    if (showRecords) loadRecords();
  }, [showRecords, loadRecords]);

  // ── Create church ──
  const handleCreateChurch = async () => {
    if (!newChurchName.trim()) { notify('Enter a church name', 'warning'); return; }
    setCreating(true);
    try {
      const res: any = await apiClient.post('/api/admin/records-inspector/provision-church', {
        name: newChurchName.trim(),
        email: newChurchEmail.trim() || undefined,
      });
      const d = res?.data || {};
      notify(`Created "${d.name}" → ${d.database_name}`, 'success');
      setCreateDialogOpen(false);
      setNewChurchName('');
      setNewChurchEmail('');
      await loadChurches();
      // Select the new church
      if (d.church_id) setChurchId(String(d.church_id));
    } catch (err: any) {
      notify(err?.response?.data?.error || 'Failed to create church', 'error');
    }
    setCreating(false);
  };

  // ── Seed all 3 types ──
  const handleSeedAll = async () => {
    if (!churchId) { notify('Select a church first', 'warning'); return; }
    const types = RECORD_TYPES.filter((t) => seedCounts[t.key] > 0);
    if (types.length === 0) { notify('Set at least one record count > 0', 'warning'); return; }

    setSeeding(true);
    const totalTypes = types.length;
    let completed = 0;
    const results: string[] = [];

    for (const t of types) {
      setSeedProgress({ current: completed + 1, total: totalTypes, type: t.label });
      try {
        const res: any = await apiClient.post('/api/admin/seed-records', {
          church_id: parseInt(churchId),
          record_type: t.key,
          count: seedCounts[t.key],
          year_start: yearRange[0],
          year_end: yearRange[1],
        });
        const d = res?.data || res;
        results.push(`${t.label}: ${d.inserted}`);
      } catch (err: any) {
        results.push(`${t.label}: FAILED`);
      }
      completed++;
    }

    setSeedProgress(null);
    setSeeding(false);
    notify(`Seeded records — ${results.join(', ')}`, 'success');
    loadStats();
    if (showRecords) loadRecords();
  };

  // ── Purge all records from church ──
  const handlePurgeAll = async () => {
    if (!churchId) return;
    setPurging(true);
    const results: string[] = [];
    for (const t of RECORD_TYPES) {
      try {
        const res: any = await apiClient.post('/api/admin/seed-records', {
          church_id: parseInt(churchId),
          record_type: t.key,
          count: 0,
          purge: true,
        });
        const d = res?.data || res;
        results.push(`${t.label}: ${d.deleted || 0} deleted`);
      } catch {
        results.push(`${t.label}: failed`);
      }
    }
    setPurging(false);
    setPurgeDialogOpen(false);
    notify(`Purged — ${results.join(', ')}`, 'success');
    loadStats();
    if (showRecords) loadRecords();
  };

  // ── Debounced search ──
  const handleSearchChange = (val: string) => {
    setRecordsSearch(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setRecordsPage(0);
    }, 400);
  };

  // ── Render ──
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* ── Header ── */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
          <DatabaseIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          <Typography variant="h5" fontWeight={700}>Records Inspector</Typography>
          <Chip label="Dev Tool" size="small" color="warning" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Create test churches, seed records, inspect data.
        </Typography>
      </Box>

      {/* ── Church Selector ── */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 320, flex: 1 }}>
              <InputLabel>Select Church</InputLabel>
              <Select
                value={churchId}
                label="Select Church"
                onChange={(e) => setChurchId(e.target.value)}
                disabled={loadingChurches}
              >
                {loadingChurches ? (
                  <MenuItem disabled>Loading...</MenuItem>
                ) : churches.length === 0 ? (
                  <MenuItem disabled>No churches found</MenuItem>
                ) : (
                  churches.map((c) => (
                    <MenuItem key={c.id} value={String(c.id)}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={c.id} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', minWidth: 32 }} />
                        <span>{c.church_name || c.name}</span>
                        {c.database_name && (
                          <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                            {c.database_name}
                          </Typography>
                        )}
                      </Stack>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{ whiteSpace: 'nowrap' }}
              size="small"
            >
              New Church
            </Button>
            <Tooltip title="Refresh churches">
              <IconButton size="small" onClick={loadChurches} disabled={loadingChurches}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </CardContent>
      </Card>

      {/* ── Main content: only show when a church is selected ── */}
      {!churchId ? (
        <Card variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <ChurchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            Select a church above or create a new one to get started.
          </Typography>
        </Card>
      ) : (
        <Stack spacing={3}>
          {/* ── Stats Cards ── */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                Record Counts — {churchDisplayName}
              </Typography>
              <Tooltip title="Refresh stats">
                <IconButton size="small" onClick={loadStats} disabled={loadingStats}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            {loadingStats ? (
              <LinearProgress sx={{ borderRadius: 1 }} />
            ) : stats ? (
              <Stack direction="row" spacing={2}>
                {RECORD_TYPES.map((t) => (
                  <Card key={t.key} variant="outlined" sx={{ flex: 1, borderLeft: `4px solid ${t.color}` }}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {t.label}
                      </Typography>
                      <Typography variant="h4" fontWeight={700} sx={{ color: t.color }}>
                        {(stats.byType[t.key] || 0).toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
                <Card variant="outlined" sx={{ flex: 1, borderLeft: '4px solid #333', bgcolor: 'action.hover' }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Total
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {(stats.totalRecords || 0).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Stack>
            ) : (
              <Alert severity="info" variant="outlined">Unable to load statistics.</Alert>
            )}
          </Box>

          {/* ── Seed Controls ── */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem', mb: 2 }}>
                Seed Records
              </Typography>

              {/* Count inputs per type */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                {RECORD_TYPES.map((t) => (
                  <TextField
                    key={t.key}
                    label={t.label}
                    type="number"
                    size="small"
                    value={seedCounts[t.key]}
                    onChange={(e) =>
                      setSeedCounts((prev) => ({
                        ...prev,
                        [t.key]: Math.min(5000, Math.max(0, parseInt(e.target.value) || 0)),
                      }))
                    }
                    inputProps={{ min: 0, max: 5000 }}
                    sx={{ flex: 1 }}
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ width: 4, height: 24, borderRadius: 1, bgcolor: t.color, mr: 1, flexShrink: 0 }} />
                      ),
                    }}
                  />
                ))}
              </Stack>

              {/* Year range slider */}
              <Box sx={{ px: 1, mb: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Year Range: {yearRange[0]} — {yearRange[1]}
                </Typography>
                <Slider
                  value={yearRange}
                  onChange={(_, v) => setYearRange(v as [number, number])}
                  min={1800}
                  max={2026}
                  valueLabelDisplay="auto"
                  sx={{ mt: 0.5 }}
                />
              </Box>

              {/* Action buttons */}
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Button
                  variant="contained"
                  startIcon={seeding ? <CircularProgress size={16} color="inherit" /> : <SeedIcon />}
                  onClick={handleSeedAll}
                  disabled={seeding || Object.values(seedCounts).every((v) => v === 0)}
                  size="medium"
                >
                  {seeding ? 'Seeding...' : `Seed ${Object.values(seedCounts).reduce((a, b) => a + b, 0).toLocaleString()} Records`}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setPurgeDialogOpen(true)}
                  disabled={seeding}
                  size="medium"
                >
                  Purge All
                </Button>
              </Stack>

              {/* Progress indicator */}
              {seedProgress && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Seeding {seedProgress.type} ({seedProgress.current}/{seedProgress.total})...
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(seedProgress.current / seedProgress.total) * 100}
                    sx={{ mt: 0.5, borderRadius: 1 }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>

          {/* ── Records Browser ── */}
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: showRecords ? 2 : 0 }}>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                  Records Browser
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setShowRecords(!showRecords)}
                >
                  {showRecords ? 'Hide' : 'Show Records'}
                </Button>
              </Stack>

              {showRecords && (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={recordsFilter}
                        label="Type"
                        onChange={(e) => { setRecordsFilter(e.target.value); setRecordsPage(0); }}
                      >
                        <MenuItem value="all">All Types</MenuItem>
                        {RECORD_TYPES.map((t) => (
                          <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      placeholder="Search by name..."
                      value={recordsSearch}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      InputProps={{
                        startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18 }} />,
                      }}
                      sx={{ flex: 1 }}
                    />
                    <Tooltip title="Refresh">
                      <IconButton size="small" onClick={loadRecords} disabled={loadingRecords}>
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  {loadingRecords ? (
                    <LinearProgress sx={{ borderRadius: 1 }} />
                  ) : records.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                      No records found.
                    </Typography>
                  ) : (
                    <>
                      <TableContainer sx={{ maxHeight: 400 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700, width: 60 }}>ID</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: 100 }}>Type</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Church</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: 120 }}>Created</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {records.map((r, i) => (
                              <TableRow key={`${r.churchId}-${r.type}-${r.id}-${i}`} hover>
                                <TableCell>{r.id}</TableCell>
                                <TableCell>
                                  <Chip
                                    label={r.type}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.65rem',
                                      bgcolor: RECORD_TYPES.find((t) => t.key === r.type)?.color + '18',
                                      color: RECORD_TYPES.find((t) => t.key === r.type)?.color,
                                      fontWeight: 600,
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{r.churchName || 'N/A'}</TableCell>
                                <TableCell sx={{ fontSize: '0.8rem' }}>
                                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <TablePagination
                        component="div"
                        count={recordsTotal}
                        page={recordsPage}
                        onPageChange={(_, p) => setRecordsPage(p)}
                        rowsPerPage={recordsPerPage}
                        onRowsPerPageChange={(e) => { setRecordsPerPage(parseInt(e.target.value)); setRecordsPage(0); }}
                        rowsPerPageOptions={[25, 50, 100]}
                      />
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* ── Create Church Dialog ── */}
      <Dialog open={createDialogOpen} onClose={() => !creating && setCreateDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ChurchIcon color="primary" />
            <span>Create Test Church</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will create a new church database with baptism, marriage, and funeral record tables ready for seeding.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Church Name"
              fullWidth
              size="small"
              value={newChurchName}
              onChange={(e) => setNewChurchName(e.target.value)}
              placeholder="e.g. Holy Trinity Test Church"
              autoFocus
              disabled={creating}
            />
            <TextField
              label="Admin Email (optional)"
              fullWidth
              size="small"
              value={newChurchEmail}
              onChange={(e) => setNewChurchEmail(e.target.value)}
              placeholder="admin@example.com"
              disabled={creating}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={creating}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateChurch}
            disabled={creating || !newChurchName.trim()}
            startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
          >
            {creating ? 'Creating...' : 'Create Church'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Purge Confirmation Dialog ── */}
      <Dialog open={purgeDialogOpen} onClose={() => !purging && setPurgeDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Purge All Records?</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 1 }}>
            This will permanently delete <strong>all</strong> baptism, marriage, and funeral records from <strong>{churchDisplayName}</strong>.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurgeDialogOpen(false)} disabled={purging}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handlePurgeAll}
            disabled={purging}
            startIcon={purging ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            {purging ? 'Purging...' : 'Purge All Records'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Toast ── */}
      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? (
          <Alert severity={toast.sev} onClose={() => setToast(null)} variant="filled" sx={{ width: '100%' }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};

export default DynamicRecordsInspector;
