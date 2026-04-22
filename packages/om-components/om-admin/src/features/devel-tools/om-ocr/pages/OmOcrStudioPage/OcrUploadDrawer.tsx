import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Collapse,
  Drawer,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  IconAlertCircle,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconFile,
  IconFolder,
  IconLoader2,
  IconPhoto,
  IconRefresh,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { apiClient } from '@/shared/lib/axiosInstance';
import type { QueuedFile } from './types';
import { uid } from './helpers';

interface UploadDrawerProps {
  open: boolean;
  onClose: () => void;
  churchId: number | null;
  onUploadComplete?: () => void;
}

const OcrUploadDrawer: React.FC<UploadDrawerProps> = ({ open, onClose, churchId, onUploadComplete }) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const uploadDir = churchId
    ? `/uploads/om_church_${churchId}/uploaded/`
    : '/uploads/';

  // Poll for job status updates when there are queued/processing/pending jobs with jobIds
  const hasActiveJobs = queue.some(
    (f) => f.jobId && (f.status === 'queued' || f.status === 'processing' || f.status === 'pending'),
  );
  const hasAnyProcessing = queue.some((f) => f.status === 'processing');
  const completedCount = queue.filter((f) => f.status === 'completed').length;
  const failedCount = queue.filter((f) => f.status === 'failed' || f.status === 'error').length;
  const totalWithJobs = queue.filter((f) => !!f.jobId).length;
  const allDone = totalWithJobs > 0 && completedCount + failedCount === totalWithJobs;

  useEffect(() => {
    if (!open || !churchId || !hasActiveJobs) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }

    const poll = async () => {
      try {
        // Use platform-only endpoint — fast, no tenant DB, safe to poll
        const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs`);
        const jobs: any[] = res?.data?.jobs || res?.data || res?.jobs || [];
        if (jobs.length === 0) return;

        // Build lookup by job id → status
        const statusMap = new Map<string, { status: string; error?: string; confidence?: number }>();
        for (const j of jobs) {
          statusMap.set(String(j.id), {
            status: j.status,
            error: j.error_regions || j.error_message || j.error || undefined,
            confidence: j.confidence_score,
          });
        }

        setQueue((prev) =>
          prev.map((f) => {
            if (!f.jobId) return f;
            const remote = statusMap.get(f.jobId);
            if (!remote) return f;

            // Map backend statuses to our UI statuses
            let uiStatus = f.status;
            if (remote.status === 'pending' || remote.status === 'queued') uiStatus = 'queued';
            else if (remote.status === 'processing') uiStatus = 'processing';
            else if (remote.status === 'completed' || remote.status === 'complete') uiStatus = 'completed';
            else if (remote.status === 'failed' || remote.status === 'error') uiStatus = 'failed';

            if (uiStatus === f.status) return f; // no change
            return { ...f, status: uiStatus, error: remote.error, progress: uiStatus === 'completed' ? 100 : f.progress };
          }),
        );
      } catch {
        // polling failure is non-fatal
      }
    };

    // Poll immediately, then every 3s
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [open, churchId, hasActiveJobs]);

  // Retry a failed job
  const retryJob = useCallback(async (queueId: string, jobId: string) => {
    if (!churchId) return;
    setQueue((q) => q.map((f) => (f.id === queueId ? { ...f, status: 'queued' as const, error: undefined } : f)));
    try {
      await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/retry`);
    } catch (err: any) {
      setQueue((q) => q.map((f) => (f.id === queueId ? { ...f, status: 'failed' as const, error: 'Retry failed' } : f)));
    }
  }, [churchId]);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: QueuedFile[] = Array.from(fileList)
      .filter((f) => /\.(jpe?g|png|tiff?)$/i.test(f.name))
      .map((f) => ({
        id: uid(),
        file: f,
        name: f.name,
        size: f.size,
        status: 'pending' as const,
        progress: 0,
      }));
    setQueue((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const removeFile = (id: string) => setQueue((q) => q.filter((f) => f.id !== id));

  const startUpload = useCallback(async () => {
    if (!churchId || queue.length === 0) return;
    setIsUploading(true);

    // Platform upload endpoint — inserts into platform DB where feeder worker polls
    const endpoint = `/api/ocr/jobs/upload`;

    for (const item of queue) {
      if (item.status !== 'pending') continue;
      setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'uploading', progress: 0 } : f)));

      try {
        // Match exact FormData shape from EnhancedOCRUploader.startUpload
        const formData = new FormData();
        formData.append('files', item.file);                // key = 'files' (plural)
        formData.append('churchId', churchId.toString());   // churchId in body
        formData.append('recordType', 'custom');               // camelCase — classified later in workbench
        formData.append('language', 'en');

        // DO NOT set Content-Type — let browser set multipart boundary
        const response: any = await apiClient.post(endpoint, formData);

        // Extract jobId from response — backend creates the job row and returns its id
        const jobs = response.data?.jobs || response.jobs || [];
        const jobId = jobs.length > 0 ? String(jobs[0].id) : undefined;

        if (jobId) {
          // Job created — trigger OCR processing via retry endpoint
          setQueue((q) =>
            q.map((f) => (f.id === item.id ? { ...f, status: 'uploading' as const, progress: 80, jobId } : f)),
          );
          try {
            await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/retry`);
            // Set to 'queued' so polling picks up the lifecycle
            setQueue((q) =>
              q.map((f) => (f.id === item.id ? { ...f, status: 'queued' as const, progress: 100 } : f)),
            );
          } catch (retryErr: any) {
            console.error(`[OCR Studio] Failed to trigger processing for job ${jobId}:`, retryErr?.response?.data || retryErr?.message);
            // Still set to queued — the job exists in DB as pending, worker will pick it up
            setQueue((q) =>
              q.map((f) => (f.id === item.id ? { ...f, status: 'queued' as const, progress: 100 } : f)),
            );
          }
        } else {
          // Upload succeeded but no job returned — treat as error
          setQueue((q) =>
            q.map((f) => (f.id === item.id ? { ...f, status: 'error', progress: 100, error: 'Upload OK but no job created' } : f)),
          );
        }
      } catch (err: any) {
        const serverMsg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Upload failed';
        setQueue((q) =>
          q.map((f) =>
            f.id === item.id
              ? { ...f, status: 'error', error: serverMsg }
              : f,
          ),
        );
      }
    }

    setIsUploading(false);
    onUploadComplete?.();
  }, [churchId, queue, onUploadComplete]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 420 },
          bgcolor: theme.palette.background.default,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Drawer header */}
        <Box
          sx={{
            px: 3,
            py: 2.5,
            borderBottom: '1px solid',
            borderColor: theme.palette.divider,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Add Images
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload scanned record pages for OCR processing
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <IconX size={20} />
            </IconButton>
          </Stack>
        </Box>

        {/* Scrollable content */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2.5 }}>
          {/* Drop zone */}
          <Paper
            elevation={0}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              p: 4,
              mb: 2.5,
              borderRadius: 3,
              border: '2px dashed',
              borderColor: dragActive
                ? theme.palette.primary.main
                : alpha(theme.palette.text.primary, 0.15),
              bgcolor: dragActive
                ? alpha(theme.palette.primary.main, 0.06)
                : theme.palette.background.paper,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: theme.palette.primary.main,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
              },
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.tiff,.tif"
              onChange={(e) => handleFiles(e.target.files)}
              style={{ display: 'none' }}
            />
            <Box
              sx={{
                width: 56,
                height: 56,
                mx: 'auto',
                mb: 1.5,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconUpload size={28} color={theme.palette.primary.main} />
            </Box>
            <Typography variant="body1" fontWeight={600}>
              Drag and drop images here
            </Typography>
            <Typography variant="caption" color="text.secondary">
              or click the button below to browse
            </Typography>
          </Paper>

          {/* Choose Files button */}
          <Button
            variant="outlined"
            fullWidth
            startIcon={<IconFile size={18} />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ mb: 2.5, fontWeight: 600 }}
          >
            Choose Files
          </Button>

          {/* Upload Directory */}
          <Paper
            variant="outlined"
            sx={{
              px: 2,
              py: 1.5,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: theme.palette.background.paper,
            }}
          >
            <IconFolder size={16} color={theme.palette.text.secondary} />
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              Upload Directory:
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontFamily: 'monospace', color: theme.palette.text.primary }}
            >
              {uploadDir}
            </Typography>
          </Paper>

          {/* Advanced Options */}
          <Box
            onClick={() => setShowAdvanced(!showAdvanced)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              mb: 1,
              py: 1,
            }}
          >
            {showAdvanced ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            <Typography variant="body2" fontWeight={600} sx={{ ml: 0.5 }}>
              Advanced Options
            </Typography>
          </Box>
          <Collapse in={showAdvanced}>
            <Paper
              variant="outlined"
              sx={{ p: 2, mb: 2, bgcolor: theme.palette.background.paper }}
            >
              <Typography variant="caption" color="text.secondary">
                OCR Engine: Google Vision · DPI: 300 · Language: Auto-detect
              </Typography>
            </Paper>
          </Collapse>

          {/* Queue */}
          {queue.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Upload Queue ({queue.length})
                </Typography>
                {queue.some((f) => f.jobId) && (
                  <Stack direction="row" spacing={0.5}>
                    {(() => {
                      const counts = {
                        queued: queue.filter((f) => f.status === 'queued').length,
                        processing: queue.filter((f) => f.status === 'processing').length,
                        completed: queue.filter((f) => f.status === 'completed').length,
                        failed: queue.filter((f) => f.status === 'failed' || f.status === 'error').length,
                      };
                      return (
                        <>
                          {counts.queued > 0 && (
                            <Chip size="small" label={`${counts.queued} queued`} sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }} />
                          )}
                          {counts.processing > 0 && (
                            <Chip size="small" label={`${counts.processing} processing`} sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main }} />
                          )}
                          {counts.completed > 0 && (
                            <Chip size="small" label={`${counts.completed} done`} sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }} />
                          )}
                          {counts.failed > 0 && (
                            <Chip size="small" label={`${counts.failed} failed`} sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }} />
                          )}
                        </>
                      );
                    })()}
                  </Stack>
                )}
              </Stack>
              <Stack spacing={1}>
                {queue.map((f) => (
                  <Paper
                    key={f.id}
                    variant="outlined"
                    sx={{
                      px: 2,
                      py: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      bgcolor: theme.palette.background.paper,
                    }}
                  >
                    <IconPhoto size={18} color={theme.palette.text.secondary} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap fontWeight={500}>
                        {f.name}
                      </Typography>
                      {f.status === 'uploading' && (
                        <LinearProgress
                          variant="determinate"
                          value={f.progress}
                          sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                        />
                      )}
                      {f.status === 'processing' && (
                        <LinearProgress
                          variant="indeterminate"
                          sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                        />
                      )}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color:
                          f.status === 'completed'
                            ? theme.palette.success.main
                            : f.status === 'error' || f.status === 'failed'
                            ? theme.palette.error.main
                            : f.status === 'processing'
                            ? theme.palette.warning.main
                            : f.status === 'queued'
                            ? theme.palette.info.main
                            : theme.palette.text.secondary,
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      {f.status === 'completed'
                        ? 'Completed'
                        : f.status === 'failed'
                        ? 'Failed'
                        : f.status === 'error'
                        ? f.error || 'Error'
                        : f.status === 'processing'
                        ? 'Processing\u2026'
                        : f.status === 'queued'
                        ? 'Queued'
                        : f.status === 'uploading'
                        ? `${f.progress}%`
                        : 'Pending'}
                    </Typography>
                    {f.status === 'pending' && (
                      <IconButton size="small" onClick={() => removeFile(f.id)}>
                        <IconX size={16} />
                      </IconButton>
                    )}
                    {(f.status === 'failed' || f.status === 'error') && f.jobId && (
                      <IconButton size="small" onClick={() => retryJob(f.id, f.jobId!)} title="Retry">
                        <IconRefresh size={16} />
                      </IconButton>
                    )}
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </Box>

        {/* Drawer footer */}
        <Box
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid',
            borderColor: theme.palette.divider,
            display: 'flex',
            gap: 1.5,
          }}
        >
          {/* Processing banner */}
          {hasAnyProcessing && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderRadius: 1, bgcolor: alpha(theme.palette.warning.main, 0.08), flex: '0 0 100%', mb: 1 }}>
              <IconLoader2 size={16} color={theme.palette.warning.main} style={{ animation: 'spin 1s linear infinite' }} />
              <Typography variant="caption" color="warning.main" fontWeight={600}>Processing\u2026</Typography>
            </Box>
          )}
          {/* Summary toast */}
          {allDone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderRadius: 1, bgcolor: alpha(failedCount > 0 ? theme.palette.error.main : theme.palette.success.main, 0.08), flex: '0 0 100%', mb: 1 }}>
              {failedCount > 0 ? <IconAlertCircle size={16} color={theme.palette.error.main} /> : <IconCheck size={16} color={theme.palette.success.main} />}
              <Typography variant="caption" fontWeight={600} color={failedCount > 0 ? 'error.main' : 'success.main'}>
                {completedCount > 0 && `${completedCount} page${completedCount !== 1 ? 's' : ''} processed`}
                {completedCount > 0 && failedCount > 0 && ' \u2022 '}
                {failedCount > 0 && `${failedCount} failed \u2014 retry available`}
              </Typography>
            </Box>
          )}
          <Button
            variant="contained"
            fullWidth
            disabled={queue.filter((f) => f.status === 'pending').length === 0 || isUploading || hasAnyProcessing || !churchId}
            onClick={startUpload}
            sx={{
              fontWeight: 700,
              py: 1.2,
              bgcolor: theme.palette.primary.main,
              '&:hover': { bgcolor: theme.palette.primary.dark },
            }}
          >
            {isUploading ? 'Uploading\u2026' : 'Start Upload'}
          </Button>
          <Button variant="text" onClick={onClose} disabled={hasAnyProcessing} sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {hasAnyProcessing ? 'Processing\u2026' : 'Close'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default OcrUploadDrawer;
