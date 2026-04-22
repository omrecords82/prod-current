/**
 * Records Events System
 * 
 * Global event emitter for records mutations (create/update/delete)
 * Allows automatic refresh of records lists across the application
 */

export type RecordMutationType = 'create' | 'update' | 'delete';

export interface RecordsChangedEvent {
  churchId: number;
  recordType: 'baptism' | 'marriage' | 'funeral';
  mutationType: RecordMutationType;
  recordId?: string | number;
  timestamp: number;
}

type RecordsEventListener = (event: RecordsChangedEvent) => void;

class RecordsEventEmitter {
  private listeners: Set<RecordsEventListener> = new Set();

  /**
   * Subscribe to records change events
   */
  subscribe(listener: RecordsEventListener): () => void {
    this.listeners.add(listener);
    console.log(`📡 RecordsEvents: Subscriber added (total: ${this.listeners.size})`);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
      console.log(`📡 RecordsEvents: Subscriber removed (total: ${this.listeners.size})`);
    };
  }

  /**
   * Emit a records changed event
   */
  emit(event: Omit<RecordsChangedEvent, 'timestamp'>): void {
    const fullEvent: RecordsChangedEvent = {
      ...event,
      timestamp: Date.now()
    };

    console.log(
      `📡 RecordsEvents: Emitting ${event.mutationType} for ${event.recordType} ` +
      `in church ${event.churchId}${event.recordId ? ` (ID: ${event.recordId})` : ''}`
    );

    this.listeners.forEach(listener => {
      try {
        listener(fullEvent);
      } catch (error) {
        console.error('RecordsEvents: Listener error:', error);
      }
    });
  }

  /**
   * Get current listener count (for debugging)
   */
  getListenerCount(): number {
    return this.listeners.size;
  }
}

// Singleton instance
export const recordsEvents = new RecordsEventEmitter();

/**
 * React hook for subscribing to records events
 */
export const useRecordsEvents = (
  callback: RecordsEventListener,
  deps: React.DependencyList = []
): void => {
  React.useEffect(() => {
    const unsubscribe = recordsEvents.subscribe(callback);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

// Re-export React for the hook
import React from 'react';
