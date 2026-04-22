/**
 * AdvanceStep2 — Status-aware transition form. Fields change based on current CS status.
 */

import {
  Alert,
  Box,
  TextField,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { apiClient } from '@/shared/lib/apiClient';

const NEXT_STATUS: Record<string, string> = {
  active: 'ready_for_staging',
  ready_for_staging: 'staged',
  staged: 'in_review',
  in_review: 'approved',
  approved: 'promoted',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active', ready_for_staging: 'Ready for Staging', staged: 'Staged',
  in_review: 'In Review', approved: 'Approved', promoted: 'Promoted',
};

export interface TransitionFormData {
  staging_build_run_id: string;
  staging_commit_sha: string;
  prod_build_run_id: string;
  prod_commit_sha: string;
  review_notes: string;
}

interface Props {
  csStatus: string;
  csHasDbChanges: boolean;
  formData: TransitionFormData;
  onChange: (data: TransitionFormData) => void;
}

const AdvanceStep2: React.FC<Props> = ({ csStatus, csHasDbChanges, formData, onChange }) => {
  const [buildInfo, setBuildInfo] = useState<any>(null);

  const nextStatus = NEXT_STATUS[csStatus];

  useEffect(() => {
    apiClient.get('/omai-daily/build-info').then(res => {
      setBuildInfo(res.data);
      // Auto-fill SHAs
      const sha = res.data?.commit_sha || res.data?.git_sha || '';
      const buildId = res.data?.build_number?.toString() || '';
      if (nextStatus === 'staged' && !formData.staging_commit_sha) {
        onChange({ ...formData, staging_commit_sha: sha, staging_build_run_id: buildId });
      }
      if (nextStatus === 'promoted' && !formData.prod_commit_sha) {
        onChange({ ...formData, prod_commit_sha: sha, prod_build_run_id: buildId });
      }
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (field: keyof TransitionFormData, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  if (!nextStatus) {
    return <Alert severity="warning">No further transitions available from status "{csStatus}".</Alert>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Transition: {STATUS_LABELS[csStatus]} → {STATUS_LABELS[nextStatus]}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Fill in the required fields for this transition.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* staged transition needs build ID + SHA */}
        {nextStatus === 'staged' && (
          <>
            <TextField
              label="Staging Build Run ID"
              value={formData.staging_build_run_id}
              onChange={(e) => update('staging_build_run_id', e.target.value)}
              required
              helperText={buildInfo ? `Current build: ${buildInfo.build_number || 'N/A'}` : ''}
            />
            <TextField
              label="Staging Commit SHA"
              value={formData.staging_commit_sha}
              onChange={(e) => update('staging_commit_sha', e.target.value)}
              required
              helperText={buildInfo ? `Current SHA: ${buildInfo.commit_sha || buildInfo.git_sha || 'N/A'}` : ''}
            />
          </>
        )}

        {/* approved transition may need review notes */}
        {nextStatus === 'approved' && (
          <TextField
            label="Review Notes"
            value={formData.review_notes}
            onChange={(e) => update('review_notes', e.target.value)}
            multiline
            rows={3}
            required={csHasDbChanges}
            helperText={csHasDbChanges ? 'Required: this change set has database migrations' : 'Optional review notes'}
          />
        )}

        {/* promoted transition needs prod build + SHA */}
        {nextStatus === 'promoted' && (
          <>
            <TextField
              label="Production Build Run ID"
              value={formData.prod_build_run_id}
              onChange={(e) => update('prod_build_run_id', e.target.value)}
              required
            />
            <TextField
              label="Production Commit SHA"
              value={formData.prod_commit_sha}
              onChange={(e) => update('prod_commit_sha', e.target.value)}
              required
            />
          </>
        )}

        {/* Transitions with no extra fields */}
        {(nextStatus === 'ready_for_staging' || nextStatus === 'in_review') && (
          <Alert severity="info">
            No additional fields required. Click "Execute" to advance to {STATUS_LABELS[nextStatus]}.
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export { NEXT_STATUS };
export default AdvanceStep2;
