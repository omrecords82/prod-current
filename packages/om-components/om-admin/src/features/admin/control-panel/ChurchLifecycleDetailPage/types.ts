import React from 'react';

export interface CRMChurch {
  id: number;
  name: string;
  city: string | null;
  state_code: string | null;
  phone: string | null;
  website: string | null;
  pipeline_stage: string;
  priority: string | null;
  is_client: number;
  provisioned_church_id: number | null;
  last_contacted_at: string | null;
  next_follow_up: string | null;
  crm_notes: string | null;
  jurisdiction: string | null;
  created_at: string;
  stage_label?: string;
  stage_color?: string;
  street?: string;
  zip?: string;
  current_records_situation?: string | null;
  estimated_volume?: string | null;
  historical_import_needed?: number;
  ocr_assistance_needed?: number;
  public_records_needed?: number;
  desired_launch_timeline?: string | null;
  custom_structure_required?: number;
  provisioning_ready?: number;
  provisioning_completed?: number;
  activation_date?: string | null;
  assigned_to_user_id?: number | null;
  discovery_notes?: string | null;
  blockers?: string | null;
}

export interface OnboardedChurch {
  id: number;
  name: string;
  email: string | null;
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

export interface CRMContact {
  id: number;
  church_id: number;
  first_name: string;
  last_name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: number;
  notes: string | null;
}

export interface CRMActivity {
  id: number;
  church_id: number;
  activity_type: string;
  subject: string;
  body: string | null;
  metadata: any;
  created_by: number | null;
  created_at: string;
}

export interface CRMFollowUp {
  id: number;
  church_id: number;
  due_date: string;
  subject: string;
  description: string | null;
  status: string;
  completed_at: string | null;
}

export interface ChurchMember {
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

export interface ChurchToken {
  id: number;
  token: string;
  is_active: number;
  created_at: string;
  created_by: string | null;
}

export interface OnboardingChecklist {
  church_created: boolean;
  token_issued: boolean;
  members_registered: boolean;
  members_active: boolean;
  setup_complete: boolean;
}

export interface SampleTemplate {
  id: number;
  code: string;
  name: string;
  description: string;
  record_type: string;
  fields: { name: string; type: string; required: boolean; label: string }[];
}

export interface PipelineStage {
  id: number;
  stage_key: string;
  label: string;
  color: string;
  sort_order: number;
  is_terminal: number;
}

export interface RecordRequirement {
  id: number;
  record_type: string;
  uses_sample: number;
  sample_template_id: number | null;
  custom_required: number;
  custom_notes: string | null;
  template_name?: string;
}

export interface OnboardingEmail {
  id: number;
  email_type: string;
  subject: string;
  recipients: string;
  status: string;
  sent_at: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface PipelineActivity {
  id: number;
  activity_type: string;
  summary: string;
  details_json: any;
  actor_user_id: number | null;
  created_at: string;
}

export interface ProvisioningChecklist {
  contact_complete: boolean;
  record_requirements_set: boolean;
  templates_or_custom: boolean;
  internal_review_done: boolean;
  provisioning_email_sent: boolean;
  response_received: boolean;
  account_created: boolean;
  invite_sent: boolean;
  activated: boolean | null;
}

export interface TimelineEntry {
  id: string;
  type: 'activity' | 'crm_activity' | 'email' | 'stage_change' | 'member' | 'token' | 'pipeline';
  icon: React.ReactNode;
  color: string;
  title: string;
  detail?: string;
  date: string;
}

export type SnackState = { open: boolean; message: string; severity: 'success' | 'error' | 'info' };

/* ---- Panel prop interfaces ---- */

export interface OverviewPanelProps {
  hasOnboarding: boolean;
  hasCrm: boolean;
  checklist: OnboardingChecklist | null;
  getActiveStep: () => number;
  sectionPaper: (children: React.ReactNode) => JSX.Element;
  churchName: string;
  crm: CRMChurch | null;
  onboarded: OnboardedChurch | null;
  formatDate: (d: string | null) => string;
  notes: string;
  setNotes: (v: string) => void;
  notesOriginal: string;
  notesSaving: boolean;
  handleSaveNotes: () => void;
  followUps: CRMFollowUp[];
  handleCompleteFollowUp: (id: number) => void;
  editingDiscovery: boolean;
  discoveryDraft: string;
  setDiscoveryDraft: (v: string) => void;
  setEditingDiscovery: (v: boolean) => void;
  pipelineSaving: boolean;
  handleSaveInlineField: (field: string, value: string) => void;
  editingBlockers: boolean;
  blockersDraft: string;
  setBlockersDraft: (v: string) => void;
  setEditingBlockers: (v: boolean) => void;
  provisionChecklist: ProvisioningChecklist | null;
  handleMarkProvisioning: (field: string, value: any) => void;
  pipelineRequirements: RecordRequirement[];
  togglingSetup: boolean;
  handleToggleSetup: () => void;
  isDark: boolean;
}

export interface ContactsPanelProps {
  contacts: CRMContact[];
  setEditingContact: (c: CRMContact | null) => void;
  setContactForm: (f: any) => void;
  setContactDialogOpen: (v: boolean) => void;
  handleDeleteContact: (id: number) => void;
  isDark: boolean;
}

export interface ActivityPanelProps {
  activities: CRMActivity[];
  setActivityForm: (f: any) => void;
  setActivityDialogOpen: (v: boolean) => void;
  isDark: boolean;
  timeAgo: (d: string) => string;
}

export interface FollowUpsPanelProps {
  followUps: CRMFollowUp[];
  handleCompleteFollowUp: (id: number) => void;
  setFollowUpForm: (f: any) => void;
  setFollowUpDialogOpen: (v: boolean) => void;
  formatDate: (d: string | null) => string;
}

export interface RequirementsPanelProps {
  pipelineRequirements: RecordRequirement[];
  setReqForm: (f: any) => void;
  setReqDialogOpen: (v: boolean) => void;
  handleDeleteRequirement: (id: number) => void;
  sampleTemplates: SampleTemplate[];
}

export interface EmailWorkflowPanelProps {
  pipelineEmails: OnboardingEmail[];
  openEmailComposer: (type?: string) => void;
  handleUpdateEmailStatus: (emailId: number, status: string) => void;
  formatDateTime: (d: string | null) => string;
  isDark: boolean;
}

export interface OnboardingPanelProps {
  members: ChurchMember[];
  tokens: ChurchToken[];
  isDark: boolean;
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  formatDate: (d: string | null) => string;
  actionLoading: number | null;
  handleApproveMember: (userId: number, email: string) => void;
  setRejectDialog: (d: { open: boolean; userId: number | null; email: string }) => void;
  hasActiveToken: boolean;
  generatingToken: boolean;
  handleGenerateToken: () => void;
  deactivatingToken: number | null;
  handleDeactivateToken: (tokenId: number) => void;
  copyToClipboard: (text: string, label?: string) => void;
}

export interface TimelinePanelProps {
  activities: CRMActivity[];
  pipelineActivities: PipelineActivity[];
  pipelineEmails: OnboardingEmail[];
  tokens: ChurchToken[];
  members: ChurchMember[];
  isDark: boolean;
}
