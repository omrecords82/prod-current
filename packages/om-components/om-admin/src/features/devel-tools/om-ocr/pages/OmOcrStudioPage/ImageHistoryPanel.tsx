import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  IconAlertCircle,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconFile,
  IconFileCheck,
  IconLoader2,
  IconPhoto,
  IconRefresh,
  IconSortAscending,
} from '@tabler/icons-react';
import { apiClient } from '@/shared/lib/axiosInstance';
import EmptyState from '@/shared/ui/EmptyState';
import type { OcrJob } from './types';

// ─── Constants ──────────────────────────────────────────────────────────────────

const JOBS_PER_PAGE = 12;
const VISITED_KEY = 'ocr_visited_jobs';

// ─── Local types ────────────────────────────────────────────────────────────────

interface ImageHistoryPanelProps {
  churchId: number;
  refreshKey: number;
}

type SortField = 'date' | 'record_type' | 'status' | 'confidence';
type SortDir = 'asc' | 'desc';

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Strip server paths and extensions to show a human-friendly label */
function friendlyFilename(raw: string): string {
  if (!raw) return 'Untitled';
  // Take only the last path segment
  let name = raw.includes('/') ? raw.split('/').pop()! : raw;
  name = name.includes('\\') ? name.split('\\').pop()! : name;
  // Strip extension
  name = name.replace(/\.(jpe?g|png|tiff?|bmp|webp|pdf|gif)$/i, '');
  // Replace underscores/dashes with spaces, collapse whitespace
  name = name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  // Truncate if still very long
  if (name.length > 40) name = name.substring(0, 37) + '...';
  return name || 'Untitled';
}

/** Read visited job IDs from localStorage */
function getVisitedJobs(): Set<string> {
  try {
    const raw = localStorage.getItem(VISITED_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

/** Mark a job as visited in localStorage */
function markJobVisited(jobId: string | number): void {
  try {
    const visited = getVisitedJobs();
    visited.add(String(jobId));
    // Keep at most 500 entries
    const arr = [...visited];
    if (arr.length > 500) arr.splice(0, arr.length - 500);
    localStorage.setItem(VISITED_KEY, JSON.stringify(arr));
  } catch { /* ignore */ }
}

// ─── Component ──────────────────────────────────────────────────────────────────

const ImageHistoryPanel: React.FC<ImageHistoryPanelProps> = ({ churchId, refreshKey }) => {
  const theme = useTheme();
  const [jobs, setJobs] = useState<OcrJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(getVisitedJobs);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadJobs = useCallback(async () => {
    if (!churchId) return;
    setLoading(true);
    try {
      const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs`);
      const all: OcrJob[] = res?.data?.jobs || res?.data || res?.jobs || [];
      setJobs(all);
    } catch { setJobs([]); }
    setLoading(false);
  }, [churchId]);

  useEffect(() => { loadJobs(); }, [loadJobs, refreshKey]);

  // Poll while any job is processing
  const hasProcessing = jobs.some((j) => j.status === 'pending' || j.status === 'queued' || j.status === 'processing');
  useEffect(() => {
    if (!hasProcessing) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(loadJobs, 5000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [hasProcessing, loadJobs]);

  // Reset to page 0 when sort changes
  useEffect(() => { setPage(0); }, [sortField, sortDir]);

  const getStatusColor = (status: string) => {
    if (status === 'complete' || status === 'completed') return theme.palette.success.main;
    if (status === 'error' || status === 'failed') return theme.palette.error.main;
    return theme.palette.warning.main;
  };

  const getStatusLabel = (status: string) => {
    if (status === 'complete' || status === 'completed') return 'Complete';
    if (status === 'error' || status === 'failed') return 'Error';
    if (status === 'processing') return 'Processing';
    return 'Pending';
  };

  const isClickable = (status: string) => status === 'complete' || status === 'completed';

  const handleJobClick = (jobId: string | number) => {
    markJobVisited(jobId);
    setVisitedIds(getVisitedJobs());
    window.location.href = `/devel/ocr-studio/review/${churchId}/${jobId}`;
  };

  // Sort jobs
  const sortedJobs = React.useMemo(() => {
    const sorted = [...jobs];
    const dir = sortDir === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      switch (sortField) {
        case 'date': {
          const da = a.created_at ? new Date(a.created_at).getTime() : 0;
          const db = b.created_at ? new Date(b.created_at).getTime() : 0;
          return (da - db) * dir;
        }
        case 'record_type':
          return (a.record_type || '').localeCompare(b.record_type || '') * dir;
        case 'status':
          return (a.status || '').localeCompare(b.status || '') * dir;
        case 'confidence': {
          const ca = a.confidence_score ?? -1;
          const cb = b.confidence_score ?? -1;
          return (ca - cb) * dir;
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [jobs, sortField, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / JOBS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageJobs = sortedJobs.slice(safePage * JOBS_PER_PAGE, (safePage + 1) * JOBS_PER_PAGE);

  if (loading && jobs.length === 0) {
    return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={28} /></Box>;
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        illustration={<IconPhoto size={56} stroke={1.5} />}
        title="No OCR history yet"
        description="This church has no processed records. Upload baptism, marriage, or funeral ledger images to see their history here."
      />
    );
  }

  const sortOptions: { value: SortField; label: string }[] = [
    { value: 'date', label: 'Date' },
    { value: 'record_type', label: 'Record Type' },
    { value: 'status', label: 'Status' },
    { value: 'confidence', label: 'Confidence' },
  ];

  return (
    <Box>
      {/* Header toolbar: count, sort, view toggle */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        <Typography variant="body2" color="text.secondary">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''}{hasProcessing ? ' (processing...)' : ''}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          {/* Sort controls */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconSortAscending size={16} color={theme.palette.text.secondary} />
            <Select
              size="small"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              sx={{ fontSize: '0.75rem', height: 28, minWidth: 100,
                '& .MuiSelect-select': { py: 0.25, px: 1 } }}
            >
              {sortOptions.map((o) => (
                <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.75rem' }}>{o.label}</MenuItem>
              ))}
            </Select>
            <IconButton
              size="small"
              onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
              sx={{ color: theme.palette.text.secondary, width: 28, height: 28 }}
              title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortDir === 'asc' ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </IconButton>
          </Stack>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* View mode toggle */}
          <IconButton
            size="small"
            onClick={() => setViewMode('grid')}
            sx={{ color: viewMode === 'grid' ? theme.palette.primary.main : theme.palette.text.disabled, width: 28, height: 28 }}
          >
            <IconPhoto size={18} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setViewMode('list')}
            sx={{ color: viewMode === 'list' ? theme.palette.primary.main : theme.palette.text.disabled, width: 28, height: 28 }}
          >
            <IconFile size={18} />
          </IconButton>
          <IconButton size="small" onClick={loadJobs} sx={{ color: theme.palette.text.secondary, width: 28, height: 28 }}>
            <IconRefresh size={18} />
          </IconButton>
        </Stack>
      </Stack>

      {viewMode === 'grid' ? (
        /* -- Grid View -- */
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 2,
        }}>
          {pageJobs.map((job) => {
            const clickable = isClickable(job.status);
            const visited = visitedIds.has(String(job.id));
            return (
              <Paper
                key={job.id}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  cursor: clickable ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  borderWidth: visited ? 2 : 1,
                  borderColor: visited ? alpha(theme.palette.primary.main, 0.5) : undefined,
                  '&:hover': clickable ? {
                    borderColor: theme.palette.primary.main,
                    transform: 'translateY(-1px)',
                    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.15)}`,
                  } : {},
                }}
                onClick={() => { if (clickable) handleJobClick(job.id); }}
              >
                {/* Thumbnail */}
                <Box sx={{
                  height: 120,
                  bgcolor: alpha(theme.palette.text.primary, 0.04),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}>
                  <Box
                    component="img"
                    src={`/api/church/${churchId}/ocr/jobs/${job.id}/image`}
                    loading="lazy"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e: any) => { e.target.style.display = 'none'; }}
                  />
                  <IconPhoto size={32} color={theme.palette.text.disabled} style={{ position: 'absolute' }} />
                  {!isClickable(job.status) && job.status !== 'error' && job.status !== 'failed' && (
                    <Box sx={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: alpha(theme.palette.background.default, 0.6),
                    }}>
                      <CircularProgress size={24} />
                    </Box>
                  )}
                  {/* Visited badge */}
                  {visited && (
                    <Box sx={{
                      position: 'absolute', top: 4, right: 4,
                      width: 18, height: 18, borderRadius: '50%',
                      bgcolor: theme.palette.primary.main,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <IconCheck size={12} color="#fff" />
                    </Box>
                  )}
                </Box>
                {/* Info */}
                <Box sx={{ p: 1.5 }}>
                  <Typography variant="caption" fontWeight={600} noWrap sx={{ display: 'block', mb: 0.5 }}
                    title={job.filename}
                  >
                    {friendlyFilename(job.filename)}
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                    <Chip
                      size="small"
                      label={getStatusLabel(job.status)}
                      sx={{
                        height: 18, fontSize: '0.6rem', fontWeight: 600,
                        bgcolor: alpha(getStatusColor(job.status), 0.1),
                        color: getStatusColor(job.status),
                      }}
                    />
                    {job.record_type && job.record_type !== 'unknown' && (
                      <Chip size="small" label={job.record_type} sx={{ height: 18, fontSize: '0.6rem' }} />
                    )}
                    {job.confidence_score != null && job.confidence_score > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                        {Math.round(job.confidence_score * 100)}%
                      </Typography>
                    )}
                  </Stack>
                  {job.created_at && (
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', mt: 0.5, display: 'block' }}>
                      {new Date(job.created_at).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
              </Paper>
            );
          })}
        </Box>
      ) : (
        /* -- List View -- */
        <Stack spacing={0.5}>
          {pageJobs.map((job) => {
            const clickable = isClickable(job.status);
            const visited = visitedIds.has(String(job.id));
            return (
              <Paper
                key={job.id}
                variant="outlined"
                sx={{
                  px: 2, py: 1, cursor: clickable ? 'pointer' : 'default',
                  borderRadius: 1.5,
                  borderWidth: visited ? 2 : 1,
                  borderColor: visited ? alpha(theme.palette.primary.main, 0.5) : undefined,
                  '&:hover': clickable ? { bgcolor: alpha(theme.palette.primary.main, 0.04) } : {},
                }}
                onClick={() => { if (clickable) handleJobClick(job.id); }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  {isClickable(job.status) ? (
                    <IconFileCheck size={18} color={theme.palette.success.main} />
                  ) : job.status === 'error' || job.status === 'failed' ? (
                    <IconAlertCircle size={18} color={theme.palette.error.main} />
                  ) : (
                    <IconLoader2 size={18} color={theme.palette.warning.main} className="spin" />
                  )}
                  {visited && (
                    <Box sx={{
                      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <IconCheck size={10} color={theme.palette.primary.main} />
                    </Box>
                  )}
                  <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}
                    title={job.filename}
                  >
                    {friendlyFilename(job.filename)}
                  </Typography>
                  <Chip
                    size="small"
                    label={getStatusLabel(job.status)}
                    sx={{
                      height: 18, fontSize: '0.6rem', fontWeight: 600,
                      bgcolor: alpha(getStatusColor(job.status), 0.1),
                      color: getStatusColor(job.status),
                    }}
                  />
                  {job.record_type && job.record_type !== 'unknown' && (
                    <Chip size="small" label={job.record_type} sx={{ height: 18, fontSize: '0.6rem' }} />
                  )}
                  {job.confidence_score != null && job.confidence_score > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {Math.round(job.confidence_score * 100)}%
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {job.created_at ? new Date(job.created_at).toLocaleDateString() : ''}
                  </Typography>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mt: 2.5 }}>
          <IconButton
            size="small"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            sx={{ width: 28, height: 28 }}
          >
            <IconChevronLeft size={18} />
          </IconButton>
          <Typography variant="caption" color="text.secondary">
            {safePage + 1} / {totalPages}
          </Typography>
          <IconButton
            size="small"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            sx={{ width: 28, height: 28 }}
          >
            <IconChevronRight size={18} />
          </IconButton>
        </Stack>
      )}
    </Box>
  );
};

export default ImageHistoryPanel;
