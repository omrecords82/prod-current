import { useState, useCallback, useRef } from 'react';
import { ComponentInfo } from './useComponentRegistry';

export interface InspectorState {
  isOpen: boolean;
  selectedComponent: ComponentInfo | null;
  isEditMode: boolean;
  pendingChanges: Record<string, any>;
  history: ComponentInfo[];
  historyIndex: number;
}

export interface InspectorActions {
  openInspector: (component: ComponentInfo) => void;
  closeInspector: () => void;
  selectComponent: (component: ComponentInfo | null) => void;
  toggleEditMode: () => void;
  updatePendingChanges: (changes: Record<string, any>) => void;
  applyChanges: () => void;
  discardChanges: () => void;
  goBack: () => void;
  goForward: () => void;
  clearHistory: () => void;
}

export const useInspectorState = (): InspectorState & InspectorActions => {
  const [state, setState] = useState<InspectorState>({
    isOpen: false,
    selectedComponent: null,
    isEditMode: false,
    pendingChanges: {},
    history: [],
    historyIndex: -1
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const openInspector = useCallback((component: ComponentInfo) => {
    setState(prev => {
      const newHistory = [...prev.history];
      if (prev.selectedComponent) {
        newHistory.push(prev.selectedComponent);
        if (newHistory.length > 10) {
          newHistory.shift(); // Keep only last 10 items
        }
      }

      return {
        ...prev,
        isOpen: true,
        selectedComponent: component,
        isEditMode: false,
        pendingChanges: {},
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  }, []);

  const closeInspector = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      selectedComponent: null,
      isEditMode: false,
      pendingChanges: {}
    }));
  }, []);

  const selectComponent = useCallback((component: ComponentInfo | null) => {
    setState(prev => ({
      ...prev,
      selectedComponent: component,
      isEditMode: false,
      pendingChanges: {}
    }));
  }, []);

  const toggleEditMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEditMode: !prev.isEditMode,
      pendingChanges: prev.isEditMode ? {} : prev.pendingChanges
    }));
  }, []);

  const updatePendingChanges = useCallback((changes: Record<string, any>) => {
    setState(prev => ({
      ...prev,
      pendingChanges: { ...prev.pendingChanges, ...changes }
    }));
  }, []);

  const applyChanges = useCallback(() => {
    setState(prev => {
      if (!prev.selectedComponent) return prev;

      // Apply changes to the component
      const updatedComponent = {
        ...prev.selectedComponent,
        props: { ...prev.selectedComponent.props, ...prev.pendingChanges }
      };

      return {
        ...prev,
        selectedComponent: updatedComponent,
        isEditMode: false,
        pendingChanges: {}
      };
    });
  }, []);

  const discardChanges = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEditMode: false,
      pendingChanges: {}
    }));
  }, []);

  const goBack = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex <= 0) return prev;

      const newIndex = prev.historyIndex - 1;
      const component = prev.history[newIndex];

      return {
        ...prev,
        selectedComponent: component,
        historyIndex: newIndex,
        isEditMode: false,
        pendingChanges: {}
      };
    });
  }, []);

  const goForward = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex >= prev.history.length - 1) return prev;

      const newIndex = prev.historyIndex + 1;
      const component = prev.history[newIndex];

      return {
        ...prev,
        selectedComponent: component,
        historyIndex: newIndex,
        isEditMode: false,
        pendingChanges: {}
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      history: [],
      historyIndex: -1
    }));
  }, []);

  return {
    ...state,
    openInspector,
    closeInspector,
    selectComponent,
    toggleEditMode,
    updatePendingChanges,
    applyChanges,
    discardChanges,
    goBack,
    goForward,
    clearHistory
  };
}; 