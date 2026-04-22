/**
 * useParishSettings — Central hook for parish settings CRUD.
 *
 * Fetches settings for a given category, caches per church_id,
 * and provides save/patch helpers with loading/error/dirty state.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '@/api/utils/axiosInstance';
import { useChurch } from '@/context/ChurchContext';

type Category = 'mapping' | 'theme' | 'ui' | 'search' | 'system' | 'branding';

interface ParishSettingsState<T extends Record<string, any>> {
  /** Current settings from server (or empty object if none saved) */
  data: T;
  /** True while initial fetch or save is in flight */
  loading: boolean;
  /** True while a save operation is in flight */
  saving: boolean;
  /** Error message from last failed operation, or null */
  error: string | null;
  /** True when local data differs from last-saved server data */
  dirty: boolean;
  /** Replace all settings for this category (POST) */
  save: (settings: T) => Promise<boolean>;
  /** Partially update settings (PATCH) */
  patch: (partial: Partial<T>) => Promise<boolean>;
  /** Reload from server */
  reload: () => Promise<void>;
}

// Simple in-memory cache keyed by `${churchId}:${category}`
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 60_000; // 1 minute

export function useParishSettings<T extends Record<string, any>>(
  category: Category,
): ParishSettingsState<T> {
  const { activeChurchId } = useChurch();
  const [data, setData] = useState<T>({} as T);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const serverSnapshot = useRef<string>('{}');

  const churchId = activeChurchId;

  const fetchSettings = useCallback(async () => {
    if (!churchId) { setLoading(false); return; }

    const cacheKey = `${churchId}:${category}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setData(cached.data as T);
      serverSnapshot.current = JSON.stringify(cached.data);
      setDirty(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ church_id: number; category: string; settings: T }>(
        `/api/parish-settings/${churchId}/${category}`,
      );
      const settings = (res.settings ?? {}) as T;
      setData(settings);
      serverSnapshot.current = JSON.stringify(settings);
      setDirty(false);
      cache.set(cacheKey, { data: settings, ts: Date.now() });
    } catch (err: any) {
      console.error(`[useParishSettings] fetch ${category} error:`, err);
      setError(err?.message ?? 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [churchId, category]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const save = useCallback(async (settings: T): Promise<boolean> => {
    if (!churchId) return false;
    setSaving(true);
    setError(null);
    try {
      await apiClient.post(`/api/parish-settings/${churchId}`, {
        category,
        settings,
      });
      setData(settings);
      serverSnapshot.current = JSON.stringify(settings);
      setDirty(false);
      cache.set(`${churchId}:${category}`, { data: settings, ts: Date.now() });
      return true;
    } catch (err: any) {
      console.error(`[useParishSettings] save ${category} error:`, err);
      setError(err?.message ?? 'Failed to save settings');
      return false;
    } finally {
      setSaving(false);
    }
  }, [churchId, category]);

  const patch = useCallback(async (partial: Partial<T>): Promise<boolean> => {
    if (!churchId) return false;
    setSaving(true);
    setError(null);
    try {
      await apiClient.patch(`/api/parish-settings/${churchId}/${category}`, partial);
      const merged = { ...data, ...partial };
      setData(merged as T);
      serverSnapshot.current = JSON.stringify(merged);
      setDirty(false);
      cache.set(`${churchId}:${category}`, { data: merged, ts: Date.now() });
      return true;
    } catch (err: any) {
      console.error(`[useParishSettings] patch ${category} error:`, err);
      setError(err?.message ?? 'Failed to update settings');
      return false;
    } finally {
      setSaving(false);
    }
  }, [churchId, category, data]);

  // Track dirty state when data changes
  const markDirty = useCallback((newData: T) => {
    setData(newData);
    setDirty(JSON.stringify(newData) !== serverSnapshot.current);
  }, []);

  return {
    data,
    loading,
    saving,
    error,
    dirty,
    save,
    patch,
    reload: fetchSettings,
    // Expose markDirty as a way to update local state while tracking dirty
    ...(({ markDirty } as any)),
  };
}

/**
 * Convenience: update local data and mark dirty.
 * Usage: const { data, save, updateLocal } = useParishSettingsWithLocal(...)
 */
export function useParishSettingsWithLocal<T extends Record<string, any>>(
  category: Category,
) {
  const hook = useParishSettings<T>(category);
  const serverSnapshot = useRef<string>('{}');
  const [localData, setLocalData] = useState<T>({} as T);
  const [dirty, setDirty] = useState(false);

  // Sync from server when hook.data changes (initial load / reload)
  useEffect(() => {
    const json = JSON.stringify(hook.data);
    if (json !== '{}' || !hook.loading) {
      setLocalData(hook.data);
      serverSnapshot.current = json;
      setDirty(false);
    }
  }, [hook.data, hook.loading]);

  const updateLocal = useCallback((updater: T | ((prev: T) => T)) => {
    setLocalData((prev) => {
      const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
      setDirty(JSON.stringify(next) !== serverSnapshot.current);
      return next;
    });
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    const ok = await hook.save(localData);
    if (ok) {
      serverSnapshot.current = JSON.stringify(localData);
      setDirty(false);
    }
    return ok;
  }, [hook.save, localData]);

  return {
    data: localData,
    loading: hook.loading,
    saving: hook.saving,
    error: hook.error,
    dirty,
    updateLocal,
    save,
    patch: hook.patch,
    reload: hook.reload,
  };
}
