/**
 * HudStatusBody — Status Info, Backend Monitor, and Actions sections
 * for the Admin Floating HUD.
 * Extracted from AdminFloatingHUD.tsx
 */
import React from 'react';
import { Box, Button, Tooltip, Typography } from '@mui/material';
import { AlertCircle } from 'lucide-react';
import type { SystemStatus, LogStats } from './adminHudTypes';

interface HudStatusBodyProps {
  status: SystemStatus;
  logStats: LogStats;
  isArchiving: boolean;
  onArchiveLogs: () => void;
  onSyncTasks: () => void;
}

const HudStatusBody: React.FC<HudStatusBodyProps> = ({
  status,
  logStats,
  isArchiving,
  onArchiveLogs,
  onSyncTasks,
}) => {
  return (
    <>
      {/* Status Info */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', fontSize: '11px' }}>
            Ver:
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 500, color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b' }}>
            {status.version_string || 'N/A'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', fontSize: '11px' }}>
            SHA:
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '9px',
              fontFamily: 'monospace',
              color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#475569',
            }}
          >
            {status.last_git_sha?.substring(0, 8) || 'N/A'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', fontSize: '11px' }}>
            Churches:
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#22c55e',
            }}
          >
            {status.church_count || 0}
          </Typography>
        </Box>

        {status.environment && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b', fontSize: '11px' }}>
              Env:
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '11px', fontWeight: 500, color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#1e293b' }}>
              {status.environment}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Backend Monitor */}
      <Box sx={{
        mb: 2,
        pt: 1.5,
        borderTop: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
      }}>
        <Typography
          variant="caption"
          sx={{
            color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
            fontSize: '10px',
            fontWeight: 600,
            mb: 1,
            display: 'block'
          }}
        >
          BACKEND MONITOR
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {/* orthodox-backend Status Pill */}
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 0.5,
              borderRadius: '12px',
              background: logStats.isMonitoring
                ? 'linear-gradient(135deg, #1ED760 0%, #17b350 100%)'
                : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 600,
              flex: 1,
            }}
          >
            <span>orthodox-backend</span>

            {/* Floating Counter Badge */}
            {logStats.total > 0 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  bgcolor: '#17b350',
                  border: '2px solid #fff',
                  borderRadius: '10px',
                  px: 0.75,
                  py: 0.25,
                  fontSize: '9px',
                  fontWeight: 700,
                  minWidth: '18px',
                  textAlign: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                {logStats.total}
              </Box>
            )}
          </Box>

          {/* Archive Button */}
          <Tooltip title="Archive logs to file" arrow>
            <button
              onClick={onArchiveLogs}
              disabled={isArchiving || logStats.total === 0}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                cursor: isArchiving || logStats.total === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: 'transparent',
                color: '#64748b',
                border: '1px solid rgba(100, 116, 139, 0.3)',
                opacity: isArchiving || logStats.total === 0 ? 0.5 : 1,
              }}
            >
              {isArchiving ? '...' : 'ARCHIVE'}
            </button>
          </Tooltip>
        </Box>

        {/* Error/Warning Stats */}
        {logStats.total > 0 && (
          <Box sx={{ display: 'flex', gap: 1, fontSize: '10px' }}>
            {logStats.errors > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AlertCircle size={12} style={{ color: '#ef4444' }} />
                <Typography variant="caption" sx={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>
                  {logStats.errors} error{logStats.errors !== 1 ? 's' : ''}
                </Typography>
              </Box>
            )}
            {logStats.warnings > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AlertCircle size={12} style={{ color: '#f59e0b' }} />
                <Typography variant="caption" sx={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>
                  {logStats.warnings} warning{logStats.warnings !== 1 ? 's' : ''}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Actions */}
      <Box sx={{ pt: 1.5, borderTop: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` }}>
        <Button
          onClick={onSyncTasks}
          fullWidth
          variant="contained"
          size="small"
          sx={{
            py: 0.5,
            fontSize: '10px',
            fontWeight: 700,
            backgroundColor: '#2563eb',
            color: '#fff',
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: '#1d4ed8',
              boxShadow: 'none',
            },
          }}
        >
          EXPORT TO SHEETS
        </Button>
      </Box>
    </>
  );
};

export default HudStatusBody;
