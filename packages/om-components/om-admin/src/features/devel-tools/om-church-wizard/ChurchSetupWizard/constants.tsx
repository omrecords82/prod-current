import React from 'react';
import { StepConnector } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  CheckCircle as CheckIcon,
  Church as ChurchIcon,
  People as PeopleIcon,
  Web as WebIcon,
  VpnKey as TokenIcon,
  TableChart as TableIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';

export const STEP_CONFIG = [
  { label: 'Church Information', icon: <ChurchIcon />, description: 'Basic details about your church' },
  { label: 'Template Selection', icon: <DashboardIcon />, description: 'Clone from an existing church or start fresh' },
  { label: 'Record Tables', icon: <TableIcon />, description: 'Configure database tables and custom fields' },
  { label: 'User Management', icon: <PeopleIcon />, description: 'Add initial users and set permissions' },
  { label: 'Landing Page', icon: <WebIcon />, description: 'Customize the church landing page' },
  { label: 'Review & Create', icon: <CheckIcon />, description: 'Review all settings before creating' },
  { label: 'Registration Token', icon: <TokenIcon />, description: 'Share this token so members can register' },
];

export const steps = STEP_CONFIG.map(s => s.label);

export const AVAILABLE_RECORD_TABLES = [
  { key: 'baptism_records', label: 'Baptism Records', description: 'Track baptism ceremonies and certificates' },
  { key: 'marriage_records', label: 'Marriage Records', description: 'Manage wedding ceremonies and certificates' },
  { key: 'funeral_records', label: 'Funeral Records', description: 'Record funeral services and memorials' },
  { key: 'clergy', label: 'Clergy Management', description: 'Manage priests, deacons, and church staff' },
  { key: 'members', label: 'Church Members', description: 'Comprehensive membership database' },
  { key: 'donations', label: 'Donations & Offerings', description: 'Track financial contributions' },
  { key: 'calendar_events', label: 'Calendar Events', description: 'Liturgical and parish events' },
  { key: 'confession_records', label: 'Confession Records', description: 'Private confession tracking (encrypted)' },
  { key: 'communion_records', label: 'Communion Records', description: 'Holy Communion participation' },
  { key: 'chrismation_records', label: 'Chrismation Records', description: 'Confirmation ceremonies' }
];

export const FIELD_TYPES = [
  { value: 'VARCHAR', label: 'Text (Short)', maxLength: 255 },
  { value: 'TEXT', label: 'Text (Long)', maxLength: null },
  { value: 'INT', label: 'Number', maxLength: null },
  { value: 'DATE', label: 'Date', maxLength: null },
  { value: 'BOOLEAN', label: 'Yes/No', maxLength: null }
];

export const USER_ROLES = [
  { value: 'church_admin', label: 'Church Administrator', description: 'Full access to all church functions' },
  { value: 'priest', label: 'Priest', description: 'Full clergy privileges and record lifecycle authority' },
  { value: 'deacon', label: 'Deacon', description: 'Partial clergy privileges' },
  { value: 'editor', label: 'Editor', description: 'Add and edit records' },
  { value: 'viewer', label: 'Viewer', description: 'View-only access' }
];

export const AVAILABLE_PERMISSIONS = [
  'view_records', 'create_records', 'edit_records', 'delete_records',
  'view_reports', 'export_data', 'manage_users', 'view_analytics'
];

export const DEFAULT_APP_OPTIONS = [
  {
    value: 'liturgical_calendar',
    label: 'Liturgical Calendar',
    description: 'Orthodox liturgical calendar with feast days and fasting periods'
  },
  {
    value: 'church_records',
    label: 'Church Records',
    description: 'Manage baptism, marriage, and funeral records'
  },
  {
    value: 'notes_app',
    label: 'Notes App',
    description: 'Personal notes and task management'
  }
];

export const StyledStepConnector = styled(StepConnector)(({ theme }) => ({
  '& .MuiStepConnector-line': {
    borderColor: theme.palette.divider,
    borderLeftWidth: 2,
    minHeight: 20,
  },
}));
