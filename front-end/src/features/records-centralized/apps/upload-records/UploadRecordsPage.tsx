/**
 * UploadRecordsPage — Record Image Upload & Status Tracker
 * Route: /portal/upload, /apps/upload-records
 *
 * Two tabs:
 *   1. Upload — drag-and-drop image upload with live queue
 *   2. My Uploads — history of all uploaded jobs with review status
 *
 * Pipeline stages:
 *   uploaded → ocr_complete → agent_extracted → ready_to_seed → seeded
 */

import { useAuth } from '@/context/AuthContext';
import OcrChurchSelector from '@/features/devel-tools/om-ocr/components/OcrChurchSelector';
import OcrSetupGate from '@/features/devel-tools/om-ocr/components/OcrSetupGate';
import OcrStudioNav from '@/features/devel-tools/om-ocr/components/OcrStudioNav';
import { useOcrChurchSelector } from '@/features/devel-tools/om-ocr/hooks/useOcrChurchSelector';
import { formatOcrStudioChurchLabel, ocrStudioPathWithChurch } from '@/features/devel-tools/om-ocr/utils/ocrStudioChurch';

import churchService, { type Church as ChurchRecord } from '@/shared/lib/churchService';
import { apiClient } from '@/shared/lib/axiosInstance';
import {
  Alert,
  alpha,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  IconCloudUpload,
  IconDatabase,
  IconFile,
  IconLayoutGrid,
  IconList,
  IconPhoto,
  IconRefresh,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'error';
  progress: number;
  error?: string;
  jobId?: string;
  reviewStatus?: string;
}

function mapRemoteJobToQueueStatus(remote: { status: string; review_status?: string }): QueuedFile['status'] {
  const reviewStatus = remote.review_status || 'uploaded';
  if (remote.status === 'failed' || remote.status === 'error') return 'failed';
  if (['agent_extracted', 'ready_to_seed', 'seeded'].includes(reviewStatus)) return 'completed';
  if (remote.status === 'processing') return 'processing';
  if (remote.status === 'complete' || remote.status === 'completed') return 'processing';
  return 'queued';
}

function queueStatusLabel(file: QueuedFile): string {
  switch (file.status) {
    case 'uploading': return 'Uploading';
    case 'queued': return 'In queue';
    case 'processing':
      return file.reviewStatus === 'ocr_complete' ? 'Extracting fields' : 'Processing OCR';
    case 'completed': return 'Ready';
    case 'failed':
    case 'error': return 'Failed';
    default: return 'Pending';
  }
}

type Church = ChurchRecord;

interface OcrJob {
  id: string;
  filename: string;
  original_filename: string;
  status: string;
  review_status: string;
  review_notes: string | null;
  record_type: string | null;
  confidence_score: number | string;
  created_at: string;
  has_ocr_text: boolean;
}

type ReviewStatus =
  | 'uploaded' | 'ocr_complete' | 'agent_extracted' | 'ready_to_seed' | 'seeded' | 'returned'
  | 'pending_review' | 'in_review' | 'processed';

let _uid = 0;
const uid = () => `urf_${++_uid}_${Date.now()}`;

const ACCEPTED_RE = /\.(jpe?g|png|tiff?)$/i;
const ACCEPTED_TYPES = '.jpg,.jpeg,.png,.tif,.tiff';
const RECORD_TYPES = ['custom', 'baptism', 'marriage', 'funeral'] as const;
type UploadRecordType = typeof RECORD_TYPES[number];

const normalizeOcrLanguage = (raw?: string | null): string => {
  if (!raw) return 'en';
  const code = raw.toLowerCase().trim();
  if (code.length === 2) return code;
  const map: Record<string, string> = { eng: 'en', gre: 'el', ell: 'el', rus: 'ru', ara: 'ar', ron: 'ro' };
  return map[code] || code.slice(0, 2);
};

// ─────────────────────────────────────────────────────────────────────────────
// Review status config
// ─────────────────────────────────────────────────────────────────────────────

const REVIEW_STATUS_CONFIG: Record<ReviewStatus, { label: string; color: string; description: string; step: number }> = {
  uploaded:         { label: 'Uploaded',         color: '#9e9e9e', description: 'Image received, queued for OCR',           step: 1 },
  ocr_complete:     { label: 'OCR Complete',     color: '#03a9f4', description: 'Text recognized from image',               step: 2 },
  agent_extracted:  { label: 'Review Fields',    color: '#ff9800', description: 'Agent extracted fields — confirm in Review', step: 3 },
  ready_to_seed:    { label: 'Ready to Seed',    color: '#673ab7', description: 'Confirmed — ready for database insert',    step: 4 },
  seeded:           { label: 'Seeded',           color: '#4caf50', description: 'Records inserted into parish database',    step: 5 },
  returned:         { label: 'Returned',         color: '#f44336', description: 'Needs attention — see notes',              step: 0 },
  pending_review:   { label: 'Pending Review',   color: '#ff9800', description: 'Legacy status', step: 2 },
  in_review:        { label: 'Under Review',     color: '#2196f3', description: 'Legacy status', step: 3 },
  processed:        { label: 'Processed',        color: '#4caf50', description: 'Legacy status', step: 4 },
};

const REVIEW_STEPS: ReviewStatus[] = ['uploaded', 'ocr_complete', 'agent_extracted', 'ready_to_seed', 'seeded'];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmtSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return iso; }
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Mini stepper showing review progress */
const ReviewStepper: React.FC<{ status: ReviewStatus }> = ({ status }) => {
  const cfg = REVIEW_STATUS_CONFIG[status];
  if (!cfg) return null;
  const activeStep = cfg.step;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
      {REVIEW_STEPS.map((s, i) => {
        const sCfg = REVIEW_STATUS_CONFIG[s];
        const isActive = sCfg.step <= activeStep;
        const isCurrent = s === status;
        return (
          <React.Fragment key={s}>
            {i > 0 && (
              <Box sx={{ width: 20, height: 2, bgcolor: isActive ? sCfg.color : 'divider', borderRadius: 1, transition: 'all 0.3s' }} />
            )}
            <Tooltip title={sCfg.description}>
              <Box sx={{
                width: isCurrent ? 10 : 8,
                height: isCurrent ? 10 : 8,
                borderRadius: '50%',
                bgcolor: isActive ? sCfg.color : 'divider',
                transition: 'all 0.3s',
                boxShadow: isCurrent ? `0 0 0 3px ${alpha(sCfg.color, 0.25)}` : 'none',
              }} />
            </Tooltip>
          </React.Fragment>
        );
      })}
    </Box>
  );
};

/** Review status chip */
const ReviewStatusChip: React.FC<{ status: ReviewStatus; size?: 'small' | 'medium' }> = ({ status, size = 'small' }) => {
  const cfg = REVIEW_STATUS_CONFIG[status] || REVIEW_STATUS_CONFIG.uploaded;
  return (
    <Chip
      label={cfg.label}
      size={size}
      sx={{
        fontWeight: 600,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        bgcolor: alpha(cfg.color, 0.1),
        color: cfg.color,
        border: `1px solid ${alpha(cfg.color, 0.3)}`,
      }}
    />
  );
};

type HistoryViewMode = 'list' | 'grid';

/** Thumbnail for an OCR job image */
const UploadJobThumb: React.FC<{
  churchId: number;
  jobId: string | number;
  size?: 'sm' | 'md' | 'fill';
}> = ({ churchId, jobId, size = 'sm' }) => {
  const [failed, setFailed] = useState(false);
  const dimensionSx = size === 'fill'
    ? { width: '100%', aspectRatio: '4 / 3' }
    : size === 'md'
      ? { width: 56, height: 56 }
      : { width: 44, height: 44 };

  const thumbSx = {
    ...dimensionSx,
    flexShrink: 0,
    borderRadius: 1,
    bgcolor: 'action.hover',
    border: '1px solid',
    borderColor: 'divider',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  } as const;

  if (failed) {
    return (
      <Box sx={{ ...thumbSx, color: 'text.disabled' }}>
        <IconPhoto size={size === 'fill' ? 32 : 20} />
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={`/api/church/${churchId}/ocr/jobs/${jobId}/image`}
      alt=""
      onError={() => setFailed(true)}
      sx={{ ...thumbSx, objectFit: 'cover' }}
    />
  );
};

const jobDisplayName = (job: OcrJob) => (job.original_filename || job.filename || '').split('/').pop() || `Job #${job.id}`;

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const UploadRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isOcrStudioUpload = location.pathname.includes('/devel/ocr-studio');
  const isPortalUpload = location.pathname.startsWith('/portal');
  const { selectedChurchId: studioChurchId, searchParams: studioSearchParams } = useOcrChurchSelector();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { user, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || user?.role === 'admin' || user?.role === 'manager';
  const isStaff = isSuperAdmin() || ['admin', 'manager', 'church_admin', 'priest', 'deacon', 'editor'].includes(user?.role || '');

  // Tab
  const [activeTab, setActiveTab] = useState(0);

  // Church selection (admin only)
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(null);
  const effectiveChurchId = useMemo(() => {
    if (isOcrStudioUpload) {
      return studioChurchId ?? (user?.church_id ? Number(user.church_id) : null);
    }
    return isAdmin ? selectedChurchId : user?.church_id ? Number(user.church_id) : null;
  }, [isOcrStudioUpload, studioChurchId, isAdmin, selectedChurchId, user?.church_id]);

  // Upload state
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queueRef = useRef<QueuedFile[]>([]);
  queueRef.current = queue;

  // History state
  const [history, setHistory] = useState<OcrJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [historyViewMode, setHistoryViewMode] = useState<HistoryViewMode>('list');
  const [selectedHistoryJobIds, setSelectedHistoryJobIds] = useState<Set<string>>(new Set());
  const [pendingDeleteHistoryIds, setPendingDeleteHistoryIds] = useState<string[] | null>(null);
  const [pendingSeedHistoryIds, setPendingSeedHistoryIds] = useState<string[] | null>(null);
  const [deletingHistoryJobs, setDeletingHistoryJobs] = useState(false);
  const [seedingHistoryJobs, setSeedingHistoryJobs] = useState(false);

  // Church OCR settings (language + record type for uploads)
  const [ocrLanguage, setOcrLanguage] = useState('en');
  const [recordType, setRecordType] = useState<UploadRecordType>('custom');
  const [recordLayoutMode, setRecordLayoutMode] = useState('auto');
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Derived upload stats
  const shouldPollQueue = useMemo(
    () => queue.some((f) => f.jobId && !['completed', 'failed', 'error'].includes(f.status)),
    [queue],
  );
  const allDone = queue.length > 0 && queue.every((f) => ['completed', 'failed', 'error'].includes(f.status));
  const completedCount = queue.filter((f) => f.status === 'completed').length;
  const failedCount = queue.filter((f) => f.status === 'failed' || f.status === 'error').length;
  const pendingCount = queue.filter((f) => f.status === 'pending').length;

  // ─── Load churches for admin / manager church picker ──
  useEffect(() => {
    if (!isAdmin || isOcrStudioUpload) return;
    let cancelled = false;
    (async () => {
      try {
        let list = await churchService.fetchChurches();
        if (list.length === 0) {
          const fallback: any = await apiClient.get('/api/churches');
          const body = fallback?.data ?? fallback;
          const inner = body?.data ?? body;
          list = inner?.churches || (Array.isArray(inner) ? inner : []);
        }
        if (cancelled) return;
        setChurches(list);
        if (list.length > 0) {
          setSelectedChurchId((prev) => {
            if (prev && list.some((c) => c.id === prev)) return prev;
            const userChurchId = user?.church_id ? Number(user.church_id) : null;
            if (userChurchId && list.some((c) => c.id === userChurchId)) return userChurchId;
            return list[0].id;
          });
        }
      } catch {
        if (!cancelled) setChurches([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin, isOcrStudioUpload, user?.church_id]);

  // ─── Load church OCR settings ──
  useEffect(() => {
    if (!effectiveChurchId) return;
    let cancelled = false;
    (async () => {
      setSettingsLoading(true);
      try {
        const res: any = await apiClient.get(`/api/church/${effectiveChurchId}/ocr/settings`);
        const data = res?.data ?? res;
        if (cancelled) return;
        const lang = normalizeOcrLanguage(data?.defaultLanguage || data?.language);
        setOcrLanguage(lang);
        const savedType = data?.documentProcessing?.defaultRecordType;
        if (savedType && RECORD_TYPES.includes(savedType)) {
          setRecordType(savedType);
        }
        setRecordLayoutMode(data?.documentProcessing?.recordLayoutMode || 'auto');
      } catch {
        if (!cancelled) {
          setOcrLanguage('en');
          setRecordType('custom');
          setRecordLayoutMode('auto');
        }
      } finally {
        if (!cancelled) setSettingsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [effectiveChurchId]);

  // ─── Fetch upload history ──
  const fetchHistory = useCallback(async () => {
    if (!effectiveChurchId) return;
    setHistoryLoading(true);
    try {
      const res: any = await apiClient.get(`/api/church/${effectiveChurchId}/ocr/jobs?limit=200`);
      const jobs: OcrJob[] = res?.data?.jobs || res?.jobs || [];
      setHistory(jobs);
    } catch { setHistory([]); }
    finally { setHistoryLoading(false); }
  }, [effectiveChurchId]);

  useEffect(() => {
    if (activeTab === 1) fetchHistory();
  }, [activeTab, fetchHistory]);

  const syncQueueFromServer = useCallback(async () => {
    if (!effectiveChurchId) return;
    try {
      const res: any = await apiClient.get(`/api/church/${effectiveChurchId}/ocr/jobs?limit=200`);
      const jobs: any[] = res?.jobs || res?.data?.jobs || [];
      if (!Array.isArray(jobs)) return;
      const statusMap = new Map(jobs.map((j) => [String(j.id), j]));
      setQueue((prev) => {
        let changed = false;
        const next = prev.map((f) => {
          if (!f.jobId) return f;
          const remote = statusMap.get(String(f.jobId));
          if (!remote) return f;
          const uiStatus = mapRemoteJobToQueueStatus(remote);
          const reviewStatus = remote.review_status || 'uploaded';
          if (uiStatus === f.status && reviewStatus === f.reviewStatus) return f;
          changed = true;
          return {
            ...f,
            status: uiStatus,
            reviewStatus,
            progress: uiStatus === 'completed' ? 100 : f.progress,
            error: uiStatus === 'failed'
              ? (remote.error_message || remote.error || 'Processing failed')
              : f.error,
          };
        });
        return changed ? next : prev;
      });
    } catch { /* non-fatal */ }
  }, [effectiveChurchId]);

  // ─── Poll for queue status updates ──
  useEffect(() => {
    if (!effectiveChurchId || !shouldPollQueue) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    syncQueueFromServer();
    pollRef.current = setInterval(syncQueueFromServer, 4000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [effectiveChurchId, shouldPollQueue, syncQueueFromServer]);

  // ─── File handlers ──
  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: QueuedFile[] = Array.from(fileList)
      .filter((f) => ACCEPTED_RE.test(f.name))
      .map((f) => ({ id: uid(), file: f, name: f.name, size: f.size, status: 'pending' as const, progress: 0 }));
    if (newFiles.length > 0) setQueue((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = (id: string) => setQueue((q) => q.filter((f) => f.id !== id));

  // ─── Upload ──
  const startUpload = useCallback(async () => {
    if (!effectiveChurchId) return;
    const pending = queueRef.current.filter((f) => f.status === 'pending');
    if (pending.length === 0) return;
    setIsUploading(true);
    for (const item of pending) {
      setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'uploading', progress: 0 } : f)));
      try {
        const formData = new FormData();
        formData.append('files', item.file);
        formData.append('churchId', effectiveChurchId.toString());
        formData.append('recordType', recordType);
        formData.append('language', ocrLanguage);
        formData.append('recordLayoutMode', recordLayoutMode);
        const response: any = await apiClient.post('/api/ocr/jobs/upload', formData, { timeout: 120000 });
        const jobs = response?.jobs || response?.data?.jobs || [];
        const jobId = jobs.length > 0 ? String(jobs[0].id) : undefined;
        if (jobId) {
          setQueue((q) => q.map((f) => (f.id === item.id ? {
            ...f,
            status: 'queued' as const,
            progress: 100,
            jobId,
            reviewStatus: 'uploaded',
          } : f)));
        } else {
          setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'error', progress: 100, error: 'Upload OK but no job created' } : f)));
        }
      } catch (err: any) {
        const body = err?.originalError?.response?.data ?? err?.response?.data;
        const serverMsg = body?.error || body?.message || err?.message || 'Upload failed';
        setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'error', error: serverMsg } : f)));
      }
    }
    setIsUploading(false);
    await syncQueueFromServer();
  }, [effectiveChurchId, recordType, ocrLanguage, syncQueueFromServer]);

  // ─── Admin: update review status ──
  const updateReviewStatus = useCallback(async (jobId: string, review_status: ReviewStatus, review_notes?: string) => {
    if (!effectiveChurchId) return;
    try {
      await apiClient.patch(`/api/church/${effectiveChurchId}/ocr/jobs/${jobId}/review-status`, { review_status, review_notes });
      setHistory((prev) => prev.map((j) => j.id === jobId ? { ...j, review_status, review_notes: review_notes ?? j.review_notes } : j));
    } catch { /* non-critical */ }
  }, [effectiveChurchId]);

  // ─── Staff: reprocess/retry job ──
  const handleReprocessJob = useCallback(async (jobId: string) => {
    if (!effectiveChurchId) return;
    try {
      await apiClient.post(`/api/church/${effectiveChurchId}/ocr/jobs/${jobId}/retry`);
      toast.success('Reprocessing triggered. The worker will pick up the job shortly.');
      fetchHistory();
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to trigger reprocessing';
      toast.error(serverMsg);
    }
  }, [effectiveChurchId, fetchHistory]);

  // ─── Filtered history ──
  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return history;
    return history.filter((j) => j.review_status === historyFilter);
  }, [history, historyFilter]);

  // Status summary counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: history.length };
    for (const j of history) counts[j.review_status] = (counts[j.review_status] || 0) + 1;
    return counts;
  }, [history]);

  const toggleHistoryJobSelection = useCallback((jobId: string) => {
    setSelectedHistoryJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }, []);

  const handleDeleteHistoryJobs = useCallback(async (jobIds: string[]) => {
    if (!effectiveChurchId || jobIds.length === 0) return;
    setDeletingHistoryJobs(true);
    try {
      await apiClient.delete(`/api/church/${effectiveChurchId}/ocr/jobs`, {
        data: { jobIds: jobIds.map(Number) },
      });
      const idSet = new Set(jobIds);
      setHistory((prev) => prev.filter((j) => !idSet.has(j.id)));
      setSelectedHistoryJobIds((prev) => {
        const next = new Set(prev);
        jobIds.forEach((id) => next.delete(id));
        return next;
      });
      toast.success(jobIds.length === 1 ? 'Upload deleted' : `Deleted ${jobIds.length} uploads`);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to delete upload(s)';
      toast.error(msg);
    } finally {
      setDeletingHistoryJobs(false);
      setPendingDeleteHistoryIds(null);
    }
  }, [effectiveChurchId]);

  useEffect(() => {
    const visibleIds = new Set(filteredHistory.map((j) => j.id));
    setSelectedHistoryJobIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredHistory]);

  const allHistorySelected = filteredHistory.length > 0
    && filteredHistory.every((j) => selectedHistoryJobIds.has(j.id));
  const someHistorySelected = selectedHistoryJobIds.size > 0 && !allHistorySelected;
  const seedableHistoryCount = filteredHistory.filter(
    (j) => selectedHistoryJobIds.has(j.id) && j.review_status === 'ready_to_seed',
  ).length;

  const handleSeedHistoryJobs = useCallback(async (jobIds: string[]) => {
    if (!effectiveChurchId || jobIds.length === 0) return;
    const seedable = jobIds.filter((id) => {
      const job = history.find((j) => j.id === id);
      return job?.review_status === 'ready_to_seed';
    });
    if (seedable.length === 0) return;

    setSeedingHistoryJobs(true);
    let success = 0;
    const errors: string[] = [];
    try {
      for (const jobId of seedable) {
        try {
          await apiClient.post(`/api/church/${effectiveChurchId}/ocr/jobs/${jobId}/seed`);
          success += 1;
        } catch (err: any) {
          errors.push(`Job #${jobId}: ${err?.response?.data?.error || err?.message || 'Seed failed'}`);
        }
      }
      await fetchHistory();
      setSelectedHistoryJobIds((prev) => {
        const next = new Set(prev);
        seedable.forEach((id) => next.delete(id));
        return next;
      });
      if (errors.length > 0) {
        toast.warn(`Seeded ${success} upload(s). ${errors.length} failed.`);
      } else {
        toast.success(success === 1 ? 'Record seeded successfully' : `Seeded ${success} records successfully`);
      }
    } finally {
      setSeedingHistoryJobs(false);
      setPendingSeedHistoryIds(null);
    }
  }, [effectiveChurchId, history, fetchHistory]);

  const openReviewForJob = useCallback((jobId: string) => {
    if (!effectiveChurchId) return;
    if (isPortalUpload) {
      navigate(`/portal/ocr/review/${effectiveChurchId}/${jobId}`);
      return;
    }
    navigate(ocrStudioPathWithChurch(
      `/devel/ocr-studio/review/${effectiveChurchId}/${jobId}`,
      studioSearchParams,
      effectiveChurchId,
    ));
  }, [effectiveChurchId, isPortalUpload, navigate, studioSearchParams]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <OcrSetupGate churchId={effectiveChurchId}>
    <Box
      sx={{
        py: 3,
        px: { xs: 1.5, md: 3 },
        ...(isOcrStudioUpload
          ? { maxWidth: '100%', width: '100%' }
          : { maxWidth: 1100, mx: 'auto' }),
      }}
    >
      {isOcrStudioUpload && <OcrStudioNav />}
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Record Images
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload scanned church records and track their processing status.
        </Typography>
      </Box>

      {/* Admin church selector (portal / non-OCR-studio routes) */}
      {!isOcrStudioUpload && isAdmin && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2.5 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Target Church</InputLabel>
            <Select
              value={selectedChurchId ?? ''}
              label="Target Church"
              onChange={(e) => setSelectedChurchId(Number(e.target.value) || null)}
            >
              {churches.map((c) => (
                <MenuItem key={c.id} value={c.id}>{formatOcrStudioChurchLabel(c)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>
      )}

      {!effectiveChurchId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {isAdmin ? 'Select a target church to continue.' : 'No church is associated with your account. Contact your administrator.'}
        </Alert>
      )}

      {isOcrStudioUpload && (
        <Paper variant="outlined" sx={{ mb: 2.5, px: { xs: 1.5, sm: 2 }, py: 1.25 }}>
          <Stack
            direction="row"
            alignItems="center"
            flexWrap="wrap"
            gap={2}
            sx={{ minHeight: 56 }}
          >
            <OcrChurchSelector variant="inline" />
            {effectiveChurchId && (
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                sx={{
                  minHeight: 48,
                  '& .MuiTab-root': { minHeight: 48, py: 1.25, textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' },
                }}
              >
                <Tab label="Upload Images" />
                <Tab label={`My Uploads${history.length > 0 ? ` (${history.length})` : ''}`} />
              </Tabs>
            )}
          </Stack>
        </Paper>
      )}

      {!isOcrStudioUpload && effectiveChurchId && (
        <Paper variant="outlined" sx={{ mb: 2.5 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ minHeight: 42, '& .MuiTab-root': { minHeight: 42, textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' } }}
          >
            <Tab label="Upload Images" />
            <Tab label={`My Uploads${history.length > 0 ? ` (${history.length})` : ''}`} />
          </Tabs>
        </Paper>
      )}

      {effectiveChurchId && (
        <>
          {/* ════════════ TAB 0: UPLOAD ════════════ */}
          {activeTab === 0 && (
            <Box>
              <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Record Type</InputLabel>
                  <Select
                    value={recordType}
                    label="Record Type"
                    onChange={(e) => setRecordType(e.target.value as UploadRecordType)}
                  >
                    <MenuItem value="custom">Auto-detect</MenuItem>
                    <MenuItem value="baptism">Baptism</MenuItem>
                    <MenuItem value="marriage">Marriage</MenuItem>
                    <MenuItem value="funeral">Funeral</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={ocrLanguage}
                    label="Language"
                    disabled={settingsLoading}
                    onChange={(e) => setOcrLanguage(e.target.value)}
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="el">Greek</MenuItem>
                    <MenuItem value="ru">Russian</MenuItem>
                    <MenuItem value="ar">Arabic</MenuItem>
                    <MenuItem value="ro">Romanian</MenuItem>
                  </Select>
                </FormControl>
                <Box sx={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    Defaults from church OCR settings. Change in{' '}
                    <Button
                      size="small"
                      variant="text"
                      sx={{ p: 0, minWidth: 0, verticalAlign: 'baseline', textTransform: 'none' }}
                      href={`/devel/ocr-studio?church=${effectiveChurchId}`}
                    >
                      OCR Settings
                    </Button>
                  </Typography>
                </Box>
              </Paper>

              {/* Drop zone */}
              <Paper
                variant="outlined"
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                sx={{
                  p: 4, mb: 2, textAlign: 'center', cursor: 'pointer',
                  borderStyle: 'dashed', borderWidth: 2,
                  borderColor: dragActive ? 'primary.main' : 'divider',
                  bgcolor: dragActive ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: 'primary.light', bgcolor: alpha(theme.palette.primary.main, 0.02) },
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  multiple
                  hidden
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
                />
                <IconCloudUpload size={44} color={theme.palette.text.secondary} style={{ opacity: 0.4 }} />
                <Typography variant="body1" fontWeight={600} sx={{ mt: 1.5 }}>
                  Drag and drop record images here
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  or click to browse &middot; JPG, PNG, TIFF &middot; 300 DPI recommended
                </Typography>
              </Paper>

              {/* File queue */}
              {queue.length > 0 && (
                <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
                  <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Selected Files ({queue.length})
                    </Typography>
                    <Stack direction="row" spacing={0.5}>
                      {completedCount > 0 && <Chip label={`${completedCount} ready`} color="success" size="small" />}
                      {failedCount > 0 && <Chip label={`${failedCount} failed`} color="error" size="small" />}
                    </Stack>
                  </Box>
                  <Stack divider={<Divider />}>
                    {queue.map((f) => (
                      <Box key={f.id} sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <IconFile size={18} color={theme.palette.text.secondary} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={500} noWrap sx={{ fontSize: '0.85rem' }}>{f.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{fmtSize(f.size)}</Typography>
                        </Box>
                        {f.status === 'uploading' && <CircularProgress size={18} />}
                        {['queued', 'processing'].includes(f.status) && (
                          <Chip
                            label={queueStatusLabel(f)}
                            color={f.status === 'processing' ? 'warning' : 'primary'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                        {f.status === 'completed' && <Chip label="Ready" color="success" size="small" sx={{ fontSize: '0.7rem' }} />}
                        {(f.status === 'failed' || f.status === 'error') && (
                          <Tooltip title={f.error || 'Failed'}>
                            <Chip label="Failed" color="error" size="small" sx={{ fontSize: '0.7rem' }} />
                          </Tooltip>
                        )}
                        {f.status === 'pending' && (
                          <IconButton size="small" onClick={() => removeFile(f.id)}><IconX size={14} /></IconButton>
                        )}
                      </Box>
                    ))}
                  </Stack>
                  {/* Upload progress bar */}
                  {isUploading && <LinearProgress sx={{ height: 3 }} />}
                </Paper>
              )}

              {/* Actions */}
              {!allDone && (
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    startIcon={<IconUpload size={18} />}
                    onClick={startUpload}
                    disabled={isUploading || pendingCount === 0}
                    sx={{ textTransform: 'none' }}
                  >
                    {isUploading ? 'Uploading...' : `Upload${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
                  </Button>
                  {queue.length > 0 && !isUploading && (
                    <Button variant="text" color="inherit" onClick={() => setQueue([])} sx={{ textTransform: 'none' }}>
                      Clear All
                    </Button>
                  )}
                </Stack>
              )}

              {/* Completion */}
              {allDone && (
                <Box>
                  <Alert
                    severity={failedCount === 0 ? 'success' : failedCount === queue.length ? 'error' : 'warning'}
                    sx={{ mb: 2 }}
                  >
                    {failedCount === 0
                      ? 'Images submitted. OCR and agent extraction run automatically — track progress in My Uploads, then confirm fields in Review.'
                      : failedCount === queue.length
                        ? (() => {
                            const err = queue.find((f) => f.error)?.error || '';
                            if (err.includes('billing') || err.includes('PERMISSION_DENIED')) {
                              return 'Images uploaded but OCR processing failed: Google Vision API billing is disabled on the server. Contact your administrator to enable billing, then re-upload or use Reprocess in My Uploads.';
                            }
                            if (err.includes('All') && err.includes('pages failed')) {
                              return 'Images uploaded but OCR processing failed. Check My Uploads for details or contact your administrator.';
                            }
                            return err || 'Upload or OCR processing failed. Please check your files and try again.';
                          })()
                        : `${completedCount} of ${queue.length} files uploaded. ${failedCount} failed.`}
                  </Alert>
                  <Stack direction="row" spacing={2}>
                    <Button variant="outlined" startIcon={<IconUpload size={16} />} onClick={() => setQueue([])} sx={{ textTransform: 'none' }}>
                      Upload More
                    </Button>
                    <Button variant="text" onClick={() => { setActiveTab(1); fetchHistory(); }} sx={{ textTransform: 'none' }}>
                      View My Uploads
                    </Button>
                    {effectiveChurchId && (
                      <Button
                        variant="contained"
                        onClick={() => {
                          if (!effectiveChurchId) return;
                          if (isPortalUpload) {
                            navigate(`/portal/ocr/review/${effectiveChurchId}`);
                            return;
                          }
                          navigate(ocrStudioPathWithChurch(
                            `/devel/ocr-studio/review/${effectiveChurchId}`,
                            studioSearchParams,
                            effectiveChurchId,
                          ));
                        }}
                        sx={{ textTransform: 'none' }}
                      >
                        Open Review
                      </Button>
                    )}
                  </Stack>
                </Box>
              )}
            </Box>
          )}

          {/* ════════════ TAB 1: MY UPLOADS ════════════ */}
          {activeTab === 1 && (
            <Box>
              {/* Filter chips + view controls */}
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.5, alignItems: 'center' }}>
                {(['all', ...Object.keys(REVIEW_STATUS_CONFIG)] as string[]).map((key) => {
                  const count = statusCounts[key] || 0;
                  if (key !== 'all' && count === 0) return null;
                  const cfg = key === 'all' ? null : REVIEW_STATUS_CONFIG[key as ReviewStatus];
                  return (
                    <Chip
                      key={key}
                      size="small"
                      label={`${cfg?.label || 'All'} (${count})`}
                      color={historyFilter === key ? 'primary' : 'default'}
                      variant={historyFilter === key ? 'filled' : 'outlined'}
                      onClick={() => setHistoryFilter(key)}
                      sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                    />
                  );
                })}
                <Box sx={{ flex: 1 }} />
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={historyViewMode}
                  onChange={(_, v: HistoryViewMode | null) => { if (v) setHistoryViewMode(v); }}
                  sx={{ mr: 0.5 }}
                >
                  <ToggleButton value="list" aria-label="List view">
                    <Tooltip title="List view"><IconList size={16} /></Tooltip>
                  </ToggleButton>
                  <ToggleButton value="grid" aria-label="Grid view">
                    <Tooltip title="Grid view"><IconLayoutGrid size={16} /></Tooltip>
                  </ToggleButton>
                </ToggleButtonGroup>
                <IconButton size="small" onClick={fetchHistory} title="Refresh">
                  <IconRefresh size={16} />
                </IconButton>
              </Box>

              {/* Selection toolbar */}
              {!historyLoading && filteredHistory.length > 0 && (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <Checkbox
                    size="small"
                    checked={allHistorySelected}
                    indeterminate={someHistorySelected}
                    onChange={(_, checked) => {
                      if (checked) {
                        setSelectedHistoryJobIds(new Set(filteredHistory.map((j) => j.id)));
                      } else {
                        setSelectedHistoryJobIds(new Set());
                      }
                    }}
                    sx={{ p: 0.5 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                    {selectedHistoryJobIds.size > 0
                      ? `${selectedHistoryJobIds.size} selected`
                      : 'Select all'}
                  </Typography>
                  {selectedHistoryJobIds.size > 0 && (
                    <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
                      {seedableHistoryCount > 0 && (
                        <Button
                          size="small"
                          color="success"
                          variant="outlined"
                          startIcon={<IconDatabase size={14} />}
                          sx={{ textTransform: 'none' }}
                          disabled={seedingHistoryJobs}
                          onClick={() => {
                            const ids = filteredHistory
                              .filter((j) => selectedHistoryJobIds.has(j.id) && j.review_status === 'ready_to_seed')
                              .map((j) => j.id);
                            setPendingSeedHistoryIds(ids);
                          }}
                        >
                          Seed selected ({seedableHistoryCount})
                        </Button>
                      )}
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        startIcon={<IconTrash size={14} />}
                        sx={{ textTransform: 'none' }}
                        onClick={() => setPendingDeleteHistoryIds(Array.from(selectedHistoryJobIds))}
                      >
                        Delete selected ({selectedHistoryJobIds.size})
                      </Button>
                    </Stack>
                  )}
                </Stack>
              )}

              {historyLoading ? (
                <Stack spacing={1.5}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton
                      key={i}
                      variant="rounded"
                      height={historyViewMode === 'grid' ? 200 : 72}
                    />
                  ))}
                </Stack>
              ) : filteredHistory.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                  <IconPhoto size={40} color={theme.palette.text.disabled} style={{ opacity: 0.5 }} />
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5 }}>
                    {history.length === 0 ? 'No uploads yet. Upload your first record images above.' : 'No uploads match this filter.'}
                  </Typography>
                </Paper>
              ) : historyViewMode === 'grid' ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: 2,
                  }}
                >
                  {filteredHistory.map((job) => {
                    const checked = selectedHistoryJobIds.has(job.id);
                    const canReview = ['agent_extracted', 'ready_to_seed'].includes(job.review_status);
                    return (
                      <Paper
                        key={job.id}
                        variant="outlined"
                        sx={{
                          overflow: 'hidden',
                          borderColor: checked ? 'primary.main' : 'divider',
                          borderWidth: checked ? 2 : 1,
                          transition: 'all 0.15s',
                          '&:hover': { boxShadow: 2 },
                        }}
                      >
                        <Box sx={{ position: 'relative' }}>
                          <Checkbox
                            size="small"
                            checked={checked}
                            onChange={() => toggleHistoryJobSelection(job.id)}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              left: 4,
                              zIndex: 1,
                              bgcolor: alpha(theme.palette.background.paper, 0.85),
                              borderRadius: 0.5,
                              p: 0.25,
                            }}
                          />
                          {effectiveChurchId && (
                            <Box
                              onClick={() => { if (canReview) openReviewForJob(job.id); }}
                              sx={{
                                cursor: canReview ? 'pointer' : 'default',
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              <UploadJobThumb churchId={effectiveChurchId} jobId={job.id} size="fill" />
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ p: 1.25 }}>
                          <Typography variant="caption" fontWeight={600} noWrap title={jobDisplayName(job)} sx={{ display: 'block', mb: 0.5 }}>
                            {jobDisplayName(job)}
                          </Typography>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5}>
                            <ReviewStatusChip status={job.review_status as ReviewStatus} />
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {fmtDate(job.created_at)}
                            </Typography>
                          </Stack>
                          {canReview && effectiveChurchId && (
                            <Button
                              size="small"
                              variant="text"
                              fullWidth
                              sx={{ mt: 0.75, textTransform: 'none', fontSize: '0.75rem' }}
                              onClick={() => openReviewForJob(job.id)}
                            >
                              Review & Seed
                            </Button>
                          )}
                          {job.review_notes && job.review_status === 'returned' && (
                            <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }} noWrap title={job.review_notes}>
                              {job.review_notes}
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              ) : (
                <Stack spacing={1}>
                  {filteredHistory.map((job) => {
                    const reviewCfg = REVIEW_STATUS_CONFIG[(job.review_status as ReviewStatus)] || REVIEW_STATUS_CONFIG.uploaded;
                    const checked = selectedHistoryJobIds.has(job.id);
                    return (
                      <Paper
                        key={job.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderLeft: `3px solid ${reviewCfg.color}`,
                          boxShadow: checked ? `0 0 0 1px ${theme.palette.primary.main}` : undefined,
                          transition: 'all 0.15s',
                          '&:hover': { bgcolor: alpha(reviewCfg.color, isDark ? 0.04 : 0.02) },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                          <Checkbox
                            size="small"
                            checked={checked}
                            onChange={() => toggleHistoryJobSelection(job.id)}
                            sx={{ p: 0.25, mt: 0.25, flexShrink: 0 }}
                          />
                          {effectiveChurchId && (
                            <UploadJobThumb churchId={effectiveChurchId} jobId={job.id} size="md" />
                          )}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                              <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, fontSize: '0.875rem' }}>
                                {jobDisplayName(job)}
                              </Typography>
                              <ReviewStatusChip status={job.review_status as ReviewStatus} />
                            </Box>
                            <Stack direction="row" spacing={2} sx={{ mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                {fmtDate(job.created_at)}
                              </Typography>
                              {job.record_type && job.record_type !== 'custom' && (
                                <Typography variant="caption" color="text.secondary">
                                  Type: {job.record_type}
                                </Typography>
                              )}
                              {job.confidence_score && Number(job.confidence_score) > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  Confidence: {(Number(job.confidence_score) * 100).toFixed(0)}%
                                </Typography>
                              )}
                            </Stack>
                            <ReviewStepper status={job.review_status as ReviewStatus} />
                            {['agent_extracted', 'ready_to_seed'].includes(job.review_status) && effectiveChurchId && (
                              <Button
                                size="small"
                                variant="outlined"
                                sx={{ mt: 1, textTransform: 'none' }}
                                onClick={() => openReviewForJob(job.id)}
                              >
                                Review & Seed
                              </Button>
                            )}
                            {job.review_notes && (
                              <Alert severity={job.review_status === 'returned' ? 'warning' : 'info'} sx={{ mt: 1, py: 0, '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
                                {job.review_notes}
                              </Alert>
                            )}
                          </Box>

                          {isStaff && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0 }}>
                              <FormControl size="small" sx={{ minWidth: 140 }}>
                                <Select
                                  value={job.review_status}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'reprocess') {
                                      handleReprocessJob(job.id);
                                    } else {
                                      updateReviewStatus(job.id, val as ReviewStatus);
                                    }
                                  }}
                                  sx={{ fontSize: '0.75rem', height: 30 }}
                                >
                                  {Object.entries(REVIEW_STATUS_CONFIG).map(([k, v]) => (
                                    <MenuItem key={k} value={k} sx={{ fontSize: '0.8rem' }}>{v.label}</MenuItem>
                                  ))}
                                  <Divider />
                                  <MenuItem value="reprocess" sx={{ fontSize: '0.8rem', color: 'primary.main', fontWeight: 600 }}>
                                    Reprocess Image
                                  </MenuItem>
                                </Select>
                              </FormControl>
                            </Box>
                          )}
                        </Box>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Box>
          )}

        </>
      )}
    </Box>

      <Dialog open={pendingSeedHistoryIds !== null} onClose={() => !seedingHistoryJobs && setPendingSeedHistoryIds(null)}>
        <DialogTitle>
          {pendingSeedHistoryIds && pendingSeedHistoryIds.length > 1
            ? `Seed ${pendingSeedHistoryIds.length} uploads`
            : 'Seed upload to records'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {pendingSeedHistoryIds && pendingSeedHistoryIds.length > 1
              ? `Seed ${pendingSeedHistoryIds.length} reviewed uploads into church records?`
              : (() => {
                  const job = history.find((j) => j.id === pendingSeedHistoryIds?.[0]);
                  const label = job ? jobDisplayName(job) : `Job #${pendingSeedHistoryIds?.[0]}`;
                  return `Seed "${label}" into church records?`;
                })()}
            {' '}Only uploads marked Ready to Seed will be written to the records database.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingSeedHistoryIds(null)} disabled={seedingHistoryJobs}>Cancel</Button>
          <Button
            onClick={() => pendingSeedHistoryIds && handleSeedHistoryJobs(pendingSeedHistoryIds)}
            color="success"
            variant="contained"
            disabled={seedingHistoryJobs}
            sx={{ textTransform: 'none' }}
          >
            {seedingHistoryJobs ? <CircularProgress size={22} color="inherit" /> : 'Seed to Records'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pendingDeleteHistoryIds !== null} onClose={() => !deletingHistoryJobs && setPendingDeleteHistoryIds(null)}>
        <DialogTitle>
          {pendingDeleteHistoryIds && pendingDeleteHistoryIds.length > 1
            ? `Delete ${pendingDeleteHistoryIds.length} uploads`
            : 'Delete upload'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {pendingDeleteHistoryIds && pendingDeleteHistoryIds.length > 1
              ? `Are you sure you want to delete ${pendingDeleteHistoryIds.length} selected uploads?`
              : (() => {
                  const job = history.find((j) => j.id === pendingDeleteHistoryIds?.[0]);
                  const label = job ? jobDisplayName(job) : `Job #${pendingDeleteHistoryIds?.[0]}`;
                  return `Are you sure you want to delete "${label}"?`;
                })()}
            {' '}This permanently removes the job, extracted records, and uploaded files. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeleteHistoryIds(null)} disabled={deletingHistoryJobs}>Cancel</Button>
          <Button
            onClick={() => pendingDeleteHistoryIds && handleDeleteHistoryJobs(pendingDeleteHistoryIds)}
            color="error"
            variant="contained"
            disabled={deletingHistoryJobs}
            sx={{ textTransform: 'none' }}
          >
            {deletingHistoryJobs ? <CircularProgress size={22} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </OcrSetupGate>
  );
};

export default UploadRecordsPage;
