/**
 * useRegistries — owns the Big Book registry data, loading flag, error,
 * load + toggle handlers.
 *
 * Extracted from OMBigBook.tsx to drain useStates in the parent
 * (STATE_EXPLOSION refactor — OMD-840).
 */
import { useCallback, useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';

export interface UseRegistriesOptions {
  log: (type: 'info' | 'success' | 'warning' | 'error', message: string, details?: string) => void;
}

export interface UseRegistriesResult {
  registries: any;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  toggleItemStatus: (type: string, id: string, enabled: boolean) => Promise<void>;
}

export function useRegistries({ log }: UseRegistriesOptions): UseRegistriesResult {
  const [registries, setRegistries] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.get<any>('/bigbook/registries');
      if (result.success) {
        setRegistries(result.registries);
      } else {
        throw new Error(result.error || 'Failed to load registries');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      log('error', `Failed to load registries: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [log]);

  const toggleItemStatus = useCallback(async (type: string, id: string, enabled: boolean) => {
    try {
      const result = await apiClient.post<any>(`/bigbook/toggle-item/${type}/${id}`, { enabled });
      if (result.success) {
        setRegistries((prev: any) => ({
          ...prev,
          [type]: {
            ...prev[type],
            items: { ...prev[type].items, [id]: result.item },
          },
        }));
        log('success', `Item ${enabled ? 'enabled' : 'disabled'}: ${result.item.name || result.item.displayName || id}`);
      } else {
        throw new Error(result.error || 'Failed to toggle item');
      }
    } catch (err) {
      log('error', `Failed to toggle item: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [log]);

  return { registries, loading, error, load, toggleItemStatus };
}
