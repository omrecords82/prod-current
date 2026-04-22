/**
 * ProcessedImagesTable Component
 * Displays OCR job results with blur-to-reveal functionality
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
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
  Typography,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  Badge,
  FormControlLabel,
  Switch,
  Checkbox,
  alpha,
  useTheme
} from '@mui/material';
import {
  IconEye,
  IconExternalLink,
  IconCopy,
  IconRefresh,
  IconCheck,
  IconX,
  IconLoader,
  IconAlertCircle,
  IconEyeOff,
  IconTrash,
  IconPlayerPlay,
  IconFileText,
} from '@tabler/icons-react';
import EmptyState from '@/shared/ui/EmptyState';
import type { OCRJobRow, OCRJobDetail, RecordType } from '../types/ocrJob';

interface ProcessedImagesTableProps {
  jobs: OCRJobRow[];
  churchId: number;
  loading?: boolean;
  onRefresh: () => void;
  onFetchDetail: (jobId: number) => Promise<OCRJobDetail | null>;
  onUpdateRecordType: (jobId: number, recordType: string) => Promise<boolean>;
  onRetryJob: (jobId: number) => Promise<boolean>;
  onDeleteJobs: (jobIds: number[]) => Promise<boolean>;
  onReprocessJobs: (jobIds: number[]) => Promise<boolean>;
  onInspect?: (job: OCRJobRow) => void;
  completedCount: number;
  failedCount: number;
}

// Status chip colors and icons
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'completed':
      return { color: 'success' as const, icon: <IconCheck size={14} /> };
    case 'failed':
      return { color: 'error' as const, icon: <IconX size={14} /> };
    case 'processing':
      return { color: 'info' as const, icon: <CircularProgress size={12} /> };
    case 'uploading':
      return { color: 'warning' as const, icon: <IconLoader size={14} /> };
    default:
      return { color: 'default' as const, icon: null };
  }
};

export const ProcessedImagesTable: React.FC<ProcessedImagesTableProps> = ({
  jobs,
  churchId,
  loading = false,
  onRefresh,
  onFetchDetail,
  onUpdateRecordType,
  onRetryJob,
  onDeleteJobs,
  onReprocessJobs,
  onInspect,
  completedCount,
  failedCount
}) => {
  const theme = useTheme();
  
  // State for reveal toggles per row
  const [revealedRows, setRevealedRows] = useState<Set<number>>(new Set());
  const [revealAll, setRevealAll] = useState(false);
  
  // State for selection
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  // State for preview dialog
  const [previewJob, setPreviewJob] = useState<OCRJobRow | null>(null);
  const [previewDetail, setPreviewDetail] = useState<OCRJobDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // State for copy feedback
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  // Loading states per job
  const [loadingJobs, setLoadingJobs] = useState<Set<number>>(new Set());

  // Toggle selection for a single row
  const toggleSelection = useCallback((jobId: number) => {
    setSelectedJobs(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }, []);

  // Select/deselect all
  const toggleSelectAll = useCallback(() => {
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(jobs.map(j => j.id)));
    }
  }, [jobs, selectedJobs.size]);

  // Bulk delete handler
  const handleBulkDelete = useCallback(async () => {
    if (selectedJobs.size === 0) return;
    
    if (!confirm(`Delete ${selectedJobs.size} selected job(s)? This cannot be undone.`)) {
      return;
    }
    
    setBulkActionLoading(true);
    const success = await onDeleteJobs(Array.from(selectedJobs));
    if (success) {
      setSelectedJobs(new Set());
    }
    setBulkActionLoading(false);
  }, [selectedJobs, onDeleteJobs]);

  // Bulk reprocess handler (only works for failed jobs)
  const handleBulkReprocess = useCallback(async () => {
    if (selectedJobs.size === 0) return;
    
    // Check which jobs are failed (only failed jobs can be retried)
    const selectedJobList = jobs.filter(j => selectedJobs.has(j.id));
    const failedJobs = selectedJobList.filter(j => j.status === 'failed');
    const nonFailedJobs = selectedJobList.filter(j => j.status !== 'failed');
    
    if (nonFailedJobs.length > 0) {
      // Show warning that non-failed jobs cannot be retried
      const message = nonFailedJobs.length === selectedJobList.length
        ? 'Only failed jobs can be retried. Please select failed jobs to retry.'
        : `${nonFailedJobs.length} of ${selectedJobList.length} selected jobs are not failed and cannot be retried. Only ${failedJobs.length} failed job(s) will be retried.`;
      
      if (!confirm(message + '\n\nContinue with failed jobs only?')) {
        return;
      }
    }
    
    if (failedJobs.length === 0) {
      alert('No failed jobs selected. Only failed jobs can be retried.');
      return;
    }
    
    setBulkActionLoading(true);
    try {
      const success = await onReprocessJobs(failedJobs.map(j => j.id));
      if (success) {
        setSelectedJobs(new Set());
      }
    } catch (err: any) {
      console.error('[ProcessedImagesTable] Reprocess error:', err);
      // Show user-friendly error without crashing
      alert(`Failed to reprocess jobs: ${err.message || 'Unknown error'}`);
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedJobs, jobs, onReprocessJobs]);

  // Toggle reveal for a single row
  const toggleReveal = useCallback((jobId: number) => {
    setRevealedRows(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }, []);

  // Toggle reveal all
  const handleRevealAllToggle = useCallback(() => {
    if (revealAll) {
      setRevealedRows(new Set());
    } else {
      const completedIds = jobs.filter(j => j.status === 'completed').map(j => j.id);
      setRevealedRows(new Set(completedIds));
    }
    setRevealAll(!revealAll);
  }, [revealAll, jobs]);

  // Check if row is revealed
  const isRevealed = useCallback((jobId: number) => {
    return revealedRows.has(jobId) || revealAll;
  }, [revealedRows, revealAll]);

  // Open preview dialog
  const handlePreview = useCallback(async (job: OCRJobRow) => {
    setPreviewJob(job);
    setPreviewLoading(true);
    setPreviewDetail(null);
    
    const detail = await onFetchDetail(job.id);
    setPreviewDetail(detail);
    setPreviewLoading(false);
  }, [onFetchDetail]);

  // Close preview dialog
  const closePreview = useCallback(() => {
    setPreviewJob(null);
    setPreviewDetail(null);
  }, []);

  // Copy OCR text
  const handleCopy = useCallback(async (job: OCRJobRow) => {
    setLoadingJobs(prev => new Set(prev).add(job.id));
    
    const detail = await onFetchDetail(job.id);
    if (detail?.ocr_text) {
      await navigator.clipboard.writeText(detail.ocr_text);
      setCopiedId(job.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
    
    setLoadingJobs(prev => {
      const next = new Set(prev);
      next.delete(job.id);
      return next;
    });
  }, [onFetchDetail]);

  // Handle record type change
  const handleRecordTypeChange = useCallback(async (jobId: number, newType: string) => {
    setLoadingJobs(prev => new Set(prev).add(jobId));
    await onUpdateRecordType(jobId, newType);
    setLoadingJobs(prev => {
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
  }, [onUpdateRecordType]);

  // Handle retry (only works for failed jobs)
  const handleRetry = useCallback(async (jobId: number) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) {
      console.warn(`[ProcessedImagesTable] Job ${jobId} not found`);
      return;
    }
    
    if (job.status !== 'failed') {
      alert(`Cannot retry job: status is '${job.status}'. Only failed jobs can be retried.`);
      return;
    }
    
    setLoadingJobs(prev => new Set(prev).add(jobId));
    try {
      const success = await onRetryJob(jobId);
      if (!success) {
        alert('Failed to retry job. Please check the console for details.');
      }
    } catch (err: any) {
      console.error('[ProcessedImagesTable] Retry error:', err);
      // Show user-friendly error without crashing
      alert(`Failed to retry job: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingJobs(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  }, [onRetryJob, jobs]);

  // Get image URL
  const getImageUrl = useCallback((jobId: number) => {
    return `/api/church/${churchId}/ocr/jobs/${jobId}/image`;
  }, [churchId]);

  // Blur styles
  const blurredStyle = useMemo(() => ({
    filter: 'blur(10px)',
    transition: 'filter 250ms ease',
    cursor: 'pointer',
    position: 'relative' as const
  }), []);

  const revealedStyle = useMemo(() => ({
    filter: 'none',
    transition: 'filter 250ms ease'
  }), []);

  // Monospace font for OCR text
  const monoStyle = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: '0.75rem',
    whiteSpace: 'pre-wrap' as const,
    maxHeight: 120,
    overflow: 'hidden'
  };

  return (
    <>
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mt: 3 }}>
        <CardHeader
          title={
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h6">Processed Images</Typography>
              <Badge badgeContent={completedCount} color="success" max={999}>
                <Chip size="small" label="Completed" color="success" variant="outlined" />
              </Badge>
              <Badge badgeContent={failedCount} color="error" max={999}>
                <Chip size="small" label="Failed" color="error" variant="outlined" />
              </Badge>
            </Stack>
          }
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              {/* Bulk Actions */}
              {selectedJobs.size > 0 && (
                <>
                  <Chip 
                    size="small" 
                    label={`${selectedJobs.size} selected`} 
                    onDelete={() => setSelectedJobs(new Set())}
                  />
                  <Tooltip title="Delete Selected">
                    <IconButton 
                      onClick={handleBulkDelete} 
                      disabled={bulkActionLoading}
                      color="error"
                      size="small"
                    >
                      <IconTrash size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Reprocess Selected">
                    <IconButton 
                      onClick={handleBulkReprocess} 
                      disabled={bulkActionLoading}
                      color="primary"
                      size="small"
                    >
                      <IconPlayerPlay size={18} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={revealAll}
                    onChange={handleRevealAllToggle}
                  />
                }
                label={revealAll ? 'Hide All' : 'Reveal All'}
                sx={{ mr: 1 }}
              />
              <Tooltip title="Refresh">
                <IconButton onClick={onRefresh} disabled={loading}>
                  {loading ? <CircularProgress size={20} /> : <IconRefresh size={20} />}
                </IconButton>
              </Tooltip>
            </Stack>
          }
        />
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" width={50}>
                    <Checkbox
                      indeterminate={selectedJobs.size > 0 && selectedJobs.size < jobs.length}
                      checked={jobs.length > 0 && selectedJobs.size === jobs.length}
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                  <TableCell width={80}>Preview</TableCell>
                  <TableCell>Filename</TableCell>
                  <TableCell width={140}>Record Type</TableCell>
                  <TableCell width={110}>Status</TableCell>
                  <TableCell width={280}>OCR Result Preview</TableCell>
                  <TableCell width={160} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ border: 0, p: 0 }}>
                      <EmptyState
                        illustration={<IconFileText size={56} stroke={1.5} />}
                        title="No processed images yet"
                        description="Upload a scanned ledger image to start OCR. Completed jobs will appear here with a preview and the extracted text."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map(job => {
                    const revealed = isRevealed(job.id);
                    const isCompleted = job.status === 'completed';
                    const isJobLoading = loadingJobs.has(job.id);
                    const statusConfig = getStatusConfig(job.status);
                    const isSelected = selectedJobs.has(job.id);

                    return (
                      <TableRow 
                        key={job.id}
                        selected={isSelected}
                        sx={{ 
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                          opacity: isJobLoading ? 0.7 : 1
                        }}
                      >
                        {/* Selection Checkbox */}
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleSelection(job.id)}
                          />
                        </TableCell>
                        {/* Thumbnail */}
                        <TableCell>
                          <Box
                            onClick={() => isCompleted && toggleReveal(job.id)}
                            sx={{
                              width: 60,
                              height: 60,
                              borderRadius: 1,
                              overflow: 'hidden',
                              border: '1px solid',
                              borderColor: 'divider',
                              position: 'relative',
                              ...(isCompleted && !revealed ? blurredStyle : revealedStyle)
                            }}
                          >
                            <img
                              src={getImageUrl(job.id)}
                              alt={job.original_filename}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                            {isCompleted && !revealed && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  inset: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  bgcolor: 'rgba(0,0,0,0.3)',
                                  color: 'white',
                                  fontSize: '0.6rem'
                                }}
                              >
                                Click
                              </Box>
                            )}
                          </Box>
                        </TableCell>

                        {/* Filename */}
                        <TableCell>
                          <Typography variant="body2" noWrap title={job.original_filename}>
                            {job.original_filename}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {job.created_at ? new Date(job.created_at).toLocaleString() : '—'}
                          </Typography>
                        </TableCell>

                        {/* Record Type */}
                        <TableCell>
                          <Select
                            size="small"
                            value={job.record_type || 'baptism'}
                            onChange={(e) => handleRecordTypeChange(job.id, e.target.value)}
                            disabled={isJobLoading}
                            sx={{ minWidth: 110 }}
                          >
                            <MenuItem value="baptism">Baptism</MenuItem>
                            <MenuItem value="marriage">Marriage</MenuItem>
                            <MenuItem value="funeral">Funeral</MenuItem>
                          </Select>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Chip
                              size="small"
                              label={job.status}
                              color={statusConfig.color}
                              icon={statusConfig.icon || undefined}
                            />
                            {/* Workflow status badge */}
                            {job.workflow_status && (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={
                                  job.workflow_status === 'draft' ? 'Draft' :
                                  job.workflow_status === 'in_review' ? 'In Review' :
                                  job.workflow_status === 'finalized' ? 'Finalized' :
                                  job.workflow_status === 'committed' ? 'Committed' : job.workflow_status
                                }
                                color={
                                  job.workflow_status === 'committed' ? 'success' :
                                  job.workflow_status === 'finalized' ? 'warning' :
                                  job.workflow_status === 'in_review' ? 'info' : 'default'
                                }
                                sx={{ fontSize: '0.65rem' }}
                              />
                            )}
                            {job.confidence_score != null && job.confidence_score > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                {Math.round(job.confidence_score * 100)}% conf
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>

                        {/* OCR Preview */}
                        <TableCell>
                          {isCompleted ? (
                            <Box
                              onClick={() => toggleReveal(job.id)}
                              sx={{
                                p: 1,
                                bgcolor: alpha(theme.palette.background.default, 0.5),
                                borderRadius: 1,
                                cursor: 'pointer',
                                ...(revealed ? revealedStyle : blurredStyle)
                              }}
                            >
                              <Typography sx={monoStyle}>
                                {job.ocr_text_preview || (job.has_ocr_text ? 'OCR text available' : '—')}
                              </Typography>
                              {!revealed && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    color: 'text.primary',
                                    bgcolor: 'background.paper',
                                    px: 1,
                                    borderRadius: 1
                                  }}
                                >
                                  Click to reveal
                                </Typography>
                              )}
                            </Box>
                          ) : job.status === 'failed' ? (
                            <Typography variant="caption" color="error">
                              {job.error_message || 'Processing failed'}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">—</Typography>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            {/* Preview */}
                            <Tooltip title="Preview">
                              <IconButton
                                size="small"
                                onClick={() => handlePreview(job)}
                                disabled={!isCompleted}
                              >
                                <IconEye size={18} />
                              </IconButton>
                            </Tooltip>

                            {/* Inspect */}
                            {onInspect && (
                              <Tooltip title="Inspect">
                                <IconButton
                                  size="small"
                                  onClick={() => onInspect(job)}
                                  disabled={!isCompleted}
                                >
                                  <IconExternalLink size={18} />
                                </IconButton>
                              </Tooltip>
                            )}

                            {/* Copy */}
                            <Tooltip title={copiedId === job.id ? 'Copied!' : 'Copy OCR Text'}>
                              <IconButton
                                size="small"
                                onClick={() => handleCopy(job)}
                                disabled={!isCompleted || isJobLoading}
                              >
                                {copiedId === job.id ? (
                                  <IconCheck size={18} color={theme.palette.success.main} />
                                ) : (
                                  <IconCopy size={18} />
                                )}
                              </IconButton>
                            </Tooltip>

                            {/* Retry (failed only) */}
                            {job.status === 'failed' && (
                              <Tooltip title="Retry">
                                <IconButton
                                  size="small"
                                  onClick={() => handleRetry(job.id)}
                                  disabled={isJobLoading}
                                  color="warning"
                                >
                                  <IconRefresh size={18} />
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
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewJob}
        onClose={closePreview}
        maxWidth="lg"
        fullWidth
      >
        {previewJob && (
          <>
            <DialogTitle>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
                  {previewJob.original_filename}
                </Typography>
                <Chip
                  size="small"
                  label={previewJob.status}
                  color={getStatusConfig(previewJob.status).color}
                />
              </Stack>
            </DialogTitle>
            <DialogContent
              sx={{
                p: 2,
                height: '70vh',
                display: 'flex',
                gap: 2,
              }}
            >
              {/* Image Pane */}
              <Box sx={{ flex: 1, minWidth: 0, overflow: 'auto', borderRadius: 2, bgcolor: 'action.hover' }}>
                <Box
                  component="img"
                  src={getImageUrl(previewJob.id)}
                  alt={previewJob.original_filename}
                  sx={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </Box>

              {/* OCR Text Pane */}
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2">OCR Text</Typography>
                </Box>

                <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 1.5 }}>
                  {previewLoading ? (
                    <Stack alignItems="center" justifyContent="center" height="100%">
                      <CircularProgress />
                      <Typography variant="caption" color="text.secondary" mt={1}>
                        Loading OCR text...
                      </Typography>
                    </Stack>
                  ) : previewDetail?.ocr_text ? (
                    <Box
                      component="pre"
                      sx={{
                        m: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      {previewDetail.ocr_text}
                    </Box>
                  ) : (
                    <Typography color="text.secondary" textAlign="center">
                      No OCR text available
                    </Typography>
                  )}
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                startIcon={<IconCopy size={18} />}
                onClick={async () => {
                  if (previewDetail?.ocr_text) {
                    await navigator.clipboard.writeText(previewDetail.ocr_text);
                  }
                }}
                disabled={!previewDetail?.ocr_text}
              >
                Copy Text
              </Button>
              <Button onClick={closePreview}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default ProcessedImagesTable;

