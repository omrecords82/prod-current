import React from 'react';
import { Box, Paper, Typography, Stack, Chip, IconButton, Tooltip, useTheme } from '@mui/material';
import { IconAlertTriangle, IconPlayerPlay, IconRocket, IconArrowRight } from '@tabler/icons-react';
import { CLASSIFICATION } from '@/theme/adminTokens';
import SeverityDot from './SeverityDot';
import type { BlockedFrontier } from '../types';

function BlockedFrontiersPanel({
  frontiers,
  onResume,
  onRelease,
}: {
  frontiers: BlockedFrontier[];
  onResume: (wfId: number) => void;
  onRelease: (promptId: number) => void;
}) {
  const theme = useTheme();

  if (frontiers.length === 0) {
    return (
      <Paper sx={{ p: 2, mb: 2, border: `1px solid ${theme.palette.success.main}` }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle2" color="success.main">
            No blocked frontiers — all workflows advancing
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 0, mb: 3, overflow: 'hidden', borderColor: CLASSIFICATION.action_required.border }}>
      <Box sx={{ px: 2, py: 1.5, bgcolor: CLASSIFICATION.action_required.bg }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconAlertTriangle size={18} color={CLASSIFICATION.action_required.accent} />
          <Typography variant="subtitle1" fontWeight={700} color={CLASSIFICATION.action_required.text}>
            Blocked Steps / Frontiers ({frontiers.length})
          </Typography>
        </Stack>
      </Box>
      {frontiers.map((f, i) => (
        <Box
          key={`${f.workflow_id}-${f.step_number}`}
          sx={{
            px: 2,
            py: 1.5,
            borderTop: i > 0 ? `1px solid ${theme.palette.divider}` : undefined,
            '&:hover': { bgcolor: theme.palette.grey[100] },
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <SeverityDot severity={f.severity} />
            <Box flex={1} minWidth={0}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" fontWeight={600} noWrap>
                  {f.workflow_name}
                </Typography>
                <IconArrowRight size={14} />
                <Typography variant="body2" color="text.secondary" noWrap>
                  Step {f.step_number}: {f.step_title}
                </Typography>
                {f.gate_id && (
                  <Chip label={f.gate_id} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {f.explanation}
              </Typography>
              {f.recommended_action && (
                <Typography variant="caption" color="primary" sx={{ mt: 0.25, display: 'block' }}>
                  Recommended: {f.recommended_action}
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={0.5} flexShrink={0}>
              {f.gate_id === 'G10' && (
                <Tooltip title="Resume Workflow">
                  <IconButton size="small" color="success" onClick={() => onResume(f.workflow_id)}>
                    <IconPlayerPlay size={16} />
                  </IconButton>
                </Tooltip>
              )}
              {f.prompt_id && ['G7', 'G13'].includes(f.gate_id || '') && (
                <Tooltip title="Release Now">
                  <IconButton size="small" color="primary" onClick={() => onRelease(f.prompt_id)}>
                    <IconRocket size={16} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>
        </Box>
      ))}
    </Paper>
  );
}

export default BlockedFrontiersPanel;
