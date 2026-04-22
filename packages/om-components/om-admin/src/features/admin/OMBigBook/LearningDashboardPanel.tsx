import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  LinearProgress,
  Paper,
  Typography,
  Alert
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  Refresh as RefreshCwIcon,
  School as LearningIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import { LearningProgress, TrainingSession } from './types';

interface LearningDashboardPanelProps {
  learningProgress: LearningProgress | null;
  activeTrainingSession: TrainingSession | null;
  learningLoading: boolean;
  refreshOMAIData: () => void;
  setTrainingDialogOpen: (open: boolean) => void;
  stopTrainingSession: () => void;
}

const LearningDashboardPanel: React.FC<LearningDashboardPanelProps> = ({
  learningProgress,
  activeTrainingSession,
  learningLoading,
  refreshOMAIData,
  setTrainingDialogOpen,
  stopTrainingSession
}) => (
  <Box>
    {/* Learning Progress Overview */}
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" component="h2">
            <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            OMAI Learning Dashboard
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={learningLoading ? <CircularProgress size={16} /> : <RefreshCwIcon />}
              onClick={refreshOMAIData}
              disabled={learningLoading}
              sx={{ mr: 1 }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<LearningIcon />}
              onClick={() => setTrainingDialogOpen(true)}
              disabled={!!activeTrainingSession}
            >
              Start Training
            </Button>
          </Box>
        </Box>

        {learningProgress && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {Math.round(learningProgress.overallProgress)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overall Progress
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={learningProgress.overallProgress}
                  sx={{ mt: 1 }}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {learningProgress.knowledgePoints}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Knowledge Points
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {learningProgress.memoriesCreated}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Memories Created
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {learningProgress.filesProcessed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Files Processed
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Current Phase Status */}
        {learningProgress && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Current Learning Phase
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle1">
                <strong>{learningProgress.currentPhase}</strong>
              </Typography>
              <Typography variant="body2">
                {learningProgress.completedSessions} of {learningProgress.totalSessions} sessions completed
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last Activity: {learningProgress.lastActivity}
              </Typography>
            </Alert>
          </Box>
        )}

        {/* Active Training Session */}
        {activeTrainingSession && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Active Training Session
            </Typography>
            <Paper sx={{ p: 2, border: 2, borderColor: 'primary.main' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="subtitle1" color="primary">
                    {activeTrainingSession.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Phase: {activeTrainingSession.phase}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<StopIcon />}
                  onClick={stopTrainingSession}
                  size="small"
                >
                  Stop
                </Button>
              </Box>
              <LinearProgress
                variant="determinate"
                value={activeTrainingSession.progress}
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" align="center">
                {activeTrainingSession.progress}% Complete
              </Typography>
            </Paper>
          </Box>
        )}
      </CardContent>
    </Card>
  </Box>
);

export default LearningDashboardPanel;
