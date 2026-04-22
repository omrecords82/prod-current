/**
 * LayoutLearningWizard — Full-screen dialog wizard for defining OCR layout templates.
 *
 * 4-step flow:
 *   1. Define Columns — visual boundary editor on the scanned image
 *   2. Map Fields   — assign each column to a record field
 *   3. Preview      — run extraction with inline bands, show results table
 *   4. Save & Apply — name the template, save it, apply to current job
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  IconArrowLeft,
  IconArrowRight,
  IconDeviceFloppy,
  IconPlayerPlay,
} from '@tabler/icons-react';
import ColumnBoundaryEditor, { type ColumnBand } from './ColumnBoundaryEditor';
import { getFieldsForType, type RecordField } from '../utils/recordFields';
import { apiClient } from '@/shared/lib/axiosInstance';

/* ── Types ─────────────────────────────────────────────────────────────── */

interface RecordCandidatesData {
  candidates: any[];
  detectedType: string;
  typeConfidence: number;
  columnMapping: Record<string, string>;
  unmappedColumns: string[];
  parsedAt: string;
}

interface LayoutLearningWizardProps {
  open: boolean;
  onClose: () => void;
  jobId: number;
  churchId: number;
  imageUrl: string;
  recordType: string;
  onTemplateApplied: (templateId: number, newCandidates: RecordCandidatesData) => void;
}

interface FieldMapping {
  columnIndex: number;
  headerText: string;
  fieldKey: string; // '' means unmapped → notes
}

const STEPS = ['Define Columns', 'Map Fields', 'Preview', 'Save & Apply'];

/* ── Component ─────────────────────────────────────────────────────────── */

const LayoutLearningWizard: React.FC<LayoutLearningWizardProps> = ({
  open,
  onClose,
  jobId,
  churchId,
  imageUrl,
  recordType: initialRecordType,
  onTemplateApplied,
}) => {
  const [activeStep, setActiveStep] = useState(0);

  // Step 1 state: column boundaries
  const [columnBands, setColumnBands] = useState<ColumnBand[]>([
    { start: 0, end: 0.25 },
    { start: 0.25, end: 0.5 },
    { start: 0.5, end: 0.75 },
    { start: 0.75, end: 1.0 },
  ]);
  const [headerY, setHeaderY] = useState(0.12);

  // Step 2 state: field mappings
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [recordType, setRecordType] = useState(initialRecordType || 'baptism');

  // Step 3 state: preview
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Step 4 state: save
  const [templateName, setTemplateName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fields: RecordField[] = useMemo(() => getFieldsForType(recordType), [recordType]);

  // Reset wizard when opened
  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setPreviewResult(null);
      setPreviewError(null);
      setSaveError(null);
      setTemplateName('');
      setSetAsDefault(false);
      setRecordType(initialRecordType || 'baptism');
    }
  }, [open, initialRecordType]);

  // Initialize field mappings when entering step 2
  useEffect(() => {
    if (activeStep === 1) {
      // Build initial mappings — one per column band
      const mappings: FieldMapping[] = columnBands.map((_, idx) => ({
        columnIndex: idx,
        headerText: '', // will be populated after preview if available
        fieldKey: '',
      }));

      // If we already have a preview, try to auto-suggest mappings from header text
      if (previewResult?.extraction?.tables?.[0]?.rows) {
        const headerRow = previewResult.extraction.tables[0].rows.find(
          (r: any) => r.type === 'header',
        );
        if (headerRow?.cells) {
          headerRow.cells.forEach((cell: any, idx: number) => {
            if (idx < mappings.length) {
              mappings[idx].headerText = cell.text || '';
              // Try auto-match against headerHints
              const cellText = (cell.text || '').toLowerCase().trim();
              if (cellText) {
                for (const f of fields) {
                  if (f.headerHints?.some((h) => cellText.includes(h) || h.includes(cellText))) {
                    mappings[idx].fieldKey = f.key;
                    break;
                  }
                }
              }
            }
          });
        }
      }

      setFieldMappings(mappings);
    }
  }, [activeStep, columnBands, previewResult, fields]);

  // Auto-generate template name
  useEffect(() => {
    if (activeStep === 3 && !templateName) {
      const colCount = columnBands.length;
      const typeLabel = recordType.charAt(0).toUpperCase() + recordType.slice(1);
      setTemplateName(`${typeLabel} ${colCount}-column layout`);
    }
  }, [activeStep, columnBands.length, recordType, templateName]);

  /* ── Step navigation ──────────────────────────────────────────────── */

  const handleNext = useCallback(async () => {
    if (activeStep === 2) {
      // Entering preview — run inline extraction
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        // Convert ColumnBand[] to the format the backend expects
        const bandsPayload = columnBands.map((b) => ({
          start: b.start,
          end: b.end,
        }));
        const res: any = await apiClient.post('/api/ocr/layout-templates/preview-inline', {
          job_id: jobId,
          column_bands: bandsPayload,
          header_y_threshold: headerY,
        });
        const data = res?.data || res;
        if (data.success) {
          setPreviewResult(data);
        } else {
          setPreviewError(data.error || 'Preview failed');
        }
      } catch (err: any) {
        setPreviewError(err?.response?.data?.error || err?.message || 'Preview request failed');
      }
      setPreviewLoading(false);
    }
    setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [activeStep, columnBands, headerY, jobId]);

  const handleBack = useCallback(() => {
    setActiveStep((s) => Math.max(s - 1, 0));
  }, []);

  /* ── Step 2: field mapping change ─────────────────────────────────── */

  const handleFieldMappingChange = useCallback((colIdx: number, fieldKey: string) => {
    setFieldMappings((prev) =>
      prev.map((m) => (m.columnIndex === colIdx ? { ...m, fieldKey } : m)),
    );
  }, []);

  /* ── Step 4: Save & Apply ─────────────────────────────────────────── */

  const handleSaveAndApply = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // Build field_mapping object for the template
      const fieldMap: Record<string, string> = {};
      fieldMappings.forEach((m) => {
        if (m.fieldKey) {
          fieldMap[`col_${m.columnIndex + 1}`] = m.fieldKey;
        }
      });

      // 1. Create the layout template
      const createRes: any = await apiClient.post('/api/ocr/layout-templates', {
        name: templateName || 'Untitled Layout',
        church_id: churchId,
        record_type: recordType,
        column_bands: columnBands.map((b) => ({ start: b.start, end: b.end })),
        header_y_threshold: headerY,
        fields: fieldMap,
        is_default: setAsDefault,
      });
      const createData = createRes?.data || createRes;
      const newTemplateId = createData.id || createData.template_id;

      if (!newTemplateId) {
        throw new Error('Template creation did not return an ID');
      }

      // 2. Apply template to current job
      const applyRes: any = await apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${jobId}/apply-template`,
        { template_id: newTemplateId },
      );
      const applyData = applyRes?.data || applyRes;

      if (applyData.success && applyData.recordCandidates) {
        onTemplateApplied(newTemplateId, applyData.recordCandidates);
        onClose();
      } else {
        throw new Error(applyData.error || 'Apply template returned unexpected response');
      }
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || err?.message || 'Save failed');
    }
    setSaving(false);
  }, [templateName, churchId, recordType, columnBands, headerY, fieldMappings, setAsDefault, jobId, onTemplateApplied, onClose]);

  /* ── Preview table data ───────────────────────────────────────────── */

  const previewRows = useMemo(() => {
    if (!previewResult?.extraction?.tables?.[0]?.rows) return [];
    return previewResult.extraction.tables[0].rows.filter((r: any) => r.type === 'row');
  }, [previewResult]);

  const previewHeaders = useMemo(() => {
    // Use field mappings to determine column headers
    return columnBands.map((_, idx) => {
      const mapping = fieldMappings.find((m) => m.columnIndex === idx);
      if (mapping?.fieldKey) {
        const f = fields.find((fd) => fd.key === mapping.fieldKey);
        return f?.label || mapping.fieldKey;
      }
      return `Column ${idx + 1}`;
    });
  }, [columnBands, fieldMappings, fields]);

  /* ── Render ───────────────────────────────────────────────────────── */

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{ sx: { bgcolor: 'background.default' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          Layout Learning Wizard
        </Typography>
        <Stepper activeStep={activeStep} sx={{ mt: 2 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 2 }}>
        {/* ── Step 1: Define Columns ── */}
        {activeStep === 0 && (
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Drag the vertical lines to define column boundaries. Drag the horizontal line to set the header region threshold.
            </Typography>
            <ColumnBoundaryEditor
              imageUrl={imageUrl}
              columnBands={columnBands}
              headerY={headerY}
              onBandsChange={setColumnBands}
              onHeaderYChange={setHeaderY}
            />
          </Box>
        )}

        {/* ── Step 2: Map Fields ── */}
        {activeStep === 1 && (
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Stack spacing={1} sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Assign each column to a record field. Unassigned columns will go to Notes.
              </Typography>
              <FormControl size="small" sx={{ maxWidth: 200 }}>
                <InputLabel>Record Type</InputLabel>
                <Select
                  value={recordType}
                  label="Record Type"
                  onChange={(e) => setRecordType(e.target.value)}
                >
                  <MenuItem value="baptism">Baptism</MenuItem>
                  <MenuItem value="marriage">Marriage</MenuItem>
                  <MenuItem value="funeral">Funeral</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Column</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Header Text</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Map to Field</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fieldMappings.map((m) => (
                    <TableRow key={m.columnIndex}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          Column {m.columnIndex + 1}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(columnBands[m.columnIndex]?.start * 100).toFixed(0)}% –{' '}
                          {(columnBands[m.columnIndex]?.end * 100).toFixed(0)}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontStyle: m.headerText ? 'normal' : 'italic', color: m.headerText ? 'text.primary' : 'text.disabled' }}>
                          {m.headerText || '(run preview to detect)'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={m.fieldKey}
                            displayEmpty
                            onChange={(e) => handleFieldMappingChange(m.columnIndex, e.target.value)}
                          >
                            <MenuItem value="">
                              <em>Unmapped (Notes)</em>
                            </MenuItem>
                            {fields.map((f) => (
                              <MenuItem key={f.key} value={f.key}>
                                {f.label}{f.required ? ' *' : ''}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── Step 3: Preview ── */}
        {activeStep === 2 && (
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {previewLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={28} sx={{ mr: 2 }} />
                <Typography>Running extraction with your column bands...</Typography>
              </Box>
            )}

            {previewError && (
              <Alert severity="error" sx={{ mb: 2 }}>{previewError}</Alert>
            )}

            {!previewLoading && previewResult && (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Extracted {previewResult.extraction?.data_rows || 0} data rows across{' '}
                  {previewResult.extraction?.columns_detected || columnBands.length} columns.
                  Review the results below, then go back to adjust if needed.
                </Alert>

                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                        {previewHeaders.map((h, i) => (
                          <TableCell key={i} sx={{ fontWeight: 700 }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewRows.map((row: any, rIdx: number) => (
                        <TableRow key={rIdx} hover>
                          <TableCell>{rIdx + 1}</TableCell>
                          {(row.cells || []).map((cell: any, cIdx: number) => (
                            <TableCell key={cIdx}>
                              <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {cell.text || ''}
                              </Typography>
                            </TableCell>
                          ))}
                          {/* Pad if fewer cells than columns */}
                          {Array.from({ length: Math.max(0, columnBands.length - (row.cells?.length || 0)) }).map((_, pIdx) => (
                            <TableCell key={`pad-${pIdx}`} />
                          ))}
                        </TableRow>
                      ))}
                      {previewRows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={columnBands.length + 1} align="center">
                            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                              No data rows extracted. Try adjusting column boundaries.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        )}

        {/* ── Step 4: Save & Apply ── */}
        {activeStep === 3 && (
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Stack spacing={3} sx={{ maxWidth: 500 }}>
              <Typography variant="body2" color="text.secondary">
                Name this layout template so it can be reused for similar scanned records.
              </Typography>

              <TextField
                label="Template Name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={setAsDefault}
                    onChange={(e) => setSetAsDefault(e.target.checked)}
                  />
                }
                label="Set as default template for this record type"
              />

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Summary</Typography>
                <Typography variant="body2">
                  {columnBands.length} columns defined, header threshold at {(headerY * 100).toFixed(0)}%
                </Typography>
                <Typography variant="body2">
                  {fieldMappings.filter((m) => m.fieldKey).length} of {columnBands.length} columns mapped to fields
                </Typography>
                {previewResult && (
                  <Typography variant="body2">
                    Preview: {previewResult.extraction?.data_rows || 0} rows extracted
                  </Typography>
                )}
              </Paper>

              {saveError && (
                <Alert severity="error">{saveError}</Alert>
              )}
            </Stack>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        {activeStep > 0 && (
          <Button
            onClick={handleBack}
            startIcon={<IconArrowLeft size={18} />}
            disabled={saving}
          >
            Back
          </Button>
        )}
        {activeStep < STEPS.length - 1 && (
          <Button
            variant="contained"
            onClick={handleNext}
            endIcon={activeStep === 2 ? <IconPlayerPlay size={18} /> : <IconArrowRight size={18} />}
            disabled={activeStep === 0 && columnBands.length === 0}
          >
            {activeStep === 1 ? 'Preview Extraction' : 'Next'}
          </Button>
        )}
        {activeStep === STEPS.length - 1 && (
          <Button
            variant="contained"
            onClick={handleSaveAndApply}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <IconDeviceFloppy size={18} />}
            disabled={saving || !templateName.trim()}
          >
            {saving ? 'Saving...' : 'Save & Apply'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default LayoutLearningWizard;
