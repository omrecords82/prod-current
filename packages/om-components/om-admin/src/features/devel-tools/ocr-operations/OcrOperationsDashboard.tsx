/**
 * OcrOperationsDashboard — Admin dashboard for OCR job monitoring and operations
 * Route: /devel-tools/ocr-operations
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
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
  IconActivity,
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconDatabase,
  IconEye,
  IconFilter,
  IconPlayerPlay,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { apiClient } from '@/shared/lib/axiosInstance';
import OcrPipelineJob from '@/features/ocr/components/OcrPipelineJob';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardCounts {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

interface Activity24h {
  count: number;
  avgDurationSec: number;
}

interface OcrJob {
  id: number;
  church_id: number;
  church_name: string;
  filename: string;
  status: string;
  current_stage: string | null;
  progress_percent: number;
  record_type: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_regions: string | null;
}

interface HistoryEntry {
  id: number;
  stage: string;
  status: string;
  message: string | null;
  duration_ms: number | null;
  created_at: string;
}

interface Church {
  id: number;
  name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

const getStatusColor = (status: string, theme: any) => {
  switch (status) {
    case 'completed':
    case 'complete':
      return theme.palette.success.main;
    case 'failed':
    case 'error':
      return theme.palette.error.main;
    case 'processing':
      return theme.palette.warning.main;
    case 'queued':
    case 'pending':
      return theme.palette.info.main;
    default:
      return theme.palette.grey[500];
  }
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const OcrOperationsDashboard: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Dashboard state
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [activity24h, setActivity24h] = useState<Activity24h | null>(null);
  const [jobs, setJobs] = useState<OcrJob[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [churchFilter, setChurchFilter] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Detail drawer
  const [selectedJob, setSelectedJob] = useState<OcrJob | null>(null);
  const [jobHistory, setJobHistory] = useState<HistoryEntry[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Action loading
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch dashboard summary
  const fetchDashboard = useCallback(async () => {
    try {
      const res: any = await apiClient.get('/api/admin/ocr/dashboard', {
        params: churchFilter ? { church_id: churchFilter } : {},
      });
      const data = res.data || res;
      setCounts(data.counts || null);
      setActivity24h(data.activity24h || null);
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
    }
  }, [churchFilter]);

  // Fetch jobs list
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (statusFilter) params.status = statusFilter;
      if (churchFilter) params.church_id = churchFilter;
      if (searchQuery) params.q = searchQuery;

      const res: any = await apiClient.get('/api/admin/ocr/jobs', { params });
      const data = res.data || res;
      setJobs(data.rows || []);
      setTotal(data.total || 0);
      setChurches(data.churches || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, churchFilter, searchQuery]);

  // Fetch job history
  const fetchJobHistory = useCallback(async (churchId: number, jobId: number) => {
    try {
      const res: any = await apiClient.get(`/api/admin/ocr/jobs/${churchId}/${jobId}/history`);
      setJobHistory(res.data?.history || res.history || []);
    } catch {
      setJobHistory([]);
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    fetchDashboard();
    fetchJobs();
    const interval = setInterval(() => {
      fetchDashboard();
      fetchJobs();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchDashboard, fetchJobs]);

  // Open job detail drawer
  const handleViewJob = (job: OcrJob) => {
    setSelectedJob(job);
    fetchJobHistory(job.church_id, job.id);
    setDrawerOpen(true);
  };

  // Job actions
  const handleResume = async (job: OcrJob) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/api/admin/ocr/jobs/${job.church_id}/${job.id}/resume`);
      fetchJobs();
      if (selectedJob?.id === job.id) fetchJobHistory(job.church_id, job.id);
    } catch (err: any) {
      setError(err.message || 'Resume failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReprocess = async (job: OcrJob) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/api/admin/ocr/jobs/${job.church_id}/${job.id}/reprocess`);
      fetchJobs();
      if (selectedJob?.id === job.id) fetchJobHistory(job.church_id, job.id);
    } catch (err: any) {
      setError(err.message || 'Reprocess failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async (job: OcrJob) => {
    setActionLoading(true);
    try {
      await apiClient.delete(`/api/admin/ocr/jobs/${job.church_id}/${job.id}`);
      fetchJobs();
      if (selectedJob?.id === job.id) setDrawerOpen(false);
    } catch (err: any) {
      setError(err.message || 'Archive failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Summary cards
  const SummaryCard = ({ title, value, icon: Icon, color }: { title: string; value: number | string; icon: any; color: string }) => (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(color, 0.1),
            color,
          }}
        >
          <Icon size={24} />
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {title}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            OCR Operations Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor and manage OCR processing jobs across all churches
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<IconRefresh size={18} />}
          onClick={() => {
            fetchDashboard();
            fetchJobs();
          }}
        >
          Refresh
        </Button>
      </Stack>

      {/* Error alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={4} md={2}>
          <SummaryCard title="Queued" value={counts?.queued ?? '—'} icon={IconClock} color={theme.palette.info.main} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <SummaryCard title="Processing" value={counts?.processing ?? '—'} icon={IconActivity} color={theme.palette.warning.main} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <SummaryCard title="Completed" value={counts?.completed ?? '—'} icon={IconCheck} color={theme.palette.success.main} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <SummaryCard title="Failed" value={counts?.failed ?? '—'} icon={IconAlertTriangle} color={theme.palette.error.main} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <SummaryCard title="24h Jobs" value={activity24h?.count ?? '—'} icon={IconDatabase} color={theme.palette.primary.main} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <SummaryCard
            title="Avg Duration"
            value={activity24h?.avgDurationSec ? formatDuration(activity24h.avgDurationSec) : '—'}
            icon={IconClock}
            color={theme.palette.grey[600]}
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <IconFilter size={20} color={theme.palette.text.secondary} />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Church</InputLabel>
            <Select value={churchFilter} label="Church" onChange={(e) => { setChurchFilter(e.target.value as any); setPage(1); }}>
              <MenuItem value="">All Churches</MenuItem>
              {churches.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            placeholder="Search filename or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{ startAdornment: <IconSearch size={16} style={{ marginRight: 8, opacity: 0.5 }} /> }}
            sx={{ minWidth: 200 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {total} total jobs
          </Typography>
        </Stack>
      </Paper>

      {/* Jobs table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: isDark ? 'grey.900' : 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Church</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Stage</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Progress</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Duration</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No jobs found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => {
                const isFailed = job.status === 'failed' || job.status === 'error';
                const duration =
                  job.started_at && job.completed_at
                    ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
                    : null;

                return (
                  <TableRow
                    key={job.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      bgcolor: isFailed ? alpha(theme.palette.error.main, 0.03) : undefined,
                    }}
                    onClick={() => handleViewJob(job)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        #{job.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                        {job.church_name || `Church ${job.church_id}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={job.status}
                        size="small"
                        sx={{
                          bgcolor: alpha(getStatusColor(job.status, theme), 0.12),
                          color: getStatusColor(job.status, theme),
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          height: 22,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {job.current_stage || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 60,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha(getStatusColor(job.status, theme), 0.15),
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              width: `${job.progress_percent || 0}%`,
                              height: '100%',
                              bgcolor: getStatusColor(job.status, theme),
                              borderRadius: 3,
                            }}
                          />
                        </Box>
                        <Typography variant="caption">{job.progress_percent || 0}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{formatDate(job.created_at)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{duration ? formatDuration(duration) : '—'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="View details">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleViewJob(job); }}>
                            <IconEye size={16} />
                          </IconButton>
                        </Tooltip>
                        {isFailed && (
                          <>
                            <Tooltip title="Resume">
                              <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleResume(job); }}
                                disabled={actionLoading}
                              >
                                <IconPlayerPlay size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reprocess">
                              <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleReprocess(job); }}
                                disabled={actionLoading}
                              >
                                <IconRefresh size={16} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {total > pageSize && (
        <Stack direction="row" justifyContent="center" spacing={1} mt={2}>
          <Button size="small" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Typography variant="body2" sx={{ px: 2, display: 'flex', alignItems: 'center' }}>
            Page {page} of {Math.ceil(total / pageSize)}
          </Typography>
          <Button size="small" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </Stack>
      )}

      {/* Job detail drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}>
        {selectedJob && (
          <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" fontWeight={600}>
                Job #{selectedJob.id}
              </Typography>
              <IconButton onClick={() => setDrawerOpen(false)}>
                <IconX size={20} />
              </IconButton>
            </Stack>

            {/* Pipeline visualization */}
            <Box mb={3}>
              <OcrPipelineJob jobId={selectedJob.id} churchId={selectedJob.church_id} />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Job info */}
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Details
            </Typography>
            <Stack spacing={1} mb={3}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Church</Typography>
                <Typography variant="body2">{selectedJob.church_name || `Church ${selectedJob.church_id}`}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Filename</Typography>
                <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{selectedJob.filename}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Record Type</Typography>
                <Typography variant="body2">{selectedJob.record_type || '—'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Created</Typography>
                <Typography variant="body2">{formatDate(selectedJob.created_at)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Started</Typography>
                <Typography variant="body2">{formatDate(selectedJob.started_at)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Completed</Typography>
                <Typography variant="body2">{formatDate(selectedJob.completed_at)}</Typography>
              </Box>
            </Stack>

            {/* Error */}
            {selectedJob.error_regions && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {selectedJob.error_regions}
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />

            {/* History */}
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Stage History
            </Typography>
            {jobHistory.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No history available</Typography>
            ) : (
              <Stack spacing={1}>
                {jobHistory.map((h) => (
                  <Box
                    key={h.id}
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      bgcolor: h.status === 'completed' ? alpha(theme.palette.success.main, 0.05) : h.status === 'failed' ? alpha(theme.palette.error.main, 0.05) : 'transparent',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {h.status === 'completed' ? (
                          <IconCheck size={14} color={theme.palette.success.main} />
                        ) : h.status === 'failed' ? (
                          <IconX size={14} color={theme.palette.error.main} />
                        ) : (
                          <IconClock size={14} color={theme.palette.grey[500]} />
                        )}
                        <Typography variant="body2" fontWeight={500}>{h.stage}</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(h.created_at)}
                      </Typography>
                    </Stack>
                    {h.message && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {h.message}
                      </Typography>
                    )}
                    {h.duration_ms && (
                      <Typography variant="caption" color="text.secondary">
                        Duration: {h.duration_ms}ms
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Actions */}
            <Stack direction="row" spacing={1}>
              {(selectedJob.status === 'failed' || selectedJob.status === 'error') && (
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<IconPlayerPlay size={16} />}
                    onClick={() => handleResume(selectedJob)}
                    disabled={actionLoading}
                  >
                    Resume
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<IconRefresh size={16} />}
                    onClick={() => handleReprocess(selectedJob)}
                    disabled={actionLoading}
                  >
                    Reprocess
                  </Button>
                </>
              )}
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<IconTrash size={16} />}
                onClick={() => handleArchive(selectedJob)}
                disabled={actionLoading}
              >
                Archive
              </Button>
            </Stack>
          </Box>
        )}
      </Drawer>
    </Box>
  );
};

export default OcrOperationsDashboard;
