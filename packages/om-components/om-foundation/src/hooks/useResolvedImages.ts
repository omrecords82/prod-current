import { useEffect, useState, useRef } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';

interface ResolvedImagesResult {
  resolved: Record<string, string>;
  sources: Record<string, 'global' | 'church'>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// Simple in-memory cache keyed by "pageKey|churchId"
const cache: Record<string, { resolved: Record<string, string>; sources: Record<string, string>; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to resolve page-bound images from the image_bindings system.
 * 
 * Usage:
 *   const { resolved, sources, loading } = useResolvedImages('component:Header', churchId);
 *   const logoUrl = resolved['nav.logo'] || '/images/logos/dark-logo.svg';
 * 
 * Resolution order: church override > global > key not present (use your own default)
 */
export function useResolvedImages(pageKey: string, churchId?: number | null): ResolvedImagesResult {
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const [sources, setSources] = useState<Record<string, 'global' | 'church'>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchImages = async () => {
    if (!pageKey) return;

    const cacheKey = `${pageKey}|${churchId || ''}`;
    const cached = cache[cacheKey];
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      setResolved(cached.resolved);
      setSources(cached.sources as Record<string, 'global' | 'church'>);
      return;
    }

    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      let url = `/gallery/images/resolve?page_key=${encodeURIComponent(pageKey)}`;
      if (churchId) {
        url += `&church_id=${churchId}`;
      }

      const data = await apiClient.get<any>(url, { signal: controller.signal });

      if (data.success) {
        const r = data.resolved || {};
        const s = data.sources || {};
        setResolved(r);
        setSources(s);
        cache[cacheKey] = { resolved: r, sources: s, ts: Date.now() };
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to resolve images');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [pageKey, churchId]);

  const refresh = () => {
    const cacheKey = `${pageKey}|${churchId || ''}`;
    delete cache[cacheKey];
    fetchImages();
  };

  return { resolved, sources, loading, error, refresh };
}

export default useResolvedImages;
