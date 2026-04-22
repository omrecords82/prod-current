/**
 * OcrPipelineJob — Visual pipeline stage tracker for OCR jobs
 * Shows real-time progress through pipeline stages with status indicators
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  IconCheck,
  IconX,
  IconLoader2,
  IconUpload,
  IconSettings,
  IconScan,
  IconTableColumn,
  IconShieldCheck,
  IconDatabase,
  IconRefresh,
  IconPlayerPlay,
} from '@tabler/icons-react';
import { apiClient } from '@/shared/lib/axiosInstance';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PipelineStage {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

interface OcrJob {
  id: number;
  church_id: number;
  filename: string;
  status: string;
  current_stage: string | null;
  progress_percent: number;
  error?: string;
  error_regions?: string;
  started_at?: string;
  completed_at?: string;
}

interface HistoryEntry {
  id: number;
  stage: string;
  status: string;
  message: string | null;
  duration_ms: number | null;
  created_at: string;
}

interface OcrPipelineJobProps {
  jobId: number;
  churchId: number;
  compact?: boolean;
  onStatusChange?: (status: string) => void;
  pollInterval?: number;
}

// ---------------------------------------------------------------------------
// Pipeline stages config
// ---------------------------------------------------------------------------

const PIPELINE_STAGES: PipelineStage[] = [
  { key: 'intake', label: 'Image Intake', description: 'Church Upload / Archive Import', icon: IconUpload },
  { key: 'preprocessing', label: 'Preprocessing', description: 'Deskew • Noise Reduction • Segmentation', icon: IconSettings },
  { key: 'ocr_processing', label: 'OCR Recognition', description: 'Google Vision • Bounding Boxes', icon: IconScan },
  { key: 'extracting', label: 'Field Extraction', description: 'Record Type • Column Mapping', icon: IconTableColumn },
  { key: 'validating', label: 'Validation', description: 'Confidence Scoring • Review Queue', icon: IconShieldCheck },
  { key: 'committing', label: 'Database Commit', description: 'Insert into Records Tables', icon: IconDatabase },
];

const STAGE_INDEX = PIPELINE_STAGES.reduce((acc, s, i) => ({ ...acc, [s.key]: i }), {} as Record<string, number>);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const OcrPipelineJob: React.FC<OcrPipelineJobProps> = ({
  jobId,
  churchId,
  compact = false,
  onStatusChange,
  pollInterval = 5000,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [job, setJob] = useState<OcrJob | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch job details
  const fetchJob = useCallback(async () => {
    try {
      const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs/${jobId}`);
      const jobData = res.job || res;
      if (jobData) {
        setJob(jobData);
        onStatusChange?.(jobData.status);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch job');
    } finally {
      setLoading(false);
    }
  }, [jobId, churchId, onStatusChange]);

  // Fetch job history
  const fetchHistory = useCallback(async () => {
    try {
      const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs/${jobId}/history`);
      setHistory(res.history || []);
    } catch {
      // Non-fatal
    }
  }, [jobId, churchId]);

  // Initial fetch + polling
  useEffect(() => {
    fetchJob();
    fetchHistory();

    const interval = setInterval(() => {
      if (job?.status === 'processing' || job?.status === 'pending' || job?.status === 'queued') {
        fetchJob();
        fetchHistory();
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [fetchJob, fetchHistory, pollInterval, job?.status]);

  // Resume job
  const handleResume = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/resume`);
      await fetchJob();
      await fetchHistory();
    } catch (err: any) {
      setError(err.message || 'Resume failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Reprocess job
  const handleReprocess = async () => {
    setActionLoading(true);
    try {
      await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/retry`);
      await fetchJob();
      await fetchHistory();
    } catch (err: any) {
      setError(err.message || 'Reprocess failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Get stage status
  const getStageStatus = (stageKey: string): 'pending' | 'active' | 'completed' | 'failed' => {
    if (!job) return 'pending';

    const currentIndex = job.current_stage ? STAGE_INDEX[job.current_stage] ?? -1 : -1;
    const stageIndex = STAGE_INDEX[stageKey];

    // Check history for completed stages
    const historyCompleted = history.some(h => h.stage === stageKey && h.status === 'completed');
    const historyFailed = history.some(h => h.stage === stageKey && h.status === 'failed');

    if (historyFailed && job.status === 'failed') return 'failed';
    if (historyCompleted) return 'completed';
    if (job.current_stage === stageKey && job.status === 'processing') return 'active';
    if (stageIndex < currentIndex) return 'completed';
    if (job.status === 'completed' || job.status === 'complete') return 'completed';
    return 'pending';
  };

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'complete':
        return theme.palette.success.main;
      case 'failed':
      case 'error':
        return theme.palette.error.main;
      case 'processing':
        return theme.palette.warning.main;
      case 'queued':
      case 'pending':
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error && !job) {
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        <Typography variant="body2">{error}</Typography>
      </Box>
    );
  }

  if (!job) return null;

  const isFailed = job.status === 'failed' || job.status === 'error';
  const isCompleted = job.status === 'completed' || job.status === 'complete';
  const isActive = job.status === 'processing' || job.status === 'pending' || job.status === 'queued';

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: isFailed ? 'error.main' : isCompleted ? 'success.main' : 'divider',
        bgcolor: isDark ? 'background.paper' : 'grey.50',
      }}
    >
      <CardContent sx={{ p: compact ? 1.5 : 2, '&:last-child': { pb: compact ? 1.5 : 2 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={compact ? 1 : 2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant={compact ? 'body2' : 'subtitle1'} fontWeight={600}>
              Job #{job.id}
            </Typography>
            <Chip
              label={job.status}
              size="small"
              sx={{
                bgcolor: alpha(getStatusColor(job.status), 0.15),
                color: getStatusColor(job.status),
                fontWeight: 600,
                fontSize: '0.7rem',
                height: 22,
              }}
            />
          </Stack>
          <Stack direction="row" spacing={0.5}>
            {isFailed && (
              <>
                <Tooltip title="Resume from last stage">
                  <IconButton size="small" onClick={handleResume} disabled={actionLoading}>
                    <IconPlayerPlay size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reprocess from start">
                  <IconButton size="small" onClick={handleReprocess} disabled={actionLoading}>
                    <IconRefresh size={16} />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Stack>
        </Stack>

        {/* Progress bar */}
        <Box sx={{ mb: compact ? 1 : 2 }}>
          <LinearProgress
            variant="determinate"
            value={job.progress_percent || 0}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: alpha(getStatusColor(job.status), 0.1),
              '& .MuiLinearProgress-bar': {
                bgcolor: getStatusColor(job.status),
                borderRadius: 3,
              },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {job.progress_percent}% complete
          </Typography>
        </Box>

        {/* Pipeline stages */}
        <Stack
          direction="row"
          spacing={compact ? 0.5 : 1}
          sx={{
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
          }}
        >
          {PIPELINE_STAGES.map((stage, index) => {
            const status = getStageStatus(stage.key);
            const Icon = stage.icon;
            const isLast = index === PIPELINE_STAGES.length - 1;

            return (
              <React.Fragment key={stage.key}>
                <Tooltip title={`${stage.label}: ${stage.description}`} arrow>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: compact ? 48 : 80,
                      p: compact ? 0.5 : 1,
                      borderRadius: 1.5,
                      bgcolor:
                        status === 'active'
                          ? alpha(theme.palette.warning.main, 0.1)
                          : status === 'completed'
                            ? alpha(theme.palette.success.main, 0.08)
                            : status === 'failed'
                              ? alpha(theme.palette.error.main, 0.08)
                              : 'transparent',
                      border: '1px solid',
                      borderColor:
                        status === 'active'
                          ? 'warning.main'
                          : status === 'completed'
                            ? 'success.main'
                            : status === 'failed'
                              ? 'error.main'
                              : 'divider',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Box
                      sx={{
                        width: compact ? 28 : 36,
                        height: compact ? 28 : 36,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor:
                          status === 'active'
                            ? 'warning.main'
                            : status === 'completed'
                              ? 'success.main'
                              : status === 'failed'
                                ? 'error.main'
                                : isDark
                                  ? 'grey.700'
                                  : 'grey.200',
                        color: status === 'pending' ? 'text.secondary' : '#fff',
                        mb: 0.5,
                      }}
                    >
                      {status === 'active' ? (
                        <IconLoader2 size={compact ? 14 : 18} className="animate-spin" />
                      ) : status === 'completed' ? (
                        <IconCheck size={compact ? 14 : 18} />
                      ) : status === 'failed' ? (
                        <IconX size={compact ? 14 : 18} />
                      ) : (
                        <Icon size={compact ? 14 : 18} />
                      )}
                    </Box>
                    {!compact && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.65rem',
                          fontWeight: status === 'active' ? 600 : 400,
                          color: status === 'active' ? 'warning.main' : 'text.secondary',
                          textAlign: 'center',
                          lineHeight: 1.2,
                        }}
                      >
                        {stage.label}
                      </Typography>
                    )}
                  </Box>
                </Tooltip>
                {!isLast && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      color: status === 'completed' ? 'success.main' : 'divider',
                    }}
                  >
                    →
                  </Box>
                )}
              </React.Fragment>
            );
          })}
        </Stack>

        {/* Error message */}
        {isFailed && (job.error || job.error_regions) && (
          <Box
            sx={{
              mt: 1.5,
              p: 1,
              borderRadius: 1,
              bgcolor: alpha(theme.palette.error.main, 0.08),
              border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
            }}
          >
            <Typography variant="caption" color="error.main" sx={{ fontWeight: 500 }}>
              Error: {job.error || job.error_regions}
            </Typography>
          </Box>
        )}

        {/* Filename */}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {job.filename}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default OcrPipelineJob;
