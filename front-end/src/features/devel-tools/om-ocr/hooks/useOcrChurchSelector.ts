/**
 * useOcrChurchSelector — Shared hook for OCR Studio pages that need
 * a church selector dropdown (super_admin only).
 *
 * Reads/writes `?church=XX` in URL search params so the selection
 * persists across page navigation via OcrStudioNav.
 */

import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/shared/lib/axiosInstance';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface ChurchOption {
  id: number;
  name: string;
}

export function useOcrChurchSelector() {
  const { user, isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [loading, setLoading] = useState(false);

  const churchParam = searchParams.get('church');
  const selectedChurchId = churchParam ? Number(churchParam) : (user?.church_id ? Number(user.church_id) : null);

  // Fetch church list once (super_admin only)
  useEffect(() => {
    if (!isSuperAdmin()) return;
    setLoading(true);
    (async () => {
      try {
        const res: any = await apiClient.get('/api/churches');
        const list = res.data?.churches || res.churches || res.data || [];
        const sorted = (Array.isArray(list) ? list : []).sort((a: ChurchOption, b: ChurchOption) =>
          (a.name || '').localeCompare(b.name || ''),
        );
        setChurches(sorted);
        // Auto-select first church if none in URL and user has no church_id
        if (!searchParams.get('church') && !user?.church_id && sorted.length > 0) {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('church', String(sorted[0].id));
            return next;
          }, { replace: true });
        }
      } catch (err) {
        console.error('[useOcrChurchSelector] Failed to load churches:', err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSelectedChurchId = useCallback(
    (newId: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('church', String(newId));
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const churchName = churches.find(c => c.id === selectedChurchId)?.name || null;

  return {
    churches,
    selectedChurchId,
    setSelectedChurchId,
    churchName,
    showSelector: isSuperAdmin() && churches.length > 0,
    loading,
  };
}
