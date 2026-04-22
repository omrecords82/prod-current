/**
 * WorkSessionAdminPage — Admin management for work sessions + weekly reports.
 *
 * Tabs:
 *   1. Sessions — session history table (filterable)
 *   2. Report Config — weekly report settings
 *   3. Report History — past report runs with preview/resend
 *   4. Generate — ad-hoc report generation
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Stack,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormGroup,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Pagination,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  IconRefresh,
  IconSend,
  IconEye,
  IconClock,
  IconCalendar,
  IconSettings,
  IconReport,
  IconPlayerPlay,
} from '@tabler/icons-react';
import { apiClient } from '@/api/utils/axiosInstance';

// ============================================================================
// Types
// ============================================================================

interface Session {
  id: number;
  user_id: number;
  source_system: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: string;
  summary_note: string | null;
  created_at: string;
}

interface ReportRun {
  id: number;
  config_id: number | null;
  user_id: number;
  period_start: string;
  period_end: string;
  status: string;
  error_message: string | null;
  generated_at: string | null;
  sent_at: string | null;
  created_at: string;
}

interface ReportSection {
  id: number;
  action_key: string;
  display_name: string;
  description: string | null;
  default_enabled: boolean;
  sort_order: number;
}

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const statusColors: Record<string, string> = {
  active: '#10b981',
  completed: '#3b82f6',
  cancelled: '#f59e0b',
  generating: '#8b5cf6',
  generated: '#3b82f6',
  sending: '#f59e0b',
  sent: '#10b981',
  failed: '#ef4444',
};

// ============================================================================
// Sessions Tab
// ============================================================================

function SessionsTab() {
  const [s, setS] = useState<{
    sessions: Session[];
    loading: boolean;
    page: number;
    total: number;
    statusFilter: string;
  }>({ sessions: [], loading: true, page: 1, total: 0, statusFilter: '' });
  const setSField = useCallback(<K extends keyof typeof s>(key: K, value: typeof s[K]) => {
    setS(prev => ({ ...prev, [key]: value }));
  }, []);
  const setSessions = useCallback((v: Session[]) => setSField('sessions', v), [setSField]);
  const setLoading = useCallback((v: boolean) => setSField('loading', v), [setSField]);
  const setPage = useCallback((v: number) => setSField('page', v), [setSField]);
  const setTotal = useCallback((v: number) => setSField('total', v), [setSField]);
  const setStatusFilter = useCallback((v: string) => setSField('statusFilter', v), [setSField]);
  const { sessions, loading, page, total, statusFilter } = s;

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiClient.get(`/work-sessions/history?${params}`);
      const data = res.data || res;
      setSessions(data.sessions || []);
      setTotal(data.pagination?.total_pages || 1);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
        <IconButton onClick={fetchSessions} size="small"><IconRefresh size={18} /></IconButton>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Started</TableCell>
              <TableCell>Ended</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Note</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : sessions.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No sessions found</TableCell></TableRow>
            ) : (
              sessions.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>{s.id}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(s.started_at)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(s.ended_at)}</TableCell>
                  <TableCell>{formatDuration(s.duration_seconds)}</TableCell>
                  <TableCell>
                    <Chip label={s.status} size="small" sx={{ bgcolor: alpha(statusColors[s.status] || '#6b7280', 0.15), color: statusColors[s.status], fontWeight: 600, fontSize: '11px' }} />
                  </TableCell>
                  <TableCell><Chip label={s.source_system} size="small" variant="outlined" sx={{ fontSize: '11px' }} /></TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.summary_note || '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {total > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={total} page={page} onChange={(_, p) => setPage(p)} size="small" />
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// Report Config Tab
// ============================================================================

function ReportConfigTab() {
  const [cfg, setCfg] = useState<{
    config: any;
    sections: ReportSection[];
    loading: boolean;
    saving: boolean;
    saved: boolean;
    enabled: boolean;
    scheduleDay: number;
    scheduleHour: number;
    timezone: string;
    recipients: string;
    enabledSections: string[];
  }>({
    config: null,
    sections: [],
    loading: true,
    saving: false,
    saved: false,
    enabled: true,
    scheduleDay: 1,
    scheduleHour: 8,
    timezone: 'America/New_York',
    recipients: '',
    enabledSections: [],
  });
  const setCfgField = useCallback(<K extends keyof typeof cfg>(key: K, value: typeof cfg[K]) => {
    setCfg(prev => ({ ...prev, [key]: value }));
  }, []);
  const setConfig = useCallback((v: any) => setCfgField('config', v), [setCfgField]);
  const setSections = useCallback((v: ReportSection[]) => setCfgField('sections', v), [setCfgField]);
  const setLoading = useCallback((v: boolean) => setCfgField('loading', v), [setCfgField]);
  const setSaving = useCallback((v: boolean) => setCfgField('saving', v), [setCfgField]);
  const setSaved = useCallback((v: boolean) => setCfgField('saved', v), [setCfgField]);
  const setEnabled = useCallback((v: boolean) => setCfgField('enabled', v), [setCfgField]);
  const setScheduleDay = useCallback((v: number) => setCfgField('scheduleDay', v), [setCfgField]);
  const setScheduleHour = useCallback((v: number) => setCfgField('scheduleHour', v), [setCfgField]);
  const setTimezone = useCallback((v: string) => setCfgField('timezone', v), [setCfgField]);
  const setRecipients = useCallback((v: string) => setCfgField('recipients', v), [setCfgField]);
  const setEnabledSections = useCallback((v: string[]) => setCfgField('enabledSections', v), [setCfgField]);
  const { config, sections, loading, saving, saved, enabled, scheduleDay, scheduleHour, timezone, recipients, enabledSections } = cfg;

  useEffect(() => {
    const load = async () => {
      try {
        const [configRes, sectionsRes] = await Promise.all([
          apiClient.get('/work-sessions/report/config'),
          apiClient.get('/work-sessions/report/sections'),
        ]);
        const configData = (configRes.data || configRes);
        const sectionsData = (sectionsRes.data || sectionsRes);

        setSections(sectionsData.sections || []);

        const c = configData.config || configData.defaults;
        if (c) {
          setEnabled(c.is_enabled !== false);
          setScheduleDay(c.schedule_day || 1);
          setScheduleHour(c.schedule_hour || 8);
          setTimezone(c.timezone || 'America/New_York');
          setRecipients(Array.isArray(c.recipients) ? c.recipients.join(', ') : '');
          setEnabledSections(Array.isArray(c.enabled_sections) ? c.enabled_sections : ['work_sessions', 'tasks_completed', 'highlights']);
        }
        setConfig(configData.config);
      } catch (err) {
        console.error('Failed to load config:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await apiClient.put('/work-sessions/report/config', {
        is_enabled: enabled,
        schedule_day: scheduleDay,
        schedule_hour: scheduleHour,
        timezone,
        recipients: recipients.split(',').map((e: string) => e.trim()).filter(Boolean),
        enabled_sections: enabledSections,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress />;

  const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <Box sx={{ maxWidth: 600 }}>
      <FormControlLabel
        control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
        label="Enable weekly report"
        sx={{ mb: 2 }}
      />

      <Stack spacing={2.5}>
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Day</InputLabel>
            <Select value={scheduleDay} label="Day" onChange={(e) => setScheduleDay(Number(e.target.value))}>
              {dayNames.slice(1).map((name, i) => (
                <MenuItem key={i + 1} value={i + 1}>{name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Hour</InputLabel>
            <Select value={scheduleHour} label="Hour" onChange={(e) => setScheduleHour(Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => (
                <MenuItem key={i} value={i}>{i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField size="small" label="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} sx={{ minWidth: 200 }} />
        </Stack>

        <TextField
          size="small"
          label="Recipients (comma-separated emails)"
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          fullWidth
          helperText="Leave empty to send to your own email"
        />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Enabled Sections</Typography>
          <FormGroup>
            {sections.map((s) => (
              <FormControlLabel
                key={s.action_key}
                control={
                  <Checkbox
                    checked={enabledSections.includes(s.action_key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEnabledSections([...enabledSections, s.action_key]);
                      } else {
                        setEnabledSections(enabledSections.filter((k) => k !== s.action_key));
                      }
                    }}
                    size="small"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.display_name}</Typography>
                    {s.description && <Typography variant="caption" color="text.secondary">{s.description}</Typography>}
                  </Box>
                }
              />
            ))}
          </FormGroup>
        </Box>

        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: '#8c249d', '&:hover': { bgcolor: '#7c1f8c' }, alignSelf: 'flex-start' }}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
        {saved && <Alert severity="success" sx={{ py: 0 }}>Configuration saved</Alert>}
      </Stack>
    </Box>
  );
}

// ============================================================================
// Report History Tab
// ============================================================================

function ReportHistoryTab() {
  const [h, setH] = useState<{
    runs: ReportRun[];
    loading: boolean;
    previewHtml: string | null;
    previewOpen: boolean;
  }>({ runs: [], loading: true, previewHtml: null, previewOpen: false });
  const setHField = useCallback(<K extends keyof typeof h>(key: K, value: typeof h[K]) => {
    setH(prev => ({ ...prev, [key]: value }));
  }, []);
  const setRuns = useCallback((v: ReportRun[]) => setHField('runs', v), [setHField]);
  const setLoading = useCallback((v: boolean) => setHField('loading', v), [setHField]);
  const setPreviewHtml = useCallback((v: string | null) => setHField('previewHtml', v), [setHField]);
  const setPreviewOpen = useCallback((v: boolean) => setHField('previewOpen', v), [setHField]);
  const { runs, loading, previewHtml, previewOpen } = h;

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/work-sessions/report/runs');
      setRuns((res.data || res).runs || []);
    } catch (err) {
      console.error('Failed to fetch runs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const handlePreview = async (runId: number) => {
    try {
      const res = await apiClient.get(`/work-sessions/report/runs/${runId}/html`);
      setPreviewHtml(typeof res === 'string' ? res : res.data);
      setPreviewOpen(true);
    } catch (err) {
      console.error('Failed to fetch preview:', err);
    }
  };

  const handleResend = async (runId: number) => {
    try {
      await apiClient.post('/work-sessions/report/send', { run_id: runId });
      fetchRuns();
    } catch (err) {
      console.error('Failed to resend:', err);
    }
  };

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Period</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Generated</TableCell>
              <TableCell>Sent</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : runs.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No reports generated yet</TableCell></TableRow>
            ) : (
              runs.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.id}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(r.period_start)} — {formatDate(r.period_end)}</TableCell>
                  <TableCell>
                    <Chip label={r.status} size="small" sx={{ bgcolor: alpha(statusColors[r.status] || '#6b7280', 0.15), color: statusColors[r.status], fontWeight: 600, fontSize: '11px' }} />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(r.generated_at)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(r.sent_at)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Preview"><IconButton size="small" onClick={() => handlePreview(r.id)}><IconEye size={16} /></IconButton></Tooltip>
                      <Tooltip title="Resend"><IconButton size="small" onClick={() => handleResend(r.id)}><IconSend size={16} /></IconButton></Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Report Preview</DialogTitle>
        <DialogContent>
          {previewHtml && <Box dangerouslySetInnerHTML={{ __html: previewHtml }} sx={{ '& *': { maxWidth: '100%' } }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ============================================================================
// Generate Tab
// ============================================================================

function GenerateTab() {
  const [g, setG] = useState<{
    periodStart: string;
    periodEnd: string;
    generating: boolean;
    result: any;
    previewHtml: string | null;
  }>(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return {
      periodStart: d.toISOString().split('T')[0],
      periodEnd: new Date().toISOString().split('T')[0],
      generating: false,
      result: null,
      previewHtml: null,
    };
  });
  const setGField = useCallback(<K extends keyof typeof g>(key: K, value: typeof g[K]) => {
    setG(prev => ({ ...prev, [key]: value }));
  }, []);
  const setPeriodStart = useCallback((v: string) => setGField('periodStart', v), [setGField]);
  const setPeriodEnd = useCallback((v: string) => setGField('periodEnd', v), [setGField]);
  const setGenerating = useCallback((v: boolean) => setGField('generating', v), [setGField]);
  const setResult = useCallback((v: any) => setGField('result', v), [setGField]);
  const setPreviewHtml = useCallback((v: string | null) => setGField('previewHtml', v), [setGField]);
  const { periodStart, periodEnd, generating, result, previewHtml } = g;

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const res = await apiClient.post('/work-sessions/report/generate', {
        period_start: periodStart,
        period_end: periodEnd,
      });
      const data = res.data || res;
      setResult(data);
      setPreviewHtml(data.html || null);
    } catch (err) {
      console.error('Failed to generate:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!result?.run_id) return;
    try {
      await apiClient.post('/work-sessions/report/send', { run_id: result.run_id });
      alert('Report queued for delivery');
    } catch (err) {
      console.error('Failed to send:', err);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <TextField type="date" size="small" label="From" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField type="date" size="small" label="To" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={generating}
          startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <IconPlayerPlay size={16} />}
          sx={{ bgcolor: '#8c249d', '&:hover': { bgcolor: '#7c1f8c' }, textTransform: 'none' }}
        >
          Generate Report
        </Button>
        {result && (
          <Button variant="outlined" onClick={handleSend} startIcon={<IconSend size={16} />} sx={{ textTransform: 'none' }}>
            Send Email
          </Button>
        )}
      </Stack>

      {result && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Report generated (Run #{result.run_id}). Period: {periodStart} to {periodEnd}
        </Alert>
      )}

      {previewHtml && (
        <Paper variant="outlined" sx={{ p: 0, overflow: 'auto', maxHeight: '70vh' }}>
          <Box dangerouslySetInnerHTML={{ __html: previewHtml }} sx={{ '& *': { maxWidth: '100%' } }} />
        </Paper>
      )}
    </Box>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function WorkSessionAdminPage() {
  const theme = useTheme();
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" sx={{ mb: 0.5, fontWeight: 700, color: theme.palette.mode === 'dark' ? '#f3f4f6' : '#2d1b4e' }}>
        Work Session Admin
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage work sessions, configure weekly reports, and review report history.
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<IconClock size={16} />} iconPosition="start" label="Sessions" sx={{ textTransform: 'none', fontWeight: 600, minHeight: 42 }} />
        <Tab icon={<IconSettings size={16} />} iconPosition="start" label="Report Config" sx={{ textTransform: 'none', fontWeight: 600, minHeight: 42 }} />
        <Tab icon={<IconReport size={16} />} iconPosition="start" label="Report History" sx={{ textTransform: 'none', fontWeight: 600, minHeight: 42 }} />
        <Tab icon={<IconCalendar size={16} />} iconPosition="start" label="Generate Now" sx={{ textTransform: 'none', fontWeight: 600, minHeight: 42 }} />
      </Tabs>

      {tab === 0 && <SessionsTab />}
      {tab === 1 && <ReportConfigTab />}
      {tab === 2 && <ReportHistoryTab />}
      {tab === 3 && <GenerateTab />}
    </Box>
  );
}
