import React, { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Typography, Stack, Chip, IconButton, Tooltip, Divider, CircularProgress } from '@mui/material';
import { IconArrowRight, IconBolt } from '@tabler/icons-react';
import { CLASSIFICATION } from '@/theme/adminTokens';
import { apiClient } from '@/api/utils/axiosInstance';

function ProgressionPanel() {
  const [pipeline, setPipeline] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const fetchPipeline = useCallback(async () => {
    try {
      const res = await apiClient.get('/workflows/progression/pipeline');
      setPipeline(res.data);
    } catch {
      // Silently handle — panel is supplementary
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
    const interval = setInterval(fetchPipeline, 30000);
    return () => clearInterval(interval);
  }, [fetchPipeline]);

  const handleRunProgression = async () => {
    setRunning(true);
    try {
      const res = await apiClient.post('/workflows/progression/run');
      const d = res.data;
      setLastResult(`${d.advanced} advanced, ${d.skipped} skipped`);
      fetchPipeline();
    } catch (err: any) {
      setLastResult(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const blocked = pipeline?.blocked;
  const hasBlocked = blocked && (blocked.by_audit > 0 || blocked.by_manual_approval > 0 || blocked.pending_release > 0);

  return (
    <Paper sx={{ mb: 2, overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5, bgcolor: CLASSIFICATION.ready.bg }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconArrowRight size={16} color={CLASSIFICATION.ready.accent} />
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">Progression Pipeline</Typography>
          </Stack>
          <Tooltip title="Run progression cycle">
            <span>
              <IconButton size="small" onClick={handleRunProgression} disabled={running}>
                {running ? <CircularProgress size={14} /> : <IconBolt size={14} />}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>
      <Divider />
      <Box sx={{ px: 2, py: 1.5 }}>
        {blocked && (
          <Stack spacing={0.75}>
            {blocked.by_audit > 0 && (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Blocked by audit</Typography>
                <Chip label={blocked.by_audit} size="small" color="warning" sx={{ height: 18, fontSize: '0.65rem' }} />
              </Stack>
            )}
            {blocked.by_manual_approval > 0 && (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Awaiting manual approval</Typography>
                <Chip label={blocked.by_manual_approval} size="small" color="default" sx={{ height: 18, fontSize: '0.65rem' }} />
              </Stack>
            )}
            {blocked.pending_release > 0 && (
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Pending release</Typography>
                <Chip label={blocked.pending_release} size="small" color="info" sx={{ height: 18, fontSize: '0.65rem' }} />
              </Stack>
            )}
            {!hasBlocked && (
              <Typography variant="caption" color="success.main">All clear — no blocked prompts</Typography>
            )}
          </Stack>
        )}
        {lastResult && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Last run: {lastResult}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

export default ProgressionPanel;
