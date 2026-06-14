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

type PendingAnalyzeJob = { file: File; placeholderId: string };

export function useOcrAnalyze(churchId: number | null) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<AnalyzeQueueItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isCommitting, setIsCommitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState<AnalyzeProgress | null>(null);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);

  const sessionRef = useRef<string | null>(null);
  const pendingQueueRef = useRef<PendingAnalyzeJob[]>([]);
  const pumpingRef = useRef(false);
  const progressTotalsRef = useRef({ total: 0, completed: 0 });

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

  const isAnalyzing = analyzingCount > 0 || pendingQueueCount > 0;

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

  const syncProgress = useCallback((currentName: string | null) => {
    setAnalyzeProgress({
      total: progressTotalsRef.current.total,
      completed: progressTotalsRef.current.completed,
      currentName,
    });
  }, []);

  const clearProgressIfIdle = useCallback(() => {
    if (pendingQueueRef.current.length === 0 && !pumpingRef.current) {
      setAnalyzeProgress(null);
      progressTotalsRef.current = { total: 0, completed: 0 };
    }
  }, []);

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

    const data: any = await apiClient.post(
      `/api/church/${churchId}/ocr/analyze`,
      formData,
      { timeout: 180000, headers: { 'Content-Type': 'multipart/form-data' } },
    );
    const result = (data?.files || [])[0] as AnalyzeFileResult | undefined;
    if (!result) throw new Error('No analyze result returned');
    return { sessionId: data.sessionId as string, result };
  }, [churchId]);

  const pumpAnalyzeQueue = useCallback(async () => {
    if (!churchId || pumpingRef.current) return;
    pumpingRef.current = true;

    while (pendingQueueRef.current.length > 0) {
      const job = pendingQueueRef.current[0];
      syncProgress(job.file.name);

      try {
        const { sessionId: newSessionId, result } = await analyzeSingleFile(
          job.file,
          sessionRef.current,
        );
        sessionRef.current = newSessionId;
        setSessionId(newSessionId);

        const mapped = mapResult(result);
        setItems((prev) => prev.map((it) => (it.id === job.placeholderId ? mapped : it)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(job.placeholderId);
          next.add(mapped.id);
          return next;
        });
      } catch (err: any) {
        const msg = err?.message || 'Analyze failed';
        setItems((prev) => prev.map((it) => (
          it.id === job.placeholderId
            ? { ...it, analyzing: false, error: msg, needsReview: true }
            : it
        )));
      }

      pendingQueueRef.current.shift();
      setPendingQueueCount(pendingQueueRef.current.length);
      progressTotalsRef.current.completed += 1;
      syncProgress(pendingQueueRef.current[0]?.file.name ?? null);
    }

    pumpingRef.current = false;
    clearProgressIfIdle();
  }, [churchId, analyzeSingleFile, syncProgress, clearProgressIfIdle]);

  const analyzeFiles = useCallback((fileList: FileList | null) => {
    if (!churchId || !fileList?.length) return;
    const files = Array.from(fileList).filter((f) => ACCEPTED_RE.test(f.name));
    if (!files.length) return;

    const placeholders = files.map((f) => makePlaceholder(f.name));
    const jobs: PendingAnalyzeJob[] = files.map((f, i) => ({
      file: f,
      placeholderId: placeholders[i].id,
    }));

    pendingQueueRef.current.push(...jobs);
    setPendingQueueCount(pendingQueueRef.current.length);
    progressTotalsRef.current.total += files.length;
    syncProgress(jobs[0].file.name);

    setItems((prev) => [...prev, ...placeholders]);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      placeholders.forEach((p) => next.add(p.id));
      return next;
    });

    void pumpAnalyzeQueue();
  }, [churchId, pumpAnalyzeQueue, syncProgress]);

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
    pendingQueueRef.current = [];
    setPendingQueueCount(0);
    progressTotalsRef.current = { total: 0, completed: 0 };
    setAnalyzeProgress(null);

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
      const data: any = await apiClient.post(
        `/api/church/${churchId}/ocr/analyze/${sessionId}/commit`,
        payload,
        { timeout: 120000 },
      );
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
    pendingQueueCount,
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
