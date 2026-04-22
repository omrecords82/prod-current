import React from 'react';
import {
  Assignment as AssignmentIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import type { TaskSubmission } from './types';

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'success';
    case 'used': return 'info';
    case 'expired': return 'warning';
    case 'deleted': return 'error';
    case 'pending': return 'warning';
    case 'processed': return 'info';
    case 'completed': return 'success';
    case 'failed': return 'error';
    default: return 'default';
  }
};

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active': return <LinkIcon />;
    case 'used': return <CheckCircleIcon />;
    case 'expired': return <ScheduleIcon />;
    case 'deleted': return <DeleteIcon />;
    case 'pending': return <ScheduleIcon />;
    case 'processed': return <InfoIcon />;
    case 'completed': return <CheckCircleIcon />;
    case 'failed': return <WarningIcon />;
    default: return <InfoIcon />;
  }
};

export const getActionIcon = (action: string) => {
  const iconMap: { [key: string]: JSX.Element } = {
    'TASK_LINK_GENERATED': <EmailIcon color="primary" />,
    'TASKS_SUBMITTED': <CheckCircleIcon color="success" />,
    'TOKEN_VALIDATED': <VisibilityIcon color="info" />,
    'TASK_LINK_ERROR': <AssignmentIcon color="error" />,
    'TASK_SUBMISSION_ERROR': <AssignmentIcon color="error" />
  };
  return iconMap[action] || <HistoryIcon />;
};

export const getActionLabel = (action: string) => {
  const labelMap: { [key: string]: string } = {
    'TASK_LINK_GENERATED': 'Link Generated',
    'TASKS_SUBMITTED': 'Tasks Submitted',
    'TOKEN_VALIDATED': 'Token Validated',
    'TASK_LINK_ERROR': 'Link Error',
    'TASK_SUBMISSION_ERROR': 'Submission Error'
  };
  return labelMap[action] || action;
};

export const parseTasksJson = (tasksJson: string) => {
  try {
    const tasks = JSON.parse(tasksJson);
    return Array.isArray(tasks) ? tasks : [];
  } catch {
    return [];
  }
};

export const generateSubmissionReport = (submission: TaskSubmission, tasks: any[]) => {
  const date = new Date(submission.submitted_at).toLocaleString();

  let report = `OMAI Task Submission Report\n`;
  report += `=====================================\n\n`;
  report += `Submission ID: ${submission.id}\n`;
  report += `From Email: ${submission.email}\n`;
  report += `Submitted: ${date}\n`;
  report += `IP Address: ${submission.ip_address}\n`;
  report += `User Agent: ${submission.user_agent || 'Not provided'}\n`;
  report += `Submission Type: ${submission.submission_type}\n`;
  report += `Total Tasks: ${tasks.length}\n`;
  report += `Status: ${submission.status}\n`;
  report += `Sent to Nick: ${submission.sent_to_nick ? 'Yes' : 'No'}\n`;
  if (submission.sent_at) {
    report += `Email Sent: ${new Date(submission.sent_at).toLocaleString()}\n`;
  }
  report += `\n`;

  report += `TASK DETAILS\n`;
  report += `=====================================\n\n`;

  tasks.forEach((task, index) => {
    report += `Task ${index + 1}:\n`;
    report += `  Title: ${task.title}\n`;
    report += `  Priority: ${task.priority}\n`;
    if (task.description) {
      report += `  Description:\n    ${task.description.replace(/\n/g, '\n    ')}\n`;
    }
    report += `\n`;
  });

  report += `\nReport generated: ${new Date().toLocaleString()}\n`;
  report += `© Orthodox Metrics AI System\n`;

  return report;
};
