/**
 * ReviewCommitStep - Step 4: Review, auto-commit, and manual commit
 * Integrates scoring summary, draft review, autocommit workflow, and batch history.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  alpha,
  useTheme,
} from '@mui/material';
import {
  IconCheck,
  IconAlertTriangle,
  IconRocket,
  IconEye,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconDatabase,
} from '@tabler/icons-react';
import { apiClient } from '@/shared/lib/axiosInstance';
import { useWorkbench } from '../../../context/WorkbenchContext';
import { triggerAutocommit } from '../../../api/pipelineApi';
import ScoringV2Panel from '../ScoringV2Panel';
import CommitBatchPanel from '../CommitBatchPanel';
import type { ScoringV2Result, AutocommitPlan, AutocommitResults } from '../../../types/pipeline';

// ── Types ───────────────────────────────────────────────────────────────────

interface DraftEntry {
  id: number;
  entry_index: number;
  record_type: string;
  payload_json: Record<string, any>;
  workflow_status?: string;
  status?: string;
  last_saved_at?: string;
}

interface ReviewCommitStepProps {
  churchId: number;
  jobId: number;
  onBack: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getStatusColor(status?: string): 'default' | 'info' | 'warning' | 'success' | 'error' {
  switch (status) {
    case 'draft': return 'default';
    case 'in_review': return 'info';
    case 'finalized': return 'warning';
    case 'committed': return 'success';
    default: return 'default';
  }
}

function getStatusLabel(status?: string): string {
  switch (status) {
    case 'draft': return 'Draft';
    case 'in_review': return 'In Review';
    case 'finalized': return 'Finalized';
    case 'committed': return 'Committed';
    default: return status || 'Unknown';
  }
}

// ── Component ───────────────────────────────────────────────────────────────

const ReviewCommitStep: React.FC<ReviewCommitStepProps> = ({ churchId, jobId, onBack }) => {
  const theme = useTheme();
  const workbench = useWorkbench();

  // State
  const [drafts, setDrafts] = useState<DraftEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScoring, setShowScoring] = useState(false);

  // Autocommit state
  const [autocommitLoading, setAutocommitLoading] = useState(false);
  const [autocommitResult, setAutocommitResult] = useState<{
    plan: AutocommitPlan;
    results: AutocommitResults;
  } | null>(null);
  const [autocommitError, setAutocommitError] = useState<string | null>(null);
  const [showAutocommitDialog, setShowAutocommitDialog] = useState(false);

  // Manual finalize/commit state
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);

  const scoringV2 = workbench.state.scoringV2;

  // ── Load drafts ─────────────────────────────────────────────────────────

  const loadDrafts = useCallback(async () => {
    if (!churchId || !jobId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(
        `/api/church/${churchId}/ocr/jobs/${jobId}/fusion/drafts`,
      );
      const responseData = (response as any).data;
      const rawDrafts =
        Array.isArray(responseData) ? responseData :
        (responseData?.drafts ?? responseData?.data?.drafts ?? []);

      const parsed = rawDrafts.map((d: any) => ({
        ...d,
        payload_json: typeof d.payload_json === 'string' ? JSON.parse(d.payload_json) : d.payload_json,
      }));
      setDrafts(parsed);
    } catch (err: any) {
      setError(err.message || 'Failed to load drafts');
    } finally {
      setLoading(false);
    }
  }, [churchId, jobId]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // ── Autocommit ──────────────────────────────────────────────────────────

  const handleAutocommit = useCallback(async () => {
    setAutocommitLoading(true);
    setAutocommitError(null);
    try {
      const result = await triggerAutocommit(churchId, jobId);
      setAutocommitResult({ plan: result.plan, results: result.results });
      setShowAutocommitDialog(false);
      // Refresh drafts to reflect new statuses
      await loadDrafts();
    } catch (err: any) {
      setAutocommitError(err?.response?.data?.error || err.message || 'Autocommit failed');
    } finally {
      setAutocommitLoading(false);
    }
  }, [churchId, jobId, loadDrafts]);

  // ── Manual finalize ─────────────────────────────────────────────────────

  const handleFinalize = useCallback(async () => {
    setIsFinalizing(true);
    try {
      await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/review/finalize`);
      await loadDrafts();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Finalize failed');
    } finally {
      setIsFinalizing(false);
    }
  }, [churchId, jobId, loadDrafts]);

  // ── Manual commit ───────────────────────────────────────────────────────

  const handleCommit = useCallback(async () => {
    setIsCommitting(true);
    setShowCommitDialog(false);
    try {
      await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/review/commit`);
      await loadDrafts();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Commit failed');
    } finally {
      setIsCommitting(false);
    }
  }, [churchId, jobId, loadDrafts]);

  // ── Derived data ────────────────────────────────────────────────────────

  const draftCount = drafts.filter(d => (d.workflow_status || d.status) === 'draft').length;
  const finalizedCount = drafts.filter(d => (d.workflow_status || d.status) === 'finalized').length;
  const committedCount = drafts.filter(d => (d.workflow_status || d.status) === 'committed').length;

  const eligibleForAutocommit = scoringV2?.rows?.filter(r => r.row_score >= 0.92 && !r.needs_review).length || 0;
  const needsReview = scoringV2?.summary?.rows_need_review || 0;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
      {/* Header */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Button variant="outlined" size="small" onClick={onBack}>Back</Button>
        <Typography variant="h6" fontWeight={600}>Review & Commit</Typography>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={loadDrafts} disabled={loading}>
          <IconRefresh size={16} />
        </IconButton>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Scoring Summary (collapsible) */}
      {scoringV2 && (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ p: 1.5, cursor: 'pointer' }}
            onClick={() => setShowScoring(!showScoring)}
          >
            <Typography variant="subtitle2" fontWeight={600}>Scoring Summary</Typography>
            <Chip
              size="small"
              label={`${Math.round(scoringV2.page_score_v2 * 100)}%`}
              color={scoringV2.page_score_v2 >= 0.85 ? 'success' : scoringV2.page_score_v2 >= 0.65 ? 'warning' : 'error'}
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
            <Chip
              size="small"
              label={scoringV2.routing_recommendation}
              variant="outlined"
              sx={{ height: 20, fontSize: '0.65rem', textTransform: 'capitalize' }}
            />
            {needsReview > 0 && (
              <Chip
                size="small"
                label={`${needsReview} need review`}
                color="warning"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
            )}
            <Box sx={{ flex: 1 }} />
            {showScoring ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </Stack>
          <Collapse in={showScoring}>
            <Divider />
            <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
              <ScoringV2Panel scoring={scoringV2} compact />
            </Box>
          </Collapse>
        </Paper>
      )}

      {/* Action Buttons */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
        {/* Autocommit */}
        <Tooltip title={
          eligibleForAutocommit > 0
            ? `${eligibleForAutocommit} row(s) eligible for auto-commit (score >= 0.92)`
            : 'No rows eligible for auto-commit'
        }>
          <span>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={autocommitLoading ? <CircularProgress size={14} color="inherit" /> : <IconRocket size={16} />}
              onClick={() => setShowAutocommitDialog(true)}
              disabled={autocommitLoading || !scoringV2}
              sx={{ textTransform: 'none' }}
            >
              Auto-commit ({eligibleForAutocommit})
            </Button>
          </span>
        </Tooltip>

        {/* Finalize */}
        {draftCount > 0 && (
          <Button
            variant="outlined"
            color="info"
            size="small"
            startIcon={isFinalizing ? <CircularProgress size={14} /> : <IconCheck size={16} />}
            onClick={handleFinalize}
            disabled={isFinalizing}
            sx={{ textTransform: 'none' }}
          >
            Finalize ({draftCount})
          </Button>
        )}

        {/* Commit */}
        {finalizedCount > 0 && (
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={isCommitting ? <CircularProgress size={14} color="inherit" /> : <IconDatabase size={16} />}
            onClick={() => setShowCommitDialog(true)}
            disabled={isCommitting}
            sx={{ textTransform: 'none' }}
          >
            Commit ({finalizedCount})
          </Button>
        )}
      </Stack>

      {/* Autocommit Result */}
      {autocommitResult && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setAutocommitResult(null)}
        >
          Auto-commit complete: {autocommitResult.results.committed_count} committed,{' '}
          {autocommitResult.results.skipped_count} skipped
          {autocommitResult.results.error_count > 0 && (
            <>, <b>{autocommitResult.results.error_count} errors</b></>
          )}
          <Typography variant="caption" display="block" color="text.secondary">
            Batch: {autocommitResult.plan.batch_id}
          </Typography>
        </Alert>
      )}
      {autocommitError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAutocommitError(null)}>
          {autocommitError}
        </Alert>
      )}

      {/* Drafts Table */}
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        Drafts ({drafts.length})
      </Typography>
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : drafts.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No draft records found. Map fields in the previous step to create drafts.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 50 }}>#</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Key Fields</TableCell>
                <TableCell sx={{ width: 100 }}>Status</TableCell>
                <TableCell sx={{ width: 80 }}>Score</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {drafts.map((draft) => {
                const status = draft.workflow_status || draft.status || 'draft';
                const payload = draft.payload_json || {};
                const keyFields = Object.entries(payload)
                  .filter(([k]) => !k.startsWith('_') && !['id', 'church_id', 'created_by'].includes(k))
                  .slice(0, 3)
                  .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v || '-'}`)
                  .join(' | ');

                // Find scoring for this row
                const rowScore = scoringV2?.rows?.find(r => r.candidate_index === draft.entry_index);

                return (
                  <TableRow
                    key={draft.id || draft.entry_index}
                    sx={{
                      bgcolor: status === 'committed'
                        ? alpha(theme.palette.success.main, 0.04)
                        : rowScore?.needs_review
                          ? alpha(theme.palette.warning.main, 0.04)
                          : undefined,
                    }}
                  >
                    <TableCell>
                      <Typography variant="caption" fontWeight={600}>
                        {draft.entry_index}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={draft.record_type}
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.65rem', textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" noWrap sx={{ maxWidth: 250, display: 'block' }}>
                        {keyFields || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={getStatusLabel(status)}
                        color={getStatusColor(status)}
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      {rowScore ? (
                        <Chip
                          size="small"
                          label={`${Math.round(rowScore.row_score * 100)}%`}
                          color={rowScore.row_score >= 0.85 ? 'success' : rowScore.row_score >= 0.65 ? 'warning' : 'error'}
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600 }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Summary */}
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {draftCount > 0 && <Chip size="small" label={`${draftCount} draft`} color="default" variant="outlined" />}
        {finalizedCount > 0 && <Chip size="small" label={`${finalizedCount} finalized`} color="warning" variant="outlined" />}
        {committedCount > 0 && <Chip size="small" label={`${committedCount} committed`} color="success" variant="outlined" />}
      </Stack>

      {/* Commit History */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        Commit History
      </Typography>
      <CommitBatchPanel churchId={churchId} jobId={jobId} />

      {/* Autocommit Confirmation Dialog */}
      <Dialog open={showAutocommitDialog} onClose={() => setShowAutocommitDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconRocket size={20} />
            <Typography variant="h6">Auto-commit Eligible Rows</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {scoringV2 && (
            <Box>
              <Typography variant="body2" paragraph>
                {eligibleForAutocommit} of {scoringV2.summary.total_rows} rows are eligible for auto-commit
                (row score {'\u2265'} 0.92, no review flags).
              </Typography>
              {needsReview > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {needsReview} row(s) need manual review and will be skipped.
                </Alert>
              )}
              <Typography variant="caption" color="text.secondary">
                Committed records will be inserted into the church database. You can rollback from the Batch Manager if needed.
              </Typography>
            </Box>
          )}
          {autocommitError && (
            <Alert severity="error" sx={{ mt: 1 }}>{autocommitError}</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAutocommitDialog(false)} size="small">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAutocommit}
            disabled={autocommitLoading || eligibleForAutocommit === 0}
            startIcon={autocommitLoading ? <CircularProgress size={14} color="inherit" /> : <IconRocket size={16} />}
            size="small"
          >
            {autocommitLoading ? 'Committing...' : `Auto-commit ${eligibleForAutocommit} Row(s)`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual Commit Confirmation Dialog */}
      <Dialog open={showCommitDialog} onClose={() => setShowCommitDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconAlertTriangle size={20} color={theme.palette.warning.main} />
            <Typography variant="h6">Commit Records</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Commit {finalizedCount} finalized record(s) to the church database?
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Records will be inserted into the appropriate tables (baptism, marriage, or funeral records).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCommitDialog(false)} size="small">Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleCommit}
            disabled={isCommitting}
            size="small"
          >
            {isCommitting ? 'Committing...' : 'Commit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReviewCommitStep;
