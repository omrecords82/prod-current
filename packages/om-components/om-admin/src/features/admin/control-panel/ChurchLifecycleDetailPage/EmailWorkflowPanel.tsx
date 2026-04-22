import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  CheckCircleOutline as CheckOutlineIcon,
  Send as SendIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { EMAIL_TYPES } from './constants';
import type { EmailWorkflowPanelProps } from './types';

const EmailWorkflowPanel: React.FC<EmailWorkflowPanelProps> = ({
  pipelineEmails,
  openEmailComposer,
  handleUpdateEmailStatus,
  formatDateTime,
}) => (
  <>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>Email Correspondence ({pipelineEmails.length})</Typography>
        <Typography variant="caption" color="text.secondary">Track emails sent outside this system — drafts and status updates are for logging only</Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {EMAIL_TYPES.map(et => (
          <Button key={et.key} size="small" variant="outlined" onClick={() => openEmailComposer(et.key)}
            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
          >
            {et.label}
          </Button>
        ))}
      </Box>
    </Box>

    {pipelineEmails.length === 0 ? (
      <Alert severity="info">No emails yet. Use the buttons above to draft a formal email.</Alert>
    ) : (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {pipelineEmails.map(email => (
          <Paper key={email.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
                  <Chip label={email.email_type.replace(/_/g, ' ')} size="small" sx={{ textTransform: 'capitalize' }} />
                  <Chip
                    label={email.status.replace(/_/g, ' ')}
                    size="small"
                    color={
                      email.status === 'completed' ? 'success' :
                      email.status === 'sent' ? 'info' :
                      email.status === 'replied' ? 'primary' :
                      email.status === 'awaiting_response' ? 'warning' : 'default'
                    }
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatDateTime(email.sent_at || email.created_at)}
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight={600}>{email.subject}</Typography>
                <Typography variant="caption" color="text.secondary">To: {email.recipients}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, ml: 2 }}>
                {email.status === 'draft' && (
                  <Tooltip title="Log as Sent">
                    <IconButton size="small" color="primary" onClick={() => handleUpdateEmailStatus(email.id, 'sent')}>
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {email.status === 'sent' && (
                  <Tooltip title="Log Reply Received">
                    <IconButton size="small" color="success" onClick={() => handleUpdateEmailStatus(email.id, 'replied')}>
                      <CheckIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {(email.status === 'sent' || email.status === 'awaiting_response') && (
                  <Tooltip title="Log as Awaiting Response">
                    <IconButton size="small" color="warning" onClick={() => handleUpdateEmailStatus(email.id, 'awaiting_response')}>
                      <TimelineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {email.status !== 'completed' && (
                  <Tooltip title="Log as Completed">
                    <IconButton size="small" onClick={() => handleUpdateEmailStatus(email.id, 'completed')}>
                      <CheckOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>
    )}
  </>
);

export default EmailWorkflowPanel;
