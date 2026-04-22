/**
 * dialogState — single reducer that owns all 7 dialog open flags + their
 * forms in ChurchLifecycleDetailPage.
 *
 * Drains 14 useStates (STATE_EXPLOSION refactor — OMD-842). The parent wraps
 * each slice in a SetStateAction-compatible setter so ChurchLifecycleDialogs
 * doesn't need to change its prop interface.
 */
import type { CRMContact } from './types';

export interface ContactForm {
  first_name: string;
  last_name: string;
  role: string;
  email: string;
  phone: string;
  is_primary: boolean;
  notes: string;
}

export interface ActivityForm {
  activity_type: string;
  subject: string;
  body: string;
}

export interface FollowUpForm {
  due_date: string;
  subject: string;
  description: string;
}

export interface ReqForm {
  record_type: string;
  uses_sample: boolean;
  sample_template_id: number | null;
  custom_required: boolean;
  custom_notes: string;
  review_required: boolean;
}

export interface EmailForm {
  email_type: string;
  subject: string;
  recipients: string;
  cc: string;
  body: string;
  notes: string;
}

export interface RejectDialog {
  open: boolean;
  userId: number | null;
  email: string;
}

export interface DialogState {
  contactDialogOpen: boolean;
  editingContact: CRMContact | null;
  contactForm: ContactForm;

  activityDialogOpen: boolean;
  activityForm: ActivityForm;

  followUpDialogOpen: boolean;
  followUpForm: FollowUpForm;

  stageDialogOpen: boolean;
  newStage: string;

  rejectDialog: RejectDialog;
  rejectReason: string;

  reqDialogOpen: boolean;
  reqForm: ReqForm;

  emailDialogOpen: boolean;
  emailForm: EmailForm;
}

export const emptyContactForm: ContactForm = {
  first_name: '', last_name: '', role: '', email: '', phone: '', is_primary: false, notes: '',
};

export const emptyActivityForm: ActivityForm = {
  activity_type: 'note', subject: '', body: '',
};

export const emptyFollowUpForm: FollowUpForm = {
  due_date: '', subject: '', description: '',
};

export const emptyReqForm: ReqForm = {
  record_type: 'baptism', uses_sample: false, sample_template_id: null,
  custom_required: false, custom_notes: '', review_required: false,
};

export const emptyEmailForm: EmailForm = {
  email_type: 'welcome', subject: '', recipients: '', cc: '', body: '', notes: '',
};

export const initialDialogState: DialogState = {
  contactDialogOpen: false,
  editingContact: null,
  contactForm: emptyContactForm,
  activityDialogOpen: false,
  activityForm: emptyActivityForm,
  followUpDialogOpen: false,
  followUpForm: emptyFollowUpForm,
  stageDialogOpen: false,
  newStage: '',
  rejectDialog: { open: false, userId: null, email: '' },
  rejectReason: '',
  reqDialogOpen: false,
  reqForm: emptyReqForm,
  emailDialogOpen: false,
  emailForm: emptyEmailForm,
};

// SetStateAction helper — supports value or updater function
type SetterArg<T> = T | ((prev: T) => T);
function resolve<T>(arg: SetterArg<T>, prev: T): T {
  return typeof arg === 'function' ? (arg as (p: T) => T)(prev) : arg;
}

export type DialogAction =
  | { type: 'setContactDialogOpen'; value: boolean }
  | { type: 'setEditingContact'; value: CRMContact | null }
  | { type: 'setContactForm'; value: SetterArg<ContactForm> }
  | { type: 'setActivityDialogOpen'; value: boolean }
  | { type: 'setActivityForm'; value: SetterArg<ActivityForm> }
  | { type: 'setFollowUpDialogOpen'; value: boolean }
  | { type: 'setFollowUpForm'; value: SetterArg<FollowUpForm> }
  | { type: 'setStageDialogOpen'; value: boolean }
  | { type: 'setNewStage'; value: string }
  | { type: 'setRejectDialog'; value: RejectDialog }
  | { type: 'setRejectReason'; value: string }
  | { type: 'setReqDialogOpen'; value: boolean }
  | { type: 'setReqForm'; value: SetterArg<ReqForm> }
  | { type: 'setEmailDialogOpen'; value: boolean }
  | { type: 'setEmailForm'; value: SetterArg<EmailForm> };

export function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case 'setContactDialogOpen':
      return { ...state, contactDialogOpen: action.value };
    case 'setEditingContact':
      return { ...state, editingContact: action.value };
    case 'setContactForm':
      return { ...state, contactForm: resolve(action.value, state.contactForm) };
    case 'setActivityDialogOpen':
      return { ...state, activityDialogOpen: action.value };
    case 'setActivityForm':
      return { ...state, activityForm: resolve(action.value, state.activityForm) };
    case 'setFollowUpDialogOpen':
      return { ...state, followUpDialogOpen: action.value };
    case 'setFollowUpForm':
      return { ...state, followUpForm: resolve(action.value, state.followUpForm) };
    case 'setStageDialogOpen':
      return { ...state, stageDialogOpen: action.value };
    case 'setNewStage':
      return { ...state, newStage: action.value };
    case 'setRejectDialog':
      return { ...state, rejectDialog: action.value };
    case 'setRejectReason':
      return { ...state, rejectReason: action.value };
    case 'setReqDialogOpen':
      return { ...state, reqDialogOpen: action.value };
    case 'setReqForm':
      return { ...state, reqForm: resolve(action.value, state.reqForm) };
    case 'setEmailDialogOpen':
      return { ...state, emailDialogOpen: action.value };
    case 'setEmailForm':
      return { ...state, emailForm: resolve(action.value, state.emailForm) };
  }
}
