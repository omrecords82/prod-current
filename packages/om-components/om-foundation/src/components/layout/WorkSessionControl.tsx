/**
 * WorkSessionControl — Compact header control for work session tracking.
 *
 * States:
 *   - No session: "Start Work" chip
 *   - Active: green dot + running timer + "End Work" button
 *   - Loading: subtle skeleton
 *
 * Works in both OrthodoxMetrics and OMAI via shared /api/work-sessions/* endpoints.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  TextField,
  Popover,
  Button,
  useTheme,
  useMediaQuery,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  IconPlayerPlay,
  IconPlayerStop,
  IconClock,
  IconNote,
} from '@tabler/icons-react';
import { apiClient } from '@/api/utils/axiosInstance';

interface WorkSession {
  id: number;
  user_id: number;
  source_system: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: string;
  summary_note: string | null;
  elapsed_seconds: number;
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function WorkSessionControl() {
  const theme = useTheme();
  const smDown = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';

  const [session, setSession] = useState<WorkSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [noteAnchor, setNoteAnchor] = useState<HTMLElement | null>(null);
  const [noteText, setNoteText] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActive = useCallback(async () => {
    try {
      const res = await apiClient.get('/work-sessions/active');
      const data = res.data || res;
      if (data.active && data.session) {
        setSession(data.session);
        setElapsed(Math.max(0, data.session.elapsed_seconds || 0));
        setNoteText(data.session.summary_note || '');
      } else {
        setSession(null);
        setElapsed(0);
      }
    } catch (err) {
      console.error('WorkSessionControl: failed to fetch active session', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling every 60s + listen for cross-component updates
  useEffect(() => {
    fetchActive();
    pollRef.current = setInterval(fetchActive, 60000);

    const handleSessionChange = () => fetchActive();
    window.addEventListener('work-session-changed', handleSessionChange);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      window.removeEventListener('work-session-changed', handleSessionChange);
    };
  }, [fetchActive]);

  // Timer tick
  useEffect(() => {
    if (session && session.status === 'active') {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session]);

  const handleStart = async () => {
    setActionLoading(true);
    try {
      const res = await apiClient.post('/work-sessions/start', {
        source_system: 'orthodoxmetrics',
        context: { page: window.location.pathname },
      });
      const data = res.data || res;
      if (data.session) {
        setSession(data.session);
        setElapsed(data.session.elapsed_seconds || 0);
        sessionStorage.setItem('work_prompt_dismissed', 'true');
        window.dispatchEvent(new CustomEvent('work-session-changed'));
      }
    } catch (err) {
      console.error('Failed to start work session:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnd = async () => {
    setActionLoading(true);
    try {
      await apiClient.post('/work-sessions/end', {
        summary_note: noteText || undefined,
        context: { page: window.location.pathname },
      });
      setSession(null);
      setElapsed(0);
      setNoteText('');
      window.dispatchEvent(new CustomEvent('work-session-changed'));
    } catch (err) {
      console.error('Failed to end work session:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!session || !noteText.trim()) return;
    try {
      await apiClient.post(`/work-sessions/${session.id}/note`, {
        summary_note: noteText,
      });
      setNoteAnchor(null);
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
        <CircularProgress size={16} sx={{ color: isDark ? '#9ca3af' : '#6b7280' }} />
      </Box>
    );
  }

  // Not started state
  if (!session) {
    return (
      <Tooltip title="Start a work session" arrow>
        <Chip
          icon={<IconPlayerPlay size={14} />}
          label={smDown ? '' : 'Start Work'}
          size="small"
          onClick={handleStart}
          disabled={actionLoading}
          sx={{
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '12px',
            height: 28,
            bgcolor: isDark ? alpha('#8c249d', 0.15) : alpha('#8c249d', 0.08),
            color: isDark ? '#d8b4fe' : '#7c3aed',
            border: `1px solid ${isDark ? alpha('#8c249d', 0.3) : alpha('#8c249d', 0.15)}`,
            '&:hover': {
              bgcolor: isDark ? alpha('#8c249d', 0.25) : alpha('#8c249d', 0.15),
            },
            '& .MuiChip-icon': {
              color: 'inherit',
            },
          }}
        />
      </Tooltip>
    );
  }

  // Active session state
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        bgcolor: isDark ? alpha('#059669', 0.12) : alpha('#059669', 0.06),
        border: `1px solid ${isDark ? alpha('#059669', 0.3) : alpha('#059669', 0.15)}`,
        borderRadius: '16px',
        px: 1.25,
        py: 0.25,
        height: 32,
      }}
    >
      {/* Pulsing green dot */}
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: '#10b981',
          boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.3)',
          animation: 'pulse-dot 2s ease-in-out infinite',
          '@keyframes pulse-dot': {
            '0%, 100%': { boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.3)' },
            '50%': { boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.15)' },
          },
          flexShrink: 0,
        }}
      />

      {/* Timer */}
      <Typography
        variant="caption"
        sx={{
          fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace',
          fontWeight: 700,
          fontSize: '12px',
          color: isDark ? '#6ee7b7' : '#059669',
          letterSpacing: '0.5px',
          minWidth: smDown ? undefined : '48px',
          textAlign: 'center',
        }}
      >
        {formatElapsed(elapsed)}
      </Typography>

      {/* Note button (desktop only) */}
      {!smDown && (
        <Tooltip title={session.summary_note || 'Add a note'} arrow>
          <IconButton
            size="small"
            onClick={(e) => setNoteAnchor(e.currentTarget)}
            sx={{
              p: 0.25,
              color: isDark ? '#9ca3af' : '#6b7280',
              '&:hover': { color: isDark ? '#d1d5db' : '#374151' },
            }}
          >
            <IconNote size={14} />
          </IconButton>
        </Tooltip>
      )}

      {/* End Work button */}
      <Tooltip title="End work session" arrow>
        <IconButton
          size="small"
          onClick={handleEnd}
          disabled={actionLoading}
          sx={{
            p: 0.25,
            color: isDark ? '#fca5a5' : '#dc2626',
            '&:hover': {
              bgcolor: isDark ? alpha('#dc2626', 0.15) : alpha('#dc2626', 0.1),
            },
          }}
        >
          {actionLoading ? (
            <CircularProgress size={14} color="inherit" />
          ) : (
            <IconPlayerStop size={14} />
          )}
        </IconButton>
      </Tooltip>

      {/* Note popover */}
      <Popover
        open={Boolean(noteAnchor)}
        anchorEl={noteAnchor}
        onClose={() => setNoteAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              p: 2,
              width: 280,
              bgcolor: isDark ? '#1f2937' : '#ffffff',
            },
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Session Note
        </Typography>
        <TextField
          multiline
          rows={3}
          fullWidth
          size="small"
          placeholder="What are you working on?"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          sx={{ mb: 1 }}
        />
        <Button
          size="small"
          variant="contained"
          onClick={handleSaveNote}
          disabled={!noteText.trim()}
          sx={{
            bgcolor: '#8c249d',
            '&:hover': { bgcolor: '#7c1f8c' },
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Save
        </Button>
      </Popover>
    </Box>
  );
}
