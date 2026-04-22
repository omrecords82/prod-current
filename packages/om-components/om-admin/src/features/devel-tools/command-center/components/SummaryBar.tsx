import React from 'react';
import { Paper, Typography, Stack, useTheme } from '@mui/material';

function SummaryBar({ summary }: { summary: any }) {
  const theme = useTheme();
  if (!summary) return null;

  const items = [
    { label: 'Active Workflows', value: summary.workflows?.active || 0, color: theme.palette.primary.main },
    { label: 'Exceptions', value: summary.exceptions?.total || 0, color: summary.exceptions?.total > 0 ? theme.palette.error.main : theme.palette.success.main },
    { label: 'Blocked', value: summary.exceptions?.blocked || 0, color: summary.exceptions?.blocked > 0 ? theme.palette.error.main : theme.palette.text.secondary },
    { label: 'Overdue', value: summary.exceptions?.overdue || 0, color: summary.exceptions?.overdue > 0 ? theme.palette.warning.main : theme.palette.text.secondary },
    { label: 'Ready to Release', value: summary.queue?.ready_for_release || 0, color: theme.palette.info.main },
  ];

  return (
    <Paper sx={{ px: 2, py: 1.5, mb: 2 }}>
      <Stack direction="row" spacing={3} justifyContent="space-around" flexWrap="wrap">
        {items.map(it => (
          <Stack key={it.label} alignItems="center" spacing={0.25}>
            <Typography variant="h5" fontWeight={700} sx={{ color: it.color }}>
              {it.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {it.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

export default SummaryBar;
