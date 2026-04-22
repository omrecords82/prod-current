/**
 * WorkbenchContext - Shared state for OCR Workbench
 * Single source of truth for all workbench state across steps
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type { BBox, VisionResponse, DetectedLabel, FusionEntry, EntryArea } from '../types/fusion';
import type { RecordType } from '@/shared/recordSchemas/registry';
import type { ScoringV2Result } from '../types/pipeline';

// ============================================================================
// State Shape
// ============================================================================

export interface WorkbenchState {
  // Job metadata
  activeJobId: number | null;
  jobMetadata: {
    filename: string;
    recordType: RecordType;
    status: string;
    confidence: number;
    churchId: number;
  } | null;
  
  // OCR data
  ocrText: string | null;
  ocrResult: VisionResponse | null;
  imageUrl: string | null;
  normalizedText: string | null; // Server-normalized transcription (when flag enabled)
  
  // Step 1: Detect Entries
  entries: FusionEntry[];
  entryAreas: EntryArea[]; // Single source of truth for entry bounding boxes
  selectedEntryIndex: number | null;
  bboxEditMode: boolean;
  
  // Step 2: Anchor Labels
  detectedLabels: DetectedLabel[];
  labelCandidates: Array<{ text: string; bbox: BBox; confidence: number; canonicalKey?: string }>;
  
  // Step 3: Map Fields
  fieldValues: Record<string, { value: string; confidence?: number; source?: string }>; // keyed by canonical schema key
  fieldExtractions: Record<string, Record<string, any>>; // keyed by entryId, then fieldKey
  
  // Pipeline artifacts (loaded from job detail)
  scoringV2: ScoringV2Result | null;
  recordCandidates: any | null;

  // Step 4: Review/Commit
  drafts: Array<{
    id?: number;
    entry_index: number;
    record_type: string;
    payload_json: any;
    bbox_json?: any;
    status?: string;
  }>;
  
  // Per-step status
  stepStatus: {
    detectEntries: { complete: boolean; error?: string };
    anchorLabels: { complete: boolean; error?: string };
    mapFields: { complete: boolean; error?: string };
    reviewCommit: { complete: boolean; error?: string };
  };
  
  // UI state
  activeStep: number;
  isProcessing: boolean;
  error: string | null;
}

// ============================================================================
// Actions
// ============================================================================

export type WorkbenchAction =
  | { type: 'SET_JOB'; payload: { jobId: number; metadata: WorkbenchState['jobMetadata']; ocrText: string | null; ocrResult: VisionResponse | null; imageUrl: string | null } }
  | { type: 'SET_NORMALIZED_TEXT'; payload: string | null }
  | { type: 'SET_ENTRIES'; payload: FusionEntry[] }
  | { type: 'SET_ENTRY_AREAS'; payload: EntryArea[] }
  | { type: 'UPDATE_ENTRY_AREA'; payload: { entryId: string; bbox: BBox } }
  | { type: 'SET_SELECTED_ENTRY'; payload: number | null }
  | { type: 'SET_BBOX_EDIT_MODE'; payload: boolean }
  | { type: 'SET_DETECTED_LABELS'; payload: DetectedLabel[] }
  | { type: 'SET_LABEL_CANDIDATES'; payload: WorkbenchState['labelCandidates'] }
  | { type: 'SET_FIELD_VALUE'; payload: { key: string; value: string; confidence?: number; source?: string } }
  | { type: 'SET_FIELD_VALUES'; payload: Record<string, { value: string; confidence?: number; source?: string }> }
  | { type: 'SET_FIELD_EXTRACTIONS'; payload: Record<string, Record<string, any>> }
  | { type: 'SET_SCORING_V2'; payload: ScoringV2Result | null }
  | { type: 'SET_RECORD_CANDIDATES'; payload: any | null }
  | { type: 'SET_DRAFTS'; payload: WorkbenchState['drafts'] }
  | { type: 'ADD_DRAFT'; payload: WorkbenchState['drafts'][0] }
  | { type: 'UPDATE_DRAFT'; payload: { index: number; draft: Partial<WorkbenchState['drafts'][0]> } }
  | { type: 'SET_STEP_STATUS'; payload: { step: keyof WorkbenchState['stepStatus']; status: Partial<WorkbenchState['stepStatus'][keyof WorkbenchState['stepStatus']]> } }
  | { type: 'SET_ACTIVE_STEP'; payload: number }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };

// ============================================================================
// Reducer
// ============================================================================

const initialState: WorkbenchState = {
  activeJobId: null,
  jobMetadata: null,
  ocrText: null,
  ocrResult: null,
  imageUrl: null,
  normalizedText: null,
  entries: [],
  entryAreas: [],
  selectedEntryIndex: null,
  bboxEditMode: false,
  detectedLabels: [],
  labelCandidates: [],
  fieldValues: {},
  fieldExtractions: {},
  scoringV2: null,
  recordCandidates: null,
  drafts: [],
  stepStatus: {
    detectEntries: { complete: false },
    anchorLabels: { complete: false },
    mapFields: { complete: false },
    reviewCommit: { complete: false },
  },
  activeStep: 0,
  isProcessing: false,
  error: null,
};

function workbenchReducer(state: WorkbenchState, action: WorkbenchAction): WorkbenchState {
  switch (action.type) {
    case 'SET_JOB':
      return {
        ...state,
        activeJobId: action.payload.jobId,
        jobMetadata: action.payload.metadata,
        ocrText: action.payload.ocrText,
        ocrResult: action.payload.ocrResult,
        imageUrl: action.payload.imageUrl,
        normalizedText: null, // Reset normalized text when job changes
        // Reset step-specific state when job changes
        entries: [],
        entryAreas: [],
        selectedEntryIndex: null,
        detectedLabels: [],
        labelCandidates: [],
        fieldValues: {},
        fieldExtractions: {},
        scoringV2: null,
        recordCandidates: null,
        drafts: [],
        activeStep: 0,
      };
    case 'SET_NORMALIZED_TEXT':
      return {
        ...state,
        normalizedText: action.payload,
      };
    
    case 'SET_ENTRIES':
      return { ...state, entries: action.payload };
    
    case 'SET_ENTRY_AREAS':
      return { ...state, entryAreas: action.payload };
    
    case 'UPDATE_ENTRY_AREA':
      return {
        ...state,
        entryAreas: state.entryAreas.map(area =>
          area.entryId === action.payload.entryId
            ? { ...area, bbox: action.payload.bbox }
            : area
        ),
      };
    
    case 'SET_SELECTED_ENTRY':
      return { ...state, selectedEntryIndex: action.payload };
    
    case 'SET_BBOX_EDIT_MODE':
      return { ...state, bboxEditMode: action.payload };
    
    case 'SET_DETECTED_LABELS':
      return { ...state, detectedLabels: action.payload };
    
    case 'SET_LABEL_CANDIDATES':
      return { ...state, labelCandidates: action.payload };
    
    case 'SET_FIELD_VALUE':
      return {
        ...state,
        fieldValues: {
          ...state.fieldValues,
          [action.payload.key]: {
            value: action.payload.value,
            confidence: action.payload.confidence,
            source: action.payload.source,
          },
        },
      };
    
    case 'SET_FIELD_VALUES':
      return { ...state, fieldValues: action.payload };
    
    case 'SET_FIELD_EXTRACTIONS':
      return { ...state, fieldExtractions: action.payload };
    
    case 'SET_SCORING_V2':
      return { ...state, scoringV2: action.payload };

    case 'SET_RECORD_CANDIDATES':
      return { ...state, recordCandidates: action.payload };

    case 'SET_DRAFTS':
      return { ...state, drafts: action.payload };
    
    case 'ADD_DRAFT':
      return { ...state, drafts: [...state.drafts, action.payload] };
    
    case 'UPDATE_DRAFT':
      return {
        ...state,
        drafts: state.drafts.map((draft, idx) =>
          idx === action.payload.index
            ? { ...draft, ...action.payload.draft }
            : draft
        ),
      };
    
    case 'SET_STEP_STATUS':
      return {
        ...state,
        stepStatus: {
          ...state.stepStatus,
          [action.payload.step]: {
            ...state.stepStatus[action.payload.step],
            ...action.payload.status,
          },
        },
      };
    
    case 'SET_ACTIVE_STEP':
      return { ...state, activeStep: action.payload };
    
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'RESET':
      return initialState;
    
    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

interface WorkbenchContextValue {
  state: WorkbenchState;
  dispatch: React.Dispatch<WorkbenchAction>;
  
  // Convenience helpers
  setJob: (jobId: number, metadata: WorkbenchState['jobMetadata'], ocrText: string | null, ocrResult: VisionResponse | null, imageUrl: string | null) => void;
  setEntries: (entries: FusionEntry[]) => void;
  updateEntryArea: (entryId: string, bbox: BBox) => void;
  setSelectedEntry: (index: number | null) => void;
  setFieldValue: (key: string, value: string, confidence?: number, source?: string) => void;
  setFieldValues: (values: Record<string, { value: string; confidence?: number; source?: string }>) => void;
  setScoringV2: (scoring: ScoringV2Result | null) => void;
  setRecordCandidates: (candidates: any | null) => void;
  setDrafts: (drafts: WorkbenchState['drafts']) => void;
  setActiveStep: (step: number) => void;
  reset: () => void;
}

const WorkbenchContext = createContext<WorkbenchContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export const WorkbenchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(workbenchReducer, initialState);
  
  const setJob = useCallback((jobId: number, metadata: WorkbenchState['jobMetadata'], ocrText: string | null, ocrResult: VisionResponse | null, imageUrl: string | null) => {
    dispatch({ type: 'SET_JOB', payload: { jobId, metadata, ocrText, ocrResult, imageUrl } });
  }, []);
  
  const setEntries = useCallback((entries: FusionEntry[]) => {
    dispatch({ type: 'SET_ENTRIES', payload: entries });
  }, []);
  
  const updateEntryArea = useCallback((entryId: string, bbox: BBox) => {
    dispatch({ type: 'UPDATE_ENTRY_AREA', payload: { entryId, bbox } });
  }, []);
  
  const setSelectedEntry = useCallback((index: number | null) => {
    dispatch({ type: 'SET_SELECTED_ENTRY', payload: index });
  }, []);
  
  const setFieldValue = useCallback((key: string, value: string, confidence?: number, source?: string) => {
    dispatch({ type: 'SET_FIELD_VALUE', payload: { key, value, confidence, source } });
  }, []);
  
  const setFieldValues = useCallback((values: Record<string, { value: string; confidence?: number; source?: string }>) => {
    dispatch({ type: 'SET_FIELD_VALUES', payload: values });
  }, []);
  
  const setScoringV2 = useCallback((scoring: ScoringV2Result | null) => {
    dispatch({ type: 'SET_SCORING_V2', payload: scoring });
  }, []);

  const setRecordCandidates = useCallback((candidates: any | null) => {
    dispatch({ type: 'SET_RECORD_CANDIDATES', payload: candidates });
  }, []);

  const setDrafts = useCallback((drafts: WorkbenchState['drafts']) => {
    dispatch({ type: 'SET_DRAFTS', payload: drafts });
  }, []);
  
  const setActiveStep = useCallback((step: number) => {
    dispatch({ type: 'SET_ACTIVE_STEP', payload: step });
  }, []);
  
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);
  
  const value = useMemo(() => ({
    state,
    dispatch,
    setJob,
    setEntries,
    updateEntryArea,
    setSelectedEntry,
    setFieldValue,
    setFieldValues,
    setScoringV2,
    setRecordCandidates,
    setDrafts,
    setActiveStep,
    reset,
  }), [state, setJob, setEntries, updateEntryArea, setSelectedEntry, setFieldValue, setFieldValues, setScoringV2, setRecordCandidates, setDrafts, setActiveStep, reset]);
  
  return (
    <WorkbenchContext.Provider value={value}>
      {children}
    </WorkbenchContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

export function useWorkbench(): WorkbenchContextValue {
  const context = useContext(WorkbenchContext);
  if (!context) {
    throw new Error('useWorkbench must be used within WorkbenchProvider');
  }
  return context;
}

