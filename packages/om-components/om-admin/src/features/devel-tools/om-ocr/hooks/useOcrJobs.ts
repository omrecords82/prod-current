/**
 * Hook for managing OCR jobs list with polling and caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/shared/lib/axiosInstance';
import type { OCRJobRow, OCRJobDetail } from '../types/ocrJob';

interface UseOcrJobsOptions {
  churchId: number | null;
  limit?: number;
  pollInterval?: number;
}

interface UseOcrJobsReturn {
  jobs: OCRJobRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  fetchJobDetail: (jobId: number) => Promise<OCRJobDetail | null>;
  updateRecordType: (jobId: number, recordType: string) => Promise<boolean>;
  retryJob: (jobId: number) => Promise<boolean>;
  deleteJobs: (jobIds: number[]) => Promise<boolean>;
  reprocessJobs: (jobIds: number[]) => Promise<boolean>;
  hideJobs: (jobIds: number[]) => void;
  completedCount: number;
  failedCount: number;
  processingCount: number;
  detailCache: Map<number, OCRJobDetail>;
}

export function useOcrJobs({
  churchId,
  limit = 200,
  pollInterval = 3000
}: UseOcrJobsOptions): UseOcrJobsReturn {
  const [jobs, setJobs] = useState<OCRJobRow[]>([]);
  const [hiddenJobIds, setHiddenJobIds] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem('om.ocr.hiddenJobs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detailCache = useRef<Map<number, OCRJobDetail>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch jobs list
  const fetchJobs = useCallback(async () => {
    if (!churchId) {
      console.log('[useOcrJobs] No churchId, skipping fetch');
      setJobs([]);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      console.log(`[useOcrJobs] Fetching OCR jobs for church ${churchId}...`);

      const response = await apiClient.get(
        `/api/church/${churchId}/ocr/jobs?limit=${limit}`
      );
      
      // Handle multiple possible response shapes: array, nested envelopes, various structures
      const res = response as any;
      const d = res?.data ?? res;
      
      const jobsData =
        Array.isArray(d) ? d :
        (d?.jobs ??
         d?.data?.jobs ??
         (Array.isArray(d?.data) ? d.data : null) ??
         d?.data?.data?.jobs ??
         []);
      
      console.log('[useOcrJobs] Response keys:', Object.keys(res || {}));
      console.log('[useOcrJobs] Data keys:', Object.keys(d || {}));
      console.log(`[useOcrJobs] Received ${jobsData.length} jobs`);
      
      // Map to OCRJobRow format with proper type normalization
      const mappedJobs: OCRJobRow[] = jobsData.map((job: any) => ({
        id: Number(job.id),
        church_id: Number(job.church_id || churchId),
        original_filename: job.original_filename || job.filename || '',
        filename: job.filename || '',
        status: job.status || 'queued',
        record_type: job.record_type || 'unknown',
        confidence_score: job.confidence_score != null ? Number(job.confidence_score) : null,
        language: job.language || 'en',
        created_at: job.created_at,
        updated_at: job.updated_at,
        ocr_text_preview: job.ocr_text_preview || null,
        has_ocr_text: !!job.ocr_text_preview || !!job.has_ocr_text,
        error_message: job.error_message || job.error || null,
        classifier_suggested_type: job.classifier_suggested_type || null,
        classifier_confidence: job.classifier_confidence != null ? Number(job.classifier_confidence) : null,
      }));

      // Filter out hidden jobs (removed from page but not from DB)
      const visibleJobs = mappedJobs.filter(j => !hiddenJobIds.has(j.id));
      setJobs(visibleJobs);
      setError(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[useOcrJobs] Fetch error:', err);
        setError(err.message || 'Failed to fetch jobs');
      }
    }
  }, [churchId, limit, hiddenJobIds]);

  // Initial load
  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchJobs();
    setLoading(false);
  }, [fetchJobs]);

  // Fetch job detail (with caching)
  const fetchJobDetail = useCallback(async (jobId: number): Promise<OCRJobDetail | null> => {
    if (!churchId) return null;

    // Check cache first
    if (detailCache.current.has(jobId)) {
      return detailCache.current.get(jobId)!;
    }

    try {
      const response = await apiClient.get(`/api/church/${churchId}/ocr/jobs/${jobId}`);
      // Handle various response structures: unwrap nested data.data if needed
      const responseData = (response as any)?.data ?? (response as any);
      const data = responseData?.data ?? responseData;
      
      if (!data || !data.id) {
        console.error('[useOcrJobs] Invalid job detail response:', response);
        return null;
      }
      
      const detail: OCRJobDetail = {
        id: parseInt(data.id),
        church_id: parseInt(data.church_id || churchId),
        original_filename: data.original_filename || data.filename,
        filename: data.filename,
        status: data.status,
        record_type: data.record_type || 'unknown',
        confidence_score: data.confidence_score,
        language: data.language,
        created_at: data.created_at,
        updated_at: data.updated_at,
        ocr_text: data.ocr_text || null,
        ocr_result: data.ocr_result || null,
        file_path: data.file_path,
        mapping: data.mapping,
        has_ocr_text: !!data.ocr_text,
        pages: data.pages || undefined,
        feeder_source: data.feeder_source || undefined,
      };

      detailCache.current.set(jobId, detail);
      return detail;
    } catch (err) {
      console.error('[useOcrJobs] Detail fetch error:', err);
      return null;
    }
  }, [churchId]);

  // Update record type
  const updateRecordType = useCallback(async (jobId: number, recordType: string): Promise<boolean> => {
    if (!churchId) return false;

    // Optimistic update
    setJobs(prev => prev.map(j => 
      j.id === jobId ? { ...j, record_type: recordType as any } : j
    ));

    try {
      await apiClient.patch(`/api/church/${churchId}/ocr/jobs/${jobId}`, {
        record_type: recordType
      });
      
      // Clear cache for this job
      detailCache.current.delete(jobId);
      return true;
    } catch (err) {
      console.error('[useOcrJobs] Update record type error:', err);
      // Revert on error
      await fetchJobs();
      return false;
    }
  }, [churchId, fetchJobs]);

  // Retry job (works for failed and completed jobs — re-process without re-upload)
  const retryJob = useCallback(async (jobId: number): Promise<boolean> => {
    if (!churchId) return false;

    const job = jobs.find(j => j.id === jobId);
    if (!job) {
      console.warn(`[useOcrJobs] Job ${jobId} not found in current jobs list`);
      return false;
    }

    const retryableStatuses = ['failed', 'completed', 'complete', 'error'];
    if (!retryableStatuses.includes(job.status)) {
      console.warn(`[useOcrJobs] Cannot retry job ${jobId}: status is '${job.status}'`);
      return false;
    }

    try {
      await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/retry`);
      
      // Update status optimistically
      setJobs(prev => prev.map(j =>
        j.id === jobId ? { ...j, status: 'processing' as const, error_message: null } : j
      ));
      
      detailCache.current.delete(jobId);
      return true;
    } catch (err: any) {
      // Handle 4xx errors gracefully - don't throw to prevent AdminErrorBoundary crashes
      const status = err?.response?.status;
      const errorMessage = err?.response?.data?.error || err?.message || 'Unknown error';
      
      if (status === 400) {
        console.warn(`[useOcrJobs] Retry failed (400): ${errorMessage}`);
      } else {
        console.error('[useOcrJobs] Retry error:', err);
      }
      
      // Don't throw - return false to prevent crashes
      return false;
    }
  }, [churchId, jobs]);

  // Bulk delete jobs
  const deleteJobs = useCallback(async (jobIds: number[]): Promise<boolean> => {
    if (!churchId || jobIds.length === 0) return false;

    try {
      await apiClient.delete(`/api/church/${churchId}/ocr/jobs`, {
        data: { jobIds }
      });
      
      // Remove from local state
      setJobs(prev => prev.filter(j => !jobIds.includes(j.id)));
      
      // Clear cache for deleted jobs
      jobIds.forEach(id => detailCache.current.delete(id));
      
      return true;
    } catch (err) {
      console.error('[useOcrJobs] Delete error:', err);
      return false;
    }
  }, [churchId]);

  // Bulk reprocess jobs (retry multiple — works for failed and completed jobs)
  const reprocessJobs = useCallback(async (jobIds: number[]): Promise<boolean> => {
    if (!churchId || jobIds.length === 0) return false;

    const retryableStatuses = ['failed', 'completed', 'complete', 'error'];
    const retryableJobIds = jobIds.filter(id => {
      const job = jobs.find(j => j.id === id);
      return job && retryableStatuses.includes(job.status);
    });

    if (retryableJobIds.length === 0) {
      console.warn('[useOcrJobs] No retryable jobs found');
      return false;
    }

    const failedJobIds = retryableJobIds;

    try {
      // Retry each failed job (handle individual failures gracefully)
      const results = await Promise.allSettled(
        failedJobIds.map(id => 
          apiClient.post(`/api/church/${churchId}/ocr/jobs/${id}/retry`)
        )
      );
      
      // Check for failures
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.warn(`[useOcrJobs] ${failures.length} of ${failedJobIds.length} retry requests failed`);
        failures.forEach((failure, idx) => {
          const err = (failure as PromiseRejectedResult).reason;
          const status = err?.response?.status;
          const errorMessage = err?.response?.data?.error || err?.message || 'Unknown error';
          if (status === 400) {
            console.warn(`[useOcrJobs] Retry failed (400) for job ${failedJobIds[idx]}: ${errorMessage}`);
          } else {
            console.error(`[useOcrJobs] Retry error for job ${failedJobIds[idx]}:`, err);
          }
        });
      }
      
      // Update status optimistically for successful retries
      const successfulIds = failedJobIds.filter((id, idx) => results[idx].status === 'fulfilled');
      if (successfulIds.length > 0) {
        setJobs(prev => prev.map(j =>
          successfulIds.includes(j.id) ? { ...j, status: 'processing' as const, error_message: null } : j
        ));
        
        // Clear cache
        successfulIds.forEach(id => detailCache.current.delete(id));
      }
      
      // Return true if at least one succeeded, false if all failed
      return successfulIds.length > 0;
    } catch (err: any) {
      // Handle unexpected errors
      console.error('[useOcrJobs] Reprocess error:', err);
      // Don't throw - return false to prevent crashes
      return false;
    }
  }, [churchId, jobs]);

  // Hide jobs from page (remove from view without deleting from DB)
  const hideJobs = useCallback((jobIds: number[]) => {
    setHiddenJobIds(prev => {
      const next = new Set(prev);
      jobIds.forEach(id => next.add(id));
      localStorage.setItem('om.ocr.hiddenJobs', JSON.stringify([...next]));
      return next;
    });
    setJobs(prev => prev.filter(j => !jobIds.includes(j.id)));
  }, []);

  // Polling logic
  useEffect(() => {
    if (!churchId) return;

    const hasActiveJobs = jobs.some(j => 
      ['queued', 'uploading', 'processing'].includes(j.status)
    );

    if (hasActiveJobs) {
      pollTimeoutRef.current = setTimeout(() => {
        fetchJobs();
      }, pollInterval);
    }

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [jobs, churchId, pollInterval, fetchJobs]);

  // Initial load on church change
  useEffect(() => {
    refresh();
    detailCache.current.clear();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [churchId]);

  // Counts
  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const failedCount = jobs.filter(j => j.status === 'failed').length;
  const processingCount = jobs.filter(j => ['queued', 'uploading', 'processing'].includes(j.status)).length;

  return {
    jobs,
    loading,
    error,
    refresh,
    fetchJobDetail,
    updateRecordType,
    retryJob,
    deleteJobs,
    reprocessJobs,
    hideJobs,
    completedCount,
    failedCount,
    processingCount,
    detailCache: detailCache.current
  };
}

