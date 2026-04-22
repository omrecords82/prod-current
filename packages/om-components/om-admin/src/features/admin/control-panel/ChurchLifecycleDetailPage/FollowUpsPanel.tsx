import React from 'react';
import {
  alpha,
  Box,
  Button,
  Chip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import { COLOR } from './constants';
import type { FollowUpsPanelProps } from './types';

const FollowUpsPanel: React.FC<FollowUpsPanelProps> = ({
  followUps,
  handleCompleteFollowUp,
  setFollowUpForm,
  setFollowUpDialogOpen,
  formatDate,
}) => {
  const pending = followUps.filter(f => f.status === 'pending');
  const completed = followUps.filter(f => f.status === 'completed');
  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Follow-ups ({pending.length} pending)
        </Typography>
        <Button
          variant="contained" size="small" startIcon={<AddIcon />}
          onClick={() => {
            setFollowUpForm({ due_date: '', subject: '', description: '' });
            setFollowUpDialogOpen(true);
          }}
          sx={{ textTransform: 'none', bgcolor: COLOR, '&:hover': { bgcolor: alpha(COLOR, 0.85) } }}
        >
          Schedule Follow-up
        </Button>
      </Box>

      {pending.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {pending.map(f => {
            const isOverdue = new Date(f.due_date) < new Date(new Date().toDateString());
            return (
              <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <IconButton size="small" onClick={() => handleCompleteFollowUp(f.id)} sx={{ color: '#4caf50' }}>
                  <CheckIcon fontSize="small" />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>{f.subject}</Typography>
                  {f.description && <Typography variant="caption" color="text.secondary">{f.description}</Typography>}
                </Box>
                <Chip
                  label={formatDate(f.due_date)}
                  size="small"
                  color={isOverdue ? 'error' : 'default'}
                  variant={isOverdue ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            );
          })}
        </Box>
      )}

      {completed.length > 0 && (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, mb: 1, display: 'block' }}>
            Completed ({completed.length})
          </Typography>
          {completed.map(f => (
            <Box key={f.id} sx={{ py: 0.75, opacity: 0.6 }}>
              <Typography variant="body2" sx={{ textDecoration: 'line-through' }}>{f.subject}</Typography>
              <Typography variant="caption" color="text.secondary">{formatDate(f.completed_at)}</Typography>
            </Box>
          ))}
        </>
      )}

      {followUps.length === 0 && (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No follow-ups scheduled</Typography>
      )}
    </>
  );
};

export default FollowUpsPanel;
