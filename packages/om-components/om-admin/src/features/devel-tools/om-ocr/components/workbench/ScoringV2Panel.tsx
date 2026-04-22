/**
 * ScoringV2Panel — Field-level scoring breakdown with color coding.
 * Reusable in both Artifact Inspector tab and ReviewCommitStep.
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  LinearProgress,
  alpha,
  useTheme,
} from '@mui/material';
import { IconChevronDown, IconAlertTriangle, IconCheck, IconFlag } from '@tabler/icons-react';
import type { ScoringV2Result, RowScore, FieldScore, ReasonCode } from '../../types/pipeline';

// ── Reason code human-readable labels ───────────────────────────────────────

const REASON_LABELS: Record<ReasonCode, string> = {
  DATE_PARSE_FAIL: 'Date failed to parse',
  LOW_OCR_CONF: 'Low OCR confidence',
  AMBIGUOUS_COLUMN: 'Ambiguous column mapping',
  MISSING_REQUIRED: 'Required field missing',
  SHORT_VALUE: 'Value too short',
  SUSPICIOUS_CHARS: 'Suspicious characters',
  FIELD_OK: 'OK',
};

// ── Props ───────────────────────────────────────────────────────────────────

interface ScoringV2PanelProps {
  scoring: ScoringV2Result;
  /** Called when user clicks a field that has a bbox_union — for image highlighting */
  onHighlightBbox?: (bbox: [number, number, number, number], label: string) => void;
  /** Compact mode hides the summary bar */
  compact?: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number): 'success' | 'warning' | 'error' {
  if (score >= 0.85) return 'success';
  if (score >= 0.65) return 'warning';
  return 'error';
}

function scorePct(score: number): string {
  return `${Math.round(score * 100)}%`;
}

// ── Component ───────────────────────────────────────────────────────────────

const ScoringV2Panel: React.FC<ScoringV2PanelProps> = ({ scoring, onHighlightBbox, compact }) => {
  const theme = useTheme();
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const sortedRows = useMemo(
    () => [...scoring.rows].sort((a, b) => a.candidate_index - b.candidate_index),
    [scoring.rows],
  );

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {/* Summary Bar */}
      {!compact && (
        <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Tooltip title="Page-level score (scoring_v2)">
              <Chip
                size="small"
                label={`Page: ${scorePct(scoring.page_score_v2)}`}
                color={scoreColor(scoring.page_score_v2)}
                sx={{ fontWeight: 600 }}
              />
            </Tooltip>
            <Tooltip title="Routing recommendation">
              <Chip
                size="small"
                label={scoring.routing_recommendation}
                variant="outlined"
                sx={{ textTransform: 'capitalize' }}
              />
            </Tooltip>
            <Typography variant="caption" color="text.secondary">
              {scoring.summary.total_rows} row{scoring.summary.total_rows !== 1 ? 's' : ''}
              {scoring.summary.rows_need_review > 0 && (
                <> &middot; <b style={{ color: theme.palette.warning.main }}>{scoring.summary.rows_need_review} need review</b></>
              )}
              {scoring.summary.fields_flagged > 0 && (
                <> &middot; {scoring.summary.fields_flagged} field{scoring.summary.fields_flagged !== 1 ? 's' : ''} flagged</>
              )}
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Row Accordions */}
      <Box sx={{ p: 1 }}>
        {sortedRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No scoring data available
          </Typography>
        ) : (
          sortedRows.map((row) => (
            <Accordion
              key={row.candidate_index}
              expanded={expandedRow === row.candidate_index}
              onChange={(_, isExpanded) => setExpandedRow(isExpanded ? row.candidate_index : null)}
              disableGutters
              sx={{
                '&:before': { display: 'none' },
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 0.5,
                bgcolor: row.needs_review
                  ? alpha(theme.palette.warning.main, 0.04)
                  : undefined,
              }}
            >
              <AccordionSummary
                expandIcon={<IconChevronDown size={16} />}
                sx={{ minHeight: 36, '& .MuiAccordionSummary-content': { my: 0.5 } }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ minWidth: 55 }}>
                    Row {row.source_row_index}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={row.row_score * 100}
                    color={scoreColor(row.row_score)}
                    sx={{ flex: 1, height: 6, borderRadius: 1 }}
                  />
                  <Chip
                    size="small"
                    label={scorePct(row.row_score)}
                    color={scoreColor(row.row_score)}
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600, minWidth: 42 }}
                  />
                  {row.needs_review && (
                    <Tooltip title="Needs manual review">
                      <IconAlertTriangle size={14} color={theme.palette.warning.main} />
                    </Tooltip>
                  )}
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0, pt: 0 }}>
                <FieldsTable fields={row.fields} onHighlightBbox={onHighlightBbox} />
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>
    </Box>
  );
};

// ── Fields Table (inside each row accordion) ────────────────────────────────

interface FieldsTableProps {
  fields: FieldScore[];
  onHighlightBbox?: (bbox: [number, number, number, number], label: string) => void;
}

const FieldsTable: React.FC<FieldsTableProps> = ({ fields, onHighlightBbox }) => {
  const theme = useTheme();

  return (
    <Table size="small" sx={{ '& td, & th': { py: 0.3, px: 1, fontSize: '0.75rem' } }}>
      <TableHead>
        <TableRow>
          <TableCell>Field</TableCell>
          <TableCell sx={{ width: 55 }}>Score</TableCell>
          <TableCell sx={{ width: 55 }}>OCR</TableCell>
          <TableCell>Flags</TableCell>
          <TableCell sx={{ width: 30 }} />
        </TableRow>
      </TableHead>
      <TableBody>
        {fields.map((field) => {
          const hasBbox = !!field.bbox_union;
          const flagReasons = field.reasons.filter((r) => r !== 'FIELD_OK');

          return (
            <TableRow
              key={field.field_name}
              hover
              sx={{
                cursor: hasBbox ? 'pointer' : 'default',
                bgcolor: field.needs_review
                  ? alpha(theme.palette.warning.main, 0.06)
                  : undefined,
              }}
              onClick={() => {
                if (hasBbox && onHighlightBbox) {
                  onHighlightBbox(field.bbox_union!, field.field_name);
                }
              }}
            >
              <TableCell>
                <Typography variant="caption" fontWeight={500}>
                  {field.field_name.replace(/_/g, ' ')}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={scorePct(field.field_score)}
                  color={scoreColor(field.field_score)}
                  variant="outlined"
                  sx={{ height: 18, fontSize: '0.6rem', fontWeight: 600 }}
                />
              </TableCell>
              <TableCell>
                {field.cell_confidence != null ? (
                  <Typography variant="caption" color={field.cell_confidence < 0.7 ? 'error' : 'text.secondary'}>
                    {scorePct(field.cell_confidence)}
                  </Typography>
                ) : (
                  <Typography variant="caption" color="text.disabled">-</Typography>
                )}
              </TableCell>
              <TableCell>
                {flagReasons.length > 0 ? (
                  <Stack direction="row" spacing={0.3} flexWrap="wrap">
                    {flagReasons.map((reason) => (
                      <Tooltip key={reason} title={REASON_LABELS[reason] || reason}>
                        <Chip
                          size="small"
                          label={reason.replace(/_/g, ' ').toLowerCase()}
                          color="warning"
                          variant="outlined"
                          sx={{ height: 16, fontSize: '0.55rem' }}
                        />
                      </Tooltip>
                    ))}
                  </Stack>
                ) : (
                  <IconCheck size={14} color={theme.palette.success.main} />
                )}
              </TableCell>
              <TableCell>
                {hasBbox && (
                  <Tooltip title="Click to highlight on image">
                    <IconFlag size={12} color={theme.palette.info.main} />
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default ScoringV2Panel;
