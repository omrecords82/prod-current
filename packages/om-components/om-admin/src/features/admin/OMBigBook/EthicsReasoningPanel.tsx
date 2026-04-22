import React from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Paper,
  Typography
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  Refresh as RefreshCwIcon,
  Lightbulb as EthicsIcon,
  Balance as MoralIcon,
  QuestionAnswer as ReasoningIcon
} from '@mui/icons-material';
import { EthicsProgress, EthicalFoundation, OMLearnSurvey } from './types';

interface EthicsReasoningPanelProps {
  ethicsProgress: EthicsProgress | null;
  ethicalFoundations: EthicalFoundation[];
  omlearnSurveys: OMLearnSurvey[];
  ethicsLoading: boolean;
  refreshOMAIData: () => void;
  setSelectedFoundation: (f: EthicalFoundation | null) => void;
  setFoundationDialogOpen: (open: boolean) => void;
  importOMLearnResponses: (responses: any) => Promise<void>;
}

const EthicsReasoningPanel: React.FC<EthicsReasoningPanelProps> = ({
  ethicsProgress,
  ethicalFoundations,
  omlearnSurveys,
  ethicsLoading,
  refreshOMAIData,
  setSelectedFoundation,
  setFoundationDialogOpen,
  importOMLearnResponses
}) => (
  <Box>
    {/* Ethics Progress Overview */}
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" component="h2">
            <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            OMAI Ethics & Reasoning Foundation
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={ethicsLoading ? <CircularProgress size={16} /> : <RefreshCwIcon />}
              onClick={refreshOMAIData}
              disabled={ethicsLoading}
              sx={{ mr: 1 }}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<EthicsIcon />}
              onClick={() => window.open('/omlearn', '_blank')}
            >
              Open OMLearn
            </Button>
          </Box>
        </Box>

        {ethicsProgress && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {ethicsProgress.completedSurveys}/{ethicsProgress.totalSurveys}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Surveys Completed
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(ethicsProgress.completedSurveys / ethicsProgress.totalSurveys) * 100}
                  sx={{ mt: 1 }}
                />
              </Paper>
            </Grid>

            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {ethicsProgress.ethicalFoundationsCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ethical Foundations
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {Math.round(ethicsProgress.moralComplexityScore)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Moral Complexity
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {ethicsProgress.reasoningMaturityLevel}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Reasoning Level
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* OMLearn Integration Status */}
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            OMLearn Survey Progress
          </Typography>
          {omlearnSurveys.length > 0 ? (
            <Grid container spacing={2}>
              {omlearnSurveys.map((survey) => (
                <Grid item xs={12} md={6} key={survey.id}>
                  <Paper sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                      <Typography variant="subtitle1">
                        {survey.title}
                      </Typography>
                      <Chip
                        label={survey.status.replace('_', ' ')}
                        color={
                          survey.status === 'completed' ? 'success' :
                          survey.status === 'in_progress' ? 'primary' : 'default'
                        }
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {survey.ageRange} • {survey.focus}
                    </Typography>
                    <Box display="flex" alignItems="center" mb={1}>
                      <LinearProgress
                        variant="determinate"
                        value={(survey.completedQuestions / survey.totalQuestions) * 100}
                        sx={{ width: '100%', mr: 1 }}
                      />
                      <Typography variant="body2">
                        {survey.completedQuestions}/{survey.totalQuestions}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info">
              No OMLearn surveys found. Complete OMLearn assessments to establish OMAI's ethical foundation.
            </Alert>
          )}
        </Box>
      </CardContent>
    </Card>

    {/* Ethical Foundations */}
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <MoralIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Ethical Foundations
        </Typography>

        {ethicalFoundations.length > 0 ? (
          <Grid container spacing={2}>
            {ethicalFoundations.slice(0, 6).map((foundation) => (
              <Grid item xs={12} md={6} lg={4} key={foundation.id}>
                <Paper
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    '&:hover': { elevation: 4 }
                  }}
                  onClick={() => {
                    setSelectedFoundation(foundation);
                    setFoundationDialogOpen(true);
                  }}
                >
                  <Box display="flex" justifyContent="between" alignItems="start" mb={1}>
                    <Typography variant="subtitle2" sx={{ flexGrow: 1, mr: 1 }}>
                      {foundation.question.length > 80
                        ? `${foundation.question.substring(0, 80)}...`
                        : foundation.question}
                    </Typography>
                    <Chip
                      label={foundation.gradeGroup}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      mb: 1
                    }}
                  >
                    {foundation.userResponse}
                  </Typography>

                  <Box display="flex" justifyContent="between" alignItems="center">
                    <Chip
                      label={foundation.category.replace('_', ' ')}
                      size="small"
                      color={
                        foundation.category === 'moral_development' ? 'primary' :
                        foundation.category === 'ethical_thinking' ? 'success' :
                        foundation.category === 'reasoning_patterns' ? 'info' : 'default'
                      }
                    />
                    <Typography variant="caption" color="text.secondary">
                      Weight: {foundation.weight}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Alert severity="warning">
            No ethical foundations established yet. Complete OMLearn surveys to build OMAI's moral reasoning framework.
          </Alert>
        )}

        {ethicalFoundations.length > 6 && (
          <Box textAlign="center" mt={2}>
            <Typography variant="body2" color="text.secondary">
              Showing 6 of {ethicalFoundations.length} ethical foundations
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>

    {/* Moral Reasoning Categories */}
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <ReasoningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Moral Reasoning Categories
        </Typography>

        <Grid container spacing={3}>
          {[
            {
              category: 'moral_development',
              name: 'Moral Development',
              description: 'Basic moral concepts and value formation',
              icon: '\uD83C\uDF31',
              color: 'primary'
            },
            {
              category: 'ethical_thinking',
              name: 'Ethical Thinking',
              description: 'Applied ethics and moral decision-making',
              icon: '\uD83E\uDD14',
              color: 'success'
            },
            {
              category: 'reasoning_patterns',
              name: 'Reasoning Patterns',
              description: 'Logical structures and thought processes',
              icon: '\uD83E\uDDE9',
              color: 'info'
            },
            {
              category: 'philosophical_concepts',
              name: 'Philosophical Concepts',
              description: 'Abstract moral and philosophical understanding',
              icon: '\uD83C\uDFAD',
              color: 'secondary'
            }
          ].map((category) => {
            const foundationsInCategory = ethicalFoundations.filter(f => f.category === category.category);
            return (
              <Grid item xs={12} md={6} key={category.category}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h2" sx={{ mb: 1 }}>
                    {category.icon}
                  </Typography>
                  <Typography variant="h6" color={`${category.color}.main`} gutterBottom>
                    {category.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {category.description}
                  </Typography>
                  <Typography variant="h4" color={`${category.color}.main`}>
                    {foundationsInCategory.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    foundations established
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  </Box>
);

export default EthicsReasoningPanel;
