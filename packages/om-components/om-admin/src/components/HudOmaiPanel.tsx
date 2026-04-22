/**
 * HudOmaiPanel — 4-tab OMAI panel (Health, Tasks, Logs, Tools)
 * for the Admin Floating HUD.
 * Extracted from AdminFloatingHUD.tsx
 */
import React from 'react';
import { Box, Button, Chip, Tab, Tabs, TextField, Typography } from '@mui/material';
import type {
  OmaiHealth,
  OmaiBriefing,
  OmaiTaskItem,
  OmaiTaskStats,
  OmaiLogsSummary,
  OmaiLogPattern,
} from './adminHudTypes';
import { priorityColor } from './adminHudTypes';

interface HudOmaiPanelProps {
  omaiTab: number;
  onTabChange: (tab: number) => void;
  omaiHealth: OmaiHealth | null;
  omaiBriefing: OmaiBriefing | null;
  omaiTasks: OmaiTaskItem[];
  omaiTaskStats: OmaiTaskStats | null;
  omaiLogsSummary: OmaiLogsSummary | null;
  omaiLogPatterns: OmaiLogPattern[];
  commandInput: string;
  commandResult: string;
  isCommandRunning: boolean;
  onCommandInputChange: (val: string) => void;
  onRunCommand: () => void;
  onClaimTask: (taskId: number) => void;
}

const HudOmaiPanel: React.FC<HudOmaiPanelProps> = ({
  omaiTab,
  onTabChange,
  omaiHealth,
  omaiBriefing,
  omaiTasks,
  omaiTaskStats,
  omaiLogsSummary,
  omaiLogPatterns,
  commandInput,
  commandResult,
  isCommandRunning,
  onCommandInputChange,
  onRunCommand,
  onClaimTask,
}) => {
  return (
    <Box sx={{ mt: 1.5 }}>
      <Tabs
        value={omaiTab}
        onChange={(_, v) => onTabChange(v)}
        variant="fullWidth"
        sx={{
          minHeight: 28,
          '& .MuiTab-root': {
            minHeight: 28,
            fontSize: '9px',
            fontWeight: 600,
            textTransform: 'none',
            py: 0.5,
            px: 1,
            color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
          },
          '& .Mui-selected': {
            color: '#3b82f6 !important',
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#3b82f6',
            height: 2,
          },
        }}
      >
        <Tab label="Health" />
        <Tab label="Tasks" />
        <Tab label="Logs" />
        <Tab label="Tools" />
      </Tabs>

      <Box sx={{ mt: 1.5, maxHeight: 350, overflowY: 'auto', pr: 0.5 }}>
        {/* Health Tab */}
        {omaiTab === 0 && (
          <Box>
            {/* Overall status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                System:
              </Typography>
              <Chip
                label={(omaiHealth?.overall || 'unknown').toUpperCase()}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '9px',
                  fontWeight: 700,
                  backgroundColor: omaiHealth?.overall === 'healthy' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: omaiHealth?.overall === 'healthy' ? '#22c55e' : '#ef4444',
                }}
              />
            </Box>

            {/* Services */}
            {omaiHealth?.services && (
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', display: 'block', mb: 0.5 }}>
                  Services:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {Object.entries(omaiHealth.services).map(([name, s]) => (
                    <Typography key={name} variant="caption" sx={{ fontSize: '10px', color: s === 'active' ? '#22c55e' : '#ef4444' }}>
                      {name} {s === 'active' ? '\u2713' : '\u2717'}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}

            {/* Disk & Memory */}
            {omaiHealth?.disk && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                  Disk:
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#1e293b' }}>
                  {omaiHealth.disk.percent} ({omaiHealth.disk.avail} free)
                </Typography>
              </Box>
            )}
            {omaiHealth?.memory && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                  Memory:
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#1e293b' }}>
                  {(Number(omaiHealth.memory.availableMB) / 1024).toFixed(1)}GB avail
                </Typography>
              </Box>
            )}

            {/* Errors */}
            {omaiHealth?.errors && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                  Errors:
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '10px', color: omaiHealth.errors.lastHour > 0 ? '#ef4444' : '#22c55e' }}>
                  {omaiHealth.errors.lastHour} (1h) / {omaiHealth.errors.last24h} (24h)
                </Typography>
              </Box>
            )}

            {/* Today's briefing */}
            {omaiBriefing?.summary && (
              <Box sx={{ mt: 1, pt: 1, borderTop: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', display: 'block', mb: 0.5 }}>
                  Today:
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#1e293b' }}>
                  {omaiBriefing.summary.commits} commits, {omaiBriefing.summary.tasksCreated} tasks, {omaiBriefing.summary.errorsToday} errors
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Tasks Tab */}
        {omaiTab === 1 && (
          <Box>
            {/* Stats row */}
            {omaiTaskStats && (
              <Box sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 0.5 }}>
                  {Object.entries(omaiTaskStats.byStatus).map(([s, count]) => (
                    <Typography key={s} variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#1e293b' }}>
                      <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{s}:</span> {count}
                    </Typography>
                  ))}
                </Box>
                <Typography variant="caption" sx={{ fontSize: '10px', color: '#94a3b8' }}>
                  Completed (7d): {omaiTaskStats.completedLast7Days}
                </Typography>
              </Box>
            )}

            {/* Queue */}
            <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 700, color: (theme) => theme.palette.mode === 'dark' ? '#60a5fa' : '#3b82f6', display: 'block', mb: 1 }}>
              QUEUE (TOP 10)
            </Typography>
            {omaiTasks.length === 0 && (
              <Typography variant="caption" sx={{ fontSize: '10px', color: '#94a3b8' }}>No tasks in queue</Typography>
            )}
            {omaiTasks.map((task) => (
              <Box
                key={task.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  mb: 0.75,
                  py: 0.5,
                  px: 0.75,
                  borderRadius: 1,
                  backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                }}
              >
                <Chip
                  label={task.priority}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: '8px',
                    fontWeight: 700,
                    backgroundColor: `${priorityColor(task.priority)}22`,
                    color: priorityColor(task.priority),
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '9px',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#1e293b',
                  }}
                >
                  {task.title}
                </Typography>
                {!task.assigned_to && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onClaimTask(task.id); }}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      color: '#3b82f6',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      flexShrink: 0,
                    }}
                  >
                    Claim
                  </button>
                )}
              </Box>
            ))}
          </Box>
        )}

        {/* Logs Tab */}
        {omaiTab === 2 && (
          <Box>
            {omaiLogsSummary && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                    Status:
                  </Typography>
                  <Chip
                    label={omaiLogsSummary.status.toUpperCase()}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '9px',
                      fontWeight: 700,
                      backgroundColor: omaiLogsSummary.status === 'healthy' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: omaiLogsSummary.status === 'healthy' ? '#22c55e' : '#ef4444',
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ fontSize: '10px', color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#1e293b', display: 'block', mb: 1 }}>
                  24h: {omaiLogsSummary.last24h.total_24h} total / {omaiLogsSummary.last24h.errors_24h} errors / {omaiLogsSummary.last24h.warnings_24h} warnings
                </Typography>
              </>
            )}

            {/* Patterns */}
            <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 700, color: (theme) => theme.palette.mode === 'dark' ? '#60a5fa' : '#3b82f6', display: 'block', mb: 1 }}>
              RECURRING PATTERNS
            </Typography>
            {omaiLogPatterns.length === 0 && (
              <Typography variant="caption" sx={{ fontSize: '10px', color: '#94a3b8' }}>No recurring patterns detected</Typography>
            )}
            {omaiLogPatterns.map((p, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontSize: '9px', color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#1e293b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.pattern}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '9px', color: '#94a3b8', flexShrink: 0, ml: 1 }}>
                  x{p.count}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Tools Tab */}
        {omaiTab === 3 && (
          <Box>
            <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
              <TextField
                value={commandInput}
                onChange={(e) => onCommandInputChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onRunCommand(); }}
                placeholder="sql SELECT ... | grep pattern"
                size="small"
                variant="outlined"
                fullWidth
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '10px',
                    height: 28,
                    color: (theme) => theme.palette.mode === 'dark' ? '#fff' : '#1e293b',
                    '& fieldset': {
                      borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '4px 8px',
                    cursor: 'text',
                  },
                }}
              />
              <Button
                onClick={(e) => { e.stopPropagation(); onRunCommand(); }}
                disabled={isCommandRunning || !commandInput.trim()}
                size="small"
                variant="contained"
                sx={{
                  minWidth: 40,
                  height: 28,
                  fontSize: '9px',
                  fontWeight: 700,
                  backgroundColor: '#2563eb',
                  textTransform: 'none',
                  px: 1,
                }}
              >
                {isCommandRunning ? '...' : 'Run'}
              </Button>
            </Box>

            {/* Quick buttons */}
            <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
              {[
                { label: 'health', cmd: 'health' },
                { label: 'preflight', cmd: 'preflight' },
                { label: 'diff', cmd: 'diff' },
                { label: 'tables', cmd: 'tables' },
                { label: 'ocr', cmd: 'ocr' },
                { label: 'weekly', cmd: 'weekly' },
              ].map((btn) => (
                <button
                  key={btn.cmd}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCommandInputChange(btn.cmd);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onCommandInputChange(btn.cmd);
                  }}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                    color: '#60a5fa',
                    border: '1px solid rgba(96, 165, 250, 0.3)',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </Box>

            {/* Result area */}
            {commandResult && (
              <Box
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                sx={{
                  maxHeight: 250,
                  overflowY: 'auto',
                  backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                  borderRadius: 1,
                  p: 1,
                  cursor: 'text',
                  userSelect: 'text',
                }}
              >
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{
                    fontSize: '9px',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    color: (theme) => theme.palette.mode === 'dark' ? '#e2e8f0' : '#334155',
                    margin: 0,
                  }}
                >
                  {commandResult}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default HudOmaiPanel;
