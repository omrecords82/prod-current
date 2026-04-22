/**
 * FastForwardStep2 — Warning, auto-fill SHAs from build-info, confirm, execute
 */

import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { apiClient } from '@/shared/lib/apiClient';

interface Props {
  csId: number;
  csCode: string;
  csStatus: string;
  csBranch: string | null;
  onComplete: () => void;
}

const FastForwardStep2: React.FC<Props> = ({ csId, csCode, csStatus, csBranch, onComplete }) => {
  const [stagingBuildRunId, setStagingBuildRunId] = useState('');
  const [stagingCommitSha, setStagingCommitSha] = useState('');
  const [prodBuildRunId, setProdBuildRunId] = useState('');
  const [prodCommitSha, setProdCommitSha] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    apiClient.get('/omai-daily/build-info').then(res => {
      const sha = res.data?.commit_sha || res.data?.git_sha || '';
      const buildId = res.data?.build_number?.toString() || '';
      setStagingBuildRunId(buildId);
      setStagingCommitSha(sha);
      setProdBuildRunId(buildId);
      setProdCommitSha(sha);
    }).catch(() => {});
  }, []);

  const handleExecute = async () => {
    setExecuting(true);
    setError('');
    try {
      const res = await apiClient.post(`/admin/change-sets/${csId}/fast-forward`, {
        staging_build_run_id: stagingBuildRunId,
        staging_commit_sha: stagingCommitSha,
        prod_build_run_id: prodBuildRunId,
        prod_commit_sha: prodCommitSha,
      });
      setResult(res.data);
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Fast-forward failed');
    } finally {
      setExecuting(false);
    }
  };

  if (result) {
    const snapshotId = result.change_set?.pre_promote_snapshot_id;
    return (
      <Box>
        <Alert severity="success" sx={{ mb: 2 }}>
          {csCode} has been fast-forwarded to <strong>promoted</strong> status!
        </Alert>
        {snapshotId && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Pre-promote snapshot created: <code>{snapshotId}</code>. You can restore from this snapshot via Code Safety if problems occur.
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary">
          All intermediate stages were bypassed. The change set is now in production status.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Fast-Forward: {csCode}</Typography>

      <Alert severity="warning" sx={{ mb: 2 }}>
        <strong>Warning:</strong> Fast-forwarding bypasses staging, review, and approval stages.
        Only use this for fully-tested changes that don't need additional review.
      </Alert>

      <Alert severity="info" sx={{ mb: 2 }}>
        A pre-promote snapshot will be automatically created before applying changes, so you can restore to the previous state if needed.
      </Alert>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">Current Status</Typography>
        <Typography>{csStatus} → <strong>promoted</strong> (skips all intermediate stages)</Typography>
        {csBranch && <Typography variant="body2" sx={{ mt: 0.5 }}>Branch: <code>{csBranch}</code></Typography>}
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            label="Staging Build Run ID"
            value={stagingBuildRunId}
            onChange={(e) => setStagingBuildRunId(e.target.value)}
            fullWidth
            required
          />
          <TextField
            size="small"
            label="Staging Commit SHA"
            value={stagingCommitSha}
            onChange={(e) => setStagingCommitSha(e.target.value)}
            fullWidth
            required
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            label="Production Build Run ID"
            value={prodBuildRunId}
            onChange={(e) => setProdBuildRunId(e.target.value)}
            fullWidth
            required
          />
          <TextField
            size="small"
            label="Production Commit SHA"
            value={prodCommitSha}
            onChange={(e) => setProdCommitSha(e.target.value)}
            fullWidth
            required
          />
        </Box>
      </Box>

      <FormControlLabel
        control={<Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />}
        label="I confirm this change set has been fully tested and is ready for production"
        sx={{ mb: 2 }}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ textAlign: 'right' }}>
        <Button
          variant="contained"
          color="warning"
          size="large"
          onClick={handleExecute}
          disabled={executing || !confirmed || !stagingBuildRunId || !stagingCommitSha || !prodBuildRunId || !prodCommitSha}
          startIcon={executing ? <CircularProgress size={18} /> : undefined}
        >
          {executing ? 'Fast-Forwarding...' : 'Fast-Forward to Promoted'}
        </Button>
      </Box>
    </Box>
  );
};

export default FastForwardStep2;
