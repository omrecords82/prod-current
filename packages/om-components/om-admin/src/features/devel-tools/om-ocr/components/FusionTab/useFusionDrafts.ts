/**
 * useFusionDrafts — Custom hook encapsulating all draft save, auto-save,
 * validate, commit, and send-to-review logic for the FusionTab.
 * Extracted from FusionTab.tsx
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  FusionEntry,
  FusionDraft,
  MappedField,
  EntryArea,
} from '../../types/fusion';
import { apiClient } from '@/shared/lib/axiosInstance';

interface UseFusionDraftsParams {
  entries: FusionEntry[];
  entryData: Map<number, {
    labels: any[];
    fields: Record<string, MappedField>;
    recordType: 'baptism' | 'marriage' | 'funeral';
  }>;
  entryAreas: EntryArea[];
  recordType: 'baptism' | 'marriage' | 'funeral';
  mappedFields: Record<string, MappedField>;
  selectedEntryIndex: number | null;
  churchId: number;
  jobId: number;
  initialRecordType: 'baptism' | 'marriage' | 'funeral';
  onSendToReview?: () => void;
}

interface UseFusionDraftsReturn {
  drafts: FusionDraft[];
  setDrafts: React.Dispatch<React.SetStateAction<FusionDraft[]>>;
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  lastSaved: Date | null;
  isSaving: boolean;
  isProcessing: boolean;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  validationResult: ValidationResult | null;
  showCommitDialog: boolean;
  setShowCommitDialog: React.Dispatch<React.SetStateAction<boolean>>;
  commitSuccess: boolean;
  setCommitSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  pendingSaveRef: React.MutableRefObject<boolean>;
  normalizeDraftsResponse: (response: any) => FusionDraft[];
  saveDraftForEntry: (entryIndex: number, silent?: boolean) => Promise<boolean>;
  handleSaveDraft: () => Promise<void>;
  triggerAutoSave: () => void;
  handleSaveAllDrafts: () => Promise<void>;
  handleSendToReview: () => Promise<void>;
  handleValidateDrafts: () => Promise<void>;
  handleOpenCommitDialog: () => void;
  handleCommitDrafts: () => Promise<void>;
}

interface ValidationResult {
  valid: boolean;
  church_name?: string;
  drafts: Array<{
    id: number;
    entry_index: number;
    record_type: string;
    missing_fields: string[];
    warnings: string[];
  }>;
  summary?: { total: number; valid: number; invalid: number; warnings: number };
}

export function useFusionDrafts({
  entries,
  entryData,
  entryAreas,
  recordType,
  mappedFields,
  selectedEntryIndex,
  churchId,
  jobId,
  initialRecordType,
  onSendToReview,
}: UseFusionDraftsParams): UseFusionDraftsReturn {
  // Draft state
  const [drafts, setDrafts] = useState<FusionDraft[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-save state
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef(false);

  // Validation and commit state
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState(false);

  // Error state (local, surfaced via return)
  const [error, setError] = useState<string | null>(null);

  // Helper function to normalize drafts API response
  const normalizeDraftsResponse = useCallback((response: any): FusionDraft[] => {
    const responseData = response?.data ?? response;
    
    if (Array.isArray(responseData)) {
      return responseData;
    } else if (responseData?.drafts && Array.isArray(responseData.drafts)) {
      return responseData.drafts;
    } else if (responseData?.data?.drafts && Array.isArray(responseData.data.drafts)) {
      return responseData.data.drafts;
    } else {
      return [];
    }
  }, []);

  // Core save function (used by both manual and auto-save)
  const saveDraftForEntry = useCallback(async (entryIndex: number, silent = false) => {
    if (entryIndex === null || !entries[entryIndex]) return false;

    if (!silent) setIsProcessing(true);
    setIsSaving(true);

    try {
      const entry = entries[entryIndex];
      const data = entryData.get(entryIndex);
      const currentRecordType = data?.recordType || recordType;
      const fields = data?.fields || (entryIndex === selectedEntryIndex ? mappedFields : {});

      // Build payload
      const payload: Record<string, any> = {};
      for (const [fieldName, field] of Object.entries(fields)) {
        if (field.value) {
          payload[fieldName] = field.value;
        }
      }

      // Include normalized transcription if available (server normalization feature flag)
      try {
        const serverNormalizationEnabled = localStorage.getItem('OCR_NORMALIZE_SERVER') === '1';
        if (serverNormalizationEnabled) {
          const workbenchState = (window as any).__workbenchState;
          if (workbenchState?.normalizedText) {
            payload.ocr_text_normalized = workbenchState.normalizedText;
          }
        }
      } catch (e) {
        console.debug('[FusionTab] Could not access normalized text:', e);
      }

      // Skip if no data to save
      if (Object.keys(payload).length === 0) {
        setIsSaving(false);
        if (!silent) setIsProcessing(false);
        return false;
      }

      // Get entryArea for this entry (single source of truth)
      const entryArea = entryAreas.find(a => a.entryId === entry.id);
      
      const bboxJson = {
        // Legacy support
        entryBbox: entry.bbox,
        // New format - include entryAreas if available
        entryAreas: entryAreas.length > 0 ? entryAreas : undefined,
        fieldBboxes: Object.fromEntries(
          Object.entries(fields).map(([name, f]) => [
            name,
            { label: f.labelBbox, value: f.valueBbox },
          ])
        ),
        // Selections keyed by entryId and fieldKey
        selections: {},
      };

      const response = await apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${jobId}/fusion/drafts`,
        {
          entries: [{
            entry_index: entryIndex,
            record_type: currentRecordType,
            record_number: entry.recordNumber,
            payload_json: payload,
            bbox_json: bboxJson,
          }],
        }
      );

      // Normalize API response shape
      const savedDrafts = normalizeDraftsResponse(response);
      setDrafts(prev => {
        const updated = [...prev];
        for (const draft of savedDrafts) {
          const idx = updated.findIndex(d => d.entry_index === draft.entry_index);
          if (idx >= 0) {
            updated[idx] = draft;
          } else {
            updated.push(draft);
          }
        }
        return updated;
      });

      setLastSaved(new Date());
      if (!silent) setError(null);
      return true;
    } catch (err: any) {
      console.error('[Fusion] Save draft error:', err);
      if (!silent) setError(err.message || 'Failed to save draft');
      return false;
    } finally {
      setIsSaving(false);
      if (!silent) setIsProcessing(false);
    }
  }, [entries, entryData, entryAreas, recordType, mappedFields, selectedEntryIndex, churchId, jobId, normalizeDraftsResponse]);

  const handleSaveDraft = useCallback(async () => {
    if (selectedEntryIndex === null) return;
    await saveDraftForEntry(selectedEntryIndex, false);
  }, [selectedEntryIndex, saveDraftForEntry]);

  // Auto-save: debounced save when fields change
  const triggerAutoSave = useCallback(() => {
    if (!autoSaveEnabled || selectedEntryIndex === null) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    pendingSaveRef.current = true;

    // Set new timer (2 second debounce)
    autoSaveTimerRef.current = setTimeout(async () => {
      if (pendingSaveRef.current && selectedEntryIndex !== null) {
        console.log('[Fusion] Auto-saving draft...');
        await saveDraftForEntry(selectedEntryIndex, true);
        pendingSaveRef.current = false;
      }
    }, 2000);
  }, [autoSaveEnabled, selectedEntryIndex, saveDraftForEntry]);

  const handleSaveAllDrafts = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const entriesToSave = entries.map((entry, idx) => {
        const data = entryData.get(idx);
        const currentRecordType = data?.recordType || recordType;
        const fields = data?.fields || {};

        const payload: Record<string, any> = {};
        for (const [fieldName, field] of Object.entries(fields)) {
          if (field.value) {
            payload[fieldName] = field.value;
          }
        }

        return {
          entry_index: idx,
          record_type: currentRecordType,
          record_number: entry.recordNumber,
          payload_json: payload,
          bbox_json: {
            // Legacy support
            entryBbox: entry.bbox,
            // New format - include entryAreas (single source of truth)
            entryAreas: entryAreas.length > 0 ? entryAreas : undefined,
            fieldBboxes: Object.fromEntries(
              Object.entries(fields).map(([name, f]) => [
                name,
                { label: f.labelBbox, value: f.valueBbox },
              ])
            ),
            // Selections keyed by entryId and fieldKey
            selections: {},
          },
        };
      });

      const response = await apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${jobId}/fusion/drafts`,
        { entries: entriesToSave }
      );

      // Normalize API response shape
      const savedDrafts = normalizeDraftsResponse(response);
      setDrafts(savedDrafts);
    } catch (err: any) {
      console.error('[Fusion] Save all drafts error:', err);
      setError(err.message || 'Failed to save drafts');
    } finally {
      setIsProcessing(false);
    }
  }, [entries, entryData, entryAreas, recordType, churchId, jobId, normalizeDraftsResponse]);

  // Send to Review & Finalize
  const handleSendToReview = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // First save all drafts
      await handleSaveAllDrafts();

      // Mark as ready for review
      const entryIndexes = entries.map((_, idx) => idx);
      await apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${jobId}/fusion/ready-for-review`,
        { entry_indexes: entryIndexes }
      );

      // Refresh drafts
      const response = await apiClient.get(`/api/church/${churchId}/ocr/jobs/${jobId}/fusion/drafts`);
      const loadedDrafts = normalizeDraftsResponse(response);
      setDrafts(loadedDrafts);

      setError(null);
      
      // Call the callback to switch to Review tab and close dialog
      if (onSendToReview) {
        onSendToReview();
      }
    } catch (err: any) {
      console.error('[Fusion] Send to Review error:', err);
      setError(err.message || 'Failed to send to review');
    } finally {
      setIsProcessing(false);
    }
  }, [entries, churchId, jobId, handleSaveAllDrafts, onSendToReview, normalizeDraftsResponse]);

  // Validate drafts before commit
  const handleValidateDrafts = useCallback(async () => {
    if (drafts.length === 0) {
      setError('No drafts to validate. Save drafts first.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${jobId}/fusion/validate`
      );

      const result = (response as any).data;
      setValidationResult(result);

      if (!result.valid) {
        const invalidCount = result.summary?.invalid || 0;
        setError(`Validation failed: ${invalidCount} draft(s) have missing required fields.`);
      }
    } catch (err: any) {
      console.error('[Fusion] Validation error:', err);
      setError(err.message || 'Failed to validate drafts');
    } finally {
      setIsProcessing(false);
    }
  }, [drafts, churchId, jobId]);

  // Open commit confirmation dialog
  const handleOpenCommitDialog = useCallback(() => {
    if (!validationResult?.valid) {
      setError('Please validate drafts first. All required fields must be filled.');
      return;
    }
    setShowCommitDialog(true);
  }, [validationResult]);

  // Commit drafts to database
  const handleCommitDrafts = useCallback(async () => {
    if (drafts.length === 0) {
      setError('No drafts to commit. Save drafts first.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setShowCommitDialog(false);

    try {
      const draftIds = drafts.filter(d => d.status === 'draft').map(d => d.id!);
      
      if (draftIds.length === 0) {
        setError('All drafts are already committed.');
        setIsProcessing(false);
        return;
      }

      const response = await apiClient.post(
        `/api/church/${churchId}/ocr/jobs/${jobId}/fusion/commit`,
        { draft_ids: draftIds }
      );

      const result = (response as any).data;
      
      if (result.errors?.length > 0) {
        setError(`Committed ${result.committed?.length || 0} records. Errors: ${result.errors.map((e: any) => e.error).join(', ')}`);
      } else {
        setCommitSuccess(true);
      }

      // Refresh drafts
      const draftsResponse = await apiClient.get(
        `/api/church/${churchId}/ocr/jobs/${jobId}/fusion/drafts`
      );
      const loadedDrafts = normalizeDraftsResponse(draftsResponse);
      setDrafts(loadedDrafts);
      setValidationResult(null); // Clear validation after commit
    } catch (err: any) {
      console.error('[Fusion] Commit error:', err);
      setError(err.message || 'Failed to commit drafts');
    } finally {
      setIsProcessing(false);
    }
  }, [drafts, churchId, jobId, normalizeDraftsResponse]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  return {
    drafts,
    setDrafts,
    autoSaveEnabled,
    setAutoSaveEnabled,
    lastSaved,
    isSaving,
    isProcessing,
    setIsProcessing,
    validationResult,
    showCommitDialog,
    setShowCommitDialog,
    commitSuccess,
    setCommitSuccess,
    pendingSaveRef,
    normalizeDraftsResponse,
    saveDraftForEntry,
    handleSaveDraft,
    triggerAutoSave,
    handleSaveAllDrafts,
    handleSendToReview,
    handleValidateDrafts,
    handleOpenCommitDialog,
    handleCommitDrafts,
  };
}
