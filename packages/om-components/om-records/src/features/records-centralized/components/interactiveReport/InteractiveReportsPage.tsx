/**
 * InteractiveReportsPage.tsx — Landing page for Interactive Reports
 *
 * Located at /apps/records/interactive-reports
 *
 * Interactive Reports let priests/admins delegate record collection to recipients
 * (e.g., godparents, family members) via secure token links. Recipients fill in
 * sacramental record fields, which come back as "patches" for the priest to
 * review, accept, or reject.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/api/utils/axiosInstance';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import { useChurch } from '@/context/ChurchContext';
import {
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as BackIcon,
  Assignment as ReportIcon,
  CheckCircle as AcceptedIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  HourglassEmpty as PendingIcon,
  Cancel as RejectedIcon,
  OpenInNew as OpenIcon,
  Refresh as RefreshIcon,
  Send as SentIcon,
  Work as JobsIcon,
} from '@mui/icons-material';

interface Report {
  id: string;
  church_id: number;
  record_type: string;
  created_by_user_id: number;
  title: string;
  status: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  created_by_email?: string;
  recipient_count?: number;
  submitted_count?: number;
  patch_pending?: number;
  patch_accepted?: number;
  patch_rejected?: number;
}

const BCrumb = [
  { to: '/', title: 'Home' },
  { to: '/apps/records', title: 'Records' },
  { title: 'Interactive Reports' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#757575' },
  sent: { label: 'Sent', color: '#1976d2' },
  active: { label: 'Active', color: '#2e7d32' },
  expired: { label: 'Expired', color: '#e65100' },
  closed: { label: 'Closed', color: '#c62828' },
  revoked: { label: 'Revoked', color: '#c62828' },
};

const RECORD_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  baptism: { label: 'Baptism', color: '#1565c0' },
  marriage: { label: 'Marriage', color: '#7b1fa2' },
  funeral: { label: 'Funeral', color: '#455a64' },
};

const InteractiveReportsPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const { activeChurchId } = useChurch();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    recordType: 'baptism' as string,
    recipientEmail: '',
    expiresDays: 30,
  });

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [deleting, setDeleting] = useState(false);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
  });

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<any>('/records/interactive-reports/list');
      setReports(data.reports || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Create ──────────────────────────────────────────────

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.recipientEmail.trim()) return;
    setCreating(true);
    try {
      // We need a churchId — get from ChurchContext
      const churchId = activeChurchId;
      if (!churchId) {
        setError('No church associated with your account. Cannot create report.');
        setCreating(false);
        return;
      }

      // Fetch records to assign — get first 10 records for this type
      let recordIds: number[] = [];
      try {
        const recsData = await apiClient.get<any>(`/church-records/${createForm.recordType}?limit=10`);
        const records = recsData.data?.records || recsData.records || recsData.data || [];
        recordIds = Array.isArray(records) ? records.slice(0, 10).map((r: any) => r.id) : [];
      } catch {
        // If records fetch fails, recordIds stays empty
      }

      if (recordIds.length === 0) {
        setError(`No ${createForm.recordType} records found in your church. Add records first.`);
        setCreating(false);
        return;
      }

      // Get default allowed fields for this record type
      const defaultFields: Record<string, string[]> = {
        baptism: ['first_name', 'last_name', 'birth_date', 'reception_date', 'birthplace', 'sponsors', 'parents'],
        marriage: ['groom_name', 'bride_name', 'marriage_date', 'church_name', 'witnesses'],
        funeral: ['first_name', 'last_name', 'death_date', 'burial_date', 'cemetery'],
      };

      await apiClient.post<any>('/records/interactive-reports', {
        churchId,
        recordType: createForm.recordType,
        title: createForm.title.trim(),
        filters: {},
        allowedFields: defaultFields[createForm.recordType] || ['first_name', 'last_name'],
        recipients: [
          {
            email: createForm.recipientEmail.trim(),
            recordIds,
          },
        ],
        expiresDays: createForm.expiresDays,
      });

      setCreateOpen(false);
      setCreateForm({ title: '', recordType: 'baptism', recipientEmail: '', expiresDays: 30 });
      fetchReports();
    } catch (err: any) {
      setError(err.message || 'Failed to create report');
    } finally {
      setCreating(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete<any>(`/records/interactive-reports/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchReports();
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <PageContainer title="Interactive Reports" description="Delegate record collection to recipients via secure links">
      <Breadcrumb title="Interactive Reports" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>

        {/* ── Header ──────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton
            onClick={() => navigate('/apps/records')}
            sx={{ bgcolor: alpha('#1565c0', 0.08), color: '#1565c0' }}
          >
            <BackIcon />
          </IconButton>
          <Box sx={{
            width: 56, height: 56,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 2,
            bgcolor: alpha('#1565c0', isDark ? 0.15 : 0.08),
            color: '#1565c0',
            flexShrink: 0,
          }}>
            <ReportIcon sx={{ fontSize: 36 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={700}>Interactive Reports</Typography>
            <Typography variant="body2" color="text.secondary">
              Delegate sacramental record collection to recipients via secure token links
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{ textTransform: 'none', bgcolor: '#1565c0' }}
          >
            New Report
          </Button>
          <Tooltip title="Background jobs">
            <IconButton
              onClick={() => navigate('/devel-tools/interactive-reports/jobs')}
              sx={{ bgcolor: alpha('#7b1fa2', 0.08), color: '#7b1fa2' }}
            >
              <JobsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchReports} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
        </Box>

        {/* ── How it works ────────────────────────────────── */}
        <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>How It Works</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
            {[
              { step: '1', title: 'Create Report', desc: 'Pick a record type, add a title and recipient email. Records from your church are auto-assigned.' },
              { step: '2', title: 'Recipient Gets Link', desc: 'An email with a secure token link is sent. No login required — the link is the access key.' },
              { step: '3', title: 'Data Submitted', desc: 'The recipient fills in the allowed fields and submits. Their changes appear as patches.' },
              { step: '4', title: 'Review & Accept', desc: 'Review each patch, accept or reject. Accepted data is written directly to your church records.' },
            ].map(s => (
              <Box key={s.step} sx={{ display: 'flex', gap: 1.5 }}>
                <Box sx={{
                  width: 28, height: 28, borderRadius: '50%',
                  bgcolor: alpha('#1565c0', 0.12), color: '#1565c0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.8rem', flexShrink: 0, mt: 0.25,
                }}>
                  {s.step}
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{s.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>{s.desc}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* ── Error ───────────────────────────────────────── */}
        {error && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: alpha('#c62828', 0.05), border: '1px solid', borderColor: alpha('#c62828', 0.2), borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography color="error" variant="body2">{error}</Typography>
            <IconButton size="small" onClick={() => setError(null)}><CloseIcon fontSize="small" /></IconButton>
          </Paper>
        )}

        {/* ── Loading ─────────────────────────────────────── */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        )}

        {/* ── Empty state ─────────────────────────────────── */}
        {!loading && !error && reports.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }} variant="outlined">
            <ReportIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>No interactive reports yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create your first interactive report to delegate record collection.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ textTransform: 'none', bgcolor: '#1565c0' }}>
              New Report
            </Button>
          </Paper>
        )}

        {/* ── Reports list ────────────────────────────────── */}
        {!loading && reports.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            {reports.map(report => {
              const stCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.draft;
              const rtCfg = RECORD_TYPE_CONFIG[report.record_type] || { label: report.record_type, color: '#757575' };
              const expired = report.expires_at && isExpired(report.expires_at);

              return (
                <Paper
                  key={report.id}
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderLeft: `3px solid ${rtCfg.color}`,
                    transition: 'all 0.15s ease',
                    '&:hover': { bgcolor: alpha(rtCfg.color, 0.03), borderColor: rtCfg.color },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography
                      variant="body1"
                      fontWeight={600}
                      sx={{ flex: 1, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                      onClick={() => navigate(`/apps/records/interactive-reports/${report.id}`)}
                    >
                      {report.title}
                      <OpenIcon sx={{ fontSize: 12, color: 'text.disabled', ml: 0.5, verticalAlign: 'middle' }} />
                    </Typography>
                    <Tooltip title="Delete report">
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(report); }}
                        sx={{ color: '#c62828', opacity: 0.6, '&:hover': { opacity: 1 } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
                    <Chip label={rtCfg.label} size="small" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600, bgcolor: alpha(rtCfg.color, 0.12), color: rtCfg.color }} />
                    <Chip
                      label={expired ? 'Expired' : stCfg.label}
                      size="small"
                      sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600, bgcolor: alpha(expired ? '#e65100' : stCfg.color, 0.12), color: expired ? '#e65100' : stCfg.color }}
                    />
                    {report.recipient_count != null && (
                      <Chip
                        icon={<SentIcon sx={{ fontSize: '12px !important' }} />}
                        label={`${report.recipient_count} recipient${report.recipient_count !== 1 ? 's' : ''}`}
                        size="small" variant="outlined"
                        sx={{ height: 20, fontSize: '0.68rem', borderColor: isDark ? '#555' : '#ccc' }}
                      />
                    )}
                  </Box>

                  {(report.patch_pending > 0 || report.patch_accepted > 0 || report.patch_rejected > 0) && (
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
                      {report.patch_pending > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PendingIcon sx={{ fontSize: 14, color: '#e65100' }} />
                          <Typography variant="caption" sx={{ color: '#e65100', fontWeight: 600 }}>{report.patch_pending} pending</Typography>
                        </Box>
                      )}
                      {report.patch_accepted > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AcceptedIcon sx={{ fontSize: 14, color: '#2e7d32' }} />
                          <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600 }}>{report.patch_accepted} accepted</Typography>
                        </Box>
                      )}
                      {report.patch_rejected > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <RejectedIcon sx={{ fontSize: 14, color: '#c62828' }} />
                          <Typography variant="caption" sx={{ color: '#c62828', fontWeight: 600 }}>{report.patch_rejected} rejected</Typography>
                        </Box>
                      )}
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Created {new Date(report.created_at).toLocaleDateString()}
                    </Typography>
                    {report.expires_at && (
                      <Typography variant="caption" color={expired ? 'error' : 'text.secondary'}>
                        {expired ? 'Expired' : `Expires ${new Date(report.expires_at).toLocaleDateString()}`}
                      </Typography>
                    )}
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}

        {/* ── Create Dialog ───────────────────────────────── */}
        <Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
            <AddIcon sx={{ color: '#1565c0' }} />
            <Box sx={{ flex: 1 }}>New Interactive Report</Box>
            <IconButton size="small" onClick={() => setCreateOpen(false)}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Create a report and send a secure link to a recipient. They will be able to fill in
              record fields without needing an account.
            </Typography>
            <TextField
              label="Report Title"
              fullWidth
              size="small"
              value={createForm.title}
              onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g., Baptism records — Smith family"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Record Type"
              select
              fullWidth
              size="small"
              value={createForm.recordType}
              onChange={e => setCreateForm(p => ({ ...p, recordType: e.target.value }))}
              sx={{ mb: 2 }}
            >
              <MenuItem value="baptism">Baptism</MenuItem>
              <MenuItem value="marriage">Marriage</MenuItem>
              <MenuItem value="funeral">Funeral</MenuItem>
            </TextField>
            <TextField
              label="Recipient Email"
              fullWidth
              size="small"
              type="email"
              value={createForm.recipientEmail}
              onChange={e => setCreateForm(p => ({ ...p, recipientEmail: e.target.value }))}
              placeholder="recipient@example.com"
              helperText="They will receive a secure link to fill in record data"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Expires In (days)"
              fullWidth
              size="small"
              type="number"
              value={createForm.expiresDays}
              onChange={e => setCreateForm(p => ({ ...p, expiresDays: parseInt(e.target.value) || 30 }))}
              inputProps={{ min: 1, max: 365 }}
              helperText="The link will stop working after this many days"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)} disabled={creating} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={creating || !createForm.title.trim() || !createForm.recipientEmail.trim()}
              startIcon={creating ? <CircularProgress size={16} /> : <SentIcon />}
              sx={{ textTransform: 'none', bgcolor: '#1565c0' }}
            >
              {creating ? 'Creating...' : 'Create & Send'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ── Delete Confirm Dialog ───────────────────────── */}
        <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Delete Report</DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              Permanently delete <strong>{deleteTarget?.title}</strong> and all associated recipients, submissions, and patches?
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ textTransform: 'none' }}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDelete}
              disabled={deleting}
              startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
              sx={{ textTransform: 'none' }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default InteractiveReportsPage;
