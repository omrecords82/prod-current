/**
 * ReviewSummaryPanel — Scoring V2 review summary with navigation and row index.
 * Extracted from FieldMappingPanel.tsx
 */

import React from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { IconAlertTriangle, IconArrowDown, IconArrowUp, IconCheck, IconEye, IconEyeOff, IconFlag } from '@tabler/icons-react';

interface ReviewSummary {
  total: number;
  needReview: number;
  autoAccepted: number;
  totalFields: number;
  fieldsFlagged: number;
  pageScore: number | null;
  recommendation: string | null;
}

interface ReviewSummaryPanelProps {
  reviewSummary: ReviewSummary;
  flaggedRowIndices: number[];
  scoringRows: any[];
  expandedIdx: number | false | null;
  showAllRows: boolean;
  setShowAllRows: (val: boolean) => void;
  navigateToFlaggedRow: (direction: 'next' | 'prev') => void;
  onRecordSelect?: (index: number | null) => void;
  setInternalExpandedIdx: (idx: number) => void;
}

const ReviewSummaryPanel: React.FC<ReviewSummaryPanelProps> = ({
  reviewSummary,
  flaggedRowIndices,
  scoringRows,
  expandedIdx,
  showAllRows,
  setShowAllRows,
  navigateToFlaggedRow,
  onRecordSelect,
  setInternalExpandedIdx,
}) => {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, borderColor: reviewSummary.recommendation === 'accepted' ? 'success.main' : reviewSummary.recommendation === 'retry' ? 'error.main' : 'warning.main' }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Typography variant="body2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconFlag size={16} />
            Review Summary
          </Typography>
          {reviewSummary.pageScore !== null && (
            <Chip
              size="small"
              label={`Score: ${Math.round(reviewSummary.pageScore * 100)}%`}
              color={reviewSummary.pageScore >= 0.85 ? 'success' : reviewSummary.pageScore >= 0.60 ? 'warning' : 'error'}
              sx={{ fontWeight: 700, fontSize: '0.7rem' }}
            />
          )}
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip size="small" variant="outlined" label={`${reviewSummary.total} rows`} sx={{ fontSize: '0.65rem', height: 22 }} />
          <Chip size="small" variant="outlined" color="success" icon={<IconCheck size={12} />} label={`${reviewSummary.autoAccepted} clean`} sx={{ fontSize: '0.65rem', height: 22 }} />
          <Chip size="small" variant="outlined" color="warning" icon={<IconAlertTriangle size={12} />} label={`${reviewSummary.needReview} flagged`} sx={{ fontSize: '0.65rem', height: 22 }} />
          {reviewSummary.fieldsFlagged > 0 && (
            <Chip size="small" variant="outlined" color="error" label={`${reviewSummary.fieldsFlagged} fields flagged`} sx={{ fontSize: '0.65rem', height: 22 }} />
          )}
        </Stack>
        {/* Navigation controls */}
        {flaggedRowIndices.length > 0 && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Button
              size="small"
              variant="outlined"
              startIcon={<IconArrowUp size={14} />}
              onClick={() => navigateToFlaggedRow('prev')}
              sx={{ textTransform: 'none', fontSize: '0.7rem', py: 0.25, minWidth: 0 }}
            >
              Prev
            </Button>
            <Button
              size="small"
              variant="outlined"
              endIcon={<IconArrowDown size={14} />}
              onClick={() => navigateToFlaggedRow('next')}
              sx={{ textTransform: 'none', fontSize: '0.7rem', py: 0.25, minWidth: 0 }}
            >
              Next
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              Flagged Row
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Tooltip title={showAllRows ? 'Show only flagged rows' : 'Show all rows'}>
              <IconButton size="small" onClick={() => setShowAllRows(!showAllRows)} sx={{ p: 0.5 }}>
                {showAllRows ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </IconButton>
            </Tooltip>
          </Stack>
        )}
        {/* Clickable row index */}
        {scoringRows.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
            {scoringRows.map((row: any) => {
              const isActive = expandedIdx === row.candidate_index;
              const isFlagged = row.needs_review;
              return (
                <Chip
                  key={row.candidate_index}
                  size="small"
                  label={row.candidate_index + 1}
                  variant={isActive ? 'filled' : 'outlined'}
                  color={isFlagged ? 'warning' : 'success'}
                  onClick={() => {
                    onRecordSelect?.(row.candidate_index);
                    setInternalExpandedIdx(row.candidate_index);
                  }}
                  sx={{
                    fontSize: '0.6rem',
                    height: 20,
                    minWidth: 24,
                    cursor: 'pointer',
                    fontWeight: isActive ? 700 : 400,
                  }}
                />
              );
            })}
          </Box>
        )}
      </Stack>
    </Paper>
  );
};

export default ReviewSummaryPanel;
