/**
 * ChurchOnboardingDetailPage.tsx — Phase 3: Church Onboarding Detail View
 * Accessed from the "View" button on the pipeline table. Shows full church
 * onboarding status, members, tokens, and admin actions.
 */

import { apiClient } from '@/api/utils/axiosInstance';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  CheckCircle as ApproveIcon,
  ArrowBack as BackIcon,
  Cancel as RejectIcon,
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  LinkOff as DeactivateIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  VpnKey as TokenIcon,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Step,
  StepLabel,
  Stepper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChurchDetail {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state_province: string | null;
  country: string | null;
  jurisdiction: string | null;
  is_active: number;
  setup_complete: number;
  created_at: string;
  website: string | null;
  db_name: string | null;
  notes: string | null;
}

interface ChurchMember {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  is_locked: number;
  lockout_reason: string | null;
  created_at: string;
}

interface ChurchToken {
  id: number;
  token: string;
  is_active: number;
  created_at: string;
  created_by_email: string | null;
}

interface OnboardingChecklist {
  church_created: boolean;
  token_issued: boolean;
  members_registered: boolean;
  members_active: boolean;
  setup_complete: boolean;
}

type SnackState = { open: boolean; message: string; severity: 'success' | 'error' | 'info' };

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const COLOR = '#1565c0';

const STAGE_META: Record<string, { label: string; color: string }> = {
  new:             { label: 'New',             color: '#9e9e9e' },
  token_issued:    { label: 'Token Issued',    color: '#ff9800' },
  members_joining: { label: 'Members Joining', color: '#2196f3' },
  active:          { label: 'Active',          color: '#4caf50' },
  setup_complete:  { label: 'Setup Complete',  color: '#1b5e20' },
};

const STEPPER_STEPS = [
  'Church Created',
  'Token Issued',
  'Members Registered',
  'Members Active',
  'Setup Complete',
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ChurchOnboardingDetailPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const { churchId } = useParams<{ churchId: string }>();

  /* --- state: main data + notes -------------------------------------- */
  type DataBucket = {
    church: ChurchDetail | null;
    members: ChurchMember[];
    tokens: ChurchToken[];
    checklist: OnboardingChecklist | null;
    stage: string;
    loading: boolean;
    error: string;
    notes: string;
    notesOriginal: string;
    notesSaving: boolean;
  };
  const [data, setData] = useState<DataBucket>({
    church: null,
    members: [],
    tokens: [],
    checklist: null,
    stage: 'new',
    loading: true,
    error: '',
    notes: '',
    notesOriginal: '',
    notesSaving: false,
  });
  const setDataField = useCallback(<K extends keyof DataBucket>(key: K, value: DataBucket[K]) => {
    setData(prev => ({ ...prev, [key]: value }));
  }, []);
  const { church, members, tokens, checklist, stage, loading, error, notes, notesOriginal, notesSaving } = data;
  const setChurch = useCallback((v: ChurchDetail | null) => setDataField('church', v), [setDataField]);
  const setMembers = useCallback((v: ChurchMember[]) => setDataField('members', v), [setDataField]);
  const setTokens = useCallback((v: ChurchToken[]) => setDataField('tokens', v), [setDataField]);
  const setChecklist = useCallback((v: OnboardingChecklist | null) => setDataField('checklist', v), [setDataField]);
  const setStage = useCallback((v: string) => setDataField('stage', v), [setDataField]);
  const setLoading = useCallback((v: boolean) => setDataField('loading', v), [setDataField]);
  const setError = useCallback((v: string) => setDataField('error', v), [setDataField]);
  const setNotes = useCallback((v: string) => setDataField('notes', v), [setDataField]);
  const setNotesOriginal = useCallback((v: string) => setDataField('notesOriginal', v), [setDataField]);
  const setNotesSaving = useCallback((v: boolean) => setDataField('notesSaving', v), [setDataField]);

  /* --- state: actions + reject dialog -------------------------------- */
  type ActionsBucket = {
    togglingSetup: boolean;
    generatingToken: boolean;
    deactivatingToken: number | null;
    actionLoading: number | null;
    rejectDialog: { open: boolean; userId: number | null; email: string };
    rejectReason: string;
  };
  const [actions, setActions] = useState<ActionsBucket>({
    togglingSetup: false,
    generatingToken: false,
    deactivatingToken: null,
    actionLoading: null,
    rejectDialog: { open: false, userId: null, email: '' },
    rejectReason: '',
  });
  const setActionsField = useCallback(<K extends keyof ActionsBucket>(key: K, value: ActionsBucket[K]) => {
    setActions(prev => ({ ...prev, [key]: value }));
  }, []);
  const { togglingSetup, generatingToken, deactivatingToken, actionLoading, rejectDialog, rejectReason } = actions;
  const setTogglingSetup = useCallback((v: boolean) => setActionsField('togglingSetup', v), [setActionsField]);
  const setGeneratingToken = useCallback((v: boolean) => setActionsField('generatingToken', v), [setActionsField]);
  const setDeactivatingToken = useCallback((v: number | null) => setActionsField('deactivatingToken', v), [setActionsField]);
  const setActionLoading = useCallback((v: number | null) => setActionsField('actionLoading', v), [setActionsField]);
  const setRejectDialog = useCallback((v: { open: boolean; userId: number | null; email: string }) => setActionsField('rejectDialog', v), [setActionsField]);
  const setRejectReason = useCallback((v: string) => setActionsField('rejectReason', v), [setActionsField]);

  /* --- state: snackbar ----------------------------------------------- */
  const [snack, setSnack] = useState<SnackState>({ open: false, message: '', severity: 'success' });

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { to: '/admin/control-panel/church-management', title: 'Church Management' },
    { to: '/admin/control-panel/church-onboarding', title: 'Church Onboarding' },
    { title: church?.name || 'Detail' },
  ];

  /* ------------------------------------------------------------------ */
  /*  Data fetching                                                      */
  /* ------------------------------------------------------------------ */

  const fetchDetail = useCallback(async () => {
    if (!churchId) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`/api/admin/church-onboarding/${churchId}/detail`, { withCredentials: true });
      setChurch(data.church || null);
      setMembers(data.members || []);
      setTokens(data.tokens || []);
      setChecklist(data.checklist || null);
      setStage(data.onboarding_stage || 'new');
      setNotes(data.church?.notes || '');
      setNotesOriginal(data.church?.notes || '');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load church detail');
    } finally {
      setLoading(false);
    }
  }, [churchId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return d; }
  };

  const formatDateTime = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  };

  const copyToClipboard = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text).then(() => {
      setSnack({ open: true, message: `${label} to clipboard`, severity: 'info' });
    });
  };

  const getActiveStep = (): number => {
    if (!checklist) return 0;
    if (checklist.setup_complete) return 5;
    if (checklist.members_active) return 4;
    if (checklist.members_registered) return 3;
    if (checklist.token_issued) return 2;
    if (checklist.church_created) return 1;
    return 0;
  };

  const stageMeta = STAGE_META[stage] || STAGE_META.new;

  const totalMembers = members.length;
  const activeMembers = members.filter((m) => !m.is_locked).length;
  const pendingMembers = members.filter((m) => m.is_locked && m.lockout_reason?.toLowerCase().includes('pending')).length;

  /* ------------------------------------------------------------------ */
  /*  Actions                                                            */
  /* ------------------------------------------------------------------ */

  const handleToggleSetup = async () => {
    if (!churchId) return;
    setTogglingSetup(true);
    try {
      const { data } = await axios.post(`/api/admin/church-onboarding/${churchId}/toggle-setup`, {}, { withCredentials: true });
      setSnack({ open: true, message: data.message || 'Setup status toggled', severity: 'success' });
      fetchDetail();
    } catch (err: any) {
      setSnack({ open: true, message: err.response?.data?.error || 'Failed to toggle setup', severity: 'error' });
    } finally {
      setTogglingSetup(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!churchId) return;
    setNotesSaving(true);
    try {
      await axios.post(`/api/admin/church-onboarding/${churchId}/update-notes`, { notes }, { withCredentials: true });
      setNotesOriginal(notes);
      setSnack({ open: true, message: 'Notes saved', severity: 'success' });
    } catch (err: any) {
      setSnack({ open: true, message: err.response?.data?.error || 'Failed to save notes', severity: 'error' });
    } finally {
      setNotesSaving(false);
    }
  };

  const handleGenerateToken = async () => {
    if (!churchId) return;
    setGeneratingToken(true);
    try {
      await axios.post(`/api/admin/church-onboarding/${churchId}/send-token`, {}, { withCredentials: true });
      setSnack({ open: true, message: 'Token generated successfully', severity: 'success' });
      fetchDetail();
    } catch (err: any) {
      setSnack({ open: true, message: err.response?.data?.error || 'Failed to generate token', severity: 'error' });
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleDeactivateToken = async (tokenId: number, tokenChurchId: string) => {
    setDeactivatingToken(tokenId);
    try {
      await axios.delete(`/api/admin/churches/${tokenChurchId}/registration-token`, { withCredentials: true });
      setSnack({ open: true, message: 'Token deactivated', severity: 'success' });
      fetchDetail();
    } catch (err: any) {
      setSnack({ open: true, message: err.response?.data?.error || 'Failed to deactivate token', severity: 'error' });
    } finally {
      setDeactivatingToken(null);
    }
  };

  const handleApprove = async (userId: number, email: string) => {
    setActionLoading(userId);
    try {
      await apiClient.post<any>(`/admin/users/${userId}/unlock`);
      setSnack({ open: true, message: `${email} approved and unlocked`, severity: 'success' });
      fetchDetail();
    } catch (err: any) {
      setSnack({ open: true, message: err.message, severity: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.userId) return;
    setActionLoading(rejectDialog.userId);
    try {
      await apiClient.post<any>(`/admin/users/${rejectDialog.userId}/lockout`, { reason: `Registration rejected: ${rejectReason || 'Not approved by admin'}` });
      setSnack({ open: true, message: `${rejectDialog.email} registration rejected`, severity: 'success' });
      setRejectDialog({ open: false, userId: null, email: '' });
      setRejectReason('');
      fetchDetail();
    } catch (err: any) {
      setSnack({ open: true, message: err.message, severity: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const hasActiveToken = tokens.some((t) => t.is_active);

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <PageContainer title="Church Onboarding Detail" description="Church onboarding detail view">
      <Breadcrumb title={church?.name || 'Church Detail'} items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* ---- Header ------------------------------------------------- */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton
            onClick={() => navigate('/admin/control-panel/church-onboarding')}
            sx={{ bgcolor: alpha(COLOR, 0.08), color: COLOR }}
          >
            <BackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h4" fontWeight={700}>
                {church?.name || 'Loading...'}
              </Typography>
              {church && (
                <Chip
                  label={stageMeta.label}
                  size="small"
                  sx={{
                    bgcolor: alpha(stageMeta.color, isDark ? 0.2 : 0.12),
                    color: stageMeta.color,
                    fontWeight: 600,
                    border: `1px solid ${alpha(stageMeta.color, 0.3)}`,
                  }}
                />
              )}
            </Box>
            {church && (
              <Typography variant="body2" color="text.secondary">
                Church ID: {church.id} &middot; Created {formatDate(church.created_at)}
              </Typography>
            )}
          </Box>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchDetail} disabled={loading} sx={{ color: COLOR }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* ---- Error / Loading ---------------------------------------- */}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: COLOR }} />
          </Box>
        ) : church ? (
          <>
            {/* ============================================================ */}
            {/*  Section 1: Onboarding Progress (Stepper)                    */}
            {/* ============================================================ */}
            <Paper
              elevation={0}
              sx={{
                p: 3, mb: 3,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2.5 }}>
                Onboarding Progress
              </Typography>
              <Stepper activeStep={getActiveStep()} alternativeLabel>
                {STEPPER_STEPS.map((label) => (
                  <Step key={label}>
                    <StepLabel
                      StepIconProps={{
                        sx: {
                          '&.Mui-active': { color: COLOR },
                          '&.Mui-completed': { color: COLOR },
                        },
                      }}
                    >
                      {label}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Paper>

            {/* ============================================================ */}
            {/*  Section 2: Church Info Card                                  */}
            {/* ============================================================ */}
            <Paper
              elevation={0}
              sx={{
                p: 3, mb: 3,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                Church Information
              </Typography>
              <Grid container spacing={2.5}>
                {/* Row 1 */}
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Name</Typography>
                  <Typography variant="body2">{church.name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Email</Typography>
                  <Typography variant="body2">{church.email || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Phone</Typography>
                  <Typography variant="body2">{church.phone || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Website</Typography>
                  <Typography variant="body2">{church.website || '—'}</Typography>
                </Grid>

                {/* Row 2 */}
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Address</Typography>
                  <Typography variant="body2">
                    {[church.address, church.city, church.state_province, church.country].filter(Boolean).join(', ') || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Jurisdiction</Typography>
                  <Typography variant="body2">{church.jurisdiction || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Status</Typography>
                  <Box>
                    <Chip
                      label={church.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      color={church.is_active ? 'success' : 'default'}
                      variant={church.is_active ? 'filled' : 'outlined'}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Setup Complete</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={church.setup_complete ? 'Complete' : 'Incomplete'}
                      size="small"
                      color={church.setup_complete ? 'success' : 'warning'}
                      variant={church.setup_complete ? 'filled' : 'outlined'}
                    />
                    <Tooltip title={church.setup_complete ? 'Mark as incomplete' : 'Mark as complete'}>
                      <Switch
                        size="small"
                        checked={!!church.setup_complete}
                        disabled={togglingSetup}
                        onChange={handleToggleSetup}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: COLOR },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: COLOR },
                        }}
                      />
                    </Tooltip>
                  </Box>
                </Grid>

                {/* Row 3 */}
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Database Name</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                    {church.db_name || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Created Date</Typography>
                  <Typography variant="body2">{formatDateTime(church.created_at)}</Typography>
                </Grid>

                {/* Notes */}
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                    Notes
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      maxRows={5}
                      size="small"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add onboarding notes..."
                      InputProps={{
                        startAdornment: <EditIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18, mt: 0.5 }} />,
                      }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={notesSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                      disabled={notesSaving || notes === notesOriginal}
                      onClick={handleSaveNotes}
                      sx={{
                        textTransform: 'none',
                        bgcolor: COLOR,
                        '&:hover': { bgcolor: alpha(COLOR, 0.85) },
                        minWidth: 80,
                        mt: 0.5,
                      }}
                    >
                      Save
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* ============================================================ */}
            {/*  Section 3: Members Table                                     */}
            {/* ============================================================ */}
            <Paper
              elevation={0}
              sx={{
                mb: 3, overflow: 'hidden',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                borderRadius: 2,
              }}
            >
              <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" fontWeight={700}>Members</Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Chip
                    label={`${totalMembers} total`}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600, borderRadius: '8px' }}
                  />
                  <Chip
                    label={`${activeMembers} active`}
                    size="small"
                    sx={{
                      fontWeight: 600, borderRadius: '8px',
                      bgcolor: alpha('#4caf50', isDark ? 0.2 : 0.1),
                      color: '#4caf50',
                      border: `1px solid ${alpha('#4caf50', 0.3)}`,
                    }}
                  />
                  {pendingMembers > 0 && (
                    <Chip
                      label={`${pendingMembers} pending`}
                      size="small"
                      sx={{
                        fontWeight: 600, borderRadius: '8px',
                        bgcolor: alpha('#ff9800', isDark ? 0.2 : 0.1),
                        color: '#ff9800',
                        border: `1px solid ${alpha('#ff9800', 0.3)}`,
                      }}
                    />
                  )}
                </Box>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(COLOR, isDark ? 0.08 : 0.04) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Lockout Reason</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Registered</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No members found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((member) => {
                        const isPending = member.is_locked && member.lockout_reason?.toLowerCase().includes('pending');
                        return (
                          <TableRow key={member.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {member.full_name || `${member.first_name} ${member.last_name}`}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{member.email}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={member.role || 'viewer'} size="small" sx={{ fontSize: '0.72rem' }} />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={member.is_locked ? 'Locked' : 'Active'}
                                size="small"
                                color={member.is_locked ? 'error' : 'success'}
                                variant={member.is_locked ? 'outlined' : 'filled'}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                {member.lockout_reason || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(member.created_at)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              {isPending && (
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                  <Button
                                    variant="contained"
                                    size="small"
                                    color="success"
                                    startIcon={actionLoading === member.id ? <CircularProgress size={14} color="inherit" /> : <ApproveIcon />}
                                    disabled={actionLoading !== null}
                                    onClick={() => handleApprove(member.id, member.email)}
                                    sx={{ textTransform: 'none', fontSize: '0.78rem' }}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    color="error"
                                    startIcon={<RejectIcon />}
                                    disabled={actionLoading !== null}
                                    onClick={() => setRejectDialog({ open: true, userId: member.id, email: member.email })}
                                    sx={{ textTransform: 'none', fontSize: '0.78rem' }}
                                  >
                                    Reject
                                  </Button>
                                </Box>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* ============================================================ */}
            {/*  Section 4: Token History                                     */}
            {/* ============================================================ */}
            <Paper
              elevation={0}
              sx={{
                mb: 3, overflow: 'hidden',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                borderRadius: 2,
              }}
            >
              <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TokenIcon sx={{ color: COLOR, fontSize: 20 }} />
                  <Typography variant="subtitle1" fontWeight={700}>Token History</Typography>
                </Box>
                {!hasActiveToken && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={generatingToken ? <CircularProgress size={14} color="inherit" /> : <TokenIcon />}
                    disabled={generatingToken}
                    onClick={handleGenerateToken}
                    sx={{
                      textTransform: 'none',
                      bgcolor: COLOR,
                      '&:hover': { bgcolor: alpha(COLOR, 0.85) },
                    }}
                  >
                    Generate Token
                  </Button>
                )}
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(COLOR, isDark ? 0.08 : 0.04) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Token</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Created By</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tokens.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No tokens found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      tokens.map((t) => (
                        <TableRow key={t.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.8rem',
                                  maxWidth: 180,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {t.token}
                              </Typography>
                              <Tooltip title="Copy token">
                                <IconButton size="small" onClick={() => copyToClipboard(t.token, 'Token copied')}>
                                  <CopyIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={t.is_active ? 'Active' : 'Inactive'}
                              size="small"
                              color={t.is_active ? 'success' : 'default'}
                              variant={t.is_active ? 'filled' : 'outlined'}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(t.created_at)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {t.created_by_email || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {t.is_active ? (
                              <Tooltip title="Deactivate token">
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={deactivatingToken === t.id}
                                  onClick={() => handleDeactivateToken(t.id, churchId!)}
                                >
                                  {deactivatingToken === t.id ? (
                                    <CircularProgress size={18} />
                                  ) : (
                                    <DeactivateIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Typography variant="caption" color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        ) : null}
      </Box>

      {/* ---- Reject Dialog -------------------------------------------- */}
      <Dialog
        open={rejectDialog.open}
        onClose={() => setRejectDialog({ open: false, userId: null, email: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject Registration</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Rejecting <strong>{rejectDialog.email}</strong> will keep their account locked. Optionally provide a reason.
          </Typography>
          <TextField
            fullWidth
            label="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g., Not a recognized parishioner"
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, userId: null, email: '' })}>Cancel</Button>
          <Button onClick={handleReject} color="error" variant="contained">Reject</Button>
        </DialogActions>
      </Dialog>

      {/* ---- Snackbar ------------------------------------------------- */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default ChurchOnboardingDetailPage;
