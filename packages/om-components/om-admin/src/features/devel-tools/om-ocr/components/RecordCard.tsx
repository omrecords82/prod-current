/**
 * RecordCard — Per-record Accordion with field mapping, token chips, and suggestions.
 * Extracted from FieldMappingPanel.tsx
 */

import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { IconChevronDown, IconAlertTriangle, IconBan, IconWand, IconCheck } from '@tabler/icons-react';
import { FIELD_ENTITY_MAP, type SuggestionResult, type EntityType } from '../utils/fieldSuggestions';
import { IconUser, IconCalendar, IconHash, IconMapPin } from '@tabler/icons-react';

/** Token from table extraction cell for chip display */
interface CellToken {
  text: string;
  confidence: number | null;
  columnIndex: number;
  columnKey: string;
}

interface RecordEntry {
  recordType: string;
  fields: Record<string, string>;
  selected: boolean;
  needsReview: boolean;
  sourceRowIndex: number;
  confidence: number;
}

interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
}

/** Reason code labels and colors */
const reasonLabel: Record<string, { label: string; color: string }> = {
  DATE_PARSE_FAIL: { label: 'Date', color: '#e53e3e' },
  LOW_OCR_CONF: { label: 'Low OCR', color: '#dd6b20' },
  AMBIGUOUS_COLUMN: { label: 'Ambig', color: '#d69e2e' },
  MISSING_REQUIRED: { label: 'Missing', color: '#e53e3e' },
  SHORT_VALUE: { label: 'Short', color: '#d69e2e' },
  SUSPICIOUS_CHARS: { label: 'Suspect', color: '#9b2c2c' },
  FIELD_OK: { label: 'OK', color: '#38a169' },
};

/** Validate a date string — returns error message or null */
function validateDate(text: string): string | null {
  if (!text.trim()) return null;
  const d = new Date(text);
  if (!isNaN(d.getTime())) return null;
  const parts = text.split(/[\/\-\.]/);
  if (parts.length >= 2 && parts.every(p => /^\d+$/.test(p))) return null;
  return 'Invalid date format';
}

/** Entity type icon helper */
function entityIcon(type: EntityType) {
  switch (type) {
    case 'name': return <IconUser size={14} />;
    case 'date': return <IconCalendar size={14} />;
    case 'number': return <IconHash size={14} />;
    case 'address': return <IconMapPin size={14} />;
    default: return null;
  }
}

interface RecordCardProps {
  idx: number;
  rec: RecordEntry;
  expanded: boolean;
  onAccordionChange: (idx: number, expanded: boolean) => void;
  onToggleSelect: (idx: number) => void;
  onFieldChange: (recordIdx: number, key: string, value: string) => void;
  onClaimToken: (recordIdx: number, fieldKey: string, tokenText: string) => void;
  onSmartFill: (recordIdx: number) => void;
  onFieldFocus?: (fieldKey: string | null) => void;
  onRejectRecord?: (sourceRowIndex: number) => void;
  fields: FieldDef[];
  isFinalized: boolean;
  hasScoring: boolean;
  scoringRow: any;
  getScoringField: (candidateIdx: number, fieldName: string) => any;
  recordCellTokens: CellToken[];
  getAvailableTokens: (fieldKey: string, isDateField: boolean) => CellToken[];
  externalFocusedField?: string | null;
  fieldSuggestions?: SuggestionResult | null;
}

const RecordCard: React.FC<RecordCardProps> = ({
  idx,
  rec,
  expanded,
  onAccordionChange,
  onToggleSelect,
  onFieldChange,
  onClaimToken,
  onSmartFill,
  onFieldFocus,
  onRejectRecord,
  fields,
  isFinalized,
  hasScoring,
  scoringRow,
  getScoringField,
  recordCellTokens,
  getAvailableTokens,
  externalFocusedField,
  fieldSuggestions,
}) => {
  const theme = useTheme();
  const rowFlagged = scoringRow?.needs_review ?? rec.needsReview;
  const rowReasons: string[] = scoringRow?.reasons?.filter((r: string) => r !== 'FIELD_OK') || [];
  const rowScore = scoringRow?.row_score;
  const isCleanRow = hasScoring && !rowFlagged;

  return (
    <Accordion
      key={idx}
      expanded={expanded}
      onChange={(_, exp) => onAccordionChange(idx, exp)}
      variant="outlined"
      disableGutters
      sx={{
        borderRadius: '8px !important',
        '&:before': { display: 'none' },
        ...(isCleanRow && {
          borderColor: 'success.main',
          opacity: expanded ? 1 : 0.7,
        }),
        ...(rowFlagged && hasScoring && {
          borderColor: 'warning.main',
          borderWidth: 2,
        }),
      }}
    >
      <AccordionSummary
        expandIcon={<IconChevronDown size={18} />}
        sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 0.5, my: 0.5, flexWrap: 'wrap' } }}
      >
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={rec.selected}
              onClick={(e) => e.stopPropagation()}
              onChange={() => onToggleSelect(idx)}
              disabled={isFinalized}
            />
          }
          label=""
          sx={{ mr: 0 }}
        />
        <Typography variant="body2" fontWeight={600}>
          Record {idx + 1}
        </Typography>
        {rec.sourceRowIndex >= 0 && (
          <Chip size="small" label={`Row ${rec.sourceRowIndex}`} variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
        )}
        {/* Scoring V2 row score badge */}
        {rowScore !== undefined && rowScore !== null && (
          <Chip
            size="small"
            label={`${Math.round(rowScore * 100)}%`}
            color={rowScore >= 0.85 ? 'success' : rowScore >= 0.60 ? 'warning' : 'error'}
            variant="outlined"
            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
          />
        )}
        {/* Fallback confidence if no scoring */}
        {!hasScoring && rec.confidence > 0 && (
          <Chip
            size="small"
            label={`${Math.round(rec.confidence * 100)}%`}
            color={rec.confidence > 0.7 ? 'success' : rec.confidence > 0.4 ? 'warning' : 'error'}
            variant="outlined"
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        )}
        {/* Clean row check mark */}
        {isCleanRow && (
          <IconCheck size={16} color={theme.palette.success.main} />
        )}
        {/* Reason code badges from scoring_v2 */}
        {rowReasons.length > 0 && rowReasons.map((reason: string, ri: number) => {
          const info = reasonLabel[reason] || { label: reason, color: '#666' };
          return (
            <Chip
              key={ri}
              size="small"
              label={info.label}
              sx={{
                height: 18,
                fontSize: '0.6rem',
                fontWeight: 700,
                bgcolor: info.color,
                color: '#fff',
              }}
            />
          );
        })}
        {/* Fallback warning icon */}
        {!hasScoring && rec.needsReview && (
          <IconAlertTriangle size={16} color={theme.palette.warning.main} />
        )}
        {onRejectRecord && !isFinalized && rec.sourceRowIndex >= 0 && (
          <Tooltip title="Not a record — reject and re-extract">
            <Box
              component="span"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onRejectRecord(rec.sourceRowIndex);
              }}
              sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', ml: 0.5, '&:hover': { color: 'error.main' } }}
            >
              <IconBan size={16} />
            </Box>
          </Tooltip>
        )}
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Stack spacing={1.5}>
          {/* Smart Fill button */}
          {expanded && recordCellTokens.length > 0 && !isFinalized && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<IconWand size={16} />}
              onClick={() => onSmartFill(idx)}
              sx={{ alignSelf: 'flex-start', textTransform: 'none', fontSize: '0.75rem' }}
            >
              Smart Fill ({recordCellTokens.length} tokens)
            </Button>
          )}
          {/* Split warning banner */}
          {expanded && fieldSuggestions?.splitWarning && (
            <Alert severity="warning" sx={{ borderRadius: 1.5, py: 0.5 }}>
              <Typography variant="caption" fontWeight={600}>
                Possible merged records
              </Typography>
              <Typography variant="caption" display="block">
                Found {fieldSuggestions.nameCount} name(s) but this record type expects {fieldSuggestions.expectedNameFields}. This record may contain data from multiple records.
              </Typography>
            </Alert>
          )}
          {fields.map((f) => {
            const isFocused = expanded && externalFocusedField === f.key;
            const showSuggestions = isFocused && fieldSuggestions?.fieldKey === f.key && fieldSuggestions.suggestions.length > 0;
            const isDateField = FIELD_ENTITY_MAP[f.key] === 'date';
            const fieldValue = rec.fields[f.key] || '';
            const dateError = isDateField && fieldValue ? validateDate(fieldValue) : null;
            const fieldScoring = getScoringField(idx, f.key);

            // OCR token chips for this field
            const availableTokens = expanded && recordCellTokens.length > 0
              ? getAvailableTokens(f.key, isDateField)
              : [];

            const fieldFlagReasons = fieldScoring?.reasons?.filter((r: string) => r !== 'FIELD_OK') || [];
            const fieldNeedsReview = fieldScoring?.needs_review && fieldFlagReasons.length > 0;

            return (
              <Box key={f.key} sx={fieldNeedsReview ? {
                borderLeft: '3px solid',
                borderColor: (fieldScoring?.field_score ?? 1) < 0.4 ? 'error.main' : 'warning.main',
                pl: 1,
                borderRadius: 0.5,
              } : undefined}>
                <TextField
                  label={f.label + (f.required ? ' *' : '')}
                  size="small"
                  fullWidth
                  value={fieldValue}
                  onChange={(e) => onFieldChange(idx, f.key, e.target.value)}
                  onFocus={() => onFieldFocus?.(f.key)}
                  onBlur={() => {
                    if (externalFocusedField === f.key) onFieldFocus?.(null);
                  }}
                  disabled={isFinalized}
                  error={!!dateError || (fieldScoring?.field_score !== undefined && fieldScoring.field_score < 0.4)}
                  helperText={dateError || (fieldFlagReasons.length > 0 ? fieldFlagReasons.map((r: string) => reasonLabel[r]?.label || r).join(', ') : undefined)}
                  InputLabelProps={{ shrink: true }}
                  sx={isFocused ? {
                    '& .MuiOutlinedInput-root': {
                      borderColor: 'primary.main',
                      boxShadow: (t: any) => `0 0 0 2px ${t.palette.primary.main}40`,
                    },
                  } : undefined}
                />
                {/* OCR token chips — always visible when record is expanded */}
                {availableTokens.length > 0 && !isFinalized && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {availableTokens.slice(0, 6).map((t, ti) => {
                      const isSelected = fieldValue.trim().toLowerCase() === t.text.toLowerCase();
                      const chipColor = t.confidence != null
                        ? (t.confidence > 0.9 ? 'success' : t.confidence > 0.7 ? 'warning' : 'error')
                        : 'default';
                      return (
                        <Chip
                          key={ti}
                          label={t.text.length > 30 ? t.text.substring(0, 30) + '...' : t.text}
                          size="small"
                          variant={isSelected ? 'filled' : 'outlined'}
                          color={isSelected ? 'primary' : chipColor as any}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => onClaimToken(idx, f.key, t.text)}
                          sx={{
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            height: 24,
                          }}
                        />
                      );
                    })}
                  </Box>
                )}
                {/* Entity-based suggestion chips (shown on focus) */}
                {showSuggestions && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {fieldSuggestions!.suggestions
                      .filter(s => !FIELD_ENTITY_MAP[f.key] || s.entityType === FIELD_ENTITY_MAP[f.key])
                      .slice(0, 4).map((s, si) => (
                      <Chip
                        key={`sug-${si}`}
                        icon={entityIcon(s.entityType) || undefined}
                        label={s.text.length > 35 ? s.text.substring(0, 35) + '...' : s.text}
                        size="small"
                        variant={s.score > 0.6 ? 'filled' : 'outlined'}
                        color={s.score > 0.6 ? 'primary' : 'default'}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onClaimToken(idx, f.key, s.text);
                        }}
                        sx={{
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          height: 24,
                          borderStyle: s.score > 0.6 ? 'solid' : 'dashed',
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default RecordCard;
