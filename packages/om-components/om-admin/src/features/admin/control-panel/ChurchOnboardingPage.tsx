/**
 * ChurchOnboardingPage.tsx — Phase 2: Church Onboarding Pipeline
 * Manage registration tokens, track onboarding progress, and monitor church setup.
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  ArrowBack as BackIcon,
  ContentCopy as CopyIcon,
  ExpandLess,
  ExpandMore,
  LinkOff as DeactivateIcon,
  Refresh as RefreshIcon,
  Rocket as PipelineIcon,
  VpnKey as TokenIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Snackbar,
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
import { useNavigate } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PipelineChurch {
  id: number;
  name: string;
  is_active: number;
  setup_complete: number;
  created_at: string;
  active_tokens: number;
  total_users: number;
  active_users: number;
  pending_users: number;
  onboarding_stage: 'new' | 'token_issued' | 'members_joining' | 'active' | 'setup_complete';
}

interface TokenInfo {
  id: number;
  church_id: number;
  church_name: string;
  token: string;
  is_active: number;
  created_at: string;
  created_by_email: string;
  usage_count: number;
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ChurchOnboardingPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();

  /* --- state: pipeline ------------------------------------------------ */
  const [churches, setChurches] = useState<PipelineChurch[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [pipelineError, setPipelineError] = useState('');

  /* --- state: all tokens ---------------------------------------------- */
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [tokensError, setTokensError] = useState('');
  const [tokensOpen, setTokensOpen] = useState(false);

  /* --- state: dialog -------------------------------------------------- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogChurch, setDialogChurch] = useState<PipelineChurch | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [existingToken, setExistingToken] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [registrationUrl, setRegistrationUrl] = useState<string | null>(null);

  /* --- state: misc ---------------------------------------------------- */
  const [snack, setSnack] = useState<SnackState>({ open: false, message: '', severity: 'success' });
  const [deactivating, setDeactivating] = useState<number | null>(null);

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { to: '/admin/control-panel/church-management', title: 'Church Management' },
    { title: 'Church Onboarding' },
  ];

  /* ------------------------------------------------------------------ */
  /*  Data fetching                                                      */
  /* ------------------------------------------------------------------ */

  const fetchPipeline = useCallback(async () => {
    setPipelineLoading(true);
    setPipelineError('');
    try {
      const { data } = await axios.get('/api/admin/church-onboarding/pipeline', { withCredentials: true });
      setChurches(data.churches || []);
    } catch (err: any) {
      setPipelineError(err.response?.data?.error || err.message || 'Failed to load pipeline data');
    } finally {
      setPipelineLoading(false);
    }
  }, []);

  const fetchTokens = useCallback(async () => {
    setTokensLoading(true);
    setTokensError('');
    try {
      const { data } = await axios.get('/api/admin/church-onboarding/tokens', { withCredentials: true });
      setTokens(data.tokens || []);
    } catch (err: any) {
      setTokensError(err.response?.data?.error || err.message || 'Failed to load tokens');
    } finally {
      setTokensLoading(false);
    }
  }, []);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  const handleRefresh = () => {
    fetchPipeline();
    if (tokensOpen) fetchTokens();
  };

  /* ------------------------------------------------------------------ */
  /*  Token dialog                                                       */
  /* ------------------------------------------------------------------ */

  const openTokenDialog = async (church: PipelineChurch) => {
    setDialogChurch(church);
    setDialogOpen(true);
    setDialogLoading(true);
    setExistingToken(null);
    setGeneratedToken(null);
    setRegistrationUrl(null);
    try {
      const { data } = await axios.get(`/api/admin/churches/${church.id}/registration-token`, { withCredentials: true });
      if (data.token?.token) {
        setExistingToken(data.token.token);
      }
    } catch {
      // No existing token — that's fine
    } finally {
      setDialogLoading(false);
    }
  };

  const handleGenerateToken = async () => {
    if (!dialogChurch) return;
    setDialogLoading(true);
    try {
      const { data } = await axios.post(
        `/api/admin/church-onboarding/${dialogChurch.id}/send-token`,
        {},
        { withCredentials: true },
      );
      const token = data.token;
      const url = data.registration_url || `https://orthodoxmetrics.com/auth/register?token=${token}&church=${encodeURIComponent(data.church_name || dialogChurch.name)}`;
      setGeneratedToken(token);
      setRegistrationUrl(url);
      setExistingToken(token);
      setSnack({ open: true, message: 'Token generated successfully', severity: 'success' });
      // Refresh pipeline to reflect new stage
      fetchPipeline();
    } catch (err: any) {
      setSnack({ open: true, message: err.response?.data?.error || 'Failed to generate token', severity: 'error' });
    } finally {
      setDialogLoading(false);
    }
  };

  const handleDeactivateToken = async (churchId: number) => {
    setDeactivating(churchId);
    try {
      await axios.delete(`/api/admin/churches/${churchId}/registration-token`, { withCredentials: true });
      setSnack({ open: true, message: 'Token deactivated', severity: 'success' });
      if (tokensOpen) fetchTokens();
      fetchPipeline();
      // If we're in the dialog for this church, clear token
      if (dialogChurch?.id === churchId) {
        setExistingToken(null);
        setGeneratedToken(null);
        setRegistrationUrl(null);
      }
    } catch (err: any) {
      setSnack({ open: true, message: err.response?.data?.error || 'Failed to deactivate token', severity: 'error' });
    } finally {
      setDeactivating(null);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Clipboard                                                          */
  /* ------------------------------------------------------------------ */

  const copyToClipboard = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text).then(() => {
      setSnack({ open: true, message: `${label} to clipboard`, severity: 'info' });
    });
  };

  /* ------------------------------------------------------------------ */
  /*  Pipeline summary                                                   */
  /* ------------------------------------------------------------------ */

  const stageCounts = Object.keys(STAGE_META).reduce<Record<string, number>>((acc, key) => {
    acc[key] = churches.filter((c) => c.onboarding_stage === key).length;
    return acc;
  }, {});

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <PageContainer title="Church Onboarding Pipeline" description="Manage registration tokens and onboarding">
      <Breadcrumb title="Church Onboarding Pipeline" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* ---- Header ------------------------------------------------- */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton
            onClick={() => navigate('/admin/control-panel/church-management')}
            sx={{ bgcolor: alpha(COLOR, 0.08), color: COLOR }}
          >
            <BackIcon />
          </IconButton>
          <Box sx={{
            width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 2, bgcolor: alpha(COLOR, isDark ? 0.15 : 0.08), color: COLOR, flexShrink: 0,
          }}>
            <PipelineIcon sx={{ fontSize: 32 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" fontWeight={700}>Church Onboarding Pipeline</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage registration tokens, track onboarding progress, and monitor church setup
            </Typography>
          </Box>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} sx={{ color: COLOR }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* ---- Pipeline stage chips ---------------------------------- */}
        <Paper
          elevation={0}
          sx={{
            p: 2, mb: 3,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: 2,
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary', fontWeight: 600 }}>
            Pipeline Overview
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {Object.entries(STAGE_META).map(([key, meta]) => (
              <Chip
                key={key}
                label={`${meta.label}: ${stageCounts[key] || 0}`}
                sx={{
                  bgcolor: alpha(meta.color, isDark ? 0.2 : 0.1),
                  color: isDark ? meta.color : meta.color,
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  border: `1px solid ${alpha(meta.color, 0.3)}`,
                }}
              />
            ))}
            <Chip
              label={`Total: ${churches.length}`}
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: '0.85rem', borderRadius: '8px' }}
            />
          </Box>
        </Paper>

        {/* ---- Pipeline error / loading ------------------------------ */}
        {pipelineError && <Alert severity="error" sx={{ mb: 2 }}>{pipelineError}</Alert>}

        {pipelineLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: COLOR }} />
          </Box>
        ) : (
          /* ---- Churches table --------------------------------------- */
          <Paper
            elevation={0}
            sx={{
              mb: 3, overflow: 'hidden',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 2,
            }}
          >
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(COLOR, isDark ? 0.08 : 0.04) }}>
                    <TableCell sx={{ fontWeight: 700 }}>Church Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Stage</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Active Token</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Users</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {churches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No churches found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    churches.map((church) => {
                      const meta = STAGE_META[church.onboarding_stage] || STAGE_META.new;
                      return (
                        <TableRow key={church.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{church.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={meta.label}
                              size="small"
                              sx={{
                                bgcolor: alpha(meta.color, isDark ? 0.2 : 0.12),
                                color: isDark ? meta.color : meta.color,
                                fontWeight: 600,
                                border: `1px solid ${alpha(meta.color, 0.3)}`,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={church.active_tokens > 0 ? 'Yes' : 'No'}
                              size="small"
                              color={church.active_tokens > 0 ? 'success' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {church.total_users} total / {church.pending_users} pending / {church.active_users} active
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(church.created_at).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<TokenIcon />}
                                onClick={() => openTokenDialog(church)}
                                sx={{ textTransform: 'none', borderColor: COLOR, color: COLOR }}
                              >
                                Generate Token
                              </Button>
                              <Tooltip title="View church detail">
                                <IconButton
                                  size="small"
                                  onClick={() => navigate(`/admin/control-panel/church-onboarding/${church.id}`)}
                                  sx={{ color: COLOR }}
                                >
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* ---- All Tokens (collapsible) ------------------------------ */}
        <Paper
          elevation={0}
          sx={{
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: 2, overflow: 'hidden',
          }}
        >
          <Box
            onClick={() => {
              const next = !tokensOpen;
              setTokensOpen(next);
              if (next && tokens.length === 0) fetchTokens();
            }}
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              px: 2, py: 1.5, cursor: 'pointer', userSelect: 'none',
              '&:hover': { bgcolor: alpha(COLOR, 0.04) },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TokenIcon sx={{ color: COLOR, fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={600}>All Registration Tokens</Typography>
              {tokens.length > 0 && (
                <Chip label={tokens.length} size="small" sx={{ height: 22, fontWeight: 600 }} />
              )}
            </Box>
            {tokensOpen ? <ExpandLess /> : <ExpandMore />}
          </Box>
          <Collapse in={tokensOpen}>
            {tokensError && <Alert severity="error" sx={{ mx: 2, mb: 1 }}>{tokensError}</Alert>}
            {tokensLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} sx={{ color: COLOR }} />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(COLOR, isDark ? 0.06 : 0.03) }}>
                      <TableCell sx={{ fontWeight: 700 }}>Church</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Token</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Created By</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Registrations</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tokens.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">No tokens found</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      tokens.map((t) => (
                        <TableRow key={t.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{t.church_name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography
                                variant="body2"
                                sx={{ fontFamily: 'monospace', fontSize: '0.8rem', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
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
                              {new Date(t.created_at).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">{t.created_by_email}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{t.usage_count}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            {t.is_active ? (
                              <Tooltip title="Deactivate token">
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={deactivating === t.church_id}
                                  onClick={() => handleDeactivateToken(t.church_id)}
                                >
                                  {deactivating === t.church_id ? (
                                    <CircularProgress size={18} />
                                  ) : (
                                    <DeactivateIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Typography variant="caption" color="text.disabled">-</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Collapse>
        </Paper>
      </Box>

      {/* ---- Token Management Dialog -------------------------------- */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TokenIcon sx={{ color: COLOR }} />
          <Typography variant="h6" component="span" fontWeight={600}>
            Token Management
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {dialogChurch && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                Church: <strong>{dialogChurch.name}</strong>
              </Typography>

              {dialogLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress sx={{ color: COLOR }} />
                </Box>
              ) : (
                <>
                  {/* Show existing or generated token */}
                  {(existingToken || generatedToken) ? (
                    <Box>
                      <Alert severity="success" sx={{ mb: 2 }}>
                        {generatedToken ? 'Token generated successfully!' : 'An active token exists for this church.'}
                      </Alert>

                      {/* Token field */}
                      <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        Registration Token
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <TextField
                          fullWidth
                          size="small"
                          value={existingToken || generatedToken || ''}
                          InputProps={{
                            readOnly: true,
                            sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
                          }}
                        />
                        <Tooltip title="Copy token">
                          <IconButton
                            onClick={() => copyToClipboard(existingToken || generatedToken || '', 'Token copied')}
                            sx={{ color: COLOR }}
                          >
                            <CopyIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      {/* Registration URL */}
                      {(registrationUrl || existingToken) && (
                        <>
                          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                            Registration URL
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <TextField
                              fullWidth
                              size="small"
                              value={
                                registrationUrl ||
                                `https://orthodoxmetrics.com/auth/register?token=${existingToken}&church=${encodeURIComponent(dialogChurch.name)}`
                              }
                              InputProps={{
                                readOnly: true,
                                sx: { fontFamily: 'monospace', fontSize: '0.78rem' },
                              }}
                            />
                            <Tooltip title="Copy URL">
                              <IconButton
                                onClick={() =>
                                  copyToClipboard(
                                    registrationUrl ||
                                      `https://orthodoxmetrics.com/auth/register?token=${existingToken}&church=${encodeURIComponent(dialogChurch.name)}`,
                                    'URL copied',
                                  )
                                }
                                sx={{ color: COLOR }}
                              >
                                <CopyIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </>
                      )}

                      {/* Regenerate / Deactivate */}
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleGenerateToken}
                          disabled={dialogLoading}
                          sx={{ textTransform: 'none', borderColor: COLOR, color: COLOR }}
                        >
                          Regenerate Token
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          onClick={() => handleDeactivateToken(dialogChurch.id)}
                          disabled={deactivating === dialogChurch.id}
                          sx={{ textTransform: 'none' }}
                        >
                          Deactivate
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    /* No token — show generate button */
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        No active registration token for this church.
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<TokenIcon />}
                        onClick={handleGenerateToken}
                        disabled={dialogLoading}
                        sx={{ textTransform: 'none', bgcolor: COLOR, '&:hover': { bgcolor: alpha(COLOR, 0.85) } }}
                      >
                        Generate Registration Token
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Snackbar ------------------------------------------------ */}
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

export default ChurchOnboardingPage;
