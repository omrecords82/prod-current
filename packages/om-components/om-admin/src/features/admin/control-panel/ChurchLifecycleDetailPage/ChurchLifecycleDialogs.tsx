/**
 * ChurchLifecycleDialogs.tsx — All 7 inline dialogs extracted from ChurchLifecycleDetailPage
 *
 * Contact, Activity, Follow-up, Stage Change, Reject Member,
 * Record Requirement, Email Composer
 */

import {
  Close as CloseIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import React from 'react';
import { COLOR, EMAIL_TYPES, RECORD_TYPES } from './constants';
import type { CRMContact, PipelineStage, SampleTemplate } from './types';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface ChurchLifecycleDialogsProps {
  // Contact dialog
  contactDialogOpen: boolean;
  setContactDialogOpen: (v: boolean) => void;
  editingContact: CRMContact | null;
  contactForm: { first_name: string; last_name: string; role: string; email: string; phone: string; is_primary: boolean; notes: string };
  setContactForm: React.Dispatch<React.SetStateAction<{ first_name: string; last_name: string; role: string; email: string; phone: string; is_primary: boolean; notes: string }>>;
  handleSaveContact: () => void;

  // Activity dialog
  activityDialogOpen: boolean;
  setActivityDialogOpen: (v: boolean) => void;
  activityForm: { activity_type: string; subject: string; body: string };
  setActivityForm: React.Dispatch<React.SetStateAction<{ activity_type: string; subject: string; body: string }>>;
  handleLogActivity: () => void;

  // Follow-up dialog
  followUpDialogOpen: boolean;
  setFollowUpDialogOpen: (v: boolean) => void;
  followUpForm: { due_date: string; subject: string; description: string };
  setFollowUpForm: React.Dispatch<React.SetStateAction<{ due_date: string; subject: string; description: string }>>;
  handleAddFollowUp: () => void;

  // Stage dialog
  stageDialogOpen: boolean;
  setStageDialogOpen: (v: boolean) => void;
  newStage: string;
  setNewStage: (v: string) => void;
  stages: PipelineStage[];
  unifiedStage: string;
  handleStageChange: () => void;

  // Reject dialog
  rejectDialog: { open: boolean; userId: number | null; email: string };
  setRejectDialog: (v: { open: boolean; userId: number | null; email: string }) => void;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  handleRejectMember: () => void;

  // Record requirement dialog
  reqDialogOpen: boolean;
  setReqDialogOpen: (v: boolean) => void;
  reqForm: { record_type: string; uses_sample: boolean; sample_template_id: number | null; custom_required: boolean; custom_notes: string; review_required: boolean };
  setReqForm: React.Dispatch<React.SetStateAction<{ record_type: string; uses_sample: boolean; sample_template_id: number | null; custom_required: boolean; custom_notes: string; review_required: boolean }>>;
  sampleTemplates: SampleTemplate[];
  handleSaveRequirement: () => void;
  pipelineSaving: boolean;

  // Email composer dialog
  emailDialogOpen: boolean;
  setEmailDialogOpen: (v: boolean) => void;
  emailForm: { email_type: string; subject: string; recipients: string; cc: string; body: string; notes: string };
  setEmailForm: React.Dispatch<React.SetStateAction<{ email_type: string; subject: string; recipients: string; cc: string; body: string; notes: string }>>;
  emailTemplates: { type: string; subject: string; body: string }[];
  contacts: CRMContact[];
  churchName: string;
  handleSaveEmail: (status: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ChurchLifecycleDialogs: React.FC<ChurchLifecycleDialogsProps> = ({
  contactDialogOpen, setContactDialogOpen, editingContact, contactForm, setContactForm, handleSaveContact,
  activityDialogOpen, setActivityDialogOpen, activityForm, setActivityForm, handleLogActivity,
  followUpDialogOpen, setFollowUpDialogOpen, followUpForm, setFollowUpForm, handleAddFollowUp,
  stageDialogOpen, setStageDialogOpen, newStage, setNewStage, stages, unifiedStage, handleStageChange,
  rejectDialog, setRejectDialog, rejectReason, setRejectReason, handleRejectMember,
  reqDialogOpen, setReqDialogOpen, reqForm, setReqForm, sampleTemplates, handleSaveRequirement, pipelineSaving,
  emailDialogOpen, setEmailDialogOpen, emailForm, setEmailForm, emailTemplates, contacts, churchName, handleSaveEmail,
}) => (
  <>
    {/* Contact Dialog */}
    <Dialog open={contactDialogOpen} onClose={() => setContactDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>{editingContact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth size="small" label="First Name" value={contactForm.first_name} onChange={e => setContactForm(f => ({ ...f, first_name: e.target.value }))} required />
            <TextField fullWidth size="small" label="Last Name" value={contactForm.last_name} onChange={e => setContactForm(f => ({ ...f, last_name: e.target.value }))} />
          </Box>
          <TextField fullWidth size="small" label="Role" value={contactForm.role} onChange={e => setContactForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g., Pastor, Secretary" />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth size="small" label="Email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} />
            <TextField fullWidth size="small" label="Phone" value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} />
          </Box>
          <TextField fullWidth size="small" label="Notes" multiline minRows={2} value={contactForm.notes} onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch checked={contactForm.is_primary} onChange={e => setContactForm(f => ({ ...f, is_primary: e.target.checked }))} />
            <Typography variant="body2">Primary Contact</Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setContactDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleSaveContact} variant="contained" disabled={!contactForm.first_name} sx={{ bgcolor: COLOR }}>
          {editingContact ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Activity Dialog */}
    <Dialog open={activityDialogOpen} onClose={() => setActivityDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Log Activity</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            select fullWidth size="small" label="Type"
            value={activityForm.activity_type}
            onChange={e => setActivityForm(f => ({ ...f, activity_type: e.target.value }))}
          >
            {['note', 'call', 'email', 'meeting', 'task'].map(t => (
              <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>
            ))}
          </TextField>
          <TextField fullWidth size="small" label="Subject" value={activityForm.subject} onChange={e => setActivityForm(f => ({ ...f, subject: e.target.value }))} required />
          <TextField fullWidth size="small" label="Details" multiline minRows={3} value={activityForm.body} onChange={e => setActivityForm(f => ({ ...f, body: e.target.value }))} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setActivityDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleLogActivity} variant="contained" disabled={!activityForm.subject} sx={{ bgcolor: COLOR }}>Log</Button>
      </DialogActions>
    </Dialog>

    {/* Follow-up Dialog */}
    <Dialog open={followUpDialogOpen} onClose={() => setFollowUpDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Schedule Follow-up</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            fullWidth size="small" label="Due Date" type="date"
            value={followUpForm.due_date}
            onChange={e => setFollowUpForm(f => ({ ...f, due_date: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField fullWidth size="small" label="Subject" value={followUpForm.subject} onChange={e => setFollowUpForm(f => ({ ...f, subject: e.target.value }))} required />
          <TextField fullWidth size="small" label="Description" multiline minRows={2} value={followUpForm.description} onChange={e => setFollowUpForm(f => ({ ...f, description: e.target.value }))} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setFollowUpDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleAddFollowUp} variant="contained" disabled={!followUpForm.due_date || !followUpForm.subject} sx={{ bgcolor: COLOR }}>Schedule</Button>
      </DialogActions>
    </Dialog>

    {/* Stage Change Dialog */}
    <Dialog open={stageDialogOpen} onClose={() => setStageDialogOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle>Change Pipeline Stage</DialogTitle>
      <DialogContent>
        <TextField
          select fullWidth size="small" label="New Stage"
          value={newStage}
          onChange={e => setNewStage(e.target.value)}
          sx={{ mt: 1 }}
        >
          {stages.map(s => (
            <MenuItem key={s.stage_key} value={s.stage_key}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color }} />
                {s.label}
              </Box>
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setStageDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleStageChange} variant="contained" disabled={!newStage || newStage === unifiedStage} sx={{ bgcolor: COLOR }}>
          Change
        </Button>
      </DialogActions>
    </Dialog>

    {/* Reject Member Dialog */}
    <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, userId: null, email: '' })} maxWidth="sm" fullWidth>
      <DialogTitle>Reject Registration</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Rejecting <strong>{rejectDialog.email}</strong> will keep their account locked.
        </Typography>
        <TextField
          fullWidth label="Reason (optional)" value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
          placeholder="e.g., Not a recognized parishioner" size="small"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setRejectDialog({ open: false, userId: null, email: '' })}>Cancel</Button>
        <Button onClick={handleRejectMember} color="error" variant="contained">Reject</Button>
      </DialogActions>
    </Dialog>

    {/* Record Requirement Dialog */}
    <Dialog open={reqDialogOpen} onClose={() => setReqDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Add Record Requirement</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
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
                {sampleTemplates.filter(t => t.record_type === reqForm.record_type).map(t => (
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setReqDialogOpen(false)}>Cancel</Button>
        <Button variant="contained" onClick={handleSaveRequirement} disabled={pipelineSaving} sx={{ bgcolor: COLOR }}>
          Save Requirement
        </Button>
      </DialogActions>
    </Dialog>

    {/* Email Composer Dialog */}
    <Dialog open={emailDialogOpen} onClose={() => setEmailDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Compose Email</Typography>
          <IconButton size="small" onClick={() => setEmailDialogOpen(false)}><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Email Type</InputLabel>
            <Select
              value={emailForm.email_type}
              label="Email Type"
              onChange={(e) => {
                const type = e.target.value;
                const template = emailTemplates.find(t => t.type === type);
                const name = churchName;
                const primaryContact = contacts.find(c => c.is_primary === 1) || contacts[0];
                const contactName = primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name || ''}`.trim() : 'Parish Administrator';
                setEmailForm(prev => ({
                  ...prev,
                  email_type: type,
                  subject: (template?.subject || '').replace(/{church_name}/g, name).replace(/{contact_name}/g, contactName),
                  body: (template?.body || '').replace(/{church_name}/g, name).replace(/{contact_name}/g, contactName).replace(/{custom_message}/g, ''),
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
        <Button variant="outlined" onClick={() => handleSaveEmail('draft')} disabled={pipelineSaving}>Save Draft</Button>
        <Button variant="contained" startIcon={<SendIcon />} onClick={() => handleSaveEmail('sent')} disabled={pipelineSaving}
          sx={{ bgcolor: COLOR, '&:hover': { bgcolor: alpha(COLOR, 0.85) } }}
        >
          Log as Sent
        </Button>
      </DialogActions>
    </Dialog>
  </>
);

export default ChurchLifecycleDialogs;
