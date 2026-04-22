/**
 * RecordReviewWizard — Guided step-by-step record review with learning.
 *
 * 4 Phases:
 *   1. Auto-Detect: Shows all detected record boxes on the image
 *   2. Guided Review: One record at a time — confirm, adjust, or reject
 *   3. Learning Checkpoint: Computes learned params, re-detects remaining
 *   4. Bulk Confirm: Review all remaining records, bulk approve
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Paper,
  Slider,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  IconCheck,
  IconX,
  IconAdjustments,
  IconBrain,
  IconArrowRight,
  IconArrowLeft,
  IconZoomIn,
  IconZoomOut,
  IconMaximize,
  IconDeviceFloppy,
} from '@tabler/icons-react';
import FusionOverlay from './FusionOverlay';
import type { OverlayBox } from './FusionOverlay';
import type { BBox } from '../types/fusion';
import { apiClient } from '@/shared/lib/axiosInstance';
import { getFieldsForType } from '../utils/recordFields';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEARNING_THRESHOLD = 3;
const PHASE_LABELS = ['Auto-Detect', 'Guided Review', 'Learning', 'Bulk Confirm'];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecordCandidatesData {
  candidates: Array<{
    recordType: string;
    confidence: number;
    fields: Record<string, string>;
    sourceRowIndex: number;
    needsReview: boolean;
  }>;
  detectedType: string;
  typeConfidence: number;
  columnMapping: Record<string, string>;
  unmappedColumns: string[];
  parsedAt: string;
}

interface FractionalBBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

interface ReviewableRecord {
  index: number;
  candidate: RecordCandidatesData['candidates'][0];
  visionBbox: BBox;
  fractionalBbox: FractionalBBox;
  status: 'pending' | 'confirmed' | 'rejected' | 'auto-confirmed';
  wasAdjusted: boolean;
}

interface LearnedParams {
  avgRowHeight: number;
  avgRowSpacing: number;
  headerYThreshold: number;
  mergeThreshold: number;
  columnBands: Record<string, number[]>;
  confidence: number;
}

interface RecordReviewWizardProps {
  open: boolean;
  onClose: () => void;
  jobId: number;
  churchId: number;
  imageUrl: string;
  recordType: string;
  initialRecordCandidates: RecordCandidatesData | null;
  initialTableExtraction: any | null;
  onReviewComplete: (candidates: RecordCandidatesData, tableExtraction: any, templateId?: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const RecordReviewWizard: React.FC<RecordReviewWizardProps> = ({
  open,
  onClose,
  jobId,
  churchId,
  imageUrl,
  recordType,
  initialRecordCandidates,
  initialTableExtraction,
  onReviewComplete,
}) => {
  const theme = useTheme();

  // Phase state
  const [phase, setPhase] = useState(0); // 0=auto-detect, 1=guided, 2=learning, 3=bulk
  const [records, setRecords] = useState<ReviewableRecord[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [adjustingBbox, setAdjustingBbox] = useState(false);

  // Table extraction state (may be updated after learning)
  const [tableExtraction, setTableExtraction] = useState<any>(null);
  const [candidatesData, setCandidatesData] = useState<RecordCandidatesData | null>(null);

  // Learning
  const [learnedParams, setLearnedParams] = useState<LearnedParams | null>(null);
  const [learning, setLearning] = useState(false);

  // Bulk confirm
  const [saveAsTemplate, setSaveAsTemplate] = useState(true);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);

  // Image viewer
  const imageRef = useRef<HTMLImageElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Per-record crop + debug
  const [showDebug, setShowDebug] = useState(false);
  const [recordCropUrl, setRecordCropUrl] = useState<string | null>(null);
  const [perRecordExtract, setPerRecordExtract] = useState<any>(null);
  const isSuperAdmin = true; // TODO: wire from session context

  // Derived
  const pageDims = tableExtraction?.page_dimensions;
  const confirmedCount = records.filter(r => r.status === 'confirmed' || r.status === 'auto-confirmed').length;
  const rejectedCount = records.filter(r => r.status === 'rejected').length;
  const pendingCount = records.filter(r => r.status === 'pending').length;
  const currentRecord = records.find(r => r.status === 'pending');

  // ---------------------------------------------------------------------------
  // Initialization: populate records from initial data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;

    // Reset state on open
    setPhase(0);
    setCurrentReviewIndex(0);
    setAdjustingBbox(false);
    setLearnedParams(null);
    setLearning(false);
    setSaveAsTemplate(true);
    setSaving(false);
    setZoom(100);
    setImageLoaded(false);

    setTableExtraction(initialTableExtraction);
    setCandidatesData(initialRecordCandidates);

    if (initialRecordCandidates?.candidates?.length && initialTableExtraction) {
      const dims = initialTableExtraction.page_dimensions;
      const tables = initialTableExtraction.tables || [];

      const reviewables: ReviewableRecord[] = initialRecordCandidates.candidates.map((candidate, idx) => {
        // Compute union bbox from table cells for this row (or row range for assembled records)
        let fb = computeRowBbox(candidate.sourceRowIndex, tables, candidate.sourceRowEnd);
        if (!fb) {
          fb = { x_min: 0.05, y_min: 0.1 + idx * 0.04, x_max: 0.95, y_max: 0.14 + idx * 0.04 };
        }
        return {
          index: idx,
          candidate,
          visionBbox: fractionalToVision(fb, dims),
          fractionalBbox: fb,
          status: 'pending' as const,
          wasAdjusted: false,
        };
      });

      setRecords(reviewables);
      setTemplateName(`${recordType} learned layout`);
    } else {
      setRecords([]);
    }
  }, [open, initialRecordCandidates, initialTableExtraction, recordType]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function computeRowBbox(sourceRowIndex: number, tables: any[], sourceRowEnd?: number): FractionalBBox | null {
    const rowEnd = sourceRowEnd ?? sourceRowIndex;
    let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
    let found = false;
    for (const table of tables) {
      for (const row of table.rows || []) {
        if (row.row_index < sourceRowIndex || row.row_index > rowEnd) continue;
        for (const cell of row.cells || []) {
          if (cell.bbox?.length === 4) {
            found = true;
            xMin = Math.min(xMin, cell.bbox[0]);
            yMin = Math.min(yMin, cell.bbox[1]);
            xMax = Math.max(xMax, cell.bbox[2]);
            yMax = Math.max(yMax, cell.bbox[3]);
          }
        }
      }
    }
    return found ? { x_min: xMin, y_min: yMin, x_max: xMax, y_max: yMax } : null;
  }

  function fractionalToVision(fb: FractionalBBox, dims: { width: number; height: number }): BBox {
    return {
      x: fb.x_min * dims.width,
      y: fb.y_min * dims.height,
      w: (fb.x_max - fb.x_min) * dims.width,
      h: (fb.y_max - fb.y_min) * dims.height,
    };
  }

  function visionToFractional(bbox: BBox, dims: { width: number; height: number }): FractionalBBox {
    return {
      x_min: bbox.x / dims.width,
      y_min: bbox.y / dims.height,
      x_max: (bbox.x + bbox.w) / dims.width,
      y_max: (bbox.y + bbox.h) / dims.height,
    };
  }

  // ---------------------------------------------------------------------------
  // Load per-record crop image + extract when current record changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 1 || !currentRecord) {
      setRecordCropUrl(null);
      setPerRecordExtract(null);
      return;
    }

    const recordIdx = currentRecord.index;
    // Build crop URL (the endpoint streams the PNG)
    const cropUrl = `/api/church/${churchId}/ocr/jobs/${jobId}/record-crop/${recordIdx}`;
    setRecordCropUrl(cropUrl);

    // Load per-record extract data if available (from debug endpoint)
    if (showDebug) {
      apiClient.get(`/church/${churchId}/ocr/jobs/${jobId}/debug?page=0`)
        .then(resp => {
          const artifacts = resp.data?.artifacts || {};
          const manifest = artifacts.record_crops_manifest;
          if (manifest?.records) {
            const rec = manifest.records.find((r: any) => r.recordIndex === recordIdx);
            setPerRecordExtract(rec || null);
          }
        })
        .catch(() => setPerRecordExtract(null));
    }
  }, [phase, currentRecord?.index, showDebug, churchId, jobId]);

  // ---------------------------------------------------------------------------
  // Auto-scroll to current record
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 1 || !currentRecord || !imageRef.current || !scrollContainerRef.current || !imageLoaded) return;

    const img = imageRef.current;
    const container = scrollContainerRef.current;
    const dims = pageDims;
    if (!dims) return;

    const scale = zoom / 100;
    const imgDisplayW = img.clientWidth * scale;
    const imgDisplayH = img.clientHeight * scale;

    // Convert vision bbox to pixel position on the scaled image
    const scaleX = imgDisplayW / dims.width;
    const scaleY = imgDisplayH / dims.height;

    const boxTop = currentRecord.visionBbox.y * scaleY;
    const boxHeight = currentRecord.visionBbox.h * scaleY;
    const boxCenterY = boxTop + boxHeight / 2;

    // Scroll to center the box vertically
    const containerH = container.clientHeight;
    container.scrollTop = Math.max(0, boxCenterY - containerH / 2);
  }, [phase, currentRecord, zoom, imageLoaded, pageDims]);

  // ---------------------------------------------------------------------------
  // Phase 1→2 transition
  // ---------------------------------------------------------------------------
  const handleStartReview = useCallback(() => {
    if (records.length === 0) return;
    setPhase(1);
  }, [records.length]);

  // ---------------------------------------------------------------------------
  // Phase 2: Guided review actions
  // ---------------------------------------------------------------------------
  const handleConfirm = useCallback(() => {
    if (!currentRecord) return;
    setRecords(prev => prev.map(r =>
      r.index === currentRecord.index ? { ...r, status: 'confirmed' as const } : r
    ));
    setAdjustingBbox(false);
  }, [currentRecord]);

  const handleReject = useCallback(() => {
    if (!currentRecord) return;
    setRecords(prev => prev.map(r =>
      r.index === currentRecord.index ? { ...r, status: 'rejected' as const } : r
    ));
    setAdjustingBbox(false);
  }, [currentRecord]);

  const handleStartAdjust = useCallback(() => {
    setAdjustingBbox(true);
  }, []);

  const handleBboxChangeEnd = useCallback(async (newVisionBbox: BBox) => {
    if (!currentRecord || !pageDims) return;
    const newFractional = visionToFractional(newVisionBbox, pageDims);

    // Call reextract-row to get updated fields
    try {
      const res: any = await apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${jobId}/reextract-row`,
        { recordIndex: currentRecord.index, bbox: newFractional }
      );
      const data = res?.data ?? res;

      setRecords(prev => prev.map(r => {
        if (r.index !== currentRecord.index) return r;
        return {
          ...r,
          visionBbox: newVisionBbox,
          fractionalBbox: newFractional,
          wasAdjusted: true,
          candidate: {
            ...r.candidate,
            fields: data?.success ? { ...r.candidate.fields, ...data.fields } : r.candidate.fields,
          },
        };
      }));
    } catch (err) {
      console.warn('[RecordReviewWizard] reextract-row failed:', err);
      // Still update the bbox even if reextract fails
      setRecords(prev => prev.map(r => {
        if (r.index !== currentRecord.index) return r;
        return { ...r, visionBbox: newVisionBbox, fractionalBbox: newFractional, wasAdjusted: true };
      }));
    }
  }, [currentRecord, pageDims, churchId, jobId]);

  // Auto-transition to learning after enough confirmations
  useEffect(() => {
    if (phase !== 1) return;
    const confirmed = records.filter(r => r.status === 'confirmed');
    if (confirmed.length >= LEARNING_THRESHOLD && pendingCount > 0 && !learning) {
      setPhase(2);
    }
  }, [phase, records, pendingCount, learning]);

  // ---------------------------------------------------------------------------
  // Phase 3: Learning checkpoint
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 2 || learning) return;

    const runLearning = async () => {
      setLearning(true);
      try {
        const confirmed = records.filter(r => r.status === 'confirmed');
        const rejected = records.filter(r => r.status === 'rejected');

        const res: any = await apiClient.post(
          `/api/church/${churchId}/ocr/jobs/${jobId}/learn-from-confirmations`,
          {
            confirmedRecords: confirmed.map(r => ({
              sourceRowIndex: r.candidate.sourceRowIndex,
              bbox: r.fractionalBbox,
              wasAdjusted: r.wasAdjusted,
            })),
            rejectedRowIndices: rejected.map(r => r.candidate.sourceRowIndex),
          }
        );
        const data = res?.data ?? res;

        if (data?.success) {
          setLearnedParams(data.learnedParams);
          setTableExtraction(data.tableExtraction);
          setCandidatesData(data.recordCandidates);

          // Rebuild records: keep confirmed/rejected, replace pending with new candidates
          const confirmedIndices = new Set(confirmed.map(r => r.candidate.sourceRowIndex));
          const rejectedIndices = new Set(rejected.map(r => r.candidate.sourceRowIndex));
          const dims = data.tableExtraction.page_dimensions;
          const tables = data.tableExtraction.tables || [];

          const newRecords: ReviewableRecord[] = [];
          // Keep user-confirmed records
          for (const r of records) {
            if (r.status === 'confirmed' || r.status === 'rejected') {
              newRecords.push(r);
            }
          }
          // Add new candidates from learning (that weren't already reviewed)
          for (let i = 0; i < data.recordCandidates.candidates.length; i++) {
            const c = data.recordCandidates.candidates[i];
            if (confirmedIndices.has(c.sourceRowIndex) || rejectedIndices.has(c.sourceRowIndex)) continue;
            const fb = computeRowBbox(c.sourceRowIndex, tables, c.sourceRowEnd) ||
              { x_min: 0.05, y_min: 0.1 + i * 0.04, x_max: 0.95, y_max: 0.14 + i * 0.04 };
            newRecords.push({
              index: newRecords.length,
              candidate: c,
              visionBbox: fractionalToVision(fb, dims),
              fractionalBbox: fb,
              status: 'auto-confirmed',
              wasAdjusted: false,
            });
          }

          setRecords(newRecords);
          console.log(`[RecordReviewWizard] Learning complete: ${data.recordCandidates.candidates.length} total, ${confirmed.length} kept`);
        }
      } catch (err) {
        console.error('[RecordReviewWizard] Learning failed:', err);
      } finally {
        setLearning(false);
        setPhase(3); // Move to bulk confirm
      }
    };

    runLearning();
  }, [phase, learning, records, churchId, jobId]);

  // ---------------------------------------------------------------------------
  // Phase 4: Bulk confirm actions
  // ---------------------------------------------------------------------------
  const handleToggleBulkRecord = useCallback((idx: number) => {
    setRecords(prev => prev.map(r => {
      if (r.index !== idx) return r;
      if (r.status === 'confirmed' || r.status === 'rejected') return r; // Don't toggle already-reviewed
      return { ...r, status: r.status === 'auto-confirmed' ? 'rejected' as const : 'auto-confirmed' as const };
    }));
  }, []);

  const handleFinalizeReview = useCallback(async () => {
    setSaving(true);
    try {
      const confirmed = records.filter(r => r.status === 'confirmed' || r.status === 'auto-confirmed');
      const rejected = records.filter(r => r.status === 'rejected');

      const res: any = await apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${jobId}/finalize-review`,
        {
          confirmedIndices: confirmed.map(r => r.index),
          rejectedIndices: rejected.map(r => r.index),
          learnedParams,
          saveAsTemplate,
          templateName: saveAsTemplate ? templateName : undefined,
        }
      );
      const data = res?.data ?? res;

      if (data?.success) {
        onReviewComplete(data.recordCandidates, tableExtraction, data.templateId || undefined);
        onClose();
      }
    } catch (err) {
      console.error('[RecordReviewWizard] Finalize failed:', err);
    } finally {
      setSaving(false);
    }
  }, [records, churchId, jobId, learnedParams, saveAsTemplate, templateName, tableExtraction, onReviewComplete, onClose]);

  // ---------------------------------------------------------------------------
  // Overlay boxes computation
  // ---------------------------------------------------------------------------
  const overlayBoxes: OverlayBox[] = useMemo(() => {
    if (!pageDims) return [];
    return records.map((r) => {
      const isCurrent = phase === 1 && currentRecord?.index === r.index;
      const isConfirmed = r.status === 'confirmed' || r.status === 'auto-confirmed';
      const isRejected = r.status === 'rejected';

      let color = 'hsl(210, 70%, 50%)'; // pending: blue
      if (isConfirmed) color = 'hsl(120, 70%, 40%)'; // green
      if (isRejected) color = 'hsl(0, 70%, 50%)'; // red
      if (isCurrent) color = 'hsl(45, 90%, 50%)'; // gold for current

      return {
        bbox: r.visionBbox,
        color,
        label: `Record ${r.index + 1}`,
        selected: isCurrent,
        emphasized: isCurrent,
        editable: isCurrent && adjustingBbox,
        onBboxChangeEnd: isCurrent && adjustingBbox
          ? (newBbox: BBox) => handleBboxChangeEnd(newBbox)
          : undefined,
        onClick: phase === 3 && r.status !== 'confirmed' && r.status !== 'rejected'
          ? () => handleToggleBulkRecord(r.index)
          : undefined,
      };
    });
  }, [records, phase, currentRecord, adjustingBbox, pageDims, handleBboxChangeEnd, handleToggleBulkRecord]);

  // ---------------------------------------------------------------------------
  // Field display for current record
  // ---------------------------------------------------------------------------
  const currentFields = useMemo(() => {
    if (!currentRecord) return [];
    const fields = getFieldsForType(recordType);
    return fields.map(f => ({
      key: f.key,
      label: f.label,
      value: currentRecord.candidate.fields[f.key] || '',
    })).filter(f => f.value); // Only show non-empty fields
  }, [currentRecord, recordType]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <DialogTitle sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={700}>Record Review Wizard</Typography>
          <IconButton onClick={onClose} size="small"><IconX size={20} /></IconButton>
        </Stack>
        <Stepper activeStep={phase} alternativeLabel sx={{ mt: 1 }}>
          {PHASE_LABELS.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Image Viewer */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid', borderColor: 'divider' }}>
          {/* Zoom controls */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Tooltip title="Zoom Out"><IconButton size="small" onClick={() => setZoom(z => Math.max(25, z - 25))}><IconZoomOut size={18} /></IconButton></Tooltip>
            <Slider value={zoom} onChange={(_, v) => setZoom(v as number)} min={25} max={300} step={5} sx={{ width: 120 }} size="small" />
            <Tooltip title="Zoom In"><IconButton size="small" onClick={() => setZoom(z => Math.min(300, z + 25))}><IconZoomIn size={18} /></IconButton></Tooltip>
            <Tooltip title="Fit"><IconButton size="small" onClick={() => setZoom(100)}><IconMaximize size={18} /></IconButton></Tooltip>
            <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>{zoom}%</Typography>
          </Stack>
          {/* Image + Overlay */}
          <Box ref={scrollContainerRef} sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <img
                ref={imageRef}
                src={imageUrl}
                alt="OCR scan"
                draggable={false}
                onLoad={() => setImageLoaded(true)}
                style={{
                  maxWidth: '100%',
                  display: 'block',
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top left',
                  userSelect: 'none',
                }}
              />
              {imageRef.current && imageLoaded && (
                <FusionOverlay
                  boxes={overlayBoxes}
                  imageElement={imageRef.current}
                  visionWidth={pageDims?.width || imageRef.current.naturalWidth || 0}
                  visionHeight={pageDims?.height || imageRef.current.naturalHeight || 0}
                  showLabels
                  editMode={adjustingBbox}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Right: Phase-specific panel */}
        <Box sx={{ width: 380, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* ---- Phase 0: Auto-Detect Summary ---- */}
          {phase === 0 && (
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
              <Typography variant="h6" fontWeight={700}>Records Detected</Typography>
              {records.length > 0 ? (
                <>
                  <Alert severity="success">
                    Found <strong>{records.length}</strong> potential record{records.length !== 1 ? 's' : ''} on this page.
                  </Alert>
                  <Typography variant="body2" color="text.secondary">
                    Click "Start Review" to verify each record one at a time. After confirming {LEARNING_THRESHOLD} records,
                    the system will learn the pattern and auto-detect the rest.
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Stack spacing={1}>
                      <Typography variant="body2"><strong>Record type:</strong> {recordType}</Typography>
                      <Typography variant="body2"><strong>Columns detected:</strong> {tableExtraction?.columns_detected || '?'}</Typography>
                      <Typography variant="body2"><strong>Data rows:</strong> {tableExtraction?.data_rows || '?'}</Typography>
                    </Stack>
                  </Paper>
                </>
              ) : (
                <Alert severity="warning">
                  No records could be auto-detected. You may need to use the manual Layout Wizard.
                </Alert>
              )}
            </Box>
          )}

          {/* ---- Phase 1: Guided Review ---- */}
          {phase === 1 && (
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, height: '100%', overflow: 'auto' }}>
              {/* Progress */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" fontWeight={700}>
                    Record {confirmedCount + rejectedCount + 1} of {records.length}
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    <Chip size="small" label={`${confirmedCount} confirmed`} color="success" variant="outlined" />
                    {rejectedCount > 0 && <Chip size="small" label={`${rejectedCount} rejected`} color="error" variant="outlined" />}
                  </Stack>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={((confirmedCount + rejectedCount) / records.length) * 100}
                  sx={{ mt: 1, borderRadius: 1, height: 6 }}
                />
              </Box>

              {currentRecord ? (
                <>
                  {/* Question */}
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    <Typography variant="body2" fontWeight={600}>Is this a record?</Typography>
                    <Typography variant="caption">
                      The highlighted area on the image shows the detected record. You can adjust the boundary if it's incorrect.
                    </Typography>
                  </Alert>

                  {/* Extracted fields preview */}
                  {currentFields.length > 0 && (
                    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                      <Typography variant="caption" fontWeight={600} sx={{ px: 1.5, py: 0.75, display: 'block', bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
                        Extracted Fields
                      </Typography>
                      <Table size="small">
                        <TableBody>
                          {currentFields.map(f => (
                            <TableRow key={f.key}>
                              <TableCell sx={{ py: 0.5, fontWeight: 600, width: '40%', fontSize: '0.75rem' }}>
                                {f.label}
                              </TableCell>
                              <TableCell sx={{ py: 0.5, fontSize: '0.75rem' }}>
                                {f.value}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Paper>
                  )}

                  {/* Per-record crop preview */}
                  {recordCropUrl && (
                    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                      <Typography variant="caption" fontWeight={600} sx={{ px: 1.5, py: 0.75, display: 'block', bgcolor: alpha(theme.palette.info.main, 0.08) }}>
                        Record Crop
                      </Typography>
                      <Box sx={{ p: 1, textAlign: 'center', maxHeight: 200, overflow: 'auto' }}>
                        <img
                          src={recordCropUrl}
                          alt={`Record ${currentRecord?.index} crop`}
                          style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 4 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </Box>
                    </Paper>
                  )}

                  {/* Per-record contamination warning */}
                  {currentRecord?.candidate?._perRecordFlag && (
                    <Alert severity={currentRecord.candidate._perRecordFlag === 'contamination_warning' ? 'warning' : 'error'} sx={{ borderRadius: 2 }}>
                      <Typography variant="caption" fontWeight={600}>
                        {currentRecord.candidate._perRecordFlag === 'contamination_warning' ? 'Possible header contamination' : currentRecord.candidate._perRecordFlag}
                      </Typography>
                      {currentRecord.candidate._perRecordNote && (
                        <Typography variant="caption" display="block">{currentRecord.candidate._perRecordNote}</Typography>
                      )}
                    </Alert>
                  )}

                  {/* Debug toggle (super_admin only) */}
                  {isSuperAdmin && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        variant={showDebug ? 'contained' : 'text'}
                        color="inherit"
                        onClick={() => setShowDebug(prev => !prev)}
                        sx={{ fontSize: '0.65rem', textTransform: 'none', opacity: 0.6 }}
                      >
                        {showDebug ? 'Hide Debug' : 'Debug'}
                      </Button>
                    </Box>
                  )}

                  {/* Debug info panel */}
                  {showDebug && perRecordExtract && (
                    <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.5, bgcolor: '#f5f5f5', fontSize: '0.7rem', fontFamily: 'monospace', overflow: 'auto', maxHeight: 200 }}>
                      <Typography variant="caption" fontWeight={700} display="block" gutterBottom>Per-Record Debug</Typography>
                      <div>Status: {perRecordExtract.status}</div>
                      <div>Tokens: {perRecordExtract.tokenCount}</div>
                      {perRecordExtract.yBand && (
                        <div>Y-band: {perRecordExtract.yBand.yMinNorm?.toFixed(3)} → {perRecordExtract.yBand.yMaxNorm?.toFixed(3)}</div>
                      )}
                      {perRecordExtract.cropPath && <div>Crop: {perRecordExtract.cropPath.split('/').pop()}</div>}
                    </Paper>
                  )}

                  {/* Adjust mode indicator */}
                  {adjustingBbox && (
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                      <Typography variant="caption">
                        Drag the handles on the image to adjust the record boundary, then click Confirm.
                      </Typography>
                    </Alert>
                  )}

                  {/* Action buttons */}
                  <Stack spacing={1} sx={{ mt: 'auto' }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<IconCheck size={18} />}
                      onClick={handleConfirm}
                      fullWidth
                      sx={{ fontWeight: 700 }}
                    >
                      Confirm
                    </Button>
                    {!adjustingBbox && (
                      <Button
                        variant="outlined"
                        color="warning"
                        startIcon={<IconAdjustments size={18} />}
                        onClick={handleStartAdjust}
                        fullWidth
                      >
                        Adjust Boundary
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<IconX size={18} />}
                      onClick={handleReject}
                      fullWidth
                    >
                      Not a Record
                    </Button>
                  </Stack>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" fontWeight={600}>All records reviewed!</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {confirmedCount} confirmed, {rejectedCount} rejected
                  </Typography>
                  <Button
                    variant="contained"
                    sx={{ mt: 2 }}
                    onClick={() => setPhase(3)}
                  >
                    Continue to Final Review
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* ---- Phase 2: Learning Checkpoint ---- */}
          {phase === 2 && (
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
              <IconBrain size={48} color={theme.palette.primary.main} />
              <Typography variant="h6" fontWeight={700}>Learning from your reviews...</Typography>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Analyzing {confirmedCount} confirmed record{confirmedCount !== 1 ? 's' : ''} to learn row height, spacing,
                and column patterns. This will improve detection for the remaining records.
              </Typography>
            </Box>
          )}

          {/* ---- Phase 3: Bulk Confirm ---- */}
          {phase === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={700}>Final Review</Typography>
                {learnedParams && (
                  <Alert severity="success" sx={{ mt: 1, borderRadius: 2, py: 0.5 }}>
                    <Typography variant="caption">
                      Learned pattern applied. Row height: {(learnedParams.avgRowHeight * 100).toFixed(1)}% of page.
                    </Typography>
                  </Alert>
                )}
                <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                  <Chip size="small" label={`${confirmedCount} confirmed`} color="success" variant="filled" />
                  {rejectedCount > 0 && <Chip size="small" label={`${rejectedCount} rejected`} color="error" variant="filled" />}
                  <Chip size="small" label={`${records.filter(r => r.status === 'auto-confirmed').length} auto-detected`} color="info" variant="filled" />
                </Stack>
              </Box>

              {/* Record list */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                {records.map((r) => (
                  <Paper
                    key={r.index}
                    variant="outlined"
                    sx={{
                      p: 1,
                      mb: 0.5,
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      opacity: r.status === 'rejected' ? 0.5 : 1,
                      bgcolor: r.status === 'confirmed' ? alpha(theme.palette.success.main, 0.05)
                        : r.status === 'auto-confirmed' ? alpha(theme.palette.info.main, 0.05)
                        : r.status === 'rejected' ? alpha(theme.palette.error.main, 0.05)
                        : 'transparent',
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={r.status === 'confirmed' || r.status === 'auto-confirmed'}
                      disabled={r.status === 'confirmed' || r.status === 'rejected'} // Can't toggle user-reviewed
                      onChange={() => handleToggleBulkRecord(r.index)}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" fontWeight={600}>
                        Record {r.index + 1}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                        {Object.values(r.candidate.fields).filter(Boolean).slice(0, 3).join(' | ')}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={r.status === 'confirmed' ? 'Confirmed' : r.status === 'auto-confirmed' ? 'Auto' : r.status === 'rejected' ? 'Rejected' : 'Pending'}
                      color={r.status === 'confirmed' ? 'success' : r.status === 'auto-confirmed' ? 'info' : r.status === 'rejected' ? 'error' : 'default'}
                      variant="outlined"
                      sx={{ fontSize: '0.65rem', height: 20 }}
                    />
                  </Paper>
                ))}
              </Box>

              {/* Template save option */}
              <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <FormControlLabel
                  control={<Checkbox size="small" checked={saveAsTemplate} onChange={(_, v) => setSaveAsTemplate(v)} />}
                  label={<Typography variant="body2">Save as reusable template</Typography>}
                />
                {saveAsTemplate && (
                  <TextField
                    size="small"
                    fullWidth
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Template name"
                    sx={{ mt: 1 }}
                  />
                )}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', px: 3, py: 1.5 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Box sx={{ flex: 1 }} />

        {phase === 0 && records.length > 0 && (
          <Button
            variant="contained"
            endIcon={<IconArrowRight size={18} />}
            onClick={handleStartReview}
          >
            Start Review
          </Button>
        )}

        {phase === 3 && (
          <Button
            variant="contained"
            color="success"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <IconDeviceFloppy size={18} />}
            onClick={handleFinalizeReview}
            disabled={saving || confirmedCount === 0}
          >
            {saving ? 'Saving...' : `Confirm ${confirmedCount} Record${confirmedCount !== 1 ? 's' : ''}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default RecordReviewWizard;
