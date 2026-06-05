/**
 * OcrReviewPage — Agent confirm & seed flow (replaces Workbench).
 * Routes: /devel/ocr-studio/review/:churchId
 *         /devel/ocr-studio/review/:churchId/:jobId
 *         /portal/ocr/review/:churchId/:jobId
 */

import { useAuth } from '@/context/AuthContext';
import { RECORD_FIELDS } from '@/features/devel-tools/om-ocr/config/recordFields';
import { apiClient } from '@/shared/lib/axiosInstance';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  List,
  MenuItem,
  Select,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { IconArrowLeft, IconCheck, IconDatabase, IconRefresh, IconRobot } from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

type PipelineStatus =
  | 'uploaded' | 'ocr_complete' | 'agent_extracted' | 'ready_to_seed' | 'seeded' | 'returned' | string;

interface OcrJobRow {
  id: string;
  filename: string;
  status: string;
  review_status: PipelineStatus;
  record_type: string | null;
  agent_status: string | null;
  ready_to_seed: boolean;
  seeded_at: string | null;
  has_ocr_text: boolean;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'info' }> = {
  uploaded: { label: 'Uploaded', color: 'default' },
  ocr_complete: { label: 'OCR Done', color: 'info' },
  agent_extracted: { label: 'Review Fields', color: 'warning' },
  ready_to_seed: { label: 'Ready to Seed', color: 'primary' },
  seeded: { label: 'In Records DB', color: 'success' },
  returned: { label: 'Returned', color: 'default' },
};

const OcrReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPortal = location.pathname.startsWith('/portal');
  const { churchId: churchIdParam, jobId: jobIdParam } = useParams<{ churchId: string; jobId: string }>();
  const { user } = useAuth();

  const churchId = useMemo(() => {
    if (churchIdParam) return Number(churchIdParam);
    return user?.church_id ? Number(user.church_id) : null;
  }, [churchIdParam, user?.church_id]);

  const selectedJobId = jobIdParam ? Number(jobIdParam) : null;

  const [jobs, setJobs] = useState<OcrJobRow[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [extractLoading, setExtractLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordType, setRecordType] = useState<string>('baptism');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<PipelineStatus>('uploaded');
  const [extractMethod, setExtractMethod] = useState<string | null>(null);
  const [allRecords, setAllRecords] = useState<Array<Record<string, string>>>([]);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState(0);
  const [needsReviewFlag, setNeedsReviewFlag] = useState(false);
  const [refinementNotes, setRefinementNotes] = useState<string | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const backPath = isPortal ? '/portal/upload' : '/devel/ocr-studio/upload';
  const reviewBase = churchId
    ? (isPortal ? `/portal/ocr/review/${churchId}` : `/devel/ocr-studio/review/${churchId}`)
    : backPath;

  const fieldDefs = RECORD_FIELDS[recordType] || RECORD_FIELDS.baptism;

  const selectedJob = useMemo(
    () => jobs.find((j) => Number(j.id) === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );

  const jobImageUrl = useMemo(() => {
    if (!churchId || !selectedJobId) return null;
    return `/api/church/${churchId}/ocr/jobs/${selectedJobId}/image?original=true`;
  }, [churchId, selectedJobId]);

  const loadJobs = useCallback(async () => {
    if (!churchId) return;
    setJobsLoading(true);
    try {
      const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs?limit=100`);
      const list: OcrJobRow[] = res?.data?.jobs || res?.jobs || [];
      setJobs(list.filter((j) => j.review_status !== 'seeded' || j.id === String(selectedJobId)));
    } catch {
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, [churchId, selectedJobId]);

  const loadExtract = useCallback(async (jobId: number) => {
    if (!churchId) return;
    setExtractLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs/${jobId}/agent-extract`);
      const data = res?.data ?? res;
      setReviewStatus(data.review_status || 'uploaded');
      setOcrPreview(data.ocr_text_preview || null);

      const extract = data.extract;
      const rt = extract?.record_type || 'baptism';
      if (rt && rt !== 'custom') setRecordType(rt);

      const records: Array<Record<string, string>> = Array.isArray(extract?.records) && extract.records.length
        ? extract.records
        : extract?.fields
          ? [extract.fields]
          : [];
      const idx = typeof extract?.candidate_index === 'number' ? extract.candidate_index : 0;
      setAllRecords(records);
      setSelectedRecordIndex(Math.min(idx, Math.max(records.length - 1, 0)));
      setExtractMethod(extract?.method || null);
      setNeedsReviewFlag(!!extract?.needs_review);
      setRefinementNotes(extract?.refinement_notes || null);
      setFields({ ...(records[idx] || extract?.fields || {}) });
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load extraction');
      setFields({});
    } finally {
      setExtractLoading(false);
    }
  }, [churchId]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  useEffect(() => {
    if (churchId && selectedJobId) loadExtract(selectedJobId);
  }, [churchId, selectedJobId, loadExtract]);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [selectedJobId, jobImageUrl]);

  const runAgentExtract = async () => {
    if (!churchId || !selectedJobId) return;
    setExtractLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.post(`/api/church/${churchId}/ocr/jobs/${selectedJobId}/agent-extract`);
      const extract = res?.data?.extract ?? res?.extract;
      if (extract?.record_type && extract.record_type !== 'custom') setRecordType(extract.record_type);
      const records: Array<Record<string, string>> = Array.isArray(extract?.records) && extract.records.length
        ? extract.records
        : extract?.fields ? [extract.fields] : [];
      const idx = typeof extract?.candidate_index === 'number' ? extract.candidate_index : 0;
      setAllRecords(records);
      setSelectedRecordIndex(Math.min(idx, Math.max(records.length - 1, 0)));
      setExtractMethod(extract?.method || null);
      setNeedsReviewFlag(!!extract?.needs_review);
      setRefinementNotes(extract?.refinement_notes || null);
      setFields({ ...(records[idx] || extract?.fields || {}) });
      setReviewStatus('agent_extracted');
      await loadJobs();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Agent extraction failed');
    } finally {
      setExtractLoading(false);
    }
  };

  const confirmFields = async () => {
    if (!churchId || !selectedJobId) return;
    setConfirmLoading(true);
    setError(null);
    try {
      await apiClient.post(`/api/church/${churchId}/ocr/jobs/${selectedJobId}/confirm-extract`, {
        record_type: recordType,
        fields,
      });
      setReviewStatus('ready_to_seed');
      await loadJobs();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Confirm failed');
    } finally {
      setConfirmLoading(false);
    }
  };

  const seedRecords = async () => {
    if (!churchId || !selectedJobId) return;
    setSeedLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.post(`/api/church/${churchId}/ocr/jobs/${selectedJobId}/seed`);
      setReviewStatus('seeded');
      const created = res?.data?.created_records ?? res?.created_records ?? [];
      alert(`Seeded ${created.length} record(s) into ${recordType} table.`);
      await loadJobs();
      navigate(reviewBase);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Seed failed');
    } finally {
      setSeedLoading(false);
    }
  };

  if (!churchId) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>Missing church ID</Typography>
        <Button component={Link} to={backPath} startIcon={<IconArrowLeft size={18} />}>Back to Upload</Button>
      </Box>
    );
  }

  const statusCfg = STATUS_LABELS[reviewStatus] || { label: reviewStatus, color: 'default' as const };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button component={Link} to={backPath} startIcon={<IconArrowLeft size={16} />} size="small" sx={{ textTransform: 'none' }}>
          Upload
        </Button>
        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>Confirm & Seed</Typography>
        <Button size="small" startIcon={<IconRefresh size={16} />} onClick={loadJobs} disabled={jobsLoading}>Refresh</Button>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Job queue */}
        <Box
          sx={{
            width: { xs: '100%', md: '33.333%' },
            minWidth: { md: 280 },
            maxWidth: { md: 400 },
            maxHeight: { xs: '40vh', md: 'none' },
            flexShrink: 0,
            borderRight: { md: '1px solid' },
            borderBottom: { xs: '1px solid', md: 'none' },
            borderColor: 'divider',
            overflow: 'auto',
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Jobs awaiting review</Typography>
            {jobsLoading && <CircularProgress size={24} />}
            {!jobsLoading && jobs.length === 0 && (
              <Alert severity="info">No jobs in the pipeline. Upload images first.</Alert>
            )}
            <List dense disablePadding>
              {jobs.map((j) => {
                const cfg = STATUS_LABELS[j.review_status] || { label: j.review_status, color: 'default' as const };
                const active = selectedJobId === Number(j.id);
                return (
                  <ListItemButton
                    key={j.id}
                    selected={active}
                    onClick={() => navigate(`${reviewBase}/${j.id}`)}
                    sx={{ borderRadius: 1, mb: 0.5 }}
                  >
                    <ListItemText
                      primary={j.filename || `Job #${j.id}`}
                      secondary={new Date(j.created_at).toLocaleString()}
                      primaryTypographyProps={{ noWrap: true, fontSize: '0.85rem', fontWeight: active ? 700 : 500 }}
                    />
                    <Chip label={cfg.label} size="small" color={cfg.color} variant="outlined" />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        </Box>

        {/* Confirm panel + source image */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, overflow: 'hidden' }}>
          <Box sx={{ flex: 1, minWidth: 0, overflow: 'auto', p: 2 }}>
          {!selectedJobId ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Typography color="text.secondary">Select a job from the queue to review extracted fields.</Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="h6" fontWeight={700}>Job #{selectedJobId}</Typography>
                <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
                <Chip label={recordType} size="small" variant="outlined" />
                {extractMethod && (
                  <Chip
                    label={extractMethod === 'assembler' ? 'Table assembly' : extractMethod === 'llm' ? 'AI agent' : 'Heuristic'}
                    size="small"
                    color={extractMethod === 'assembler' ? 'success' : extractMethod === 'llm' ? 'primary' : 'default'}
                    variant="outlined"
                  />
                )}
              </Stack>

              {allRecords.length > 1 && (
                <FormControl size="small" sx={{ maxWidth: 360 }}>
                  <InputLabel>Record on this page</InputLabel>
                  <Select
                    label="Record on this page"
                    value={selectedRecordIndex}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      setSelectedRecordIndex(idx);
                      setFields({ ...(allRecords[idx] || {}) });
                    }}
                  >
                    {allRecords.map((rec, i) => (
                      <MenuItem key={i} value={i}>
                        #{rec.record_number || i + 1} — {rec.child_name || rec.groom_name || rec.deceased_name || `Record ${i + 1}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {needsReviewFlag && (
                <Alert severity="warning">
                  This record may need manual review — some key fields could not be confidently mapped from the ledger layout.
                </Alert>
              )}

              {extractMethod === 'heuristic' && (
                <Alert severity="info">
                  Field mapping used basic text patterns. Click <strong>Re-run Agent</strong> to retry structured assembly and AI cleanup.
                </Alert>
              )}

              {extractMethod === 'llm' && refinementNotes && (
                <Alert severity="success">
                  AI agent refinements: {refinementNotes}
                </Alert>
              )}

              {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

              {extractLoading ? (
                <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>
              ) : (
                <>
                  {ocrPreview && (
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">OCR TEXT PREVIEW</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                        {ocrPreview}
                      </Typography>
                    </Paper>
                  )}

                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <IconRobot size={16} />
                      <Typography variant="subtitle2" fontWeight={700}>
                        Agent-extracted fields — edit and confirm
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                        gap: 2,
                      }}
                    >
                      {fieldDefs.map((def) => (
                        <TextField
                          key={def.name}
                          fullWidth
                          size="small"
                          label={def.label}
                          required={def.required}
                          value={fields[def.name] || ''}
                          onChange={(e) => setFields((prev) => ({ ...prev, [def.name]: e.target.value }))}
                          multiline={def.type === 'textarea'}
                          minRows={def.type === 'textarea' ? 2 : 1}
                          sx={def.type === 'textarea' ? { gridColumn: { sm: '1 / -1' } } : undefined}
                        />
                      ))}
                    </Box>
                  </Paper>

                  <Divider />

                  <Stack direction="row" spacing={1.5} flexWrap="wrap">
                    <Button
                      variant="outlined"
                      startIcon={<IconRefresh size={18} />}
                      onClick={runAgentExtract}
                      disabled={extractLoading}
                    >
                      Re-run Agent
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<IconCheck size={18} />}
                      onClick={confirmFields}
                      disabled={confirmLoading || reviewStatus === 'seeded'}
                    >
                      {confirmLoading ? 'Confirming…' : 'Confirm Fields'}
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<IconDatabase size={18} />}
                      onClick={seedRecords}
                      disabled={seedLoading || reviewStatus !== 'ready_to_seed'}
                    >
                      {seedLoading ? 'Seeding…' : 'Seed to Records'}
                    </Button>
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                    Flow: Upload → OCR → Agent extract → Confirm → Seed → view in Records Management (AG Grid)
                  </Typography>
                </>
              )}
            </Stack>
          )}
          </Box>

          {selectedJobId && jobImageUrl && (
            <Box
              sx={{
                width: { xs: '100%', lg: '42%' },
                minWidth: { lg: 300 },
                maxWidth: { lg: 520 },
                flexShrink: 0,
                borderLeft: { lg: '1px solid' },
                borderTop: { xs: '1px solid', lg: 'none' },
                borderColor: 'divider',
                bgcolor: 'grey.50',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                <Typography variant="subtitle2" fontWeight={700}>Uploaded image</Typography>
                <Typography variant="caption" color="text.secondary" noWrap title={selectedJob?.filename}>
                  {selectedJob?.filename || `Job #${selectedJobId}`}
                </Typography>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                }}
              >
                {!imageLoadFailed ? (
                  <Box
                    component="img"
                    src={jobImageUrl}
                    alt={selectedJob?.filename || `OCR job ${selectedJobId}`}
                    onError={() => setImageLoadFailed(true)}
                    sx={{
                      maxWidth: '100%',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      display: 'block',
                      borderRadius: 1,
                      boxShadow: 1,
                      bgcolor: 'background.paper',
                    }}
                  />
                ) : (
                  <Alert severity="warning" sx={{ m: 1 }}>
                    Could not load the uploaded image for this job.
                  </Alert>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default OcrReviewPage;
