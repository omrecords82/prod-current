/**
 * WorkbenchHeader - Header bar for workbench showing job info and actions
 */

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
  Paper,
} from '@mui/material';
import {
  IconX,
  IconCopy,
  IconRefresh,
  IconAlertCircle,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import type { JobDetail } from '../../types/inspection';
import { extractYear } from '../../utils/recordTypeDetector';

interface WorkbenchHeaderProps {
  job: JobDetail;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  templateId?: string | number | null;
}

const WorkbenchHeader: React.FC<WorkbenchHeaderProps> = ({ job, onClose, onPrev, onNext, hasPrev, hasNext, templateId }) => {
  const theme = useTheme();
  
  const jobFilename = job?.original_filename || job?.originalFilename || job?.filename || 'Unknown';
  const jobStatus = job?.status || '';
  const jobRecordType = job?.record_type || job?.recordType || 'baptism';
  const jobConfidence = job?.confidence_score || job?.confidenceScore || 0;
  const jobOcrText = job?.ocr_text || job?.ocrText || null;
  
  // Auto-detect year from OCR text
  const detectedYear = useMemo(() => {
    if (!jobOcrText) return null;
    try {
      return extractYear(jobOcrText);
    } catch (e) {
      console.warn('[WorkbenchHeader] Failed to extract year:', e);
      return null;
    }
  }, [jobOcrText]);
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'complete':
        return 'success';
      case 'processing':
        return 'info';
      case 'failed':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.5) return 'warning';
    return 'error';
  };
  
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        {/* Left: Job Info */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>
            {jobFilename}
          </Typography>
          <Chip
            size="small"
            label={jobRecordType}
            color="primary"
            sx={{ textTransform: 'capitalize' }}
          />
          {detectedYear && (
            <Chip
              size="small"
              label={`Year ${detectedYear}`}
              color="info"
              variant="outlined"
            />
          )}
          <Chip
            size="small"
            label={jobStatus}
            color={getStatusColor(jobStatus)}
            sx={{ textTransform: 'capitalize' }}
          />
          {jobConfidence > 0 && (
            <Chip
              size="small"
              label={`${Math.round(jobConfidence * 100)}% confidence`}
              color={getConfidenceColor(jobConfidence)}
            />
          )}
          {templateId && (
            <Tooltip title={`Template ID: ${templateId}`}>
              <Chip
                size="small"
                label="Template Locked"
                color="secondary"
                variant="outlined"
              />
            </Tooltip>
          )}
        </Stack>
        
        {/* Right: Actions */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          {onPrev && (
            <Tooltip title="Previous Job">
              <span>
                <IconButton size="small" onClick={onPrev} disabled={!hasPrev}>
                  <IconChevronLeft size={20} />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {onNext && (
            <Tooltip title="Next Job">
              <span>
                <IconButton size="small" onClick={onNext} disabled={!hasNext}>
                  <IconChevronRight size={20} />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Tooltip title="Copy OCR Text">
            <IconButton size="small">
              <IconCopy size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close Workbench">
            <IconButton size="small" onClick={onClose}>
              <IconX size={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default WorkbenchHeader;

