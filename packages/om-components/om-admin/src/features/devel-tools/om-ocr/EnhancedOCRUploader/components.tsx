import React from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  alpha,
  useTheme,
  Button,
} from '@mui/material';
import {
  IconX,
  IconCheck,
  IconAlertCircle,
  IconPhoto,
  IconClock,
  IconRotateClockwise,
} from '@tabler/icons-react';
import type { UploadFile } from './types';

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const StatusBadge: React.FC<{ status: UploadFile['status'] }> = ({ status }) => {
  const theme = useTheme();

  const config = {
    queued: { label: 'Queued', color: theme.palette.grey[500], icon: <IconClock size={14} /> },
    uploading: { label: 'Uploading', color: theme.palette.info.main, icon: <CircularProgress size={14} sx={{ color: 'inherit' }} /> },
    processing: { label: 'Processing', color: theme.palette.warning.main, icon: <CircularProgress size={14} sx={{ color: 'inherit' }} /> },
    complete: { label: 'Complete', color: theme.palette.success.main, icon: <IconCheck size={14} /> },
    error: { label: 'Error', color: theme.palette.error.main, icon: <IconAlertCircle size={14} /> }
  };

  const { label, color, icon } = config[status];

  return (
    <Chip
      size="small"
      label={label}
      icon={<Box sx={{ display: 'flex', color: 'inherit' }}>{icon}</Box>}
      sx={{
        bgcolor: alpha(color, 0.1),
        color: color,
        borderColor: alpha(color, 0.3),
        border: '1px solid',
        fontWeight: 500,
        fontSize: '0.75rem',
        '& .MuiChip-icon': { color: 'inherit' }
      }}
    />
  );
};

export const RecordTypeBadge: React.FC<{ type: 'baptism' | 'marriage' | 'funeral' }> = ({ type }) => {
  const theme = useTheme();

  const colors = {
    baptism: theme.palette.primary.main,
    marriage: '#9c27b0',
    funeral: theme.palette.grey[700]
  };

  return (
    <Chip
      size="small"
      label={type.charAt(0).toUpperCase() + type.slice(1)}
      sx={{
        bgcolor: alpha(colors[type], 0.1),
        color: colors[type],
        fontWeight: 600,
        fontSize: '0.7rem',
        textTransform: 'capitalize'
      }}
    />
  );
};

export const FileCard: React.FC<{
  file: UploadFile;
  isSelected?: boolean;
  onRecordTypeChange: (id: string, type: 'baptism' | 'marriage' | 'funeral') => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onSelect?: (id: string) => void;
}> = ({ file, isSelected, onRecordTypeChange, onRemove, onRetry, onSelect }) => {
  const theme = useTheme();
  const isClickable = file.status === 'complete' && onSelect;

  return (
    <Paper
      elevation={0}
      onClick={() => isClickable && onSelect(file.id)}
      sx={{
        p: 2,
        mb: 1.5,
        border: '2px solid',
        borderColor: isSelected ? 'primary.main' : file.status === 'error' ? 'error.light' : 'divider',
        borderRadius: 2,
        bgcolor: isSelected
          ? alpha(theme.palette.primary.main, 0.05)
          : file.status === 'error'
            ? alpha(theme.palette.error.main, 0.02)
            : 'background.paper',
        transition: 'all 0.2s ease',
        cursor: isClickable ? 'pointer' : 'default',
        '&:hover': {
          boxShadow: theme.shadows[2],
          borderColor: isSelected ? 'primary.dark' : file.status === 'error' ? 'error.main' : 'primary.light'
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        {/* Thumbnail */}
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 1.5,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          {file.thumbnail ? (
            <img src={file.thumbnail} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <IconPhoto size={24} color={theme.palette.grey[400]} />
          )}
        </Box>

        {/* File Info */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap title={file.name}>
            {file.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatFileSize(file.size)}
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center" flexWrap="wrap">
            <RecordTypeBadge type={file.recordType} />
            {file.isSimulation && (
              <Chip
                label="SIMULATION"
                size="small"
                color="info"
                sx={{ fontSize: '0.7rem', height: 20, fontWeight: 600 }}
              />
            )}
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={file.recordType}
                onChange={(e) => onRecordTypeChange(file.id, e.target.value as any)}
                disabled={file.status !== 'queued'}
                sx={{
                  height: 28,
                  fontSize: '0.75rem',
                  '& .MuiSelect-select': { py: 0.5 }
                }}
              >
                <MenuItem value="baptism">Baptism</MenuItem>
                <MenuItem value="marriage">Marriage</MenuItem>
                <MenuItem value="funeral">Funeral</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* Progress Bar */}
          {(file.status === 'uploading' || file.status === 'processing') && (
            <Box sx={{ mt: 1.5 }}>
              <LinearProgress
                variant="determinate"
                value={file.progress}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    transition: 'transform 0.3s ease'
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {file.progress}%
              </Typography>
            </Box>
          )}

          {/* Error Message */}
          {file.status === 'error' && file.error && (
            <Alert
              severity="error"
              sx={{ mt: 1, py: 0, '& .MuiAlert-message': { fontSize: '0.75rem' } }}
              action={
                <Button size="small" onClick={() => onRetry(file.id)} startIcon={<IconRotateClockwise size={14} />}>
                  Retry
                </Button>
              }
            >
              {file.error}
            </Alert>
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <StatusBadge status={file.status} />
          <IconButton
            size="small"
            onClick={() => onRemove(file.id)}
            disabled={file.status === 'uploading' || file.status === 'processing'}
            sx={{ color: 'text.secondary' }}
          >
            <IconX size={18} />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

export const BatchProgress: React.FC<{
  total: number;
  completed: number;
  processing: boolean;
}> = ({ total, completed, processing }) => {
  const theme = useTheme();
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        {processing && (
          <CircularProgress size={20} sx={{ color: 'primary.main' }} />
        )}
        <Typography variant="subtitle2" fontWeight={600}>
          Batch Progress
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
          {completed} of {total}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          mt: 1.5,
          height: 10,
          borderRadius: 5,
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          '& .MuiLinearProgress-bar': {
            borderRadius: 5,
            background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
          }
        }}
      />
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {completed} images processed
        </Typography>
        <Typography variant="caption" color="primary.main" fontWeight={600}>
          {percentage}%
        </Typography>
      </Stack>
    </Paper>
  );
};
