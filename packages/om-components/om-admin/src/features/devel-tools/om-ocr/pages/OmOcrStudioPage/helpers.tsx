import React from 'react';
import {
  Box,
  Chip,
  Collapse,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import type { StepStatus, StepDef, StepCardProps } from './types';

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const uid = () => Math.random().toString(36).slice(2, 11);

export const StatusPill: React.FC<{ status: StepStatus }> = ({ status }) => {
  const theme = useTheme();
  const map: Record<StepStatus, { label: string; color: string; bg: string }> = {
    not_started: {
      label: 'Not Started',
      color: theme.palette.text.secondary,
      bg: alpha(theme.palette.text.secondary, 0.08),
    },
    in_progress: {
      label: 'In Progress',
      color: theme.palette.info.main,
      bg: alpha(theme.palette.info.main, 0.1),
    },
    completed: {
      label: 'Completed',
      color: theme.palette.success.main,
      bg: alpha(theme.palette.success.main, 0.1),
    },
  };
  const { label, color, bg } = map[status];
  return (
    <Chip
      size="small"
      icon={
        status === 'completed' ? (
          <IconCheck size={14} style={{ color }} />
        ) : status === 'in_progress' ? (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: color,
              ml: 0.5,
            }}
          />
        ) : undefined
      }
      label={label}
      sx={{
        bgcolor: bg,
        color,
        fontWeight: 600,
        fontSize: '0.7rem',
        border: 'none',
        '& .MuiChip-icon': { color },
      }}
    />
  );
};

export const StepCircle: React.FC<{ step: number; status: StepStatus }> = ({ step, status }) => {
  const theme = useTheme();
  const isComplete = status === 'completed';
  const isActive = status === 'in_progress';

  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        bgcolor: isComplete
          ? theme.palette.success.main
          : isActive
          ? theme.palette.primary.main
          : alpha(theme.palette.text.primary, 0.08),
        color: isComplete || isActive
          ? theme.palette.common.white
          : theme.palette.text.secondary,
        fontWeight: 700,
        fontSize: '0.95rem',
        transition: 'all 0.3s ease',
      }}
    >
      {isComplete ? <IconCheck size={20} /> : step}
    </Box>
  );
};

export const StepperHeader: React.FC<{ steps: StepDef[] }> = ({ steps }) => {
  const theme = useTheme();
  return (
    <Stack direction="row" alignItems="center" justifyContent="center" spacing={0} sx={{ py: 3 }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <Stack alignItems="center" spacing={0.5} sx={{ minWidth: 120 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor:
                  s.status === 'completed'
                    ? theme.palette.success.main
                    : s.status === 'in_progress'
                    ? theme.palette.primary.main
                    : alpha(theme.palette.text.primary, 0.08),
                color:
                  s.status === 'completed' || s.status === 'in_progress'
                    ? theme.palette.common.white
                    : theme.palette.text.disabled,
                fontWeight: 700,
                fontSize: '0.85rem',
                border: s.status === 'in_progress' ? `2px solid ${theme.palette.primary.main}` : 'none',
                boxShadow:
                  s.status === 'in_progress'
                    ? `0 0 0 4px ${alpha(theme.palette.primary.main, 0.2)}`
                    : 'none',
                transition: 'all 0.3s ease',
              }}
            >
              {s.status === 'completed' ? <IconCheck size={18} /> : i + 1}
            </Box>
            <Typography
              variant="caption"
              fontWeight={s.status === 'in_progress' ? 700 : 500}
              sx={{
                color:
                  s.status === 'in_progress'
                    ? theme.palette.primary.main
                    : s.status === 'completed'
                    ? theme.palette.success.main
                    : theme.palette.text.secondary,
                textAlign: 'center',
              }}
            >
              {s.label}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color:
                  s.status === 'in_progress'
                    ? theme.palette.primary.main
                    : s.status === 'completed'
                    ? theme.palette.success.main
                    : theme.palette.text.disabled,
                fontSize: '0.65rem',
              }}
            >
              {s.status === 'completed'
                ? 'Completed'
                : s.status === 'in_progress'
                ? 'In Progress'
                : 'Not Started'}
            </Typography>
          </Stack>
          {i < steps.length - 1 && (
            <Box
              sx={{
                flex: 1,
                height: 2,
                mx: 1,
                maxWidth: 120,
                bgcolor:
                  s.status === 'completed'
                    ? theme.palette.success.main
                    : alpha(theme.palette.text.primary, 0.12),
                borderRadius: 1,
                transition: 'background-color 0.3s ease',
              }}
            />
          )}
        </React.Fragment>
      ))}
    </Stack>
  );
};

export const StepCard: React.FC<StepCardProps> = ({ step, title, status, children }) => {
  const theme = useTheme();
  const isActive = status === 'in_progress';
  const isCompleted = status === 'completed';
  const isNotStarted = status === 'not_started';

  const [manualExpand, setManualExpand] = React.useState(false);
  const expanded = isActive || (isCompleted && manualExpand);

  React.useEffect(() => {
    setManualExpand(false);
  }, [status]);

  return (
    <Paper
      elevation={0}
      sx={{
        mb: isCompleted && !manualExpand ? 1.5 : 3,
        borderRadius: isCompleted && !manualExpand ? 2 : 3,
        border: '1px solid',
        borderColor: isActive
          ? alpha(theme.palette.primary.main, 0.3)
          : isCompleted
          ? alpha(theme.palette.success.main, 0.25)
          : theme.palette.divider,
        bgcolor: isActive
          ? alpha(theme.palette.primary.main, 0.02)
          : isCompleted
          ? alpha(theme.palette.success.main, 0.03)
          : theme.palette.background.paper,
        overflow: 'hidden',
        opacity: isNotStarted ? 0.5 : 1,
        transform: isActive ? 'scale(1)' : 'scale(0.995)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <Box
        onClick={isCompleted ? () => setManualExpand((v) => !v) : undefined}
        sx={{
          px: 3,
          pt: isCompleted && !manualExpand ? 2 : 3,
          pb: isCompleted && !manualExpand ? 2 : 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          cursor: isCompleted ? 'pointer' : 'default',
          userSelect: isCompleted ? 'none' : 'auto',
          '&:hover': isCompleted
            ? { bgcolor: alpha(theme.palette.success.main, 0.06) }
            : {},
          transition: 'background-color 0.2s ease, padding 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <StepCircle step={step} status={status} />
        <Typography
          variant={isCompleted && !manualExpand ? 'subtitle1' : 'h6'}
          fontWeight={700}
          sx={{
            flex: 1,
            transition: 'font-size 0.3s ease',
            color: isCompleted
              ? theme.palette.success.main
              : isNotStarted
              ? theme.palette.text.disabled
              : theme.palette.text.primary,
          }}
        >
          {title}
        </Typography>
        <StatusPill status={status} />
        {isCompleted && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: theme.palette.text.secondary,
              transition: 'transform 0.3s ease',
              transform: manualExpand ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <IconChevronDown size={18} />
          </Box>
        )}
      </Box>
      <Collapse in={expanded} timeout={400} easing="cubic-bezier(0.4, 0, 0.2, 1)">
        <Box
          sx={{
            px: 3,
            pb: 3,
            opacity: expanded ? 1 : 0,
            transition: 'opacity 0.35s ease 0.05s',
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Paper>
  );
};
