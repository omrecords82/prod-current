/**
 * HeaderBar.tsx — RefactorConsole header with title, health indicators,
 * source type chips, action buttons, and Phase 1 analysis controls.
 */

import { Box, Button, Chip, IconButton, Tooltip } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { Archive, History, RefreshCw, Settings } from '@/ui/icons';
import React from 'react';

interface HeaderBarProps {
  theme: Theme;
  activeMode: string;
  healthStatus: string;
  healthError: string | null;
  sourceType: string;
  selectedSnapshot: string | null;
  showPathConfig: boolean;
  setShowPathConfig: (v: boolean) => void;
  scanData: any;
  isLoading: boolean;
  phase1State: string;
  phase1Progress: number;
  phase1CurrentStep: string | null;
  phase1Error: string | null;
  handlePhase1Analysis: () => void;
  handleRefresh: () => void;
  setShowHistoryViewer: (v: boolean) => void;
}

const HeaderBar: React.FC<HeaderBarProps> = ({
  theme, activeMode, healthStatus, healthError, sourceType, selectedSnapshot,
  showPathConfig, setShowPathConfig, scanData, isLoading,
  phase1State, phase1Progress, phase1CurrentStep, phase1Error,
  handlePhase1Analysis, handleRefresh, setShowHistoryViewer,
}) => (
  <Box
    sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}
    className="border-b"
  >
    <Box sx={{ px: 3, py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <h1 className="text-2xl font-bold" style={{ color: theme.palette.text.primary }}>Refactor Console</h1>
            {import.meta.env.DEV && (
              <Box sx={{
                fontSize: '0.75rem', px: 1, py: 0.5, bgcolor: 'action.hover',
                color: theme.palette.text.secondary, borderRadius: 1, fontFamily: 'monospace',
              }}>
                {activeMode} {document.documentElement.classList.contains('dark') ? '✓' : '✗'}
              </Box>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {healthStatus === 'checking' && (
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'warning.main', animation: 'pulse 2s infinite' }} title="Checking connection..." />
              )}
              {healthStatus === 'ok' && (
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main' }} title="API connection healthy" />
              )}
              {healthStatus === 'error' && (
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'error.main', cursor: 'help' }} title={healthError || 'API connection failed'} />
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
            <p style={{ color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.text.secondary, margin: 0 }}>
              Analyze your codebase for duplicates, usage patterns, and refactoring opportunities
            </p>
            <Tooltip title="Configure source and destination paths">
              <IconButton
                size="small"
                onClick={() => setShowPathConfig(!showPathConfig)}
                sx={{
                  color: showPathConfig ? theme.palette.primary.main : theme.palette.text.secondary,
                  bgcolor: showPathConfig ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                }}
              >
                <Settings className="w-4 h-4" />
              </IconButton>
            </Tooltip>
            <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
              <Chip label={sourceType === 'local' ? 'Local' : 'Remote'} size="small" color={sourceType === 'remote' ? 'secondary' : 'default'} sx={{ height: 20, fontSize: '0.7rem' }} />
              {selectedSnapshot && (
                <Chip label={`📅 ${selectedSnapshot}`} size="small" color="primary" sx={{ height: 20, fontSize: '0.7rem' }} />
              )}
            </Box>
          </Box>
          {healthStatus === 'error' && healthError && (
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: theme.palette.error.main }}>
              ⚠️ {healthError}
            </p>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {scanData && (
            <Box sx={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', color: theme.palette.text.secondary }}>Last scan</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: theme.palette.text.primary }}>
                {new Date(scanData.generatedAt).toLocaleString()}
              </div>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={() => setShowHistoryViewer(true)} startIcon={<History className="w-4 h-4" />} sx={{ textTransform: 'none' }} title="View restore history">
              History
            </Button>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
              <Button
                variant="contained" color="primary" onClick={handlePhase1Analysis}
                disabled={phase1State === 'running' || phase1State === 'starting' || healthStatus !== 'ok'}
                startIcon={<Archive className={`w-4 h-4 ${(phase1State === 'running' || phase1State === 'starting') ? 'animate-spin' : ''}`} />}
                sx={{ textTransform: 'none' }}
                title={healthStatus !== 'ok' ? 'Please wait for API health check' : phase1State === 'running' || phase1State === 'starting' ? 'Phase 1 analysis in progress' : 'Phase 1: Discovery & Gap Analysis'}
              >
                Phase 1 Analysis
              </Button>
              {(phase1State === 'running' || phase1State === 'starting') && (
                <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', width: '100%' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span>{phase1CurrentStep || 'Processing...'}</span>
                    <span>{phase1Progress}%</span>
                  </div>
                  <Box sx={{ width: '100%', bgcolor: 'action.hover', borderRadius: '9999px', height: 6 }}>
                    <Box sx={{ bgcolor: theme.palette.secondary.main, height: 6, borderRadius: '9999px', transition: 'width 0.3s' }} style={{ width: `${phase1Progress}%` }} />
                  </Box>
                </Box>
              )}
              {phase1State === 'error' && phase1Error && (
                <Box sx={{ fontSize: '0.75rem', color: 'error.main', width: '100%' }}>
                  Error: {phase1Error}
                </Box>
              )}
            </Box>
          </Box>

          <Button
            variant="contained" color="primary" onClick={handleRefresh} disabled={isLoading}
            startIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
            sx={{ textTransform: 'none', fontWeight: 500, px: 2, py: 1 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>
    </Box>
  </Box>
);

export default HeaderBar;
