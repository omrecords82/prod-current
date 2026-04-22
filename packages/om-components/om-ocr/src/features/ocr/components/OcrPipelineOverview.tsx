/**
 * OcrPipelineOverview — Active pipeline component showing real-time job status
 * Displays job counts per stage, highlights active stages, shows pending work
 * Step labels outside boxes, completion checkboxes persisted to localStorage,
 * expandable detail sub-sections per step.
 */

import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/shared/lib/axiosInstance';
import {
    Badge,
    Box,
    Checkbox,
    Chip,
    CircularProgress,
    Collapse,
    Divider,
    Paper,
    Stack,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import {
    IconAlertTriangle,
    IconCheck,
    IconChevronDown,
    IconChevronUp,
    IconDatabase,
    IconLoader2,
    IconLock,
    IconRefresh,
    IconScan,
    IconSettings,
    IconShieldCheck,
    IconTableColumn,
    IconUpload,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OcrPipelineOverviewProps {
  churchId?: number | null;
  pollInterval?: number;
  onStageClick?: (stageKey: string, stepNumber: number) => void;
}

interface StageConfig {
  key: string;
  icon: React.ElementType;
  title: string;
  bullets: string[];
  details: string[];
}

interface StageCounts {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

const STORAGE_KEY = 'om_ocr_pipeline_completed_steps';

const PIPELINE_STAGES: StageConfig[] = [
  {
    key: 'intake',
    icon: IconUpload,
    title: 'IMAGE INTAKE',
    bullets: ['Church Upload', 'Archive Import', 'Email Ingestion'],
    details: [
      'Upload scanned images (JPEG, PNG, TIFF)',
      'Batch import from church archive folders',
      'Email-to-OCR forwarding (coming soon)',
      'Automatic duplicate detection',
      'File validation and format checks',
    ],
  },
  {
    key: 'preprocessing',
    icon: IconSettings,
    title: 'PREPROCESSING & PAGE ANALYSIS',
    bullets: ['Deskew', 'Noise Reduction', 'Segmentation'],
    details: [
      'Auto-rotate and deskew tilted scans',
      'Remove background noise and artifacts',
      'Split multi-record pages into sections',
      'Detect table grids and column boundaries',
      'Enhance contrast for faded documents',
    ],
  },
  {
    key: 'ocr_processing',
    icon: IconScan,
    title: 'OCR TEXT RECOGNITION',
    bullets: ['Google Vision', 'Bounding Boxes', 'Raw Text Artifacts'],
    details: [
      'Google Cloud Vision API text detection',
      'Character-level bounding box extraction',
      'Multi-language support (EN, EL, CU, RO, RU)',
      'Handwriting recognition for older records',
      'Raw text artifact preservation for audit',
    ],
  },
  {
    key: 'extracting',
    icon: IconTableColumn,
    title: 'STRUCTURED FIELD EXTRACTION',
    bullets: ['Record Type Classification', 'Column Mapping', 'JSON Output'],
    details: [
      'Classify as Baptism, Marriage, or Funeral',
      'Map detected text to record fields',
      'Extract names, dates, locations, sponsors',
      'Generate structured JSON for each record',
      'Template matching for known register layouts',
    ],
  },
  {
    key: 'validating',
    icon: IconShieldCheck,
    title: 'CONFIDENCE VALIDATION',
    bullets: ['Scoring Engine', 'Auto-Approve or Manual', 'Review Queue'],
    details: [
      'Confidence scoring for each extracted field',
      'Auto-approve high-confidence records (>95%)',
      'Flag low-confidence fields for human review',
      'Cross-reference against existing records',
      'Validation rules for dates and name formats',
    ],
  },
  {
    key: 'committing',
    icon: IconDatabase,
    title: 'TENANT DATABASE COMMIT',
    bullets: ['Insert into Baptism', 'Marriage', 'Funeral Tables'],
    details: [
      'Insert validated records into church database',
      'Link to source image for provenance',
      'Generate audit trail entries',
      'Update record counts and statistics',
      'Notify church admin of new records',
    ],
  },
];

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------
function loadCompleted(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCompleted(data: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const OcrPipelineOverview: React.FC<OcrPipelineOverviewProps> = ({
  churchId,
  pollInterval = 10000,
  onStageClick,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { user } = useAuth();
  const isAdminUser = user?.role === 'super_admin' || user?.role === 'admin';

  const [stageCounts, setStageCounts] = useState<Record<string, StageCounts>>({});
  const [totalCounts, setTotalCounts] = useState({ pending: 0, processing: 0, completed: 0, failed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>(loadCompleted);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const toggleCompleted = (stageKey: string) => {
    setCompletedSteps((prev) => {
      const alreadyDone = !!prev[stageKey];
      // Non-admin users can only mark complete, never unmark
      if (alreadyDone && !isAdminUser) return prev;
      const next = { ...prev, [stageKey]: !alreadyDone };
      saveCompleted(next);
      return next;
    });
  };

  const resetAllProgress = () => {
    if (!isAdminUser) return;
    setCompletedSteps({});
    saveCompleted({});
  };

  const toggleExpanded = (stageKey: string) => {
    setExpandedStep((prev) => (prev === stageKey ? null : stageKey));
  };

  // Fetch job counts by stage
  const fetchCounts = useCallback(async () => {
    if (!churchId) {
      setLoading(false);
      return;
    }
    try {
      const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs`);
      const jobs: any[] = res?.data?.jobs || res?.data || res?.jobs || [];

      // Count jobs by stage and status
      const counts: Record<string, StageCounts> = {};
      let pending = 0, processing = 0, completed = 0, failed = 0;

      for (const job of jobs) {
        const stage = job.current_stage || 'intake';
        if (!counts[stage]) counts[stage] = { pending: 0, processing: 0, completed: 0, failed: 0 };

        if (job.status === 'pending' || job.status === 'queued') {
          counts[stage].pending++;
          pending++;
        } else if (job.status === 'processing') {
          counts[stage].processing++;
          processing++;
        } else if (job.status === 'completed' || job.status === 'complete') {
          counts[stage].completed++;
          completed++;
        } else if (job.status === 'failed' || job.status === 'error') {
          counts[stage].failed++;
          failed++;
        }
      }

      setStageCounts(counts);
      setTotalCounts({ pending, processing, completed, failed, total: jobs.length });
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  }, [churchId]);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, pollInterval);
    return () => clearInterval(interval);
  }, [fetchCounts, pollInterval]);

  // Get stage status
  const getStageStatus = (stageKey: string): 'idle' | 'active' | 'has_pending' | 'has_failed' => {
    const c = stageCounts[stageKey];
    if (!c) return 'idle';
    if (c.processing > 0) return 'active';
    if (c.failed > 0) return 'has_failed';
    if (c.pending > 0) return 'has_pending';
    return 'idle';
  };

  const getStageCount = (stageKey: string): number => {
    const c = stageCounts[stageKey];
    if (!c) return 0;
    return c.pending + c.processing + c.failed;
  };

  return (
    <Box sx={{ mb: 4 }}>
      {/* Summary chips */}
      {churchId && totalCounts.total > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          {totalCounts.processing > 0 && (
            <Chip
              icon={<IconLoader2 size={14} className="animate-spin" />}
              label={`${totalCounts.processing} processing`}
              size="small"
              sx={{ bgcolor: alpha(theme.palette.warning.main, 0.12), color: theme.palette.warning.main }}
            />
          )}
          {totalCounts.pending > 0 && (
            <Chip
              label={`${totalCounts.pending} queued`}
              size="small"
              sx={{ bgcolor: alpha(theme.palette.info.main, 0.12), color: theme.palette.info.main }}
            />
          )}
          {totalCounts.failed > 0 && (
            <Chip
              icon={<IconAlertTriangle size={14} />}
              label={`${totalCounts.failed} failed`}
              size="small"
              sx={{ bgcolor: alpha(theme.palette.error.main, 0.12), color: theme.palette.error.main }}
            />
          )}
          {totalCounts.completed > 0 && (
            <Chip
              icon={<IconCheck size={14} />}
              label={`${totalCounts.completed} completed`}
              size="small"
              sx={{ bgcolor: alpha(theme.palette.success.main, 0.12), color: theme.palette.success.main }}
            />
          )}
        </Stack>
      )}

      {/* Pipeline stages */}
      <Stack
        direction="row"
        sx={{
          overflowX: 'auto',
          pt: 2,
          pb: 2,
          px: 0.5,
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
        }}
      >
        {PIPELINE_STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const isLast = index === PIPELINE_STAGES.length - 1;
          const status = getStageStatus(stage.key);
          const count = getStageCount(stage.key);
          const isCompleted = !!completedSteps[stage.key];
          const isExpanded = expandedStep === stage.key;

          // Color based on status
          let iconBg = isDark ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.primary.main, 0.08);
          let iconColor = theme.palette.primary.main;
          let borderColor: string = isDark ? theme.palette.divider : theme.palette.divider;

          if (isCompleted) {
            iconBg = alpha(theme.palette.success.main, 0.12);
            iconColor = theme.palette.success.main;
            borderColor = theme.palette.success.main;
          } else if (status === 'active') {
            iconBg = alpha(theme.palette.warning.main, 0.15);
            iconColor = theme.palette.warning.main;
            borderColor = theme.palette.warning.main;
          } else if (status === 'has_failed') {
            iconBg = alpha(theme.palette.error.main, 0.12);
            iconColor = theme.palette.error.main;
            borderColor = theme.palette.error.main;
          } else if (status === 'has_pending') {
            iconBg = alpha(theme.palette.info.main, 0.12);
            iconColor = theme.palette.info.main;
            borderColor = theme.palette.info.main;
          }

          return (
            <React.Fragment key={stage.key}>
              {/* Step column: label above, card below */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                {/* Step label — outside the card */}
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    letterSpacing: '0.1em',
                    color: isCompleted ? theme.palette.success.main : iconColor,
                    mb: 1,
                    userSelect: 'none',
                  }}
                >
                  STEP {index + 1}
                </Typography>

                <Badge
                  badgeContent={count > 0 ? count : null}
                  color={status === 'active' ? 'warning' : status === 'has_failed' ? 'error' : 'info'}
                  sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', minWidth: 20, height: 20 } }}
                >
                  <Paper
                    variant="outlined"
                    onClick={() => onStageClick?.(stage.key, index + 1)}
                    sx={{
                      width: 190,
                      p: 2.5,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      borderRadius: 2.5,
                      bgcolor: isCompleted
                        ? alpha(theme.palette.success.main, 0.04)
                        : isDark ? 'background.paper' : '#fff',
                      borderColor,
                      borderWidth: (status !== 'idle' || isCompleted) ? 2 : 1,
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-8px) scale(1.05)',
                        boxShadow: isDark
                          ? `0 16px 32px rgba(0,0,0,0.5)`
                          : `0 16px 32px ${alpha(iconColor, 0.2)}`,
                        borderColor: iconColor,
                        zIndex: 2,
                      },
                    }}
                  >
                    {/* Icon */}
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: iconBg,
                        mb: 1.5,
                        position: 'relative',
                      }}
                    >
                      {isCompleted ? (
                        <IconCheck size={28} color={theme.palette.success.main} />
                      ) : status === 'active' ? (
                        <>
                          <CircularProgress size={56} thickness={2} sx={{ position: 'absolute', color: iconColor, opacity: 0.3 }} />
                          <Icon size={28} color={iconColor} />
                        </>
                      ) : (
                        <Icon size={28} color={iconColor} />
                      )}
                    </Box>

                    {/* Title */}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        letterSpacing: '0.02em',
                        lineHeight: 1.3,
                        mb: 1,
                        minHeight: 32,
                        display: 'flex',
                        alignItems: 'center',
                        color: isCompleted ? theme.palette.success.main : status !== 'idle' ? iconColor : 'text.primary',
                      }}
                    >
                      {stage.title}
                    </Typography>

                    {/* Bullets */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: '0.68rem', lineHeight: 1.5, mb: 1.5 }}
                    >
                      {stage.bullets.join(' • ')}
                    </Typography>

                    {/* Expand toggle */}
                    <Box
                      onClick={(e) => { e.stopPropagation(); toggleExpanded(stage.key); }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        cursor: 'pointer',
                        color: 'text.secondary',
                        '&:hover': { color: iconColor },
                        transition: 'color 0.2s',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>
                        {isExpanded ? 'Less' : 'Details'}
                      </Typography>
                      {isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                    </Box>

                    {/* Expandable detail section */}
                    <Collapse in={isExpanded} timeout={200}>
                      <Box sx={{ mt: 1.5, textAlign: 'left', width: '100%' }}>
                        <Divider sx={{ mb: 1 }} />
                        {stage.details.map((d, i) => (
                          <Stack key={i} direction="row" spacing={0.75} alignItems="flex-start" sx={{ mb: 0.5 }}>
                            <Box
                              sx={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                bgcolor: iconColor,
                                mt: 0.7,
                                flexShrink: 0,
                                opacity: 0.6,
                              }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', lineHeight: 1.4 }}>
                              {d}
                            </Typography>
                          </Stack>
                        ))}
                      </Box>
                    </Collapse>
                  </Paper>
                </Badge>

                {/* Completion checkbox — below the card */}
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0}
                  sx={{ mt: 1 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    size="small"
                    checked={isCompleted}
                    disabled={isCompleted && !isAdminUser}
                    onChange={() => toggleCompleted(stage.key)}
                    sx={{
                      p: 0.25,
                      color: isCompleted ? theme.palette.success.main : theme.palette.text.secondary,
                      '&.Mui-checked': { color: theme.palette.success.main },
                      '&.Mui-disabled.Mui-checked': { color: theme.palette.success.main, opacity: 0.8 },
                    }}
                  />
                  {isCompleted && !isAdminUser ? (
                    <Stack direction="row" alignItems="center" spacing={0.3}>
                      <IconLock size={11} color={theme.palette.success.main} />
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          color: theme.palette.success.main,
                          userSelect: 'none',
                        }}
                      >
                        Completed
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        color: isCompleted ? theme.palette.success.main : 'text.secondary',
                        cursor: isCompleted && !isAdminUser ? 'default' : 'pointer',
                        userSelect: 'none',
                      }}
                      onClick={() => toggleCompleted(stage.key)}
                    >
                      {isCompleted ? 'Completed (click to reset)' : 'Mark done'}
                    </Typography>
                  )}
                </Stack>
              </Box>

              {/* Arrow */}
              {!isLast && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 1,
                    color: isDark ? theme.palette.grey[600] : theme.palette.grey[400],
                    flexShrink: 0,
                    mt: 3,
                  }}
                >
                  <Typography sx={{ fontSize: '1.4rem', fontWeight: 300 }}>→</Typography>
                </Box>
              )}
            </React.Fragment>
          );
        })}
      </Stack>

      {/* Feedback loop section */}
      <Box sx={{ position: 'relative', mt: 2 }}>
        <Divider sx={{ mb: 1.5 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              border: `2px solid ${alpha(theme.palette.warning.main, 0.3)}`,
            }}
          >
            <IconRefresh size={14} color={theme.palette.warning.main} />
          </Box>
        </Divider>

        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="overline"
            sx={{
              fontWeight: 700,
              fontSize: '0.7rem',
              letterSpacing: '0.08em',
              color: 'text.secondary',
              mb: 0.5,
              display: 'block',
            }}
          >
            EXTRACTION INTELLIGENCE FEEDBACK LOOP
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            Error Tracking • Reprocessing • Template Refinement • Threshold Calibration
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default OcrPipelineOverview;
