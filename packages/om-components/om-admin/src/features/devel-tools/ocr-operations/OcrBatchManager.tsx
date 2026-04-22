/**
 * OcrBatchManager — Admin page for inspecting and rolling back OCR auto-commit batches
 * Route: /devel-tools/ocr-batch-manager
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
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
  IconAlertTriangle,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconDatabaseOff,
  IconEye,
  IconRefresh,
  IconRestore,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { apiClient } from '@/shared/lib/axiosInstance';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BatchPlan {
  eligible_count: number;
  skipped_count: number;
  total_candidates: number;
  thresholds: { autoCommitRowThreshold: number; requiredProvenanceCoverage: number; minStructureScore: number } | null;
  structure_score: number | null;
  template_used: boolean;
  method: string;
}

interface BatchResultRow {
  candidateIndex: number;
  outcome: string;
  recordId: number | null;
  recordType: string | null;
  table: string | null;
}

interface BatchResults {
  committed_count: number;
  skipped_count: number;
  error_count: number;
  rows: BatchResultRow[];
}

interface BatchRollback {
  deleted: Record<string, number>;
  missing: Record<string, number>;
  rolled_back_at: string;
  rolled_back_by: string;
}

interface CommitBatch {
  batch_id: string;
  created_at: string;
  plan: BatchPlan | null;
  results: BatchResults | null;
  rollback: BatchRollback | null;
  rolled_back: boolean;
}

interface DryRunResult {
  ok: boolean;
  dry_run: boolean;
  batch_id: string;
  deleted: Record<string, number>;
  missing: Record<string, number>;
  total_would_delete: number;
  total_missing: number;
}

interface RollbackResult {
  ok: boolean;
  dry_run: boolean;
  batch_id: string;
  deleted: Record<string, number>;
  missing: Record<string, number>;
  total_deleted: number;
  total_missing: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const OcrBatchManager: React.FC = () => {
  const theme = useTheme();

  // State
  const [churchId, setChurchId] = useState<string>('');
  const [jobId, setJobId] = useState<string>('');
  const [batches, setBatches] = useState<CommitBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  // Dry run state
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [dryRunBatchId, setDryRunBatchId] = useState<string | null>(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);

  // Rollback dialog state
  const [rollbackDialog, setRollbackDialog] = useState<{ open: boolean; batchId: string | null }>({ open: false, batchId: null });
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [rollbackResult, setRollbackResult] = useState<RollbackResult | null>(null);

  // Success/error feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch batches
  // ---------------------------------------------------------------------------

  const fetchBatches = useCallback(async () => {
    if (!churchId || !jobId) return;
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs/${jobId}/review/commit-batches`);
      setBatches(res.data?.batches || []);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to load batches';
      setError(msg);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [churchId, jobId]);

  // ---------------------------------------------------------------------------
  // Dry run
  // ---------------------------------------------------------------------------

  const handleDryRun = useCallback(async (batchId: string) => {
    setDryRunLoading(true);
    setDryRunBatchId(batchId);
    setDryRunResult(null);
    setFeedback(null);
    try {
      const res: any = await apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${jobId}/review/rollback-batch`,
        { batch_id: batchId, dry_run: true },
      );
      setDryRunResult(res.data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Dry run failed' });
    } finally {
      setDryRunLoading(false);
    }
  }, [churchId, jobId]);

  // ---------------------------------------------------------------------------
  // Rollback
  // ---------------------------------------------------------------------------

  const handleRollback = useCallback(async () => {
    const batchId = rollbackDialog.batchId;
    if (!batchId) return;

    setRollbackLoading(true);
    setRollbackResult(null);
    setFeedback(null);
    try {
      const res: any = await apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${jobId}/review/rollback-batch`,
        { batch_id: batchId, dry_run: false },
      );
      setRollbackResult(res.data);
      setFeedback({
        type: 'success',
        message: `Rollback complete: ${res.data.total_deleted} records deleted`,
      });
      setRollbackDialog({ open: false, batchId: null });
      // Refresh batches
      fetchBatches();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Rollback failed';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setRollbackLoading(false);
    }
  }, [churchId, jobId, rollbackDialog.batchId, fetchBatches]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d;
    }
  };

  const renderThresholds = (t: BatchPlan['thresholds']) => {
    if (!t) return '-';
    return `row >= ${t.autoCommitRowThreshold}, prov >= ${t.requiredProvenanceCoverage}, struct >= ${t.minStructureScore}`;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        OCR Batch Manager
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Inspect and rollback auto-commit batches for OCR jobs. Super admin only.
      </Typography>

      {/* Search bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Church ID"
            size="small"
            value={churchId}
            onChange={(e) => setChurchId(e.target.value)}
            sx={{ width: 120 }}
            type="number"
          />
          <TextField
            label="Job ID"
            size="small"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            sx={{ width: 120 }}
            type="number"
          />
          <Button
            variant="contained"
            startIcon={<IconSearch size={18} />}
            onClick={fetchBatches}
            disabled={!churchId || !jobId || loading}
          >
            Load Batches
          </Button>
          {batches.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<IconRefresh size={18} />}
              onClick={fetchBatches}
              disabled={loading}
              size="small"
            >
              Refresh
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Feedback */}
      {feedback && (
        <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* No batches */}
      {!loading && batches.length === 0 && churchId && jobId && !error && (
        <Alert severity="info">No commit batches found for job {jobId} in church {churchId}.</Alert>
      )}

      {/* Batch list */}
      {batches.map((batch) => {
        const isExpanded = expandedBatch === batch.batch_id;
        const committedCount = batch.results?.committed_count ?? batch.plan?.eligible_count ?? 0;
        const hasResults = !!batch.results;

        return (
          <Card key={batch.batch_id} sx={{ mb: 2, border: batch.rolled_back ? `1px solid ${theme.palette.warning.main}` : undefined }}>
            <CardContent sx={{ pb: 1 }}>
              {/* Header row */}
              <Stack direction="row" alignItems="center" spacing={1} sx={{ cursor: 'pointer' }} onClick={() => setExpandedBatch(isExpanded ? null : batch.batch_id)}>
                <IconButton size="small">
                  {isExpanded ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
                </IconButton>

                <Typography variant="subtitle2" fontFamily="monospace" sx={{ flex: 1 }}>
                  {batch.batch_id}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  {formatDate(batch.created_at)}
                </Typography>

                <Chip
                  label={`${committedCount} committed`}
                  size="small"
                  color="success"
                  variant="outlined"
                />

                {batch.results?.skipped_count ? (
                  <Chip
                    label={`${batch.results.skipped_count} skipped`}
                    size="small"
                    color="default"
                    variant="outlined"
                  />
                ) : null}

                {batch.rolled_back && (
                  <Chip
                    label="Rolled Back"
                    size="small"
                    color="warning"
                    icon={<IconRestore size={14} />}
                  />
                )}
              </Stack>

              {/* Expanded details */}
              <Collapse in={isExpanded}>
                <Divider sx={{ my: 1.5 }} />

                <Grid container spacing={2}>
                  {/* Plan info */}
                  {batch.plan && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Plan</Typography>
                      <Stack spacing={0.5}>
                        <Typography variant="body2">Method: {batch.plan.method}</Typography>
                        <Typography variant="body2">Total candidates: {batch.plan.total_candidates}</Typography>
                        <Typography variant="body2">Eligible: {batch.plan.eligible_count} | Skipped: {batch.plan.skipped_count}</Typography>
                        <Typography variant="body2">Thresholds: {renderThresholds(batch.plan.thresholds)}</Typography>
                        <Typography variant="body2">Structure score: {batch.plan.structure_score?.toFixed(2) ?? 'n/a'}</Typography>
                        <Typography variant="body2">Template used: {batch.plan.template_used ? 'Yes' : 'No'}</Typography>
                      </Stack>
                    </Grid>
                  )}

                  {/* Results info */}
                  {batch.results && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>Results</Typography>
                      <Stack spacing={0.5}>
                        <Typography variant="body2">Committed: {batch.results.committed_count}</Typography>
                        <Typography variant="body2">Skipped: {batch.results.skipped_count}</Typography>
                        <Typography variant="body2">Errors: {batch.results.error_count}</Typography>
                      </Stack>

                      {/* Committed records table */}
                      {batch.results.rows.filter(r => r.outcome === 'committed').length > 0 && (
                        <TableContainer component={Paper} variant="outlined" sx={{ mt: 1, maxHeight: 200 }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell>Record ID</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Table</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {batch.results.rows.filter(r => r.outcome === 'committed').map((row, i) => (
                                <TableRow key={i}>
                                  <TableCell>{row.recordId}</TableCell>
                                  <TableCell>{row.recordType}</TableCell>
                                  <TableCell><code>{row.table}</code></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Grid>
                  )}

                  {/* Rollback info */}
                  {batch.rollback && (
                    <Grid item xs={12}>
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        <Typography variant="subtitle2">Rolled back by {batch.rollback.rolled_back_by} at {formatDate(batch.rollback.rolled_back_at)}</Typography>
                        <Typography variant="body2">
                          Deleted: {Object.entries(batch.rollback.deleted).map(([t, c]) => `${t}: ${c}`).join(', ') || 'none'}
                          {' | '}
                          Missing: {Object.entries(batch.rollback.missing).map(([t, c]) => `${t}: ${c}`).join(', ') || 'none'}
                        </Typography>
                      </Alert>
                    </Grid>
                  )}
                </Grid>

                {/* Dry run result */}
                {dryRunBatchId === batch.batch_id && dryRunResult && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Dry Run Result</Typography>
                    <Typography variant="body2">
                      Would delete: {dryRunResult.total_would_delete} records
                      {' | '}
                      Missing (already deleted): {dryRunResult.total_missing}
                    </Typography>
                    {Object.entries(dryRunResult.deleted).map(([table, count]) => (
                      <Typography key={table} variant="body2">
                        {table}: {count} to delete
                        {dryRunResult.missing[table] ? `, ${dryRunResult.missing[table]} missing` : ''}
                      </Typography>
                    ))}
                  </Alert>
                )}

                {/* Action buttons */}
                {hasResults && !batch.rolled_back && (
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<IconEye size={16} />}
                      onClick={() => handleDryRun(batch.batch_id)}
                      disabled={dryRunLoading && dryRunBatchId === batch.batch_id}
                    >
                      {dryRunLoading && dryRunBatchId === batch.batch_id ? 'Running...' : 'Dry Run Rollback'}
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      startIcon={<IconTrash size={16} />}
                      onClick={() => setRollbackDialog({ open: true, batchId: batch.batch_id })}
                    >
                      Rollback Batch
                    </Button>
                  </Stack>
                )}

                {hasResults && batch.rolled_back && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
                    This batch has already been rolled back.
                  </Typography>
                )}
              </Collapse>
            </CardContent>
          </Card>
        );
      })}

      {/* Rollback confirmation dialog */}
      <Dialog open={rollbackDialog.open} onClose={() => !rollbackLoading && setRollbackDialog({ open: false, batchId: null })}>
        <DialogTitle>Confirm Rollback</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete all records committed by batch{' '}
            <strong>{rollbackDialog.batchId?.slice(0, 8)}...</strong> from the church database.
            This action cannot be undone.
          </DialogContentText>
          <DialogContentText sx={{ mt: 1, color: 'error.main' }}>
            Consider running a dry run first to see what will be deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackDialog({ open: false, batchId: null })} disabled={rollbackLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleRollback}
            color="error"
            variant="contained"
            disabled={rollbackLoading}
            startIcon={rollbackLoading ? <CircularProgress size={16} /> : <IconTrash size={16} />}
          >
            {rollbackLoading ? 'Rolling back...' : 'Confirm Rollback'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OcrBatchManager;
