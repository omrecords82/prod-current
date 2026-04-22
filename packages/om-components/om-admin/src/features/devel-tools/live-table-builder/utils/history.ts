/**
 * History Management for Undo/Redo
 * Implements bounded snapshot history
 */

import type { TableData } from '../types';

const MAX_HISTORY_SIZE = 50;

export class HistoryManager {
  private history: TableData[] = [];
  private currentIndex: number = -1;

  /**
   * Add a new state to history
   */
  push(state: TableData): void {
    // Remove any states after current index (when undoing then making new changes)
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new state
    this.history.push(JSON.parse(JSON.stringify(state))); // Deep clone
    this.currentIndex++;

    // Limit history size
    if (this.history.length > MAX_HISTORY_SIZE) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  /**
   * Get previous state (undo)
   */
  undo(): TableData | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return JSON.parse(JSON.stringify(this.history[this.currentIndex]));
    }
    return null;
  }

  /**
   * Get next state (redo)
   */
  redo(): TableData | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return JSON.parse(JSON.stringify(this.history[this.currentIndex]));
    }
    return null;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Clear history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * Initialize with initial state
   */
  initialize(initialState: TableData): void {
    this.history = [JSON.parse(JSON.stringify(initialState))];
    this.currentIndex = 0;
  }
}
