/**
 * OCR Table Extractor — Super Admin Devel Tools page
 *
 * Route:  /devel/ocr-studio/table-extractor
 *
 * Lists completed OCR jobs filtered by layout/record_type, lets admin run
 * marriage ledger table extraction, view structured two-table results,
 * and download artifacts.
 */

import { apiClient } from '@/shared/lib/axiosInstance';
import PageContainer from '@/shared/ui/PageContainer';
import {
    Alert,
    alpha,
    Autocomplete,
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
    IconButton,
    MenuItem,
    Pagination,
    Paper,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import {
    IconCheck,
    IconDownload,
    IconEye,
    IconPlayerPlay,
    IconTable,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useState } from 'react';
import OcrStudioNav from '../components/OcrStudioNav';

// ── Types ────────────────────────────────────────────────────────────────────

interface TableJob {
  id: number;
  church_id: number;
  church_name: string;
  filename: string;
  status: string;
  record_type: string;
  language: string;
  confidence_score: number | null;
  created_at: string;
  has_table_extraction: boolean;
}

interface ChurchOption { id: number; name: string; }

interface ContractCell {
  row_index: number;
  column_index: number;
  content: string;
  kind?: string;
  confidence?: number | null;
  confidence_min?: number | null;
  token_count?: number;
  bbox?: number[] | null;
  needs_review?: boolean;
  reasons?: string[];
}

interface ContractRow {
  row_index: number;
  type: 'header' | 'row';
  cells: ContractCell[];
}

interface ContractTable {
  table_number: number;
  row_count: number;
  column_count: number;
  has_header_row: boolean;
  header_content: string;
  rows: ContractRow[];
}

interface TableExtraction {
  layout_id: string;
  page_number: number;
  tables: ContractTable[];
  total_tokens: number;
  data_tokens: number;
  data_rows: number;
  extracted_at: string;
}

interface JobDetail {
  id: number;
  church_id: number;
  church_name: string;
  filename: string;
  record_type: string;
  table_extraction: TableExtraction | null;
  artifacts: string[];
}

// ── Layout options ───────────────────────────────────────────────────────────

interface LayoutOption {
  label: string;
  record_type: string;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  { label: 'Marriage Ledger v1', record_type: 'marriage' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
};

// ── Component ────────────────────────────────────────────────────────────────

const OcrTableExtractorPage: React.FC = () => {
  const theme = useTheme();

  // List state
  const [jobs, setJobs] = useState<TableJob[]>([]);
  const [total, setTotal] = useState(0);
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [churchFilter, setChurchFilter] = useState<ChurchOption | null>(null);
  const [layoutIdx, setLayoutIdx] = useState(0);

  // Detail state
  const [detailJob, setDetailJob] = useState<JobDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Extraction state
  const [extracting, setExtracting] = useState<number | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' | 'info' } | null>(null);

  const selectedLayout = LAYOUT_OPTIONS[layoutIdx];

  // ── Fetch list ────────────────────────────────────────────────────────────

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set('page', String(page));
      p.set('pageSize', String(pageSize));
      if (churchFilter) p.set('church_id', String(churchFilter.id));
      if (selectedLayout.record_type) p.set('record_type', selectedLayout.record_type);

      const res: any = await apiClient.get(`/api/ocr/table-jobs?${p.toString()}`);
      const data = res?.data ?? res;
      setJobs(data.rows || []);
      setTotal(data.total || 0);
      if (data.churches) setChurches(data.churches);
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Failed to fetch jobs', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, churchFilter, selectedLayout]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // ── Run extraction ────────────────────────────────────────────────────────

  const handleExtract = async (jobId: number) => {
    setExtracting(jobId);
    try {
      const res: any = await apiClient.post(`/api/ocr/table-jobs/${jobId}/extract`);
      const data = res?.data ?? res;
      setToast({ msg: `Extracted ${data.tables_extracted} tables, ${data.data_rows} data rows from job #${jobId}`, severity: 'success' });
      fetchJobs();
      if (detailJob?.id === jobId) openDetail(jobId);
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Extraction failed', severity: 'error' });
    } finally {
      setExtracting(null);
    }
  };

  // ── Open detail ───────────────────────────────────────────────────────────

  const openDetail = async (jobId: number) => {
    setDetailLoading(true);
    try {
      const res: any = await apiClient.get(`/api/ocr/table-jobs/${jobId}`);
      const data = res?.data ?? res;
      setDetailJob(data.job || null);
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.error || 'Failed to load detail', severity: 'error' });
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Download artifact ─────────────────────────────────────────────────────

  const downloadArtifact = (jobId: number, filename: string) => {
    window.open(`/api/ocr/table-jobs/${jobId}/artifacts/${filename}`, '_blank');
  };

  // ── Render single table ───────────────────────────────────────────────────

  const renderContractTable = (table: ContractTable) => {
    const tableName = table.table_number === 1
      ? 'Main Table (Groom / Bride)'
      : 'Footer Table (Priest / Witnesses / License)';

    return (
      <Box key={table.table_number} sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>Table {table.table_number}: {tableName}</Typography>
          <Chip size="small" label={`${table.column_count} cols`} variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
          <Chip size="small" label={`${table.row_count} rows`} variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
        </Stack>

        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              {/* Use the header row (row_index 0) as column headers */}
              {table.rows.filter(r => r.type === 'header').map(row => (
                <TableRow key={`h-${row.row_index}`}>
                  {row.cells.map(cell => (
                    <TableCell key={cell.column_index} sx={{
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      whiteSpace: 'normal',
                      maxWidth: 200,
                      bgcolor: alpha(theme.palette.primary.main, 0.06),
                    }}>
                      <Tooltip title={cell.content}>
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.65rem' }} noWrap>{cell.content}</Typography>
                      </Tooltip>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {table.rows.filter(r => r.type === 'row').map(row => (
                <TableRow key={row.row_index} sx={{
                  bgcolor: row.row_index === 1
                    ? alpha(theme.palette.info.main, 0.04)
                    : undefined,
                }}>
                  {row.cells.map(cell => {
                    const isSubHeader = row.row_index === 1;
                    const hasReview = cell.needs_review && !isSubHeader;
                    return (
                      <TableCell key={cell.column_index} sx={{
                        fontSize: '0.72rem',
                        fontWeight: isSubHeader ? 600 : 400,
                        fontStyle: isSubHeader ? 'italic' : undefined,
                        bgcolor: hasReview ? alpha(theme.palette.warning.main, 0.08) : undefined,
                        borderLeft: hasReview ? `2px solid ${theme.palette.warning.main}` : undefined,
                        maxWidth: 220,
                      }}>
                        <Tooltip title={
                          <Box>
                            {cell.confidence != null && <div>Confidence: {Math.round(cell.confidence * 100)}%</div>}
                            {cell.token_count != null && <div>Tokens: {cell.token_count}</div>}
                            {cell.reasons && <div>Issues: {cell.reasons.join(', ')}</div>}
                            {!cell.confidence && !cell.token_count && <div>{cell.content || 'empty'}</div>}
                          </Box>
                        }>
                          <Typography variant="body2" fontSize="0.72rem" sx={{ wordBreak: 'break-word' }}>
                            {cell.content || <em style={{ color: theme.palette.text.disabled }}>empty</em>}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(total / pageSize);
  const te = detailJob?.table_extraction;

  return (
    <PageContainer title="OCR Table Extractor" description="Layout-first table extraction from OCR jobs">
      <OcrStudioNav />
      <Box sx={{ p: { xs: 1, sm: 2 } }}>

        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconTable size={24} />
            <Typography variant="h5" fontWeight={700}>OCR Table Extractor</Typography>
          </Stack>
          <Button size="small" variant="outlined" onClick={fetchJobs}>Refresh</Button>
        </Stack>

        {/* Filters */}
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <TextField
                select
                size="small"
                label="Layout"
                value={layoutIdx}
                onChange={(e) => { setLayoutIdx(Number(e.target.value)); setPage(1); }}
                sx={{ minWidth: 200 }}
              >
                {LAYOUT_OPTIONS.map((opt, i) => (
                  <MenuItem key={i} value={i}>{opt.label}</MenuItem>
                ))}
              </TextField>
              <Autocomplete
                size="small"
                options={churches}
                getOptionLabel={(o) => `${o.name} (#${o.id})`}
                value={churchFilter}
                onChange={(_, v) => { setChurchFilter(v); setPage(1); }}
                renderInput={(params) => <TextField {...params} label="Church" placeholder="All churches" />}
                sx={{ minWidth: 260 }}
                isOptionEqualToValue={(o, v) => o.id === v.id}
              />
              <Typography variant="body2" color="text.secondary">
                {total} completed {selectedLayout.record_type} job{total !== 1 ? 's' : ''}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Jobs table */}
        <Card>
          <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 360px)' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Church</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>File</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Conf</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Table</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && jobs.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress size={24} /></TableCell></TableRow>
                ) : jobs.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><Typography variant="body2" color="text.secondary">No completed OCR jobs</Typography></TableCell></TableRow>
                ) : jobs.map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell><Typography variant="body2" fontFamily="monospace">{job.id}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 140 }}>{job.church_name || `Church ${job.church_id}`}</Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={job.filename || '—'}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>{job.filename || '—'}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell><Typography variant="body2" fontSize="0.75rem">{job.record_type}/{job.language}</Typography></TableCell>
                    <TableCell>
                      {job.confidence_score != null
                        ? <Typography variant="body2" fontSize="0.75rem">{Math.round(job.confidence_score * 100)}%</Typography>
                        : <Typography variant="body2" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell><Typography variant="body2" fontSize="0.72rem">{fmtDate(job.created_at)}</Typography></TableCell>
                    <TableCell>
                      {job.has_table_extraction
                        ? <Chip size="small" icon={<IconCheck size={14} />} label="Extracted" color="success" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                        : <Chip size="small" label="Pending" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        {/* Extract / Re-extract */}
                        <Tooltip title={job.has_table_extraction ? 'Re-extract table' : 'Extract table'}>
                          <span>
                            <IconButton
                              size="small"
                              color={job.has_table_extraction ? 'warning' : 'primary'}
                              onClick={() => handleExtract(job.id)}
                              disabled={extracting === job.id}
                            >
                              {extracting === job.id ? <CircularProgress size={14} /> : <IconPlayerPlay size={16} />}
                            </IconButton>
                          </span>
                        </Tooltip>
                        {/* View Output */}
                        <Tooltip title="View extraction output">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => openDetail(job.id)}
                              disabled={!job.has_table_extraction}
                            >
                              <IconEye size={16} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        {/* Download JSON */}
                        <Tooltip title="Download table_extraction.json">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => downloadArtifact(job.id, 'table_extraction.json')}
                              disabled={!job.has_table_extraction}
                            >
                              <IconDownload size={16} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {totalPages > 1 && <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}><Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} size="small" /></Box>}
        </Card>

        {/* ═══ DETAIL DIALOG ═══════════════════════════════════════════════════ */}
        <Dialog open={!!detailJob} onClose={() => setDetailJob(null)} maxWidth="xl" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Table Extraction — Job #{detailJob?.id}
            {detailJob && (
              <Chip size="small" label={selectedLayout.label} color="primary" variant="outlined" sx={{ ml: 1 }} />
            )}
            {detailLoading && <CircularProgress size={16} />}
            <Box sx={{ flexGrow: 1 }} />
            {detailJob && (
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<IconDownload size={14} />}
                  onClick={() => detailJob && downloadArtifact(detailJob.id, 'table_extraction.json')}
                  disabled={!detailJob.table_extraction}
                >
                  Download JSON
                </Button>
                <Button
                  size="small"
                  color="warning"
                  variant="contained"
                  startIcon={extracting === detailJob.id ? <CircularProgress size={14} color="inherit" /> : <IconPlayerPlay size={14} />}
                  onClick={() => detailJob && handleExtract(detailJob.id)}
                  disabled={extracting === detailJob.id}
                >
                  {detailJob.table_extraction ? 'Re-extract' : 'Extract'}
                </Button>
              </Stack>
            )}
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            {detailJob && (
              <Box sx={{ p: 2 }}>
                {/* Job info */}
                <Stack direction="row" spacing={3} sx={{ mb: 2 }} flexWrap="wrap">
                  <Typography variant="body2"><strong>Church:</strong> {detailJob.church_name} (#{detailJob.church_id})</Typography>
                  <Typography variant="body2"><strong>File:</strong> {detailJob.filename}</Typography>
                  <Typography variant="body2"><strong>Type:</strong> {detailJob.record_type}</Typography>
                </Stack>

                {/* Artifact downloads */}
                {detailJob.artifacts.length > 0 && (
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
                    {detailJob.artifacts.map(f => (
                      <Button key={f} size="small" variant="outlined" startIcon={<IconDownload size={14} />}
                        onClick={() => downloadArtifact(detailJob.id, f)}>
                        {f.replace('.json', '')}
                      </Button>
                    ))}
                  </Stack>
                )}

                <Divider sx={{ mb: 2 }} />

                {/* Table result */}
                {!te ? (
                  <Alert severity="info">No table extraction yet. Click Extract to run the {selectedLayout.label} layout extractor.</Alert>
                ) : (
                  <>
                    <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
                      <Chip size="small" label={`Layout: ${te.layout_id}`} />
                      <Chip size="small" label={`${te.tables.length} table(s)`} color="primary" />
                      <Chip size="small" label={`${te.data_rows} data row(s)`} color="primary" variant="outlined" />
                      <Chip size="small" label={`${te.data_tokens} tokens`} variant="outlined" />
                      <Typography variant="caption" color="text.secondary">Extracted: {fmtDate(te.extracted_at)}</Typography>
                    </Stack>

                    {te.tables.map(t => renderContractTable(t))}
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions><Button onClick={() => setDetailJob(null)}>Close</Button></DialogActions>
        </Dialog>

        {/* Toast */}
        <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast.msg}</Alert> : undefined}
        </Snackbar>
      </Box>
    </PageContainer>
  );
};

export default OcrTableExtractorPage;
