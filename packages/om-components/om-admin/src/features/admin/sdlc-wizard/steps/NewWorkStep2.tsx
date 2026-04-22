/**
 * NewWorkStep2 — Change set creation form (title, type, priority, branch, strategy)
 */

import {
  Box,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { apiClient } from '@/shared/lib/apiClient';

export interface ChangeSetFormData {
  title: string;
  change_type: string;
  priority: string;
  git_branch: string;
  deployment_strategy: string;
  has_db_changes: boolean;
  description: string;
}

interface Props {
  formData: ChangeSetFormData;
  onChange: (data: ChangeSetFormData) => void;
}

const NewWorkStep2: React.FC<Props> = ({ formData, onChange }) => {
  const [buildBranch, setBuildBranch] = useState('');

  useEffect(() => {
    apiClient.get('/omai-daily/build-info').then(res => {
      const branch = res.data?.branch || res.data?.git_branch || '';
      setBuildBranch(branch);
      if (!formData.git_branch && branch) {
        onChange({ ...formData, git_branch: branch });
      }
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (field: keyof ChangeSetFormData, value: any) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Change Set Details</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure the delivery container for your work items.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <TextField
          label="Title"
          value={formData.title}
          onChange={(e) => update('title', e.target.value)}
          required
          fullWidth
          placeholder="e.g. SDLC Pipeline Wizard"
        />

        <TextField
          label="Description"
          value={formData.description}
          onChange={(e) => update('description', e.target.value)}
          multiline
          rows={2}
          fullWidth
          placeholder="Brief description of what this change set delivers"
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Change Type</InputLabel>
            <Select value={formData.change_type} label="Change Type" onChange={(e) => update('change_type', e.target.value)}>
              <MenuItem value="feature">Feature</MenuItem>
              <MenuItem value="bugfix">Bugfix</MenuItem>
              <MenuItem value="hotfix">Hotfix</MenuItem>
              <MenuItem value="refactor">Refactor</MenuItem>
              <MenuItem value="infra">Infra</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select value={formData.priority} label="Priority" onChange={(e) => update('priority', e.target.value)}>
              <MenuItem value="critical">Critical</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TextField
          label="Git Branch"
          value={formData.git_branch}
          onChange={(e) => update('git_branch', e.target.value)}
          fullWidth
          helperText={buildBranch ? `Current build branch: ${buildBranch}` : 'Auto-detected from build info'}
        />

        <FormControl fullWidth>
          <InputLabel>Deployment Strategy</InputLabel>
          <Select value={formData.deployment_strategy} label="Deployment Strategy" onChange={(e) => update('deployment_strategy', e.target.value)}>
            <MenuItem value="stage_then_promote">Stage then Promote</MenuItem>
            <MenuItem value="direct_promote">Direct Promote</MenuItem>
            <MenuItem value="blue_green">Blue/Green</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={formData.has_db_changes}
              onChange={(e) => update('has_db_changes', e.target.checked)}
            />
          }
          label="Includes database migrations"
        />
      </Box>
    </Box>
  );
};

export default NewWorkStep2;
