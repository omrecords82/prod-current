/**
 * UnifiedJobsList - OCR jobs table with full lifecycle actions
 * Columns: File name, Type, Started, Age, Status, Error, Actions
 * Actions: Open, Re-process, Delete (page-only or page+DB), Auto-archive 7+ days
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  Checkbox,
  Stack,
  Button,
  Typography,
  useTheme,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  alpha,
  Alert,
} from '@mui/material';
import {
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconRotateClockwise,
  IconEye,
  IconArchive,
  IconAlertTriangle,
  IconFileText,
  IconSearch,
} from '@tabler/icons-react';
import EmptyState from '@/shared/ui/EmptyState';
import type { OCRJobRow } from '../../types/ocrJob';

interface UnifiedJobsListProps {
  jobs: OCRJobRow[];
  loading: boolean;
  error: string | null;
  onJobSelect: (jobId: number) => void;
  onRefresh: () => void | Promise<void>;
  onDeleteJobs?: (jobIds: number[]) => void | Promise<void>;
  onRetryJob?: (jobId: number) => Promise<boolean>;
  onHideJobs?: (jobIds: number[]) => void;
  churchId: number;
}

const AUTO_ARCHIVE_DAYS = 7;

const UnifiedJobsList: React.FC<UnifiedJobsListProps> = ({
  jobs,
  loading,
  error,
  onJobSelect,
  onRefresh,
  onDeleteJobs,
  onRetryJob,
  onHideJobs,
  churchId,
}) => {
  const theme = useTheme();
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set());
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [sortBy, setSortBy] = useState<'added' | 'filename'>('added');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'page' | 'database'>('database');
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const [archivedCount, setArchivedCount] = useState(0);

  // Auto-archive: hide jobs older than 7 days on mount
  useEffect(() => {
    if (!onHideJobs || jobs.length === 0) return;
    const now = Date.now();
    const oldJobIds = jobs
      .filter(j => {
        if (!j.created_at) return false;
        const age = now - new Date(j.created_at).getTime();
        const days = age / (1000 * 60 * 60 * 24);
        const isTerminal = ['completed', 'complete', 'failed', 'error'].includes(j.status);
        return days >= AUTO_ARCHIVE_DAYS && isTerminal;
      })
      .map(j => j.id);

    if (oldJobIds.length > 0) {
      onHideJobs(oldJobIds);
      setArchivedCount(oldJobIds.length);
    }
  }, []); // Run once on mount

  // Filtered and sorted jobs (exclude active auto-archive candidates that haven't been hidden yet)
  const sortedJobs = useMemo(() => {
    const sorted = [...jobs].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'added') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        comparison = dateA - dateB;
      } else if (sortBy === 'filename') {
        const nameA = (a.original_filename || '').toLowerCase();
        const nameB = (b.original_filename || '').toLowerCase();
        comparison = nameA.localeCompare(nameB);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted.slice(0, itemsPerPage);
  }, [jobs, sortBy, sortOrder, itemsPerPage]);

  // Format date as "Feb 13, 2:45 PM"
  const formatStarted = useCallback((dateString: string | undefined) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
           d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }, []);

  // Format age as "Xm", "Xh", "Xd"
  const formatAge = useCallback((dateString: string | undefined) => {
    if (!dateString) return '-';
    const diffMs = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  }, []);

  const toggleSelection = useCallback((jobId: number) => {
    setSelectedJobs(prev => {
      const next = new Set(prev);
      next.has(jobId) ? next.delete(jobId) : next.add(jobId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedJobs.size === sortedJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(sortedJobs.map(j => j.id)));
    }
  }, [sortedJobs, selectedJobs.size]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': case 'complete': return 'success';
      case 'processing': return 'info';
      case 'failed': case 'error': return 'error';
      case 'queued': case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': case 'complete': return 'Completed';
      case 'processing': return 'Processing';
      case 'failed': case 'error': return 'Failed';
      case 'queued': case 'pending': return 'Queued';
      default: return status || 'Unknown';
    }
  };

  const handleSort = useCallback((column: 'added' | 'filename') => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  }, [sortBy]);

  // Open delete dialog for selected or specific jobs
  const openDeleteDialog = useCallback((jobIds: number[]) => {
    setPendingDeleteIds(jobIds);
    setDeleteMode('database');
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setDeleteDialogOpen(false);
    if (pendingDeleteIds.length === 0) return;

    if (deleteMode === 'page') {
      // Remove from page only (hide)
      onHideJobs?.(pendingDeleteIds);
    } else {
      // Delete from database AND page
      await onDeleteJobs?.(pendingDeleteIds);
    }
    setSelectedJobs(prev => {
      const next = new Set(prev);
      pendingDeleteIds.forEach(id => next.delete(id));
      return next;
    });
    setPendingDeleteIds([]);
  }, [deleteMode, pendingDeleteIds, onDeleteJobs, onHideJobs]);

  const handleRetry = useCallback(async (jobId: number) => {
    if (onRetryJob) {
      await onRetryJob(jobId);
    }
  }, [onRetryJob]);

  const isRetryable = (status: string) => {
    return ['failed', 'error', 'completed', 'complete'].includes(status?.toLowerCase());
  };

  const isClickable = (status: string) => {
    return ['completed', 'complete'].includes(status?.toLowerCase());
  };

  // Score color based on confidence
  const getScoreColor = (score: number | null | undefined): 'success' | 'warning' | 'error' | 'default' => {
    if (score == null) return 'default';
    if (score >= 0.85) return 'success';
    if (score >= 0.65) return 'warning';
    return 'error';
  };

  const formatScore = (score: number | null | undefined): string => {
    if (score == null) return '-';
    return `${Math.round(score * 100)}%`;
  };

  const colCount = 9; // checkbox + filename + type + started + age + status + score + error + actions

  return (
    <Paper variant="outlined" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Controls */}
      <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <Select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              sx={{ '& .MuiSelect-select': { py: 0.75 } }}
            >
              <MenuItem value={10}>10 per page</MenuItem>
              <MenuItem value={20}>20 per page</MenuItem>
              <MenuItem value={50}>50 per page</MenuItem>
              <MenuItem value={100}>100 per page</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
            {archivedCount > 0 && ` (${archivedCount} auto-archived)`}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          {selectedJobs.size > 0 && (
            <>
              <Tooltip title="Re-process selected">
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    color="info"
                    startIcon={<IconRotateClockwise size={16} />}
                    onClick={async () => {
                      for (const id of selectedJobs) {
                        const job = jobs.find(j => j.id === id);
                        if (job && isRetryable(job.status)) {
                          await handleRetry(id);
                        }
                      }
                      setSelectedJobs(new Set());
                    }}
                    sx={{ textTransform: 'none', height: 32 }}
                  >
                    Re-process ({[...selectedJobs].filter(id => { const j = jobs.find(x => x.id === id); return j && isRetryable(j.status); }).length})
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="Delete selected">
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<IconTrash size={16} />}
                  onClick={() => openDeleteDialog(Array.from(selectedJobs))}
                  sx={{ textTransform: 'none', height: 32 }}
                >
                  Delete ({selectedJobs.size})
                </Button>
              </Tooltip>
            </>
          )}
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={() => onRefresh()}>
              <IconRefresh size={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Table */}
      <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: 42 }}>
                <Checkbox
                  size="small"
                  checked={sortedJobs.length > 0 && selectedJobs.size === sortedJobs.length}
                  indeterminate={selectedJobs.size > 0 && selectedJobs.size < sortedJobs.length}
                  onChange={toggleSelectAll}
                />
              </TableCell>
              <TableCell
                sx={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('filename')}
              >
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <span>File name</span>
                  {sortBy === 'filename' && (sortOrder === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />)}
                </Stack>
              </TableCell>
              <TableCell sx={{ width: 80 }}>Type</TableCell>
              <TableCell
                sx={{ width: 140, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('added')}
              >
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <span>Started</span>
                  {sortBy === 'added' && (sortOrder === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />)}
                </Stack>
              </TableCell>
              <TableCell sx={{ width: 55 }}>Age</TableCell>
              <TableCell sx={{ width: 100 }}>Status</TableCell>
              <TableCell sx={{ width: 65 }}>Score</TableCell>
              <TableCell sx={{ minWidth: 120 }}>Error</TableCell>
              <TableCell sx={{ width: 120 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} align="center" sx={{ py: 4 }}>
                  <LinearProgress />
                </TableCell>
              </TableRow>
            ) : sortedJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} sx={{ border: 0, p: 0 }}>
                  {jobs.length === 0 ? (
                    <EmptyState
                      illustration={<IconFileText size={56} stroke={1.5} />}
                      title="No OCR jobs yet"
                      description="Upload a scanned record image to begin extraction. Processed jobs will appear here with their status, score, and actions."
                      actionLabel="Upload records"
                      onAction={() => {
                        const base = window.location.pathname.replace(/\/workbench.*$/, '');
                        window.location.href = `${base}/upload`;
                      }}
                    />
                  ) : (
                    <EmptyState
                      size="compact"
                      illustration={<IconSearch size={40} stroke={1.5} />}
                      title="No jobs match your filters"
                      description="Try clearing filters or changing the hide-by-status toggle to see more jobs."
                    />
                  )}
                </TableCell>
              </TableRow>
            ) : (
              sortedJobs.map((job) => {
                const isFailed = job.status === 'failed' || job.status === 'error';
                const isCompleted = job.status === 'completed' || job.status === 'complete';
                const canClick = isClickable(job.status);
                const canRetry = isRetryable(job.status);
                const ageDays = job.created_at
                  ? Math.floor((Date.now() - new Date(job.created_at).getTime()) / 86400000)
                  : 0;

                return (
                  <TableRow
                    key={job.id}
                    hover
                    selected={selectedJobs.has(job.id)}
                    sx={{
                      cursor: canClick ? 'pointer' : 'default',
                      bgcolor: isFailed ? alpha(theme.palette.error.main, 0.04) : undefined,
                      opacity: ageDays >= AUTO_ARCHIVE_DAYS ? 0.6 : 1,
                    }}
                    onClick={() => canClick && onJobSelect(job.id)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        size="small"
                        checked={selectedJobs.has(job.id)}
                        onChange={() => toggleSelection(job.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 350 }}>
                        {job.original_filename || 'Unknown'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={job.record_type || 'unknown'}
                        variant="outlined"
                        sx={{ height: 22, fontSize: '0.7rem', textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {formatStarted(job.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        fontWeight={500}
                        color={ageDays >= AUTO_ARCHIVE_DAYS ? 'warning.main' : 'text.secondary'}
                      >
                        {formatAge(job.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={getStatusLabel(job.status)}
                        color={getStatusColor(job.status) as any}
                        sx={{ height: 22, fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      {isCompleted && job.confidence_score != null ? (
                        <Chip
                          size="small"
                          label={formatScore(job.confidence_score)}
                          color={getScoreColor(job.confidence_score)}
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {isFailed && job.error_message ? (
                        <Tooltip title={job.error_message}>
                          <Typography
                            variant="caption"
                            color="error"
                            noWrap
                            sx={{ maxWidth: 200, display: 'block' }}
                          >
                            {job.error_message}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0} justifyContent="flex-end">
                        {canClick && (
                          <Tooltip title="Open">
                            <IconButton size="small" onClick={() => onJobSelect(job.id)}>
                              <IconEye size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canRetry && (
                          <Tooltip title={isFailed ? 'Retry' : 'Re-process'}>
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => handleRetry(job.id)}
                            >
                              <IconRotateClockwise size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(isFailed || isCompleted) && (
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => openDeleteDialog([job.id])}
                            >
                              <IconTrash size={16} />
                            </IconButton>
                          </Tooltip>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconAlertTriangle size={22} color={theme.palette.warning.main} />
            <Typography variant="h6">Delete {pendingDeleteIds.length} Job{pendingDeleteIds.length !== 1 ? 's' : ''}</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <RadioGroup value={deleteMode} onChange={(e) => setDeleteMode(e.target.value as any)}>
            <FormControlLabel
              value="page"
              control={<Radio size="small" />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>Remove from page only</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Hides from this view. Data stays in the database and can be restored.
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="database"
              control={<Radio size="small" />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500} color="error.main">
                    Delete from database
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Permanently removes job data and uploaded image. Cannot be undone.
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} size="small">Cancel</Button>
          <Button
            variant="contained"
            color={deleteMode === 'database' ? 'error' : 'primary'}
            onClick={handleDeleteConfirm}
            size="small"
          >
            {deleteMode === 'database' ? 'Delete Permanently' : 'Hide from Page'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UnifiedJobsList;
