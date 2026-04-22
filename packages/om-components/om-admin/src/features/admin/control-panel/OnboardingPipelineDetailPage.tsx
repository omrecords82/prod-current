/**
 * OnboardingPipelineDetailPage.tsx — Church Onboarding Workspace
 *
 * Full detail page for a single onboarding case:
 * - Church profile + contacts
 * - Discovery notes
 * - Record requirements (sample vs custom)
 * - Provisioning checklist
 * - Email correspondence
 * - Activity timeline
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  ArrowBack as BackIcon,
  Business as ChurchIcon,
  CheckCircle as CheckIcon,
  CheckCircleOutline as CheckOutlineIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Description as TemplateIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  ExpandMore as ExpandIcon,
  History as TimelineIcon,
  ListAlt as ChecklistIcon,
  NoteAdd as NoteIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// ─── Types ──────────────────────────────────────────────────────

interface ChurchDetail {
  id: number;
  name: string;
  city: string | null;
  state_code: string | null;
  phone: string | null;
  website: string | null;
  pipeline_stage: string;
  priority: string | null;
  jurisdiction: string | null;
  jurisdiction_name: string | null;
  current_records_situation: string | null;
  estimated_volume: string | null;
  historical_import_needed: number;
  ocr_assistance_needed: number;
  public_records_needed: number;
  desired_launch_timeline: string | null;
  custom_structure_required: number;
  provisioning_ready: number;
  provisioning_completed: number;
  activation_date: string | null;
  assigned_to_user_id: number | null;
  assigned_to_name: string | null;
  discovery_notes: string | null;
  blockers: string | null;
  crm_notes: string | null;
  stage_label: string;
  stage_color: string;
  provisioned_church_id: number | null;
  created_at: string;
}

interface Contact {
  id: number;
  church_id: number;
  first_name: string;
  last_name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: number;
  notes: string | null;
}

interface RecordRequirement {
  id: number;
  onboarding_id: number;
  record_type: string;
  uses_sample: number;
  sample_template_id: number | null;
  template_name: string | null;
  template_code: string | null;
  custom_required: number;
  custom_notes: string | null;
  review_required: number;
}

interface OnboardingEmail {
  id: number;
  onboarding_id: number;
  email_type: string;
  subject: string;
  recipients: string;
  cc: string | null;
  body: string;
  status: string;
  sent_at: string | null;
  replied_at: string | null;
  notes: string | null;
  creator_name: string | null;
  created_at: string;
}

interface ActivityLog {
  id: number;
  activity_type: string;
  summary: string;
  actor_name: string | null;
  created_at: string;
}

interface SampleTemplate {
  id: number;
  code: string;
  name: string;
  description: string;
  record_type: string;
  fields: { name: string; type: string; required: boolean; label: string }[];
}

interface Checklist {
  contact_complete: boolean;
  record_requirements_set: boolean;
  templates_or_custom: boolean;
  internal_review_done: boolean;
  provisioning_email_sent: boolean;
  response_received: boolean;
  account_created: boolean;
  invite_sent: boolean;
  activated: boolean;
}

// ─── Constants ──────────────────────────────────────────────────

const RECORD_TYPES = ['baptism', 'marriage', 'funeral', 'chrismation', 'other'] as const;
const EMAIL_TYPES = [
  { key: 'welcome', label: 'Welcome / Discovery Follow-up' },
  { key: 'info_request', label: 'Request Missing Info' },
  { key: 'template_confirm', label: 'Template Confirmation' },
  { key: 'custom_review', label: 'Custom Review Needed' },
  { key: 'provisioned', label: 'Account Provisioned' },
  { key: 'reminder', label: 'Reminder / Follow-up' },
];
const EMAIL_STATUSES = ['draft', 'sent', 'replied', 'awaiting_response', 'completed'] as const;

const CHECKLIST_LABELS: Record<keyof Checklist, string> = {
  contact_complete: 'Primary contact completed',
  record_requirements_set: 'Record requirements set',
  templates_or_custom: 'Templates selected or custom documented',
  internal_review_done: 'Internal review complete',
  provisioning_email_sent: 'Provisioning email sent',
  response_received: 'Response received',
  account_created: 'Account created',
  invite_sent: 'Invite sent',
  activated: 'Activated',
};

// ─── Component ──────────────────────────────────────────────────

const OnboardingPipelineDetailPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(0);
  const [church, setChurch] = useState<ChurchDetail | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [requirements, setRequirements] = useState<RecordRequirement[]>([]);
  const [emails, setEmails] = useState<OnboardingEmail[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [templates, setTemplates] = useState<SampleTemplate[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<{ type: string; subject: string; body: string }[]>([]);

  // Edit states
  const [discoveryNotes, setDiscoveryNotes] = useState('');
  const [blockers, setBlockers] = useState('');
  const [editingDiscovery, setEditingDiscovery] = useState(false);

  // Email composer
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ email_type: 'welcome', subject: '', recipients: '', cc: '', body: '', notes: '' });

  // Requirement dialog
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [reqForm, setReqForm] = useState({
    record_type: 'baptism' as string,
    uses_sample: false,
    sample_template_id: null as number | null,
    custom_required: false,
    custom_notes: '',
    review_required: false,
  });

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detail, tmpl, eTmpl] = await Promise.all([
        apiClient.get(`/admin/onboarding-pipeline/${id}/detail`),
        apiClient.get('/admin/onboarding-pipeline/templates'),
        apiClient.get('/admin/onboarding-pipeline/email-templates'),
      ]);
      const d = detail as any;
      setChurch(d.church);
      setContacts(d.contacts || []);
      setRequirements(d.requirements || []);
      setEmails(d.emails || []);
      setActivities(d.activities || []);
      setChecklist(d.checklist || null);
      setDiscoveryNotes(d.church?.discovery_notes || '');
      setBlockers(d.church?.blockers || '');
      setTemplates((tmpl as any).templates || []);
      setEmailTemplates((eTmpl as any).templates || []);
    } catch (err) {
      console.error('Failed to load detail:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const saveField = async (fields: Record<string, any>) => {
    if (!id) return;
    setSaving(true);
    try {
      await apiClient.put(`/admin/onboarding-pipeline/${id}`, fields);
      await fetchDetail();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveRequirement = async () => {
    if (!id) return;
    try {
      await apiClient.post(`/admin/onboarding-pipeline/${id}/requirements`, reqForm);
      setReqDialogOpen(false);
      await fetchDetail();
    } catch (err) {
      console.error('Save requirement failed:', err);
    }
  };

  const deleteRequirement = async (reqId: number) => {
    if (!id) return;
    try {
      await apiClient.delete(`/admin/onboarding-pipeline/${id}/requirements/${reqId}`);
      await fetchDetail();
    } catch (err) {
      console.error('Delete requirement failed:', err);
    }
  };

  const openEmailComposer = (type?: string) => {
    const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
    const template = emailTemplates.find(t => t.type === (type || 'welcome'));
    const churchName = church?.name || '';
    const contactName = primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name}` : 'Parish Administrator';

    const subject = (template?.subject || '').replace(/{church_name}/g, churchName).replace(/{contact_name}/g, contactName);
    const body = (template?.body || '').replace(/{church_name}/g, churchName).replace(/{contact_name}/g, contactName).replace(/{custom_message}/g, '');

    setEmailForm({
      email_type: type || 'welcome',
      subject,
      recipients: primaryContact?.email || '',
      cc: '',
      body,
      notes: '',
    });
    setEmailDialogOpen(true);
  };

  const saveEmail = async (status: string = 'draft') => {
    if (!id) return;
    try {
      await apiClient.post(`/admin/onboarding-pipeline/${id}/emails`, { ...emailForm, status });
      setEmailDialogOpen(false);
      await fetchDetail();
    } catch (err) {
      console.error('Save email failed:', err);
    }
  };

  const updateEmailStatus = async (emailId: number, status: string) => {
    if (!id) return;
    try {
      const updates: Record<string, any> = { status };
      if (status === 'sent') updates.sent_at = new Date().toISOString();
      if (status === 'replied') updates.replied_at = new Date().toISOString();
      await apiClient.put(`/admin/onboarding-pipeline/${id}/emails/${emailId}`, updates);
      await fetchDetail();
    } catch (err) {
      console.error('Update email failed:', err);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <PageContainer title="Loading...">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
      </PageContainer>
    );
  }

  if (!church) {
    return (
      <PageContainer title="Not Found">
        <Alert severity="error">Church onboarding record not found.</Alert>
      </PageContainer>
    );
  }

  const BCrumb = [
    { to: '/admin/control-panel', title: 'Control Panel' },
    { to: '/admin/control-panel/onboarding-pipeline', title: 'Onboarding Pipeline' },
    { title: church.name },
  ];

  return (
    <PageContainer title={`Onboarding: ${church.name}`} description="Church onboarding workspace">
      <Breadcrumb title={church.name} items={BCrumb} />

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={2} alignItems="center">
            <Button startIcon={<BackIcon />} variant="text" onClick={() => navigate('/admin/control-panel/onboarding-pipeline')}>
              Back
            </Button>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <ChurchIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>{church.name}</Typography>
                <Chip
                  label={church.stage_label || church.pipeline_stage}
                  size="small"
                  sx={{
                    bgcolor: church.stage_color ? alpha(church.stage_color, 0.15) : undefined,
                    color: church.stage_color,
                    fontWeight: 600,
                  }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {[church.city, church.state_code, church.jurisdiction_name].filter(Boolean).join(' · ')}
                {church.phone && ` · ${church.phone}`}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh"><IconButton onClick={fetchDetail}><RefreshIcon /></IconButton></Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Overview" />
          <Tab label="Record Requirements" />
          <Tab label="Email Workflow" />
          <Tab label="Activity" />
        </Tabs>
      </Box>

      {/* Tab 0: Overview */}
      {tab === 0 && (
        <Grid container spacing={3}>
          {/* Left: Church Info + Discovery */}
          <Grid item xs={12} md={8}>
            {/* Contacts */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Contacts" avatar={<PersonIcon />} titleTypographyProps={{ variant: 'h6' }} />
              <CardContent>
                {contacts.length === 0 ? (
                  <Typography color="text.secondary">No contacts recorded yet.</Typography>
                ) : (
                  <Stack spacing={2}>
                    {contacts.map(c => (
                      <Paper key={c.id} variant="outlined" sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography fontWeight={600}>
                              {c.first_name} {c.last_name}
                              {c.is_primary ? <Chip label="Primary" size="small" color="primary" sx={{ ml: 1 }} /> : null}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {[c.role, c.email, c.phone].filter(Boolean).join(' · ')}
                            </Typography>
                            {c.notes && <Typography variant="body2" sx={{ mt: 0.5 }}>{c.notes}</Typography>}
                          </Box>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Discovery Notes */}
            <Card sx={{ mb: 3 }}>
              <CardHeader
                title="Discovery & Qualification"
                avatar={<NoteIcon />}
                titleTypographyProps={{ variant: 'h6' }}
                action={
                  editingDiscovery ? (
                    <Button
                      size="small"
                      startIcon={<SaveIcon />}
                      onClick={async () => {
                        await saveField({ discovery_notes: discoveryNotes, blockers });
                        setEditingDiscovery(false);
                      }}
                      disabled={saving}
                    >
                      Save
                    </Button>
                  ) : (
                    <IconButton size="small" onClick={() => setEditingDiscovery(true)}><EditIcon /></IconButton>
                  )
                }
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Records Situation</Typography>
                    <Typography variant="body2">{church.current_records_situation || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Estimated Volume</Typography>
                    <Typography variant="body2">{church.estimated_volume || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">Launch Timeline</Typography>
                    <Typography variant="body2">{church.desired_launch_timeline || '—'}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Chip label="Historical Import" size="small" color={church.historical_import_needed ? 'success' : 'default'} variant={church.historical_import_needed ? 'filled' : 'outlined'} />
                  </Grid>
                  <Grid item xs={4}>
                    <Chip label="OCR Assistance" size="small" color={church.ocr_assistance_needed ? 'success' : 'default'} variant={church.ocr_assistance_needed ? 'filled' : 'outlined'} />
                  </Grid>
                  <Grid item xs={4}>
                    <Chip label="Public Records Page" size="small" color={church.public_records_needed ? 'success' : 'default'} variant={church.public_records_needed ? 'filled' : 'outlined'} />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Discovery Notes</Typography>
                  {editingDiscovery ? (
                    <TextField
                      fullWidth multiline rows={4} value={discoveryNotes}
                      onChange={(e) => setDiscoveryNotes(e.target.value)}
                      placeholder="Notes from discovery conversations..."
                    />
                  ) : (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {church.discovery_notes || 'No notes yet.'}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Blockers / Risks</Typography>
                  {editingDiscovery ? (
                    <TextField
                      fullWidth multiline rows={2} value={blockers}
                      onChange={(e) => setBlockers(e.target.value)}
                      placeholder="Any blockers or risks..."
                    />
                  ) : (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {church.blockers || 'None identified.'}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Right: Checklist + Stage */}
          <Grid item xs={12} md={4}>
            {/* Provisioning Checklist */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Provisioning Checklist" avatar={<ChecklistIcon />} titleTypographyProps={{ variant: 'h6' }} />
              <CardContent>
                {checklist && (
                  <List dense disablePadding>
                    {(Object.keys(CHECKLIST_LABELS) as (keyof Checklist)[]).map(key => (
                      <ListItem key={key} disableGutters>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          {checklist[key] ? (
                            <CheckIcon color="success" fontSize="small" />
                          ) : (
                            <CheckOutlineIcon color="disabled" fontSize="small" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={CHECKLIST_LABELS[key]}
                          primaryTypographyProps={{
                            variant: 'body2',
                            sx: { textDecoration: checklist[key] ? 'line-through' : 'none', color: checklist[key] ? 'text.secondary' : 'text.primary' }
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary">
                  {checklist ? `${Object.values(checklist).filter(Boolean).length} / ${Object.keys(checklist).length} complete` : 'Loading...'}
                </Typography>
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {!church.provisioning_ready && (
                    <Button
                      size="small" variant="outlined" color="info" fullWidth
                      onClick={() => saveField({ provisioning_ready: 1 })}
                      disabled={saving}
                    >
                      Mark Ready for Provisioning
                    </Button>
                  )}
                  {church.provisioning_ready && !church.provisioning_completed && (
                    <Button
                      size="small" variant="contained" color="success" fullWidth
                      onClick={() => saveField({ provisioning_completed: 1, activation_date: new Date().toISOString().split('T')[0] })}
                      disabled={saving}
                    >
                      Mark Active / Provisioned
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Stage Control */}
            <Card>
              <CardHeader title="Pipeline Stage" titleTypographyProps={{ variant: 'h6' }} />
              <CardContent>
                <FormControl fullWidth size="small">
                  <InputLabel>Stage</InputLabel>
                  <Select
                    value={church.pipeline_stage}
                    label="Stage"
                    onChange={(e) => saveField({ pipeline_stage: e.target.value })}
                  >
                    <MenuItem value="new_lead">New Lead</MenuItem>
                    <MenuItem value="interested">Interested</MenuItem>
                    <MenuItem value="qualified">Qualified</MenuItem>
                    <MenuItem value="proposal">Proposal</MenuItem>
                    <MenuItem value="negotiation">Negotiation</MenuItem>
                    <MenuItem value="awaiting_info">Awaiting Info</MenuItem>
                    <MenuItem value="record_review">Record Review</MenuItem>
                    <MenuItem value="ready_provision">Ready to Provision</MenuItem>
                    <MenuItem value="won">Won</MenuItem>
                    <MenuItem value="provisioning">Provisioning</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="setup_complete">Setup Complete</MenuItem>
                    <MenuItem value="blocked">Blocked</MenuItem>
                    <MenuItem value="closed_lost">Closed / Lost</MenuItem>
                  </Select>
                </FormControl>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">Created: {formatDate(church.created_at)}</Typography>
                  {church.activation_date && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Activated: {formatDate(church.activation_date)}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Record Requirements */}
      {tab === 1 && (
        <Card>
          <CardHeader
            title="Record Structure Requirements"
            avatar={<TemplateIcon />}
            titleTypographyProps={{ variant: 'h6' }}
            action={
              <Button size="small" variant="contained" onClick={() => {
                setReqForm({ record_type: 'baptism', uses_sample: false, sample_template_id: null, custom_required: false, custom_notes: '', review_required: false });
                setReqDialogOpen(true);
              }}>
                Add Requirement
              </Button>
            }
          />
          <CardContent>
            {requirements.length === 0 ? (
              <Alert severity="info">No record requirements set yet. Add requirements to specify which record types this church needs.</Alert>
            ) : (
              <Stack spacing={2}>
                {requirements.map(req => (
                  <Paper key={req.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={600} sx={{ textTransform: 'capitalize' }}>{req.record_type}</Typography>
                          {req.uses_sample ? (
                            <Chip label={`Template: ${req.template_name || 'Standard'}`} size="small" color="success" variant="outlined" />
                          ) : req.custom_required ? (
                            <Chip label="Custom Structure" size="small" color="warning" variant="outlined" />
                          ) : null}
                          {req.review_required ? (
                            <Chip label="Review Required" size="small" color="error" variant="outlined" />
                          ) : null}
                        </Stack>
                        {req.custom_notes && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                            {req.custom_notes}
                          </Typography>
                        )}
                      </Box>
                      <IconButton size="small" color="error" onClick={() => deleteRequirement(req.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}

            {/* Available Templates Preview */}
            <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Available Sample Templates</Typography>
            <Grid container spacing={2}>
              {templates.map(tmpl => (
                <Grid item xs={12} sm={6} key={tmpl.id}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandIcon />}>
                      <Box>
                        <Typography fontWeight={600}>{tmpl.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{tmpl.record_type} · {tmpl.fields.length} fields</Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" sx={{ mb: 1 }}>{tmpl.description}</Typography>
                      <Stack spacing={0.5}>
                        {tmpl.fields.map(f => (
                          <Typography key={f.name} variant="caption">
                            {f.required ? '●' : '○'} {f.label} ({f.type})
                          </Typography>
                        ))}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Email Workflow */}
      {tab === 2 && (
        <Card>
          <CardHeader
            title="Email Correspondence"
            avatar={<EmailIcon />}
            titleTypographyProps={{ variant: 'h6' }}
            action={
              <Stack direction="row" spacing={1}>
                {EMAIL_TYPES.map(et => (
                  <Button key={et.key} size="small" variant="outlined" onClick={() => openEmailComposer(et.key)}>
                    {et.label}
                  </Button>
                ))}
              </Stack>
            }
          />
          <CardContent>
            {emails.length === 0 ? (
              <Alert severity="info">No emails yet. Use the buttons above to draft a formal email.</Alert>
            ) : (
              <Stack spacing={2}>
                {emails.map(email => (
                  <Paper key={email.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <Chip
                            label={email.email_type.replace('_', ' ')}
                            size="small"
                            sx={{ textTransform: 'capitalize' }}
                          />
                          <Chip
                            label={email.status.replace('_', ' ')}
                            size="small"
                            color={
                              email.status === 'completed' ? 'success' :
                              email.status === 'sent' ? 'info' :
                              email.status === 'replied' ? 'primary' :
                              email.status === 'awaiting_response' ? 'warning' : 'default'
                            }
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(email.created_at)}
                            {email.creator_name && ` by ${email.creator_name}`}
                          </Typography>
                        </Stack>
                        <Typography fontWeight={600}>{email.subject}</Typography>
                        <Typography variant="body2" color="text.secondary">To: {email.recipients}</Typography>
                        <Accordion sx={{ mt: 1 }}>
                          <AccordionSummary expandIcon={<ExpandIcon />}>
                            <Typography variant="body2">View email body</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{email.body}</Typography>
                          </AccordionDetails>
                        </Accordion>
                      </Box>
                      <Stack direction="row" spacing={0.5} sx={{ ml: 2 }}>
                        {email.status === 'draft' && (
                          <Tooltip title="Mark as Sent">
                            <IconButton size="small" color="primary" onClick={() => updateEmailStatus(email.id, 'sent')}>
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {email.status === 'sent' && (
                          <Tooltip title="Mark as Replied">
                            <IconButton size="small" color="success" onClick={() => updateEmailStatus(email.id, 'replied')}>
                              <CheckIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(email.status === 'sent' || email.status === 'awaiting_response') && (
                          <Tooltip title="Mark Awaiting Response">
                            <IconButton size="small" color="warning" onClick={() => updateEmailStatus(email.id, 'awaiting_response')}>
                              <TimelineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {email.status !== 'completed' && (
                          <Tooltip title="Mark Completed">
                            <IconButton size="small" onClick={() => updateEmailStatus(email.id, 'completed')}>
                              <CheckOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Activity Timeline */}
      {tab === 3 && (
        <Card>
          <CardHeader title="Activity Timeline" avatar={<TimelineIcon />} titleTypographyProps={{ variant: 'h6' }} />
          <CardContent>
            {activities.length === 0 ? (
              <Typography color="text.secondary">No activity recorded yet.</Typography>
            ) : (
              <Stack spacing={1}>
                {activities.map(act => (
                  <Paper key={act.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Chip label={act.activity_type.replace('_', ' ')} size="small" sx={{ textTransform: 'capitalize', minWidth: 100 }} />
                      <Typography variant="body2" sx={{ flex: 1 }}>{act.summary}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                        {formatDateTime(act.created_at)}
                        {act.actor_name && ` · ${act.actor_name}`}
                      </Typography>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* Email Composer Dialog */}
      <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Compose Email</Typography>
            <IconButton size="small" onClick={() => setEmailDialogOpen(false)}><CloseIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Email Type</InputLabel>
              <Select
                value={emailForm.email_type}
                label="Email Type"
                onChange={(e) => {
                  const type = e.target.value;
                  const template = emailTemplates.find(t => t.type === type);
                  const churchName = church?.name || '';
                  const primaryContact = contacts.find(c => c.is_primary) || contacts[0];
                  const contactName = primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name}` : 'Parish Administrator';
                  setEmailForm(prev => ({
                    ...prev,
                    email_type: type,
                    subject: (template?.subject || '').replace(/{church_name}/g, churchName).replace(/{contact_name}/g, contactName),
                    body: (template?.body || '').replace(/{church_name}/g, churchName).replace(/{contact_name}/g, contactName).replace(/{custom_message}/g, ''),
                  }));
                }}
              >
                {EMAIL_TYPES.map(et => (
                  <MenuItem key={et.key} value={et.key}>{et.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField size="small" label="To" fullWidth value={emailForm.recipients} onChange={(e) => setEmailForm(f => ({ ...f, recipients: e.target.value }))} />
            <TextField size="small" label="CC" fullWidth value={emailForm.cc} onChange={(e) => setEmailForm(f => ({ ...f, cc: e.target.value }))} />
            <TextField size="small" label="Subject" fullWidth value={emailForm.subject} onChange={(e) => setEmailForm(f => ({ ...f, subject: e.target.value }))} />
            <TextField label="Body" fullWidth multiline rows={12} value={emailForm.body} onChange={(e) => setEmailForm(f => ({ ...f, body: e.target.value }))} />
            <TextField size="small" label="Internal Notes" fullWidth multiline rows={2} value={emailForm.notes} onChange={(e) => setEmailForm(f => ({ ...f, notes: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
          <Button variant="outlined" onClick={() => saveEmail('draft')}>Save Draft</Button>
          <Button variant="contained" startIcon={<SendIcon />} onClick={() => saveEmail('sent')}>Mark as Sent</Button>
        </DialogActions>
      </Dialog>

      {/* Record Requirement Dialog */}
      <Dialog open={reqDialogOpen} onClose={() => setReqDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Record Requirement</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Record Type</InputLabel>
              <Select value={reqForm.record_type} label="Record Type" onChange={(e) => setReqForm(f => ({ ...f, record_type: e.target.value }))}>
                {RECORD_TYPES.map(rt => (
                  <MenuItem key={rt} value={rt} sx={{ textTransform: 'capitalize' }}>{rt}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={reqForm.uses_sample} onChange={(e) => setReqForm(f => ({ ...f, uses_sample: e.target.checked, custom_required: e.target.checked ? false : f.custom_required }))} />}
              label="Use Sample Template"
            />
            {reqForm.uses_sample && (
              <FormControl fullWidth size="small">
                <InputLabel>Template</InputLabel>
                <Select
                  value={reqForm.sample_template_id || ''}
                  label="Template"
                  onChange={(e) => setReqForm(f => ({ ...f, sample_template_id: e.target.value ? Number(e.target.value) : null }))}
                >
                  {templates.filter(t => t.record_type === reqForm.record_type).map(t => (
                    <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControlLabel
              control={<Switch checked={reqForm.custom_required} onChange={(e) => setReqForm(f => ({ ...f, custom_required: e.target.checked, uses_sample: e.target.checked ? false : f.uses_sample }))} />}
              label="Custom Structure Required"
            />
            {reqForm.custom_required && (
              <TextField
                label="Custom Notes" fullWidth multiline rows={3}
                value={reqForm.custom_notes}
                onChange={(e) => setReqForm(f => ({ ...f, custom_notes: e.target.value }))}
                placeholder="Describe custom field requirements..."
              />
            )}
            <FormControlLabel
              control={<Switch checked={reqForm.review_required} onChange={(e) => setReqForm(f => ({ ...f, review_required: e.target.checked }))} />}
              label="Review Required Before Provisioning"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReqDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveRequirement}>Save Requirement</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default OnboardingPipelineDetailPage;
