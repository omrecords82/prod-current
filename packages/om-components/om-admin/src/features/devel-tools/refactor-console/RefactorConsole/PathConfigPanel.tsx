import React from 'react';
import { Box, Button, Chip, CircularProgress, Collapse, Paper, TextField } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { Check, FolderOpen } from '@/ui/icons';
import type { PathConfig } from '../api/refactorConsoleClient';

interface PathValidation {
  sourcePath?: { isValid: boolean; exists: boolean; error?: string };
  destinationPath?: { isValid: boolean; exists: boolean; error?: string };
  backupPath?: { isValid: boolean; exists: boolean; error?: string };
}

interface PathConfigPanelProps {
  open: boolean;
  theme: Theme;
  pathConfig: PathConfig;
  onPathConfigChange: (updater: (prev: PathConfig) => PathConfig) => void;
  pathValidation: PathValidation;
  isValidatingPaths: boolean;
  onSavePaths: () => void;
  onResetPaths: () => void;
  sourceType: 'local' | 'remote';
  onSourceTypeChange: (type: 'local' | 'remote') => void;
  selectedSnapshot: string | null;
  onSnapshotChange: (id: string | null) => void;
  isLoadingSnapshots: boolean;
  availableSnapshots: any[];
  snapshotError: string | null;
}

const PathConfigPanel: React.FC<PathConfigPanelProps> = ({
  open,
  theme,
  pathConfig,
  onPathConfigChange,
  pathValidation,
  isValidatingPaths,
  onSavePaths,
  onResetPaths,
  sourceType,
  onSourceTypeChange,
  selectedSnapshot,
  onSnapshotChange,
  isLoadingSnapshots,
  availableSnapshots,
  snapshotError,
}) => (
  <Collapse in={open}>
    <Paper
      elevation={0}
      sx={{
        mx: 3,
        mt: 2,
        p: 2,
        bgcolor: alpha(theme.palette.primary.main, 0.05),
        border: 1,
        borderColor: alpha(theme.palette.primary.main, 0.2),
        borderRadius: 1
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderOpen className="w-5 h-5" style={{ color: theme.palette.primary.main }} />
          <h3 style={{ fontWeight: 600, color: theme.palette.text.primary, margin: 0 }}>
            Path Configuration
          </h3>
          <Chip
            label="Persisted in localStorage"
            size="small"
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={onResetPaths}
            sx={{ textTransform: 'none' }}
          >
            Reset to Defaults
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={onSavePaths}
            disabled={isValidatingPaths}
            startIcon={isValidatingPaths ? <CircularProgress size={14} /> : <Check className="w-4 h-4" />}
            sx={{ textTransform: 'none' }}
          >
            {isValidatingPaths ? 'Validating...' : 'Save & Validate'}
          </Button>
        </Box>
      </Box>

      {/* Source Type & Snapshot Selection */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, mb: 2 }}>
        {/* Source Type Toggle */}
        <Box>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: theme.palette.text.primary,
            marginBottom: '0.5rem'
          }}>
            Source Type
          </label>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={sourceType === 'local' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => onSourceTypeChange('local')}
              sx={{ flex: 1, textTransform: 'none' }}
            >
              Local File System
            </Button>
            <Button
              variant={sourceType === 'remote' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => onSourceTypeChange('remote')}
              sx={{ flex: 1, textTransform: 'none' }}
              color="secondary"
            >
              Remote Samba
            </Button>
          </Box>
          <Box sx={{ fontSize: '0.75rem', color: theme.palette.mode === 'dark' ? theme.palette.grey[400] : 'text.secondary', mt: 0.5 }}>
            {sourceType === 'local' ? 'Using local production files' : 'Using remote Samba mount (192.168.1.221)'}
          </Box>
        </Box>

        {/* Snapshot Selection */}
        <Box>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: theme.palette.text.primary,
            marginBottom: '0.5rem'
          }}>
            Snapshot (MM-YYYY)
          </label>
          <TextField
            select
            fullWidth
            size="small"
            value={selectedSnapshot || ''}
            onChange={(e) => onSnapshotChange(e.target.value || null)}
            disabled={isLoadingSnapshots || availableSnapshots.length === 0}
            helperText={
              isLoadingSnapshots ? 'Loading snapshots...' :
              snapshotError ? `Error: ${snapshotError}` :
              availableSnapshots.length === 0 ? 'No snapshots available' :
              selectedSnapshot ? `Selected: ${availableSnapshots.find(s => s.id === selectedSnapshot)?.label || selectedSnapshot}` :
              'Select a snapshot to scan'
            }
            error={!!snapshotError}
            SelectProps={{
              displayEmpty: true
            }}
          >
            <option value="">Current / Latest</option>
            {availableSnapshots.map((snapshot) => (
              <option key={snapshot.id} value={snapshot.id}>
                {snapshot.label} ({snapshot.id})
              </option>
            ))}
          </TextField>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {/* Source Path */}
        <Box>
          <TextField
            fullWidth
            size="small"
            label="Source Directory"
            placeholder="/var/www/orthodoxmetrics/prod/refactor-src/"
            value={pathConfig.sourcePath}
            onChange={(e) => onPathConfigChange(prev => ({ ...prev, sourcePath: e.target.value }))}
            helperText={
              pathValidation.sourcePath?.error ||
              (pathValidation.sourcePath?.isValid
                ? (pathValidation.sourcePath.exists ? '✓ Valid & exists' : '⚠ Valid but does not exist')
                : 'Directory containing files to restore from')
            }
            error={pathValidation.sourcePath?.isValid === false}
            InputProps={{
              sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
              endAdornment: pathValidation.sourcePath?.isValid && (
                <Check className="w-4 h-4" style={{ color: theme.palette.success.main }} />
              )
            }}
          />
        </Box>

        {/* Destination Path */}
        <Box>
          <TextField
            fullWidth
            size="small"
            label="Destination Directory"
            placeholder="/var/www/orthodoxmetrics/prod/front-end/src/"
            value={pathConfig.destinationPath}
            onChange={(e) => onPathConfigChange(prev => ({ ...prev, destinationPath: e.target.value }))}
            helperText={
              pathValidation.destinationPath?.error ||
              (pathValidation.destinationPath?.isValid
                ? (pathValidation.destinationPath.exists ? '✓ Valid & exists' : '⚠ Valid but does not exist')
                : 'Directory where files will be restored to')
            }
            error={pathValidation.destinationPath?.isValid === false}
            InputProps={{
              sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
              endAdornment: pathValidation.destinationPath?.isValid && (
                <Check className="w-4 h-4" style={{ color: theme.palette.success.main }} />
              )
            }}
          />
        </Box>

        {/* Backup Path */}
        <Box>
          <TextField
            fullWidth
            size="small"
            label="Backup Directory (for Gap Analysis)"
            placeholder="/var/www/orthodoxmetrics/backup"
            value={pathConfig.backupPath || ''}
            onChange={(e) => onPathConfigChange(prev => ({ ...prev, backupPath: e.target.value }))}
            helperText={
              pathValidation.backupPath?.error ||
              (pathValidation.backupPath?.isValid
                ? (pathValidation.backupPath.exists ? '✓ Valid & exists' : '⚠ Valid but does not exist')
                : 'September 2025 backup location for recovery')
            }
            error={pathValidation.backupPath?.isValid === false}
            InputProps={{
              sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
              endAdornment: pathValidation.backupPath?.isValid && (
                <Check className="w-4 h-4" style={{ color: theme.palette.success.main }} />
              )
            }}
          />
        </Box>
      </Box>

      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
        <p style={{ fontSize: '0.75rem', color: theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.text.secondary, margin: 0 }}>
          <strong>Security:</strong> All paths must be within <code style={{
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            padding: '0 4px',
            borderRadius: 2
          }}>/var/www/orthodoxmetrics/</code>.
          Path traversal and shell injection are blocked.
        </p>
      </Box>
    </Paper>
  </Collapse>
);

export default PathConfigPanel;
