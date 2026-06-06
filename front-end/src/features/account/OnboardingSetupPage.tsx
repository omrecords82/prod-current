/**
 * Temporary church admin first-login onboarding
 * /onboarding/change-password and /onboarding/record-tables
 */
import PageContainer from '@/shared/ui/PageContainer';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const NAVY = '#1a2e52';
const GOLD = '#d4af37';

export const OnboardingChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (next.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (next !== confirm) { setError('Passwords do not match'); return; }
    setBusy(true);
    try {
      const res = await apiClient.post<any>('/api/onboarding/change-password', {
        currentPassword: current,
        newPassword: next,
      });
      navigate(res.redirectTo || '/onboarding/record-tables');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Password change failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContainer title="Set Your Password">
      <Box sx={{ maxWidth: 480, mx: 'auto', mt: 4 }}>
        <Card sx={{ borderTop: `4px solid ${GOLD}` }}>
          <CardContent>
            <Typography variant="h5" sx={{ color: NAVY, mb: 2 }}>Change temporary password</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              For security, you must set a new password before continuing parish setup.
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <form onSubmit={submit}>
              <Stack spacing={2}>
                <TextField type="password" label="Current temporary password" required fullWidth value={current} onChange={(e) => setCurrent(e.target.value)} />
                <TextField type="password" label="New password" required fullWidth value={next} onChange={(e) => setNext(e.target.value)} />
                <TextField type="password" label="Confirm new password" required fullWidth value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                <Button type="submit" variant="contained" disabled={busy} sx={{ bgcolor: NAVY }}>{busy ? 'Saving…' : 'Continue'}</Button>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Box>
    </PageContainer>
  );
};

type ColumnDef = {
  column_key: string;
  display_label: string;
  required?: boolean;
  visible?: boolean;
  editable?: boolean;
  source?: string;
  sort_order?: number;
};

type TableDef = {
  record_type: string;
  table_key: string;
  display_name: string;
  columns: ColumnDef[];
  enabled: boolean;
};

export const OnboardingRecordTablesPage: React.FC = () => {
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableDef[]>([]);
  const [refId, setRefId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const me = await apiClient.get<any>('/api/onboarding/me');
      if (me.onboarding?.must_change_password) {
        navigate('/onboarding/change-password');
        return;
      }
      const data = await apiClient.get<any>('/api/onboarding/record-tables');
      setTables(data.tables || []);
      setRefId(data.onboarding_request_id || '');
      if (data.table_configuration_completed) navigate('/portal');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load record table setup');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  function updateColumn(ti: number, ci: number, label: string) {
    setTables((prev) => {
      const copy = [...prev];
      const cols = [...copy[ti].columns];
      cols[ci] = { ...cols[ci], display_label: label };
      copy[ti] = { ...copy[ti], columns: cols };
      return copy;
    });
  }

  async function saveDraft() {
    setBusy(true);
    try {
      await apiClient.put('/api/onboarding/record-tables', { tables, draft: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    setBusy(true);
    setError('');
    try {
      await apiClient.put('/api/onboarding/record-tables', { tables, draft: false });
      await apiClient.post('/api/onboarding/record-tables/complete');
      navigate('/portal');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not complete setup');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <PageContainer title="Configure Record Tables">
      <Box sx={{ maxWidth: 900, mx: 'auto', py: 2 }}>
        <Typography variant="h4" sx={{ color: NAVY, mb: 1 }}>Review your record tables</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enrollment reference: <strong>{refId}</strong>. Customize column headers for each sacramental record type you selected.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {tables.map((table, ti) => (
          <Card key={table.record_type} sx={{ mb: 2, borderLeft: `4px solid ${GOLD}` }}>
            <CardContent>
              <Typography variant="h6">{table.display_name}</Typography>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {table.columns.filter((c) => c.visible !== false).map((col, ci) => (
                  <Stack key={col.column_key} direction="row" alignItems="center" spacing={2}>
                    <TextField
                      size="small"
                      fullWidth
                      label={col.column_key}
                      value={col.display_label}
                      disabled={col.required && col.source === 'system_default' ? false : !col.editable}
                      onChange={(e) => updateColumn(ti, ci, e.target.value)}
                      helperText={col.required ? 'Required' : 'Optional'}
                    />
                    {!col.required && (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={col.visible !== false}
                            onChange={(e) => {
                              setTables((prev) => {
                                const copy = [...prev];
                                const cols = [...copy[ti].columns];
                                cols[ci] = { ...cols[ci], visible: e.target.checked };
                                copy[ti] = { ...copy[ti], columns: cols };
                                return copy;
                              });
                            }}
                          />
                        }
                        label="Show"
                      />
                    )}
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        ))}
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" disabled={busy} onClick={saveDraft}>Save draft</Button>
          <Button variant="contained" disabled={busy} onClick={complete} sx={{ bgcolor: NAVY }}>Complete setup</Button>
        </Stack>
      </Box>
    </PageContainer>
  );
};

export default OnboardingRecordTablesPage;
