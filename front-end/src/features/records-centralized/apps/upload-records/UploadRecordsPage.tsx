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
import OcrSetupGate from '@/features/devel-tools/om-ocr/components/OcrSetupGate';
import OcrStudioNav from '@/features/devel-tools/om-ocr/components/OcrStudioNav';

import churchService, { type Church as ChurchRecord } from '@/shared/lib/churchService';
import { apiClient } from '@/shared/lib/axiosInstance';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
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
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  IconCloudUpload,
  IconFile,
  IconPhoto,
  IconRefresh,
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

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const UploadRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPortalUpload = location.pathname.startsWith('/portal');
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
  const effectiveChurchId = useMemo(
    () => (isAdmin ? selectedChurchId : user?.church_id ? Number(user.church_id) : null),
    [isAdmin, selectedChurchId, user?.church_id],
  );

  // Upload state
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // History state
  const [history, setHistory] = useState<OcrJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>('all');

  // Church OCR settings (language + record type for uploads)
  const [ocrLanguage, setOcrLanguage] = useState('en');
  const [recordType, setRecordType] = useState<UploadRecordType>('custom');
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Derived upload stats
  const hasActiveJobs = queue.some((f) => ['queued', 'processing', 'uploading'].includes(f.status));
  const allDone = queue.length > 0 && queue.every((f) => ['completed', 'failed', 'error'].includes(f.status));
  const completedCount = queue.filter((f) => f.status === 'completed').length;
  const failedCount = queue.filter((f) => f.status === 'failed' || f.status === 'error').length;
  const pendingCount = queue.filter((f) => f.status === 'pending').length;

  // ─── Load churches for admin / manager church picker ──
  useEffect(() => {
    if (!isAdmin) return;
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
  }, [isAdmin, user?.church_id]);

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
      } catch {
        if (!cancelled) {
          setOcrLanguage('en');
          setRecordType('custom');
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

  // ─── Poll for queue status updates ──
  useEffect(() => {
    if (!effectiveChurchId || !hasActiveJobs) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    const poll = async () => {
      try {
        const res: any = await apiClient.get(`/api/church/${effectiveChurchId}/ocr/jobs`);
        const jobs: any[] = res?.data?.jobs || res?.data || res?.jobs || [];
        if (jobs.length === 0) return;
        const statusMap = new Map<string, { status: string; error?: string }>();
        for (const j of jobs) statusMap.set(String(j.id), { status: j.status, error: j.error_message || undefined });
        setQueue((prev) => prev.map((f) => {
          if (!f.jobId) return f;
          const remote = statusMap.get(f.jobId);
          if (!remote) return f;
          let uiStatus = f.status;
          if (remote.status === 'pending' || remote.status === 'queued') uiStatus = 'queued';
          else if (remote.status === 'processing') uiStatus = 'processing';
          else if (remote.status === 'completed' || remote.status === 'complete') uiStatus = 'completed';
          else if (remote.status === 'failed' || remote.status === 'error') uiStatus = 'failed';
          if (uiStatus === f.status) return f;
          return { ...f, status: uiStatus, error: remote.error, progress: uiStatus === 'completed' ? 100 : f.progress };
        }));
      } catch { /* non-fatal */ }
    };
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [effectiveChurchId, hasActiveJobs]);

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
    if (!effectiveChurchId || queue.length === 0) return;
    setIsUploading(true);
    for (const item of queue) {
      if (item.status !== 'pending') continue;
      setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'uploading', progress: 0 } : f)));
      try {
        const formData = new FormData();
        formData.append('files', item.file);
        formData.append('churchId', effectiveChurchId.toString());
        formData.append('recordType', recordType);
        formData.append('language', ocrLanguage);
        const response: any = await apiClient.post('/api/ocr/jobs/upload', formData, { timeout: 120000 });
        const jobs = response?.jobs || response?.data?.jobs || [];
        const jobId = jobs.length > 0 ? String(jobs[0].id) : undefined;
        if (jobId) {
          setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'uploading' as const, progress: 80, jobId } : f)));
          try { await apiClient.post(`/api/church/${effectiveChurchId}/ocr/jobs/${jobId}/retry`); } catch { /* worker picks up */ }
          setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'queued' as const, progress: 100 } : f)));
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
  }, [effectiveChurchId, queue, recordType, ocrLanguage]);

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

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <OcrSetupGate churchId={effectiveChurchId}>
    <Box sx={{ py: 3, px: { xs: 1.5, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      {location.pathname.includes('/devel/ocr-studio') && <OcrStudioNav />}
      {/* Page header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Record Images
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload scanned church records and track their processing status.
        </Typography>
      </Box>

      {/* Admin church selector */}
      {isAdmin && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2.5 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Target Church</InputLabel>
            <Select
              value={selectedChurchId ?? ''}
              label="Target Church"
              onChange={(e) => setSelectedChurchId(Number(e.target.value) || null)}
            >
              {churches.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.church_name || c.name || `Church ${c.id}`}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>
      )}

      {!effectiveChurchId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {isAdmin ? 'Select a target church above to continue.' : 'No church is associated with your account. Contact your administrator.'}
        </Alert>
      )}

      {effectiveChurchId && (
        <>
          {/* Tabs */}
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
                      href={`/devel/ocr-studio/settings?church_id=${effectiveChurchId}`}
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
                      {completedCount > 0 && <Chip label={`${completedCount} uploaded`} color="success" size="small" />}
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
                        {f.status === 'queued' && <Chip label="Queued" color="primary" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />}
                        {f.status === 'processing' && <Chip label="Processing" color="warning" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />}
                        {f.status === 'completed' && <Chip label="Uploaded" color="success" size="small" sx={{ fontSize: '0.7rem' }} />}
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
                        ? (queue.find((f) => f.error)?.error
                          || 'All uploads failed. Please check your files and try again.')
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
                        onClick={() => navigate(
                          isPortalUpload
                            ? `/portal/ocr/review/${effectiveChurchId}`
                            : `/devel/ocr-studio/review/${effectiveChurchId}`
                        )}
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
              {/* Filter chips */}
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
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
                <IconButton size="small" onClick={fetchHistory} title="Refresh">
                  <IconRefresh size={16} />
                </IconButton>
              </Box>

              {historyLoading ? (
                <Stack spacing={1.5}>
                  {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={72} />)}
                </Stack>
              ) : filteredHistory.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                  <IconPhoto size={40} color={theme.palette.text.disabled} style={{ opacity: 0.5 }} />
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5 }}>
                    {history.length === 0 ? 'No uploads yet. Upload your first record images above.' : 'No uploads match this filter.'}
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={1}>
                  {filteredHistory.map((job) => {
                    const reviewCfg = REVIEW_STATUS_CONFIG[(job.review_status as ReviewStatus)] || REVIEW_STATUS_CONFIG.uploaded;
                    return (
                      <Paper
                        key={job.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderLeft: `3px solid ${reviewCfg.color}`,
                          transition: 'all 0.15s',
                          '&:hover': { bgcolor: alpha(reviewCfg.color, isDark ? 0.04 : 0.02) },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                          {/* Left: dot + info */}
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: reviewCfg.color, mt: 0.8, flexShrink: 0 }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                              <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, fontSize: '0.875rem' }}>
                                {(job.original_filename || job.filename || '').split('/').pop()}
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
                                onClick={() => navigate(
                                  isPortalUpload
                                    ? `/portal/ocr/review/${effectiveChurchId}/${job.id}`
                                    : `/devel/ocr-studio/review/${effectiveChurchId}/${job.id}`
                                )}
                              >
                                Review & Seed
                              </Button>
                            )}
                            {/* Review notes (shown to user when returned) */}
                            {job.review_notes && (
                              <Alert severity={job.review_status === 'returned' ? 'warning' : 'info'} sx={{ mt: 1, py: 0, '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
                                {job.review_notes}
                              </Alert>
                            )}
                          </Box>

                          {/* Staff: status controls */}
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
    </OcrSetupGate>
  );
};

export default UploadRecordsPage;
