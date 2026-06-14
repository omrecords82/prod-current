import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  manualRotationDegrees?: number;
  qualityScore?: number;
  qualityIssues?: string[];
  autoFixesApplied?: string[];
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

function analyzeSessionStorageKey(churchId: number): string {
  return `om_ocr_analyze_session_${churchId}`;
}

export function analyzePreviewUrl(
  churchId: number,
  sessionId: string,
  fileId: string,
  variant: 'optimized' | 'original' = 'optimized',
): string {
  return `/api/church/${churchId}/ocr/analyze/${sessionId}/${fileId}/preview?variant=${variant}`;
}

export function getAnalyzeFileDisplayName(file: File): string {
  const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return relative?.trim() || file.name;
}

export function collectAnalyzeImageFiles(fileList: FileList | null): File[] {
  if (!fileList?.length) return [];
  return Array.from(fileList)
    .filter((f) => ACCEPTED_RE.test(f.name))
    .sort((a, b) => getAnalyzeFileDisplayName(a).localeCompare(getAnalyzeFileDisplayName(b)));
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

type PendingAnalyzeJob = { file: File; placeholderId: string; displayName: string };

export function useOcrAnalyze(churchId: number | null) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [items, setItems] = useState<AnalyzeQueueItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isCommitting, setIsCommitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState<AnalyzeProgress | null>(null);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [restoringSession, setRestoringSession] = useState(false);

  const sessionRef = useRef<string | null>(null);
  const pendingQueueRef = useRef<PendingAnalyzeJob[]>([]);
  const pumpingRef = useRef(false);
  const progressTotalsRef = useRef({ total: 0, completed: 0 });
  const restoredRef = useRef(false);

  const persistSessionId = useCallback((id: string | null) => {
    if (!churchId) return;
    if (id) localStorage.setItem(analyzeSessionStorageKey(churchId), id);
    else localStorage.removeItem(analyzeSessionStorageKey(churchId));
  }, [churchId]);

  const mapResult = (r: AnalyzeFileResult): AnalyzeQueueItem => ({
    ...r,
    recordType: (r.suggestedRecordType === 'unknown' ? 'custom' : r.suggestedRecordType) as AnalyzeRecordType,
    recordLayoutMode: r.shouldSplit ? 'multi_record_split' : 'auto',
    splitRegions: false,
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

  useEffect(() => {
    if (!churchId || restoredRef.current) return;
    restoredRef.current = true;

    let cancelled = false;
    (async () => {
      setRestoringSession(true);
      try {
        const stored = localStorage.getItem(analyzeSessionStorageKey(churchId));
        const query = stored ? `?sessionId=${encodeURIComponent(stored)}` : '';
        const data: any = await apiClient.get(`/api/church/${churchId}/ocr/analyze/active${query}`);
        if (cancelled || !data?.sessionId || !Array.isArray(data.files) || data.files.length === 0) return;

        sessionRef.current = data.sessionId;
        setSessionId(data.sessionId);
        persistSessionId(data.sessionId);
        setItems(data.files.map(mapResult));
        setSelectedIds(new Set(data.files.map((f: AnalyzeFileResult) => f.id)));
      } catch {
        /* no saved session */
      } finally {
        if (!cancelled) setRestoringSession(false);
      }
    })();

    return () => { cancelled = true; };
  }, [churchId, persistSessionId]);

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
    displayName: string,
    activeSessionId: string | null,
  ): Promise<{ sessionId: string; result: AnalyzeFileResult }> => {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('originalName', displayName);
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
      syncProgress(job.displayName);

      try {
        const { sessionId: newSessionId, result } = await analyzeSingleFile(
          job.file,
          job.displayName,
          sessionRef.current,
        );
        sessionRef.current = newSessionId;
        setSessionId(newSessionId);
        persistSessionId(newSessionId);

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
      syncProgress(pendingQueueRef.current[0]?.displayName ?? null);
    }

    pumpingRef.current = false;
    clearProgressIfIdle();
  }, [churchId, analyzeSingleFile, syncProgress, clearProgressIfIdle, persistSessionId]);

  const analyzeFiles = useCallback((fileList: FileList | null) => {
    if (!churchId || !fileList?.length) return;
    const files = collectAnalyzeImageFiles(fileList);
    if (!files.length) return;

    const placeholders = files.map((f) => makePlaceholder(getAnalyzeFileDisplayName(f)));
    const jobs: PendingAnalyzeJob[] = files.map((f, i) => ({
      file: f,
      placeholderId: placeholders[i].id,
      displayName: getAnalyzeFileDisplayName(f),
    }));

    pendingQueueRef.current.push(...jobs);
    setPendingQueueCount(pendingQueueRef.current.length);
    progressTotalsRef.current.total += files.length;
    syncProgress(jobs[0].displayName);

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

  const removeItem = useCallback(async (id: string) => {
    if (churchId && sessionId) {
      try {
        const data: any = await apiClient.delete(`/api/church/${churchId}/ocr/analyze/${sessionId}/${id}`);
        if (data?.sessionDeleted) {
          sessionRef.current = null;
          setSessionId(null);
          persistSessionId(null);
        }
      } catch {
        /* still remove from UI */
      }
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [churchId, sessionId, persistSessionId]);

  const rotateItem = useCallback(async (id: string, degrees: number) => {
    if (!churchId || !sessionId) return;
    const data: any = await apiClient.post(
      `/api/church/${churchId}/ocr/analyze/${sessionId}/${id}/rotate`,
      { degrees },
      { timeout: 120000 },
    );
    const mapped = mapResult(data.file as AnalyzeFileResult);
    setItems((prev) => prev.map((it) => (it.id === id ? mapped : it)));
    setPreviewVersion((v) => v + 1);
    return mapped;
  }, [churchId, sessionId]);

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
    persistSessionId(null);
    setItems([]);
    setSelectedIds(new Set());
  }, [churchId, sessionId, persistSessionId]);

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
        persistSessionId(null);
      }

      return {
        jobIds: jobs.map((j: { id: number }) => j.id),
        remainingCount,
      };
    } finally {
      setIsCommitting(false);
    }
  }, [churchId, sessionId, items, selectedIds, persistSessionId]);

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
    restoringSession,
    analyzeProgress,
    previewVersion,
    dragActive,
    setDragActive,
    analyzeFiles,
    updateItem,
    removeItem,
    rotateItem,
    clearAll,
    commitToUpload,
    toggleSelection,
    selectAll,
    selectNone,
    toggleSelectAll,
  };
}
