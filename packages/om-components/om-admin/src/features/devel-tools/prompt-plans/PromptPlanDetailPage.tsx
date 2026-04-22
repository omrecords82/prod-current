/**
 * PromptPlanDetailPage.tsx
 * Full detail view: plan metadata, ordered steps, launch controls, status tracking.
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  Add as AddIcon,
  CheckCircle as CompletedIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Edit as EditIcon,
  Error as FailedIcon,
  Link as LinkIcon,
  Pause as PausedIcon,
  PlayArrow as LaunchIcon,
  Refresh as RetryIcon,
  SkipNext as SkipIcon,
  RadioButtonUnchecked as PendingIcon,
  FiberManualRecord as ReadyIcon,
  HourglassEmpty as RunningIcon,
  Block as BlockedIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { SmartToy as AgentIcon } from '@mui/icons-material';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '@/api/utils/axiosInstance';

interface Plan {
  id: number;
  title: string;
  description: string | null;
  assigned_agent: string | null;
  change_set_id: number | null;
  change_set_code: string | null;
  change_set_status: string | null;
  status: string;
  created_by_email: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const AGENT_OPTIONS = [
  { value: 'claude_cli', label: 'Claude CLI', color: '#d4a574' },
  { value: 'windsurf', label: 'Windsurf', color: '#00b4d8' },
  { value: 'cursor', label: 'Cursor', color: '#7c3aed' },
  { value: 'github_copilot', label: 'GitHub Copilot', color: '#1f883d' },
] as const;

interface Step {
  id: number;
  prompt_plan_id: number;
  step_number: number;
  title: string;
  prompt_text: string | null;
  status: string;
  generated_work_item_id: number | null;
  execution_order: number;
  notes: string | null;
  is_required: boolean;
  metadata: any;
  started_at: string | null;
  completed_at: string | null;
  work_item_title: string | null;
  work_item_status: string | null;
}

const stepStatusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending:   { icon: <PendingIcon sx={{ fontSize: 16 }} />,   color: '#9e9e9e', label: 'Pending' },
  ready:     { icon: <ReadyIcon sx={{ fontSize: 16 }} />,     color: '#2196f3', label: 'Ready' },
  running:   { icon: <RunningIcon sx={{ fontSize: 16 }} />,   color: '#ff9800', label: 'Running' },
  completed: { icon: <CompletedIcon sx={{ fontSize: 16 }} />, color: '#4caf50', label: 'Completed' },
  blocked:   { icon: <BlockedIcon sx={{ fontSize: 16 }} />,   color: '#f44336', label: 'Blocked' },
  failed:    { icon: <FailedIcon sx={{ fontSize: 16 }} />,    color: '#f44336', label: 'Failed' },
  skipped:   { icon: <SkipIcon sx={{ fontSize: 16 }} />,      color: '#9e9e9e', label: 'Skipped' },
};

const planStatusActions: Record<string, Array<{ label: string; to: string; color: 'primary' | 'success' | 'warning' | 'error' }>> = {
  draft:  [{ label: 'Activate', to: 'active', color: 'primary' }, { label: 'Cancel', to: 'cancelled', color: 'error' }],
  active: [{ label: 'Pause', to: 'paused', color: 'warning' }, { label: 'Complete', to: 'completed', color: 'success' }, { label: 'Cancel', to: 'cancelled', color: 'error' }],
  paused: [{ label: 'Resume', to: 'active', color: 'primary' }, { label: 'Cancel', to: 'cancelled', color: 'error' }],
};

const PromptPlanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const navigate = useNavigate();
  type PageBucket = {
    plan: Plan | null;
    steps: Step[];
    loading: boolean;
    error: string | null;
  };
  const [page, setPage] = useState<PageBucket>({
    plan: null,
    steps: [],
    loading: true,
    error: null,
  });
  const setPageField = useCallback(<K extends keyof PageBucket>(key: K, value: PageBucket[K]) => {
    setPage(prev => ({ ...prev, [key]: value }));
  }, []);
  const { plan, steps, loading, error } = page;
  const setPlan = useCallback((v: Plan | null) => setPageField('plan', v), [setPageField]);
  const setSteps = useCallback((v: Step[]) => setPageField('steps', v), [setPageField]);
  const setLoading = useCallback((v: boolean) => setPageField('loading', v), [setPageField]);
  const setError = useCallback((v: string | null) => setPageField('error', v), [setPageField]);

  type FormsBucket = {
    addOpen: boolean;
    editingStep: Step | null;
    stepTitle: string;
    stepPrompt: string;
    stepNotes: string;
    stepRequired: boolean;
    saving: boolean;
    editingPlan: boolean;
    planTitle: string;
    planDesc: string;
    planAgent: string;
    launching: number | null;
    launchResult: { stepId: number; response: string; workItemId: number } | null;
  };
  const [forms, setForms] = useState<FormsBucket>({
    addOpen: false,
    editingStep: null,
    stepTitle: '',
    stepPrompt: '',
    stepNotes: '',
    stepRequired: true,
    saving: false,
    editingPlan: false,
    planTitle: '',
    planDesc: '',
    planAgent: '',
    launching: null,
    launchResult: null,
  });
  const setFormsField = useCallback(<K extends keyof FormsBucket>(key: K, value: FormsBucket[K]) => {
    setForms(prev => ({ ...prev, [key]: value }));
  }, []);
  const { addOpen, editingStep, stepTitle, stepPrompt, stepNotes, stepRequired, saving, editingPlan, planTitle, planDesc, planAgent, launching, launchResult } = forms;
  const setAddOpen = useCallback((v: boolean) => setFormsField('addOpen', v), [setFormsField]);
  const setEditingStep = useCallback((v: Step | null) => setFormsField('editingStep', v), [setFormsField]);
  const setStepTitle = useCallback((v: string) => setFormsField('stepTitle', v), [setFormsField]);
  const setStepPrompt = useCallback((v: string) => setFormsField('stepPrompt', v), [setFormsField]);
  const setStepNotes = useCallback((v: string) => setFormsField('stepNotes', v), [setFormsField]);
  const setStepRequired = useCallback((v: boolean) => setFormsField('stepRequired', v), [setFormsField]);
  const setSaving = useCallback((v: boolean) => setFormsField('saving', v), [setFormsField]);
  const setEditingPlan = useCallback((v: boolean) => setFormsField('editingPlan', v), [setFormsField]);
  const setPlanTitle = useCallback((v: string) => setFormsField('planTitle', v), [setFormsField]);
  const setPlanDesc = useCallback((v: string) => setFormsField('planDesc', v), [setFormsField]);
  const setPlanAgent = useCallback((v: string) => setFormsField('planAgent', v), [setFormsField]);
  const setLaunching = useCallback((v: number | null) => setFormsField('launching', v), [setFormsField]);
  const setLaunchResult = useCallback((v: { stepId: number; response: string; workItemId: number } | null) => setFormsField('launchResult', v), [setFormsField]);

  const fetchPlan = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/prompt-plans/${id}`);
      setPlan(res.plan);
      setSteps(res.steps || []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  // ── Plan Actions ──
  const handleTransition = async (to: string) => {
    if (!plan) return;
    try {
      const res = await apiClient.post(`/prompt-plans/${plan.id}/transition`, { to });
      setPlan(res.plan);
      setError(null);
    } catch (err: any) {
      setError(err?.error || err?.message || 'Transition failed');
    }
  };

  const handleSavePlan = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const res = await apiClient.put(`/prompt-plans/${plan.id}`, {
        title: planTitle, description: planDesc || null, assigned_agent: planAgent || null,
      });
      setPlan(res.plan);
      setEditingPlan(false);
    } catch (err: any) {
      setError(err?.error || 'Failed to update plan');
    } finally {
      setSaving(false);
    }
  };

  // ── Step Actions ──
  const handleAddStep = async () => {
    if (!plan || !stepTitle.trim()) return;
    setSaving(true);
    try {
      await apiClient.post(`/prompt-plans/${plan.id}/steps`, {
        title: stepTitle.trim(),
        prompt_text: stepPrompt.trim() || null,
        notes: stepNotes.trim() || null,
        is_required: stepRequired,
      });
      setAddOpen(false);
      resetStepForm();
      await fetchPlan();
    } catch (err: any) {
      setError(err?.error || 'Failed to add step');
    } finally {
      setSaving(false);
    }
  };

  const handleEditStep = async () => {
    if (!plan || !editingStep) return;
    setSaving(true);
    try {
      await apiClient.put(`/prompt-plans/${plan.id}/steps/${editingStep.id}`, {
        title: stepTitle.trim(),
        prompt_text: stepPrompt.trim() || null,
        notes: stepNotes.trim() || null,
        is_required: stepRequired,
      });
      setEditingStep(null);
      resetStepForm();
      await fetchPlan();
    } catch (err: any) {
      setError(err?.error || 'Failed to update step');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStep = async (stepId: number) => {
    if (!plan || !confirm('Delete this step?')) return;
    try {
      await apiClient.delete(`/prompt-plans/${plan.id}/steps/${stepId}`);
      await fetchPlan();
    } catch (err: any) {
      setError(err?.error || 'Failed to delete step');
    }
  };

  const handleLaunchStep = async (stepId: number) => {
    if (!plan) return;
    setLaunching(stepId);
    setLaunchResult(null);
    setError(null);
    try {
      const res = await apiClient.post(`/prompt-plans/${plan.id}/steps/${stepId}/launch`);
      setLaunchResult({
        stepId,
        response: res.response || 'Completed',
        workItemId: res.work_item_id,
      });
      await fetchPlan();
    } catch (err: any) {
      setError(err?.error || 'Launch failed');
      await fetchPlan();
    } finally {
      setLaunching(null);
    }
  };

  const handleSkipStep = async (stepId: number) => {
    if (!plan) return;
    try {
      await apiClient.post(`/prompt-plans/${plan.id}/steps/${stepId}/skip`);
      await fetchPlan();
    } catch (err: any) {
      setError(err?.error || 'Failed to skip step');
    }
  };

  const handleRetryStep = async (stepId: number) => {
    if (!plan) return;
    try {
      await apiClient.post(`/prompt-plans/${plan.id}/steps/${stepId}/retry`);
      await fetchPlan();
    } catch (err: any) {
      setError(err?.error || 'Failed to retry step');
    }
  };

  const handleMoveStep = async (stepId: number, direction: 'up' | 'down') => {
    const idx = steps.findIndex(s => s.id === stepId);
    if (idx < 0) return;
    const newSteps = [...steps];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newSteps.length) return;
    [newSteps[idx], newSteps[swapIdx]] = [newSteps[swapIdx], newSteps[idx]];
    const step_ids = newSteps.map(s => s.id);
    try {
      const res = await apiClient.post(`/prompt-plans/${plan!.id}/reorder`, { step_ids });
      setSteps(res.steps || newSteps);
    } catch (err: any) {
      setError(err?.error || 'Reorder failed');
    }
  };

  const resetStepForm = () => {
    setStepTitle('');
    setStepPrompt('');
    setStepNotes('');
    setStepRequired(true);
  };

  const openEditStep = (step: Step) => {
    setEditingStep(step);
    setStepTitle(step.title);
    setStepPrompt(step.prompt_text || '');
    setStepNotes(step.notes || '');
    setStepRequired(step.is_required);
  };

  const canEditPlan = plan && !['completed', 'cancelled'].includes(plan.status);
  const canAddSteps = canEditPlan;

  // Determine which step is next to launch
  const nextLaunchableStep = steps.find(s => {
    if (['completed', 'skipped', 'running'].includes(s.status)) return false;
    // Check prior required steps
    const priorRequired = steps.filter(p => p.execution_order < s.execution_order && p.is_required);
    return priorRequired.every(p => ['completed', 'skipped'].includes(p.status));
  });

  if (loading) {
    return (
      <PageContainer title="Prompt Plan" description="">
        <Box sx={{ p: 3 }}><Skeleton variant="rectangular" height={200} /><Skeleton sx={{ mt: 2 }} height={40} /><Skeleton height={40} /></Box>
      </PageContainer>
    );
  }

  if (!plan) {
    return (
      <PageContainer title="Not Found" description="">
        <Box sx={{ p: 3 }}><Alert severity="error">Plan not found</Alert></Box>
      </PageContainer>
    );
  }

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const pct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { to: '/devel-tools/prompt-plans', title: 'Prompt Plans' },
    { title: `PP-${String(plan.id).padStart(4, '0')}` },
  ];

  return (
    <PageContainer title={`PP-${String(plan.id).padStart(4, '0')}: ${plan.title}`} description="">
      <Breadcrumb title={plan.title} items={BCrumb} />

      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: 'auto' }}>
        {/* Error banner */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>
        )}

        {/* Plan Header Card */}
        <Card elevation={0} sx={{ mb: 3, border: `1px solid ${theme.palette.divider}` }}>
          <CardContent>
            {editingPlan ? (
              <Stack spacing={2}>
                <TextField fullWidth label="Title" value={planTitle} onChange={e => setPlanTitle(e.target.value)} />
                <TextField fullWidth multiline rows={2} label="Description" value={planDesc} onChange={e => setPlanDesc(e.target.value)} />
                <FormControl fullWidth>
                  <InputLabel>Assigned Agent</InputLabel>
                  <Select value={planAgent} label="Assigned Agent" onChange={e => setPlanAgent(e.target.value)}>
                    <MenuItem value="">None</MenuItem>
                    {AGENT_OPTIONS.map(a => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSavePlan} disabled={saving}>Save</Button>
                  <Button onClick={() => setEditingPlan(false)}>Cancel</Button>
                </Stack>
              </Stack>
            ) : (
              <>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h5" fontWeight={700}>
                      <Typography component="span" variant="h5" color="text.secondary" fontWeight={400} sx={{ fontFamily: 'monospace', mr: 1 }}>
                        PP-{String(plan.id).padStart(4, '0')}
                      </Typography>
                      {plan.title}
                    </Typography>
                    {plan.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{plan.description}</Typography>
                    )}
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap">
                      <Chip label={plan.status} size="small" color={
                        plan.status === 'active' ? 'primary' :
                        plan.status === 'completed' ? 'success' :
                        plan.status === 'paused' ? 'warning' :
                        plan.status === 'cancelled' ? 'error' : 'default'
                      } variant="outlined" sx={{ textTransform: 'capitalize' }} />
                      {plan.assigned_agent && (() => {
                        const ag = AGENT_OPTIONS.find(a => a.value === plan.assigned_agent);
                        return (
                          <Chip
                            icon={<AgentIcon sx={{ fontSize: 14, color: `${ag?.color || '#888'} !important` }} />}
                            label={ag?.label || plan.assigned_agent}
                            size="small"
                            sx={{
                              fontSize: '0.7rem', fontWeight: 600,
                              bgcolor: alpha(ag?.color || '#888', 0.1),
                              color: ag?.color || '#888',
                              '& .MuiChip-icon': { ml: '4px' },
                            }}
                          />
                        );
                      })()}
                      {plan.change_set_code && (
                        <Chip
                          label={plan.change_set_code}
                          size="small"
                          clickable
                          onClick={(e) => { e.stopPropagation(); navigate(`/omai/tools/om-daily/change-sets`); }}
                          sx={{ fontSize: '0.7rem', fontWeight: 600, bgcolor: alpha('#2d1b4e', 0.08), color: '#2d1b4e' }}
                        />
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: '24px' }}>
                        {plan.created_by_email} &middot; {new Date(plan.created_at).toLocaleDateString()}
                      </Typography>
                    </Stack>
                    {plan.status === 'draft' && !plan.change_set_id && (
                      <Alert severity="info" sx={{ mt: 1.5, py: 0 }}>
                        <Typography variant="caption">A Change Set will be auto-created when this plan is activated.</Typography>
                      </Alert>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1}>
                    {canEditPlan && (
                      <Tooltip title="Edit plan">
                        <IconButton size="small" onClick={() => { setEditingPlan(true); setPlanTitle(plan.title); setPlanDesc(plan.description || ''); setPlanAgent(plan.assigned_agent || ''); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>
                {/* Progress bar */}
                <Box sx={{ mt: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">Progress</Typography>
                    <Typography variant="caption" fontWeight={600}>{completedCount}/{steps.length} steps ({pct}%)</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
                {/* Status transition buttons */}
                {planStatusActions[plan.status] && (
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    {planStatusActions[plan.status].map(action => (
                      <Button key={action.to} size="small" variant="outlined" color={action.color}
                        onClick={() => handleTransition(action.to)}>
                        {action.label}
                      </Button>
                    ))}
                  </Stack>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Launch result */}
        <Collapse in={!!launchResult}>
          {launchResult && (
            <Alert severity="success" onClose={() => setLaunchResult(null)} sx={{ mb: 2 }}>
              Step completed. Work item{' '}
              <Typography component="a" variant="body2" fontWeight={600}
                sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => navigate(`/omai/tools/om-daily?tab=1&search=%23${launchResult.workItemId}`)}>
                #{launchResult.workItemId}
              </Typography>
              {' '}created. Response: {launchResult.response.substring(0, 120)}...
            </Alert>
          )}
        </Collapse>

        {/* Steps Section */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>Steps</Typography>
          {canAddSteps && (
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => { resetStepForm(); setAddOpen(true); }}>
              Add Step
            </Button>
          )}
        </Stack>

        {steps.length === 0 ? (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: `1px solid ${theme.palette.divider}` }}>
            <Typography color="text.secondary">No steps yet. Add steps to define your prompt sequence.</Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {steps.map((step, idx) => {
              const sc = stepStatusConfig[step.status] || stepStatusConfig.pending;
              const isNext = nextLaunchableStep?.id === step.id && plan.status === 'active';
              const canEdit = ['pending', 'ready', 'blocked'].includes(step.status) && canEditPlan;
              const canDelete = ['pending', 'ready'].includes(step.status) && canEditPlan;
              const canLaunch = isNext && step.prompt_text && launching === null;
              const canSkip = !['completed', 'running'].includes(step.status) && canEditPlan;
              const canRetry = step.status === 'failed';

              return (
                <Paper
                  key={step.id}
                  elevation={0}
                  sx={{
                    p: 2,
                    border: `1px solid ${isNext ? theme.palette.primary.main : theme.palette.divider}`,
                    borderLeft: `4px solid ${sc.color}`,
                    bgcolor: isNext ? `${theme.palette.primary.main}08` : 'background.paper',
                    transition: 'all 0.2s',
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    {/* Reorder handle + step number */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
                      {canEditPlan && idx > 0 && ['pending', 'ready'].includes(step.status) && (
                        <IconButton size="small" onClick={() => handleMoveStep(step.id, 'up')} sx={{ p: 0.25 }}>
                          <DragIcon sx={{ fontSize: 14, transform: 'rotate(-90deg)' }} />
                        </IconButton>
                      )}
                      <Typography variant="h6" fontWeight={700} color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {step.step_number}
                      </Typography>
                      {canEditPlan && idx < steps.length - 1 && ['pending', 'ready'].includes(step.status) && (
                        <IconButton size="small" onClick={() => handleMoveStep(step.id, 'down')} sx={{ p: 0.25 }}>
                          <DragIcon sx={{ fontSize: 14, transform: 'rotate(90deg)' }} />
                        </IconButton>
                      )}
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight={600}>{step.title}</Typography>
                        <Chip
                          icon={sc.icon}
                          label={sc.label}
                          size="small"
                          sx={{ fontSize: '0.65rem', height: 20, '& .MuiChip-icon': { fontSize: 12 }, color: sc.color, borderColor: sc.color }}
                          variant="outlined"
                        />
                        {!step.is_required && (
                          <Chip label="optional" size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />
                        )}
                        {isNext && (
                          <Chip label="NEXT" size="small" color="primary" sx={{ fontSize: '0.6rem', height: 18, fontWeight: 700 }} />
                        )}
                      </Stack>

                      {step.prompt_text && (
                        <Typography variant="body2" color="text.secondary" sx={{
                          mt: 0.5, p: 1, bgcolor: 'grey.50', borderRadius: 1,
                          fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap',
                          maxHeight: 100, overflow: 'auto',
                        }}>
                          {step.prompt_text}
                        </Typography>
                      )}

                      {step.notes && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                          {step.notes}
                        </Typography>
                      )}

                      {/* Work item link */}
                      {step.generated_work_item_id && (
                        <Chip
                          icon={<LinkIcon sx={{ fontSize: 12 }} />}
                          label={`Work item #${step.generated_work_item_id}${step.work_item_status ? ` (${step.work_item_status})` : ''}`}
                          size="small"
                          variant="outlined"
                          color="info"
                          sx={{ mt: 1, fontSize: '0.65rem', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/omai/tools/om-daily?tab=1&search=%23${step.generated_work_item_id}`);
                          }}
                        />
                      )}

                      {/* Timestamps */}
                      {(step.started_at || step.completed_at) && (
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5, fontSize: '0.65rem' }}>
                          {step.started_at && `Started: ${new Date(step.started_at).toLocaleString()}`}
                          {step.completed_at && ` · Completed: ${new Date(step.completed_at).toLocaleString()}`}
                        </Typography>
                      )}

                      {/* Loading indicator during launch */}
                      {launching === step.id && (
                        <LinearProgress sx={{ mt: 1, borderRadius: 2 }} />
                      )}
                    </Box>

                    {/* Actions */}
                    <Stack direction="row" spacing={0.5}>
                      {canLaunch && (
                        <Tooltip title="Launch this step">
                          <Button size="small" variant="contained" color="primary" startIcon={<LaunchIcon />}
                            onClick={() => handleLaunchStep(step.id)} disabled={launching !== null}>
                            Launch
                          </Button>
                        </Tooltip>
                      )}
                      {canRetry && (
                        <Tooltip title="Retry failed step">
                          <IconButton size="small" color="warning" onClick={() => handleRetryStep(step.id)}>
                            <RetryIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canSkip && step.status !== 'skipped' && (
                        <Tooltip title="Skip step">
                          <IconButton size="small" onClick={() => handleSkipStep(step.id)}>
                            <SkipIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canEdit && (
                        <Tooltip title="Edit step">
                          <IconButton size="small" onClick={() => openEditStep(step)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip title="Delete step">
                          <IconButton size="small" color="error" onClick={() => handleDeleteStep(step.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Add Step Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Step</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Step Title" placeholder="e.g., AG Grid fallback architecture"
            value={stepTitle} onChange={e => setStepTitle(e.target.value)} sx={{ mt: 1, mb: 2 }} />
          <TextField fullWidth multiline rows={4} label="Prompt Text"
            placeholder="The prompt to execute for this step..."
            value={stepPrompt} onChange={e => setStepPrompt(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth multiline rows={2} label="Notes (optional)"
            value={stepNotes} onChange={e => setStepNotes(e.target.value)} sx={{ mb: 2 }} />
          <Stack direction="row" alignItems="center" spacing={1}>
            <Switch checked={stepRequired} onChange={e => setStepRequired(e.target.checked)} />
            <Typography variant="body2">{stepRequired ? 'Required' : 'Optional'}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddStep} disabled={!stepTitle.trim() || saving}>
            {saving ? 'Adding...' : 'Add Step'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Step Dialog */}
      <Dialog open={!!editingStep} onClose={() => setEditingStep(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Step</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Step Title" value={stepTitle}
            onChange={e => setStepTitle(e.target.value)} sx={{ mt: 1, mb: 2 }} />
          <TextField fullWidth multiline rows={4} label="Prompt Text" value={stepPrompt}
            onChange={e => setStepPrompt(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth multiline rows={2} label="Notes (optional)" value={stepNotes}
            onChange={e => setStepNotes(e.target.value)} sx={{ mb: 2 }} />
          <Stack direction="row" alignItems="center" spacing={1}>
            <Switch checked={stepRequired} onChange={e => setStepRequired(e.target.checked)} />
            <Typography variant="body2">{stepRequired ? 'Required' : 'Optional'}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingStep(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditStep} disabled={!stepTitle.trim() || saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default PromptPlanDetailPage;
