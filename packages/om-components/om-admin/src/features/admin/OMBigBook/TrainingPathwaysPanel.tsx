import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Alert
} from '@mui/material';
import {
  Assignment as TaskIcon,
  Code as CodeIcon,
  Analytics as AnalyticsIcon,
  Speed as PerformanceIcon,
  Insights as InsightsIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { TrainingSession } from './types';

interface TrainingPathwaysPanelProps {
  trainingSessions: TrainingSession[];
  activeTrainingSession: TrainingSession | null;
  learningLoading: boolean;
  setSelectedTrainingPhase: (phase: string) => void;
  setTrainingDialogOpen: (open: boolean) => void;
}

const TrainingPathwaysPanel: React.FC<TrainingPathwaysPanelProps> = ({
  trainingSessions,
  activeTrainingSession,
  learningLoading,
  setSelectedTrainingPhase,
  setTrainingDialogOpen
}) => (
  <Box>
    {/* Training Sessions */}
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <TaskIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Training Sessions
        </Typography>

        {trainingSessions.length === 0 ? (
          <Alert severity="info">
            No training sessions found. Start your first training session to begin OMAI's learning journey.
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Session Name</TableCell>
                  <TableCell>Phase</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Results</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trainingSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{session.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={session.phase}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={session.status}
                        color={
                          session.status === 'completed' ? 'success' :
                          session.status === 'running' ? 'primary' :
                          session.status === 'failed' ? 'error' : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <LinearProgress
                          variant="determinate"
                          value={session.progress}
                          sx={{ width: 100, mr: 1 }}
                        />
                        <Typography variant="body2">
                          {session.progress}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {session.duration ? `${Math.round(session.duration / 60)} min` : '-'}
                    </TableCell>
                    <TableCell>
                      {session.results && (
                        <Tooltip title={`Files: ${session.results.filesProcessed}, Memories: ${session.results.memoriesCreated}, Knowledge: ${session.results.knowledgeExtracted}`}>
                          <Chip
                            label={`${session.results.filesProcessed} files`}
                            size="small"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small">
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>

    {/* Training Phases Overview */}
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Training Phases
        </Typography>

        <Grid container spacing={2}>
          {[
            {
              id: 'foundation',
              name: 'Foundation Knowledge',
              description: 'Basic system understanding and file structure analysis',
              icon: <CodeIcon />
            },
            {
              id: 'functional',
              name: 'Functional Understanding',
              description: 'API patterns, component relationships, and data flow',
              icon: <AnalyticsIcon />
            },
            {
              id: 'operational',
              name: 'Operational Intelligence',
              description: 'Deployment, monitoring, and performance patterns',
              icon: <PerformanceIcon />
            },
            {
              id: 'resolution',
              name: 'Issue Resolution',
              description: 'Problem-solving patterns and error handling',
              icon: <InsightsIcon />
            },
            {
              id: 'predictive',
              name: 'Predictive Capabilities',
              description: 'Proactive maintenance and optimization',
              icon: <TrendingUpIcon />
            }
          ].map((phase) => (
            <Grid item xs={12} md={6} lg={4} key={phase.id}>
              <Paper
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  '&:hover': { elevation: 4 }
                }}
                onClick={() => {
                  setSelectedTrainingPhase(phase.id);
                  setTrainingDialogOpen(true);
                }}
              >
                <Box display="flex" alignItems="center" mb={1}>
                  {phase.icon}
                  <Typography variant="subtitle1" sx={{ ml: 1 }}>
                    {phase.name}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {phase.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  </Box>
);

export default TrainingPathwaysPanel;
