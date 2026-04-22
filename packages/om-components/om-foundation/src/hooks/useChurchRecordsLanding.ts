import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/api/utils/axiosInstance';

export interface ChurchRecordsLanding {
  church_id: number;
  logo_path: string | null;
  background_image_path: string | null;
  title: string | null;
  subtitle: string | null;
  welcome_text: string | null;
  accent_color: string | null;
  default_view: 'table' | 'card' | 'timeline' | 'analytics';
  show_analytics_highlights: boolean;
}

interface UseLandingResult {
  branding: ChurchRecordsLanding | null;
  churchName: string | null;
  isDefault: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  save: (data: Partial<ChurchRecordsLanding>) => Promise<void>;
  uploadLogo: (file: File) => Promise<string>;
  uploadBackground: (file: File) => Promise<string>;
  removeLogo: () => Promise<void>;
  removeBackground: () => Promise<void>;
}

export function useChurchRecordsLanding(churchId: number | null): UseLandingResult {
  const [branding, setBranding] = useState<ChurchRecordsLanding | null>(null);
  const [churchName, setChurchName] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!churchId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/churches/${churchId}/records-landing`);
      setBranding(res.data.data);
      setChurchName(res.data.churchName);
      setIsDefault(res.data.isDefault);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load branding');
    } finally {
      setLoading(false);
    }
  }, [churchId]);

  useEffect(() => { fetch(); }, [fetch]);

  const save = useCallback(async (data: Partial<ChurchRecordsLanding>) => {
    if (!churchId) return;
    await apiClient.put(`/churches/${churchId}/records-landing`, data);
    await fetch();
  }, [churchId, fetch]);

  const uploadLogo = useCallback(async (file: File): Promise<string> => {
    if (!churchId) throw new Error('No church selected');
    const fd = new FormData();
    fd.append('logo', file);
    const res = await apiClient.post(`/churches/${churchId}/records-landing/logo`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    await fetch();
    return res.data.logo_path;
  }, [churchId, fetch]);

  const uploadBackground = useCallback(async (file: File): Promise<string> => {
    if (!churchId) throw new Error('No church selected');
    const fd = new FormData();
    fd.append('background', file);
    const res = await apiClient.post(`/churches/${churchId}/records-landing/background`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    await fetch();
    return res.data.background_image_path;
  }, [churchId, fetch]);

  const removeLogo = useCallback(async () => {
    if (!churchId) return;
    await apiClient.delete(`/churches/${churchId}/records-landing/logo`);
    await fetch();
  }, [churchId, fetch]);

  const removeBackground = useCallback(async () => {
    if (!churchId) return;
    await apiClient.delete(`/churches/${churchId}/records-landing/background`);
    await fetch();
  }, [churchId, fetch]);

  return { branding, churchName, isDefault, loading, error, refetch: fetch, save, uploadLogo, uploadBackground, removeLogo, removeBackground };
}
