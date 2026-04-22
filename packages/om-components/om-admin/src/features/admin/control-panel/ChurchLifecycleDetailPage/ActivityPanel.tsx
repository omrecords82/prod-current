import React from 'react';
import {
  alpha,
  Avatar,
  Box,
  Button,
  Chip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  NoteAlt as NoteIcon,
} from '@mui/icons-material';
import { ACTIVITY_COLORS, ACTIVITY_ICONS, COLOR } from './constants';
import type { ActivityPanelProps } from './types';

const ActivityPanel: React.FC<ActivityPanelProps> = ({
  activities,
  setActivityForm,
  setActivityDialogOpen,
  isDark,
  timeAgo,
}) => (
  <>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={700}>Activity Log ({activities.length})</Typography>
      <Button
        variant="contained" size="small" startIcon={<AddIcon />}
        onClick={() => {
          setActivityForm({ activity_type: 'note', subject: '', body: '' });
          setActivityDialogOpen(true);
        }}
        sx={{ textTransform: 'none', bgcolor: COLOR, '&:hover': { bgcolor: alpha(COLOR, 0.85) } }}
      >
        Log Activity
      </Button>
    </Box>

    {activities.length === 0 ? (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No activity yet</Typography>
    ) : (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {activities.map(a => {
          const aColor = ACTIVITY_COLORS[a.activity_type] || '#9e9e9e';
          return (
            <Box key={a.id} sx={{ display: 'flex', gap: 1.5, py: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(aColor, isDark ? 0.25 : 0.12), color: aColor }}>
                {ACTIVITY_ICONS[a.activity_type] || <NoteIcon fontSize="small" />}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography variant="body2" fontWeight={600}>{a.subject}</Typography>
                  <Typography variant="caption" color="text.secondary">{timeAgo(a.created_at)}</Typography>
                </Box>
                {a.body && <Typography variant="caption" color="text.secondary">{a.body}</Typography>}
                <Chip label={a.activity_type} size="small" sx={{ fontSize: '0.68rem', height: 20, mt: 0.5, bgcolor: alpha(aColor, 0.1), color: aColor }} />
              </Box>
            </Box>
          );
        })}
      </Box>
    )}
  </>
);

export default ActivityPanel;
