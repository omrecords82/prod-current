/**
 * OCR Selection Context
 * Manages OCR token/line selections shared between InspectionPanel and FusionTab
 * Scoped per jobId
 */

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { BBox } from '../types/fusion';

export interface OcrSelectionItem {
  type: 'token' | 'line';
  id: string;
  text: string;
  bbox: BBox; // Image pixel coordinates
  confidence?: number;
  // New: attach selection to specific entry and field
  entryId?: string; // Which entry this selection belongs to
  fieldKey?: string; // Which field this selection maps to
}

interface OcrSelectionState {
  selections: Record<string, OcrSelectionItem[]>; // jobId -> selections
}

type OcrSelectionAction =
  | { type: 'SET_SELECTION'; jobId: string; items: OcrSelectionItem[] }
  | { type: 'ADD_SELECTION'; jobId: string; item: OcrSelectionItem }
  | { type: 'REMOVE_SELECTION'; jobId: string; itemId: string }
  | { type: 'CLEAR_SELECTION'; jobId: string }
  | { type: 'CLEAR_ALL' };

const initialState: OcrSelectionState = {
  selections: {},
};

function selectionReducer(state: OcrSelectionState, action: OcrSelectionAction): OcrSelectionState {
  switch (action.type) {
    case 'SET_SELECTION': {
      return {
        ...state,
        selections: {
          ...state.selections,
          [action.jobId]: action.items,
        },
      };
    }
    case 'ADD_SELECTION': {
      const existing = state.selections[action.jobId] || [];
      // Avoid duplicates
      if (existing.some(item => item.id === action.item.id)) {
        return state;
      }
      return {
        ...state,
        selections: {
          ...state.selections,
          [action.jobId]: [...existing, action.item],
        },
      };
    }
    case 'REMOVE_SELECTION': {
      const existing = state.selections[action.jobId] || [];
      return {
        ...state,
        selections: {
          ...state.selections,
          [action.jobId]: existing.filter(item => item.id !== action.itemId),
        },
      };
    }
    case 'CLEAR_SELECTION': {
      const { [action.jobId]: _, ...rest } = state.selections;
      return {
        ...state,
        selections: rest,
      };
    }
    case 'CLEAR_ALL': {
      return {
        ...state,
        selections: {},
      };
    }
    default:
      return state;
  }
}

interface OcrSelectionContextValue {
  getSelection: (jobId: string) => OcrSelectionItem[];
  setSelection: (jobId: string, items: OcrSelectionItem[]) => void;
  addSelection: (jobId: string, item: OcrSelectionItem) => void;
  removeSelection: (jobId: string, itemId: string) => void;
  clearSelection: (jobId: string) => void;
  clearAll: () => void;
}

const OcrSelectionContext = createContext<OcrSelectionContextValue | null>(null);

export function OcrSelectionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(selectionReducer, initialState);

  const getSelection = useCallback((jobId: string): OcrSelectionItem[] => {
    return state.selections[jobId] || [];
  }, [state]);

  const setSelection = useCallback((jobId: string, items: OcrSelectionItem[]) => {
    dispatch({ type: 'SET_SELECTION', jobId, items });
  }, []);

  const addSelection = useCallback((jobId: string, item: OcrSelectionItem) => {
    dispatch({ type: 'ADD_SELECTION', jobId, item });
  }, []);

  const removeSelection = useCallback((jobId: string, itemId: string) => {
    dispatch({ type: 'REMOVE_SELECTION', jobId, itemId });
  }, []);

  const clearSelection = useCallback((jobId: string) => {
    dispatch({ type: 'CLEAR_SELECTION', jobId });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  return (
    <OcrSelectionContext.Provider
      value={{
        getSelection,
        setSelection,
        addSelection,
        removeSelection,
        clearSelection,
        clearAll,
      }}
    >
      {children}
    </OcrSelectionContext.Provider>
  );
}

export function useOcrSelection() {
  const context = useContext(OcrSelectionContext);
  if (!context) {
    throw new Error('useOcrSelection must be used within OcrSelectionProvider');
  }
  return context;
}

