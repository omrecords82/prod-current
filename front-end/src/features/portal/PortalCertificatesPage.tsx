/**
 * PortalCertificatesPage — Template-based certificate generation for church staff
 *
 * Flow: Select record type → Pick record → Auto-resolve template → Preview → Generate PDF → Download
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Description as CertIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  CheckCircle as SuccessIcon,
  WaterDrop as BaptismIcon,
  Favorite as MarriageIcon,
  Church as ReceptionIcon,
  History as HistoryIcon,
  CloudUpload as UploadIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import { apiClient } from '@/api/utils/axiosInstance';
import { useLanguage } from '@/context/LanguageContext';

// ─── Types ───────────────────────────────────────────────────

interface RecordRow {
  id: number;
  first_name?: string;
  last_name?: string;
  fname_groom?: string;
  lname_groom?: string;
  fname_bride?: string;
  lname_bride?: string;
  name?: string;
  lastname?: string;
  reception_date?: string;
  mdate?: string;
  clergy?: string;
  entry_type?: string;
  [key: string]: any;
}

interface GeneratedCert {
  id: number;
  record_type: string;
  record_id: number;
  file_path: string;
  file_size: number;
  generated_at: string;
  status: string;
  version_label: string;
  template_name: string;
  jurisdiction_code: string;
}

interface TemplateInfo {
  templateId: number;
  templateType: string;
  groupName: string | null;
  jurisdictionCode: string | null;
  versionLabel: string | null;
  resolution: string;
  isChurchOverride: boolean;
  fieldCount: number;
  previewUrl: string;
  cacheBust: number;
}

// ─── Constants ───────────────────────────────────────────────

// Labels injected in component via t()
const RECORD_TYPE_DEFS = [
  { key: 'baptism', labelKey: 'portal.certs_type_baptism', descKey: 'portal.certs_desc_baptism', icon: <BaptismIcon sx={{ fontSize: 40 }} />, color: '#1976d2' },
  { key: 'marriage', labelKey: 'portal.certs_type_marriage', descKey: 'portal.certs_desc_marriage', icon: <MarriageIcon sx={{ fontSize: 40 }} />, color: '#7b1fa2' },
  { key: 'reception', labelKey: 'portal.certs_type_reception', descKey: 'portal.certs_desc_reception', icon: <ReceptionIcon sx={{ fontSize: 40 }} />, color: '#388e3c' },
];

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  try {
    const safeStr = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00` : d;
    return new Date(safeStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return d; }
}

function getRecordName(r: RecordRow, type: string) {
  if (type === 'marriage') return `${r.fname_groom || ''} ${r.lname_groom || ''} & ${r.fname_bride || ''} ${r.lname_bride || ''}`.trim();
  return `${r.first_name || r.name || ''} ${r.last_name || r.lastname || ''}`.trim() || `Record #${r.id}`;
}

function getRecordDate(r: RecordRow, type: string) {
  if (type === 'marriage') return r.mdate;
  return r.reception_date;
}

function formatBytes(bytes: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// ─── Component ───────────────────────────────────────────────

const PortalCertificatesPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const RECORD_TYPES = RECORD_TYPE_DEFS.map(rt => ({
    ...rt,
    label: t(rt.labelKey),
    desc: t(rt.descKey),
  }));

  // State
  const [step, setStep] = useState<'type' | 'record' | 'confirm'>('type');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordRow | null>(null);

  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<any>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<GeneratedCert[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Per-type template (shown above the record list)
  const [templateInfo, setTemplateInfo] = useState<TemplateInfo | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // ─── Load records ──────────────────────────────────────────

  const loadRecords = useCallback(async (type: string) => {
    setRecordsLoading(true);
    try {
      const tableMap: Record<string, string> = { baptism: 'baptism', marriage: 'marriage', reception: 'baptism' };
      const recordType = tableMap[type] || type;
      const res = await apiClient.get(`/church/records/${recordType}`, { params: { limit: 100 } });
      let rows = res?.records || res?.rows || [];
      // For reception, filter to reception entry_types
      if (type === 'reception') {
        rows = rows.filter((r: RecordRow) => r.entry_type && r.entry_type.toLowerCase() !== 'baptism');
      }
      setRecords(rows);
    } catch {
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await apiClient.get('/certificate-templates/generated/list', { params: { limit: 50 } });
      setHistory(res?.certificates || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadTemplateInfo = useCallback(async (type: string) => {
    setTemplateLoading(true);
    setTemplateError(null);
    setTemplateInfo(null);
    try {
      const res = await apiClient.get(`/certificate-templates/by-type/${encodeURIComponent(type)}`);
      if (res?.success && res.template) {
        setTemplateInfo({
          templateId: res.template.id,
          templateType: res.template.templateType,
          groupName: res.template.groupName,
          jurisdictionCode: res.template.jurisdictionCode,
          versionLabel: res.template.versionLabel,
          resolution: res.resolution || 'system_default',
          isChurchOverride: !!res.template.churchId,
          fieldCount: res.fieldCount || 0,
          previewUrl: res.previewUrl,
          cacheBust: Date.now(),
        });
      } else {
        setTemplateError(res?.error || 'No template registered for this type');
      }
    } catch (err: any) {
      setTemplateError(err?.response?.data?.error || err?.message || 'Failed to load template');
    } finally {
      setTemplateLoading(false);
    }
  }, []);

  const handleUploadChoose = () => {
    setUploadError(null);
    setUploadSuccess(null);
    fileInputRef.current?.click();
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedType) return;
    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Please choose a PDF file.');
      e.target.value = '';
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiClient.post(
        `/certificate-templates/by-type/${encodeURIComponent(selectedType)}/upload`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      if (res?.success) {
        setUploadSuccess(res.action === 'created' ? 'Custom template uploaded' : 'Custom template replaced');
        // Reload template info so the preview swaps to the new file.
        await loadTemplateInfo(selectedType);
      } else {
        setUploadError(res?.error || 'Upload failed');
      }
    } catch (err: any) {
      setUploadError(err?.response?.data?.error || err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // ─── Select type ───────────────────────────────────────────

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    setSelectedRecord(null);
    setGenResult(null);
    setGenError(null);
    setUploadError(null);
    setUploadSuccess(null);
    setStep('record');
    loadRecords(type);
    loadTemplateInfo(type);
  };

  const handleSelectRecord = (record: RecordRow) => {
    setSelectedRecord(record);
    setStep('confirm');
  };

  const handleBack = () => {
    if (step === 'confirm') { setStep('record'); setGenResult(null); setGenError(null); }
    else if (step === 'record') { setStep('type'); setSelectedType(null); }
    else navigate('/portal');
  };

  // ─── Generate ──────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!selectedType || !selectedRecord) return;
    setGenerating(true);
    setGenError(null);
    setGenResult(null);
    try {
      const res = await apiClient.post('/certificate-templates/generate', {
        churchId: selectedRecord.church_id || undefined,
        recordType: selectedType === 'reception' ? 'baptism' : selectedType,
        recordId: selectedRecord.id,
        templateType: undefined, // let backend auto-resolve
      });
      setGenResult(res);
    } catch (err: any) {
      setGenError(err?.response?.data?.error || err?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (certId: number) => {
    window.open(`/api/certificate-templates/generate/${certId}/download`, '_blank');
  };

  // ─── Render: Type Selection ────────────────────────────────

  const renderTypeSelection = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>{t('portal.certs_select_type')}</Typography>
      <Grid container spacing={3}>
        {RECORD_TYPES.map((rt) => (
          <Grid item xs={12} sm={6} md={4} key={rt.key}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                transition: 'all 0.2s',
                '&:hover': { borderColor: rt.color, boxShadow: `0 0 0 1px ${rt.color}` },
              }}
            >
              <CardActionArea onClick={() => handleSelectType(rt.key)} sx={{ p: 3, textAlign: 'center' }}>
                <Box sx={{ color: rt.color, mb: 1.5 }}>{rt.icon}</Box>
                <Typography variant="h6" fontWeight={600}>{rt.label}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{rt.desc}</Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // ─── Render: Record Selection ──────────────────────────────

  const renderTemplateSection = () => {
    const typeLabel = RECORD_TYPES.find(rt => rt.key === selectedType)?.label || selectedType || '';
    return (
      <Card variant="outlined" sx={{ mb: 3, borderColor: alpha(theme.palette.primary.main, 0.25) }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
            {/* Left: metadata + actions */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <PreviewIcon fontSize="small" color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Current {typeLabel} Certificate Template
                </Typography>
              </Stack>

              {templateLoading ? (
                <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box>
              ) : templateError ? (
                <Alert severity="warning" sx={{ mb: 1 }}>{templateError}</Alert>
              ) : templateInfo ? (
                <>
                  <Stack spacing={0.5} sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Template:</strong> {templateInfo.groupName || '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Jurisdiction:</strong> {templateInfo.jurisdictionCode || '—'}
                      {templateInfo.versionLabel ? ` · v${templateInfo.versionLabel}` : ''}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      <Chip
                        size="small"
                        label={templateInfo.isChurchOverride ? 'Custom (this parish)' : 'System default'}
                        color={templateInfo.isChurchOverride ? 'primary' : 'default'}
                      />
                      <Chip size="small" label={`${templateInfo.fieldCount} fields`} variant="outlined" />
                    </Stack>
                  </Stack>
                </>
              ) : null}

              {uploadError && <Alert severity="error" sx={{ mb: 1 }}>{uploadError}</Alert>}
              {uploadSuccess && <Alert severity="success" sx={{ mb: 1 }}>{uploadSuccess}</Alert>}

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />}
                  onClick={handleUploadChoose}
                  disabled={uploading || !selectedType}
                >
                  {uploading ? 'Uploading…' : (templateInfo?.isChurchOverride ? 'Replace Custom Template' : 'Upload Custom Template')}
                </Button>
                {templateInfo && (
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<DownloadIcon />}
                    href={templateInfo.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in new tab
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  hidden
                  onChange={handleUploadFile}
                />
              </Stack>
            </Box>

            {/* Right: PDF preview */}
            <Box sx={{ flex: 1, minWidth: 0, minHeight: 320 }}>
              {templateInfo ? (
                <Box
                  component="iframe"
                  // cacheBust forces re-fetch after upload
                  src={`${templateInfo.previewUrl}?v=${templateInfo.cacheBust}`}
                  title={`${typeLabel} certificate template preview`}
                  sx={{
                    width: '100%',
                    height: 360,
                    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                    borderRadius: 1,
                    backgroundColor: theme.palette.background.default,
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: '100%',
                    height: 360,
                    border: `1px dashed ${alpha(theme.palette.divider, 0.8)}`,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  {templateLoading ? <CircularProgress size={20} /> : 'No preview available'}
                </Box>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  const renderRecordSelection = () => (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={handleBack}><BackIcon /></IconButton>
        <Typography variant="h6">
          {t('portal.certs_select_record').replace('{type}', RECORD_TYPES.find(rt => rt.key === selectedType)?.label || '')}
        </Typography>
        <Chip label={t('portal.certs_records_count').replace('{count}', String(records.length))} size="small" />
      </Stack>

      {renderTemplateSection()}

      {recordsLoading ? (
        <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
      ) : !records.length ? (
        <Alert severity="info">{t('portal.certs_no_records').replace('{type}', selectedType || '')}</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('portal.certs_col_name')}</TableCell>
                <TableCell>{t('portal.certs_col_date')}</TableCell>
                <TableCell>{t('portal.certs_col_clergy')}</TableCell>
                {selectedType === 'reception' && <TableCell>{t('portal.certs_col_entry_type')}</TableCell>}
                <TableCell align="right">{t('portal.certs_col_action')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleSelectRecord(r)}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {getRecordName(r, selectedType!)}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(getRecordDate(r, selectedType!))}</TableCell>
                  <TableCell>{r.clergy || '—'}</TableCell>
                  {selectedType === 'reception' && <TableCell><Chip label={r.entry_type} size="small" /></TableCell>}
                  <TableCell align="right">
                    <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); handleSelectRecord(r); }}>
                      {t('common.select')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  // ─── Render: Confirm & Generate ────────────────────────────

  const renderConfirm = () => {
    const typeInfo = RECORD_TYPES.find(t => t.key === selectedType);

    return (
      <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <IconButton onClick={handleBack}><BackIcon /></IconButton>
          <Typography variant="h6">{t('portal.certs_generate_title')}</Typography>
        </Stack>

        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">{t('portal.certs_label_cert_type')}</Typography>
                <Typography variant="body1" fontWeight={600}>
                  {t('portal.certs_cert_suffix').replace('{type}', typeInfo?.label || '')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">{t('portal.certs_label_record')}</Typography>
                <Typography variant="body1" fontWeight={600}>
                  {getRecordName(selectedRecord!, selectedType!)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">{t('portal.certs_label_date')}</Typography>
                <Typography variant="body1">
                  {formatDate(getRecordDate(selectedRecord!, selectedType!))}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">{t('portal.certs_label_clergy')}</Typography>
                <Typography variant="body1">{selectedRecord?.clergy || '—'}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {genError && <Alert severity="error" sx={{ mb: 2 }}>{genError}</Alert>}

        {genResult ? (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownload(genResult.certificateId)}
              >
                {t('common.download_pdf')}
              </Button>
            }
          >
            Certificate generated successfully using template: {genResult.templateUsed} ({genResult.resolution?.replace('_', ' ')})
          </Alert>
        ) : (
          <Button
            variant="contained"
            size="large"
            startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <CertIcon />}
            onClick={handleGenerate}
            disabled={generating}
            sx={{ minWidth: 200 }}
          >
            {generating ? t('common.generating') : t('portal.certs_generate_btn')}
          </Button>
        )}
      </Box>
    );
  };

  // ─── Render: History Dialog ────────────────────────────────

  const renderHistoryDialog = () => (
    <Dialog open={showHistory} onClose={() => setShowHistory(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{t('portal.certs_history_title')}</Typography>
          <IconButton onClick={loadHistory} disabled={historyLoading}><RefreshIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {historyLoading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : !history.length ? (
          <Alert severity="info">{t('portal.certs_history_none')}</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Record</TableCell>
                  <TableCell>Template</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id} hover>
                    <TableCell><Chip label={h.record_type} size="small" /></TableCell>
                    <TableCell>#{h.record_id}</TableCell>
                    <TableCell>{h.template_name}</TableCell>
                    <TableCell>{formatBytes(h.file_size)}</TableCell>
                    <TableCell>{formatDate(h.generated_at)}</TableCell>
                    <TableCell>
                      <Chip
                        label={h.status}
                        size="small"
                        color={h.status === 'generated' ? 'success' : h.status === 'downloaded' ? 'info' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleDownload(h.id)}>
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowHistory(false)}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );

  // ─── Main ──────────────────────────────────────────────────

  return (
    <PageContainer title={t('portal.certs_page_title')} description={t('portal.certs_page_desc')}>
      <Breadcrumb
        title={t('portal.certs_breadcrumb_certs')}
        items={[
          { title: t('portal.certs_breadcrumb_portal'), to: '/portal' },
          { title: t('portal.certs_breadcrumb_certs') },
        ]}
      />

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h5">{t('portal.certs_generator_title')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('portal.certs_generator_desc')}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => { setShowHistory(true); loadHistory(); }}
          >
            {t('common.history')}
          </Button>
        </Stack>

        <Divider sx={{ mb: 3 }} />

        {step === 'type' && renderTypeSelection()}
        {step === 'record' && renderRecordSelection()}
        {step === 'confirm' && renderConfirm()}
      </Paper>

      {renderHistoryDialog()}
    </PageContainer>
  );
};

export default PortalCertificatesPage;
