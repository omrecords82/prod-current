/**
 * RecentActivityPanel — Shows recent platform actions (restarts, pings,
 * backups) with status indicators and timing.
 * Self-contained component with own data fetching.
 * Extracted from PlatformStatusPage.tsx
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import { IconActivity } from '@tabler/icons-react';
import { apiClient } from '@/api/utils/axiosInstance';
import type { ActionHistoryItem } from './PlatformStatusDialogs';

const ACTION_LABELS: Record<string, string> = {
  service_restart: 'Restart',
  service_logs: 'View Logs',
  database_backup: 'Backup',
  database_ping: 'DB Ping',
};

const RESULT_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  success: 'success',
  started: 'info',
  failed: 'error',
  blocked: 'warning',
};

function timeAgoShort(ts: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  if (diff < 10) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const RecentActivityPanel: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [actions, setActions] = useState<ActionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await apiClient.get<{ actions: ActionHistoryItem[] }>('/platform/actions/history?limit=15');
      setActions(res.actions || []);
    } catch (_) {
      // silently fail — not critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch, refreshKey]);

  if (loading) {
    return (
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, mb: 2 }}>
        <Skeleton width={140} height={20} sx={{ mb: 1 }} />
        {[0, 1, 2].map(i => <Skeleton key={i} height={28} sx={{ mb: 0.5 }} />)}
      </Paper>
    );
  }

  if (actions.length === 0) return null;

  return (
    <Paper elevation={0} sx={{ p: 2, border: `1px solid ${isDark ? '#2a2a2a' : '#e4e4e4'}`, borderRadius: 1.5, mb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.8}>
          <IconActivity size={16} color={theme.palette.text.secondary} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.8rem' }}>Recent Activity</Typography>
        </Stack>
        <Typography variant="caption" fontFamily="monospace" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
          {actions.length} actions
        </Typography>
      </Stack>

      <Stack spacing={0}>
        {actions.map((a) => {
          const resultColor = RESULT_COLORS[a.result || ''] || 'info';
          return (
            <Stack
              key={a.id}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                py: 0.6, px: 0.8, borderRadius: 0.75,
                '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.03) },
              }}
            >
              <Box sx={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                bgcolor: theme.palette[resultColor].main,
              }} />
              <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.72rem', minWidth: 65 }}>
                {ACTION_LABELS[a.action_type] || a.action_type}
              </Typography>
              <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ fontSize: '0.68rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.target || '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', minWidth: 50, textAlign: 'right' }}>
                {a.result || '—'}
              </Typography>
              {a.duration_ms != null && (
                <Typography variant="caption" fontFamily="monospace" color="text.disabled" sx={{ fontSize: '0.62rem', minWidth: 40, textAlign: 'right' }}>
                  {a.duration_ms}ms
                </Typography>
              )}
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem', minWidth: 55, textAlign: 'right' }}>
                {timeAgoShort(a.timestamp)}
              </Typography>
            </Stack>
          );
        })}
      </Stack>
    </Paper>
  );
};

export default RecentActivityPanel;
