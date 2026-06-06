/**
 * OMAI admin — enrollment onboarding requests (ONB_<ULID>)
 */
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const NAVY = '#1a2e52';
const GOLD = '#d4af37';

function statusColor(status: string) {
  if (status === 'active') return 'success';
  if (status === 'rejected' || status === 'cancelled') return 'error';
  if (status.includes('payment') || status === 'reviewing') return 'warning';
  return 'default';
}

export const OnboardingRequestsListPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
      const data = await apiClient.get<any>(`/api/admin/onboarding${q}`);
      setRows(data.requests || []);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  return (
    <PageContainer title="Enrollment Onboarding" description="Track parish enrollment requests by ONB reference">
      <Breadcrumb title="Enrollment Onboarding" items={[{ to: '/admin', title: 'Admin' }, { title: 'Onboarding' }]} />
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField size="small" placeholder="Search parish, email, ONB…" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 280 }} />
        <Button variant="contained" onClick={load} sx={{ bgcolor: NAVY, '&:hover': { bgcolor: alpha(NAVY, 0.9) } }}>Search</Button>
      </Stack>
      <Paper sx={{ borderTop: `3px solid ${GOLD}` }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Parish</TableCell>
                  <TableCell>Submitter</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Provisioning</TableCell>
                  <TableCell>Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.onboarding_request_id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/onboarding/${r.onboarding_request_id}`)}>
                    <TableCell><Typography variant="body2" fontFamily="monospace">{r.onboarding_request_id}</Typography></TableCell>
                    <TableCell>{r.parish_name}</TableCell>
                    <TableCell>{r.submitted_by_name}<br /><Typography variant="caption" color="text.secondary">{r.submitted_by_email}</Typography></TableCell>
                    <TableCell><Chip size="small" label={r.status} color={statusColor(r.status) as any} /></TableCell>
                    <TableCell><Chip size="small" variant="outlined" label={r.payment_status} /></TableCell>
                    <TableCell><Chip size="small" variant="outlined" label={r.provisioning_status} /></TableCell>
                    <TableCell>{r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}</TableCell>
                  </TableRow>
                ))}
                {!rows.length && (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: theme.palette.text.secondary }}>No onboarding requests yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </PageContainer>
  );
};

const STEPS = ['Submitted', 'Reviewing', 'Payment', 'Provisioning', 'Admin Created', 'First Login', 'Table Configuration', 'Active'];

export const OnboardingRequestDetailPage: React.FC = () => {
  const { onboarding_request_id: id } = useParams<{ onboarding_request_id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiClient.get<any>(`/api/admin/onboarding/${encodeURIComponent(id)}`);
      setData(res);
      setNotes(res.request?.admin_notes || '');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function action(path: string, method = 'POST') {
    setBusy(path);
    try {
      if (method === 'POST') await apiClient.post(`/api/admin/onboarding/${id}${path}`);
      else if (method === 'PATCH') await apiClient.patch(`/api/admin/onboarding/${id}${path}`, {});
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || e.message || 'Action failed');
    } finally {
      setBusy('');
    }
  }

  if (loading || !data?.request) {
    return <PageContainer title="Onboarding"><Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box></PageContainer>;
  }

  const req = data.request;
  const progress = data.progress || [];
  const payload = req.submitted_payload_json || {};

  return (
    <PageContainer title={req.parish_name} description={req.onboarding_request_id}>
      <Breadcrumb title={req.onboarding_request_id} items={[
        { to: '/admin', title: 'Admin' },
        { to: '/admin/onboarding', title: 'Onboarding' },
        { title: req.parish_name },
      ]} />
      <Button size="small" onClick={() => navigate('/admin/onboarding')} sx={{ mb: 2 }}>← Back to list</Button>

      <Paper sx={{ p: 2, mb: 2, borderTop: `3px solid ${GOLD}` }}>
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
          <Chip label={req.status} color={statusColor(req.status) as any} />
          <Chip label={`Payment: ${req.payment_status}`} variant="outlined" />
          <Chip label={`Provisioning: ${req.provisioning_status}`} variant="outlined" />
        </Stack>
        <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
          {STEPS.map((label, i) => {
            const p = progress[i];
            return (
              <Chip
                key={label}
                size="small"
                label={label}
                variant={p?.current ? 'filled' : 'outlined'}
                color={p?.completed ? 'success' : 'default'}
                sx={p?.current ? { bgcolor: NAVY, color: '#fff' } : undefined}
              />
            );
          })}
        </Stack>
      </Paper>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6" gutterBottom>Enrollment</Typography>
          <Typography variant="body2"><strong>Parish:</strong> {req.parish_name}</Typography>
          <Typography variant="body2"><strong>Contact:</strong> {req.submitted_by_name} ({req.submitted_by_email})</Typography>
          <Typography variant="body2"><strong>Phone:</strong> {req.submitted_by_phone || '—'}</Typography>
          <Typography variant="body2"><strong>Location:</strong> {[req.city, req.state, req.country].filter(Boolean).join(', ') || '—'}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}><strong>Record tables:</strong> {(req.selected_record_tables_json || []).join(', ')}</Typography>
          <Typography variant="body2"><strong>CRM ID:</strong> {req.crm_record_id || '—'}</Typography>
          {payload.recordImportMethod && <Typography variant="body2"><strong>Import:</strong> {payload.recordImportMethod}</Typography>}
          {payload.startTimeline && <Typography variant="body2"><strong>Timeline:</strong> {payload.startTimeline}</Typography>}
        </Paper>

        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6" gutterBottom>Actions</Typography>
          <Stack spacing={1}>
            <Button disabled={!!busy} size="small" variant="outlined" onClick={() => action('/actions/mark-reviewing')}>Mark reviewing</Button>
            <Button disabled={!!busy} size="small" variant="outlined" onClick={() => action('/actions/payment-pending')}>Move to payment pending</Button>
            <Button disabled={!!busy} size="small" variant="outlined" onClick={() => action('/actions/invoice-sent')}>Mark invoice sent</Button>
            <Button disabled={!!busy} size="small" variant="outlined" onClick={() => action('/actions/payment-received')}>Mark payment received</Button>
            <Button disabled={!!busy} size="small" variant="outlined" onClick={() => action('/actions/payment-waived')}>Mark payment waived</Button>
            <Button disabled={!!busy} size="small" variant="contained" sx={{ bgcolor: NAVY }} onClick={() => action('/actions/queue-provisioning')}>Queue provisioning</Button>
            <Button disabled={!!busy} size="small" variant="contained" color="secondary" onClick={() => action('/create-temporary-admin')}>Create temporary admin</Button>
            <Button disabled={!!busy} size="small" variant="outlined" onClick={() => action('/resend-admin-instructions')}>Resend login instructions</Button>
            <Button disabled={!!busy} size="small" color="error" variant="outlined" onClick={() => action('/actions/reject')}>Reject</Button>
            <Button disabled={!!busy} size="small" color="warning" variant="outlined" onClick={() => action('/actions/cancel')}>Cancel</Button>
          </Stack>
          <TextField multiline minRows={3} fullWidth label="Admin notes" value={notes} onChange={(e) => setNotes(e.target.value)} sx={{ mt: 2 }} />
          <Button sx={{ mt: 1 }} size="small" disabled={!!busy} onClick={async () => {
            setBusy('notes');
            try {
              await apiClient.patch(`/api/admin/onboarding/${id}/notes`, { notes });
              await load();
            } finally { setBusy(''); }
          }}>Save notes</Button>
        </Paper>
      </Stack>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" gutterBottom>Timeline</Typography>
        {(data.events || []).map((ev: any) => (
          <Box key={ev.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">{new Date(ev.created_at).toLocaleString()}</Typography>
            <Typography variant="body2"><strong>{ev.event_type}</strong>{ev.new_status ? ` → ${ev.new_status}` : ''}</Typography>
            {ev.notes && <Typography variant="caption">{ev.notes}</Typography>}
          </Box>
        ))}
      </Paper>
    </PageContainer>
  );
};

export default OnboardingRequestsListPage;
