import React, { useState } from 'react';
import { Box, Paper, Typography, Stack, Chip, IconButton, Tooltip, Collapse, Divider, LinearProgress, useTheme } from '@mui/material';
import { IconChevronDown, IconChevronRight, IconPlayerPlay, IconPlayerPause, IconLock, IconLockOpen } from '@tabler/icons-react';
import ClassBadge from './ClassBadge';
import type { WorkflowItem } from '../types';

function WorkflowRow({
  wf,
  onResume,
  onPause,
  onManualOnly,
}: {
  wf: WorkflowItem;
  onResume: (id: number) => void;
  onPause: (id: number) => void;
  onManualOnly: (id: number, manual: boolean) => void;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const borderColor = wf.classification === 'action_required'
    ? theme.palette.error.main
    : wf.classification === 'monitor'
      ? theme.palette.warning.main
      : theme.palette.success.main;

  return (
    <Paper
      sx={{
        mb: 1,
        borderLeft: `4px solid ${borderColor}`,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: theme.palette.grey[100] },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {expanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
          <Box flex={1} minWidth={0}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" fontWeight={600} noWrap>
                {wf.name}
              </Typography>
              <ClassBadge classification={wf.classification} />
              {wf.autonomy_paused && (
                <Chip label="PAUSED" size="small" color="warning" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
              )}
              {wf.manual_only && (
                <Chip label="MANUAL" size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} icon={<IconLock size={12} />} />
              )}
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {wf.component}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {wf.verified}/{wf.step_count} verified
              </Typography>
              {wf.blocked > 0 && (
                <Typography variant="caption" color="error">
                  {wf.blocked} blocked
                </Typography>
              )}
              <Box flex={1} maxWidth={120}>
                <LinearProgress
                  variant="determinate"
                  value={wf.progress_pct}
                  color={wf.blocked > 0 ? 'error' : wf.progress_pct === 100 ? 'success' : 'primary'}
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </Box>
              <Typography variant="caption" fontWeight={600}>
                {wf.progress_pct}%
              </Typography>
            </Stack>
          </Box>
          <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
            {wf.autonomy_paused ? (
              <Tooltip title="Resume Workflow">
                <IconButton size="small" color="success" onClick={() => onResume(wf.id)}>
                  <IconPlayerPlay size={16} />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Pause Autonomy">
                <IconButton size="small" color="warning" onClick={() => onPause(wf.id)}>
                  <IconPlayerPause size={16} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={wf.manual_only ? 'Clear Manual Only' : 'Set Manual Only'}>
              <IconButton size="small" onClick={() => onManualOnly(wf.id, !wf.manual_only)}>
                {wf.manual_only ? <IconLockOpen size={16} /> : <IconLock size={16} />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>
      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ px: 2, py: 1, bgcolor: theme.palette.grey[100] }}>
          {wf.autonomy_paused && wf.autonomy_pause_reason && (
            <Typography variant="caption" color="warning.main" display="block" sx={{ mb: 1 }}>
              Why paused: {wf.autonomy_pause_reason}
            </Typography>
          )}
          <Stack spacing={0.5}>
            {wf.steps.map((s: any) => (
              <Stack key={s.step_number} direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" sx={{ width: 24, textAlign: 'right', color: 'text.secondary' }}>
                  #{s.step_number}
                </Typography>
                <Chip
                  label={s.prompt_status || 'pending'}
                  size="small"
                  color={
                    s.prompt_status === 'verified' ? 'success'
                    : s.queue_status === 'blocked' ? 'error'
                    : s.prompt_status === 'executing' ? 'info'
                    : 'default'
                  }
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 18, minWidth: 70 }}
                />
                <Typography variant="caption" noWrap>
                  {s.title}
                </Typography>
                {s.quality_score && (
                  <Typography variant="caption" color="text.secondary">
                    Q:{s.quality_score}
                  </Typography>
                )}
              </Stack>
            ))}
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
}

export default WorkflowRow;
