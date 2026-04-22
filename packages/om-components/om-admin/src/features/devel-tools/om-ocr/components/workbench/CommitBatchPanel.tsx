/**
 * CommitBatchPanel — In-workbench batch management for a single job.
 * Lists autocommit batches, shows results, supports rollback.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import {
  IconChevronDown,
  IconArrowBack,
  IconEye,
  IconAlertTriangle,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { fetchCommitBatches, rollbackBatch } from '../../api/pipelineApi';
import type { CommitBatch, RollbackResponse } from '../../api/pipelineApi';

interface CommitBatchPanelProps {
  churchId: number;
  jobId: number;
}

const CommitBatchPanel: React.FC<CommitBatchPanelProps> = ({ churchId, jobId }) => {
  const theme = useTheme();
  const [batches, setBatches] = useState<CommitBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  // Rollback state
  const [rollbackTarget, setRollbackTarget] = useState<string | null>(null);
  const [rollbackPreview, setRollbackPreview] = useState<RollbackResponse | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  // Load batches
  const loadBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCommitBatches(churchId, jobId);
      setBatches(result);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  }, [churchId, jobId]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Dry-run rollback
  const handlePreviewRollback = useCallback(async (batchId: string) => {
    setRollbackTarget(batchId);
    setRollbackLoading(true);
    setRollbackError(null);
    setRollbackPreview(null);
    try {
      const result = await rollbackBatch(churchId, jobId, batchId, true);
      setRollbackPreview(result);
    } catch (err: any) {
      setRollbackError(err?.response?.data?.error || err.message || 'Rollback preview failed');
    } finally {
      setRollbackLoading(false);
    }
  }, [churchId, jobId]);

  // Execute rollback
  const handleConfirmRollback = useCallback(async () => {
    if (!rollbackTarget) return;
    setRollbackLoading(true);
    setRollbackError(null);
    try {
      await rollbackBatch(churchId, jobId, rollbackTarget, false);
      setRollbackTarget(null);
      setRollbackPreview(null);
      await loadBatches(); // Refresh
    } catch (err: any) {
      setRollbackError(err?.response?.data?.error || err.message || 'Rollback failed');
    } finally {
      setRollbackLoading(false);
    }
  }, [churchId, jobId, rollbackTarget, loadBatches]);

  if (loading && batches.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (batches.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        No commit batches yet.
      </Typography>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {batches.map((batch) => (
        <Accordion
          key={batch.batch_id}
          expanded={expandedBatch === batch.batch_id}
          onChange={(_, isExpanded) => setExpandedBatch(isExpanded ? batch.batch_id : null)}
          disableGutters
          sx={{
            '&:before': { display: 'none' },
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            mb: 0.5,
            bgcolor: batch.rolled_back ? alpha(theme.palette.error.main, 0.04) : undefined,
          }}
        >
          <AccordionSummary
            expandIcon={<IconChevronDown size={16} />}
            sx={{ minHeight: 36, '& .MuiAccordionSummary-content': { my: 0.5 } }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
              <Typography variant="caption" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                {batch.batch_id.slice(0, 8)}
              </Typography>
              {batch.results && (
                <>
                  <Chip
                    size="small"
                    label={`${batch.results.committed_count} committed`}
                    color="success"
                    variant="outlined"
                    sx={{ height: 18, fontSize: '0.6rem' }}
                  />
                  {batch.results.skipped_count > 0 && (
                    <Chip
                      size="small"
                      label={`${batch.results.skipped_count} skipped`}
                      variant="outlined"
                      sx={{ height: 18, fontSize: '0.6rem' }}
                    />
                  )}
                </>
              )}
              {batch.rolled_back && (
                <Chip
                  size="small"
                  label="Rolled back"
                  color="error"
                  sx={{ height: 18, fontSize: '0.6rem' }}
                />
              )}
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {batch.created_at ? new Date(batch.created_at).toLocaleString() : '-'}
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            {/* Row details */}
            {batch.results?.rows && (
              <Table size="small" sx={{ '& td, & th': { py: 0.3, px: 1, fontSize: '0.7rem' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Row</TableCell>
                    <TableCell>Outcome</TableCell>
                    <TableCell>Record ID</TableCell>
                    <TableCell>Table</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batch.results.rows.map((row: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{row.candidateIndex ?? row.sourceRowIndex ?? idx}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.outcome}
                          color={row.outcome === 'committed' ? 'success' : row.outcome === 'error' ? 'error' : 'default'}
                          variant="outlined"
                          sx={{ height: 16, fontSize: '0.55rem' }}
                        />
                      </TableCell>
                      <TableCell>{row.recordId || '-'}</TableCell>
                      <TableCell>{row.table || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Rollback button */}
            {!batch.rolled_back && batch.results?.committed_count > 0 && (
              <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<IconArrowBack size={14} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviewRollback(batch.batch_id);
                  }}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  Preview Rollback
                </Button>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Rollback Confirmation Dialog */}
      <Dialog
        open={!!rollbackTarget}
        onClose={() => { setRollbackTarget(null); setRollbackPreview(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconAlertTriangle size={20} color={theme.palette.warning.main} />
            <Typography variant="h6">Rollback Batch</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {rollbackLoading && !rollbackPreview ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Running dry-run preview...
              </Typography>
            </Box>
          ) : rollbackPreview ? (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                This will delete {rollbackPreview.plan?.total_targets || 0} record(s) from the database.
              </Alert>
              {rollbackPreview.verification && !rollbackPreview.verification.all_present && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {rollbackPreview.verification.missing_ids?.length || 0} record(s) already missing.
                </Alert>
              )}
              <Typography variant="caption" color="text.secondary" display="block">
                Batch: {rollbackTarget?.slice(0, 8)}
              </Typography>
            </Box>
          ) : null}
          {rollbackError && (
            <Alert severity="error" sx={{ mt: 1 }}>{rollbackError}</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setRollbackTarget(null); setRollbackPreview(null); }}
            size="small"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmRollback}
            disabled={rollbackLoading || !rollbackPreview}
            size="small"
          >
            {rollbackLoading ? 'Rolling back...' : 'Confirm Rollback'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommitBatchPanel;
