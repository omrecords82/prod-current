/**
 * FieldMappingPanel — Multi-record field mapping, review, and batch finalize.
 * Supports N record candidates from table extraction with auto-mapped fields.
 * Falls back to single-record mode when no candidates are available.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { IconSend, IconAlertTriangle, IconColumns, IconSettings } from '@tabler/icons-react';
import { apiClient } from '@/shared/lib/axiosInstance';
import { getCustomFieldsForType } from '../utils/fieldConfig';
import FieldConfigDialog from './FieldConfigDialog';
import { type SuggestionResult } from '../utils/fieldSuggestions';
import RecordCard from './RecordCard';
import ReviewSummaryPanel from './ReviewSummaryPanel';

interface RecordCandidate {
  recordType: string;
  confidence: number;
  fields: Record<string, string>;
  sourceRowIndex: number;
  needsReview: boolean;
}

interface RecordCandidatesData {
  candidates: RecordCandidate[];
  detectedType: string;
  typeConfidence: number;
  columnMapping: Record<string, string>;
  unmappedColumns: string[];
  parsedAt: string;
}

interface RecordEntry {
  recordType: string;
  fields: Record<string, string>;
  selected: boolean;
  needsReview: boolean;
  sourceRowIndex: number;
  confidence: number;
}

/** Token from table extraction cell for chip display */
interface CellToken {
  text: string;
  confidence: number | null;
  columnIndex: number;
  columnKey: string;
}

/** Check if a string looks like a date */
function isDateLike(text: string): boolean {
  return /(?:\d{1,2}[\/\-\.]\d{1,2}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|\d{4})/i.test(text);
}

interface FieldMappingPanelProps {
  jobId: number;
  churchId: number;
  ocrText: string | null;
  ocrResult: any | null;
  tableExtraction: any | null;
  recordCandidates?: RecordCandidatesData | null;
  initialRecordType: string;
  isFinalized: boolean;
  finalizedMeta?: { finalizedAt: string; createdRecordId: number } | null;
  onFinalized?: (result: { recordId: number; recordType: string } | { created_count: number }) => void;
  // Record highlighting integration
  selectedRecordIndex?: number | null;
  onRecordSelect?: (index: number | null) => void;
  focusedField?: string | null;
  onFieldFocus?: (fieldKey: string | null) => void;
  // External field updates from image token interaction
  externalFieldUpdate?: { fieldKey: string; text: string; mode: 'append' | 'replace' } | null;
  onExternalFieldUpdateHandled?: () => void;
  // Layout wizard trigger
  onOpenLayoutWizard?: () => void;
  // Auto-extract loading state
  autoExtracting?: boolean;
  // Field suggestions (intelligent entity detection)
  fieldSuggestions?: SuggestionResult | null;
  // Scoring V2 (field-level scoring with provenance)
  scoringV2?: any | null;
  // Reject record (not a record)
  onRejectRecord?: (sourceRowIndex: number) => void;
}

const FieldMappingPanel: React.FC<FieldMappingPanelProps> = ({
  jobId,
  churchId,
  ocrResult,
  recordCandidates,
  initialRecordType,
  isFinalized: initialIsFinalized,
  finalizedMeta,
  onFinalized,
  selectedRecordIndex: externalSelectedIdx,
  onRecordSelect,
  focusedField: externalFocusedField,
  onFieldFocus,
  externalFieldUpdate,
  onExternalFieldUpdateHandled,
  onOpenLayoutWizard,
  autoExtracting,
  fieldSuggestions,
  scoringV2,
  onRejectRecord,
}) => {
  const theme = useTheme();
  const [recordType, setRecordType] = useState(initialRecordType || 'unknown');
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [finalizing, setFinalizing] = useState(false);
  const [isFinalized, setIsFinalized] = useState(initialIsFinalized);
  const [localFinalizedMeta, setLocalFinalizedMeta] = useState(finalizedMeta || null);
  const [internalExpandedIdx, setInternalExpandedIdx] = useState<number | false>(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  // Use external selection if provided, otherwise internal
  const expandedIdx = externalSelectedIdx !== undefined && externalSelectedIdx !== null
    ? externalSelectedIdx
    : internalExpandedIdx;

  // Flag-first review mode: show only flagged rows by default when scoring_v2 is available
  const [showAllRows, setShowAllRows] = useState(false);

  // Scoring V2 helpers
  const scoringRows = useMemo(() => scoringV2?.rows || [], [scoringV2]);
  const hasScoring = scoringRows.length > 0;

  // Get scoring row for a given candidate index
  const getScoringRow = useCallback((candidateIdx: number) => {
    return scoringRows.find((r: any) => r.candidate_index === candidateIdx) || null;
  }, [scoringRows]);

  // Get scoring field for a given candidate index and field name
  const getScoringField = useCallback((candidateIdx: number, fieldName: string) => {
    const row = getScoringRow(candidateIdx);
    if (!row) return null;
    return row.fields?.find((f: any) => f.field_name === fieldName) || null;
  }, [getScoringRow]);

  // Compute which rows need review based on scoring
  const reviewSummary = useMemo(() => {
    if (!hasScoring) return null;
    const total = scoringRows.length;
    const needReview = scoringRows.filter((r: any) => r.needs_review).length;
    const autoAccepted = total - needReview;
    const totalFields = scoringV2?.summary?.total_fields || 0;
    const fieldsFlagged = scoringV2?.summary?.fields_flagged || 0;
    const pageScore = scoringV2?.page_score_v2 ?? null;
    const recommendation = scoringV2?.routing_recommendation || null;
    return { total, needReview, autoAccepted, totalFields, fieldsFlagged, pageScore, recommendation };
  }, [hasScoring, scoringRows, scoringV2]);

  // Navigation: find next/prev flagged row
  const flaggedRowIndices = useMemo(() => {
    return scoringRows
      .filter((r: any) => r.needs_review)
      .map((r: any) => r.candidate_index);
  }, [scoringRows]);

  const navigateToFlaggedRow = useCallback((direction: 'next' | 'prev') => {
    if (flaggedRowIndices.length === 0) return;
    const currentIdx = typeof expandedIdx === 'number' ? expandedIdx : -1;

    if (direction === 'next') {
      const next = flaggedRowIndices.find((i: number) => i > currentIdx);
      const target = next !== undefined ? next : flaggedRowIndices[0];
      onRecordSelect?.(target);
      setInternalExpandedIdx(target);
    } else {
      const prev = [...flaggedRowIndices].reverse().find((i: number) => i < currentIdx);
      const target = prev !== undefined ? prev : flaggedRowIndices[flaggedRowIndices.length - 1];
      onRecordSelect?.(target);
      setInternalExpandedIdx(target);
    }
  }, [flaggedRowIndices, expandedIdx, onRecordSelect]);

  const handleAccordionChange = useCallback((idx: number, expanded: boolean) => {
    const newVal = expanded ? idx : null;
    if (onRecordSelect) {
      onRecordSelect(newVal);
    }
    setInternalExpandedIdx(expanded ? idx : false);
    if (!expanded) {
      onFieldFocus?.(null);
    }
  }, [onRecordSelect, onFieldFocus]);

  // Handle external field updates (from image token interaction)
  useEffect(() => {
    if (!externalFieldUpdate || expandedIdx === false || expandedIdx === null) return;
    const { fieldKey, text, mode } = externalFieldUpdate;
    const recordIdx = typeof expandedIdx === 'number' ? expandedIdx : 0;

    setRecords((prev) => {
      const next = [...prev];
      if (!next[recordIdx]) return prev;
      const current = next[recordIdx].fields[fieldKey] || '';
      const newValue = mode === 'append'
        ? (current ? current + ' ' + text : text)
        : text;
      next[recordIdx] = {
        ...next[recordIdx],
        fields: { ...next[recordIdx].fields, [fieldKey]: newValue },
      };
      return next;
    });

    onExternalFieldUpdateHandled?.();
  }, [externalFieldUpdate, expandedIdx, onExternalFieldUpdateHandled]);

  // Determine if we have multi-record candidates
  const hasMultiRecords = useMemo(() => {
    return recordCandidates?.candidates && recordCandidates.candidates.length > 0;
  }, [recordCandidates]);

  // Sync external props
  useEffect(() => {
    setRecordType(initialRecordType || 'unknown');
  }, [initialRecordType]);

  useEffect(() => {
    setIsFinalized(initialIsFinalized);
    setLocalFinalizedMeta(finalizedMeta || null);
  }, [initialIsFinalized, finalizedMeta]);

  // Initialize records from candidates or ocrResult
  useEffect(() => {
    if (hasMultiRecords && recordCandidates) {
      const detectedType = recordCandidates.detectedType;
      if (detectedType && detectedType !== 'unknown' && detectedType !== 'custom') {
        setRecordType(detectedType);
      }

      const entries: RecordEntry[] = recordCandidates.candidates.map((c) => ({
        recordType: c.recordType || detectedType || recordType,
        fields: { ...c.fields },
        selected: true,
        needsReview: c.needsReview,
        sourceRowIndex: c.sourceRowIndex,
        confidence: c.confidence,
      }));
      setRecords(entries);
      setInternalExpandedIdx(0);
      onRecordSelect?.(0);
    } else if (ocrResult && typeof ocrResult === 'object' && !ocrResult.finalizedAt) {
      // Single-record fallback from ocrResult
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(ocrResult)) {
        if (typeof v === 'string' || typeof v === 'number') flat[k] = String(v);
      }
      setRecords([{
        recordType: recordType,
        fields: flat,
        selected: true,
        needsReview: true,
        sourceRowIndex: -1,
        confidence: 0,
      }]);
      setInternalExpandedIdx(0);
      onRecordSelect?.(0);
    } else {
      // Empty single-record placeholder
      setRecords([{
        recordType: recordType,
        fields: {},
        selected: true,
        needsReview: true,
        sourceRowIndex: -1,
        confidence: 0,
      }]);
      setInternalExpandedIdx(0);
      onRecordSelect?.(0);
    }
  }, [recordCandidates, ocrResult, jobId]);

  // Claimed values: tracks which token text is assigned to which field across a record
  // Map<normalizedTokenText, fieldKey>
  const [claimedValues, setClaimedValues] = useState<Map<string, string>>(new Map());

  // Extract cell tokens for the currently expanded record from recordCandidates
  const recordCellTokens = useMemo(() => {
    if (!recordCandidates?.candidates) return [];
    const idx = typeof expandedIdx === 'number' ? expandedIdx : 0;
    const candidate = recordCandidates.candidates[idx];
    if (!candidate) return [];

    // All fields in the candidate have auto-mapped values from table extraction cells
    // Build tokens from the candidate's fields + column mapping
    const tokens: CellToken[] = [];
    const mapping = recordCandidates.columnMapping || {};

    // Reverse mapping: field_key → column_key
    const fieldToCol: Record<string, string> = {};
    for (const [colKey, fieldKey] of Object.entries(mapping)) {
      fieldToCol[fieldKey] = colKey;
    }

    // For each field with a value, create a token
    for (const [fieldKey, value] of Object.entries(candidate.fields)) {
      if (!value || !value.trim()) continue;
      const colKey = fieldToCol[fieldKey] || fieldKey;
      const colIdx = parseInt(colKey.replace('col_', '')) - 1;
      tokens.push({
        text: value.trim(),
        confidence: candidate.confidence || null,
        columnIndex: isNaN(colIdx) ? 0 : colIdx,
        columnKey: colKey,
      });
    }

    // Also include unmapped column values if any
    for (const colKey of (recordCandidates.unmappedColumns || [])) {
      const val = candidate.fields[colKey];
      if (val && val.trim()) {
        tokens.push({
          text: val.trim(),
          confidence: null,
          columnIndex: parseInt(colKey.replace('col_', '')) - 1 || 0,
          columnKey: colKey,
        });
      }
    }

    return tokens;
  }, [recordCandidates, expandedIdx]);

  // Handle claiming a token value for a field
  const handleClaimToken = useCallback((recordIdx: number, fieldKey: string, tokenText: string) => {
    setRecords((prev) => {
      const next = [...prev];
      next[recordIdx] = { ...next[recordIdx], fields: { ...next[recordIdx].fields, [fieldKey]: tokenText } };
      return next;
    });
    setClaimedValues((prev) => {
      const next = new Map(prev);
      // Release any previously claimed value for this field
      for (const [text, fk] of next.entries()) {
        if (fk === fieldKey) next.delete(text);
      }
      // Claim new value
      next.set(tokenText.toLowerCase().trim(), fieldKey);
      return next;
    });
  }, []);

  // Get available tokens for a specific field (exclude claimed by other fields)
  const getAvailableTokens = useCallback((fieldKey: string, isDateField: boolean): CellToken[] => {
    let available = recordCellTokens.filter((t) => {
      const claimed = claimedValues.get(t.text.toLowerCase().trim());
      return !claimed || claimed === fieldKey;
    });
    // For date fields, only show date-like tokens
    if (isDateField) {
      available = available.filter((t) => isDateLike(t.text));
    }
    return available;
  }, [recordCellTokens, claimedValues]);

  // Reset claimed values when record changes
  useEffect(() => {
    setClaimedValues(new Map());
  }, [expandedIdx, jobId]);

  const [fieldConfigOpen, setFieldConfigOpen] = useState(false);
  const [fieldConfigVersion, setFieldConfigVersion] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fields = useMemo(() => getCustomFieldsForType(recordType), [recordType, fieldConfigVersion]);
  const selectedCount = records.filter((r) => r.selected).length;

  // Detect if records need review (layout not recognized OR low confidence)
  const needsReview = useMemo(() => {
    if (!recordCandidates) return false;
    const mappedCount = Object.keys(recordCandidates.columnMapping || {}).length;
    const unmappedCount = (recordCandidates.unmappedColumns || []).length;
    const layoutBad = mappedCount === 0 || unmappedCount > mappedCount;
    // Also trigger if average confidence is low
    const candidates = recordCandidates.candidates || [];
    if (candidates.length > 0) {
      const avgConf = candidates.reduce((s: number, c: any) => s + (c.confidence || 0), 0) / candidates.length;
      if (avgConf < 0.7) return true;
    }
    return layoutBad;
  }, [recordCandidates]);

  const handleRecordTypeChange = useCallback(async (newType: string) => {
    setRecordType(newType);
    // Update all records' recordType
    setRecords((prev) => prev.map((r) => ({ ...r, recordType: newType })));
    try {
      await apiClient.patch(`/api/church/${churchId}/ocr/jobs/${jobId}`, { record_type: newType });
    } catch {
      // non-fatal
    }
  }, [jobId]);

  const handleFieldChange = useCallback((recordIdx: number, key: string, value: string) => {
    setRecords((prev) => {
      const next = [...prev];
      next[recordIdx] = { ...next[recordIdx], fields: { ...next[recordIdx].fields, [key]: value } };
      return next;
    });
  }, []);

  const handleToggleSelect = useCallback((recordIdx: number) => {
    setRecords((prev) => {
      const next = [...prev];
      next[recordIdx] = { ...next[recordIdx], selected: !next[recordIdx].selected };
      return next;
    });
  }, []);

  // Smart Fill: distribute OCR tokens across fields by column order
  const handleSmartFill = useCallback((recordIdx: number) => {
    if (!recordCandidates?.candidates) return;
    const candidate = recordCandidates.candidates[recordIdx];
    if (!candidate) return;

    // Sort tokens by column index (left to right)
    const sortedTokens = [...recordCellTokens].sort((a, b) => a.columnIndex - b.columnIndex);
    if (sortedTokens.length === 0) return;

    // Get visible fields for current record type
    const visibleFields = getCustomFieldsForType(recordType);
    if (visibleFields.length === 0) return;

    // Distribute tokens across fields: assign each token to the next field in order
    const newFields: Record<string, string> = {};
    const newClaimed = new Map<string, string>();
    const fieldCount = visibleFields.length;
    const tokenCount = sortedTokens.length;

    // If we have more fields than tokens, assign one token per field from left
    // If we have more tokens than fields, group extras into the last field (notes)
    for (let i = 0; i < Math.min(tokenCount, fieldCount); i++) {
      const fieldKey = visibleFields[i].key;
      newFields[fieldKey] = sortedTokens[i].text;
      newClaimed.set(sortedTokens[i].text.toLowerCase().trim(), fieldKey);
    }

    // Overflow tokens go to the last field (usually 'notes')
    if (tokenCount > fieldCount) {
      const lastField = visibleFields[fieldCount - 1].key;
      const overflow = sortedTokens.slice(fieldCount - 1).map(t => t.text).join(' ');
      newFields[lastField] = overflow;
    }

    setRecords((prev) => {
      const next = [...prev];
      next[recordIdx] = {
        ...next[recordIdx],
        fields: { ...next[recordIdx].fields, ...newFields },
      };
      return next;
    });
    setClaimedValues(newClaimed);
  }, [recordCandidates, recordCellTokens, recordType]);

  // --- Auto-save draft (debounced) ---
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    // Don't auto-save if finalized, no records, or no churchId/jobId
    if (isFinalized || records.length === 0 || !churchId || !jobId) return;

    const serialized = JSON.stringify(records.map(r => r.fields));
    // Skip if nothing changed since last save
    if (serialized === lastSavedRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/save-draft`, {
          records: records.map(r => ({ fields: r.fields, sourceRowIndex: r.sourceRowIndex })),
          recordType,
        });
        lastSavedRef.current = serialized;
      } catch (err) {
        console.warn('[FieldMappingPanel] Auto-save draft failed:', err);
      }
    }, 1500);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [records, isFinalized, churchId, jobId, recordType]);

  const handleFinalize = useCallback(async () => {
    if (isFinalized || recordType === 'unknown') return;

    const selectedRecords = records.filter((r) => r.selected);
    if (selectedRecords.length === 0) {
      setSnackbar({ open: true, message: 'No records selected', severity: 'error' });
      return;
    }

    setFinalizing(true);
    try {
      if (selectedRecords.length === 1) {
        // Single record — use existing endpoint
        const rec = selectedRecords[0];
        const res: any = await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/finalize`, {
          record_type: rec.recordType || recordType,
          mappedFields: rec.fields,
        });
        const data = res?.data || res;
        setIsFinalized(true);
        setLocalFinalizedMeta({ finalizedAt: new Date().toISOString(), createdRecordId: data.createdRecordId });
        setSnackbar({
          open: true,
          message: `Created 1 ${data.record_type} record (record #${data.createdRecordId})`,
          severity: 'success',
        });
        onFinalized?.({ recordId: data.createdRecordId, recordType: data.record_type });
      } else {
        // Batch finalize
        const payload = {
          records: selectedRecords.map((r) => ({
            record_type: r.recordType || recordType,
            mappedFields: r.fields,
          })),
        };
        const res: any = await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/finalize-batch`, payload);
        const data = res?.data || res;
        setIsFinalized(true);
        setLocalFinalizedMeta({ finalizedAt: new Date().toISOString(), createdRecordId: data.created_records?.[0]?.recordId || 0 });
        setSnackbar({
          open: true,
          message: `Created ${data.created_count} record(s) in om_church_${churchId}`,
          severity: 'success',
        });
        onFinalized?.({ created_count: data.created_count });
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err?.response?.data?.error || err?.message || 'Finalize failed',
        severity: 'error',
      });
    }
    setFinalizing(false);
  }, [jobId, churchId, recordType, records, isFinalized, onFinalized]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        <Stack spacing={2}>
          {/* Finalized banner */}
          {isFinalized && localFinalizedMeta && (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Already finalized on {new Date(localFinalizedMeta.finalizedAt).toLocaleString()}
              {localFinalizedMeta.createdRecordId > 0 && <>{' — record #'}{localFinalizedMeta.createdRecordId}</>}
            </Alert>
          )}

          {/* Detection summary */}
          {hasMultiRecords && recordCandidates && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" fontWeight={600}>
                  {recordCandidates.candidates.length} record{recordCandidates.candidates.length !== 1 ? 's' : ''} found
                </Typography>
                {recordCandidates.detectedType && recordCandidates.detectedType !== 'unknown' && (
                  <Chip
                    size="small"
                    label={`${recordCandidates.detectedType} (${Math.round(recordCandidates.typeConfidence * 100)}%)`}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {recordCandidates.unmappedColumns.length > 0 && (
                  <Chip
                    size="small"
                    label={`${recordCandidates.unmappedColumns.length} unmapped col(s)`}
                    color="warning"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Paper>
          )}

          {/* Review Summary (from scoring_v2) */}
          {reviewSummary && (
            <ReviewSummaryPanel
              reviewSummary={reviewSummary}
              flaggedRowIndices={flaggedRowIndices}
              scoringRows={scoringRows}
              expandedIdx={expandedIdx}
              showAllRows={showAllRows}
              setShowAllRows={setShowAllRows}
              navigateToFlaggedRow={navigateToFlaggedRow}
              onRecordSelect={onRecordSelect}
              setInternalExpandedIdx={setInternalExpandedIdx}
            />
          )}

          {/* Auto-extracting loading state */}
          {autoExtracting && (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
              <CircularProgress size={28} sx={{ mb: 1 }} />
              <Typography variant="body2" fontWeight={600}>
                Auto-detecting records...
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Analyzing page layout and extracting record areas
              </Typography>
            </Paper>
          )}

          {/* Records need review banner */}
          {!autoExtracting && needsReview && onOpenLayoutWizard && !isFinalized && (
            <Alert
              severity="warning"
              icon={<IconColumns size={20} />}
              action={
                <Button
                  color="warning"
                  size="small"
                  variant="outlined"
                  onClick={onOpenLayoutWizard}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Review Records
                </Button>
              }
              sx={{ borderRadius: 2 }}
            >
              <Typography variant="body2" fontWeight={600}>
                Records need review
              </Typography>
              <Typography variant="caption">
                Auto-detection may have missed some records or mapped fields incorrectly. Use the guided wizard to verify and improve results.
              </Typography>
            </Alert>
          )}

          {/* Record Type Selector */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <FormControl fullWidth size="small">
                <InputLabel id="fmp-record-type-label">Record Type</InputLabel>
                <Select
                  labelId="fmp-record-type-label"
                  value={recordType}
                  label="Record Type"
                  onChange={(e) => handleRecordTypeChange(e.target.value)}
                  disabled={isFinalized}
                >
                  <MenuItem value="baptism">Baptism</MenuItem>
                  <MenuItem value="marriage">Marriage</MenuItem>
                  <MenuItem value="funeral">Funeral</MenuItem>
                </Select>
              </FormControl>
              <Tooltip title="Configure field labels and visibility">
                <IconButton size="small" onClick={() => setFieldConfigOpen(true)}>
                  <IconSettings size={18} />
                </IconButton>
              </Tooltip>
            </Stack>
            {recordType === 'unknown' && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                Record type could not be determined. Please select one above before finalizing.
              </Typography>
            )}
          </Paper>

          {/* Record Cards */}
          {records.map((rec, idx) => {
            const scoringRow = getScoringRow(idx);
            const rowFlagged = scoringRow?.needs_review ?? rec.needsReview;
            const isCleanRow = hasScoring && !rowFlagged;

            // Flag-first: hide clean rows when not showing all (unless it's the expanded one)
            if (hasScoring && !showAllRows && isCleanRow && expandedIdx !== idx) {
              return null;
            }

            return (
              <RecordCard
                key={idx}
                idx={idx}
                rec={rec}
                expanded={expandedIdx === idx}
                onAccordionChange={handleAccordionChange}
                onToggleSelect={handleToggleSelect}
                onFieldChange={handleFieldChange}
                onClaimToken={handleClaimToken}
                onSmartFill={handleSmartFill}
                onFieldFocus={onFieldFocus}
                onRejectRecord={onRejectRecord}
                fields={fields}
                isFinalized={isFinalized}
                hasScoring={hasScoring}
                scoringRow={scoringRow}
                getScoringField={getScoringField}
                recordCellTokens={recordCellTokens}
                getAvailableTokens={getAvailableTokens}
                externalFocusedField={externalFocusedField}
                fieldSuggestions={fieldSuggestions}
              />
            );
          })}
        </Stack>
      </Box>

      {/* Finalize button */}
      <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button
          variant="contained"
          fullWidth
          disabled={finalizing || isFinalized || recordType === 'unknown' || selectedCount === 0}
          onClick={handleFinalize}
          startIcon={finalizing ? <CircularProgress size={16} color="inherit" /> : <IconSend size={18} />}
          sx={{ fontWeight: 700, py: 1.2 }}
        >
          {finalizing
            ? 'Finalizing...'
            : isFinalized
              ? 'Already Finalized'
              : `Finalize ${selectedCount} Selected Record${selectedCount !== 1 ? 's' : ''}`}
        </Button>
      </Box>

      <FieldConfigDialog
        open={fieldConfigOpen}
        onClose={() => setFieldConfigOpen(false)}
        recordType={recordType}
        onSaved={() => setFieldConfigVersion(v => v + 1)}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FieldMappingPanel;
