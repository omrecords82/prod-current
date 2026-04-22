import React from 'react';
import {
  alpha,
  Avatar,
  Box,
  Typography,
} from '@mui/material';
import {
  Email as EmailIcon,
  NoteAlt as NoteIcon,
  Person as PersonIcon,
  Task as TaskIcon,
  VpnKey as TokenIcon,
} from '@mui/icons-material';
import { ACTIVITY_COLORS, ACTIVITY_ICONS } from './constants';
import type { TimelineEntry, TimelinePanelProps } from './types';

const buildTimeline = (props: TimelinePanelProps): TimelineEntry[] => {
  const { activities, pipelineActivities, pipelineEmails, tokens, members } = props;
  const entries: TimelineEntry[] = [];

  // CRM activities
  for (const a of activities) {
    entries.push({
      id: `crm-${a.id}`,
      type: 'crm_activity',
      icon: ACTIVITY_ICONS[a.activity_type] || <NoteIcon fontSize="small" />,
      color: ACTIVITY_COLORS[a.activity_type] || '#9e9e9e',
      title: a.subject,
      detail: a.body || undefined,
      date: a.created_at,
    });
  }

  // Pipeline activities
  for (const a of pipelineActivities) {
    entries.push({
      id: `pipe-${a.id}`,
      type: 'pipeline',
      icon: <TaskIcon fontSize="small" />,
      color: '#00bcd4',
      title: a.summary,
      detail: a.activity_type,
      date: a.created_at,
    });
  }

  // Emails
  for (const e of pipelineEmails) {
    entries.push({
      id: `email-${e.id}`,
      type: 'email',
      icon: <EmailIcon fontSize="small" />,
      color: '#2196f3',
      title: `${e.email_type.replace(/_/g, ' ')}: ${e.subject}`,
      detail: `To: ${e.recipients} — ${e.status}`,
      date: e.sent_at || e.created_at,
    });
  }

  // Token events
  for (const t of tokens) {
    entries.push({
      id: `token-${t.id}`,
      type: 'token',
      icon: <TokenIcon fontSize="small" />,
      color: '#00bcd4',
      title: t.is_active ? 'Registration token generated' : 'Token deactivated',
      date: t.created_at,
    });
  }

  // Member joins
  for (const m of members) {
    entries.push({
      id: `member-${m.id}`,
      type: 'member',
      icon: <PersonIcon fontSize="small" />,
      color: '#4caf50',
      title: `${m.full_name || m.first_name} joined as ${m.role || 'viewer'}`,
      detail: m.email,
      date: m.created_at,
    });
  }

  // Sort descending by date
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return entries;
};

const TimelinePanel: React.FC<TimelinePanelProps> = (props) => {
  const { isDark } = props;
  const timeline = buildTimeline(props);

  if (timeline.length === 0) {
    return <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No timeline events yet</Typography>;
  }

  let lastDateStr = '';

  return (
    <Box sx={{ position: 'relative', pl: 3.5 }}>
      {/* Vertical line */}
      <Box sx={{ position: 'absolute', left: 14, top: 0, bottom: 0, width: 2, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

      {timeline.map(entry => {
        const d = new Date(entry.date);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const showDate = dateStr !== lastDateStr;
        lastDateStr = dateStr;

        return (
          <React.Fragment key={entry.id}>
            {showDate && (
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mt: 2, mb: 1, ml: 1.5 }}>
                {dateStr}
              </Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5, position: 'relative' }}>
              {/* Dot */}
              <Avatar
                sx={{
                  width: 28, height: 28,
                  bgcolor: alpha(entry.color, isDark ? 0.25 : 0.12),
                  color: entry.color,
                  position: 'absolute',
                  left: -28,
                }}
              >
                {entry.icon}
              </Avatar>
              {/* Content */}
              <Box sx={{ flex: 1, ml: 1 }}>
                <Typography variant="body2" fontWeight={600}>{entry.title}</Typography>
                {entry.detail && (
                  <Typography variant="caption" color="text.secondary">{entry.detail}</Typography>
                )}
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                  {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Typography>
              </Box>
            </Box>
          </React.Fragment>
        );
      })}
    </Box>
  );
};

export default TimelinePanel;
