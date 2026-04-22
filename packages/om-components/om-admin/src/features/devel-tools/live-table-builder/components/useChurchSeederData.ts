/**
 * useChurchSeederData — owns the church list, current church selection, and
 * per-church record counts for the RecordSeeder dev tool.
 *
 * Extracted from RecordSeeder.tsx to drain useStates in the parent component
 * (STATE_EXPLOSION refactor — OMD-839).
 */
import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/shared/lib/axiosInstance';

export interface Church {
  id: number;
  name: string;
  database_name?: string;
}

export type RecordCounts = Record<string, number>;

const RECORD_KINDS = ['baptism', 'marriage', 'funeral'] as const;

export interface UseChurchSeederDataResult {
  churches: Church[];
  loadingChurches: boolean;
  ensureLoaded: () => void;
  churchId: number | '';
  setChurchId: (id: number | '') => void;
  selectedChurch: Church | undefined;
  counts: RecordCounts | null;
  countsLoading: boolean;
  refreshCounts: () => void;
  resetCounts: () => void;
}

export function useChurchSeederData(): UseChurchSeederDataResult {
  const [churches, setChurches] = useState<Church[]>([]);
  const [loadingChurches, setLoadingChurches] = useState(false);
  const [churchId, setChurchId] = useState<number | ''>('');
  const [counts, setCounts] = useState<RecordCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(false);

  const loadChurches = useCallback(async () => {
    setLoadingChurches(true);
    try {
      const res: any = await apiClient.get('/api/churches');
      const list = res?.data?.churches || res?.churches || res?.data || [];
      setChurches(Array.isArray(list) ? list : []);
    } catch {
      setChurches([]);
    }
    setLoadingChurches(false);
  }, []);

  const ensureLoaded = useCallback(() => {
    if (churches.length === 0 && !loadingChurches) loadChurches();
  }, [churches.length, loadingChurches, loadChurches]);

  const refreshCounts = useCallback(async () => {
    if (!churchId) return;
    setCountsLoading(true);
    try {
      const results: RecordCounts = {};
      for (const t of RECORD_KINDS) {
        try {
          const res: any = await apiClient.get(`/api/churches/${churchId}/records?type=${t}&limit=0`);
          results[t] = res?.data?.total ?? res?.total ?? 0;
        } catch {
          results[t] = -1; // table doesn't exist
        }
      }
      setCounts(results);
    } catch {
      setCounts(null);
    }
    setCountsLoading(false);
  }, [churchId]);

  const resetCounts = useCallback(() => setCounts(null), []);

  useEffect(() => {
    if (churchId) refreshCounts();
  }, [churchId, refreshCounts]);

  const selectedChurch = churches.find(c => c.id === churchId);

  return {
    churches,
    loadingChurches,
    ensureLoaded,
    churchId,
    setChurchId,
    selectedChurch,
    counts,
    countsLoading,
    refreshCounts,
    resetCounts,
  };
}
