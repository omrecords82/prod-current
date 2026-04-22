import React from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { COLOR, STEPPER_STEPS } from './constants';
import type { OverviewPanelProps } from './types';

const OverviewPanel: React.FC<OverviewPanelProps> = ({
  hasOnboarding,
  hasCrm,
  checklist,
  getActiveStep,
  sectionPaper,
  churchName,
  crm,
  onboarded,
  formatDate,
  notes,
  setNotes,
  notesOriginal,
  notesSaving,
  handleSaveNotes,
  followUps,
  handleCompleteFollowUp,
  editingDiscovery,
  discoveryDraft,
  setDiscoveryDraft,
  setEditingDiscovery,
  pipelineSaving,
  handleSaveInlineField,
  editingBlockers,
  blockersDraft,
  setBlockersDraft,
  setEditingBlockers,
  provisionChecklist,
  handleMarkProvisioning,
  pipelineRequirements,
  togglingSetup,
  handleToggleSetup,
  isDark,
}) => (
  <>
    {/* Onboarding Stepper (if onboarded) */}
    {hasOnboarding && checklist && sectionPaper(
      <>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2.5 }}>Onboarding Progress</Typography>
        <Stepper activeStep={getActiveStep()} alternativeLabel>
          {STEPPER_STEPS.map(label => (
            <Step key={label}>
              <StepLabel StepIconProps={{ sx: { '&.Mui-active': { color: COLOR }, '&.Mui-completed': { color: COLOR } } }}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </>
    )}

    {/* Church Information */}
    {sectionPaper(
      <>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Church Information</Typography>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Name</Typography>
            <Typography variant="body2">{churchName}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Location</Typography>
            <Typography variant="body2">
              {[crm?.city || onboarded?.city, crm?.state_code || onboarded?.state_province].filter(Boolean).join(', ') || '—'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Phone</Typography>
            <Typography variant="body2">{crm?.phone || onboarded?.phone || '—'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Website</Typography>
            <Typography variant="body2">{crm?.website || onboarded?.website || '—'}</Typography>
          </Grid>

          {crm && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Priority</Typography>
                <Typography variant="body2">{crm.priority || '—'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Last Contacted</Typography>
                <Typography variant="body2">{formatDate(crm.last_contacted_at)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Next Follow-up</Typography>
                <Typography variant="body2">{formatDate(crm.next_follow_up)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Jurisdiction</Typography>
                <Typography variant="body2">{crm.jurisdiction || '—'}</Typography>
              </Grid>
            </>
          )}

          {onboarded && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Email</Typography>
                <Typography variant="body2">{onboarded.email || '—'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Database</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                  {onboarded.db_name || '—'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Status</Typography>
                <Box>
                  <Chip
                    label={onboarded.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    color={onboarded.is_active ? 'success' : 'default'}
                    variant={onboarded.is_active ? 'filled' : 'outlined'}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Setup Complete</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={onboarded.setup_complete ? 'Complete' : 'Incomplete'}
                    size="small"
                    color={onboarded.setup_complete ? 'success' : 'warning'}
                    variant={onboarded.setup_complete ? 'filled' : 'outlined'}
                  />
                  <Tooltip title={onboarded.setup_complete ? 'Mark as incomplete' : 'Mark as complete'}>
                    <Switch
                      size="small"
                      checked={!!onboarded.setup_complete}
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
            </>
          )}

          {/* Notes */}
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
              Notes
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <TextField
                fullWidth multiline minRows={2} maxRows={5} size="small"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes..."
                InputProps={{ startAdornment: <EditIcon sx={{ mr: 1, color: 'text.disabled', fontSize: 18, mt: 0.5 }} /> }}
              />
              <Button
                variant="contained" size="small"
                startIcon={notesSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                disabled={notesSaving || notes === notesOriginal}
                onClick={handleSaveNotes}
                sx={{ textTransform: 'none', bgcolor: COLOR, '&:hover': { bgcolor: alpha(COLOR, 0.85) }, minWidth: 80, mt: 0.5 }}
              >
                Save
              </Button>
            </Box>
          </Grid>
        </Grid>
      </>
    )}

    {/* Quick stats for follow-ups (if CRM) */}
    {hasCrm && followUps.length > 0 && sectionPaper(
      <>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Upcoming Follow-ups</Typography>
        {followUps.filter(f => f.status === 'pending').slice(0, 5).map(f => {
          const isOverdue = new Date(f.due_date) < new Date(new Date().toDateString());
          return (
            <Box key={f.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75 }}>
              <IconButton size="small" onClick={() => handleCompleteFollowUp(f.id)} sx={{ color: '#4caf50' }}>
                <CheckIcon fontSize="small" />
              </IconButton>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600}>{f.subject}</Typography>
                <Typography variant="caption" color={isOverdue ? 'error.main' : 'text.secondary'}>
                  {formatDate(f.due_date)}{isOverdue ? ' (overdue)' : ''}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </>
    )}

    {/* Discovery & Qualification (CRM extended fields) */}
    {hasCrm && crm && sectionPaper(
      <>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Discovery & Qualification</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Current Records</Typography>
            <Typography variant="body2">{crm.current_records_situation || '—'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Estimated Volume</Typography>
            <Typography variant="body2">{crm.estimated_volume || '—'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Launch Timeline</Typography>
            <Typography variant="body2">{crm.desired_launch_timeline || '—'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Needs</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              {crm.historical_import_needed ? <Chip label="Historical Import" size="small" variant="outlined" /> : null}
              {crm.ocr_assistance_needed ? <Chip label="OCR Assistance" size="small" variant="outlined" /> : null}
              {crm.public_records_needed ? <Chip label="Public Records" size="small" variant="outlined" /> : null}
              {crm.custom_structure_required ? <Chip label="Custom Structure" size="small" color="warning" variant="outlined" /> : null}
              {!crm.historical_import_needed && !crm.ocr_assistance_needed && !crm.public_records_needed && !crm.custom_structure_required && (
                <Typography variant="body2" color="text.secondary">None specified</Typography>
              )}
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Discovery Notes</Typography>
              {!editingDiscovery && (
                <IconButton size="small" onClick={() => { setDiscoveryDraft(crm.discovery_notes || ''); setEditingDiscovery(true); }}>
                  <EditIcon fontSize="inherit" />
                </IconButton>
              )}
            </Box>
            {editingDiscovery ? (
              <Box sx={{ mt: 0.5 }}>
                <TextField fullWidth multiline minRows={2} maxRows={6} size="small" value={discoveryDraft} onChange={e => setDiscoveryDraft(e.target.value)} />
                <Box sx={{ mt: 0.5, display: 'flex', gap: 1 }}>
                  <Button size="small" variant="contained" disabled={pipelineSaving} onClick={() => handleSaveInlineField('discovery_notes', discoveryDraft)} sx={{ bgcolor: COLOR }}>Save</Button>
                  <Button size="small" onClick={() => setEditingDiscovery(false)}>Cancel</Button>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{crm.discovery_notes || <em>None yet — click edit to add</em>}</Typography>
            )}
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Blockers</Typography>
              {!editingBlockers && (
                <IconButton size="small" onClick={() => { setBlockersDraft(crm.blockers || ''); setEditingBlockers(true); }}>
                  <EditIcon fontSize="inherit" />
                </IconButton>
              )}
            </Box>
            {editingBlockers ? (
              <Box sx={{ mt: 0.5 }}>
                <TextField fullWidth multiline minRows={2} maxRows={4} size="small" value={blockersDraft} onChange={e => setBlockersDraft(e.target.value)} />
                <Box sx={{ mt: 0.5, display: 'flex', gap: 1 }}>
                  <Button size="small" variant="contained" disabled={pipelineSaving} onClick={() => handleSaveInlineField('blockers', blockersDraft)} sx={{ bgcolor: COLOR }}>Save</Button>
                  <Button size="small" onClick={() => setEditingBlockers(false)}>Cancel</Button>
                </Box>
              </Box>
            ) : crm.blockers ? (
              <Alert severity="warning" sx={{ mt: 0.5 }}>{crm.blockers}</Alert>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}><em>None</em></Typography>
            )}
          </Grid>
        </Grid>
      </>
    )}

    {/* Provisioning Checklist (from pipeline) */}
    {hasCrm && provisionChecklist && sectionPaper(
      <>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Provisioning Checklist</Typography>
        <Grid container spacing={1}>
          {[
            { key: 'contact_complete', label: 'Contact info complete', manual: false },
            { key: 'record_requirements_set', label: 'Record requirements defined', manual: false },
            { key: 'templates_or_custom', label: 'Templates or custom structure confirmed', manual: false },
            { key: 'internal_review_done', label: 'Internal review done', manual: true },
            { key: 'provisioning_email_sent', label: 'Provisioning email sent', manual: false },
            { key: 'response_received', label: 'Response received', manual: true },
            { key: 'account_created', label: 'Account created', manual: false },
            { key: 'invite_sent', label: 'Invite sent', manual: false },
            { key: 'activated', label: 'Activated', manual: false },
          ].map(item => {
            const done = !!(provisionChecklist as Record<string, any>)[item.key];
            return (
              <Grid item xs={12} sm={6} md={4} key={item.key}>
                <Box
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    ...(item.manual ? { cursor: 'pointer', '&:hover': { opacity: 0.7 } } : {}),
                  }}
                  onClick={item.manual ? () => {
                    if (item.key === 'internal_review_done') {
                      handleMarkProvisioning('provisioning_ready', done ? 0 : 1);
                    }
                  } : undefined}
                >
                  <CheckIcon sx={{ fontSize: 18, color: done ? '#4caf50' : alpha('#9e9e9e', 0.4) }} />
                  <Typography variant="body2" sx={{ color: done ? 'text.primary' : 'text.disabled' }}>
                    {item.label}{item.manual ? ' ✎' : ''}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
          {Object.values(provisionChecklist).filter(Boolean).length} / {Object.keys(provisionChecklist).length} complete
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!crm?.provisioning_ready && (
            <Button
              size="small" variant="outlined" color="info"
              onClick={() => handleMarkProvisioning('provisioning_ready', 1)}
              disabled={pipelineSaving}
            >
              Mark Ready for Provisioning
            </Button>
          )}
          {crm?.provisioning_ready && !crm?.provisioning_completed && (
            <Button
              size="small" variant="contained" color="success"
              onClick={() => handleMarkProvisioning('provisioning_completed', 1)}
              disabled={pipelineSaving}
            >
              Mark Active / Provisioned
            </Button>
          )}
        </Box>
      </>
    )}

    {/* Record Requirements (from pipeline) */}
    {pipelineRequirements.length > 0 && sectionPaper(
      <>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Record Requirements</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {pipelineRequirements.map(r => (
            <Paper key={r.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>{r.record_type}</Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {r.uses_sample ? <Chip label={r.template_name || 'Sample Template'} size="small" color="info" variant="outlined" /> : null}
                  {r.custom_required ? <Chip label="Custom Required" size="small" color="warning" variant="outlined" /> : null}
                </Box>
              </Box>
              {r.custom_notes && <Typography variant="caption" color="text.secondary">{r.custom_notes}</Typography>}
            </Paper>
          ))}
        </Box>
      </>
    )}
  </>
);

export default OverviewPanel;
