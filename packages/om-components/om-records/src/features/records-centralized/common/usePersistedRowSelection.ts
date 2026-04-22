/**
 * Persisted Row Selection Hook
 * 
 * React hook for managing persistent row selection in records grids
 * Automatically saves and restores selected row across page refreshes
 */

import { useEffect, useCallback, useRef } from 'react';
import { getLastSelectedRecord, setLastSelectedRecord, clearLastSelectedRecord } from './recordsSelection';

export interface UsePersistedRowSelectionOptions {
  churchId: number;
  recordType: 'baptism' | 'marriage' | 'funeral';
  records: any[];
  onRecordNotFound?: () => void;
}

export interface UsePersistedRowSelectionReturn {
  selectedRecordId: string | number | null;
  handleRowSelect: (recordId: string | number) => void;
  clearSelection: () => void;
  isRecordSelected: (recordId: string | number) => boolean;
  scrollToSelectedRecord: (gridApi?: any) => void;
}

/**
 * Hook to manage persisted row selection
 */
export const usePersistedRowSelection = ({
  churchId,
  recordType,
  records,
  onRecordNotFound,
}: UsePersistedRowSelectionOptions): UsePersistedRowSelectionReturn => {
  const selectedRecordIdRef = useRef<string | number | null>(null);
  const hasAttemptedRestore = useRef(false);

  // Restore selection on mount or when records change
  useEffect(() => {
    if (hasAttemptedRestore.current || !records || records.length === 0) {
      return;
    }

    const lastSelected = getLastSelectedRecord();
    
    if (
      lastSelected &&
      lastSelected.churchId === churchId &&
      lastSelected.recordType === recordType
    ) {
      // Check if the record exists in current data
      const recordExists = records.some(
        (r) => String(r.id) === String(lastSelected.recordId)
      );

      if (recordExists) {
        selectedRecordIdRef.current = lastSelected.recordId;
        console.log(`🎯 Restored selection: ${recordType} #${lastSelected.recordId}`);
      } else {
        console.log(`⚠️ Last selected record #${lastSelected.recordId} not found in current page`);
        if (onRecordNotFound) {
          onRecordNotFound();
        }
      }
    }

    hasAttemptedRestore.current = true;
  }, [churchId, recordType, records, onRecordNotFound]);

  // Handle row selection
  const handleRowSelect = useCallback(
    (recordId: string | number) => {
      selectedRecordIdRef.current = recordId;
      setLastSelectedRecord({
        churchId,
        recordType,
        recordId,
      });
    },
    [churchId, recordType]
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    selectedRecordIdRef.current = null;
    clearLastSelectedRecord();
  }, []);

  // Check if a record is selected
  const isRecordSelected = useCallback(
    (recordId: string | number): boolean => {
      return String(selectedRecordIdRef.current) === String(recordId);
    },
    []
  );

  // Scroll to selected record (AG Grid specific)
  const scrollToSelectedRecord = useCallback(
    (gridApi?: any) => {
      if (!selectedRecordIdRef.current || !gridApi) return;

      try {
        const rowNode = gridApi.getRowNode(String(selectedRecordIdRef.current));
        if (rowNode) {
          gridApi.ensureNodeVisible(rowNode, 'middle');
          gridApi.setFocusedCell(rowNode.rowIndex, gridApi.getAllDisplayedColumns()[0]);
          console.log(`📍 Scrolled to record #${selectedRecordIdRef.current}`);
        }
      } catch (error) {
        console.error('Failed to scroll to selected record:', error);
      }
    },
    []
  );

  return {
    selectedRecordId: selectedRecordIdRef.current,
    handleRowSelect,
    clearSelection,
    isRecordSelected,
    scrollToSelectedRecord,
  };
};
