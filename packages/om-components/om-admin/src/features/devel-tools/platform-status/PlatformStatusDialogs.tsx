/**
 * PlatformStatusDialogs — Action helpers, RestartConfirmDialog, and
 * ServiceLogsModal for the Platform Status page.
 * Extracted from PlatformStatusPage.tsx
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import {
  IconRefresh,
  IconAlertTriangle,
  IconReload,
  IconFileText,
} from '@tabler/icons-react';
import { apiClient } from '@/api/utils/axiosInstance';

// ─── Action Types ────────────────────────────────────────────────

export interface ActionResult {
  status: 'success' | 'failed' | 'blocked' | 'started';
  message?: string;
  error?: string;
  reason?: string;
  remaining_seconds?: number;
}

export interface ActionHistoryItem {
  id: number;
  action_type: string;
  target: string | null;
  result: string | null;
  duration_ms: number | null;
  user: string;
  timestamp: string;
}

// ─── Toast Hook ──────────────────────────────────────────────────

export function useActionToast() {
  const [toast, setToast] = useState<{ open: boolean; severity: 'success' | 'error' | 'warning' | 'info'; message: string }>({ open: false, severity: 'success', message: '' });
  const show = (severity: 'success' | 'error' | 'warning' | 'info', message: string) => setToast({ open: true, severity, message });
  const close = () => setToast(t => ({ ...t, open: false }));
  return { toast, show, close };
}

/** Maps action error responses to appropriate toast severity */
export function handleActionError(err: any, showToast: (severity: 'success' | 'error' | 'warning', msg: string) => void, fallback: string) {
  const data = err?.response?.data;
  if (data?.status === 'blocked') {
    const msg = data.message || 'Action is temporarily blocked';
    showToast('warning', msg);
  } else {
    showToast('error', data?.message || err?.message || fallback);
  }
}

// ─── Confirm Restart Dialog ──────────────────────────────────────

export const RestartConfirmDialog: React.FC<{
  open: boolean;
  serviceName: string;
  serviceLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, serviceName, serviceLabel, loading, onConfirm, onCancel }) => {
  const isSelf = serviceName === 'orthodox-backend';
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: '1rem' }}>
        Restart {serviceLabel}?
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          This will restart the <strong>{serviceName}</strong> systemd service.
          {isSelf && ' Since this is the backend, your connection will drop momentarily.'}
        </Typography>
        <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: (t) => alpha(t.palette.warning.main, 0.08), border: (t) => `1px solid ${alpha(t.palette.warning.main, 0.2)}` }}>
          <Stack direction="row" alignItems="center" spacing={0.8}>
            <IconAlertTriangle size={14} style={{ flexShrink: 0 }} />
            <Typography variant="caption" color="warning.main" fontWeight={600} sx={{ fontSize: '0.72rem' }}>
              This may temporarily interrupt active requests.{isSelf ? ' The dashboard will lose connection until the backend is back.' : ''}
            </Typography>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={loading} size="small">Cancel</Button>
        <Button onClick={onConfirm} disabled={loading} variant="contained" color="warning" size="small"
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <IconReload size={14} />}
        >
          {loading ? 'Restarting…' : 'Restart'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Service Logs Modal ──────────────────────────────────────────

export const ServiceLogsModal: React.FC<{
  open: boolean;
  serviceName: string;
  serviceLabel: string;
  onClose: () => void;
}> = ({ open, serviceName, serviceLabel, onClose }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ output: string }>(`/platform/actions/service/${serviceName}/logs?lines=200`);
      setLogs(res.output || '(empty)');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }, [serviceName]);

  useEffect(() => {
    if (open) fetchLogs();
  }, [open, fetchLogs]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconFileText size={18} />
          <Typography fontWeight={700} fontSize="0.95rem">{serviceLabel} Logs</Typography>
        </Stack>
        <Tooltip title="Refresh logs">
          <IconButton size="small" onClick={fetchLogs} disabled={loading}>
            {loading ? <CircularProgress size={14} /> : <IconRefresh size={14} />}
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {error && (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="error">{error}</Typography>
          </Box>
        )}
        {!error && (
          <Box
            sx={{
              fontFamily: 'monospace', fontSize: '0.72rem', lineHeight: 1.6,
              p: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              bgcolor: isDark ? '#0d0d0d' : '#f5f5f5',
              maxHeight: 500, overflow: 'auto',
              color: isDark ? '#c8c8c8' : '#333',
            }}
          >
            {loading ? 'Loading logs...' : logs}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} size="small">Close</Button>
      </DialogActions>
    </Dialog>
  );
};
