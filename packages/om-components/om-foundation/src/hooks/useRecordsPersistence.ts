/**
 * Records Persistence Hook
 * 
 * Manages persistent state for records view (church selection, record type, filters)
 * Automatically saves and restores user's last view
 */

import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';

const CHURCH_STORAGE_KEY = 'om.selectedChurchId';
const LAST_VIEW_STORAGE_KEY = 'om.lastRecordsView';

interface RecordsViewState {
  recordType: 'baptism' | 'marriage' | 'funeral';
  churchId: number;
  path: string;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Get persisted church ID
 */
export const getPersistedChurchId = (): number | null => {
  try {
    const stored = localStorage.getItem(CHURCH_STORAGE_KEY);
    if (!stored) return null;
    const data = JSON.parse(stored);
    return typeof data.churchId === 'number' ? data.churchId : null;
  } catch {
    return null;
  }
};

/**
 * Persist church ID
 */
export const persistChurchId = (churchId: number): void => {
  try {
    localStorage.setItem(CHURCH_STORAGE_KEY, JSON.stringify({ churchId }));
    console.log(`🏛️ Persisted church ID: ${churchId}`);
  } catch (error) {
    console.error('Failed to persist church ID:', error);
  }
};

/**
 * Get persisted last records view
 */
export const getPersistedLastView = (): RecordsViewState | null => {
  try {
    const stored = localStorage.getItem(LAST_VIEW_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

/**
 * Persist last records view
 */
export const persistLastView = (view: RecordsViewState): void => {
  try {
    localStorage.setItem(LAST_VIEW_STORAGE_KEY, JSON.stringify(view));
    console.log(`📋 Persisted last view: ${view.recordType} for church ${view.churchId}`);
  } catch (error) {
    console.error('Failed to persist last view:', error);
  }
};

/**
 * Hook to manage records persistence
 */
export const useRecordsPersistence = (
  currentChurchId: number | null,
  currentRecordType: string,
  onChurchRestore?: (churchId: number) => void,
  onRecordTypeRestore?: (recordType: string) => void
) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Restore church ID on mount
  useEffect(() => {
    if (!currentChurchId || currentChurchId === 0) {
      const persistedChurchId = getPersistedChurchId();
      if (persistedChurchId && onChurchRestore) {
        console.log(`🔄 Restoring church ID: ${persistedChurchId}`);
        onChurchRestore(persistedChurchId);
      }
    }
  }, []);

  // Persist church ID when it changes
  useEffect(() => {
    if (currentChurchId && currentChurchId !== 0) {
      persistChurchId(currentChurchId);
    }
  }, [currentChurchId]);

  // Persist current view when location or params change
  useEffect(() => {
    if (currentChurchId && currentChurchId !== 0 && currentRecordType) {
      const view: RecordsViewState = {
        recordType: currentRecordType as any,
        churchId: currentChurchId,
        path: location.pathname,
        search: searchParams.get('search') || undefined,
        sortBy: searchParams.get('sortBy') || undefined,
        sortDir: (searchParams.get('sortDir') as any) || undefined,
        page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
        pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : undefined,
      };
      persistLastView(view);
    }
  }, [currentChurchId, currentRecordType, location.pathname, searchParams]);

  return {
    getPersistedChurchId,
    persistChurchId,
    getPersistedLastView,
    persistLastView,
  };
};
