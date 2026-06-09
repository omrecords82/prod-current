/**
 * Empty-state upload UI for Confirm & Seed — drag-and-drop zone + pipeline status panel.
 */

import { alpha, Box, LinearProgress, Paper, Typography, useTheme } from '@mui/material';
import {
  IconCheck,
  IconClock,
  IconCloudUpload,
  IconPhoto,
  IconRobot,
  IconScan,
  IconX,
} from '@tabler/icons-react';
import React from 'react';

export type ReviewUploadQueueItem = {
  id: string;
  file: File;
  name: string;
  status: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'error';
  progress: number;
  jobId?: string;
  error?: string;
};

export type PipelinePhase =
  | 'idle'
  | 'uploading'
  | 'queued'
  | 'processing'
  | 'extracting'
  | 'ready'
  | 'complete'
  | 'failed';

export type PipelineState = {
  phase: PipelinePhase;
  label: string;
  detail?: string;
  progress: number;
  indeterminate?: boolean;
  jobId?: number | null;
};

export type PipelineFocusJob = {
  id: string | number;
  filename?: string;
  status: string;
  review_status: string;
};

/** True while the worker is still running OCR (before review_status advances past uploaded). */
export function shouldShowJobProgress(job: { status: string; review_status: string }): boolean {
  if (job.status === 'failed' || job.status === 'error') return false;
  return job.review_status === 'uploaded';
}

/** True while we should keep polling the jobs list for pipeline updates. */
export function needsJobPolling(job: { status: string; review_status: string }): boolean {
  if (job.status === 'failed' || job.status === 'error') return false;
  if (['agent_extracted', 'ready_to_seed', 'seeded', 'returned'].includes(job.review_status)) return false;
  if (['processing', 'pending', 'queued'].includes(job.status)) return true;
  return job.review_status === 'uploaded' || job.review_status === 'ocr_complete';
}

/** @deprecated Use shouldShowJobProgress or needsJobPolling */
export function isJobInFlight(job: { status: string; review_status: string }): boolean {
  return needsJobPolling(job);
}

export function getJobPipelineState(job: PipelineFocusJob): PipelineState {
  const jobId = Number(job.id);
  const detail = job.filename || `Job #${job.id}`;

  if (job.status === 'failed' || job.status === 'error') {
    return { phase: 'failed', label: 'Processing failed', detail, progress: 0, jobId };
  }
  if (job.status === 'processing') {
    return { phase: 'processing', label: 'Processing OCR', detail, progress: 48, indeterminate: true, jobId };
  }
  if (job.status === 'pending' || job.status === 'queued') {
    return { phase: 'queued', label: 'Queued for OCR', detail, progress: 26, indeterminate: true, jobId };
  }
  const mapped = REVIEW_PIPELINE[job.review_status];
  if (mapped) {
    return {
      phase: mapped.phase,
      label: mapped.label,
      detail,
      progress: mapped.progress,
      indeterminate: mapped.phase !== 'ready',
      jobId,
    };
  }
  return { phase: 'queued', label: 'Queued', detail, progress: 20, indeterminate: true, jobId };
}

export function getUploadQueueItemState(item: ReviewUploadQueueItem): PipelineState {
  if (item.status === 'failed' || item.status === 'error') {
    return { phase: 'failed', label: 'Upload failed', detail: item.error || item.name, progress: 0 };
  }
  if (item.status === 'pending') {
    return { phase: 'uploading', label: 'Preparing upload', detail: item.name, progress: 8, indeterminate: true };
  }
  if (item.status === 'uploading') {
    return { phase: 'uploading', label: 'Uploading', detail: item.name, progress: Math.max(item.progress, 15), indeterminate: true };
  }
  if (item.status === 'queued') {
    return {
      phase: 'queued',
      label: 'Queued for OCR',
      detail: item.name,
      progress: 28,
      indeterminate: true,
      jobId: item.jobId ? Number(item.jobId) : null,
    };
  }
  if (item.status === 'processing') {
    return {
      phase: 'processing',
      label: 'Processing OCR',
      detail: item.name,
      progress: 48,
      indeterminate: true,
      jobId: item.jobId ? Number(item.jobId) : null,
    };
  }
  return { phase: 'complete', label: 'Complete', detail: item.name, progress: 100, jobId: item.jobId ? Number(item.jobId) : null };
}

const REVIEW_PIPELINE: Record<string, { label: string; progress: number; phase: PipelinePhase }> = {
  uploaded: { label: 'Queued for OCR', progress: 28, phase: 'queued' },
  ocr_complete: { label: 'OCR complete', progress: 52, phase: 'processing' },
  agent_extracted: { label: 'Extracting fields', progress: 78, phase: 'extracting' },
  ready_to_seed: { label: 'Ready for review', progress: 92, phase: 'ready' },
};

const pulseKeyframes = {
  '@keyframes pipelinePulse': {
    '0%, 100%': { transform: 'scale(1)', opacity: 1 },
    '50%': { transform: 'scale(1.1)', opacity: 0.82 },
  },
  '@keyframes pipelineSpin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
};

function phaseIcon(phase: PipelinePhase, color: string) {
  const size = 22;
  switch (phase) {
    case 'uploading':
      return <IconCloudUpload size={size} color={color} />;
    case 'queued':
      return <IconClock size={size} color={color} />;
    case 'processing':
      return <IconScan size={size} color={color} />;
    case 'extracting':
      return <IconRobot size={size} color={color} />;
    case 'ready':
    case 'complete':
      return <IconCheck size={size} color={color} />;
    case 'failed':
      return <IconX size={size} color={color} />;
    default:
      return <IconPhoto size={size} color={color} />;
  }
}

function phaseAccent(phase: PipelinePhase, theme: ReturnType<typeof useTheme>) {
  switch (phase) {
    case 'uploading':
    case 'queued':
      return theme.palette.info.main;
    case 'processing':
    case 'extracting':
      return theme.palette.warning.main;
    case 'ready':
    case 'complete':
      return theme.palette.success.main;
    case 'failed':
      return theme.palette.error.main;
    default:
      return theme.palette.text.secondary;
  }
}

/** Compact progress strip shown inside a job row in the awaiting-review list */
export const OcrReviewInlineProgress: React.FC<{ state: PipelineState }> = ({ state }) => {
  const theme = useTheme();
  const accent = phaseAccent(state.phase, theme);
  const animate = !['idle', 'complete', 'ready'].includes(state.phase);

  return (
    <Box
      sx={{
        px: 1.25,
        pb: 1,
        pt: 0.25,
        borderTop: '1px solid',
        borderColor: alpha(accent, 0.15),
        bgcolor: alpha(accent, 0.04),
        ...pulseKeyframes,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            bgcolor: alpha(accent, 0.12),
            animation: animate
              ? state.phase === 'queued'
                ? 'pipelineSpin 2.4s linear infinite'
                : 'pipelinePulse 1.6s ease-in-out infinite'
              : undefined,
          }}
        >
          {phaseIcon(state.phase, accent)}
        </Box>
        <Typography variant="caption" fontWeight={600} noWrap sx={{ flex: 1, color: accent }}>
          {state.label}
        </Typography>
      </Box>
      <LinearProgress
        variant={state.indeterminate ? 'indeterminate' : 'determinate'}
        value={state.indeterminate ? undefined : state.progress}
        sx={{
          height: 4,
          borderRadius: 2,
          bgcolor: alpha(accent, 0.12),
          '& .MuiLinearProgress-bar': { borderRadius: 2, bgcolor: accent },
        }}
      />
    </Box>
  );
};

type DropZoneProps = {
  dragActive: boolean;
  disabled?: boolean;
  isUploading?: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onBrowse: () => void;
  fileInput: React.ReactNode;
};

export const OcrReviewDropZone: React.FC<DropZoneProps> = ({
  dragActive,
  disabled,
  isUploading,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onBrowse,
  fileInput,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: 320,
        p: 3,
      }}
    >
      <Paper
        variant="outlined"
        onDragEnter={disabled ? undefined : onDragEnter}
        onDragLeave={disabled ? undefined : onDragLeave}
        onDragOver={disabled ? undefined : onDragOver}
        onDrop={disabled ? undefined : onDrop}
        onClick={disabled ? undefined : onBrowse}
        sx={{
          width: '100%',
          maxWidth: 720,
          p: { xs: 4, md: 6 },
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderStyle: 'dashed',
          borderWidth: 2,
          borderColor: dragActive ? 'primary.main' : 'divider',
          bgcolor: dragActive ? alpha(theme.palette.primary.main, 0.06) : alpha(theme.palette.primary.main, 0.02),
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.25s ease',
          '&:hover': disabled
            ? {}
            : {
                borderColor: 'primary.light',
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                transform: 'translateY(-2px)',
                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.12)}`,
              },
        }}
      >
        {fileInput}
        <IconCloudUpload
          size={56}
          color={theme.palette.primary.main}
          style={{ opacity: dragActive ? 1 : 0.55 }}
        />
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{
            mt: 2.5,
            letterSpacing: '0.06em',
            color: dragActive ? 'primary.main' : 'text.primary',
            fontFamily: 'Georgia, "Times New Roman", serif',
          }}
        >
          DRAG &amp; DROP
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, fontWeight: 500 }}>
          {isUploading ? 'Upload in progress — drop more images when finished' : 'Drop record images here to upload and process'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          or click to browse · JPG, PNG, TIFF · 300 DPI recommended
        </Typography>
      </Paper>
    </Box>
  );
};
