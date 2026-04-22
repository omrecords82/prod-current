import React from 'react';
import {
  Call as CallIcon,
  Email as EmailIcon,
  Groups as MeetingIcon,
  NoteAlt as NoteIcon,
  SwapHoriz as StageChangeIcon,
  Task as TaskIcon,
  VpnKey as TokenIcon,
} from '@mui/icons-material';

export const COLOR = '#1565c0';

export const STEPPER_STEPS = ['Church Created', 'Token Issued', 'Members Registered', 'Members Active', 'Setup Complete'];

export const RECORD_TYPES = ['baptism', 'marriage', 'funeral', 'chrismation', 'other'] as const;

export const EMAIL_TYPES = [
  { key: 'welcome', label: 'Welcome / Discovery Follow-up' },
  { key: 'info_request', label: 'Request Missing Info' },
  { key: 'template_confirm', label: 'Template Confirmation' },
  { key: 'custom_review', label: 'Custom Review Needed' },
  { key: 'provisioned', label: 'Account Provisioned' },
  { key: 'reminder', label: 'Reminder / Follow-up' },
];

export const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  note: <NoteIcon fontSize="small" />,
  call: <CallIcon fontSize="small" />,
  email: <EmailIcon fontSize="small" />,
  meeting: <MeetingIcon fontSize="small" />,
  task: <TaskIcon fontSize="small" />,
  stage_change: <StageChangeIcon fontSize="small" />,
  provision: <TokenIcon fontSize="small" />,
};

export const ACTIVITY_COLORS: Record<string, string> = {
  note: '#9e9e9e',
  call: '#4caf50',
  email: '#2196f3',
  meeting: '#ff9800',
  task: '#9c27b0',
  stage_change: '#e91e63',
  provision: '#00bcd4',
};
