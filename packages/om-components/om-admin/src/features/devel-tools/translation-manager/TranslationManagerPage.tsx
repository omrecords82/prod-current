import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  IconCheck,
  IconEdit,
  IconEye,
  IconLanguage,
  IconRefresh,
  IconSearch,
  IconAlertTriangle,
  IconCircleCheck,
  IconClock,
  IconQuestionMark,
  IconFileText,
} from '@tabler/icons-react';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import apiClient from '@/api/utils/axiosInstance';

// ─── Types ───────────────────────────────────────────────────────────

interface LanguageInfo {
  code: string;
  name_native: string;
  name_english: string;
}

interface StatsData {
  total_keys: number;
  by_language: Record<string, {
    name: string;
    missing: number;
    outdated: number;
    draft: number;
    review: number;
    current: number;
    total: number;
    completion_pct: number;
  }>;
  namespaces: Array<{ namespace: string; count: number }>;
}

interface TranslationRow {
  translation_key: string;
  namespace: string;
  english_text: string;
  english_hash: string;
  description: string | null;
  source_updated_at: string;
  translated_text: string | null;
  translated_from_hash: string | null;
  status: string | null;
  notes: string | null;
  translation_updated_at: string | null;
  updated_by: number | null;
  derived_status: string;
}

interface EditState {
  row: TranslationRow;
  text: string;
  notes: string;
  saving: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: 'error' | 'warning' | 'info' | 'success' | 'default'; icon: typeof IconCheck }> = {
  missing:  { label: 'Missing',  color: 'error',   icon: IconQuestionMark },
  outdated: { label: 'Outdated', color: 'warning',  icon: IconAlertTriangle },
  draft:    { label: 'Draft',    color: 'info',     icon: IconFileText },
  review:   { label: 'Review',   color: 'default',  icon: IconEye },
  current:  { label: 'Current',  color: 'success',  icon: IconCircleCheck },
};

const STATUS_TABS = ['all', 'missing', 'outdated', 'draft', 'review', 'current'] as const;

const BCrumb = [
  { to: '/admin/control-panel', title: 'Admin' },
  { title: 'Translation Manager' },
];

const PAGE_SIZE = 50;

// ─── Component ───────────────────────────────────────────────────────

export default function TranslationManagerPage() {
  const theme = useTheme();

  // Data state
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [rows, setRows] = useState<TranslationRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  // Filter state
  const [selectedLang, setSelectedLang] = useState('el');
  const [selectedNs, setSelectedNs] = useState('');
  const [statusTab, setStatusTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  // UI state
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  // ─── Data fetching ──────────────────────────────────────────────

  const fetchLanguages = useCallback(async () => {
    try {
      const res = await apiClient.get<{ languages: LanguageInfo[] }>('/translations/languages');
      const nonEn = res.languages.filter((l: LanguageInfo) => l.code !== 'en');
      setLanguages(nonEn);
    } catch { /* ignore */ }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const params = selectedNs ? `?namespace=${selectedNs}` : '';
      const res = await apiClient.get<StatsData>(`/translations/stats${params}`);
      setStats(res);
    } catch { /* ignore */ }
    setStatsLoading(false);
  }, [selectedNs]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lang: selectedLang,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (selectedNs) params.set('namespace', selectedNs);
      if (statusTab !== 'all') params.set('status', statusTab);
      if (search) params.set('search', search);

      const res = await apiClient.get<{ rows: TranslationRow[]; total: number }>(
        `/translations/localized?${params}`
      );
      setRows(res.rows);
      setTotalRows(res.total);
    } catch {
      setRows([]);
      setTotalRows(0);
    }
    setLoading(false);
  }, [selectedLang, selectedNs, statusTab, search, page]);

  useEffect(() => { fetchLanguages(); }, [fetchLanguages]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchRows(); }, [fetchRows]);

  // ─── Actions ────────────────────────────────────────────────────

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleSaveTranslation = async () => {
    if (!editState) return;
    setEditState({ ...editState, saving: true });
    try {
      await apiClient.put('/translations/localized', {
        translation_key: editState.row.translation_key,
        language_code: selectedLang,
        translated_text: editState.text,
        notes: editState.notes || undefined,
        status: 'draft',
      });
      setSnack({ message: 'Translation saved as draft', severity: 'success' });
      setEditState(null);
      fetchRows();
      fetchStats();
    } catch {
      setSnack({ message: 'Failed to save translation', severity: 'error' });
      setEditState({ ...editState, saving: false });
    }
  };

  const handleMarkCurrent = async (key: string) => {
    try {
      await apiClient.put('/translations/localized/mark-current', {
        translation_key: key,
        language_code: selectedLang,
      });
      setSnack({ message: 'Marked as current', severity: 'success' });
      fetchRows();
      fetchStats();
    } catch {
      setSnack({ message: 'Failed to mark as current', severity: 'error' });
    }
  };

  const handleMarkReview = async (key: string) => {
    try {
      // Get existing row data
      const row = rows.find(r => r.translation_key === key);
      if (!row?.translated_text) return;

      await apiClient.put('/translations/localized', {
        translation_key: key,
        language_code: selectedLang,
        translated_text: row.translated_text,
        status: 'review',
      });
      setSnack({ message: 'Sent for review', severity: 'success' });
      fetchRows();
      fetchStats();
    } catch {
      setSnack({ message: 'Failed to update status', severity: 'error' });
    }
  };

  // ─── Derived ────────────────────────────────────────────────────

  const langStats = stats?.by_language?.[selectedLang];
  const totalPages = Math.ceil(totalRows / PAGE_SIZE);
  const namespaces = stats?.namespaces || [];

  // Status tab counts
  const tabCounts = useMemo(() => {
    if (!langStats) return {};
    return {
      all: langStats.total,
      missing: langStats.missing,
      outdated: langStats.outdated,
      draft: langStats.draft,
      review: langStats.review,
      current: langStats.current,
    };
  }, [langStats]);

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <PageContainer title="Translation Manager" description="Manage translations for all supported languages">
      <Breadcrumb title="Translation Manager" items={BCrumb} />

      {/* ── Language health overview ── */}
      {stats && !statsLoading && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Language Health — {stats.total_keys} source keys
            {selectedNs && ` (${selectedNs})`}
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {Object.entries(stats.by_language).map(([code, info]) => (
              <Paper
                key={code}
                variant="outlined"
                onClick={() => setSelectedLang(code)}
                sx={{
                  p: 1.5,
                  minWidth: 160,
                  cursor: 'pointer',
                  borderColor: code === selectedLang ? 'primary.main' : 'divider',
                  borderWidth: code === selectedLang ? 2 : 1,
                  bgcolor: code === selectedLang ? 'action.selected' : 'transparent',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2">{info.name}</Typography>
                  <Chip
                    label={`${info.completion_pct}%`}
                    size="small"
                    color={info.completion_pct === 100 ? 'success' : info.completion_pct > 50 ? 'warning' : 'error'}
                  />
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={info.completion_pct}
                  sx={{ mt: 1, mb: 0.5, height: 6, borderRadius: 3 }}
                />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                  {info.missing > 0 && <Chip label={`${info.missing} missing`} size="small" color="error" variant="outlined" />}
                  {info.outdated > 0 && <Chip label={`${info.outdated} outdated`} size="small" color="warning" variant="outlined" />}
                  {info.review > 0 && <Chip label={`${info.review} review`} size="small" variant="outlined" />}
                  {info.draft > 0 && <Chip label={`${info.draft} draft`} size="small" color="info" variant="outlined" />}
                  {info.current > 0 && <Chip label={`${info.current} current`} size="small" color="success" variant="outlined" />}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}

      {/* ── Filters bar ── */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Language</InputLabel>
            <Select value={selectedLang} label="Language" onChange={(e) => { setSelectedLang(e.target.value); setPage(1); }}>
              {languages.map(l => (
                <MenuItem key={l.code} value={l.code}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconLanguage size={16} />
                    <span>{l.name_english}</span>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Namespace</InputLabel>
            <Select value={selectedNs} label="Namespace" onChange={(e) => { setSelectedNs(e.target.value); setPage(1); }}>
              <MenuItem value="">All namespaces</MenuItem>
              {namespaces.map(ns => (
                <MenuItem key={ns.namespace} value={ns.namespace}>
                  {ns.namespace} ({ns.count})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            placeholder="Search key or text..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: <InputAdornment position="start"><IconSearch size={18} /></InputAdornment>,
            }}
            sx={{ minWidth: 250 }}
          />
          <Button variant="outlined" size="small" onClick={handleSearch}>Search</Button>

          <Box sx={{ flex: 1 }} />
          <Button
            variant="outlined"
            size="small"
            startIcon={<IconRefresh size={16} />}
            onClick={() => { fetchStats(); fetchRows(); }}
          >
            Refresh
          </Button>
        </Stack>
      </Paper>

      {/* ── Status tabs ── */}
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={statusTab}
          onChange={(_, v) => { setStatusTab(v); setPage(1); }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {STATUS_TABS.map(tab => {
            const count = tabCounts[tab] ?? 0;
            const conf = STATUS_CONFIG[tab];
            return (
              <Tab
                key={tab}
                value={tab}
                label={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <span>{tab === 'all' ? 'All' : conf?.label || tab}</span>
                    <Chip label={count} size="small" color={tab === 'all' ? 'default' : conf?.color} sx={{ height: 20, fontSize: 12 }} />
                  </Stack>
                }
              />
            );
          })}
        </Tabs>
      </Box>

      {/* ── Translation table ── */}
      <Paper>
        {loading && <LinearProgress />}
        <TableContainer sx={{ maxHeight: 600, overflow: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 250 }}>Key</TableCell>
                <TableCell sx={{ fontWeight: 700, width: '35%' }}>English (Source)</TableCell>
                <TableCell sx={{ fontWeight: 700, width: '35%' }}>Translation</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 100, textAlign: 'center' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 140, textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">No translations found for the current filters.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row) => {
                const statusConf = STATUS_CONFIG[row.derived_status] || STATUS_CONFIG.review;
                const StatusIcon = statusConf.icon;
                const hashMismatch = row.translated_from_hash && row.translated_from_hash !== row.english_hash;

                return (
                  <TableRow
                    key={row.translation_key}
                    hover
                    sx={{
                      bgcolor: row.derived_status === 'missing'
                        ? `${theme.palette.error.main}08`
                        : row.derived_status === 'outdated'
                        ? `${theme.palette.warning.main}08`
                        : 'inherit',
                    }}
                  >
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: 11 }}>
                        {row.translation_key}
                      </Typography>
                      {row.description && (
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: 10, mt: 0.25 }}>
                          {row.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: 13, lineHeight: 1.5 }}>
                        {row.english_text}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {row.translated_text ? (
                        <Typography variant="body2" sx={{ fontSize: 13, lineHeight: 1.5 }}>
                          {row.translated_text}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.disabled" fontStyle="italic" sx={{ fontSize: 13 }}>
                          — no translation —
                        </Typography>
                      )}
                      {hashMismatch && (
                        <Typography variant="caption" color="warning.main" display="block" sx={{ fontSize: 10, mt: 0.25 }}>
                          ⚠ English source changed since this translation
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title={statusConf.label}>
                        <Chip
                          icon={<StatusIcon size={14} />}
                          label={statusConf.label}
                          size="small"
                          color={statusConf.color}
                          variant="outlined"
                          sx={{ fontSize: 11 }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Edit translation">
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ minWidth: 32, p: 0.5 }}
                            onClick={() => setEditState({
                              row,
                              text: row.translated_text || '',
                              notes: row.notes || '',
                              saving: false,
                            })}
                          >
                            <IconEdit size={16} />
                          </Button>
                        </Tooltip>
                        {(row.derived_status === 'draft' || row.derived_status === 'review') && row.translated_text && (
                          <Tooltip title="Mark as current">
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              sx={{ minWidth: 32, p: 0.5 }}
                              onClick={() => handleMarkCurrent(row.translation_key)}
                            >
                              <IconCheck size={16} />
                            </Button>
                          </Tooltip>
                        )}
                        {row.derived_status === 'draft' && (
                          <Tooltip title="Send for review">
                            <Button
                              size="small"
                              variant="outlined"
                              color="info"
                              sx={{ minWidth: 32, p: 0.5 }}
                              onClick={() => handleMarkReview(row.translation_key)}
                            >
                              <IconEye size={16} />
                            </Button>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalRows)} of {totalRows}
            </Typography>
            <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} size="small" />
          </Box>
        )}
      </Paper>

      {/* ── Edit dialog ── */}
      <Dialog open={!!editState} onClose={() => !editState?.saving && setEditState(null)} maxWidth="md" fullWidth>
        {editState && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontSize: 13, color: 'text.secondary' }}>
                {editState.row.translation_key}
              </Typography>
              <Typography variant="h6">Edit Translation</Typography>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  English (Source)
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                  <Typography variant="body2">{editState.row.english_text}</Typography>
                </Paper>
              </Box>

              {editState.row.translated_from_hash && editState.row.translated_from_hash !== editState.row.english_hash && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  English source has changed since this translation was last updated. Please review and update.
                </Alert>
              )}

              <TextField
                label={`Translation (${languages.find(l => l.code === selectedLang)?.name_english || selectedLang})`}
                value={editState.text}
                onChange={(e) => setEditState({ ...editState, text: e.target.value })}
                multiline
                minRows={3}
                maxRows={8}
                fullWidth
                sx={{ mb: 2 }}
              />

              <TextField
                label="Translator notes (optional)"
                value={editState.notes}
                onChange={(e) => setEditState({ ...editState, notes: e.target.value })}
                multiline
                minRows={1}
                maxRows={3}
                fullWidth
                size="small"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditState(null)} disabled={editState.saving}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSaveTranslation}
                disabled={editState.saving || !editState.text.trim()}
                startIcon={editState.saving ? <CircularProgress size={16} /> : <IconCheck size={16} />}
              >
                {editState.saving ? 'Saving...' : 'Save Draft'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert> : undefined}
      </Snackbar>
    </PageContainer>
  );
}
