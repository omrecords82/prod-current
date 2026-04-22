import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  alpha
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Activity, Users, RefreshCw, CheckCircle, AlertTriangle } from '@/ui/icons';

interface SessionStats {
  totalSessions: number;
  uniqueUsers: number;
  isHealthy: boolean;
  healthMessage: string;
  recentSessions: {
    sessionId: string;
    fullSessionId: string;
    userId: string | null;
    email: string | null;
    role: string | null;
    expiresAt: string;
  }[];
  timestamp: string;
}

interface SessionPulseProps {
  refreshInterval?: number;
  trackedEmail?: string;
}

// Default tracked user for session monitoring
const DEFAULT_TRACKED_EMAIL = 'frjames@ssppoc.org';

const SessionPulse: React.FC<SessionPulseProps> = ({ 
  refreshInterval = 10000,
  trackedEmail = DEFAULT_TRACKED_EMAIL 
}) => {
  const theme = useTheme();
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // Check if tracked user has an active session
  const trackedUserSession = stats?.recentSessions?.find(
    s => s.email?.toLowerCase() === trackedEmail.toLowerCase()
  );
  const isTrackedUserOnline = !!trackedUserSession;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiClient.get<any>('/admin/session-stats');
      if (data.success) {
        setStats(data.stats);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, [stopPolling]);

  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(fetchStats, refreshInterval);
    return () => stopPolling();
  }, [fetchStats, refreshInterval, stopPolling]);

  const gaugePercentage = stats 
    ? Math.min((stats.totalSessions / Math.max(stats.uniqueUsers, 1)) * 100, 100)
    : 0;

  const gaugeColor = stats?.isHealthy 
    ? theme.palette.success.main 
    : theme.palette.warning.main;

  if (loading && !stats) {
    return (
      <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <CircularProgress size={40} />
      </Paper>
    );
  }

  if (error && !stats) {
    return (
      <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.1) }}>
        <Typography color="error">Session Pulse Error: {error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper 
      sx={{ 
        p: 2, 
        mb: 2,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Activity size={20} color={theme.palette.primary.main} />
          <Typography variant="h6" fontWeight={600}>
            Session Pulse
          </Typography>
        </Box>
        <Tooltip title={`Last refresh: ${lastRefresh?.toLocaleTimeString() || 'Never'}`}>
          <IconButton size="small" onClick={fetchStats} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tracked User Status Banner */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          mb: 2,
          p: 1.5,
          borderRadius: 1,
          bgcolor: isTrackedUserOnline 
            ? alpha(theme.palette.success.main, 0.1) 
            : alpha(theme.palette.grey[500], 0.1),
          border: `1px solid ${isTrackedUserOnline 
            ? alpha(theme.palette.success.main, 0.3) 
            : alpha(theme.palette.grey[500], 0.2)}`
        }}
      >
        <Box 
          sx={{ 
            width: 12, 
            height: 12, 
            borderRadius: '50%', 
            bgcolor: isTrackedUserOnline ? 'success.main' : 'grey.500',
            boxShadow: isTrackedUserOnline ? `0 0 8px ${theme.palette.success.main}` : 'none',
            animation: isTrackedUserOnline ? 'pulse 2s infinite' : 'none'
          }} 
        />
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            Fr. James Session Tracker
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isTrackedUserOnline 
              ? `Online • Role: ${trackedUserSession?.role || 'unknown'} • Session: ${trackedUserSession?.sessionId}`
              : `${trackedEmail} is currently offline`
            }
          </Typography>
        </Box>
        <Chip 
          label={isTrackedUserOnline ? 'ONLINE' : 'OFFLINE'}
          size="small"
          color={isTrackedUserOnline ? 'success' : 'default'}
          sx={{ fontWeight: 600 }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Active Sessions Gauge */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress
              variant="determinate"
              value={100}
              size={80}
              thickness={4}
              sx={{ color: alpha(theme.palette.grey[500], 0.2) }}
            />
            <CircularProgress
              variant="determinate"
              value={gaugePercentage}
              size={80}
              thickness={4}
              sx={{ 
                color: gaugeColor,
                position: 'absolute',
                left: 0
              }}
            />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: 'absolute',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h5" fontWeight={700} color={gaugeColor}>
                {stats?.totalSessions || 0}
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Active Sessions
          </Typography>
        </Box>

        {/* User Match Indicator */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 120 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Users size={18} />
            <Typography variant="h6">{stats?.uniqueUsers || 0}</Typography>
          </Box>
          <Chip
            icon={stats?.isHealthy ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            label={stats?.isHealthy ? 'Healthy' : 'Check'}
            size="small"
            color={stats?.isHealthy ? 'success' : 'warning'}
            sx={{ fontWeight: 500 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, textAlign: 'center' }}>
            {stats?.healthMessage || 'Loading...'}
          </Typography>
        </Box>

        {/* Live Session Log */}
        <Box sx={{ flex: 1, minWidth: 250 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Recent Sessions
          </Typography>
          <List dense sx={{ 
            bgcolor: alpha(theme.palette.background.default, 0.5), 
            borderRadius: 1,
            maxHeight: 150,
            overflow: 'auto'
          }}>
            {stats?.recentSessions && stats.recentSessions.length > 0 ? (
              stats.recentSessions.map((session, idx) => {
                const isTracked = session.email?.toLowerCase() === trackedEmail.toLowerCase();
                return (
                  <ListItem 
                    key={session.fullSessionId || idx} 
                    sx={{ 
                      py: 0.5,
                      bgcolor: isTracked ? alpha(theme.palette.success.main, 0.15) : 'transparent',
                      borderLeft: isTracked ? `3px solid ${theme.palette.success.main}` : 'none',
                      pl: isTracked ? 1 : 2
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {isTracked && (
                            <Box 
                              sx={{ 
                                width: 8, 
                                height: 8, 
                                borderRadius: '50%', 
                                bgcolor: 'success.main',
                                animation: 'pulse 2s infinite'
                              }} 
                            />
                          )}
                          <Typography variant="body2" fontFamily="monospace" fontSize={11} fontWeight={isTracked ? 600 : 400}>
                            {session.sessionId}
                          </Typography>
                          {session.role && (
                            <Chip 
                              label={session.role} 
                              size="small" 
                              sx={{ height: 18, fontSize: 10 }}
                              color={session.role === 'super_admin' ? 'error' : session.role === 'priest' ? 'primary' : 'default'}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography 
                          variant="caption" 
                          fontSize={10} 
                          fontWeight={isTracked ? 600 : 400}
                          color={isTracked ? 'success.main' : 'text.secondary'}
                        >
                          {session.email || 'Anonymous'} {isTracked && '★ Tracked'}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })
            ) : (
              <ListItem>
                <ListItemText 
                  primary="No active sessions" 
                  primaryTypographyProps={{ color: 'text.secondary', fontSize: 12 }}
                />
              </ListItem>
            )}
          </List>
        </Box>
      </Box>
    </Paper>
  );
};

export default SessionPulse;
