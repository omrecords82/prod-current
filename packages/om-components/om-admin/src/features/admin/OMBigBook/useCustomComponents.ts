/**
 * useCustomComponents — owns the Big Book custom components registry,
 * loading flag, current selection, and load/remove handlers.
 *
 * Extracted from OMBigBook.tsx to drain useStates in the parent
 * (STATE_EXPLOSION refactor — OMD-840).
 */
import { useCallback, useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';

export interface UseCustomComponentsOptions {
  log: (type: 'info' | 'success' | 'warning' | 'error', message: string, details?: string) => void;
}

export interface UseCustomComponentsResult {
  customComponents: any;
  loading: boolean;
  selected: string | null;
  setSelected: (name: string | null) => void;
  load: () => Promise<void>;
  remove: (component: any) => Promise<void>;
}

export function useCustomComponents({ log }: UseCustomComponentsOptions): UseCustomComponentsResult {
  const [customComponents, setCustomComponents] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any>('/bigbook/custom-components-registry');
      setCustomComponents(data);
      log('success', `Loaded ${Object.keys(data.components || {}).length} custom components`);
    } catch (error) {
      console.error('Error loading custom components:', error);
      log('error', `Failed to load custom components: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [log]);

  const remove = useCallback(async (component: any) => {
    if (!window.confirm(`Are you sure you want to remove the component "${component.displayName || component.name}"? This action cannot be undone.`)) {
      return;
    }
    log('info', `🗑️ Removing custom component: ${component.name}`);
    try {
      const result = await apiClient.delete<any>('/bigbook/remove-bigbook-component');
      if (result.success) {
        log('success', `✅ Component "${component.name}" removed successfully`);
        if (result.menuUpdated) {
          log('success', `🧩 Component removed from Big Book sidebar menu`);
        }
        await load();
        setSelected(prev => (prev === component.name ? null : prev));
      } else {
        throw new Error(result.error || 'Failed to remove component');
      }
    } catch (error) {
      log('error', `❌ Failed to remove component: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [log, load]);

  return { customComponents, loading, selected, setSelected, load, remove };
}
