/**
 * NewWorkStep3 — Summary review + activate toggle, then creates CS and links items
 */

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Paper,
  Switch,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { apiClient } from '@/shared/lib/apiClient';
import type { ChangeSetFormData } from './NewWorkStep2';

interface Props {
  formData: ChangeSetFormData;
  selectedItemIds: number[];
  itemTitles: Record<number, string>;
  onComplete: (csId: number, csCode: string) => void;
}

const NewWorkStep3: React.FC<Props> = ({ formData, selectedItemIds, itemTitles, onComplete }) => {
  const [activateImmediately, setActivateImmediately] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');

  const handleFinish = async () => {
    setExecuting(true);
    setError('');
    try {
      // 1. Create the change set
      const csRes = await apiClient.post('/admin/change-sets', {
        title: formData.title,
        description: formData.description || undefined,
        change_type: formData.change_type,
        priority: formData.priority,
        git_branch: formData.git_branch || undefined,
        deployment_strategy: formData.deployment_strategy,
        has_db_changes: formData.has_db_changes,
      });

      const csId = csRes.data.change_set.id;
      const csCode = csRes.data.change_set.code;

      // 2. Link items
      for (const itemId of selectedItemIds) {
        await apiClient.post(`/admin/change-sets/${csId}/items`, {
          om_daily_item_id: itemId,
          is_required: true,
        });
      }

      // 3. Optionally activate
      if (activateImmediately) {
        await apiClient.post(`/admin/change-sets/${csId}/transition`, {
          status: 'active',
        });
      }

      onComplete(csId, csCode);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to create change set');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Review & Create</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Review the change set configuration before creating.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">Change Set Details</Typography>
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography><strong>Title:</strong> {formData.title}</Typography>
          {formData.description && <Typography><strong>Description:</strong> {formData.description}</Typography>}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip label={formData.change_type} size="small" />
            <Chip label={formData.priority} size="small" color={formData.priority === 'critical' ? 'error' : formData.priority === 'high' ? 'warning' : 'default'} />
            <Chip label={formData.deployment_strategy} size="small" variant="outlined" />
          </Box>
          {formData.git_branch && <Typography><strong>Branch:</strong> <code>{formData.git_branch}</code></Typography>}
          {formData.has_db_changes && <Chip label="Has DB Migrations" size="small" color="warning" sx={{ alignSelf: 'flex-start', mt: 0.5 }} />}
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Linked Items ({selectedItemIds.length})
        </Typography>
        <List dense disablePadding>
          {selectedItemIds.map(id => (
            <ListItem key={id} disablePadding sx={{ py: 0.25 }}>
              <ListItemText
                primary={itemTitles[id] || `Item #${id}`}
                secondary={`#${id}`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Divider sx={{ my: 2 }} />

      <FormControlLabel
        control={<Switch checked={activateImmediately} onChange={(e) => setActivateImmediately(e.target.checked)} />}
        label="Activate immediately (draft → active)"
      />

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      <Box sx={{ mt: 3, textAlign: 'right' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleFinish}
          disabled={executing}
          startIcon={executing ? <CircularProgress size={18} /> : undefined}
        >
          {executing ? 'Creating...' : `Create Change Set${activateImmediately ? ' & Activate' : ''}`}
        </Button>
      </Box>
    </Box>
  );
};

export default NewWorkStep3;
