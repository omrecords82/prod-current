/**
 * usePageImageData — owns the data fetching state for PageImageIndex.
 *
 * Extracted from PageImageIndex.tsx to drain useStates in the parent
 * (STATE_EXPLOSION refactor — OMD-841).
 */
import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';

export interface Binding {
  id: number;
  page_key: string;
  image_key: string;
  scope: 'global' | 'church';
  church_id: number | null;
  church_name?: string;
  image_path: string;
  priority: number;
  enabled: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PageSummary {
  page_key: string;
  binding_count: number;
  image_key_count: number;
  global_count: number;
  church_count: number;
}

export interface ChurchOption {
  id: number;
  name: string;
}

export interface RegistryImage {
  id: number;
  image_path: string;
  category: string | null;
  label: string | null;
}

export type BindingsByKey = Record<string, { global: Binding | null; churches: Binding[] }>;

export interface UsePageImageDataResult {
  pages: PageSummary[];
  churches: ChurchOption[];
  registryImages: RegistryImage[];
  selectedPageKey: string;
  setSelectedPageKey: (key: string) => void;
  bindingsByKey: BindingsByKey;
  loading: boolean;
  syncStatus: string;
  refreshPages: () => Promise<void>;
  refreshSelectedPageBindings: () => Promise<void>;
  ensureRegistryLoaded: () => void;
  syncRegistry: () => Promise<void>;
}

export function usePageImageData(): UsePageImageDataResult {
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [selectedPageKey, setSelectedPageKey] = useState<string>('');
  const [bindingsByKey, setBindingsByKey] = useState<BindingsByKey>({});
  const [loading, setLoading] = useState(false);
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [registryImages, setRegistryImages] = useState<RegistryImage[]>([]);
  const [syncStatus, setSyncStatus] = useState<string>('');

  const fetchPages = useCallback(async () => {
    try {
      const data = await apiClient.get<any>('/gallery/admin/images/all-pages');
      setPages(data.pages || []);
    } catch (error) {
      console.error('Error fetching pages:', error);
    }
  }, []);

  const fetchPageIndex = useCallback(async (pageKey: string) => {
    setLoading(true);
    try {
      const data = await apiClient.get<any>(`/gallery/admin/images/page-index?page_key=${encodeURIComponent(pageKey)}`);
      setBindingsByKey(data.bindings_by_key || {});
    } catch (error) {
      console.error('Error fetching page index:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChurches = useCallback(async () => {
    try {
      const data = await apiClient.get<any>('/admin/churches');
      const list = (data.data || data.churches || data || [])
        .filter((c: any) => c && c.id)
        .map((c: any) => ({ id: c.id, name: c.name || c.church_name || `Church ${c.id}` }));
      setChurches(list);
    } catch (error) {
      console.error('Error fetching churches:', error);
    }
  }, []);

  const fetchRegistry = useCallback(async () => {
    try {
      const data = await apiClient.get<any>('/gallery/admin/images/registry');
      setRegistryImages(data.images || []);
    } catch (error) {
      console.error('Error fetching registry:', error);
    }
  }, []);

  const ensureRegistryLoaded = useCallback(() => {
    if (registryImages.length === 0) fetchRegistry();
  }, [registryImages.length, fetchRegistry]);

  const syncRegistry = useCallback(async () => {
    setSyncStatus('Syncing...');
    try {
      const data = await apiClient.post<any>('/gallery/admin/images/registry/sync');
      setSyncStatus(`Synced: ${data.discovered} discovered, ${data.inserted} new, ${data.skipped} existing`);
      fetchRegistry();
    } catch (error) {
      setSyncStatus('Sync error');
      console.error('Error syncing registry:', error);
    }
  }, [fetchRegistry]);

  const refreshSelectedPageBindings = useCallback(async () => {
    if (selectedPageKey) await fetchPageIndex(selectedPageKey);
  }, [selectedPageKey, fetchPageIndex]);

  // Initial load
  useEffect(() => {
    fetchPages();
    fetchChurches();
  }, [fetchPages, fetchChurches]);

  // Reload bindings when the selected page changes
  useEffect(() => {
    if (selectedPageKey) {
      fetchPageIndex(selectedPageKey);
    } else {
      setBindingsByKey({});
    }
  }, [selectedPageKey, fetchPageIndex]);

  return {
    pages,
    churches,
    registryImages,
    selectedPageKey,
    setSelectedPageKey,
    bindingsByKey,
    loading,
    syncStatus,
    refreshPages: fetchPages,
    refreshSelectedPageBindings,
    ensureRegistryLoaded,
    syncRegistry,
  };
}
