/**
 * OCR Operations Console — Super Admin OCR Ops Dashboard
 *
 * Route:        /devel/ocr-activity-monitor
 * Component:    front-end/src/features/admin/OcrActivityMonitor.tsx
 *
 * Backend API (all super_admin protected):
 *   GET  /api/ocr/monitor/jobs?status=&church_id=&q=&stale=1&page=&pageSize=&sort=&sortDir=&hideArchived=
 *        → { rows, total, page, pageSize, counts, churches }
 *   GET  /api/ocr/monitor/jobs/:churchId/:jobId          → { job } (full detail + file check)
 *   POST /api/ocr/monitor/jobs/:churchId/:jobId/kill     { reason }
 *   POST /api/ocr/monitor/jobs/:churchId/:jobId/reprocess
 *   POST /api/ocr/monitor/jobs/:churchId/:jobId/clear    { reason }
 *   POST /api/ocr/monitor/jobs/bulk                      { action, items, reason }
 *   POST /api/ocr/monitor/jobs/cleanup-stale             { maxAgeSeconds }
 *
 * DB tables:
 *   orthodoxmetrics_db.churches (read: id, name, database_name)
 *   om_church_##.ocr_jobs (read/write per church schema)
 *   Runtime-migrated columns: processing_started_at, processing_ended_at, killed_at,
 *     killed_by, kill_reason, worker_id, error_json, retry_count, archived_at,
 *     archived_by, archived_reason
 */

import { apiClient } from '@/shared/lib/axiosInstance';
import PageContainer from '@/shared/ui/PageContainer';
import {
    Alert,
    alpha,
    Autocomplete,
    Box,
    Button,
    Card, CardContent,
    Checkbox,
    Chip,
    CircularProgress, Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    FormLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Pagination,
    Paper,
    Radio,
    RadioGroup,
    Select,
    Snackbar,
    Stack,
    Switch,
    Tab,
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow,
    Tabs,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import {
    IconActivity, IconAlertTriangle,
    IconArchive,
    IconCheck,
    IconClearAll,
    IconClock,
    IconCopy,
    IconDownload,
    IconEye,
    IconFile,
    IconFileOff,
    IconPlayerPlay,
    IconRefresh, IconSearch,
    IconSkull, IconTrash,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import OcrStudioNav from '../devel-tools/om-ocr/components/OcrStudioNav';

// ── Types ──────────────────────────────────────────────────────────────────

interface OcrJob {
  id: number;
  church_id: number;
  church_name: string;
  schema_name: string;
  status: string;
  record_type: string;
  language: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  confidence_score: number | null;
  error: string | null;
  error_json: any;
  created_at: string;
  updated_at: string;
  processing_started_at: string | null;
  processing_ended_at: string | null;
  processing_age_seconds: number | null;
  killed_at: string | null;
  killed_by: number | null;
  kill_reason: string | null;
  worker_id: string | null;
  retry_count: number;
  archived_at: string | null;
  archived_by: number | null;
  archived_reason: string | null;
  // detail-only
  ocr_result_json?: string;
  file_exists?: boolean;
  file_size_disk?: number | null;
}

interface ChurchOption { id: number; name: string; }
interface Counts { queued: number; processing: number; completed: number; failed: number; stale: number; }
interface ListResponse { rows: OcrJob[]; total: number; page: number; pageSize: number; counts: Counts; churches: ChurchOption[]; }

// ── Helpers ────────────────────────────────────────────────────────────────

const sColor = (s: string, t: any) => {
  if (s === 'completed' || s === 'complete') return t.palette.success.main;
  if (s === 'processing') return t.palette.warning.main;
  if (s === 'queued' || s === 'pending') return t.palette.info.main;
  if (s === 'failed' || s === 'error') return t.palette.error.main;
  return t.palette.text.secondary;
};
const fmtAge = (s: number | null) => { if (s == null) return '—'; if (s < 60) return `${s}s`; if (s < 3600) return `${Math.floor(s/60)}m ${s%60}s`; return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`; };
const fmtDate = (iso: string | null) => { if (!iso) return '—'; try { return new Date(iso).toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' }); } catch { return iso; } };
const jobKey = (j: OcrJob) => `${j.church_id}-${j.id}`;
const isActionable = (s: string) => ['processing','queued','pending'].includes(s);
const isFailed = (s: string) => ['failed','error'].includes(s);
const isReprocessable = (s: string) => ['failed','error','queued','pending'].includes(s);

// ── Component ──────────────────────────────────────────────────────────────

const OcrActivityMonitor: React.FC = () => {
  const theme = useTheme();

  const pageSize = 50;

  // ── Data bucket ──────────────────────────────────────────────────────────
  const [data, setData] = useState<{
    jobs: OcrJob[];
    counts: Counts;
    total: number;
    churches: ChurchOption[];
    loading: boolean;
    fetchError: string | null;
    lastRefresh: Date | null;
  }>({
    jobs: [],
    counts: { queued:0, processing:0, completed:0, failed:0, stale:0 },
    total: 0,
    churches: [],
    loading: false,
    fetchError: null,
    lastRefresh: null,
  });
  const setDataField = useCallback(<K extends keyof typeof data>(key: K, value: typeof data[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, []);
  const setJobs = useCallback((v: OcrJob[]) => setDataField('jobs', v), [setDataField]);
  const setCounts = useCallback((v: Counts) => setDataField('counts', v), [setDataField]);
  const setTotal = useCallback((v: number) => setDataField('total', v), [setDataField]);
  const setChurches = useCallback((v: ChurchOption[]) => setDataField('churches', v), [setDataField]);
  const setLoading = useCallback((v: boolean) => setDataField('loading', v), [setDataField]);
  const setFetchError = useCallback((v: string | null) => setDataField('fetchError', v), [setDataField]);
  const setLastRefresh = useCallback((v: Date | null) => setDataField('lastRefresh', v), [setDataField]);
  const { jobs, counts, total, churches, loading, fetchError, lastRefresh } = data;

  // ── Filters bucket ───────────────────────────────────────────────────────
  const [filters, setFilters] = useState<{
    statusFilter: string;
    churchFilter: ChurchOption | null;
    searchQ: string;
    staleOnly: boolean;
    autoRefresh: boolean;
    page: number;
  }>({
    statusFilter: '',
    churchFilter: null,
    searchQ: '',
    staleOnly: false,
    autoRefresh: true,
    page: 1,
  });
  const setFiltersField = useCallback(<K extends keyof typeof filters>(key: K, value: typeof filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  const setStatusFilter = useCallback((v: string) => setFiltersField('statusFilter', v), [setFiltersField]);
  const setChurchFilter = useCallback((v: ChurchOption | null) => setFiltersField('churchFilter', v), [setFiltersField]);
  const setSearchQ = useCallback((v: string) => setFiltersField('searchQ', v), [setFiltersField]);
  const setStaleOnly = useCallback((v: boolean) => setFiltersField('staleOnly', v), [setFiltersField]);
  const setAutoRefresh = useCallback((v: boolean) => setFiltersField('autoRefresh', v), [setFiltersField]);
  const setPage = useCallback((v: number) => setFiltersField('page', v), [setFiltersField]);
  const { statusFilter, churchFilter, searchQ, staleOnly, autoRefresh, page } = filters;

  // ── Selection (SetStateAction wrapper for toggleSelect prev pattern) ─────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── Dialogs bucket ───────────────────────────────────────────────────────
  const [dialogs, setDialogs] = useState<{
    killTarget: OcrJob | null;
    killReason: string;
    killing: boolean;
    bulkDialog: {action:'kill'|'reprocess'|'clear', count:number} | null;
    bulkReason: string;
    bulkRunning: boolean;
    detailJob: OcrJob | null;
    detailLoading: boolean;
    detailTab: number;
  }>({
    killTarget: null,
    killReason: '',
    killing: false,
    bulkDialog: null,
    bulkReason: '',
    bulkRunning: false,
    detailJob: null,
    detailLoading: false,
    detailTab: 0,
  });
  const setDialogsField = useCallback(<K extends keyof typeof dialogs>(key: K, value: typeof dialogs[K]) => {
    setDialogs(prev => ({ ...prev, [key]: value }));
  }, []);
  const setKillTarget = useCallback((v: OcrJob | null) => setDialogsField('killTarget', v), [setDialogsField]);
  const setKillReason = useCallback((v: string) => setDialogsField('killReason', v), [setDialogsField]);
  const setKilling = useCallback((v: boolean) => setDialogsField('killing', v), [setDialogsField]);
  const setBulkDialog = useCallback((v: {action:'kill'|'reprocess'|'clear', count:number} | null) => setDialogsField('bulkDialog', v), [setDialogsField]);
  const setBulkReason = useCallback((v: string) => setDialogsField('bulkReason', v), [setDialogsField]);
  const setBulkRunning = useCallback((v: boolean) => setDialogsField('bulkRunning', v), [setDialogsField]);
  const setDetailJob = useCallback((v: OcrJob | null) => setDialogsField('detailJob', v), [setDialogsField]);
  const setDetailLoading = useCallback((v: boolean) => setDialogsField('detailLoading', v), [setDialogsField]);
  const setDetailTab = useCallback((v: number) => setDialogsField('detailTab', v), [setDialogsField]);
  const { killTarget, killReason, killing, bulkDialog, bulkReason, bulkRunning, detailJob, detailLoading, detailTab } = dialogs;

  // ── Toast ────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{msg:string; severity:'success'|'error'|'info'}|null>(null);

  // Polling
  const pollRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const mountedRef = useRef(true);
  const modalOpenRef = useRef(false);
  modalOpenRef.current = !!(killTarget || bulkDialog || detailJob);

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchJobs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setFetchError(null);
    try {
      const p = new URLSearchParams();
      if (statusFilter) p.set('status', statusFilter);
      if (churchFilter) p.set('church_id', String(churchFilter.id));
      if (searchQ.trim()) p.set('q', searchQ.trim());
      if (staleOnly) p.set('stale', '1');
      p.set('page', String(page));
      p.set('pageSize', String(pageSize));

      const res: any = await apiClient.get(`/api/ocr/monitor/jobs?${p.toString()}`);
      const data: ListResponse = res?.data ?? res;

      if (mountedRef.current) {
        setJobs(data.rows || []);
        setCounts(data.counts || { queued:0, processing:0, completed:0, failed:0, stale:0 });
        setTotal(data.total || 0);
        if (data.churches) setChurches(data.churches);
        setLastRefresh(new Date());
      }
    } catch (e: any) {
      if (mountedRef.current) setFetchError(e?.response?.data?.error || e?.message || 'Failed to fetch');
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  }, [statusFilter, churchFilter, searchQ, staleOnly, page]);

  useEffect(() => { mountedRef.current = true; fetchJobs(); return () => { mountedRef.current = false; }; }, [fetchJobs]);

  useEffect(() => {
    if (pollRef.current) clearTimeout(pollRef.current);
    if (!autoRefresh) return;
    const interval = (counts.processing > 0 || counts.queued > 0) ? 5000 : 15000;
    pollRef.current = setTimeout(() => {
      if (mountedRef.current && !modalOpenRef.current) fetchJobs(true);
    }, interval);
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [jobs, counts, fetchJobs, autoRefresh]);

  // ── Job Detail ─────────────────────────────────────────────────────────

  const openDetail = async (job: OcrJob) => {
    setDetailJob(job);
    setDetailTab(0);
    setDetailLoading(true);
    try {
      const res: any = await apiClient.get(`/api/ocr/monitor/jobs/${job.church_id}/${job.id}`);
      const data = res?.data ?? res;
      if (data.job) setDetailJob(data.job);
    } catch { /* keep list-level data */ }
    finally { setDetailLoading(false); }
  };

  // ── Single Actions ─────────────────────────────────────────────────────

  const handleKill = async () => {
    if (!killTarget) return;
    setKilling(true);
    try {
      await apiClient.post(`/api/ocr/monitor/jobs/${killTarget.church_id}/${killTarget.id}/kill`, { reason: killReason || 'Killed by admin' });
      setToast({ msg: `Killed job #${killTarget.id}`, severity: 'success' });
      setKillTarget(null); setKillReason(''); fetchJobs(true);
    } catch (e: any) { setToast({ msg: e?.response?.data?.error || 'Kill failed', severity: 'error' }); }
    finally { setKilling(false); }
  };

  const handleReprocess = async (job: OcrJob) => {
    try {
      await apiClient.post(`/api/ocr/monitor/jobs/${job.church_id}/${job.id}/reprocess`);
      setToast({ msg: `Job #${job.id} re-queued`, severity: 'success' });
      fetchJobs(true);
      if (detailJob?.id === job.id) setDetailJob(null);
    } catch (e: any) { setToast({ msg: e?.response?.data?.error || 'Reprocess failed', severity: 'error' }); }
  };

  const handleClear = async (job: OcrJob) => {
    try {
      await apiClient.post(`/api/ocr/monitor/jobs/${job.church_id}/${job.id}/clear`, { reason: 'Archived from console' });
      setToast({ msg: `Job #${job.id} archived`, severity: 'success' });
      fetchJobs(true);
      if (detailJob?.id === job.id) setDetailJob(null);
    } catch (e: any) { setToast({ msg: e?.response?.data?.error || 'Archive failed', severity: 'error' }); }
  };

  const handleCleanupStale = async () => {
    try {
      const res: any = await apiClient.post('/api/ocr/monitor/jobs/cleanup-stale', { maxAgeSeconds: 90 });
      const data = res?.data ?? res;
      setToast({ msg: `Cleaned ${data.cleaned || 0} stale jobs`, severity: 'success' });
      fetchJobs(true);
    } catch (e: any) { setToast({ msg: e?.response?.data?.error || 'Cleanup failed', severity: 'error' }); }
  };

  // ── Bulk Actions ───────────────────────────────────────────────────────

  const selectedJobs = jobs.filter(j => selected.has(jobKey(j)));
  const selectedActionable = selectedJobs.filter(j => isActionable(j.status));
  const selectedFailed = selectedJobs.filter(j => isFailed(j.status));
  const selectedReprocessable = selectedJobs.filter(j => isReprocessable(j.status));
  const allSelected = jobs.length > 0 && jobs.every(j => selected.has(jobKey(j)));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleSelect = (key: string) => setSelected(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(jobs.map(jobKey)));
  };

  const handleBulk = async () => {
    if (!bulkDialog) return;
    setBulkRunning(true);
    try {
      let itemsForAction: OcrJob[] = [];
      if (bulkDialog.action === 'kill') itemsForAction = selectedActionable;
      else if (bulkDialog.action === 'reprocess') itemsForAction = selectedReprocessable;
      else itemsForAction = selectedFailed;

      const res: any = await apiClient.post('/api/ocr/monitor/jobs/bulk', {
        action: bulkDialog.action,
        items: itemsForAction.map(j => ({ churchId: j.church_id, jobId: j.id })),
        reason: bulkReason || `Bulk ${bulkDialog.action} from console`,
      });
      const data = res?.data ?? res;
      setToast({ msg: `${bulkDialog.action}: ${data.totalAffected || 0} jobs affected`, severity: 'success' });
      setBulkDialog(null); setBulkReason(''); setSelected(new Set()); fetchJobs(true);
    } catch (e: any) { setToast({ msg: e?.response?.data?.error || 'Bulk action failed', severity: 'error' }); }
    finally { setBulkRunning(false); }
  };

  // ── CSV Export ─────────────────────────────────────────────────────────

  const exportCSV = () => {
    const headers = ['church_id','church_name','job_id','status','record_type','filename','error','created_at','updated_at','processing_started_at','processing_ended_at'];
    const csvRows = [headers.join(',')];
    for (const j of jobs) {
      csvRows.push([j.church_id, `"${(j.church_name||'').replace(/"/g,'""')}"`, j.id, j.status, j.record_type,
        `"${(j.original_filename||j.filename||'').replace(/"/g,'""')}"`, `"${(j.error||'').replace(/"/g,'""')}"`,
        j.created_at, j.updated_at, j.processing_started_at||'', j.processing_ended_at||''].join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `ocr-jobs-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    setToast({ msg: `Exported ${jobs.length} rows`, severity: 'info' });
  };

  // ── Copy helper + Clear Processed bucket ─────────────────────────────────
  const [misc, setMisc] = useState<{
    copied: boolean;
    clearProcOpen: boolean;
    clearProcScope: 'selected'|'all';
    clearProcFiles: 'db'|'db+files';
    clearProcRunning: boolean;
  }>({
    copied: false,
    clearProcOpen: false,
    clearProcScope: 'all',
    clearProcFiles: 'db',
    clearProcRunning: false,
  });
  const setMiscField = useCallback(<K extends keyof typeof misc>(key: K, value: typeof misc[K]) => {
    setMisc(prev => ({ ...prev, [key]: value }));
  }, []);
  const setCopied = useCallback((v: boolean) => setMiscField('copied', v), [setMiscField]);
  const setClearProcOpen = useCallback((v: boolean) => setMiscField('clearProcOpen', v), [setMiscField]);
  const setClearProcScope = useCallback((v: 'selected'|'all') => setMiscField('clearProcScope', v), [setMiscField]);
  const setClearProcFiles = useCallback((v: 'db'|'db+files') => setMiscField('clearProcFiles', v), [setMiscField]);
  const setClearProcRunning = useCallback((v: boolean) => setMiscField('clearProcRunning', v), [setMiscField]);
  const { copied, clearProcOpen, clearProcScope, clearProcFiles, clearProcRunning } = misc;

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  const selectedCompleted = selectedJobs.filter(j => ['completed','complete'].includes(j.status));

  const handleClearProcessed = async () => {
    setClearProcRunning(true);
    try {
      const payload: any = {
        deleteFiles: clearProcFiles === 'db+files',
      };
      if (clearProcScope === 'selected') {
        payload.jobIds = selectedCompleted.map(j => j.id);
      } else {
        if (churchFilter) payload.churchId = churchFilter.id;
      }
      const res: any = await apiClient.post('/api/ocr/monitor/jobs/clear-processed', payload);
      const data = res?.data ?? res;
      const msg = `Cleared ${data.deleted || 0} processed job(s)${data.filesRemoved ? ` · ${data.filesRemoved} file(s) removed` : ''}${data.capped ? ' · More remain, run again' : ''}`;
      setToast({ msg, severity: 'success' });
      setClearProcOpen(false);
      setSelected(new Set());
      fetchJobs(true);
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Clear processed failed', severity: 'error' });
    } finally {
      setClearProcRunning(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(total / pageSize);

  return (
    <PageContainer title="OCR Operations Console" description="Super Admin OCR job monitoring and operations">
      <OcrStudioNav />
      <Box sx={{ p: { xs: 1, sm: 2 } }}>

        {/* ═══ SUMMARY BAR ════════════════════════════════════════════════════ */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconActivity size={24} />
            <Typography variant="h5" fontWeight={700}>OCR Operations Console</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" alignItems="center">
            <Chip size="small" label={`${counts.processing} Processing`} sx={{ bgcolor: alpha(theme.palette.warning.main, 0.15), color: theme.palette.warning.main, fontWeight: 600 }} />
            <Chip size="small" label={`${counts.queued} Queued`} sx={{ bgcolor: alpha(theme.palette.info.main, 0.15), color: theme.palette.info.main, fontWeight: 600 }} />
            <Chip size="small" label={`${counts.failed} Failed`} sx={{ bgcolor: alpha(theme.palette.error.main, 0.15), color: theme.palette.error.main, fontWeight: 600 }} />
            <Chip size="small" label={`${counts.completed} Completed`} sx={{ bgcolor: alpha(theme.palette.success.main, 0.15), color: theme.palette.success.main, fontWeight: 600 }} />
            {counts.stale > 0 && <Chip size="small" icon={<IconAlertTriangle size={14} />} label={`${counts.stale} Stale`} color="error" variant="outlined" sx={{ fontWeight: 600 }} />}
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Typography variant="caption" color="text.secondary">
              {lastRefresh ? `Last: ${fmtDate(lastRefresh.toISOString())}` : '—'}
            </Typography>
            <FormControlLabel
              control={<Switch size="small" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
              label={<Typography variant="caption">Auto</Typography>}
              sx={{ ml: 0.5, mr: 0 }}
            />
          </Stack>
        </Stack>

        {/* ═══ ACTION BAR ═════════════════════════════════════════════════════ */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
          <Button size="small" variant="outlined" startIcon={<IconRefresh size={16} />} onClick={() => fetchJobs()}>Refresh</Button>
          {counts.stale > 0 && <Button size="small" variant="contained" color="error" startIcon={<IconTrash size={16} />} onClick={handleCleanupStale}>Cleanup Stale ({counts.stale})</Button>}
          <Button size="small" variant="outlined" startIcon={<IconDownload size={16} />} onClick={exportCSV} disabled={jobs.length === 0}>Export CSV</Button>
          {counts.completed > 0 && (
            <Button size="small" variant="contained" color="warning" startIcon={<IconClearAll size={16} />}
              onClick={() => { setClearProcScope('all'); setClearProcFiles('db'); setClearProcOpen(true); }}>
              Clear Processed ({counts.completed})
            </Button>
          )}
        </Stack>

        {/* ═══ FILTERS ════════════════════════════════════════════════════════ */}
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
              <Autocomplete
                size="small"
                options={churches}
                getOptionLabel={(o) => `${o.name} (#${o.id})`}
                value={churchFilter}
                onChange={(_, v) => { setChurchFilter(v); setPage(1); }}
                renderInput={(params) => <TextField {...params} label="Church" placeholder="All churches" />}
                sx={{ minWidth: 240 }}
                isOptionEqualToValue={(o, v) => o.id === v.id}
              />
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="queued">Queued</MenuItem>
                  <MenuItem value="processing">Processing</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
              <TextField size="small" label="Search" placeholder="filename, job id, error…" value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchJobs(); } }}
                InputProps={{ endAdornment: <IconSearch size={16} /> }}
                sx={{ minWidth: 200 }}
              />
              <FormControlLabel
                control={<Switch size="small" checked={staleOnly} onChange={(e) => { setStaleOnly(e.target.checked); setPage(1); }} />}
                label={<Typography variant="body2">Stale only</Typography>}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* ═══ BULK TOOLBAR ═══════════════════════════════════════════════════ */}
        {selected.size > 0 && (
          <Card sx={{ mb: 2, bgcolor: alpha(theme.palette.primary.main, 0.06), border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
            <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" fontWeight={600}>{selected.size} selected</Typography>
                <Divider orientation="vertical" flexItem />
                {selectedActionable.length > 0 && (
                  <Button size="small" color="error" variant="contained" startIcon={<IconSkull size={14} />}
                    onClick={() => { setBulkDialog({ action:'kill', count: selectedActionable.length }); setBulkReason(''); }}>
                    Kill ({selectedActionable.length})
                  </Button>
                )}
                {selectedReprocessable.length > 0 && (
                  <Button size="small" color="warning" variant="contained" startIcon={<IconPlayerPlay size={14} />}
                    onClick={() => { setBulkDialog({ action:'reprocess', count: selectedReprocessable.length }); setBulkReason(''); }}>
                    Re-process ({selectedReprocessable.length})
                  </Button>
                )}
                {selectedFailed.length > 0 && (
                  <Button size="small" variant="outlined" startIcon={<IconArchive size={14} />}
                    onClick={() => { setBulkDialog({ action:'clear', count: selectedFailed.length }); setBulkReason(''); }}>
                    Archive ({selectedFailed.length})
                  </Button>
                )}
                <Box sx={{ flexGrow: 1 }} />
                <Button size="small" onClick={() => setSelected(new Set())}>Clear selection</Button>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* ═══ ERROR ══════════════════════════════════════════════════════════ */}
        {fetchError && <Alert severity="error" sx={{ mb: 2 }}>{fetchError}</Alert>}

        {/* ═══ TABLE ══════════════════════════════════════════════════════════ */}
        <Card>
          <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 380px)' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ width: 42 }}>
                    <Checkbox size="small" checked={allSelected && jobs.length > 0} indeterminate={someSelected} onChange={toggleSelectAll} disabled={jobs.length === 0} />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Church</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>File</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Started</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Age</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Error</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && jobs.length === 0 ? (
                  <TableRow><TableCell colSpan={10} align="center" sx={{ py: 6 }}><CircularProgress size={28} /><Typography variant="body2" sx={{ mt: 1 }}>Loading…</Typography></TableCell></TableRow>
                ) : jobs.length === 0 ? (
                  <TableRow><TableCell colSpan={10} align="center" sx={{ py: 6 }}><Typography variant="body2" color="text.secondary">No jobs match filters</Typography></TableCell></TableRow>
                ) : jobs.map((job) => {
                  const isStale = job.status === 'processing' && job.processing_age_seconds != null && job.processing_age_seconds >= 90;
                  const key = jobKey(job);
                  return (
                    <TableRow key={key} sx={{
                      bgcolor: isStale ? alpha(theme.palette.error.main, 0.06) : selected.has(key) ? alpha(theme.palette.primary.main, 0.06) : undefined,
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                    }}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={selected.has(key)} onChange={() => toggleSelect(key)} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 150 }}>{job.church_name || `Church ${job.church_id}`}</Typography>
                        <Typography variant="caption" color="text.secondary">#{job.church_id}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2" fontFamily="monospace">{job.id}</Typography></TableCell>
                      <TableCell>
                        <Chip size="small" label={isStale ? 'STALE' : job.status} sx={{
                          bgcolor: alpha(sColor(job.status, theme), 0.15), color: sColor(job.status, theme),
                          fontWeight: 600, fontSize: '0.7rem', height: 22,
                          border: isStale ? `1px solid ${theme.palette.error.main}` : undefined,
                        }} />
                        {job.killed_at && <Typography variant="caption" display="block" color="error.main">Killed{job.kill_reason ? `: ${job.kill_reason}` : ''}</Typography>}
                        {job.retry_count > 0 && <Typography variant="caption" display="block" color="text.secondary">Retry #{job.retry_count}</Typography>}
                      </TableCell>
                      <TableCell><Typography variant="body2" fontSize="0.75rem">{job.record_type}/{job.language}</Typography></TableCell>
                      <TableCell>
                        <Tooltip title={job.original_filename || job.filename || '—'}>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>{job.original_filename || job.filename || '—'}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell><Typography variant="body2" fontSize="0.72rem">{fmtDate(job.processing_started_at)}</Typography></TableCell>
                      <TableCell>
                        {job.status === 'processing' && job.processing_age_seconds != null ? (
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <IconClock size={14} color={isStale ? theme.palette.error.main : theme.palette.warning.main} />
                            <Typography variant="body2" fontWeight={600} color={isStale ? 'error.main' : 'warning.main'}>{fmtAge(job.processing_age_seconds)}</Typography>
                          </Stack>
                        ) : <Typography variant="body2" color="text.secondary">—</Typography>}
                      </TableCell>
                      <TableCell>
                        {job.error ? (
                          <Tooltip title={job.error}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 180, color: theme.palette.error.main, fontSize: '0.72rem' }}>{job.error}</Typography>
                          </Tooltip>
                        ) : <Typography variant="body2" color="text.secondary">—</Typography>}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0} justifyContent="flex-end">
                          <Tooltip title="View details"><IconButton size="small" onClick={() => openDetail(job)}><IconEye size={16} /></IconButton></Tooltip>
                          {isReprocessable(job.status) && <Tooltip title="Re-process"><IconButton size="small" color="warning" onClick={() => handleReprocess(job)}><IconPlayerPlay size={16} /></IconButton></Tooltip>}
                          {isActionable(job.status) && <Tooltip title="Kill"><IconButton size="small" color="error" onClick={() => { setKillTarget(job); setKillReason(''); }}><IconSkull size={16} /></IconButton></Tooltip>}
                          {isFailed(job.status) && !job.archived_at && <Tooltip title="Archive"><IconButton size="small" onClick={() => handleClear(job)}><IconArchive size={16} /></IconButton></Tooltip>}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {totalPages > 1 && <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}><Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} size="small" /></Box>}
          <Box sx={{ px: 2, py: 0.75, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="caption" color="text.secondary">
              {total} jobs · Page {page}/{Math.max(1, totalPages)} · {autoRefresh ? `Auto-refresh ${counts.processing > 0 || counts.queued > 0 ? '5s' : '15s'}` : 'Paused'}
            </Typography>
          </Box>
        </Card>

        {/* ═══ KILL DIALOG ════════════════════════════════════════════════════ */}
        <Dialog open={!!killTarget} onClose={() => setKillTarget(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Kill OCR Job</DialogTitle>
          <DialogContent>
            {killTarget && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2"><strong>Church:</strong> {killTarget.church_name} (#{killTarget.church_id})</Typography>
                <Typography variant="body2"><strong>Job:</strong> #{killTarget.id} — {killTarget.original_filename || killTarget.filename}</Typography>
                <Typography variant="body2"><strong>Status:</strong> {killTarget.status}</Typography>
              </Box>
            )}
            <TextField fullWidth size="small" label="Reason (required)" value={killReason} onChange={(e) => setKillReason(e.target.value)} placeholder="e.g. Stuck, user requested" autoFocus />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setKillTarget(null)}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleKill} disabled={killing || !killReason.trim()}>{killing ? 'Killing…' : 'Kill Job'}</Button>
          </DialogActions>
        </Dialog>

        {/* ═══ BULK DIALOG ════════════════════════════════════════════════════ */}
        <Dialog open={!!bulkDialog} onClose={() => setBulkDialog(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Bulk {bulkDialog?.action} — {bulkDialog?.count} jobs</DialogTitle>
          <DialogContent>
            <Alert severity={bulkDialog?.action === 'kill' ? 'error' : bulkDialog?.action === 'reprocess' ? 'warning' : 'info'} sx={{ mb: 2 }}>
              This will <strong>{bulkDialog?.action}</strong> {bulkDialog?.count} selected jobs. {bulkDialog?.action === 'kill' && 'This cannot be undone.'}
            </Alert>
            {bulkDialog?.action === 'kill' && (
              <TextField fullWidth size="small" label="Reason (required)" value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} placeholder="e.g. Batch cleanup" autoFocus />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBulkDialog(null)}>Cancel</Button>
            <Button variant="contained" color={bulkDialog?.action === 'kill' ? 'error' : bulkDialog?.action === 'reprocess' ? 'warning' : 'primary'}
              onClick={handleBulk} disabled={bulkRunning || (bulkDialog?.action === 'kill' && !bulkReason.trim())}>
              {bulkRunning ? 'Running…' : `${bulkDialog?.action} ${bulkDialog?.count} jobs`}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ═══ DETAIL MODAL ═══════════════════════════════════════════════════ */}
        <Dialog open={!!detailJob} onClose={() => setDetailJob(null)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Job Detail — #{detailJob?.id}
            {detailLoading && <CircularProgress size={16} />}
            <Box sx={{ flexGrow: 1 }} />
            {detailJob && isReprocessable(detailJob.status) && (
              <Button size="small" color="warning" variant="contained" startIcon={<IconPlayerPlay size={14} />} onClick={() => detailJob && handleReprocess(detailJob)}>Re-process</Button>
            )}
            {detailJob && isActionable(detailJob.status) && (
              <Button size="small" color="error" variant="contained" startIcon={<IconSkull size={14} />} onClick={() => { if (detailJob) { setDetailJob(null); setKillTarget(detailJob); setKillReason(''); } }}>Kill</Button>
            )}
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            {detailJob && (
              <>
                <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ px: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                  <Tab label="Overview" />
                  <Tab label="Error" />
                  <Tab label="OCR Result" />
                  <Tab label="Raw JSON" />
                </Tabs>
                <Box sx={{ p: 2, maxHeight: 500, overflow: 'auto' }}>
                  {detailTab === 0 && (
                    <Stack spacing={1.5}>
                      <DetailRow label="Church" value={`${detailJob.church_name} (#${detailJob.church_id})`} />
                      <DetailRow label="Schema" value={detailJob.schema_name} />
                      <DetailRow label="Status" value={detailJob.status} />
                      <DetailRow label="Record Type" value={`${detailJob.record_type} / ${detailJob.language}`} />
                      <DetailRow label="File" value={detailJob.original_filename || detailJob.filename || '—'} />
                      <DetailRow label="File Path" value={detailJob.file_path || '—'} />
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>File on Disk:</Typography>
                        {detailJob.file_exists ? (
                          <Chip size="small" icon={<IconFile size={14} />} label={`Exists (${detailJob.file_size_disk ? `${Math.round(detailJob.file_size_disk / 1024)}KB` : '?'})`} color="success" variant="outlined" />
                        ) : (
                          <Chip size="small" icon={<IconFileOff size={14} />} label="Missing" color="error" variant="outlined" />
                        )}
                      </Stack>
                      <DetailRow label="Confidence" value={detailJob.confidence_score != null ? `${detailJob.confidence_score}%` : '—'} />
                      <DetailRow label="Retry Count" value={String(detailJob.retry_count || 0)} />
                      <Divider />
                      <DetailRow label="Created" value={fmtDate(detailJob.created_at)} />
                      <DetailRow label="Processing Started" value={fmtDate(detailJob.processing_started_at)} />
                      <DetailRow label="Processing Ended" value={fmtDate(detailJob.processing_ended_at)} />
                      <DetailRow label="Updated" value={fmtDate(detailJob.updated_at)} />
                      {detailJob.killed_at && (
                        <>
                          <Divider />
                          <DetailRow label="Killed At" value={fmtDate(detailJob.killed_at)} />
                          <DetailRow label="Killed By" value={String(detailJob.killed_by || '—')} />
                          <DetailRow label="Kill Reason" value={detailJob.kill_reason || '—'} />
                        </>
                      )}
                      {detailJob.archived_at && (
                        <>
                          <Divider />
                          <DetailRow label="Archived At" value={fmtDate(detailJob.archived_at)} />
                          <DetailRow label="Archived Reason" value={detailJob.archived_reason || '—'} />
                        </>
                      )}
                    </Stack>
                  )}
                  {detailTab === 1 && (
                    <Box>
                      {detailJob.error ? (
                        <>
                          <Alert severity="error" sx={{ mb: 2 }}>{detailJob.error}</Alert>
                          {detailJob.error_json && (
                            <>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="subtitle2">Structured Error (error_json)</Typography>
                                <IconButton size="small" onClick={() => copyText(typeof detailJob.error_json === 'string' ? detailJob.error_json : JSON.stringify(detailJob.error_json, null, 2))}>
                                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                                </IconButton>
                              </Stack>
                              <JsonBlock content={detailJob.error_json} theme={theme} />
                            </>
                          )}
                        </>
                      ) : (
                        <Typography color="text.secondary">No error recorded for this job.</Typography>
                      )}
                    </Box>
                  )}
                  {detailTab === 2 && (
                    <Box>
                      {detailJob.ocr_result_json ? (
                        <>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle2">OCR Result JSON</Typography>
                            <IconButton size="small" onClick={() => copyText(typeof detailJob.ocr_result_json === 'string' ? detailJob.ocr_result_json : JSON.stringify(detailJob.ocr_result_json, null, 2))}>
                              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                            </IconButton>
                          </Stack>
                          <JsonBlock content={detailJob.ocr_result_json} theme={theme} />
                        </>
                      ) : (
                        <Typography color="text.secondary">No OCR result data available.</Typography>
                      )}
                    </Box>
                  )}
                  {detailTab === 3 && (
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2">Full Job Object</Typography>
                        <IconButton size="small" onClick={() => copyText(JSON.stringify(detailJob, null, 2))}>
                          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                        </IconButton>
                      </Stack>
                      <JsonBlock content={detailJob} theme={theme} />
                    </Box>
                  )}
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions><Button onClick={() => setDetailJob(null)}>Close</Button></DialogActions>
        </Dialog>

        {/* ═══ CLEAR PROCESSED DIALOG ═════════════════════════════════════════ */}
        <Dialog open={clearProcOpen} onClose={() => !clearProcRunning && setClearProcOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Clear Processed OCR Jobs</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              {/* Scope toggle */}
              <Box>
                <FormLabel sx={{ mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.85rem' }}>Scope</FormLabel>
                <ToggleButtonGroup
                  value={clearProcScope}
                  exclusive
                  onChange={(_, v) => { if (v) setClearProcScope(v); }}
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="selected" disabled={selectedCompleted.length === 0}>
                    Selected only ({selectedCompleted.length})
                  </ToggleButton>
                  <ToggleButton value="all">
                    All completed{churchFilter ? ` — ${churchFilter.name}` : ''}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* File cleanup radio */}
              <Box>
                <FormLabel sx={{ mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.85rem' }}>File cleanup</FormLabel>
                <RadioGroup value={clearProcFiles} onChange={(e) => setClearProcFiles(e.target.value as any)}>
                  <FormControlLabel value="db" control={<Radio size="small" />} label="Database only — keep uploaded files on disk" />
                  <FormControlLabel value="db+files" control={<Radio size="small" />} label="Database + files — also delete uploaded images" />
                </RadioGroup>
              </Box>

              <Alert severity="warning">
                This will <strong>permanently delete</strong>{' '}
                {clearProcScope === 'selected'
                  ? `${selectedCompleted.length} selected completed job(s)`
                  : `all completed OCR jobs${churchFilter ? ` for ${churchFilter.name}` : ''}`}
                {clearProcFiles === 'db+files' && <> and their uploaded image files</>}.
                This cannot be undone.
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setClearProcOpen(false)} disabled={clearProcRunning}>Cancel</Button>
            <Button
              variant="contained"
              color="warning"
              onClick={handleClearProcessed}
              disabled={clearProcRunning || (clearProcScope === 'selected' && selectedCompleted.length === 0)}
            >
              {clearProcRunning ? 'Clearing…' : 'Clear Processed'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ═══ TOAST ══════════════════════════════════════════════════════════ */}
        <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical:'bottom', horizontal:'center' }}>
          {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast.msg}</Alert> : undefined}
        </Snackbar>
      </Box>
    </PageContainer>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Stack direction="row" spacing={1}>
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120, flexShrink: 0 }}>{label}:</Typography>
    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{value}</Typography>
  </Stack>
);

const JsonBlock: React.FC<{ content: any; theme: any }> = ({ content, theme }) => {
  let text: string;
  if (typeof content === 'string') {
    try { text = JSON.stringify(JSON.parse(content), null, 2); } catch { text = content; }
  } else {
    text = JSON.stringify(content, null, 2);
  }
  return (
    <Box component="pre" sx={{
      p: 2, bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
      borderRadius: 1, overflow: 'auto', maxHeight: 400, fontSize: '0.72rem', lineHeight: 1.6, m: 0,
    }}>
      {text}
    </Box>
  );
};

export default OcrActivityMonitor;
