/**
 * useChurchSwitch Hook
 * 
 * Manages church switching with proper cache clearing and state management
 * Prevents data bleeding between churches by clearing all church-specific cached data
 */

import { useCallback } from 'react';

interface ChurchSwitchOptions {
  onBeforeSwitch?: () => void;
  onAfterSwitch?: (churchId: number) => void;
}

export function useChurchSwitch(options?: ChurchSwitchOptions) {
  
  /**
   * Clear all church-specific cached data
   * Prevents data bleeding when switching between churches
   */
  const clearChurchCache = useCallback(() => {
    console.log('🧹 Clearing church-specific cache...');
    
    // Clear church-specific localStorage items
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('church_') || 
        key.startsWith('records_') ||
        key.includes('baptism_') ||
        key.includes('marriage_') ||
        key.includes('funeral_') ||
        key.includes('ocr_') ||
        key.includes('draft_') ||
        key.includes('session_')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`  🗑️ Removed: ${key}`);
    });
    
    // Clear sessionStorage church data
    sessionStorage.removeItem('currentChurchData');
    sessionStorage.removeItem('churchRecords');
    sessionStorage.removeItem('churchBranding');
    sessionStorage.removeItem('recordsDrafts');
    
    console.log(`✅ Cleared ${keysToRemove.length} church-specific cache items`);
  }, []);
  
  /**
   * Switch to a different church
   * Clears cache and triggers callbacks
   */
  const switchChurch = useCallback((newChurchId: number) => {
    console.log(`🔄 Switching to church: ${newChurchId}`);
    
    // Pre-switch callback
    options?.onBeforeSwitch?.();
    
    // Clear all church-specific cache
    clearChurchCache();
    
    // Post-switch callback
    options?.onAfterSwitch?.(newChurchId);
    
    console.log(`✅ Switched to church: ${newChurchId}`);
  }, [clearChurchCache, options]);
  
  return {
    switchChurch,
    clearChurchCache
  };
}
