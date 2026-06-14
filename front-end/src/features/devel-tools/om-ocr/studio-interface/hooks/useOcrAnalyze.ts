import { useCallback, useState } from 'react';
import { apiClient } from '@/shared/lib/axiosInstance';

export type AnalyzeRecordType = 'baptism' | 'marriage' | 'funeral' | 'custom';
export type AnalyzeLayoutType = 'tabular' | 'form' | 'narrative';

export interface AnalyzeFileResult {
  id: string;
  originalFilename: string;
  suggestedRecordType: AnalyzeRecordType | 'unknown';
  recordTypeConfidence: number;
  detectedLayoutType: AnalyzeLayoutType;
  layoutConfidence: number;
  matchedCatalogLayoutId: string | null;
  matchedCatalogLayoutTitle: string | null;
  catalogMatchConfidence: number;
  regionsDetected: number;
  shouldSplit: boolean;
  optimizationsApplied: string[];
  warnings: string[];
  ocrTextPreview: string;
  ocrConfidence: number;
  needsReview: boolean;
}

export interface AnalyzeQueueItem extends AnalyzeFileResult {
  /** User overrides */
  recordType: AnalyzeRecordType;
  recordLayoutMode: string;
  splitRegions: boolean;
  analyzing?: boolean;
  error?: string;
}

const ACCEPTED_RE = /\.(jpe?g|png|tiff?)$/i;
export const ANALYZE_ACCEPTED_TYPES = '.jpg,.jpeg,.png,.tif,.tiff';

let _uid = 0;
const uid = () => `anq_${++_uid}_${Date.now()}`;

export function analyzePreviewUrl(
  churchId: number,
  sessionId: string,
  fileId: string,
  variant: 'optimized' | 'original' = 'optimized',
): string {
  return `/api/church/${churchId}/ocr/analyze/${sessionId}/${fileId}/preview?variant=${variant}`;
}

export function useOcrAnalyze(churchId: number | null) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<AnalyzeQueueItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const mapResult = (r: AnalyzeFileResult): AnalyzeQueueItem => ({
    ...r,
    recordType: (r.suggestedRecordType === 'unknown' ? 'custom' : r.suggestedRecordType) as AnalyzeRecordType,
    recordLayoutMode: r.shouldSplit ? 'multi_record_split' : 'auto',
    splitRegions: r.shouldSplit,
  });

  const analyzeFiles = useCallback(async (fileList: FileList | null) => {
    if (!churchId || !fileList?.length) return;
    const files = Array.from(fileList).filter((f) => ACCEPTED_RE.test(f.name));
    if (!files.length) return;

    setIsAnalyzing(true);
    const placeholders: AnalyzeQueueItem[] = files.map((f) => ({
      id: uid(),
      originalFilename: f.name,
      suggestedRecordType: 'custom',
      recordTypeConfidence: 0,
      detectedLayoutType: 'form',
      layoutConfidence: 0,
      matchedCatalogLayoutId: null,
      matchedCatalogLayoutTitle: null,
      catalogMatchConfidence: 0,
      regionsDetected: 0,
      shouldSplit: false,
      optimizationsApplied: [],
      warnings: [],
      ocrTextPreview: '',
      ocrConfidence: 0,
      needsReview: true,
      recordType: 'custom',
      recordLayoutMode: 'auto',
      splitRegions: false,
      analyzing: true,
    }));
    setItems((prev) => [...prev, ...placeholders]);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      if (sessionId) formData.append('sessionId', sessionId);

      const res: any = await apiClient.post(
        `/api/church/${churchId}/ocr/analyze`,
        formData,
        { timeout: 300000, headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const data = res?.data ?? res;
      const newSessionId = data.sessionId as string;
      const results = (data.files || []) as AnalyzeFileResult[];
      setSessionId(newSessionId);

      setItems((prev) => {
        const withoutPlaceholders = prev.filter((p) => !placeholders.some((pl) => pl.id === p.id && p.analyzing));
        return [...withoutPlaceholders, ...results.map(mapResult)];
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Analyze failed';
      setItems((prev) => prev.filter((p) => !placeholders.some((pl) => pl.id === p.id && p.analyzing)));
      throw new Error(msg);
    } finally {
      setIsAnalyzing(false);
    }
  }, [churchId, sessionId]);

  const updateItem = useCallback((id: string, patch: Partial<AnalyzeQueueItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clearAll = useCallback(async () => {
    if (churchId && sessionId) {
      try {
        await apiClient.delete(`/api/church/${churchId}/ocr/analyze/${sessionId}`);
      } catch {
        /* ignore */
      }
    }
    setSessionId(null);
    setItems([]);
  }, [churchId, sessionId]);

  const commitToUpload = useCallback(async (): Promise<number[]> => {
    if (!churchId || !sessionId || items.length === 0) return [];
    setIsCommitting(true);
    try {
      const payload = {
        items: items.map((it) => ({
          fileId: it.id,
          recordType: it.recordType,
          recordLayoutMode: it.recordLayoutMode,
          splitRegions: it.splitRegions,
        })),
      };
      const res: any = await apiClient.post(
        `/api/church/${churchId}/ocr/analyze/${sessionId}/commit`,
        payload,
        { timeout: 120000 },
      );
      const data = res?.data ?? res;
      const jobs = data.jobs || [];
      setSessionId(null);
      setItems([]);
      return jobs.map((j: { id: number }) => j.id);
    } finally {
      setIsCommitting(false);
    }
  }, [churchId, sessionId, items]);

  return {
    sessionId,
    items,
    isAnalyzing,
    isCommitting,
    dragActive,
    setDragActive,
    analyzeFiles,
    updateItem,
    removeItem,
    clearAll,
    commitToUpload,
  };
}
