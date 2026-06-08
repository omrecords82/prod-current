/**
 * Temporary church admin first-login onboarding
 * /onboarding/change-password, /onboarding/record-tables, /onboarding/record-layouts
 */
import PageContainer from '@/shared/ui/PageContainer';
import { apiClient } from '@/api/utils/axiosInstance';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const NAVY = '#1a2e52';
const GOLD = '#d4af37';

const ONBOARDING_STEPS = ['Set password', 'Record tables', 'Record layouts'];

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
      if (data.table_configuration_completed && data.layout_configuration_completed) navigate('/portal');
      if (data.table_configuration_completed && !data.layout_configuration_completed) navigate('/onboarding/record-layouts');
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
      const res = await apiClient.post<any>('/api/onboarding/record-tables/complete');
      navigate(res.redirectTo || '/onboarding/record-layouts');
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
        <Stepper activeStep={1} sx={{ mb: 3 }}>
          {ONBOARDING_STEPS.map((label) => (
            <Step key={label} completed={label === 'Set password'}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
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

type CatalogLayout = {
  id: string;
  record_type: string;
  title: string;
  description: string;
  extraction_mode: string;
  era_hint?: string;
  thumbnail: string;
};

const RECORD_TYPE_LABELS: Record<string, string> = {
  baptism: 'Baptism',
  marriage: 'Marriage',
  funeral: 'Funeral',
  chrismation: 'Chrismation',
  custom: 'Custom',
  other: 'Other',
};

export const OnboardingRecordLayoutsPage: React.FC = () => {
  const navigate = useNavigate();
  const [refId, setRefId] = useState('');
  const [recordTypes, setRecordTypes] = useState<string[]>([]);
  const [catalogByType, setCatalogByType] = useState<Record<string, CatalogLayout[]>>({});
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewLayout, setPreviewLayout] = useState<CatalogLayout | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const me = await apiClient.get<any>('/api/onboarding/me');
      if (me.onboarding?.must_change_password) {
        navigate('/onboarding/change-password');
        return;
      }
      if (!me.onboarding?.table_configuration_completed) {
        navigate('/onboarding/record-tables');
        return;
      }
      if (me.onboarding?.layout_configuration_completed) {
        navigate('/portal');
        return;
      }
      const data = await apiClient.get<any>('/api/onboarding/record-layouts');
      setRefId(data.onboarding_request_id || '');
      setRecordTypes(data.selected_record_types || []);
      setCatalogByType(data.catalog_by_type || {});
      setSelections(data.selections || {});
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load layout catalog');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  function toggleLayout(recordType: string, layoutId: string) {
    setSelections((prev) => {
      const current = prev[recordType] || [];
      const next = current.includes(layoutId)
        ? current.filter((id) => id !== layoutId)
        : [...current, layoutId];
      return { ...prev, [recordType]: next };
    });
  }

  async function saveDraft() {
    setBusy(true);
    try {
      await apiClient.put('/api/onboarding/record-layouts', { selections, draft: true });
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
      await apiClient.put('/api/onboarding/record-layouts', { selections, draft: false });
      const res = await apiClient.post<any>('/api/onboarding/record-layouts/complete');
      navigate(res.redirectTo || '/portal');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not complete setup');
    } finally {
      setBusy(false);
    }
  }

  const allTypesHaveSelection = recordTypes.every((rt) => (selections[rt] || []).length > 0);

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <PageContainer title="Identify Your Record Layouts">
      <Box sx={{ maxWidth: 1100, mx: 'auto', py: 2 }}>
        <Stepper activeStep={2} sx={{ mb: 3 }}>
          {ONBOARDING_STEPS.map((label) => (
            <Step key={label} completed={label !== 'Record layouts'}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Typography variant="h4" sx={{ color: NAVY, mb: 1 }}>Church record layout analysis</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enrollment reference: <strong>{refId}</strong>. OrthodoxMetrics has processed many parish ledger styles.
          Select every layout that matches records you plan to upload. Sources are anonymized — no parish names are shown.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {recordTypes.map((rt) => (
          <Box key={rt} sx={{ mb: 4 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <Typography variant="h6">{RECORD_TYPE_LABELS[rt] || rt} records</Typography>
              <Chip
                size="small"
                label={`${(selections[rt] || []).length} selected`}
                color={(selections[rt] || []).length > 0 ? 'primary' : 'default'}
              />
            </Stack>
            <Grid container spacing={2}>
              {(catalogByType[rt] || []).map((layout) => {
                const selected = (selections[rt] || []).includes(layout.id);
                return (
                  <Grid item xs={12} sm={6} md={4} key={layout.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderColor: selected ? GOLD : 'divider',
                        borderWidth: selected ? 2 : 1,
                        bgcolor: selected ? 'rgba(212, 175, 55, 0.06)' : 'background.paper',
                      }}
                    >
                      <Box sx={{ position: 'relative' }}>
                        <CardMedia
                          component="img"
                          height="140"
                          image={layout.thumbnail}
                          alt={layout.title}
                          sx={{
                            objectFit: 'cover',
                            objectPosition: 'top',
                            cursor: 'zoom-in',
                          }}
                          onClick={() => setPreviewLayout(layout)}
                        />
                        <IconButton
                          size="small"
                          aria-label={`Enlarge ${layout.title} preview`}
                          onClick={() => setPreviewLayout(layout)}
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'rgba(255,255,255,0.9)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                          }}
                        >
                          <ZoomInIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <CardActionArea onClick={() => toggleLayout(rt, layout.id)} sx={{ flexGrow: 1 }}>
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Typography variant="subtitle1" fontWeight={700} sx={{ pr: 1 }}>
                              {layout.title}
                            </Typography>
                            <Checkbox checked={selected} tabIndex={-1} disableRipple />
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {layout.description}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                            {layout.era_hint && <Chip size="small" label={layout.era_hint} variant="outlined" />}
                            <Chip size="small" label={layout.extraction_mode.replace('_', ' ')} variant="outlined" />
                          </Stack>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        ))}

        <Dialog
          open={!!previewLayout}
          onClose={() => setPreviewLayout(null)}
          maxWidth="md"
          fullWidth
        >
          {previewLayout && (
            <>
              <DialogTitle sx={{ color: NAVY }}>{previewLayout.title}</DialogTitle>
              <DialogContent dividers>
                <Box
                  component="img"
                  src={previewLayout.thumbnail}
                  alt={previewLayout.title}
                  sx={{
                    width: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    bgcolor: 'grey.900',
                    borderRadius: 1,
                  }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {previewLayout.description}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
                  {previewLayout.era_hint && (
                    <Chip size="small" label={previewLayout.era_hint} variant="outlined" />
                  )}
                  <Chip
                    size="small"
                    label={previewLayout.extraction_mode.replace('_', ' ')}
                    variant="outlined"
                  />
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setPreviewLayout(null)}>Close</Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={() => navigate('/onboarding/record-tables')} disabled={busy}>
            Back
          </Button>
          <Button variant="outlined" disabled={busy} onClick={saveDraft}>Save draft</Button>
          <Button
            variant="contained"
            disabled={busy || !allTypesHaveSelection}
            onClick={complete}
            sx={{ bgcolor: NAVY }}
          >
            Complete setup
          </Button>
        </Stack>
        {!allTypesHaveSelection && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Select at least one layout for each record type you enrolled with.
          </Typography>
        )}
      </Box>
    </PageContainer>
  );
};

export default OnboardingRecordTablesPage;
