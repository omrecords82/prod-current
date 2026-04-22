/**
 * Admin Floating HUD Component
 * Displays system status information for Super Admin users
 * Features: Draggable, auto-polling, version mismatch alerts, OMAI integration
 */

import { Box, Button, Chip, Tooltip, Typography } from '@mui/material';
import axios from 'axios';
import { Activity, Wrench, ChevronRight, ChevronDown } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  SystemStatus, SessionStats, LogEntry, LogStats,
  OmaiHealth, OmaiBriefing, OmaiTaskItem, OmaiTaskStats,
  OmaiLogsSummary, OmaiLogPattern,
} from './adminHudTypes';
import { DraggableHUD, LEAK_THRESHOLD } from './adminHudTypes';
import HudOmaiPanel from './HudOmaiPanel';
import HudStatusBody from './HudStatusBody';

const AdminFloatingHUD: React.FC = () => {
  // setLogIssues uses updater fn pattern — keep standalone
  const [logIssues, setLogIssues] = useState<LogEntry[]>([]);
  const hudRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // ── HUD bucket (system status, drag, position, log stats) ───────────────
  const [hud, setHud] = useState<{
    status: SystemStatus | null;
    sessionStats: SessionStats | null;
    isInMaintenance: boolean;
    isToggling: boolean;
    isDragging: boolean;
    position: { x: number; y: number };
    offset: { x: number; y: number };
    isHidden: boolean;
    logStats: LogStats;
    isArchiving: boolean;
  }>({
    status: null,
    sessionStats: null,
    isInMaintenance: false,
    isToggling: false,
    isDragging: false,
    position: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    isHidden: false,
    logStats: { total: 0, errors: 0, warnings: 0, isMonitoring: false },
    isArchiving: false,
  });
  const setHudField = useCallback(<K extends keyof typeof hud>(key: K, value: typeof hud[K]) => {
    setHud(prev => ({ ...prev, [key]: value }));
  }, []);
  const setStatus = useCallback((v: SystemStatus | null) => setHudField('status', v), [setHudField]);
  const setSessionStats = useCallback((v: SessionStats | null) => setHudField('sessionStats', v), [setHudField]);
  const setIsInMaintenance = useCallback((v: boolean) => setHudField('isInMaintenance', v), [setHudField]);
  const setIsToggling = useCallback((v: boolean) => setHudField('isToggling', v), [setHudField]);
  const setIsDragging = useCallback((v: boolean) => setHudField('isDragging', v), [setHudField]);
  const setPosition = useCallback((v: { x: number; y: number }) => setHudField('position', v), [setHudField]);
  const setOffset = useCallback((v: { x: number; y: number }) => setHudField('offset', v), [setHudField]);
  const setIsHidden = useCallback((v: boolean) => setHudField('isHidden', v), [setHudField]);
  const setLogStats = useCallback((v: LogStats) => setHudField('logStats', v), [setHudField]);
  const setIsArchiving = useCallback((v: boolean) => setHudField('isArchiving', v), [setHudField]);
  const { status, sessionStats, isInMaintenance, isToggling, isDragging, position, offset, isHidden, logStats, isArchiving } = hud;

  // ── OMAI bucket ──────────────────────────────────────────────────────────
  const [omai, setOmai] = useState<{
    isExpanded: boolean;
    omaiTab: number;
    omaiConnected: boolean;
    omaiHealth: OmaiHealth | null;
    omaiBriefing: OmaiBriefing | null;
    omaiTasks: OmaiTaskItem[];
    omaiTaskStats: OmaiTaskStats | null;
    omaiLogsSummary: OmaiLogsSummary | null;
    omaiLogPatterns: OmaiLogPattern[];
    commandInput: string;
    commandResult: string;
    isCommandRunning: boolean;
  }>({
    isExpanded: false,
    omaiTab: 0,
    omaiConnected: false,
    omaiHealth: null,
    omaiBriefing: null,
    omaiTasks: [],
    omaiTaskStats: null,
    omaiLogsSummary: null,
    omaiLogPatterns: [],
    commandInput: '',
    commandResult: '',
    isCommandRunning: false,
  });
  const setOmaiField = useCallback(<K extends keyof typeof omai>(key: K, value: typeof omai[K]) => {
    setOmai(prev => ({ ...prev, [key]: value }));
  }, []);
  const setIsExpanded = useCallback((v: boolean) => setOmaiField('isExpanded', v), [setOmaiField]);
  const setOmaiTab = useCallback((v: number) => setOmaiField('omaiTab', v), [setOmaiField]);
  const setOmaiConnected = useCallback((v: boolean) => setOmaiField('omaiConnected', v), [setOmaiField]);
  const setOmaiHealth = useCallback((v: OmaiHealth | null) => setOmaiField('omaiHealth', v), [setOmaiField]);
  const setOmaiBriefing = useCallback((v: OmaiBriefing | null) => setOmaiField('omaiBriefing', v), [setOmaiField]);
  const setOmaiTasks = useCallback((v: OmaiTaskItem[]) => setOmaiField('omaiTasks', v), [setOmaiField]);
  const setOmaiTaskStats = useCallback((v: OmaiTaskStats | null) => setOmaiField('omaiTaskStats', v), [setOmaiField]);
  const setOmaiLogsSummary = useCallback((v: OmaiLogsSummary | null) => setOmaiField('omaiLogsSummary', v), [setOmaiField]);
  const setOmaiLogPatterns = useCallback((v: OmaiLogPattern[]) => setOmaiField('omaiLogPatterns', v), [setOmaiField]);
  const setCommandInput = useCallback((v: string) => setOmaiField('commandInput', v), [setOmaiField]);
  const setCommandResult = useCallback((v: string) => setOmaiField('commandResult', v), [setOmaiField]);
  const setIsCommandRunning = useCallback((v: boolean) => setOmaiField('isCommandRunning', v), [setOmaiField]);
  const { isExpanded, omaiTab, omaiConnected, omaiHealth, omaiBriefing, omaiTasks, omaiTaskStats, omaiLogsSummary, omaiLogPatterns, commandInput, commandResult, isCommandRunning } = omai;

  // Existing status polling
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get('/api/system/status');
        setStatus(res.data);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('HUD Fetch Failed', err);
        }
      }
    };

    const fetchSessionStats = async () => {
      try {
        const res = await axios.get('/api/admin/session-stats');
        const data = res.data;
        const totalSessions = data.stats?.totalSessions || 0;
        const uniqueUsers = data.stats?.uniqueUsers || 1;
        const ratio = uniqueUsers > 0 ? totalSessions / uniqueUsers : 0;
        setSessionStats({
          totalSessions,
          uniqueUsers,
          ratio,
          health: data.stats?.health || 'unknown'
        });
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Session stats fetch failed', err);
        }
      }
    };

    const fetchMaintenanceStatus = async () => {
      try {
        const res = await axios.get('/api/maintenance/status');
        setIsInMaintenance(res.data.enabled || false);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Maintenance status fetch failed', err);
        }
      }
    };

    fetchStatus();
    fetchSessionStats();
    fetchMaintenanceStatus();

    const statusInterval = setInterval(fetchStatus, 10000);
    const sessionInterval = setInterval(fetchSessionStats, 30000);
    const maintenanceInterval = setInterval(fetchMaintenanceStatus, 15000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(sessionInterval);
      clearInterval(maintenanceInterval);
    };
  }, []);

  // Socket.IO connection for real-time log monitoring
  useEffect(() => {
    const socket = io('/admin', {
      path: '/socket.io/',
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[AdminHUD] Socket.IO connected');
      socket.emit('request-stats');
      socket.emit('request-buffer');
    });

    socket.on('log-alert', (logEntry: LogEntry) => {
      setLogIssues(prev => [...prev, logEntry]);
    });

    socket.on('log-stats', (stats: LogStats) => {
      setLogStats(stats);
    });

    socket.on('log-buffer', (buffer: LogEntry[]) => {
      setLogIssues(buffer);
    });

    socket.on('disconnect', () => {
      console.log('[AdminHUD] Socket.IO disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // OMAI always-on polling (connection check + health indicators)
  useEffect(() => {
    const pollOmai = async () => {
      try {
        await axios.get('/omai/status', { timeout: 5000 });
        setOmaiConnected(true);
      } catch {
        setOmaiConnected(false);
      }

      try {
        const res = await axios.get('/omai/briefing/health', { timeout: 5000 });
        if (res.data?.success) {
          setOmaiHealth(res.data.data);
        }
      } catch {
        // health fetch failed silently
      }
    };

    pollOmai();
    const interval = setInterval(pollOmai, 30000);
    return () => clearInterval(interval);
  }, []);

  // OMAI on-demand data fetching when tab changes
  const fetchOmaiTabData = useCallback(async (tab: number) => {
    try {
      if (tab === 0) {
        // Health tab - fetch today's briefing
        const res = await axios.get('/omai/briefing/today', { timeout: 5000 });
        if (res.data?.success) setOmaiBriefing(res.data.data);
      } else if (tab === 1) {
        // Tasks tab
        const [queueRes, statsRes] = await Promise.all([
          axios.get('/omai/tasks/queue?limit=10', { timeout: 5000 }),
          axios.get('/omai/tasks/stats', { timeout: 5000 }),
        ]);
        if (queueRes.data?.success) setOmaiTasks(queueRes.data.data);
        if (statsRes.data?.success) setOmaiTaskStats(statsRes.data.data);
      } else if (tab === 2) {
        // Logs tab
        const [summaryRes, patternsRes] = await Promise.all([
          axios.get('/omai/logs/summary', { timeout: 5000 }),
          axios.get('/omai/logs/patterns?hours=24', { timeout: 5000 }),
        ]);
        if (summaryRes.data?.success) setOmaiLogsSummary(summaryRes.data.data);
        if (patternsRes.data?.success) setOmaiLogPatterns(patternsRes.data.data.patterns || []);
      }
    } catch (err) {
      console.error('[AdminHUD] OMAI tab data fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    if (isExpanded) {
      fetchOmaiTabData(omaiTab);
    }
  }, [isExpanded, omaiTab, fetchOmaiTabData]);

  // Command handler for Tools tab
  const handleCommand = async () => {
    if (!commandInput.trim() || isCommandRunning) return;
    setIsCommandRunning(true);
    setCommandResult('Running...');

    const input = commandInput.trim();
    const parts = input.split(/\s+/);
    const action = parts[0].toLowerCase();
    const rest = parts.slice(1).join(' ');

    try {
      let res;
      switch (action) {
        case 'sql':
          res = await axios.get('/omai/db/query', { params: { sql: rest }, timeout: 15000 });
          break;
        case 'grep':
          const grepParts = rest.split(/\s+/);
          const pattern = grepParts[0] || '';
          const dir = grepParts[1] || '';
          res = await axios.get('/omai/search/grep', { params: { pattern, dir: dir || undefined }, timeout: 15000 });
          break;
        case 'preflight':
          res = await axios.get('/omai/deploy/preflight', { timeout: 15000 });
          break;
        case 'diff':
          res = await axios.get('/omai/deploy/diff', { timeout: 15000 });
          break;
        case 'tables':
          res = await axios.get('/omai/db/tables', { params: { database: rest || undefined }, timeout: 10000 });
          break;
        case 'schema':
          res = await axios.get(`/omai/db/schema/${rest}`, { timeout: 10000 });
          break;
        case 'health':
          res = await axios.get('/omai/briefing/health', { timeout: 5000 });
          break;
        case 'ocr':
          res = await axios.get('/omai/ocr/stats', { timeout: 10000 });
          break;
        case 'weekly':
          res = await axios.get('/omai/briefing/weekly', { timeout: 10000 });
          break;
        default:
          setCommandResult(`Unknown command: ${action}\nAvailable: sql, grep, preflight, diff, tables, schema, health, ocr, weekly`);
          setIsCommandRunning(false);
          return;
      }
      setCommandResult(JSON.stringify(res.data?.data || res.data, null, 2));
    } catch (err: any) {
      setCommandResult(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsCommandRunning(false);
    }
  };

  const handleClaimTask = async (taskId: number) => {
    try {
      await axios.post(`/omai/tasks/${taskId}/claim`);
      fetchOmaiTabData(1);
    } catch (err) {
      console.error('[AdminHUD] Task claim failed:', err);
    }
  };

  const handleArchiveLogs = async () => {
    setIsArchiving(true);
    try {
      const res = await axios.post('/api/admin/logs/archive', {
        logEntries: logIssues
      });

      if (res.data.success) {
        setLogIssues([]);
        setLogStats({ total: 0, errors: 0, warnings: 0, isMonitoring: logStats.isMonitoring });
        console.log(`[AdminHUD] Archived ${res.data.archived} logs to ${res.data.file}`);
      }
    } catch (err) {
      console.error('[AdminHUD] Failed to archive logs:', err);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!hudRef.current) return;

    const rect = hudRef.current.getBoundingClientRect();
    setOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - offset.x;
    const newY = e.clientY - offset.y;

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setTimeout(() => {
      setIsDragging(false);
    }, 50);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, offset]);

  const handleSyncTasks = async () => {
    try {
      await axios.post('/api/admin/sync-tasks');
      alert('Export to Sheets initiated');
    } catch (err) {
      console.error('Sync failed:', err);
      alert('Export failed - check console');
    }
  };

  const toggleMaintenanceMode = async (enable: boolean) => {
    setIsToggling(true);
    try {
      const res = await axios.post('/api/maintenance/toggle', { enabled: enable });
      setIsInMaintenance(res.data.enabled);
    } catch (err) {
      console.error('Failed to toggle maintenance mode:', err);
      alert('Failed to toggle maintenance mode');
    } finally {
      setIsToggling(false);
    }
  };

  if (!status) return null;

  // Show toggle button when hidden
  if (isHidden) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 80,
          right: 16,
          zIndex: 9999,
        }}
      >
        <Button
          onClick={() => setIsHidden(false)}
          variant="contained"
          size="small"
          sx={{
            minWidth: 'auto',
            px: 1.5,
            py: 0.5,
            fontSize: '10px',
            fontWeight: 700,
            backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#2563eb' : '#3b82f6',
            color: '#fff',
            textTransform: 'none',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1d4ed8' : '#2563eb',
            },
          }}
        >
          Show HUD
        </Button>
      </Box>
    );
  }

  const hudStyle = position.x !== 0 || position.y !== 0
    ? {
        left: position.x,
        top: position.y,
        right: 'auto',
        bottom: 'auto',
      }
    : {};

  const serviceCount = omaiHealth
    ? Object.values(omaiHealth.services).filter(s => s === 'active').length
    : 0;
  const serviceTotal = omaiHealth ? Object.keys(omaiHealth.services).length : 0;
  const errorCount = omaiHealth?.errors?.lastHour ?? 0;
  const queueCount = omaiTaskStats?.byStatus?.todo ?? 0;

  return (
    <DraggableHUD
      ref={hudRef}
      onMouseDown={handleMouseDown}
      sx={{
        ...hudStyle,
        width: isExpanded ? 560 : 280,
        border: (theme) => status.version_mismatch
          ? '2px solid #ef4444'
          : `2px solid ${theme.palette.mode === 'dark' ? '#3b82f6' : '#60a5fa'}`,
        backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1a1a2e' : '#ffffff',
        color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          pb: 1,
          mb: 2,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: '10px',
            color: (theme) => theme.palette.mode === 'dark' ? '#60a5fa' : '#3b82f6',
            letterSpacing: '0.5px',
          }}
        >
          SUPER ADMIN HUD
        </Typography>

        <Tooltip title="Hide HUD" arrow>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsHidden(true);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
              fontSize: '12px',
              opacity: 0.6,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
          >
            ✕
          </button>
        </Tooltip>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {/* Session Health Indicator */}
          {sessionStats && (
            <Tooltip
              title={
                sessionStats.ratio > LEAK_THRESHOLD
                  ? `Session Leak (${sessionStats.totalSessions}/${sessionStats.uniqueUsers} = ${sessionStats.ratio.toFixed(2)})`
                  : `Healthy (${sessionStats.totalSessions}/${sessionStats.uniqueUsers})`
              }
              arrow
              PopperProps={{
                sx: { zIndex: 10000 }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  bgcolor: sessionStats.ratio > LEAK_THRESHOLD
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(34, 197, 94, 0.2)',
                  cursor: 'help',
                }}
              >
                <Activity
                  size={12}
                  style={{
                    color: sessionStats.ratio > LEAK_THRESHOLD ? '#ef4444' : '#22c55e',
                  }}
                />
              </Box>
            </Tooltip>
          )}

          {/* LIVE/MAINT Status */}
          <Tooltip
            title={isInMaintenance ? 'Disable Maintenance' : 'Enable Maintenance'}
            arrow
            PopperProps={{
              sx: { zIndex: 10000 }
            }}
          >
            <button
              onClick={() => toggleMaintenanceMode(!isInMaintenance)}
              disabled={isToggling}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '9px',
                fontWeight: '600',
                letterSpacing: '0.5px',
                cursor: isToggling ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: isInMaintenance ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
                color: isInMaintenance ? '#f97316' : '#22c55e',
                border: `1.5px solid ${isInMaintenance ? 'rgba(249, 115, 22, 0.5)' : 'rgba(34, 197, 94, 0.4)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: isToggling ? 0.6 : 1,
              }}
            >
              <Wrench size={10} style={{ animation: isToggling || isInMaintenance ? 'spin 1s linear infinite' : 'none' }} />
              {isInMaintenance ? 'MAINT' : 'LIVE'}
            </button>
          </Tooltip>

          {status.version_mismatch && (
            <Chip
              label="MISMATCH"
              size="small"
              sx={{
                height: 16,
                fontSize: '8px',
                fontWeight: 700,
                backgroundColor: '#dc2626',
                color: '#fff',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }}
            />
          )}
        </Box>
      </Box>

      {/* Status Info + Backend Monitor + Actions */}
      <HudStatusBody
        status={status}
        logStats={logStats}
        isArchiving={isArchiving}
        onArchiveLogs={handleArchiveLogs}
        onSyncTasks={handleSyncTasks}
      />

      {/* OMAI Section */}
      <Box
        sx={{
          mt: 1.5,
          pt: 1.5,
          borderTop: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        }}
      >
        {/* OMAI compact bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: '10px',
                color: (theme) => theme.palette.mode === 'dark' ? '#a78bfa' : '#7c3aed',
                letterSpacing: '0.5px',
              }}
            >
              OMAI
            </Typography>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: omaiConnected ? '#22c55e' : '#ef4444',
                boxShadow: omaiConnected ? '0 0 6px rgba(34, 197, 94, 0.5)' : '0 0 6px rgba(239, 68, 68, 0.5)',
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {omaiConnected && omaiHealth && (
              <Typography variant="caption" sx={{ fontSize: '9px', color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                {serviceCount}/{serviceTotal} | Err: {errorCount} | Q: {queueCount}
              </Typography>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                borderRadius: '4px',
                cursor: 'pointer',
                padding: '2px 6px',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '9px',
                fontWeight: 600,
                color: '#7c3aed',
                transition: 'all 0.2s',
              }}
            >
              {isExpanded ? (
                <>
                  <ChevronDown size={10} />
                  <span>collapse</span>
                </>
              ) : (
                <>
                  <ChevronRight size={10} />
                  <span>expand</span>
                </>
              )}
            </button>
          </Box>
        </Box>

        {/* Expanded OMAI panel */}
        {isExpanded && omaiConnected && (
          <HudOmaiPanel
            omaiTab={omaiTab}
            onTabChange={setOmaiTab}
            omaiHealth={omaiHealth}
            omaiBriefing={omaiBriefing}
            omaiTasks={omaiTasks}
            omaiTaskStats={omaiTaskStats}
            omaiLogsSummary={omaiLogsSummary}
            omaiLogPatterns={omaiLogPatterns}
            commandInput={commandInput}
            commandResult={commandResult}
            isCommandRunning={isCommandRunning}
            onCommandInputChange={setCommandInput}
            onRunCommand={handleCommand}
            onClaimTask={handleClaimTask}
          />
        )}
        {isExpanded && !omaiConnected && (
          <Box sx={{ mt: 1, py: 1, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontSize: '10px', color: '#ef4444' }}>
              OMAI service unreachable
            </Typography>
          </Box>
        )}
      </Box>
    </DraggableHUD>
  );
};

export default AdminFloatingHUD;
