import { useCallback, useMemo, useRef, useState } from 'react';
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

export interface AnalyzeProgress {
  total: number;
  completed: number;
  currentName: string | null;
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

function makePlaceholder(filename: string): AnalyzeQueueItem {
  return {
    id: uid(),
    originalFilename: filename,
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
  };
}

export function useOcrAnalyze(churchId: number | null) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<AnalyzeQueueItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState<AnalyzeProgress | null>(null);
  const sessionRef = useRef<string | null>(null);
  const analyzeBusyRef = useRef(false);

  const mapResult = (r: AnalyzeFileResult): AnalyzeQueueItem => ({
    ...r,
    recordType: (r.suggestedRecordType === 'unknown' ? 'custom' : r.suggestedRecordType) as AnalyzeRecordType,
    recordLayoutMode: r.shouldSplit ? 'multi_record_split' : 'auto',
    splitRegions: r.shouldSplit,
  });

  const completedItems = useMemo(
    () => items.filter((it) => !it.analyzing && !it.error),
    [items],
  );

  const analyzingCount = useMemo(
    () => items.filter((it) => it.analyzing).length,
    [items],
  );

  const selectableItems = useMemo(
    () => items.filter((it) => !it.analyzing && !it.error),
    [items],
  );

  const selectedCount = useMemo(
    () => selectableItems.filter((it) => selectedIds.has(it.id)).length,
    [selectableItems, selectedIds],
  );

  const allSelected = selectableItems.length > 0 && selectedCount === selectableItems.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(selectableItems.map((it) => it.id)));
  }, [selectableItems]);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) selectNone();
    else selectAll();
  }, [allSelected, selectAll, selectNone]);

  const analyzeSingleFile = useCallback(async (
    file: File,
    activeSessionId: string | null,
  ): Promise<{ sessionId: string; result: AnalyzeFileResult }> => {
    const formData = new FormData();
    formData.append('files', file);
    if (activeSessionId) formData.append('sessionId', activeSessionId);

    const res: any = await apiClient.post(
      `/api/church/${churchId}/ocr/analyze`,
      formData,
      { timeout: 180000, headers: { 'Content-Type': 'multipart/form-data' } },
    );
    const data = res?.data ?? res;
    const result = (data.files || [])[0] as AnalyzeFileResult | undefined;
    if (!result) throw new Error('No analyze result returned');
    return { sessionId: data.sessionId as string, result };
  }, [churchId]);

  const analyzeFiles = useCallback(async (fileList: FileList | null) => {
    if (!churchId || !fileList?.length) return;
    if (analyzeBusyRef.current) {
      throw new Error('Analysis already in progress — wait for the current batch to finish');
    }
    const files = Array.from(fileList).filter((f) => ACCEPTED_RE.test(f.name));
    if (!files.length) return;

    analyzeBusyRef.current = true;
    setIsAnalyzing(true);
    setAnalyzeProgress({ total: files.length, completed: 0, currentName: files[0].name });

    const placeholders = files.map((f) => makePlaceholder(f.name));
    const placeholderIds = placeholders.map((p) => p.id);
    setItems((prev) => [...prev, ...placeholders]);

    let activeSessionId = sessionRef.current ?? sessionId;
    const failures: string[] = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const placeholderId = placeholderIds[i];
      setAnalyzeProgress({ total: files.length, completed: i, currentName: file.name });

      try {
        const { sessionId: newSessionId, result } = await analyzeSingleFile(file, activeSessionId);
        activeSessionId = newSessionId;
        sessionRef.current = newSessionId;
        setSessionId(newSessionId);

        const mapped = mapResult(result);
        setItems((prev) => prev.map((it) => (it.id === placeholderId ? mapped : it)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(placeholderId);
          next.add(mapped.id);
          return next;
        });
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Analyze failed';
        failures.push(`${file.name}: ${msg}`);
        setItems((prev) => prev.map((it) => (
          it.id === placeholderId
            ? { ...it, analyzing: false, error: msg, needsReview: true }
            : it
        )));
      }

      setAnalyzeProgress({
        total: files.length,
        completed: i + 1,
        currentName: i + 1 < files.length ? files[i + 1].name : null,
      });
    }

    setIsAnalyzing(false);
    setAnalyzeProgress(null);
    analyzeBusyRef.current = false;

    if (failures.length === files.length) {
      throw new Error(failures[0] || 'Analyze failed');
    }
    if (failures.length > 0) {
      throw new Error(`${failures.length} file(s) failed to analyze`);
    }
  }, [churchId, sessionId, analyzeSingleFile]);

  const updateItem = useCallback((id: string, patch: Partial<AnalyzeQueueItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clearAll = useCallback(async () => {
    if (churchId && sessionId) {
      try {
        await apiClient.delete(`/api/church/${churchId}/ocr/analyze/${sessionId}`);
      } catch {
        /* ignore */
      }
    }
    sessionRef.current = null;
    setSessionId(null);
    setItems([]);
    setSelectedIds(new Set());
    setAnalyzeProgress(null);
  }, [churchId, sessionId]);

  const commitToUpload = useCallback(async (): Promise<{ jobIds: number[]; remainingCount: number }> => {
    if (!churchId || !sessionId) return { jobIds: [], remainingCount: 0 };
    const toCommit = items.filter((it) => !it.analyzing && !it.error && selectedIds.has(it.id));
    if (toCommit.length === 0) {
      throw new Error('Select at least one image to upload');
    }

    setIsCommitting(true);
    try {
      const payload = {
        items: toCommit.map((it) => ({
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
      const committedIds = new Set<string>((data.committedFileIds || toCommit.map((it) => it.id)) as string[]);
      const remainingCount = typeof data.remainingCount === 'number'
        ? data.remainingCount
        : items.length - committedIds.size;

      setItems((prev) => prev.filter((it) => !committedIds.has(it.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        committedIds.forEach((id) => next.delete(id));
        return next;
      });

      if (data.sessionDeleted) {
        sessionRef.current = null;
        setSessionId(null);
      }

      return {
        jobIds: jobs.map((j: { id: number }) => j.id),
        remainingCount,
      };
    } finally {
      setIsCommitting(false);
    }
  }, [churchId, sessionId, items, selectedIds]);

  return {
    sessionId,
    items,
    completedItems,
    analyzingCount,
    selectedIds,
    selectedCount,
    allSelected,
    someSelected,
    isAnalyzing,
    isCommitting,
    analyzeProgress,
    dragActive,
    setDragActive,
    analyzeFiles,
    updateItem,
    removeItem,
    clearAll,
    commitToUpload,
    toggleSelection,
    selectAll,
    selectNone,
    toggleSelectAll,
  };
}
