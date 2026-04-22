/**
 * EditModeContext — Inline page editing for super_admin users.
 *
 * Fetches content overrides from the page_content table at runtime.
 * In edit mode, text wrapped with <EditableText> becomes clickable/editable.
 * Changes are staged as pending, then batch-saved to the DB.
 *
 * Translation status tracking:
 *   Fetches per-key, per-language staleness flags from translation_status table.
 *   When English content is saved, the backend auto-flags translations as needing update.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/api/utils/axiosInstance';

/** Per-language translation status for a single content key */
export interface LangTranslationStatus {
  needs_update: boolean;
  source_version: number;
  translation_version: number;
  flagged_at: string | null;
  resolved_at: string | null;
}

/** Map of contentKey → langCode → status */
export type TranslationStatuses = Record<string, Record<string, LangTranslationStatus>>;

export interface TranslationSummary {
  total_keys: number;
  keys_needing_update: number;
  total_language_flags: number;
}

interface EditModeContextType {
  isEditMode: boolean;
  toggleEditMode: () => void;
  overrides: Record<string, string>;
  pendingChanges: Record<string, string>;
  getContent: (key: string, fallback: string) => string;
  updateContent: (key: string, value: string) => void;
  saveAllChanges: () => Promise<void>;
  discardChanges: () => void;
  resetToDefault: (key: string) => Promise<void>;
  isSaving: boolean;
  currentPageKey: string;
  /** Per-key translation statuses for the current page */
  translationStatuses: TranslationStatuses;
  /** Summary counts for translation flags on the current page */
  translationSummary: TranslationSummary | null;
  /** Manually resolve (mark up-to-date) a translation for a key+lang */
  resolveTranslation: (contentKey: string, langCode: string) => Promise<void>;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

/** Derive a page key from the current URL pathname. */
function derivePageKey(pathname: string): string {
  // /frontend-pages/homepage → homepage, /frontend-pages/about → about
  // /samples → samples, /tour → tour, / → homepage
  if (pathname === '/' || pathname === '') return 'homepage';
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/');
  return segments[segments.length - 1] || 'homepage';
}

export const EditModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSuperAdmin } = useAuth();
  const location = useLocation();

  const [isEditMode, setIsEditMode] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [translationStatuses, setTranslationStatuses] = useState<TranslationStatuses>({});
  const [translationSummary, setTranslationSummary] = useState<TranslationSummary | null>(null);

  const currentPageKey = derivePageKey(location.pathname);
  const prevPageKey = useRef(currentPageKey);

  // Fetch overrides whenever page changes
  useEffect(() => {
    // Discard pending changes on page navigation
    if (prevPageKey.current !== currentPageKey) {
      setPendingChanges({});
      prevPageKey.current = currentPageKey;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get<{ success: boolean; overrides: Record<string, string> }>(
          `/page-content-live/${encodeURIComponent(currentPageKey)}`
        );
        // apiClient.get() returns response.data directly, not the axios response
        if (!cancelled && res?.success) {
          setOverrides(res.overrides || {});
        }
      } catch {
        // Silent fail — page renders with defaults
      }
    })();
    return () => { cancelled = true; };
  }, [currentPageKey]);

  // Fetch translation statuses when in edit mode
  const fetchTranslationStatuses = useCallback(async () => {
    if (!isSuperAdmin()) return;
    try {
      const res = await apiClient.get<{
        success: boolean;
        statuses: TranslationStatuses;
        summary: TranslationSummary;
      }>(`/page-content-live/translation-status/${encodeURIComponent(currentPageKey)}`);
      if (res?.success) {
        setTranslationStatuses(res.statuses || {});
        setTranslationSummary(res.summary || null);
      }
    } catch {
      // Silent fail — translation status is supplementary
    }
  }, [currentPageKey, isSuperAdmin]);

  useEffect(() => {
    if (isEditMode) {
      fetchTranslationStatuses();
    }
  }, [isEditMode, currentPageKey, fetchTranslationStatuses]);

  const toggleEditMode = useCallback(() => {
    if (!isSuperAdmin()) return;
    setIsEditMode(prev => !prev);
  }, [isSuperAdmin]);

  const getContent = useCallback((key: string, fallback: string): string => {
    if (pendingChanges[key] !== undefined) return pendingChanges[key];
    if (overrides[key] !== undefined) return overrides[key];
    return fallback;
  }, [pendingChanges, overrides]);

  const updateContent = useCallback((key: string, value: string) => {
    setPendingChanges(prev => ({ ...prev, [key]: value }));
  }, []);

  const saveAllChanges = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const entries = Object.entries(pendingChanges);
      for (const [contentKey, contentValue] of entries) {
        await apiClient.put('/page-content-live', {
          pageKey: currentPageKey,
          contentKey,
          contentValue,
        });
      }
      // Merge pending into overrides and clear pending
      setOverrides(prev => ({ ...prev, ...pendingChanges }));
      setPendingChanges({});
      // Refresh translation statuses (English edits flag translations)
      fetchTranslationStatuses();
    } catch (err) {
      console.error('[EditMode] Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, currentPageKey, isSaving, fetchTranslationStatuses]);

  const discardChanges = useCallback(() => {
    setPendingChanges({});
  }, []);

  const resolveTranslation = useCallback(async (contentKey: string, langCode: string) => {
    try {
      await apiClient.put('/page-content-live/translation-status/resolve', {
        contentKey: `${currentPageKey}.${contentKey}`,
        langCode,
      });
      // Refresh statuses after resolving
      fetchTranslationStatuses();
    } catch (err) {
      console.error('[EditMode] Resolve translation failed:', err);
    }
  }, [currentPageKey, fetchTranslationStatuses]);

  const resetToDefault = useCallback(async (key: string) => {
    try {
      await apiClient.delete(`/page-content-live/${encodeURIComponent(currentPageKey)}/${encodeURIComponent(key)}`);
      setOverrides(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setPendingChanges(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err) {
      console.error('[EditMode] Reset failed:', err);
    }
  }, [currentPageKey]);

  return (
    <EditModeContext.Provider value={{
      isEditMode,
      toggleEditMode,
      overrides,
      pendingChanges,
      getContent,
      updateContent,
      saveAllChanges,
      discardChanges,
      resetToDefault,
      isSaving,
      currentPageKey,
      translationStatuses,
      translationSummary,
      resolveTranslation,
    }}>
      {children}
    </EditModeContext.Provider>
  );
};

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (!context) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  return context;
}

export default EditModeContext;
