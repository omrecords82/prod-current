/**
 * FusionTab - OCR Fusion Workflow Component
 * 4-step process: Detect Entries → Anchor Labels → Map Fields → Save Drafts/Commit
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  FormControlLabel,
  alpha,
  useTheme,
  Switch,
  Snackbar,
  Tooltip,
} from '@mui/material';
import {
  IconWand,
  IconTarget,
  IconMap,
  IconDeviceFloppy,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';

import {
  FusionEntry,
  DetectedLabel,
  MappedField,
  BBox,
  EntryArea,
  FieldExtraction,
} from '../types/fusion';
import { getRecordSchema, validateFieldKeys } from '@/shared/recordSchemas/registry';
import { getVisionPageSize } from '../utils/visionParser';
import { apiClient } from '@/shared/lib/axiosInstance';
import { useOcrSelection } from '../context/OcrSelectionContext';

// EntryEditorDialog - import directly (no lazy needed, it's a simple dialog with no cycles)
import EntryEditorDialog from './EntryEditorDialog';
import type { FusionTabProps } from './FusionTab/types';
import SaveCommitStep from './FusionTab/SaveCommitStep';
import { getEntryColor } from './FusionTab/fusionConstants';
import { useFusionDrafts } from './FusionTab/useFusionDrafts';
import AnchorLabelsStep from './FusionTab/AnchorLabelsStep';
import CommitDialog from './FusionTab/CommitDialog';
import DetectEntriesStep from './FusionTab/DetectEntriesStep';
import FusionProgressHeader from './FusionTab/FusionProgressHeader';
import MapFieldsStep from './FusionTab/MapFieldsStep';
import StepIcon from './FusionTab/StepIcon';
import { handleDetectEntriesLogic } from './FusionTab/detectEntriesHandler';
import { handleDetectLabelsLogic, handleAutoMapLogic, handleFieldChangeLogic } from './FusionTab/stepHandlers';
import { handleBboxUpdateLogic, handleSaveBboxLogic } from './FusionTab/bboxHandlers';
import { handleDeleteEntryLogic } from './FusionTab/deleteEntryHandler';
import { loadExistingData } from './FusionTab/loadExistingData';
import { handleEntrySwitch } from './FusionTab/entrySwitchLogic';

// ============================================================================
// Component
// ============================================================================

const FusionTab: React.FC<FusionTabProps> = ({
  jobId,
  churchId,
  ocrText,
  ocrResult,
  recordType: initialRecordType,
  imageUrl,
  onHighlightBbox,
  onHighlightMultiple,
  onSendToReview,
  onBboxEditModeChange,
  onTokenClick,
  onTokenDoubleClick,
  stickyDefaults = { baptism: false, marriage: false, funeral: false },
}) => {
  const theme = useTheme();
  
  // OCR Selection context
  const { getSelection } = useOcrSelection();
  const ocrSelections = getSelection(jobId.toString());

  // State
  const [activeStep, setActiveStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fusion state
  const [entries, setEntries] = useState<FusionEntry[]>([]);
  const [selectedEntryIndex, setSelectedEntryIndex] = useState<number | null>(null);
  const [detectedLabels, setDetectedLabels] = useState<DetectedLabel[]>([]);
  const [mappedFields, setMappedFields] = useState<Record<string, MappedField>>({});
  const [recordType, setRecordType] = useState<'baptism' | 'marriage' | 'funeral'>(initialRecordType);
  // Entry areas - single source of truth for entry bounding boxes
  const [entryAreas, setEntryAreas] = useState<EntryArea[]>([]);
  
  // Field extractions per entry (from layout extractor) - keyed by entryId, then fieldKey
  const [fieldExtractions, setFieldExtractions] = useState<Record<string, Record<string, FieldExtraction>>>({});
  
  // Toggle for showing per-field boxes in overlay
  const [showFieldBoxes, setShowFieldBoxes] = useState(false);

  // Per-entry data storage
  const [entryData, setEntryData] = useState<Map<number, {
    labels: DetectedLabel[];
    fields: Record<string, MappedField>;
    recordType: 'baptism' | 'marriage' | 'funeral';
  }>>(new Map());

  // Draft management (save, auto-save, validate, commit)
  const {
    drafts, setDrafts,
    autoSaveEnabled, setAutoSaveEnabled,
    lastSaved, isSaving,
    isProcessing: draftProcessing, setIsProcessing: setDraftProcessing,
    validationResult,
    showCommitDialog, setShowCommitDialog,
    commitSuccess, setCommitSuccess,
    pendingSaveRef,
    normalizeDraftsResponse,
    saveDraftForEntry, handleSaveDraft, triggerAutoSave,
    handleSaveAllDrafts, handleSendToReview: handleSendToReviewDrafts,
    handleValidateDrafts, handleOpenCommitDialog, handleCommitDrafts,
  } = useFusionDrafts({
    entries, entryData, entryAreas, recordType, mappedFields,
    selectedEntryIndex, churchId, jobId, initialRecordType,
    onSendToReview,
  });

  // Entry completion tracking
  const [completedEntries, setCompletedEntries] = useState<Set<number>>(new Set());
  const [inProgressEntries, setInProgressEntries] = useState<Set<number>>(new Set());
  const [hideCompleted, setHideCompleted] = useState(false);
  const prevCompletionRef = useRef<Set<number>>(new Set());
  const [showAdvanceSnackbar, setShowAdvanceSnackbar] = useState<string | null>(null);
  
  // Manual entry count
  const [manualEntryCount, setManualEntryCount] = useState(4);
  
  // Manual edit mode per entry
  const [manualEditMode, setManualEditMode] = useState<Set<number>>(new Set());

  // Bbox editing state
  const [bboxEditMode, setBboxEditMode] = useState(false);

  // Entry editor state
  const [editingEntryIndex, setEditingEntryIndex] = useState<number | null>(null);
  const [entryEditorOpen, setEntryEditorOpen] = useState(false);

  // Notify parent when edit mode changes
  useEffect(() => {
    if (onBboxEditModeChange) {
      onBboxEditModeChange(bboxEditMode);
    }
  }, [bboxEditMode, onBboxEditModeChange]);

  // OCR token handlers
  const handleTokenClick = useCallback((tokenId: string, bbox: BBox, text: string) => {
    if (onTokenClick) {
      onTokenClick(tokenId, bbox, text);
    } else {
      console.log('[FusionTab] Token clicked:', { tokenId, text, bbox });
    }
  }, [onTokenClick]);

  const handleTokenDoubleClick = useCallback((tokenId: string, bbox: BBox, text: string) => {
    if (onTokenDoubleClick) {
      onTokenDoubleClick(tokenId, bbox, text);
    } else {
      console.log('[FusionTab] Token double-clicked:', { tokenId, text, bbox });
      // For now, just log/alert - will be wired to field mapping later
      alert(`Double-clicked token: "${text}"\nUse this value for currently focused field?`);
    }
  }, [onTokenDoubleClick]);

  // Delete an entry (defined early so it can be used in entry editor handlers)
  const handleDeleteEntry = useCallback((entryIndex: number) => {
    handleDeleteEntryLogic(entryIndex, {
      entries, selectedEntryIndex, drafts,
      setEntries, setSelectedEntryIndex, setEntryData, setDirtyEntries,
      setOriginalBboxes, setManualEditMode, setCompletedEntries, setDrafts, setError,
    });
  }, [entries.length, selectedEntryIndex, drafts]);

  // Entry editor handlers
  const handleEntryEditorSave = useCallback((updates: {
    displayName?: string;
    mapTargetTable?: 'baptism_records' | 'marriage_records' | 'funeral_records';
  }) => {
    if (editingEntryIndex === null) return;
    
    setEntries(prev => prev.map((entry, idx) => 
      idx === editingEntryIndex
        ? { ...entry, ...updates }
        : entry
    ));
    
    // Persist to drafts if entry has a draft
    const draft = drafts.find(d => d.entry_index === editingEntryIndex);
    if (draft) {
      // Update draft payload with metadata
      const updatedDraft = {
        ...draft,
        payload_json: {
          ...draft.payload_json,
          displayName: updates.displayName,
          mapTargetTable: updates.mapTargetTable,
        },
      };
      // Save draft update (best-effort, non-blocking)
      apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${jobId}/fusion/drafts`,
        { drafts: [updatedDraft] }
      ).catch(err => console.warn('[FusionTab] Failed to persist entry metadata:', err));
    }
  }, [editingEntryIndex, drafts, churchId, jobId]);

  const handleEntryEditorDelete = useCallback(() => {
    if (editingEntryIndex === null) return;
    handleDeleteEntry(editingEntryIndex);
  }, [editingEntryIndex, handleDeleteEntry]);

  const handleEntryEditorDuplicate = useCallback(() => {
    if (editingEntryIndex === null) return;
    const entry = entries[editingEntryIndex];
    if (!entry) return;
    
    // Create duplicate entry
    const newIndex = entries.length;
    const duplicate: FusionEntry = {
      ...entry,
      id: `entry-${newIndex}`,
      index: newIndex,
      displayName: `${entry.displayName || `Entry ${entry.index + 1}`} (Copy)`,
    };
    
    setEntries(prev => [...prev, duplicate]);
    setSelectedEntryIndex(newIndex);
  }, [editingEntryIndex, entries]);
  const [dirtyEntries, setDirtyEntries] = useState<Set<number>>(new Set());
  const [originalBboxes, setOriginalBboxes] = useState<Map<number, BBox>>(new Map());

  // Check if Vision JSON is available
  const hasVisionData = useMemo(() => {
    return ocrResult?.fullTextAnnotation?.pages?.length > 0;
  }, [ocrResult]);

  // Check if an entry is complete (ready for review)
  // An entry is complete if it has been saved as a draft OR has any mapped fields
  const isEntryComplete = useCallback((entryIndex: number): boolean => {
    // Check from drafts first (server state) - any draft status counts as complete
    const draft = drafts.find(d => d.entry_index === entryIndex);
    if (draft) {
      return true; // Any saved draft is considered complete for workflow progression
    }
    
    // Check local state - has any fields mapped
    const data = entryData.get(entryIndex);
    if (!data) return false;
    
    // Entry is complete if it has at least one field with a value
    const fields = data.fields;
    const hasAnyField = Object.values(fields).some(field => 
      field && field.value && field.value.trim().length > 0
    );
    
    return hasAnyField;
  }, [drafts, entryData]);

  // Compute completion state for all entries
  const completionState = useMemo(() => {
    const completed = new Set<number>();
    entries.forEach((_, idx) => {
      if (isEntryComplete(idx)) {
        completed.add(idx);
      }
    });
    return completed;
  }, [entries, isEntryComplete]);

  // All entries complete check
  const allEntriesComplete = useMemo(() => {
    return entries.length > 0 && completionState.size === entries.length;
  }, [entries, completionState]);

  // Auto-advance to next incomplete entry
  const advanceToNextIncomplete = useCallback(() => {
    if (selectedEntryIndex === null) return;
    
    const currentWasComplete = prevCompletionRef.current.has(selectedEntryIndex);
    const currentIsComplete = completionState.has(selectedEntryIndex);
    
    // Only advance if this entry just became complete
    if (!currentWasComplete && currentIsComplete) {
      const nextIndex = entries.findIndex((_, idx) => !completionState.has(idx));
      
      if (nextIndex !== -1 && nextIndex !== selectedEntryIndex) {
        setShowAdvanceSnackbar(`Record ${selectedEntryIndex + 1} complete — now Record ${nextIndex + 1} of ${entries.length}`);
        setTimeout(() => {
          setSelectedEntryIndex(nextIndex);
        }, 500);
      } else if (allEntriesComplete) {
        setShowAdvanceSnackbar(`All ${entries.length} records complete!`);
      }
    }
    
    // Update previous completion ref
    prevCompletionRef.current = new Set(completionState);
  }, [selectedEntryIndex, completionState, entries, allEntriesComplete]);

  // Load stored entry data when switching entries
  useEffect(() => {
    handleEntrySwitch({
      activeStep, selectedEntryIndex, entries, entryData, initialRecordType, stickyDefaults,
      setDetectedLabels, setMappedFields, setRecordType, setActiveStep, setEntryData,
    });
  }, [selectedEntryIndex, entryData, entries, initialRecordType, ocrResult, activeStep]);

  // Effect to check for auto-advance after saves
  useEffect(() => {
    if (drafts.length > 0) {
      advanceToNextIncomplete();
    }
  }, [drafts, advanceToNextIncomplete]);

  // Handle bbox update for an entry - updates both entries and entryAreas
  const handleBboxUpdate = useCallback((entryIndex: number, newBbox: BBox) => {
    handleBboxUpdateLogic(entryIndex, newBbox, {
      entries, entryAreas, completionState, selectedEntryIndex, hasVisionData,
      setEntries, setEntryAreas, setDirtyEntries, setEntryData, onHighlightMultiple,
    });
  }, [entries, entryAreas, onHighlightMultiple, hasVisionData, completionState, selectedEntryIndex]);

  // Save bbox for an entry - persists entryAreas to server
  const handleSaveBbox = useCallback(async (entryIndex: number) => {
    await handleSaveBboxLogic(entryIndex, {
      entries, entryAreas, drafts, churchId, jobId, recordType,
      setIsProcessing, setError, setDrafts, setEntryAreas, setDirtyEntries,
      setOriginalBboxes, normalizeDraftsResponse,
    });
  }, [entries, entryAreas, drafts, churchId, jobId, recordType]);

  // Update highlights when completion state or selection changes - use entryAreas as source of truth
  useEffect(() => {
    if (onHighlightMultiple && hasVisionData) {
      // Use entryAreas if available, otherwise fallback to entries
      const entryBoxes = entryAreas.length > 0
        ? entryAreas.map((area) => {
            const entryIdx = entries.findIndex(e => e.id === area.entryId);
            return {
              bbox: area.bbox, // Use bbox from entryAreas (single source of truth)
              color: getEntryColor(entryIdx >= 0 ? entryIdx : 0),
              label: area.label,
              completed: entryIdx >= 0 ? completionState.has(entryIdx) : false,
              selected: entryIdx === selectedEntryIndex,
              entryIndex: entryIdx >= 0 ? entryIdx : 0,
              editable: bboxEditMode && entryIdx === selectedEntryIndex,
              onBboxChange: bboxEditMode && entryIdx >= 0 && entryIdx === selectedEntryIndex
                ? (newBbox: BBox) => handleBboxUpdate(entryIdx, newBbox)
                : undefined,
              onBboxChangeEnd: bboxEditMode && entryIdx >= 0 && entryIdx === selectedEntryIndex && autoSaveEnabled
                ? () => handleSaveBbox(entryIdx)
                : undefined,
            };
          })
        : entries.map((entry, idx) => ({
            bbox: entry.bbox,
            color: getEntryColor(idx),
            label: entry.displayName || `Entry ${idx + 1}${entry.recordNumber ? ` (#${entry.recordNumber})` : ''}`,
            completed: completionState.has(idx),
            selected: selectedEntryIndex === idx,
            entryIndex: idx,
            editable: bboxEditMode && idx === selectedEntryIndex,
            onBboxChange: bboxEditMode && idx === selectedEntryIndex
              ? (newBbox: BBox) => handleBboxUpdate(idx, newBbox)
              : undefined,
            onBboxChangeEnd: bboxEditMode && idx === selectedEntryIndex && autoSaveEnabled
              ? () => handleSaveBbox(idx)
              : undefined,
          }));

      // Include OCR selections as overlay boxes (with entryId if available)
      const selectionBoxes = (ocrSelections || []).map(sel => ({
        bbox: sel.bbox,
        color: '#2196F3',
        label: sel.text || '',
        emphasized: true,
        onClick: () => {
          console.log('[FusionTab] Selection clicked:', sel);
        },
      }));

      // Include per-field boxes if enabled and available
      const fieldBoxes: Array<{ bbox: BBox; color: string; label: string }> = [];
      if (showFieldBoxes && selectedEntryIndex !== null) {
        const selectedEntry = entries[selectedEntryIndex];
        if (selectedEntry) {
          const entryFields = fieldExtractions[selectedEntry.id];
          if (entryFields) {
            for (const [fieldKey, fieldExtraction] of Object.entries(entryFields)) {
              if (fieldExtraction.extractedText) {
                fieldBoxes.push({
                  bbox: fieldExtraction.bboxUnionPixels,
                  color: '#FF9800', // Orange for field boxes
                  label: `${fieldKey}: ${fieldExtraction.extractedText.substring(0, 20)}`,
                });
              }
            }
          }
        }
      }

      onHighlightMultiple([...entryBoxes, ...selectionBoxes, ...fieldBoxes]);
    }
  }, [entries, entryAreas, completionState, selectedEntryIndex, hasVisionData, onHighlightMultiple, bboxEditMode, autoSaveEnabled, handleBboxUpdate, handleSaveBbox, ocrSelections, showFieldBoxes, fieldExtractions]);

  // Initialize completion state from server on mount
  useEffect(() => {
    if (drafts.length > 0) {
      const serverComplete = new Set<number>();
      drafts.forEach(d => {
        if (['in_review', 'finalized', 'committed'].includes(d.status || '')) {
          serverComplete.add(d.entry_index);
        }
      });
      setCompletedEntries(serverComplete);
      prevCompletionRef.current = serverComplete;
    }
  }, [drafts]);

  // Step 1: Detect Entries

  const handleDetectEntries = useCallback(async () => {
    await handleDetectEntriesLogic(
      { ocrResult, ocrText, recordType, initialRecordType, hasVisionData, churchId, jobId, completionState, selectedEntryIndex, normalizeDraftsResponse },
      { setEntries, setSelectedEntryIndex, setEntryAreas, setOriginalBboxes, setFieldExtractions, setEntryData, setIsProcessing, setError, onHighlightMultiple },
    );
  }, [ocrResult, ocrText, initialRecordType, hasVisionData, onHighlightMultiple, completionState, selectedEntryIndex]);

  // Handle manual entry count
  const handleManualEntryCount = useCallback(() => {
    const count = Math.max(1, Math.min(10, manualEntryCount));
    
    // Create placeholder entries
    const manualEntries: FusionEntry[] = [];
    for (let i = 0; i < count; i++) {
      manualEntries.push({
        id: `manual-entry-${i}`,
        index: i,
        recordNumber: undefined,
        bbox: { x: 0, y: 0, w: 0, h: 0 }, // No bbox for manual entries
        blocks: [],
        lines: [],
      });
    }
    
    setEntries(manualEntries);
    setSelectedEntryIndex(0);
    
    // Initialize entry data
    const newEntryData = new Map<number, any>();
    manualEntries.forEach((_, idx) => {
      newEntryData.set(idx, {
        labels: [],
        fields: {},
        recordType: initialRecordType,
      });
    });
    setEntryData(newEntryData);
    
    // Mark all as manual edit mode
    setManualEditMode(new Set(manualEntries.map((_, idx) => idx)));
    
    // Skip to Map Fields step for manual mode
    setActiveStep(2);
  }, [manualEntryCount, initialRecordType]);

  // Toggle manual edit mode for an entry
  const toggleManualEditMode = useCallback((entryIndex: number) => {
    setManualEditMode(prev => {
      const next = new Set(prev);
      if (next.has(entryIndex)) {
        next.delete(entryIndex);
      } else {
        next.add(entryIndex);
      }
      return next;
    });
  }, []);

  // Reset bbox to original detected value
  const handleResetBbox = useCallback((entryIndex: number) => {
    const original = originalBboxes.get(entryIndex);
    if (original) {
      handleBboxUpdate(entryIndex, original);
    }
  }, [originalBboxes, handleBboxUpdate]);

  // Add a new entry
  const handleAddEntry = useCallback(() => {
    const visionSize = getVisionPageSize(ocrResult);
    const newIndex = entries.length;
    const newEntry: FusionEntry = {
      id: `manual-entry-${Date.now()}`,
      index: newIndex,
      recordNumber: undefined,
      recordType: recordType,
      // Default to center of image
      bbox: {
        x: visionSize ? visionSize.width * 0.25 : 0,
        y: visionSize ? visionSize.height * 0.25 : 0,
        w: visionSize ? visionSize.width * 0.5 : 100,
        h: visionSize ? visionSize.height * 0.5 : 100,
      },
      blocks: [],
      lines: [],
    };

    setEntries(prev => [...prev, newEntry]);
    setSelectedEntryIndex(newIndex);
    
    // Initialize entry data
    setEntryData(prev => {
      const newData = new Map(prev);
      newData.set(newIndex, {
        labels: [],
        fields: {},
        recordType: recordType,
      });
      return newData;
    });

    // Store original bbox
    setOriginalBboxes(prev => {
      const next = new Map(prev);
      next.set(newIndex, newEntry.bbox);
      return next;
    });

    // Mark as manual edit mode
    setManualEditMode(prev => new Set(prev).add(newIndex));
  }, [entries, ocrResult, recordType]);

  // Mark entry as in progress when selected
  useEffect(() => {
    if (selectedEntryIndex !== null && !completionState.has(selectedEntryIndex)) {
      setInProgressEntries(prev => new Set(prev).add(selectedEntryIndex));
    }
  }, [selectedEntryIndex, completionState]);

  // Step 2: Anchor Labels

  const handleDetectLabels = useCallback(async () => {
    await handleDetectLabelsLogic({
      selectedEntryIndex, entries, entryData, recordType, detectedLabels,
      mappedFields, hasVisionData, stickyDefaults,
      setIsProcessing, setError, setDetectedLabels, setMappedFields, setEntryData,
      onHighlightMultiple, onHighlightBbox,
    });
  }, [selectedEntryIndex, entries, entryData, recordType, hasVisionData, onHighlightMultiple]);

  // Step 3: Map Fields

  const handleAutoMap = useCallback(async () => {
    await handleAutoMapLogic({
      selectedEntryIndex, entries, entryData, recordType, detectedLabels,
      mappedFields, hasVisionData, stickyDefaults,
      setIsProcessing, setError, setDetectedLabels, setMappedFields, setEntryData,
      onHighlightMultiple, onHighlightBbox,
    });
  }, [selectedEntryIndex, entries, entryData, detectedLabels]);

  const handleFieldChange = useCallback((fieldName: string, value: string) => {
    handleFieldChangeLogic(fieldName, value, selectedEntryIndex, recordType, setMappedFields, setEntryData);
  }, [selectedEntryIndex, recordType]);

  const handleFieldFocus = useCallback((fieldName: string) => {
    const field = mappedFields[fieldName];
    if (field?.valueBbox && onHighlightBbox) {
      onHighlightBbox(field.valueBbox, '#FF9800');
    }
  }, [mappedFields, onHighlightBbox]);

  // Step 4: Save Drafts & Commit (handlers in useFusionDrafts hook)

  // Trigger auto-save when mappedFields or entryData changes (during Map Fields step)
  useEffect(() => {
    if (activeStep >= 2 && autoSaveEnabled && Object.keys(mappedFields).length > 0) {
      console.log('[Fusion] Triggering auto-save, fields changed:', Object.keys(mappedFields).length, 'fields');
      triggerAutoSave();
    }
    
    return () => {
      // Cleanup handled by hook
    };
  }, [mappedFields, entryData, activeStep, autoSaveEnabled, triggerAutoSave]);

  // Save on step change (when leaving Map Fields step)
  useEffect(() => {
    if (autoSaveEnabled && selectedEntryIndex !== null) {
      return () => {
        if (pendingSaveRef.current) {
          saveDraftForEntry(selectedEntryIndex, true);
          pendingSaveRef.current = false;
        }
      };
    }
  }, [activeStep, autoSaveEnabled, selectedEntryIndex, saveDraftForEntry]);

  // Wrap handleSendToReview to also use component's isProcessing
  const handleSendToReview = useCallback(async () => {
    setIsProcessing(true);
    try {
      await handleSendToReviewDrafts();
    } finally {
      setIsProcessing(false);
    }
  }, [handleSendToReviewDrafts]);

  // Navigation

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, 3));
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  const handleEntrySelect = (index: number) => {
    setSelectedEntryIndex(index);
    const data = entryData.get(index);
    if (data) {
      setDetectedLabels(data.labels);
      setMappedFields(data.fields);
      setRecordType(data.recordType);
    } else {
      setDetectedLabels([]);
      setMappedFields({});
    }

    // Highlight selected entry
    if (entries[index] && onHighlightBbox) {
      onHighlightBbox(entries[index].bbox, '#4CAF50');
    }
  };

  const handleRecordTypeChange = (newType: 'baptism' | 'marriage' | 'funeral') => {
    setRecordType(newType);
    if (selectedEntryIndex !== null) {
      setEntryData(prev => {
        const newData = new Map(prev);
        const existing = newData.get(selectedEntryIndex) || { labels: [], fields: {}, recordType };
        newData.set(selectedEntryIndex, { ...existing, recordType: newType });
        return newData;
      });
    }
  };

  // Load existing drafts and mappings on mount
  useEffect(() => {
    loadExistingData({ churchId, jobId, initialRecordType, normalizeDraftsResponse, setDrafts, setEntryData });
  }, [churchId, jobId, initialRecordType]);

  // Render Helpers

  const selectedEntry = selectedEntryIndex !== null ? entries[selectedEntryIndex] : null;
  
  // Filter fields based on sticky defaults - use canonical schema registry
  const currentFields = useMemo(() => {
    // Use canonical schema registry instead of RECORD_FIELDS
    const schema = getRecordSchema(recordType, {
      stickyDefaults: stickyDefaults[recordType],
    });
    
    // Convert schema to RECORD_FIELDS format for backward compatibility
    return schema.map(field => ({
      name: field.key, // Use canonical key
      label: field.label,
      required: field.required,
      type: field.dataType,
    }));
  }, [recordType, stickyDefaults]);
  
  // Dev-only validation
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const fieldKeys = Object.keys(mappedFields);
      if (fieldKeys.length > 0) {
        const validation = validateFieldKeys(recordType, fieldKeys);
        if (!validation.valid) {
          console.warn('[FusionTab] Field key validation failed:', validation.errors);
        }
      }
    }
  }, [mappedFields, recordType]);

  // Render

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          Fusion Workflow
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {/* Auto-save indicator */}
          {isSaving && (
            <Chip
              size="small"
              icon={<CircularProgress size={12} />}
              label="Saving..."
              color="info"
              variant="outlined"
            />
          )}
          {pendingSaveRef.current && !isSaving && (
            <Chip
              size="small"
              icon={<IconAlertCircle size={14} />}
              label="Unsaved changes"
              color="warning"
              variant="outlined"
            />
          )}
          {lastSaved && !isSaving && !pendingSaveRef.current && (
            <Tooltip title={`Last saved: ${lastSaved.toLocaleTimeString()}`}>
              <Chip
                size="small"
                icon={<IconCheck size={14} />}
                label="Saved"
                color="success"
                variant="outlined"
              />
            </Tooltip>
          )}
          {/* Auto-save toggle */}
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
              />
            }
            label={<Typography variant="caption">Auto-save</Typography>}
            sx={{ ml: 1 }}
          />
          {!hasVisionData && (
            <Chip
              size="small"
              color="warning"
              icon={<IconAlertCircle size={16} />}
              label="Text-only mode"
            />
          )}
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Progress Header */}
      {entries.length > 0 && activeStep >= 1 && (
        <FusionProgressHeader
          entries={entries}
          selectedEntryIndex={selectedEntryIndex}
          setSelectedEntryIndex={setSelectedEntryIndex}
          completionState={completionState}
          inProgressEntries={inProgressEntries}
          allEntriesComplete={allEntriesComplete}
          hideCompleted={hideCompleted}
          setHideCompleted={setHideCompleted}
          manualEditMode={manualEditMode}
          isProcessing={isProcessing}
          onSendToReview={handleSendToReview}
        />
      )}

      {/* Stepper */}
      <Stepper activeStep={activeStep} orientation="vertical" sx={{ flex: 1, overflow: 'auto' }}>
        {/* Step 1: Detect Entries */}
        <Step>
          <StepLabel StepIconComponent={() => <StepIcon activeStep={activeStep} stepIndex={0} icon={<IconWand size={18} />} />}>
            <Typography fontWeight={activeStep === 0 ? 600 : 400}>
              Detect Entries
              {entries.length > 0 && (
                <Chip size="small" label={`${entries.length} found`} color="success" sx={{ ml: 1 }} />
              )}
            </Typography>
          </StepLabel>
          <StepContent>
            <DetectEntriesStep
              entries={entries}
              entryAreas={entryAreas}
              drafts={drafts}
              selectedEntryIndex={selectedEntryIndex}
              completionState={completionState}
              inProgressEntries={inProgressEntries}
              dirtyEntries={dirtyEntries}
              hideCompleted={hideCompleted}
              bboxEditMode={bboxEditMode}
              setBboxEditMode={setBboxEditMode}
              showFieldBoxes={showFieldBoxes}
              setShowFieldBoxes={setShowFieldBoxes}
              manualEntryCount={manualEntryCount}
              setManualEntryCount={setManualEntryCount}
              isProcessing={isProcessing}
              onDetectEntries={handleDetectEntries}
              onManualEntryCount={handleManualEntryCount}
              onEntrySelect={handleEntrySelect}
              onAddEntry={handleAddEntry}
              onDeleteEntry={handleDeleteEntry}
              onSaveBbox={handleSaveBbox}
              onResetBbox={handleResetBbox}
              onEditEntry={(idx) => { setEditingEntryIndex(idx); setEntryEditorOpen(true); }}
              onNext={handleNext}
            />
          </StepContent>
        </Step>

        {/* Step 2: Anchor Labels */}
        <Step>
          <StepLabel
            StepIconComponent={() => (
              <StepIcon activeStep={activeStep} stepIndex={1} icon={<IconTarget size={18} />} />
            )}
          >
            <Typography fontWeight={activeStep === 1 ? 600 : 400}>
              Anchor Labels
              {detectedLabels.length > 0 && (
                <Chip size="small" label={`${detectedLabels.length} labels`} color="info" sx={{ ml: 1 }} />
              )}
            </Typography>
          </StepLabel>
          <StepContent>
            <AnchorLabelsStep
              selectedEntry={selectedEntry}
              detectedLabels={detectedLabels}
              recordType={recordType}
              isProcessing={isProcessing}
              onDetectLabels={handleDetectLabels}
              onRecordTypeChange={handleRecordTypeChange}
              onHighlightBbox={onHighlightBbox}
              onNext={handleNext}
              onBack={handleBack}
            />
          </StepContent>
        </Step>

        {/* Step 3: Map Fields */}
        <Step>
          <StepLabel
            StepIconComponent={() => (
              <StepIcon activeStep={activeStep} stepIndex={2} icon={<IconMap size={18} />} />
            )}
          >
            <Typography fontWeight={activeStep === 2 ? 600 : 400}>
              Map Fields
            </Typography>
          </StepLabel>
          <StepContent>
            <MapFieldsStep
              selectedEntry={selectedEntry}
              selectedEntryIndex={selectedEntryIndex}
              mappedFields={mappedFields}
              currentFields={currentFields}
              isProcessing={isProcessing}
              manualEditMode={manualEditMode}
              onAutoMap={handleAutoMap}
              onFieldChange={handleFieldChange}
              onFieldFocus={handleFieldFocus}
              onToggleManualEdit={toggleManualEditMode}
              onHighlightBbox={onHighlightBbox}
              onNext={handleNext}
              onBack={handleBack}
            />
          </StepContent>
        </Step>

        {/* Step 4: Save & Commit */}
        <Step>
          <StepLabel
            StepIconComponent={() => (
              <StepIcon activeStep={activeStep} stepIndex={3} icon={<IconDeviceFloppy size={18} />} />
            )}
          >
            <Typography fontWeight={activeStep === 3 ? 600 : 400}>
              Save & Commit
              {drafts.length > 0 && (
                <Chip
                  size="small"
                  label={`${drafts.filter(d => d.status === 'draft').length} drafts`}
                  color="warning"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
          </StepLabel>
          <StepContent>
            <SaveCommitStep
              entries={entries}
              drafts={drafts}
              recordType={recordType}
              selectedEntryIndex={selectedEntryIndex}
              isProcessing={isProcessing}
              isSaving={isSaving}
              commitSuccess={commitSuccess}
              setCommitSuccess={setCommitSuccess}
              validationResult={validationResult}
              onSaveDraft={handleSaveDraft}
              onSaveAllDrafts={handleSaveAllDrafts}
              onSendToReview={handleSendToReview}
              onValidateDrafts={handleValidateDrafts}
              onOpenCommitDialog={handleOpenCommitDialog}
              onBack={handleBack}
            />
          </StepContent>
        </Step>
      </Stepper>

      {/* Commit Confirmation Dialog */}
      <CommitDialog
        open={showCommitDialog}
        onClose={() => setShowCommitDialog(false)}
        onConfirm={handleCommitDrafts}
        drafts={drafts}
        recordType={recordType}
        churchId={churchId}
        churchName={validationResult?.church_name}
      />

      {/* Processing overlay */}
      {isProcessing && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: alpha(theme.palette.background.paper, 0.7),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Stack alignItems="center" spacing={2}>
            <CircularProgress size={48} />
            <Typography variant="body2" color="text.secondary">
              Processing...
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Auto-advance snackbar */}
      <Snackbar
        open={!!showAdvanceSnackbar}
        autoHideDuration={3000}
        onClose={() => setShowAdvanceSnackbar(null)}
        message={showAdvanceSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* Entry Editor Dialog */}
      <EntryEditorDialog
          open={entryEditorOpen}
          entry={editingEntryIndex !== null ? entries[editingEntryIndex] : null}
          recordType={recordType}
          onClose={() => {
            setEntryEditorOpen(false);
            setEditingEntryIndex(null);
          }}
          onSave={handleEntryEditorSave}
          onDelete={handleEntryEditorDelete}
          onDuplicate={handleEntryEditorDuplicate}
        />
    </Box>
  );
};

export default FusionTab;

