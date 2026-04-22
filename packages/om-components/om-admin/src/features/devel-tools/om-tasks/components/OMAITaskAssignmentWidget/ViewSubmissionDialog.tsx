import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  List,
  Paper,
  Typography,
} from '@mui/material';
import {
  Computer as ComputerIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import type { TaskSubmission } from './types';
import { formatDate, getStatusColor } from './helpers';

interface ViewSubmissionDialogProps {
  open: boolean;
  onClose: () => void;
  submission: TaskSubmission | null;
  onDownload: (submission: TaskSubmission) => void;
}

const ViewSubmissionDialog: React.FC<ViewSubmissionDialogProps> = ({
  open,
  onClose,
  submission,
  onDownload,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>
      Task Submission Details
      {submission && (
        <Typography variant="subtitle2" color="text.secondary">
          Submission #{submission.id} from {submission.email}
        </Typography>
      )}
    </DialogTitle>
    <DialogContent>
      {submission && (
        <Box>
          {/* Submission Info */}
          <Paper sx={{ p: 3, mb: 3, bgcolor: '#f9f9f9' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Submitted:</strong> {formatDate(submission.submitted_at)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Status:</strong>
                  <Chip
                    label={submission.status}
                    color={getStatusColor(submission.status) as any}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>IP Address:</strong>
                  <Box display="flex" alignItems="center" sx={{ ml: 1 }}>
                    <ComputerIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2" fontFamily="monospace">
                      {submission.ip_address}
                    </Typography>
                  </Box>
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Type:</strong>
                  <Chip
                    label={submission.submission_type}
                    size="small"
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Grid>
              {submission.sent_to_nick && submission.sent_at && (
                <Grid item xs={12}>
                  <Typography variant="body2">
                    <strong>Email Sent:</strong> {formatDate(submission.sent_at)}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Task List */}
          <Typography variant="h6" gutterBottom>
            Submitted Tasks
          </Typography>

          {(() => {
            try {
              const tasks = JSON.parse(submission.tasks_json);
              return (
                <List>
                  {tasks.map((task: any, index: number) => (
                    <Paper key={index} sx={{ mb: 2, p: 3 }} variant="outlined">
                      <Box display="flex" alignItems="center" mb={2}>
                        <Typography variant="h6" component="span">
                          Task {index + 1}
                        </Typography>
                        <Chip
                          label={task.priority}
                          color={
                            task.priority === 'high' ? 'error' :
                            task.priority === 'medium' ? 'warning' : 'default'
                          }
                          size="small"
                          sx={{ ml: 2 }}
                        />
                      </Box>

                      <Typography variant="body1" fontWeight="medium" gutterBottom>
                        {task.title}
                      </Typography>

                      {task.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                          {task.description}
                        </Typography>
                      )}
                    </Paper>
                  ))}
                </List>
              );
            } catch (error) {
              return (
                <Alert severity="error">
                  Failed to parse task data: {submission.tasks_json}
                </Alert>
              );
            }
          })()}
        </Box>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>
        Close
      </Button>
      {submission && (
        <Button
          onClick={() => onDownload(submission)}
          variant="contained"
          startIcon={<DownloadIcon />}
          sx={{ bgcolor: '#8c249d' }}
        >
          Download Report
        </Button>
      )}
    </DialogActions>
  </Dialog>
);

export default ViewSubmissionDialog;
