/**
 * ChurchLifecycleDetailPage.tsx — Unified Church Detail View
 *
 * Combines CRM contact management (contacts, activities, follow-ups)
 * with onboarding detail (tokens, members, setup checklist) into
 * a single detail page for any church in the lifecycle pipeline.
 *
 * PP-0003 Step 4 | CS-0050
 */

import { apiClient } from '@/api/utils/axiosInstance';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Snackbar,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { COLOR } from './ChurchLifecycleDetailPage/constants';
import type { CRMContact, SnackState } from './ChurchLifecycleDetailPage/types';
import OverviewPanel from './ChurchLifecycleDetailPage/OverviewPanel';
import ContactsPanel from './ChurchLifecycleDetailPage/ContactsPanel';
import ActivityPanel from './ChurchLifecycleDetailPage/ActivityPanel';
import FollowUpsPanel from './ChurchLifecycleDetailPage/FollowUpsPanel';
import RequirementsPanel from './ChurchLifecycleDetailPage/RequirementsPanel';
import EmailWorkflowPanel from './ChurchLifecycleDetailPage/EmailWorkflowPanel';
import OnboardingPanel from './ChurchLifecycleDetailPage/OnboardingPanel';
import TimelinePanel from './ChurchLifecycleDetailPage/TimelinePanel';
import ChurchLifecycleDialogs from './ChurchLifecycleDetailPage/ChurchLifecycleDialogs';
import { useChurchLifecycleData } from './ChurchLifecycleDetailPage/useChurchLifecycleData';
import {
  dialogReducer,
  initialDialogState,
  emptyContactForm,
  emptyActivityForm,
  emptyFollowUpForm,
  emptyReqForm,
  type ContactForm,
  type ActivityForm,
  type FollowUpForm,
  type ReqForm,
  type EmailForm,
  type RejectDialog,
} from './ChurchLifecycleDetailPage/dialogState';
import {
  inlineEditingReducer,
  initialInlineEditingState,
} from './ChurchLifecycleDetailPage/inlineEditing';



/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ChurchLifecycleDetailPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const { churchId } = useParams<{ churchId: string }>();

  /* --- data hook --------------------------------------------------- */
  const data = useChurchLifecycleData(churchId);
  const {
    source, unifiedStage, crm, onboarded, contacts, activities, followUps,
    members, tokens, checklist, stages, loading, error,
    pipelineRequirements, pipelineEmails, pipelineActivities, provisionChecklist,
    sampleTemplates, emailTemplates, initialNotes, fetchDetail,
  } = data;

  /* --- tab --------------------------------------------------------- */
  const [tab, setTab] = useState(0);

  /* --- notes ------------------------------------------------------- */
  const [notes, setNotes] = useState('');
  const [notesOriginal, setNotesOriginal] = useState('');

  // Sync local notes drafts when the data hook reloads
  useEffect(() => {
    setNotes(initialNotes);
    setNotesOriginal(initialNotes);
  }, [initialNotes]);

  /* --- snack + action loading flags -------------------------------- */
  const [snack, setSnack] = useState<SnackState>({ open: false, message: '', severity: 'success' });
  const [actionFlags, setActionFlags] = useState({
    notesSaving: false,
    togglingSetup: false,
    generatingToken: false,
    deactivatingToken: null as number | null,
    actionLoading: null as number | null,
    pipelineSaving: false,
  });
  const setFlag = useCallback(
    <K extends keyof typeof actionFlags>(key: K, value: typeof actionFlags[K]) => {
      setActionFlags(prev => ({ ...prev, [key]: value }));
    },
    [],
  );
  const { notesSaving, togglingSetup, generatingToken, deactivatingToken, actionLoading, pipelineSaving } = actionFlags;

  /* --- dialog reducer (covers 14 useStates) ------------------------ */
  const [dialog, dispatchDialog] = useReducer(dialogReducer, initialDialogState);

  // SetStateAction-compatible wrappers so ChurchLifecycleDialogs keeps its
  // existing prop interface and inline updaters (`setForm(f => ...)`).
  const setContactDialogOpen = useCallback((value: boolean) => dispatchDialog({ type: 'setContactDialogOpen', value }), []);
  const setEditingContact = useCallback((value: CRMContact | null) => dispatchDialog({ type: 'setEditingContact', value }), []);
  const setContactForm: React.Dispatch<React.SetStateAction<ContactForm>> = useCallback(
    (value) => dispatchDialog({ type: 'setContactForm', value }), [],
  );
  const setActivityDialogOpen = useCallback((value: boolean) => dispatchDialog({ type: 'setActivityDialogOpen', value }), []);
  const setActivityForm: React.Dispatch<React.SetStateAction<ActivityForm>> = useCallback(
    (value) => dispatchDialog({ type: 'setActivityForm', value }), [],
  );
  const setFollowUpDialogOpen = useCallback((value: boolean) => dispatchDialog({ type: 'setFollowUpDialogOpen', value }), []);
  const setFollowUpForm: React.Dispatch<React.SetStateAction<FollowUpForm>> = useCallback(
    (value) => dispatchDialog({ type: 'setFollowUpForm', value }), [],
  );
  const setStageDialogOpen = useCallback((value: boolean) => dispatchDialog({ type: 'setStageDialogOpen', value }), []);
  const setNewStage = useCallback((value: string) => dispatchDialog({ type: 'setNewStage', value }), []);
  const setRejectDialog = useCallback((value: RejectDialog) => dispatchDialog({ type: 'setRejectDialog', value }), []);
  const setRejectReason = useCallback((value: string) => dispatchDialog({ type: 'setRejectReason', value }), []);
  const setReqDialogOpen = useCallback((value: boolean) => dispatchDialog({ type: 'setReqDialogOpen', value }), []);
  const setReqForm: React.Dispatch<React.SetStateAction<ReqForm>> = useCallback(
    (value) => dispatchDialog({ type: 'setReqForm', value }), [],
  );
  const setEmailDialogOpen = useCallback((value: boolean) => dispatchDialog({ type: 'setEmailDialogOpen', value }), []);
  const setEmailForm: React.Dispatch<React.SetStateAction<EmailForm>> = useCallback(
    (value) => dispatchDialog({ type: 'setEmailForm', value }), [],
  );

  // Destructure for read-side ergonomics
  const {
    contactDialogOpen, editingContact, contactForm,
    activityDialogOpen, activityForm,
    followUpDialogOpen, followUpForm,
    stageDialogOpen, newStage,
    rejectDialog, rejectReason,
    reqDialogOpen, reqForm,
    emailDialogOpen, emailForm,
  } = dialog;

  /* --- inline editing reducer -------------------------------------- */
  const [inlineEditing, dispatchInlineEditing] = useReducer(inlineEditingReducer, initialInlineEditingState);
  const { editingDiscovery, discoveryDraft, editingBlockers, blockersDraft } = inlineEditing;
  const setEditingDiscovery = useCallback((value: boolean) => dispatchInlineEditing({ type: 'setEditingDiscovery', value }), []);
  const setDiscoveryDraft = useCallback((value: string) => dispatchInlineEditing({ type: 'setDiscoveryDraft', value }), []);
  const setEditingBlockers = useCallback((value: boolean) => dispatchInlineEditing({ type: 'setEditingBlockers', value }), []);
  const setBlockersDraft = useCallback((value: string) => dispatchInlineEditing({ type: 'setBlockersDraft', value }), []);

  const churchName = crm?.name || onboarded?.name || 'Church Detail';

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { to: '/admin/control-panel/church-lifecycle', title: 'Church Lifecycle' },
    { title: churchName },
  ];

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  const showToast = (message: string, severity: 'success' | 'error' | 'info' = 'success') => {
    setSnack({ open: true, message, severity });
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return d; }
  };

  const formatDateTime = (d: string | null) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  const timeAgo = (d: string) => {
    const ms = Date.now() - new Date(d).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const copyToClipboard = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text).then(() => showToast(`${label} to clipboard`, 'info'));
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

  const stageInfo = stages.find(s => s.stage_key === unifiedStage);
  const stageColor = stageInfo?.color || '#9e9e9e';
  const stageLabel = stageInfo?.label || unifiedStage;

  const crmId = crm?.id;
  const onboardedId = onboarded?.id;
  const hasCrm = source === 'crm' || source === 'both';
  const hasOnboarding = source === 'onboarded' || source === 'both';

  const totalMembers = members.length;
  const activeMembers = members.filter(m => !m.is_locked).length;
  const pendingMembers = members.filter(m => m.is_locked && m.lockout_reason?.toLowerCase().includes('pending')).length;

  /* ------------------------------------------------------------------ */
  /*  CRM Actions                                                        */
  /* ------------------------------------------------------------------ */

  const handleSaveNotes = async () => {
    if (!crmId && !onboardedId) return;
    setFlag('notesSaving', true);
    try {
      if (crmId) {
        await apiClient.put(`/api/crm/churches/${crmId}`, { crm_notes: notes });
      } else if (onboardedId) {
        await apiClient.post(`/api/admin/church-onboarding/${onboardedId}/update-notes`, { notes });
      }
      setNotesOriginal(notes);
      showToast('Notes saved');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setFlag('notesSaving', false);
    }
  };

  const handleSaveContact = async () => {
    if (!crmId || !contactForm.first_name) return;
    try {
      const payload = { ...contactForm, is_primary: contactForm.is_primary ? 1 : 0 };
      if (editingContact) {
        await apiClient.put(`/api/crm/contacts/${editingContact.id}`, payload);
      } else {
        await apiClient.post(`/api/crm/churches/${crmId}/contacts`, payload);
      }
      showToast(editingContact ? 'Contact updated' : 'Contact added');
      setContactDialogOpen(false);
      setEditingContact(null);
      setContactForm(emptyContactForm);
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    try {
      await apiClient.delete(`/api/crm/contacts/${contactId}`);
      showToast('Contact deleted');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleLogActivity = async () => {
    if (!crmId || !activityForm.subject) return;
    try {
      await apiClient.post(`/api/crm/churches/${crmId}/activities`, activityForm);
      showToast('Activity logged');
      setActivityDialogOpen(false);
      setActivityForm(emptyActivityForm);
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddFollowUp = async () => {
    if (!crmId || !followUpForm.due_date || !followUpForm.subject) return;
    try {
      await apiClient.post(`/api/crm/churches/${crmId}/follow-ups`, followUpForm);
      showToast('Follow-up scheduled');
      setFollowUpDialogOpen(false);
      setFollowUpForm(emptyFollowUpForm);
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCompleteFollowUp = async (id: number) => {
    try {
      await apiClient.put(`/api/crm/follow-ups/${id}`, { status: 'completed' });
      showToast('Follow-up completed');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleStageChange = async () => {
    if (!churchId || !newStage) return;
    try {
      await apiClient.put(`/api/admin/church-lifecycle/${churchId}/stage`, { stage: newStage });
      showToast(`Stage changed to ${newStage}`);
      setStageDialogOpen(false);
      setNewStage('');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Onboarding Actions                                                 */
  /* ------------------------------------------------------------------ */

  const handleToggleSetup = async () => {
    if (!onboardedId) return;
    setFlag('togglingSetup', true);
    try {
      await apiClient.post(`/api/admin/church-onboarding/${onboardedId}/toggle-setup`);
      showToast('Setup status toggled');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setFlag('togglingSetup', false);
    }
  };

  const handleGenerateToken = async () => {
    if (!onboardedId) return;
    setFlag('generatingToken', true);
    try {
      await apiClient.post(`/api/admin/church-onboarding/${onboardedId}/send-token`);
      showToast('Token generated');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setFlag('generatingToken', false);
    }
  };

  const handleDeactivateToken = async (tokenId: number) => {
    if (!onboardedId) return;
    setFlag('deactivatingToken', tokenId);
    try {
      await apiClient.delete(`/api/admin/churches/${onboardedId}/registration-token`);
      showToast('Token deactivated');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setFlag('deactivatingToken', null);
    }
  };

  const handleApproveMember = async (userId: number, email: string) => {
    setFlag('actionLoading', userId);
    try {
      await apiClient.post(`/api/admin/users/${userId}/unlock`);
      showToast(`${email} approved`);
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setFlag('actionLoading', null);
    }
  };

  const handleRejectMember = async () => {
    if (!rejectDialog.userId) return;
    setFlag('actionLoading', rejectDialog.userId);
    try {
      await apiClient.post(`/api/admin/users/${rejectDialog.userId}/lockout`, {
        reason: `Registration rejected: ${rejectReason || 'Not approved by admin'}`,
      });
      showToast(`${rejectDialog.email} rejected`);
      setRejectDialog({ open: false, userId: null, email: '' });
      setRejectReason('');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setFlag('actionLoading', null);
    }
  };

  const hasActiveToken = tokens.some(t => t.is_active);

  /* ------------------------------------------------------------------ */
  /*  Pipeline CRUD actions                                              */
  /* ------------------------------------------------------------------ */

  const handleSaveRequirement = async () => {
    if (!crmId) return;
    setFlag('pipelineSaving', true);
    try {
      await apiClient.post(`/api/admin/onboarding-pipeline/${crmId}/requirements`, reqForm);
      showToast('Requirement added');
      setReqDialogOpen(false);
      setReqForm(emptyReqForm);
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setFlag('pipelineSaving', false);
    }
  };

  const handleDeleteRequirement = async (reqId: number) => {
    if (!crmId) return;
    try {
      await apiClient.delete(`/api/admin/onboarding-pipeline/${crmId}/requirements/${reqId}`);
      showToast('Requirement removed');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const openEmailComposer = (type?: string) => {
    const primaryContact = contacts.find(c => c.is_primary === 1) || contacts[0];
    const template = emailTemplates.find(t => t.type === (type || 'welcome'));
    const name = churchName;
    const contactName = primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name || ''}`.trim() : 'Parish Administrator';

    const subject = (template?.subject || '').replace(/{church_name}/g, name).replace(/{contact_name}/g, contactName);
    const body = (template?.body || '').replace(/{church_name}/g, name).replace(/{contact_name}/g, contactName).replace(/{custom_message}/g, '');

    setEmailForm({ email_type: type || 'welcome', subject, recipients: primaryContact?.email || '', cc: '', body, notes: '' });
    setEmailDialogOpen(true);
  };

  const handleSaveEmail = async (status: string = 'draft') => {
    if (!crmId) return;
    setFlag('pipelineSaving', true);
    try {
      await apiClient.post(`/api/admin/onboarding-pipeline/${crmId}/emails`, { ...emailForm, status });
      showToast(status === 'sent' ? 'Email marked as sent' : 'Draft saved');
      setEmailDialogOpen(false);
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setFlag('pipelineSaving', false);
    }
  };

  const handleUpdateEmailStatus = async (emailId: number, status: string) => {
    if (!crmId) return;
    try {
      const updates: Record<string, any> = { status };
      if (status === 'sent') updates.sent_at = new Date().toISOString();
      if (status === 'replied') updates.replied_at = new Date().toISOString();
      await apiClient.put(`/api/admin/onboarding-pipeline/${crmId}/emails/${emailId}`, updates);
      showToast(`Email marked as ${status.replace('_', ' ')}`);
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveInlineField = async (field: string, value: string) => {
    if (!crmId) return;
    setFlag('pipelineSaving', true);
    try {
      await apiClient.put(`/api/admin/onboarding-pipeline/${crmId}`, { [field]: value });
      showToast('Updated successfully');
      if (field === 'discovery_notes') setEditingDiscovery(false);
      if (field === 'blockers') setEditingBlockers(false);
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setFlag('pipelineSaving', false);
    }
  };

  const handleMarkProvisioning = async (field: string, value: any) => {
    if (!crmId) return;
    setFlag('pipelineSaving', true);
    try {
      const body: Record<string, any> = { [field]: value };
      if (field === 'provisioning_completed') {
        body.activation_date = new Date().toISOString().split('T')[0];
      }
      await apiClient.put(`/api/admin/onboarding-pipeline/${crmId}`, body);
      showToast(field === 'provisioning_ready' ? 'Marked ready for provisioning' : 'Marked as active');
      fetchDetail();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setFlag('pipelineSaving', false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Tab definitions                                                    */
  /* ------------------------------------------------------------------ */

  const tabDefs: { label: string; badge?: number; show: boolean }[] = [
    { label: 'Overview', show: true },
    { label: 'Contacts', badge: contacts.length, show: hasCrm },
    { label: 'Activity', badge: activities.length, show: hasCrm },
    { label: 'Follow-ups', badge: followUps.filter(f => f.status === 'pending').length, show: hasCrm },
    { label: 'Requirements', badge: pipelineRequirements.length, show: hasCrm },
    { label: 'Email Workflow', badge: pipelineEmails.length, show: hasCrm },
    { label: 'Onboarding', show: hasOnboarding },
    { label: 'Timeline', badge: activities.length + pipelineActivities.length + pipelineEmails.length, show: true },
  ];
  const visibleTabs = tabDefs.filter(t => t.show);

  const sectionPaper = (children: React.ReactNode) => (
    <Paper
      elevation={0}
      sx={{
        p: 3, mb: 2.5,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        borderRadius: 2,
      }}
    >
      {children}
    </Paper>
  );






  /* ------------------------------------------------------------------ */
  /*  Main Render                                                        */
  /* ------------------------------------------------------------------ */

  return (
    <PageContainer title="Church Lifecycle Detail" description="Unified church detail view">
      <Breadcrumb title={churchName} items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* ---- Header ------------------------------------------------ */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton
            onClick={() => navigate('/admin/control-panel/church-lifecycle')}
            sx={{ bgcolor: alpha(COLOR, 0.08), color: COLOR }}
          >
            <BackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h4" fontWeight={700}>{churchName}</Typography>
              <Chip
                label={stageLabel}
                size="small"
                sx={{
                  bgcolor: alpha(stageColor, isDark ? 0.2 : 0.12),
                  color: stageColor,
                  fontWeight: 600,
                  border: `1px solid ${alpha(stageColor, 0.3)}`,
                }}
              />
              <Chip
                label={source === 'both' ? 'CRM + Onboarded' : source === 'crm' ? 'CRM Lead' : 'Onboarded'}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {crm ? `CRM ID: ${crm.id}` : ''}{crm && onboarded ? ' · ' : ''}{onboarded ? `Church ID: ${onboarded.id}` : ''}
              {' · Created '}{formatDate(crm?.created_at || onboarded?.created_at || null)}
            </Typography>
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Change Stage">
              <Button
                variant="outlined" size="small"
                onClick={() => { setNewStage(unifiedStage); setStageDialogOpen(true); }}
                sx={{ textTransform: 'none' }}
              >
                Change Stage
              </Button>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchDetail} disabled={loading} sx={{ color: COLOR }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* ---- Error / Loading --------------------------------------- */}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: COLOR }} />
          </Box>
        ) : (
          <>
            {/* Tabs */}
            <Paper elevation={0} sx={{ mb: 2.5, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 2 }}>
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ px: 1, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48 } }}
              >
                {visibleTabs.map((t, i) => (
                  <Tab
                    key={t.label}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        {t.label}
                        {t.badge !== undefined && t.badge > 0 && (
                          <Chip label={t.badge} size="small" sx={{ height: 20, minWidth: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                        )}
                      </Box>
                    }
                    value={i}
                  />
                ))}
              </Tabs>
            </Paper>

            {/* Tab content */}
            <Box>
              {visibleTabs[tab]?.label === 'Overview' && (
                <OverviewPanel
                  hasOnboarding={hasOnboarding} hasCrm={hasCrm} checklist={checklist}
                  getActiveStep={getActiveStep} sectionPaper={sectionPaper} churchName={churchName}
                  crm={crm} onboarded={onboarded} formatDate={formatDate} notes={notes}
                  setNotes={setNotes} notesOriginal={notesOriginal} notesSaving={notesSaving}
                  handleSaveNotes={handleSaveNotes} followUps={followUps}
                  handleCompleteFollowUp={handleCompleteFollowUp} editingDiscovery={editingDiscovery}
                  discoveryDraft={discoveryDraft} setDiscoveryDraft={setDiscoveryDraft}
                  setEditingDiscovery={setEditingDiscovery} pipelineSaving={pipelineSaving}
                  handleSaveInlineField={handleSaveInlineField} editingBlockers={editingBlockers}
                  blockersDraft={blockersDraft} setBlockersDraft={setBlockersDraft}
                  setEditingBlockers={setEditingBlockers} provisionChecklist={provisionChecklist}
                  handleMarkProvisioning={handleMarkProvisioning} pipelineRequirements={pipelineRequirements}
                  togglingSetup={togglingSetup} handleToggleSetup={handleToggleSetup} isDark={isDark}
                />
              )}
              {visibleTabs[tab]?.label === 'Contacts' && (
                <ContactsPanel
                  contacts={contacts} setEditingContact={setEditingContact}
                  setContactForm={setContactForm} setContactDialogOpen={setContactDialogOpen}
                  handleDeleteContact={handleDeleteContact} isDark={isDark}
                />
              )}
              {visibleTabs[tab]?.label === 'Activity' && (
                <ActivityPanel
                  activities={activities} setActivityForm={setActivityForm}
                  setActivityDialogOpen={setActivityDialogOpen} isDark={isDark} timeAgo={timeAgo}
                />
              )}
              {visibleTabs[tab]?.label === 'Follow-ups' && (
                <FollowUpsPanel
                  followUps={followUps} handleCompleteFollowUp={handleCompleteFollowUp}
                  setFollowUpForm={setFollowUpForm} setFollowUpDialogOpen={setFollowUpDialogOpen}
                  formatDate={formatDate}
                />
              )}
              {visibleTabs[tab]?.label === 'Requirements' && (
                <RequirementsPanel
                  pipelineRequirements={pipelineRequirements} setReqForm={setReqForm}
                  setReqDialogOpen={setReqDialogOpen} handleDeleteRequirement={handleDeleteRequirement}
                  sampleTemplates={sampleTemplates}
                />
              )}
              {visibleTabs[tab]?.label === 'Email Workflow' && (
                <EmailWorkflowPanel
                  pipelineEmails={pipelineEmails} openEmailComposer={openEmailComposer}
                  handleUpdateEmailStatus={handleUpdateEmailStatus} formatDateTime={formatDateTime}
                  isDark={isDark}
                />
              )}
              {visibleTabs[tab]?.label === 'Onboarding' && (
                <OnboardingPanel
                  members={members} tokens={tokens} isDark={isDark} totalMembers={totalMembers}
                  activeMembers={activeMembers} pendingMembers={pendingMembers} formatDate={formatDate}
                  actionLoading={actionLoading} handleApproveMember={handleApproveMember}
                  setRejectDialog={setRejectDialog} hasActiveToken={hasActiveToken}
                  generatingToken={generatingToken} handleGenerateToken={handleGenerateToken}
                  deactivatingToken={deactivatingToken} handleDeactivateToken={handleDeactivateToken}
                  copyToClipboard={copyToClipboard}
                />
              )}
              {visibleTabs[tab]?.label === 'Timeline' && (
                <TimelinePanel
                  activities={activities} pipelineActivities={pipelineActivities}
                  pipelineEmails={pipelineEmails} tokens={tokens} members={members} isDark={isDark}
                />
              )}
            </Box>
          </>
        )}
      </Box>

      {/* Dialogs */}
      <ChurchLifecycleDialogs
        contactDialogOpen={contactDialogOpen} setContactDialogOpen={setContactDialogOpen}
        editingContact={editingContact} contactForm={contactForm} setContactForm={setContactForm}
        handleSaveContact={handleSaveContact}
        activityDialogOpen={activityDialogOpen} setActivityDialogOpen={setActivityDialogOpen}
        activityForm={activityForm} setActivityForm={setActivityForm} handleLogActivity={handleLogActivity}
        followUpDialogOpen={followUpDialogOpen} setFollowUpDialogOpen={setFollowUpDialogOpen}
        followUpForm={followUpForm} setFollowUpForm={setFollowUpForm} handleAddFollowUp={handleAddFollowUp}
        stageDialogOpen={stageDialogOpen} setStageDialogOpen={setStageDialogOpen}
        newStage={newStage} setNewStage={setNewStage} stages={stages}
        unifiedStage={unifiedStage} handleStageChange={handleStageChange}
        rejectDialog={rejectDialog} setRejectDialog={setRejectDialog}
        rejectReason={rejectReason} setRejectReason={setRejectReason} handleRejectMember={handleRejectMember}
        reqDialogOpen={reqDialogOpen} setReqDialogOpen={setReqDialogOpen}
        reqForm={reqForm} setReqForm={setReqForm} sampleTemplates={sampleTemplates}
        handleSaveRequirement={handleSaveRequirement} pipelineSaving={pipelineSaving}
        emailDialogOpen={emailDialogOpen} setEmailDialogOpen={setEmailDialogOpen}
        emailForm={emailForm} setEmailForm={setEmailForm} emailTemplates={emailTemplates}
        contacts={contacts} churchName={churchName} handleSaveEmail={handleSaveEmail}
      />

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))} variant="filled" sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default ChurchLifecycleDetailPage;
