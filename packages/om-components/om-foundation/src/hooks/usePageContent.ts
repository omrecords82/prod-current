/**
 * usePageContent — Hook for consuming CMS-managed page content
 *
 * Usage:
 *   const { content, get } = usePageContent('dashboard');
 *   <Typography>{get('title', 'Default Title')}</Typography>
 *
 * Content is fetched once per page_key and cached in memory.
 * Falls back to the provided default if no DB entry exists.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '@/api/utils/axiosInstance';

interface ContentEntry {
  value: string;
  type: 'text' | 'html' | 'markdown';
}

type ContentMap = Record<string, ContentEntry>;

// Simple in-memory cache so repeated mounts don't re-fetch
const cache: Record<string, ContentMap> = {};

export function usePageContent(pageKey: string) {
  const [content, setContent] = useState<ContentMap>(cache[pageKey] || {});
  const [loading, setLoading] = useState(!cache[pageKey]);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (cache[pageKey]) {
      setContent(cache[pageKey]);
      setLoading(false);
      return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    apiClient
      .get(`/page-content/resolve/${pageKey}`)
      .then((res) => {
        const data: ContentMap = res.data?.data || {};
        cache[pageKey] = data;
        setContent(data);
      })
      .catch(() => {
        // Silently fail — pages work fine with defaults
        cache[pageKey] = {};
        setContent({});
      })
      .finally(() => setLoading(false));
  }, [pageKey]);

  /** Get a content value with a fallback default */
  const get = useCallback(
    (key: string, defaultValue: string = ''): string => {
      return content[key]?.value ?? defaultValue;
    },
    [content],
  );

  return { content, get, loading };
}

/** Invalidate the cache for a page (call after edits) */
export function invalidatePageContentCache(pageKey?: string) {
  if (pageKey) {
    delete cache[pageKey];
  } else {
    Object.keys(cache).forEach((k) => delete cache[k]);
  }
}
