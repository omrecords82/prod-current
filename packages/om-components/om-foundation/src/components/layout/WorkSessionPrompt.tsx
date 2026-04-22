/**
 * WorkSessionPrompt — Non-intrusive post-login prompt to start a work session.
 *
 * Shows once after login if no active session exists.
 * Dismisses on click or after sessionStorage flag is set.
 * Does NOT re-prompt on navigation — only on fresh login.
 */

import { useState, useEffect } from 'react';
import {
  Snackbar,
  Button,
  IconButton,
  Typography,
  Box,
  useTheme,
  alpha,
} from '@mui/material';
import { IconX, IconPlayerPlay } from '@tabler/icons-react';
import { apiClient } from '@/api/utils/axiosInstance';
import { useAuth } from '@/context/AuthContext';

const DISMISS_KEY = 'work_prompt_dismissed';

export default function WorkSessionPrompt() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { authenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authenticated) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    // Check if there's already an active session
    const check = async () => {
      try {
        const res = await apiClient.get('/work-sessions/active');
        const data = res.data || res;
        if (!data.active) {
          // Small delay so it doesn't flash immediately on load
          setTimeout(() => setOpen(true), 1500);
        }
      } catch {
        // Silently fail — don't block the app
      }
    };
    check();
  }, [authenticated]);

  const handleStart = async () => {
    setLoading(true);
    try {
      await apiClient.post('/work-sessions/start', {
        source_system: 'orthodoxmetrics',
        context: { page: window.location.pathname },
      });
      sessionStorage.setItem(DISMISS_KEY, 'true');
      setOpen(false);
      // Force a re-render of WorkSessionControl by dispatching a custom event
      window.dispatchEvent(new CustomEvent('work-session-changed'));
    } catch (err) {
      console.error('Failed to start work session from prompt:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true');
    setOpen(false);
  };

  if (!open) return null;

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{
        top: '72px !important',
        '& .MuiSnackbarContent-root': {
          bgcolor: 'transparent',
          boxShadow: 'none',
          padding: 0,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          bgcolor: isDark ? '#1e1b4b' : '#faf5ff',
          border: `1px solid ${isDark ? alpha('#8c249d', 0.4) : alpha('#8c249d', 0.2)}`,
          borderRadius: '12px',
          px: 2.5,
          py: 1.5,
          boxShadow: isDark
            ? '0 8px 24px rgba(0, 0, 0, 0.4)'
            : '0 8px 24px rgba(140, 36, 157, 0.12)',
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: isDark ? alpha('#8c249d', 0.2) : alpha('#8c249d', 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <IconPlayerPlay size={18} color={isDark ? '#d8b4fe' : '#8c249d'} />
        </Box>

        <Box sx={{ mr: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              color: isDark ? '#e9d5ff' : '#2d1b4e',
              fontSize: '13px',
              lineHeight: 1.3,
            }}
          >
            Ready to start work?
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: isDark ? '#a78bfa' : '#7c3aed',
              fontSize: '11px',
            }}
          >
            Track your session time
          </Typography>
        </Box>

        <Button
          size="small"
          variant="contained"
          onClick={handleStart}
          disabled={loading}
          startIcon={<IconPlayerPlay size={14} />}
          sx={{
            bgcolor: '#8c249d',
            '&:hover': { bgcolor: '#7c1f8c' },
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '12px',
            px: 2,
            py: 0.5,
            borderRadius: '8px',
            minWidth: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          Start
        </Button>

        <IconButton
          size="small"
          onClick={handleDismiss}
          sx={{
            p: 0.5,
            color: isDark ? '#6b7280' : '#9ca3af',
            '&:hover': { color: isDark ? '#d1d5db' : '#374151' },
          }}
        >
          <IconX size={16} />
        </IconButton>
      </Box>
    </Snackbar>
  );
}
