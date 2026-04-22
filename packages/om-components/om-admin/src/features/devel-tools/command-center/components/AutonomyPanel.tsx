import React from 'react';
import { Box, Paper, Typography, Stack, Grid, useTheme } from '@mui/material';
import { IconBolt, IconCircleCheck, IconPlayerPause } from '@tabler/icons-react';
import SeverityDot from './SeverityDot';
import { formatTime } from '../types';
import type { AutonomyStatus } from '../types';

function AutonomyPanel({ autonomy }: { autonomy: AutonomyStatus }) {
  const theme = useTheme();
  const modeColors: Record<string, string> = {
    OFF: theme.palette.text.disabled,
    RELEASE_ONLY: theme.palette.info.main,
    SAFE_ADVANCE: theme.palette.success.main,
    SUPERVISED_FLOW: theme.palette.primary.main,
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <IconBolt size={18} />
        <Typography variant="subtitle1" fontWeight={700}>
          Autonomy Status
        </Typography>
      </Stack>
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Typography variant="caption" color="text.secondary">Mode</Typography>
          <Typography variant="body2" fontWeight={700} sx={{ color: modeColors[autonomy.current_mode] || 'inherit' }}>
            {autonomy.current_mode}
          </Typography>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Typography variant="caption" color="text.secondary">Allowed Actions</Typography>
          <Typography variant="body2">
            {autonomy.allowed_actions.length > 0 ? autonomy.allowed_actions.join(', ') : 'None'}
          </Typography>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Typography variant="caption" color="text.secondary">Advancing</Typography>
          <Typography variant="body2" fontWeight={600} color="success.main">
            {autonomy.workflow_counts.advancing_autonomously}
          </Typography>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Typography variant="caption" color="text.secondary">Paused</Typography>
          <Typography variant="body2" fontWeight={600} color={autonomy.workflow_counts.paused > 0 ? 'warning.main' : 'text.secondary'}>
            {autonomy.workflow_counts.paused}
          </Typography>
        </Grid>
      </Grid>

      {autonomy.paused_workflows.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" fontWeight={600} color="warning.main">
            Paused Workflows:
          </Typography>
          {autonomy.paused_workflows.map((pw: any) => (
            <Stack key={pw.id} direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <SeverityDot severity="warning" />
              <Typography variant="caption" fontWeight={500}>{pw.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                — {pw.why_paused}
              </Typography>
            </Stack>
          ))}
        </Box>
      )}

      {autonomy.recent_advances.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" fontWeight={600} color="success.main">
            Recent Advances:
          </Typography>
          {autonomy.recent_advances.slice(0, 3).map((a: any, i: number) => (
            <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <IconCircleCheck size={12} color={theme.palette.success.main} />
              <Typography variant="caption">{a.target} — {a.why_advanced}</Typography>
              <Typography variant="caption" color="text.secondary">{formatTime(a.timestamp)}</Typography>
            </Stack>
          ))}
        </Box>
      )}

      {autonomy.recent_pauses.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" fontWeight={600} color="warning.main">
            Recent Pauses:
          </Typography>
          {autonomy.recent_pauses.slice(0, 3).map((p: any, i: number) => (
            <Stack key={i} direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 0.5 }}>
              <IconPlayerPause size={12} color={theme.palette.warning.main} style={{ marginTop: 2 }} />
              <Box>
                <Typography variant="caption">{p.workflow} — {p.why_paused}</Typography>
                {p.what_must_change && (
                  <Typography variant="caption" color="primary" display="block">
                    To resume: {p.what_must_change}
                  </Typography>
                )}
              </Box>
            </Stack>
          ))}
        </Box>
      )}
    </Paper>
  );
}

export default AutonomyPanel;
