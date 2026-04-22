/**
 * AdvanceStep3 — Execute transition + post-actions (push to origin if promoted)
 */

import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Paper,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { apiClient } from '@/shared/lib/apiClient';
import type { TransitionFormData } from './AdvanceStep2';
import { NEXT_STATUS } from './AdvanceStep2';

interface Props {
  csId: number;
  csCode: string;
  csStatus: string;
  csBranch: string | null;
  formData: TransitionFormData;
  onComplete: (newStatus: string) => void;
}

const AdvanceStep3: React.FC<Props> = ({ csId, csCode, csStatus, csBranch, formData, onComplete }) => {
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');
  const [pushAfterPromote, setPushAfterPromote] = useState(true);
  const [result, setResult] = useState<any>(null);

  const nextStatus = NEXT_STATUS[csStatus];

  const handleExecute = async () => {
    setExecuting(true);
    setError('');
    try {
      if (nextStatus === 'promoted' && pushAfterPromote && csBranch) {
        // Use promote-and-push endpoint
        const res = await apiClient.post(`/admin/change-sets/${csId}/promote-and-push`, {
          prod_build_run_id: formData.prod_build_run_id,
          prod_commit_sha: formData.prod_commit_sha,
        });
        setResult(res.data);
        onComplete('promoted');
      } else {
        // Standard transition
        const body: Record<string, any> = { status: nextStatus };
        if (formData.staging_build_run_id) body.staging_build_run_id = formData.staging_build_run_id;
        if (formData.staging_commit_sha) body.staging_commit_sha = formData.staging_commit_sha;
        if (formData.prod_build_run_id) body.prod_build_run_id = formData.prod_build_run_id;
        if (formData.prod_commit_sha) body.prod_commit_sha = formData.prod_commit_sha;
        if (formData.review_notes) body.review_notes = formData.review_notes;

        const res = await apiClient.post(`/admin/change-sets/${csId}/transition`, body);
        setResult(res.data);
        onComplete(nextStatus);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Transition failed');
    } finally {
      setExecuting(false);
    }
  };

  if (result) {
    const snapshotId = result.change_set?.pre_promote_snapshot_id;
    return (
      <Box>
        <Alert severity="success" sx={{ mb: 2 }}>
          {csCode} successfully transitioned to <strong>{nextStatus?.replace(/_/g, ' ')}</strong>
        </Alert>
        {nextStatus === 'promoted' && snapshotId && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Pre-promote snapshot created: <code>{snapshotId}</code>. You can restore from this snapshot via Code Safety if problems occur.
          </Alert>
        )}
        {result.push_success === false && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Git push failed: {result.push_error}
          </Alert>
        )}
        {result.push_success === true && (
          <Alert severity="info">
            Pushed to origin/{result.push_branch}
          </Alert>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Execute Transition</Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">Change Set</Typography>
        <Typography variant="h6">{csCode} — {csStatus?.replace(/_/g, ' ')} → {nextStatus?.replace(/_/g, ' ')}</Typography>
      </Paper>

      {nextStatus === 'promoted' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          A pre-promote snapshot will be automatically created before applying production changes.
        </Alert>
      )}

      {nextStatus === 'promoted' && csBranch && (
        <FormControlLabel
          control={<Checkbox checked={pushAfterPromote} onChange={(e) => setPushAfterPromote(e.target.checked)} />}
          label={`Push ${csBranch} to origin after promotion`}
          sx={{ mb: 2 }}
        />
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ textAlign: 'right' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleExecute}
          disabled={executing}
          startIcon={executing ? <CircularProgress size={18} /> : undefined}
        >
          {executing ? 'Executing...' : `Transition to ${nextStatus?.replace(/_/g, ' ')}`}
        </Button>
      </Box>
    </Box>
  );
};

export default AdvanceStep3;
