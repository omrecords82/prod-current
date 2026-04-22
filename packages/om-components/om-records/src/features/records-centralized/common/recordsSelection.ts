/**
 * Records Selection Persistence
 * 
 * Manages persistent state for last selected record row
 * Allows re-highlighting and scrolling to last selected record after refresh
 */

const STORAGE_KEY = 'om.lastSelectedRecord';

export interface LastSelectedRecord {
  churchId: number;
  recordType: 'baptism' | 'marriage' | 'funeral';
  recordId: string | number;
  selectedAt: string; // ISO timestamp
}

/**
 * Get last selected record from localStorage
 */
export const getLastSelectedRecord = (): LastSelectedRecord | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    if (data && data.churchId && data.recordType && data.recordId) {
      return data;
    }
    return null;
  } catch (error) {
    console.error('Failed to read last selected record from localStorage:', error);
    return null;
  }
};

/**
 * Set last selected record in localStorage
 */
export const setLastSelectedRecord = (selection: Omit<LastSelectedRecord, 'selectedAt'>): void => {
  try {
    const data: LastSelectedRecord = {
      ...selection,
      selectedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log(`🎯 Persisted selected record: ${selection.recordType} #${selection.recordId} in church ${selection.churchId}`);
  } catch (error) {
    console.error('Failed to save last selected record to localStorage:', error);
  }
};

/**
 * Clear last selected record from localStorage
 */
export const clearLastSelectedRecord = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🎯 Cleared last selected record');
  } catch (error) {
    console.error('Failed to clear last selected record from localStorage:', error);
  }
};

/**
 * Check if a record matches the last selected record
 */
export const isLastSelectedRecord = (
  recordId: string | number,
  churchId: number,
  recordType: string
): boolean => {
  const lastSelected = getLastSelectedRecord();
  if (!lastSelected) return false;
  
  return (
    String(lastSelected.recordId) === String(recordId) &&
    lastSelected.churchId === churchId &&
    lastSelected.recordType === recordType
  );
};
