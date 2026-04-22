/**
 * AI Administration Panel — Manage OMAI commands, training responses, and email records.
 * Route: /admin/ai
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Mail as MailIcon,
  PlayArrow as RunIcon,
  Psychology as _IchthysIcon,
  QuestionAnswer as QAIcon,
  Refresh as RefreshIcon,
  Terminal as TerminalIcon,
} from '@mui/icons-material';
import { SvgIcon, SvgIconProps } from '@mui/material';
import { apiClient } from '@/api/utils/axiosInstance';
import { useAuth } from '@/context/AuthContext';

/** Ichthys (ΙΧΘΥΣ) — early Christian fish symbol */
const IchthysIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon viewBox="0 0 24 24" {...props}>
    <path
      d="M1 12 C6 6, 14 4, 23 12 C14 20, 6 18, 1 12 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <circle cx="18" cy="11" r="1.2" fill="currentColor" />
    <path
      d="M23 12 L20 8 M23 12 L20 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </SvgIcon>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface OmaiCommand {
  id: number;
  command_key: string;
  category: string;
  patterns: string[];
  description: string | null;
  action: string;
  safety: 'safe' | 'moderate' | 'dangerous';
  context_aware: number;
  requires_confirmation: number;
  requires_parameters: any;
  allowed_roles: string[] | null;
  is_active: number;
}

interface TrainingResponse {
  id: number;
  question_pattern: string;
  variables: { name: string; description: string; example: string }[] | null;
  response_template: string;
  category: string;
  is_public: number;
  is_active: number;
}

const SAFETY_COLORS: Record<string, 'success' | 'warning' | 'error'> = {
  safe: 'success', moderate: 'warning', dangerous: 'error',
};

// ─── Tab Panel ────────────────────────────────────────────────────────────────

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const AIAdminPanel: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState<{ msg: string; sev: 'success' | 'error' | 'info' } | null>(null);
  const { user } = useAuth();
  const churchId = (user as any)?.church_id;

  const notify = useCallback((msg: string, sev: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, sev });
  }, []);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
        <IchthysIcon sx={{ fontSize: 28, color: 'primary.main' }} />
        <Typography variant="h5" fontWeight={700}>AI Administration</Typography>
        <Chip label="OMAI" size="small" color="primary" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage commands, training responses, and AI-powered features.
      </Typography>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 0 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab icon={<IchthysIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Overview" />
          <Tab icon={<MailIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Email Records" />
          <Tab icon={<TerminalIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Command Builder" />
          <Tab icon={<QAIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Training Responses" />
        </Tabs>
      </Box>

      <TabPanel value={tab} index={0}>
        <OverviewTab />
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <EmailRecordsTab churchId={churchId} />
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <CommandBuilderTab notify={notify} />
      </TabPanel>
      <TabPanel value={tab} index={3}>
        <TrainingResponsesTab notify={notify} />
      </TabPanel>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.sev} onClose={() => setToast(null)} variant="filled">{toast.msg}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════

const OverviewTab: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await apiClient.get('/api/omai/health');
        setHealth(res?.data || res);
      } catch { setHealth(null); }
      setLoading(false);
    })();
  }, []);

  const isOnline = health?.status === 'ok' || health?.success;

  return (
    <Stack spacing={3}>
      {/* Service Status */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem', mb: 2 }}>
            Service Status
          </Typography>
          {loading ? <LinearProgress /> : (
            <Stack direction="row" spacing={2}>
              <Card variant="outlined" sx={{ flex: 1, borderLeft: `4px solid ${isOnline ? '#4caf50' : '#f44336'}` }}>
                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>OMAI Service</Typography>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                    <Chip label={isOnline ? 'Online' : 'Offline'} size="small" color={isOnline ? 'success' : 'error'} />
                    {health?.uptime && <Typography variant="caption" color="text.secondary">Uptime: {Math.floor(health.uptime / 60)}m</Typography>}
                  </Stack>
                </CardContent>
              </Card>
              <Card variant="outlined" sx={{ flex: 1, borderLeft: '4px solid #1976d2' }}>
                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Commands</Typography>
                  <Typography variant="h5" fontWeight={700} color="primary.main">Active</Typography>
                </CardContent>
              </Card>
              <Card variant="outlined" sx={{ flex: 1, borderLeft: '4px solid #9c27b0' }}>
                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Training</Typography>
                  <Typography variant="h5" fontWeight={700} color="secondary.main">Active</Typography>
                </CardContent>
              </Card>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Quick info */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem', mb: 2 }}>
            Capabilities
          </Typography>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <TerminalIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="body2"><strong>Command Builder</strong> — Define trigger patterns and actions OMAI executes when conditions are met.</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <QAIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
              <Typography variant="body2"><strong>Training Responses</strong> — Teach OMAI how to answer customer questions on public pages with dynamic variables.</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <MailIcon sx={{ fontSize: 18, color: 'success.main' }} />
              <Typography variant="body2"><strong>Email Records</strong> — AI-powered email parsing to create draft sacramental records.</Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL RECORDS TAB
// ═══════════════════════════════════════════════════════════════════════════════

interface AuthorizedSender {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  church_role: string;
}

interface EmailSubmission {
  id: number;
  sender_email: string;
  sender_first_name?: string;
  sender_last_name?: string;
  subject: string;
  record_type: string;
  status: string;
  rejection_reason?: string;
  created_record_id?: number;
  processing_time_ms?: number;
  created_at: string;
}

const STATUS_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  completed: 'success',
  parsed: 'info',
  received: 'info',
  validated: 'info',
  submitted: 'info',
  rejected: 'error',
  failed: 'error',
};

const EmailRecordsTab: React.FC<{ churchId?: number }> = ({ churchId }) => {
  const [s, setS] = useState<{
    enabled: boolean | null;
    saving: boolean;
    authorizedSenders: AuthorizedSender[];
    submissions: EmailSubmission[];
    loadingSenders: boolean;
    loadingSubmissions: boolean;
  }>({
    enabled: null,
    saving: false,
    authorizedSenders: [],
    submissions: [],
    loadingSenders: true,
    loadingSubmissions: true,
  });
  const setSField = useCallback(<K extends keyof typeof s>(key: K, value: typeof s[K]) => {
    setS(prev => ({ ...prev, [key]: value }));
  }, []);
  const setEnabled = useCallback((v: boolean | null) => setSField('enabled', v), [setSField]);
  const setSaving = useCallback((v: boolean) => setSField('saving', v), [setSField]);
  const setAuthorizedSenders = useCallback((v: AuthorizedSender[]) => setSField('authorizedSenders', v), [setSField]);
  const setSubmissions = useCallback((v: EmailSubmission[]) => setSField('submissions', v), [setSField]);
  const setLoadingSenders = useCallback((v: boolean) => setSField('loadingSenders', v), [setSField]);
  const setLoadingSubmissions = useCallback((v: boolean) => setSField('loadingSubmissions', v), [setSField]);
  const { enabled, saving, authorizedSenders, submissions, loadingSenders, loadingSubmissions } = s;

  useEffect(() => {
    if (!churchId) return;
    apiClient.get<any>(`/churches/${churchId}/features`)
      .then((res: any) => {
        const flags = res?.data?.effective || res?.effective || res?.features || {};
        setEnabled(flags.om_assistant_enabled !== false);
      })
      .catch(() => setEnabled(false));
  }, [churchId]);

  useEffect(() => {
    if (!churchId) return;
    // Fetch authorized senders
    apiClient.get<any>(`/admin/church-users/${churchId}/email-intake-authorized`)
      .then((res: any) => setAuthorizedSenders(res?.data?.authorized_senders || []))
      .catch(() => setAuthorizedSenders([]))
      .finally(() => setLoadingSenders(false));

    // Fetch submission history
    apiClient.get<any>(`/admin/ai/email-submissions/${churchId}`)
      .then((res: any) => setSubmissions(res?.data?.submissions || []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoadingSubmissions(false));
  }, [churchId]);

  const handleToggle = async (newValue: boolean) => {
    if (!churchId) return;
    setSaving(true);
    try {
      await apiClient.put(`/churches/${churchId}/features`, { features: { om_assistant_enabled: newValue } });
      setEnabled(newValue);
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <Stack spacing={3}>
      {/* Card 1: Feature Toggle + How It Works */}
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
              OM Assistant & Email Intake
            </Typography>
            {enabled !== null && (
              <Stack direction="row" alignItems="center" spacing={1}>
                {saving && <CircularProgress size={16} />}
                <Chip label={enabled ? 'Enabled' : 'Disabled'} color={enabled ? 'success' : 'default'} onClick={() => handleToggle(!enabled)} sx={{ cursor: 'pointer' }} />
              </Stack>
            )}
          </Stack>
          <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
            When enabled, authorized users can submit sacramental records via email to <strong>records@orthodoxmetrics.com</strong>. The AI parses the content and creates draft records for review.
          </Alert>
          <Typography variant="body2" color="text.secondary" component="div">
            <strong>How it works:</strong>
            <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>Authorize users in Church Management &gt; Users tab</li>
              <li>Authorized users email record details to records@orthodoxmetrics.com</li>
              <li>AI parses the email and extracts record fields</li>
              <li>A draft record is created and flagged for review</li>
              <li>Admin reviews and approves to finalize</li>
            </ol>
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Chip label="Baptism" size="small" variant="outlined" />
            <Chip label="Marriage" size="small" variant="outlined" />
            <Chip label="Funeral" size="small" variant="outlined" />
            <Chip label="Queries" size="small" variant="outlined" color="info" />
          </Stack>
        </CardContent>
      </Card>

      {/* Card 2: Authorized Senders */}
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
              Authorized Senders
            </Typography>
            <Chip label={`${authorizedSenders.length} user${authorizedSenders.length !== 1 ? 's' : ''}`} size="small" variant="outlined" />
          </Stack>
          {loadingSenders ? <LinearProgress /> : authorizedSenders.length === 0 ? (
            <Alert severity="warning" variant="outlined">
              No users are authorized for email intake yet. Enable the "Email Intake Authorized" toggle for users in Church Management &gt; Users.
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 100 }}>Role</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {authorizedSenders.map(sender => (
                    <TableRow key={sender.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{sender.first_name} {sender.last_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{sender.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={sender.church_role || 'user'} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Recent Submissions */}
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
              Recent Submissions
            </Typography>
            <Chip label={`${submissions.length} total`} size="small" variant="outlined" />
          </Stack>
          {loadingSubmissions ? <LinearProgress /> : submissions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              No email submissions yet. Submissions will appear here when authorized users email records@orthodoxmetrics.com.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 140 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Sender</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 90 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 90 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {submissions.map(sub => (
                    <TableRow key={sub.id} hover>
                      <TableCell>
                        <Typography variant="caption">{new Date(sub.created_at).toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontSize="0.8rem">
                          {sub.sender_first_name ? `${sub.sender_first_name} ${sub.sender_last_name}` : sub.sender_email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontSize="0.8rem" sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sub.subject || '(no subject)'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={sub.record_type || 'unknown'} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </TableCell>
                      <TableCell>
                        <Tooltip title={sub.rejection_reason || ''}>
                          <Chip
                            label={sub.status}
                            size="small"
                            color={STATUS_COLORS[sub.status] || 'default'}
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND BUILDER TAB
// ═══════════════════════════════════════════════════════════════════════════════

const EMPTY_CMD: Partial<OmaiCommand> = {
  command_key: '', category: 'system', patterns: [], description: '', action: '',
  safety: 'safe', context_aware: 0, requires_confirmation: 0, requires_parameters: null,
  allowed_roles: null, is_active: 1,
};

const CommandBuilderTab: React.FC<{ notify: (msg: string, sev?: 'success' | 'error' | 'info') => void }> = ({ notify }) => {
  const [s, setS] = useState<{
    commands: OmaiCommand[];
    loading: boolean;
    dialogOpen: boolean;
    editing: Partial<OmaiCommand> | null;
    saving: boolean;
    patternsText: string;
  }>({
    commands: [],
    loading: true,
    dialogOpen: false,
    editing: null,
    saving: false,
    patternsText: '',
  });
  const setSField = useCallback(<K extends keyof typeof s>(key: K, value: typeof s[K]) => {
    setS(prev => ({ ...prev, [key]: value }));
  }, []);
  const setCommands = useCallback((v: OmaiCommand[]) => setSField('commands', v), [setSField]);
  const setLoading = useCallback((v: boolean) => setSField('loading', v), [setSField]);
  const setDialogOpen = useCallback((v: boolean) => setSField('dialogOpen', v), [setSField]);
  const setEditing = useCallback((v: Partial<OmaiCommand> | null) => setSField('editing', v), [setSField]);
  const setSaving = useCallback((v: boolean) => setSField('saving', v), [setSField]);
  const setPatternsText = useCallback((v: string) => setSField('patternsText', v), [setSField]);
  const { commands, loading, dialogOpen, editing, saving, patternsText } = s;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get('/api/admin/ai/commands');
      setCommands(res?.data?.commands || []);
    } catch { setCommands([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing({ ...EMPTY_CMD });
    setPatternsText('');
    setDialogOpen(true);
  };

  const openEdit = (cmd: OmaiCommand) => {
    setEditing({ ...cmd });
    setPatternsText(Array.isArray(cmd.patterns) ? cmd.patterns.join('\n') : '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const payload = {
      ...editing,
      patterns: patternsText.split('\n').map(s => s.trim()).filter(Boolean),
    };
    try {
      if (editing.id) {
        await apiClient.put(`/api/admin/ai/commands/${editing.id}`, payload);
        notify('Command updated', 'success');
      } else {
        await apiClient.post('/api/admin/ai/commands', payload);
        notify('Command created', 'success');
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      notify(err?.response?.data?.error || 'Failed to save', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/api/admin/ai/commands/${id}`);
      notify('Command deleted', 'success');
      load();
    } catch { notify('Delete failed', 'error'); }
  };

  const categories = [...new Set(commands.map(c => c.category))].sort();

  return (
    <Stack spacing={3}>
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                Command Builder
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Define triggers and actions OMAI will execute. {commands.length} command{commands.length !== 1 ? 's' : ''} registered.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreate}>
                New Command
              </Button>
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={load}><RefreshIcon fontSize="small" /></IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {loading ? <LinearProgress /> : commands.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No commands defined yet.</Typography>
          ) : (
            <>
              {categories.map(cat => (
                <Box key={cat} sx={{ mb: 3 }}>
                  <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1 }}>
                    {cat}
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, width: 180 }}>Key</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 100 }}>Action</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 80 }}>Safety</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 70 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 80 }} align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {commands.filter(c => c.category === cat).map(cmd => (
                          <TableRow key={cmd.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontFamily="monospace" fontWeight={600} fontSize="0.8rem">{cmd.command_key}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontSize="0.8rem">{cmd.description || '—'}</Typography>
                              {Array.isArray(cmd.patterns) && cmd.patterns.length > 0 && (
                                <Typography variant="caption" color="text.disabled">
                                  Triggers: {cmd.patterns.slice(0, 3).join(', ')}{cmd.patterns.length > 3 ? ` +${cmd.patterns.length - 3}` : ''}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip label={cmd.action} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                            </TableCell>
                            <TableCell>
                              <Chip label={cmd.safety} size="small" color={SAFETY_COLORS[cmd.safety] || 'default'} sx={{ height: 20, fontSize: '0.65rem' }} />
                            </TableCell>
                            <TableCell>
                              <Chip label={cmd.is_active ? 'On' : 'Off'} size="small" color={cmd.is_active ? 'success' : 'default'} variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                            </TableCell>
                            <TableCell align="right">
                              <IconButton size="small" onClick={() => openEdit(cmd)}><EditIcon fontSize="small" /></IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDelete(cmd.id)}><DeleteIcon fontSize="small" /></IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Command Editor Dialog */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing?.id ? 'Edit Command' : 'New Command'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="Command Key" size="small" fullWidth value={editing?.command_key || ''} onChange={e => setEditing(p => p ? { ...p, command_key: e.target.value } : p)} placeholder="e.g. restart_backend" disabled={saving} />
              <TextField label="Category" size="small" fullWidth value={editing?.category || ''} onChange={e => setEditing(p => p ? { ...p, category: e.target.value } : p)} placeholder="e.g. system" disabled={saving} />
            </Stack>
            <TextField label="Description" size="small" fullWidth value={editing?.description || ''} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : p)} disabled={saving} />
            <TextField label="Action (command to run)" size="small" fullWidth value={editing?.action || ''} onChange={e => setEditing(p => p ? { ...p, action: e.target.value } : p)} placeholder="e.g. sudo systemctl restart orthodox-backend" disabled={saving} InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }} />
            <TextField label="Trigger Patterns (one per line)" size="small" fullWidth multiline rows={3} value={patternsText} onChange={e => setPatternsText(e.target.value)} placeholder={'restart backend\nreboot server\nrestart the backend service'} disabled={saving} />
            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Safety</InputLabel>
                <Select value={editing?.safety || 'safe'} label="Safety" onChange={e => setEditing(p => p ? { ...p, safety: e.target.value as any } : p)} disabled={saving}>
                  <MenuItem value="safe">Safe</MenuItem>
                  <MenuItem value="moderate">Moderate</MenuItem>
                  <MenuItem value="dangerous">Dangerous</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel control={<Switch checked={!!editing?.requires_confirmation} onChange={e => setEditing(p => p ? { ...p, requires_confirmation: e.target.checked ? 1 : 0 } : p)} disabled={saving} />} label="Require Confirmation" />
              <FormControlLabel control={<Switch checked={editing?.is_active !== 0} onChange={e => setEditing(p => p ? { ...p, is_active: e.target.checked ? 1 : 0 } : p)} disabled={saving} />} label="Active" />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !editing?.command_key || !editing?.action} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRAINING RESPONSES TAB
// ═══════════════════════════════════════════════════════════════════════════════

const EMPTY_TR: Partial<TrainingResponse> = {
  question_pattern: '', variables: [], response_template: '', category: 'general', is_public: 1, is_active: 1,
};

const TrainingResponsesTab: React.FC<{ notify: (msg: string, sev?: 'success' | 'error' | 'info') => void }> = ({ notify }) => {
  const [s, setS] = useState<{
    responses: TrainingResponse[];
    loading: boolean;
    dialogOpen: boolean;
    editing: Partial<TrainingResponse> | null;
    saving: boolean;
    varsText: string;
    previewText: string;
  }>({
    responses: [],
    loading: true,
    dialogOpen: false,
    editing: null,
    saving: false,
    varsText: '',
    previewText: '',
  });
  const setSField = useCallback(<K extends keyof typeof s>(key: K, value: typeof s[K]) => {
    setS(prev => ({ ...prev, [key]: value }));
  }, []);
  const setResponses = useCallback((v: TrainingResponse[]) => setSField('responses', v), [setSField]);
  const setLoading = useCallback((v: boolean) => setSField('loading', v), [setSField]);
  const setDialogOpen = useCallback((v: boolean) => setSField('dialogOpen', v), [setSField]);
  const setEditing = useCallback((v: Partial<TrainingResponse> | null) => setSField('editing', v), [setSField]);
  const setSaving = useCallback((v: boolean) => setSField('saving', v), [setSField]);
  const setVarsText = useCallback((v: string) => setSField('varsText', v), [setSField]);
  const setPreviewText = useCallback((v: string) => setSField('previewText', v), [setSField]);
  const { responses, loading, dialogOpen, editing, saving, varsText, previewText } = s;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await apiClient.get('/api/admin/ai/training');
      setResponses(res?.data?.responses || []);
    } catch { setResponses([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing({ ...EMPTY_TR });
    setVarsText('');
    setPreviewText('');
    setDialogOpen(true);
  };

  const openEdit = (tr: TrainingResponse) => {
    setEditing({ ...tr });
    const vars = Array.isArray(tr.variables) ? tr.variables : [];
    setVarsText(vars.map(v => `${v.name}|${v.description}|${v.example}`).join('\n'));
    setPreviewText('');
    setDialogOpen(true);
  };

  const parseVars = (text: string) => {
    return text.split('\n').filter(Boolean).map(line => {
      const [name, description, example] = line.split('|').map(s => s.trim());
      return { name: name || '', description: description || '', example: example || '' };
    });
  };

  const generatePreview = () => {
    if (!editing?.response_template) return;
    let preview = editing.response_template;
    const vars = parseVars(varsText);
    for (const v of vars) {
      if (v.name && v.example) {
        preview = preview.replace(new RegExp(`\\{${v.name}\\}`, 'g'), v.example);
      }
    }
    setPreviewText(preview);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const payload = { ...editing, variables: parseVars(varsText) };
    try {
      if (editing.id) {
        await apiClient.put(`/api/admin/ai/training/${editing.id}`, payload);
        notify('Response updated', 'success');
      } else {
        await apiClient.post('/api/admin/ai/training', payload);
        notify('Response created', 'success');
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      notify(err?.response?.data?.error || 'Failed to save', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/api/admin/ai/training/${id}`);
      notify('Response deleted', 'success');
      load();
    } catch { notify('Delete failed', 'error'); }
  };

  return (
    <Stack spacing={3}>
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.75rem' }}>
                Training Responses
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Teach OMAI how to answer customer questions on public pages. Use {'{ }'} variables for dynamic content. {responses.length} response{responses.length !== 1 ? 's' : ''} defined.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreate}>
                New Response
              </Button>
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={load}><RefreshIcon fontSize="small" /></IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {loading ? <LinearProgress /> : responses.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No training responses defined yet.</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Question Pattern</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 100 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 80 }}>Variables</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 70 }}>Public</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 70 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 80 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {responses.map(tr => (
                    <TableRow key={tr.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontSize="0.8rem" fontWeight={500}>{tr.question_pattern}</Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25, maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tr.response_template}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={tr.category} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </TableCell>
                      <TableCell>
                        {Array.isArray(tr.variables) && tr.variables.length > 0 ? (
                          <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            {tr.variables.map((v, i) => (
                              <Chip key={i} label={`{${v.name}}`} size="small" color="secondary" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                            ))}
                          </Stack>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip label={tr.is_public ? 'Yes' : 'No'} size="small" color={tr.is_public ? 'info' : 'default'} variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </TableCell>
                      <TableCell>
                        <Chip label={tr.is_active ? 'On' : 'Off'} size="small" color={tr.is_active ? 'success' : 'default'} variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEdit(tr)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(tr.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Training Response Editor Dialog */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing?.id ? 'Edit Training Response' : 'New Training Response'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Question Pattern" size="small" fullWidth value={editing?.question_pattern || ''} onChange={e => setEditing(p => p ? { ...p, question_pattern: e.target.value } : p)}
              placeholder='e.g. "How long does it take to process {count} records?"' disabled={saving}
              helperText="Use {variable_name} for dynamic parts of the question." />
            <Stack direction="row" spacing={2}>
              <TextField label="Category" size="small" value={editing?.category || 'general'} onChange={e => setEditing(p => p ? { ...p, category: e.target.value } : p)} disabled={saving} sx={{ width: 200 }} />
              <FormControlLabel control={<Switch checked={!!editing?.is_public} onChange={e => setEditing(p => p ? { ...p, is_public: e.target.checked ? 1 : 0 } : p)} disabled={saving} />} label="Public" />
              <FormControlLabel control={<Switch checked={editing?.is_active !== 0} onChange={e => setEditing(p => p ? { ...p, is_active: e.target.checked ? 1 : 0 } : p)} disabled={saving} />} label="Active" />
            </Stack>
            <TextField label="Variables (one per line: name|description|example)" size="small" fullWidth multiline rows={2} value={varsText} onChange={e => setVarsText(e.target.value)}
              placeholder={'count|Number of records|4000\nquality|Scan quality|high'} disabled={saving}
              helperText="Define variables that appear in {braces} in the question and response." />
            <TextField label="Response Template" size="small" fullWidth multiline rows={4} value={editing?.response_template || ''} onChange={e => setEditing(p => p ? { ...p, response_template: e.target.value } : p)}
              placeholder="Processing {count} records typically takes..." disabled={saving}
              helperText="Use {variable_name} placeholders — they'll be replaced with real values at runtime." />
            {/* Preview */}
            <Box>
              <Button size="small" variant="outlined" onClick={generatePreview} disabled={!editing?.response_template}>
                Preview with Example Values
              </Button>
              {previewText && (
                <Card variant="outlined" sx={{ mt: 1, p: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Preview:</Typography>
                  <Typography variant="body2">{previewText}</Typography>
                </Card>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !editing?.question_pattern || !editing?.response_template} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default AIAdminPanel;
