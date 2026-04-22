/**
 * OcrWorkbench - Main workbench container for OCR job processing
 * Two-phase UI: (1) Jobs List, (2) Workbench for selected job
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import { useOcrJobs } from '../../hooks/useOcrJobs';
import { useWorkbench } from '../../context/WorkbenchContext';
import WorkbenchHeader from './WorkbenchHeader';

import WorkbenchViewer from './WorkbenchViewer';
import UnifiedJobsList from './UnifiedJobsList';
import RecordReviewWizard from '../RecordReviewWizard';
import { extractTextFromVisionResponse } from '../../utils/displayNormalizer';
import { detectMetadata } from '../../utils/recordTypeDetector';
import { useServerNormalization } from '../../utils/useServerNormalization';
import { apiClient } from '@/shared/lib/axiosInstance';
import type { BBox, VisionResponse } from '../../types/fusion';
import type { OverlayBox } from '../FusionOverlay';
import { computeFieldSuggestions, getCellsForRecord, type SuggestionResult } from '../../utils/fieldSuggestions';
import { computeRecordHighlightBoxes } from '../../utils/recordHighlightBoxes';
import WorkbenchOverlayControls from './WorkbenchOverlayControls';
import WorkbenchRightPanel from './WorkbenchRightPanel';

interface OcrWorkbenchProps {
  churchId: number;
  initialJobId?: number;
}

const OcrWorkbench: React.FC<OcrWorkbenchProps> = ({
  churchId,
  initialJobId,
}) => {
  const workbench = useWorkbench();
  
  // Server normalization hook
  const { normalize, normalizing } = useServerNormalization();

  // ── Workbench top-level bucket (job + tabs + feeder + normalization) ────
  type ToastState = { open: boolean; message: string; severity: 'success' | 'warning' | 'error' | 'info' };
  const [wbTop, setWbTop] = useState<{
    normalizedText: string | null;
    toast: ToastState;
    selectedJobId: number | null;
    rightTab: number;
    feederPageId: number | null;
    feederArtifactId: number | null;
    rerunning: boolean;
    autoExtracting: boolean;
    showLayoutWizard: boolean;
  }>({
    normalizedText: null,
    toast: { open: false, message: '', severity: 'info' },
    selectedJobId: initialJobId || null,
    rightTab: 0,
    feederPageId: null,
    feederArtifactId: null,
    rerunning: false,
    autoExtracting: false,
    showLayoutWizard: false,
  });
  const setWbTopField = useCallback(<K extends keyof typeof wbTop>(key: K, value: typeof wbTop[K]) => {
    setWbTop(prev => ({ ...prev, [key]: value }));
  }, []);
  const setNormalizedText = useCallback((v: string | null) => setWbTopField('normalizedText', v), [setWbTopField]);
  const setToast = useCallback((v: ToastState) => setWbTopField('toast', v), [setWbTopField]);
  const setSelectedJobId = useCallback((v: number | null) => setWbTopField('selectedJobId', v), [setWbTopField]);
  const setRightTab = useCallback((v: number) => setWbTopField('rightTab', v), [setWbTopField]);
  const setFeederPageId = useCallback((v: number | null) => setWbTopField('feederPageId', v), [setWbTopField]);
  const setFeederArtifactId = useCallback((v: number | null) => setWbTopField('feederArtifactId', v), [setWbTopField]);
  const setRerunning = useCallback((v: boolean) => setWbTopField('rerunning', v), [setWbTopField]);
  const setAutoExtracting = useCallback((v: boolean) => setWbTopField('autoExtracting', v), [setWbTopField]);
  const setShowLayoutWizard = useCallback((v: boolean) => setWbTopField('showLayoutWizard', v), [setWbTopField]);
  const { normalizedText, toast, selectedJobId, rightTab, feederPageId, feederArtifactId, rerunning, autoExtracting, showLayoutWizard } = wbTop;

  // Check flag dynamically - check on each render to react to localStorage changes
  const serverNormalizationEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const flag = localStorage.getItem('OCR_NORMALIZE_SERVER');
    return flag === '1' || flag === 'true';
  }, [normalizedText]);

  const showToast = useCallback((message: string, severity: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setToast({ open: true, message, severity });
  }, [setToast]);

  // ── Job data bucket (FieldMappingPanel inputs) ──────────────────────────
  const [jobData, setJobData] = useState<{
    tableExtraction: any;
    tableExtractionJson: any;
    recordCandidates: any;
    scoringV2: any;
    jobOcrResult: any;
    currentFeederPage: any;
    jobIsFinalized: boolean;
    jobFinalizedMeta: { finalizedAt: string; createdRecordId: number } | null;
    fieldSuggestions: SuggestionResult | null;
  }>({
    tableExtraction: null,
    tableExtractionJson: null,
    recordCandidates: null,
    scoringV2: null,
    jobOcrResult: null,
    currentFeederPage: null,
    jobIsFinalized: false,
    jobFinalizedMeta: null,
    fieldSuggestions: null,
  });
  const setJobDataField = useCallback(<K extends keyof typeof jobData>(key: K, value: typeof jobData[K]) => {
    setJobData(prev => ({ ...prev, [key]: value }));
  }, []);
  const setTableExtraction = useCallback((v: any) => setJobDataField('tableExtraction', v), [setJobDataField]);
  const setTableExtractionJson = useCallback((v: any) => setJobDataField('tableExtractionJson', v), [setJobDataField]);
  const setRecordCandidates = useCallback((v: any) => setJobDataField('recordCandidates', v), [setJobDataField]);
  const setScoringV2 = useCallback((v: any) => setJobDataField('scoringV2', v), [setJobDataField]);
  const setJobOcrResult = useCallback((v: any) => setJobDataField('jobOcrResult', v), [setJobDataField]);
  const setCurrentFeederPage = useCallback((v: any) => setJobDataField('currentFeederPage', v), [setJobDataField]);
  const setJobIsFinalized = useCallback((v: boolean) => setJobDataField('jobIsFinalized', v), [setJobDataField]);
  const setJobFinalizedMeta = useCallback((v: { finalizedAt: string; createdRecordId: number } | null) => setJobDataField('jobFinalizedMeta', v), [setJobDataField]);
  const setFieldSuggestions = useCallback((v: SuggestionResult | null) => setJobDataField('fieldSuggestions', v), [setJobDataField]);
  const { tableExtraction, tableExtractionJson, recordCandidates, scoringV2, jobOcrResult, currentFeederPage, jobIsFinalized, jobFinalizedMeta, fieldSuggestions } = jobData;

  // ── Interaction bucket (overlay + selection + edit modes) ────────────────
  type EditMode = 'highlight' | 'click-select' | 'drag-select' | 'draw-record';
  type CropReOcrResult = { text: string; fields: Record<string, string>; bbox: any; tokenCount: number } | null;
  type ExternalFieldUpdate = { fieldKey: string; text: string; mode: 'append' | 'replace' } | null;
  const [interaction, setInteraction] = useState<{
    artifactOverlayBoxes: OverlayBox[];
    selectedRecordIndex: number | null;
    focusedField: string | null;
    editMode: EditMode;
    cropReOcrResult: CropReOcrResult;
    cropReOcrLoading: boolean;
    externalFieldUpdate: ExternalFieldUpdate;
  }>({
    artifactOverlayBoxes: [],
    selectedRecordIndex: null,
    focusedField: null,
    editMode: 'highlight',
    cropReOcrResult: null,
    cropReOcrLoading: false,
    externalFieldUpdate: null,
  });
  const setInteractionField = useCallback(<K extends keyof typeof interaction>(key: K, value: typeof interaction[K]) => {
    setInteraction(prev => ({ ...prev, [key]: value }));
  }, []);
  const setArtifactOverlayBoxes = useCallback((v: OverlayBox[]) => setInteractionField('artifactOverlayBoxes', v), [setInteractionField]);
  const setSelectedRecordIndex = useCallback((v: number | null) => setInteractionField('selectedRecordIndex', v), [setInteractionField]);
  const setFocusedField = useCallback((v: string | null) => setInteractionField('focusedField', v), [setInteractionField]);
  const setEditMode = useCallback((v: EditMode) => setInteractionField('editMode', v), [setInteractionField]);
  const setCropReOcrResult = useCallback((v: CropReOcrResult) => setInteractionField('cropReOcrResult', v), [setInteractionField]);
  const setCropReOcrLoading = useCallback((v: boolean) => setInteractionField('cropReOcrLoading', v), [setInteractionField]);
  const setExternalFieldUpdate = useCallback((v: ExternalFieldUpdate) => setInteractionField('externalFieldUpdate', v), [setInteractionField]);
  const { artifactOverlayBoxes, selectedRecordIndex, focusedField, editMode, cropReOcrResult, cropReOcrLoading, externalFieldUpdate } = interaction;

  const handleOpenLayoutWizard = useCallback(() => {
    setShowLayoutWizard(true);
  }, []);

  const handleReviewComplete = useCallback((updatedCandidates: any, updatedTableExtraction: any, templateId?: number) => {
    setRecordCandidates(updatedCandidates);
    if (updatedTableExtraction) {
      setTableExtractionJson(updatedTableExtraction);
    }
    setShowLayoutWizard(false);
    setRightTab(1); // Switch to Field Mapping tab
    showToast(`Review complete: ${updatedCandidates?.candidates?.length || 0} records confirmed`, 'success');
  }, [showToast]);

  // Artifact inspector: highlight bbox on image
  const handleArtifactHighlightBbox = useCallback((bbox: [number, number, number, number], label: string) => {
    setArtifactOverlayBoxes([{
      bbox: { x: bbox[0], y: bbox[1], w: bbox[2], h: bbox[3] },
      color: '#00bcd4',
      label,
      emphasized: true,
    }]);
    // Auto-clear after 4 seconds
    setTimeout(() => setArtifactOverlayBoxes([]), 4000);
  }, []);

  // Fetch jobs list
  const { jobs, loading, error, refresh, fetchJobDetail, deleteJobs, retryJob, hideJobs, detailCache } = useOcrJobs({ churchId });
  const detailCacheRef = useRef(detailCache);
  
  // Auto-refresh jobs list periodically to catch new uploads
  useEffect(() => {
    if (!churchId) return;
    
    // Initial load
    refresh();
    
    // Set up polling every 5 seconds to catch new uploads
    const pollInterval = setInterval(() => {
      refresh();
    }, 5000);
    
    return () => clearInterval(pollInterval);
  }, [churchId, refresh]);
  
  // Get selected job details
  const selectedJob = useMemo(() => {
    if (!selectedJobId) return null;
    return jobs.find(j => j.id === selectedJobId) || null;
  }, [jobs, selectedJobId]);
  
  // Handle record bbox adjustment (drag-resize) — calls reextract-row endpoint
  const handleRecordBboxAdjusted = useCallback(
    async (idx: number, newVisionBbox: BBox) => {
      if (!tableExtractionJson?.page_dimensions || !selectedJobId || !churchId) return;
      const pageDims = tableExtractionJson.page_dimensions;

      // Convert Vision-pixel bbox back to fractional coords
      const fractionalBbox = {
        x_min: newVisionBbox.x / pageDims.width,
        y_min: newVisionBbox.y / pageDims.height,
        x_max: (newVisionBbox.x + newVisionBbox.w) / pageDims.width,
        y_max: (newVisionBbox.y + newVisionBbox.h) / pageDims.height,
      };

      try {
        const res: any = await apiClient.post(
          `/api/church/${churchId}/ocr/jobs/${selectedJobId}/reextract-row`,
          { recordIndex: idx, bbox: fractionalBbox }
        );
        const data = res?.data ?? res;
        if (data?.success && data.fields) {
          // Update the candidate's fields in recordCandidates
          setRecordCandidates((prev: any) => {
            if (!prev?.candidates?.[idx]) return prev;
            const updated = { ...prev, candidates: [...prev.candidates] };
            updated.candidates[idx] = {
              ...updated.candidates[idx],
              fields: { ...updated.candidates[idx].fields, ...data.fields },
            };
            return updated;
          });
          showToast(`Record ${idx + 1} area updated (${data.tokenCount} tokens)`, 'success');
        }
      } catch (err: any) {
        console.error('[OcrWorkbench] Reextract-row failed:', err);
        showToast('Failed to re-extract record area', 'error');
      }
    },
    [tableExtractionJson, selectedJobId, churchId, showToast],
  );

  // Compute record highlight boxes from table extraction + selected record
  const recordHighlightBoxes: OverlayBox[] = useMemo(() => {
    return computeRecordHighlightBoxes({
      tableExtractionJson,
      recordCandidates,
      selectedRecordIndex,
      focusedField,
      fieldSuggestions,
      scoringV2,
      handleRecordBboxAdjusted,
      setSelectedRecordIndex,
      setExternalFieldUpdate,
    });
  }, [tableExtractionJson, recordCandidates, selectedRecordIndex, focusedField, handleRecordBboxAdjusted, fieldSuggestions, scoringV2]);

  // Check if bbox data is available for interactive modes
  const hasBboxData = useMemo(() => {
    if (!tableExtractionJson?.page_dimensions) return false;
    const tables = tableExtractionJson.tables;
    if (!tables?.length) return false;
    return tables.some((t: any) => t.rows?.some((r: any) => r.cells?.some((c: any) => c.bbox?.length === 4)));
  }, [tableExtractionJson]);

  // Handle token select (click-select mode)
  const handleTokenSelect = useCallback(
    (text: string) => {
      if (!focusedField || selectedRecordIndex === null) return;
      setExternalFieldUpdate({ fieldKey: focusedField, text, mode: 'append' });
    },
    [focusedField, selectedRecordIndex],
  );

  // Handle drag select
  const handleDragSelect = useCallback(
    (text: string) => {
      if (!focusedField || selectedRecordIndex === null) return;
      setExternalFieldUpdate({ fieldKey: focusedField, text, mode: 'replace' });
    },
    [focusedField, selectedRecordIndex],
  );

  // Handle draw-record: crop + re-OCR
  const handleDrawRecord = useCallback(
    async (bbox: { x_min: number; y_min: number; x_max: number; y_max: number }) => {
      if (!selectedJobId || !churchId) return;
      setCropReOcrLoading(true);
      setCropReOcrResult(null);
      try {
        const res: any = await apiClient.post(
          `/api/church/${churchId}/ocr/jobs/${selectedJobId}/crop-reocr`,
          { bbox }
        );
        const data = res?.data ?? res;
        if (data?.success) {
          setCropReOcrResult({
            text: data.text || '',
            fields: data.fields || {},
            bbox: data.bbox,
            tokenCount: data.tokenCount || 0,
          });
          showToast(`Crop OCR: ${data.tokenCount} tokens extracted`, 'success');
        }
      } catch (err: any) {
        console.error('[OcrWorkbench] Crop re-OCR failed:', err);
        showToast('Crop re-OCR failed: ' + (err?.response?.data?.message || err?.message || 'Unknown error'), 'error');
      } finally {
        setCropReOcrLoading(false);
      }
    },
    [selectedJobId, churchId, showToast],
  );

  // Handle reject record (not a record)
  const handleRejectRecord = useCallback(async (sourceRowIndex: number) => {
    if (!selectedJobId || !churchId) return;
    try {
      const recordType = workbench.state.jobMetadata?.recordType || 'baptism';
      const res: any = await apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${selectedJobId}/reject-row`,
        { rowIndex: sourceRowIndex, recordType, tableExtraction: tableExtractionJson }
      );
      const data = res?.data ?? res;
      if (data?.success) {
        if (data.recordCandidates) setRecordCandidates(data.recordCandidates);
        if (data.tableExtraction) setTableExtractionJson(data.tableExtraction);
        setSelectedRecordIndex(0);
        showToast(`Row rejected. Now showing ${data.recordCandidates?.candidates?.length || 0} records`, 'success');
      }
    } catch (err: any) {
      console.error('[OcrWorkbench] Reject-row failed:', err);
      showToast('Failed to reject record: ' + (err?.message || 'Unknown error'), 'error');
    }
  }, [selectedJobId, churchId, workbench.state.jobMetadata?.recordType, showToast]);

  // Compute field suggestions when focused field or selected record changes
  useEffect(() => {
    if (!focusedField || selectedRecordIndex === null || !tableExtractionJson || !recordCandidates?.candidates) {
      setFieldSuggestions(null);
      return;
    }

    const candidate = recordCandidates.candidates[selectedRecordIndex];
    if (!candidate) {
      setFieldSuggestions(null);
      return;
    }

    const recordType = workbench.state.jobMetadata?.recordType || 'baptism';
    const columnMapping = recordCandidates.columnMapping || {};

    // Get source row index(es) for this record (range for assembled records)
    const rowStart = candidate.sourceRowIndex;
    const rowEnd = candidate.sourceRowEnd ?? rowStart;
    const rowIndices: number[] = [];
    for (let ri = rowStart; ri <= rowEnd; ri++) rowIndices.push(ri);
    const cells = getCellsForRecord(tableExtractionJson, rowIndices);

    if (cells.length === 0) {
      setFieldSuggestions(null);
      return;
    }

    // Collect values already assigned to other fields (exclude the focused field)
    const usedValues = Object.entries(candidate.fields || {})
      .filter(([key, val]) => key !== focusedField && typeof val === 'string' && val.trim())
      .map(([, val]) => val as string);

    const result = computeFieldSuggestions(focusedField, recordType, cells, columnMapping, usedValues);
    setFieldSuggestions(result);
  }, [focusedField, selectedRecordIndex, tableExtractionJson, recordCandidates, workbench.state.jobMetadata?.recordType]);

  // Load job data into workbench when job is selected
  useEffect(() => {
    if (!selectedJobId || !churchId) {
      // Clear workbench if no job selected
      if (!selectedJobId) {
        workbench.reset();
      }
      return;
    }
    
    const loadJobData = async () => {
      try {
        const jobDetail = await fetchJobDetail(selectedJobId);
        if (!jobDetail) {
          workbench.dispatch({ type: 'SET_ERROR', payload: 'Job not found' });
          return;
        }
        
        // Store table extraction & finalized state for FieldMappingPanel
        setTableExtraction(jobDetail.table_extraction || null);
        const rawOcrResult = jobDetail.ocr_result_json || jobDetail.ocrResultJson || jobDetail.ocr_result || null;
        let parsedRawResult: any = null;
        try {
          parsedRawResult = rawOcrResult && typeof rawOcrResult === 'string' ? JSON.parse(rawOcrResult) : rawOcrResult;
        } catch { parsedRawResult = rawOcrResult; }
        setJobOcrResult(parsedRawResult);
        const finalized = parsedRawResult?.finalizedAt;
        setJobIsFinalized(!!finalized);
        setJobFinalizedMeta(finalized ? { finalizedAt: parsedRawResult.finalizedAt, createdRecordId: parsedRawResult.createdRecordId } : null);

        // Parse OCR result
        let ocrResult: VisionResponse | null = null;
        try {
          if (jobDetail.ocr_result_json) {
            ocrResult = typeof jobDetail.ocr_result_json === 'string'
              ? JSON.parse(jobDetail.ocr_result_json)
              : jobDetail.ocr_result_json;
          } else if (jobDetail.ocrResultJson) {
            ocrResult = typeof jobDetail.ocrResultJson === 'string'
              ? JSON.parse(jobDetail.ocrResultJson)
              : jobDetail.ocrResultJson;
          }
        } catch (e) {
          console.warn('[OcrWorkbench] Failed to parse OCR result:', e);
        }
        
        // Get image URL - always use API endpoint (file_path is server path, not URL)
        const imageUrl = (churchId && selectedJobId) 
          ? `/api/church/${churchId}/ocr/jobs/${selectedJobId}/image`
          : null;
        
        // Extract OCR text - prefer feeder page data, then stored text, then Vision response
        let ocrTextForDetection: string | null = null;
        let loadedRecordCandidates: any = null;

        // Check for feeder pages (source of truth)
        if (jobDetail.pages && jobDetail.pages.length > 0) {
          const firstPage = jobDetail.pages[0];
          if (firstPage.rawText) {
            ocrTextForDetection = firstPage.rawText;
          }
          setFeederPageId(firstPage.pageId);
          setFeederArtifactId(firstPage.rawTextArtifactId);
          setCurrentFeederPage(firstPage);
          // Extract record candidates for multi-record field mapping
          if (firstPage.recordCandidates) {
            loadedRecordCandidates = firstPage.recordCandidates;
            setRecordCandidates(firstPage.recordCandidates);
          } else {
            setRecordCandidates(null);
          }
          // Extract table extraction JSON (contains cell bboxes for highlighting)
          if (firstPage.tableExtractionJson) {
            setTableExtractionJson(
              typeof firstPage.tableExtractionJson === 'string'
                ? JSON.parse(firstPage.tableExtractionJson)
                : firstPage.tableExtractionJson,
            );
          } else {
            setTableExtractionJson(null);
          }
          // Extract scoring_v2 data (field-level scoring with provenance)
          if (firstPage.scoringV2) {
            setScoringV2(
              typeof firstPage.scoringV2 === 'string'
                ? JSON.parse(firstPage.scoringV2)
                : firstPage.scoringV2,
            );
          } else {
            setScoringV2(null);
          }
        } else {
          setFeederPageId(null);
          setFeederArtifactId(null);
          setRecordCandidates(null);
          setScoringV2(null);
          setCurrentFeederPage(null);
        }

        // Auto-extract: if no recordCandidates but we have Vision data, trigger auto-extraction
        // Use loadedRecordCandidates (local var) instead of recordCandidates (stale React state)
        const hasVisionData = ocrResult || (jobDetail as any).ocr_text || (jobDetail as any).ocrText || ocrTextForDetection;
        if (!loadedRecordCandidates && hasVisionData) {
          setAutoExtracting(true);
          try {
            const autoRes: any = await apiClient.post(
              `/api/church/${churchId}/ocr/jobs/${selectedJobId}/auto-extract`
            );
            const autoData = autoRes?.data ?? autoRes;
            if (autoData?.success && autoData.recordCandidates?.candidates?.length > 0) {
              setRecordCandidates(autoData.recordCandidates);
              if (autoData.tableExtraction) {
                setTableExtractionJson(autoData.tableExtraction);
              }
              console.log(`[OcrWorkbench] Auto-extracted ${autoData.recordCandidates.candidates.length} records (cached=${autoData.cached})`);
            }
          } catch (autoErr) {
            console.warn('[OcrWorkbench] Auto-extract failed, falling back to manual layout:', autoErr);
          } finally {
            setAutoExtracting(false);
          }
        }

        // Fall back to stored text or Vision response
        if (!ocrTextForDetection) {
          ocrTextForDetection = (jobDetail as any).ocr_text || (jobDetail as any).ocrText || null;
        }
        if (!ocrTextForDetection && ocrResult) {
          ocrTextForDetection = extractTextFromVisionResponse(ocrResult);
        }
        let detectedRecordType = jobDetail.record_type || jobDetail.recordType || 'unknown';
        
        if (ocrTextForDetection) {
          try {
            // Explicitly call detectMetadata with proper error handling
            // This ensures no require() or other Node.js globals are used
            const metadata = detectMetadata(ocrTextForDetection);
            if (metadata && metadata.recordType && metadata.confidence > 0.5) {
              detectedRecordType = metadata.recordType;
              console.log('[OcrWorkbench] Auto-detected record type:', metadata.recordType, 'confidence:', metadata.confidence);
              if (metadata.year) {
                console.log('[OcrWorkbench] Auto-detected year:', metadata.year);
              }
            }
          } catch (e) {
            // Gracefully handle any errors without crashing
            console.warn('[OcrWorkbench] Failed to auto-detect record type:', e);
            // Continue with default record type (detectedRecordType already set above)
          }
        }
        
        // Set job in workbench
        workbench.setJob(
          selectedJobId,
          {
            filename: jobDetail.original_filename || jobDetail.originalFilename || 'Unknown',
            recordType: detectedRecordType as any,
            status: jobDetail.status || 'unknown',
            confidence: jobDetail.confidence_score || jobDetail.confidenceScore || 0,
            churchId,
          },
          ocrTextForDetection,
          ocrResult,
          imageUrl
        );
      } catch (err) {
        console.error('[OcrWorkbench] Failed to load job data:', err);
        workbench.dispatch({ type: 'SET_ERROR', payload: 'Failed to load job data' });
      }
    };
    
    loadJobData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJobId, churchId]); // Removed workbench and fetchJobDetail to prevent infinite loops
  
  // Handle job selection
  const handleJobSelect = useCallback((jobId: number) => {
    setSelectedJobId(jobId);
    workbench.dispatch({ type: 'SET_ACTIVE_STEP', payload: 0 });
    workbench.dispatch({ type: 'SET_ERROR', payload: null });
  }, [workbench]);
  
  // Handle delete jobs
  const handleDeleteJobs = useCallback(async (jobIds: number[]) => {
    if (!confirm(`Delete ${jobIds.length} job(s)? This cannot be undone.`)) {
      return;
    }
    const success = await deleteJobs(jobIds);
    if (success) {
      // If deleted job was selected, clear selection
      if (selectedJobId && jobIds.includes(selectedJobId)) {
        setSelectedJobId(null);
        workbench.reset();
      }
      // Refresh jobs list
      await refresh();
    }
  }, [deleteJobs, refresh, selectedJobId, workbench]);
  
  // Handle close workbench
  const handleCloseWorkbench = useCallback(() => {
    setSelectedJobId(null);
    workbench.reset();
    setNormalizedText(null);
    setFeederPageId(null);
    setFeederArtifactId(null);
    setRightTab(0);
    setTableExtraction(null);
    setTableExtractionJson(null);
    setRecordCandidates(null);
    setScoringV2(null);
    setJobOcrResult(null);
    setJobIsFinalized(false);
    setJobFinalizedMeta(null);
    setSelectedRecordIndex(null);
    setFocusedField(null);
    setEditMode('highlight');
    setExternalFieldUpdate(null);
    setFieldSuggestions(null);
  }, [workbench]);

  // Sync scoringV2 and recordCandidates to WorkbenchContext for use by ReviewCommitStep
  useEffect(() => {
    workbench.setScoringV2(scoringV2);
  }, [scoringV2]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    workbench.setRecordCandidates(recordCandidates);
  }, [recordCandidates]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle artifact download
  const handleDownloadArtifact = useCallback(() => {
    if (feederArtifactId && churchId) {
      window.open(`/api/church/${churchId}/ocr/feeder/artifacts/${feederArtifactId}/download`, '_blank');
    }
  }, [feederArtifactId, churchId]);

  // Handle re-run OCR
  const handleRerunOcr = useCallback(async () => {
    if (!feederPageId || !churchId) return;
    setRerunning(true);
    try {
      const response = await apiClient.post(`/api/church/${churchId}/ocr/feeder/pages/${feederPageId}/rerun`);
      const data = (response as any)?.data ?? response;
      showToast(`OCR re-run complete (confidence: ${((data.confidence || 0) * 100).toFixed(1)}%)`, 'success');
      // Clear detail cache and reload
      if (selectedJobId) {
        // Force re-fetch by clearing cache
        const cache = detailCacheRef.current;
        if (cache) cache.delete(selectedJobId);
        // Re-trigger loadJobData by toggling selectedJobId
        const jid = selectedJobId;
        setSelectedJobId(null);
        setTimeout(() => setSelectedJobId(jid), 50);
      }
    } catch (err: any) {
      console.error('[OcrWorkbench] Re-run OCR failed:', err);
      showToast('Re-run OCR failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setRerunning(false);
    }
  }, [feederPageId, churchId, selectedJobId, showToast]);

  // Expose normalized text globally for FusionTab access (when not using WorkbenchContext)
  useEffect(() => {
    if (normalizedText) {
      (window as any).__workbenchState = { normalizedText };
    } else {
      delete (window as any).__workbenchState;
    }
    return () => {
      delete (window as any).__workbenchState;
    };
  }, [normalizedText]);

  // Handle normalize button click
  const handleNormalize = useCallback(async () => {
    if (!selectedJobId || !churchId) return;
    
    // Get raw OCR text
    const rawText = workbench.state.ocrText || 
                   (workbench.state.ocrResult ? extractTextFromVisionResponse(workbench.state.ocrResult) : null);
    
    if (!rawText) {
      showToast('No OCR text available to normalize', 'warning');
      return;
    }

    // Read document processing settings from localStorage
    let docSettings = {
      transcriptionMode: 'exact' as const,
      textExtractionScope: 'all' as const,
      formattingMode: 'improve-formatting' as const,
      confidenceThreshold: 0.35,
    };
    
    try {
      const stored = sessionStorage.getItem('om.ocr.docSettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        docSettings = { ...docSettings, ...parsed };
      }
    } catch (e) {
      console.warn('[OcrWorkbench] Failed to load doc settings:', e);
    }

    try {
      const result = await normalize(churchId, selectedJobId, rawText, docSettings);
      setNormalizedText(result);
      // Store in workbench context for use in Save Draft
      workbench.dispatch({ type: 'SET_NORMALIZED_TEXT', payload: result });
      showToast('Transcription normalized successfully', 'success');
    } catch (error: any) {
      console.error('[OcrWorkbench] Normalization failed:', error);
      showToast('Normalization failed, using client-side formatting', 'warning');
      setNormalizedText(null); // Use client fallback
      workbench.dispatch({ type: 'SET_NORMALIZED_TEXT', payload: null });
    }
  }, [selectedJobId, churchId, workbench, normalize, showToast]);
  
  // Navigation: compute prev/next job IDs from the jobs list
  const { prevJobId, nextJobId } = useMemo(() => {
    if (!selectedJobId || !jobs.length) return { prevJobId: null, nextJobId: null };
    // Filter to completed/reviewed jobs for navigation
    const navJobs = jobs.filter(j => j.status === 'completed' || j.status === 'reviewed' || j.status === 'processing');
    const idx = navJobs.findIndex(j => j.id === selectedJobId);
    if (idx < 0) return { prevJobId: null, nextJobId: null };
    return {
      prevJobId: idx > 0 ? navJobs[idx - 1].id : null,
      nextJobId: idx < navJobs.length - 1 ? navJobs[idx + 1].id : null,
    };
  }, [selectedJobId, jobs]);

  const handleNavPrev = useCallback(() => {
    if (prevJobId) handleJobSelect(prevJobId);
  }, [prevJobId, handleJobSelect]);

  const handleNavNext = useCallback(() => {
    if (nextJobId) handleJobSelect(nextJobId);
  }, [nextJobId, handleJobSelect]);

  // Show workbench if job is selected and loaded
  const showWorkbench = selectedJobId && workbench.state.jobMetadata;
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {showWorkbench ? (
        // Phase 2: Workbench for selected job
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <WorkbenchHeader
            job={{
              ...(selectedJob || {
                id: selectedJobId,
                original_filename: workbench.state.jobMetadata?.filename || 'Unknown',
                record_type: workbench.state.jobMetadata?.recordType || 'baptism',
                status: workbench.state.jobMetadata?.status || 'unknown',
                confidence_score: workbench.state.jobMetadata?.confidence || 0,
              } as any),
              ocr_text: workbench.state.ocrText || null,
              // Override DB record_type with auto-detected type from workbench
              ...(workbench.state.jobMetadata?.recordType && workbench.state.jobMetadata.recordType !== 'unknown' && workbench.state.jobMetadata.recordType !== 'custom'
                ? { record_type: workbench.state.jobMetadata.recordType }
                : {}),
            }}
            onClose={handleCloseWorkbench}
            onPrev={handleNavPrev}
            onNext={handleNavNext}
            hasPrev={!!prevJobId}
            hasNext={!!nextJobId}
            templateId={recordCandidates?.template_id || recordCandidates?.templateId || null}
          />
          <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
            {/* Left: Image Viewer */}
            <Box sx={{ width: '50%', borderRight: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <WorkbenchViewer
                recordHighlightBoxes={[...recordHighlightBoxes, ...artifactOverlayBoxes]}
                interactionMode={editMode}
                onTokenSelect={handleTokenSelect}
                onDragSelect={handleDragSelect}
                onDrawRecord={handleDrawRecord}
                tablePageDims={tableExtractionJson?.page_dimensions || null}
              />
            </Box>
            <WorkbenchOverlayControls
              editMode={editMode}
              onEditModeChange={setEditMode}
              focusedField={focusedField}
              hasBboxData={hasBboxData}
              rightTab={rightTab}
              cropReOcrLoading={cropReOcrLoading}
              cropReOcrResult={cropReOcrResult}
              onClearCropResult={() => setCropReOcrResult(null)}
            />
            <WorkbenchRightPanel
              rightTab={rightTab}
              onRightTabChange={setRightTab}
              ocrText={
                workbench.state.ocrText ||
                (workbench.state.ocrResult ? extractTextFromVisionResponse(workbench.state.ocrResult) : null)
              }
              normalizedText={normalizedText}
              ocrTextLoading={!workbench.state.ocrResult && !workbench.state.ocrText}
              normalizing={normalizing}
              onCopy={() => showToast('Copied to clipboard', 'success')}
              onDownload={() => showToast('Transcription downloaded', 'success')}
              onNormalize={serverNormalizationEnabled ? handleNormalize : undefined}
              onRerunOcr={feederPageId ? handleRerunOcr : undefined}
              rerunning={rerunning}
              onDownloadArtifact={feederArtifactId ? handleDownloadArtifact : undefined}
              selectedJobId={selectedJobId}
              churchId={churchId}
              ocrTextForMapping={workbench.state.ocrText}
              jobOcrResult={jobOcrResult}
              tableExtraction={tableExtraction}
              recordCandidates={recordCandidates}
              initialRecordType={workbench.state.jobMetadata?.recordType || 'unknown'}
              jobIsFinalized={jobIsFinalized}
              jobFinalizedMeta={jobFinalizedMeta}
              selectedRecordIndex={selectedRecordIndex}
              onRecordSelect={setSelectedRecordIndex}
              focusedField={focusedField}
              onFieldFocus={setFocusedField}
              externalFieldUpdate={externalFieldUpdate}
              onExternalFieldUpdateHandled={() => setExternalFieldUpdate(null)}
              onOpenLayoutWizard={handleOpenLayoutWizard}
              autoExtracting={autoExtracting}
              fieldSuggestions={fieldSuggestions}
              scoringV2={scoringV2}
              onRejectRecord={handleRejectRecord}
              onFinalized={(result: any) => {
                if (result.created_count) {
                  showToast(`${result.created_count} record(s) created`, 'success');
                } else {
                  showToast(`Record #${result.recordId} created (${result.recordType})`, 'success');
                }
                setJobIsFinalized(true);
              }}
              onTemplateCreated={(templateId) => showToast(`Template ${templateId} created`, 'success')}
              currentFeederPage={currentFeederPage}
              tableExtractionJson={tableExtractionJson}
              onHighlightBbox={handleArtifactHighlightBbox}
            />
          </Box>

          {/* Record Review Wizard (guided step-by-step with learning) */}
          {selectedJobId && (
            <RecordReviewWizard
              open={showLayoutWizard}
              onClose={() => setShowLayoutWizard(false)}
              jobId={selectedJobId}
              churchId={churchId}
              imageUrl={`/api/church/${churchId}/ocr/jobs/${selectedJobId}/image`}
              recordType={workbench.state.jobMetadata?.recordType || 'baptism'}
              initialRecordCandidates={recordCandidates}
              initialTableExtraction={tableExtractionJson}
              onReviewComplete={handleReviewComplete}
            />
          )}

          {/* Toast Notifications */}
          <Snackbar
            open={toast.open}
            autoHideDuration={3500}
            onClose={() => setToast({ ...toast, open: false })}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert
              onClose={() => setToast({ ...toast, open: false })}
              severity={toast.severity}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {toast.message}
            </Alert>
          </Snackbar>
        </Box>
      ) : (
        // Phase 1: Unified Jobs List
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            OCR Jobs
          </Typography>
          <UnifiedJobsList
            jobs={jobs}
            loading={loading}
            error={error}
            onJobSelect={handleJobSelect}
            onRefresh={refresh}
            onDeleteJobs={handleDeleteJobs}
            onRetryJob={retryJob}
            onHideJobs={hideJobs}
            churchId={churchId}
          />
        </Box>
      )}
    </Box>
  );
};

export default OcrWorkbench;

