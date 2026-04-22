/**
 * Records Highlighting Utilities
 * 
 * Manages highlighting for new and updated records (within 24 hours)
 * Provides utilities for row styling based on creation and update timestamps
 */

import { useMemo } from 'react';

/**
 * Get created timestamp from a record
 * Standardizes access across different record types
 */
export const getRecordCreatedAt = (record: any): Date | null => {
  if (!record) return null;
  
  // Try different timestamp field names
  const timestampField = record.created_at || record.createdAt || record.entry_date;
  
  if (!timestampField) return null;
  
  try {
    const date = new Date(timestampField);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * Get updated timestamp from a record
 * Standardizes access across different record types
 */
export const getRecordUpdatedAt = (record: any): Date | null => {
  if (!record) return null;
  
  // Try different timestamp field names
  const timestampField = record.updated_at || record.updatedAt || record.modified_at || record.modifiedAt;
  
  if (!timestampField) return null;
  
  try {
    const date = new Date(timestampField);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * Check if a record was created within the last 24 hours
 */
export const isRecordNewWithin24Hours = (record: any, nowReference?: Date): boolean => {
  const createdAt = getRecordCreatedAt(record);
  if (!createdAt) return false;
  
  const now = nowReference || new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceCreation <= 24 && hoursSinceCreation >= 0;
};

/**
 * Check if a record was updated within the last 24 hours (and not newly created)
 */
export const isRecordUpdatedWithin24Hours = (record: any, nowReference?: Date): boolean => {
  const updatedAt = getRecordUpdatedAt(record);
  const createdAt = getRecordCreatedAt(record);
  
  if (!updatedAt) return false;
  
  const now = nowReference || new Date();
  const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
  
  // Only consider it "updated" if it's not a new record
  // (i.e., updated_at is significantly different from created_at)
  const isNew = createdAt && (updatedAt.getTime() - createdAt.getTime()) < 60000; // Within 1 minute = new
  
  return hoursSinceUpdate <= 24 && hoursSinceUpdate >= 0 && !isNew;
};

/**
 * Get CSS class for a record row based on its state
 */
export const getRecordRowClass = (
  record: any,
  isSelected: boolean,
  nowReference?: Date
): string => {
  const classes: string[] = [];
  
  if (isSelected) {
    classes.push('row-last-selected');
  }
  
  const isNew = isRecordNewWithin24Hours(record, nowReference);
  const isUpdated = isRecordUpdatedWithin24Hours(record, nowReference);
  
  // Prioritize new over updated
  if (isNew) {
    classes.push('row-new-24h');
  } else if (isUpdated) {
    classes.push('row-updated-24h');
  }
  
  return classes.join(' ');
};

/**
 * React hook to get a stable "now" reference that updates every 60 seconds
 * Prevents constant re-renders while keeping the 24h calculation reasonably fresh
 */
export const useNowReference = (): Date => {
  return useMemo(() => {
    const now = new Date();
    
    // Update every 60 seconds
    const intervalId = setInterval(() => {
      // This will cause a re-render every 60 seconds
    }, 60000);
    
    // Cleanup
    if (typeof window !== 'undefined') {
      setTimeout(() => clearInterval(intervalId), 60000);
    }
    
    return now;
  }, [Math.floor(Date.now() / 60000)]); // Re-memo every minute
};

/**
 * Get row style object for Material-UI TableRow
 */
export const getRecordRowStyle = (
  record: any,
  isSelected: boolean,
  nowReference?: Date
): React.CSSProperties => {
  const isNew = isRecordNewWithin24Hours(record, nowReference);
  const isUpdated = isRecordUpdatedWithin24Hours(record, nowReference);
  
  if (isSelected && isNew) {
    // Both selected and new - selected style wins but with green border
    return {
      backgroundColor: 'rgba(33, 150, 243, 0.15)', // Blue for selected
      borderLeft: '4px solid #4caf50', // Green border for new
      fontWeight: 500,
    };
  } else if (isSelected && isUpdated) {
    // Both selected and updated - selected style wins but with gold border
    return {
      backgroundColor: 'rgba(33, 150, 243, 0.15)', // Blue for selected
      borderLeft: '4px solid #ffc107', // Gold border for updated
      fontWeight: 500,
    };
  } else if (isSelected) {
    // Only selected
    return {
      backgroundColor: 'rgba(33, 150, 243, 0.15)',
      fontWeight: 500,
    };
  } else if (isNew) {
    // Only new
    return {
      backgroundColor: 'rgba(76, 175, 80, 0.15)', // Light green
      borderLeft: '3px solid #4caf50',
    };
  } else if (isUpdated) {
    // Only updated
    return {
      backgroundColor: 'rgba(255, 193, 7, 0.15)', // Light gold
      borderLeft: '3px solid #ffc107',
    };
  }
  
  return {};
};

/**
 * Get AG Grid row class rules
 */
export const getAgGridRowClassRules = (
  isRecordSelected: (recordId: any) => boolean,
  nowReference?: Date
) => {
  return {
    'row-last-selected': (params: any) => {
      return isRecordSelected(params.data?.id);
    },
    'row-new-24h': (params: any) => {
      return isRecordNewWithin24Hours(params.data, nowReference);
    },
    'row-updated-24h': (params: any) => {
      return isRecordUpdatedWithin24Hours(params.data, nowReference);
    },
  };
};
