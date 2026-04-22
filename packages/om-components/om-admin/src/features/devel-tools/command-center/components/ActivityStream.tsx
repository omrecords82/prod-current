import React, { useState } from 'react';
import { Box, Paper, Typography, Stack, Chip, Button, Divider, useTheme } from '@mui/material';
import { IconActivity } from '@tabler/icons-react';
import { CLASSIFICATION } from '@/theme/adminTokens';
import { formatTime } from '../types';
import type { ActivityEvent } from '../types';

function ActivityStream({ events }: { events: ActivityEvent[] }) {
  const theme = useTheme();
  const [showAll, setShowAll] = useState(false);

  const highEvents = events.filter(e => e.importance === 'high');
  const displayed = showAll ? events : (highEvents.length > 0 ? highEvents : events.slice(0, 5));

  const levelColor = (level: string) => {
    if (level === 'ERROR') return theme.palette.error.main;
    if (level === 'WARN') return theme.palette.warning.main;
    return theme.palette.text.secondary;
  };

  return (
    <Paper sx={{ p: 0, overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconActivity size={16} />
            <Typography variant="subtitle2" fontWeight={700}>Activity Stream</Typography>
            {!showAll && highEvents.length > 0 && (
              <Chip label={`${highEvents.length} important`} size="small" color="warning" variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />
            )}
          </Stack>
          <Button size="small" onClick={() => setShowAll(!showAll)} sx={{ fontSize: '0.7rem' }}>
            {showAll ? 'Show Important' : 'Show All'}
          </Button>
        </Stack>
      </Box>
      <Divider />
      {displayed.slice(0, 15).map((e, i) => (
        <Box
          key={i}
          sx={{
            px: 2,
            py: 0.75,
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: e.importance === 'high' ? CLASSIFICATION.monitor.bg : 'transparent',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" sx={{ color: levelColor(e.level), fontWeight: 600, minWidth: 35 }}>
              {e.level}
            </Typography>
            <Typography variant="caption" flex={1} noWrap>
              {e.message}
            </Typography>
            <Typography variant="caption" color="text.secondary" flexShrink={0}>
              {formatTime(e.timestamp)}
            </Typography>
          </Stack>
        </Box>
      ))}
      {events.length === 0 && (
        <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">No recent activity</Typography>
        </Box>
      )}
    </Paper>
  );
}

export default ActivityStream;
