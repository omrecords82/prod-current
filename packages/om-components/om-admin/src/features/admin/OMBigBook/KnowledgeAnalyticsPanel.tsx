import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography
} from '@mui/material';
import {
  Assessment as MetricsIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { KnowledgeMetrics, LearningProgress } from './types';

interface KnowledgeAnalyticsPanelProps {
  knowledgeMetrics: KnowledgeMetrics | null;
  learningProgress: LearningProgress | null;
}

const KnowledgeAnalyticsPanel: React.FC<KnowledgeAnalyticsPanelProps> = ({
  knowledgeMetrics,
  learningProgress
}) => (
  <Box>
    {knowledgeMetrics && (
      <>
        {/* Knowledge Overview */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <MetricsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Knowledge Analytics
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {knowledgeMetrics.totalMemories}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Memories
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {knowledgeMetrics.learningVelocity.memoriesPerWeek}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Memories/Week
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {Math.round(knowledgeMetrics.learningVelocity.knowledgeGrowthRate * 100)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Growth Rate
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Categories & Priorities Distribution */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Knowledge Categories
                </Typography>
                <List>
                  {Object.entries(knowledgeMetrics.categoriesDistribution).map(([category, count]) => (
                    <ListItem key={category}>
                      <ListItemText primary={category} />
                      <Chip label={count} size="small" />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Priority Distribution
                </Typography>
                <List>
                  {Object.entries(knowledgeMetrics.priorityDistribution).map(([priority, count]) => (
                    <ListItem key={priority}>
                      <ListItemText primary={priority} />
                      <Chip
                        label={count}
                        size="small"
                        color={
                          priority === 'critical' ? 'error' :
                          priority === 'high' ? 'warning' :
                          priority === 'medium' ? 'info' : 'default'
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Usage Patterns */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Usage Patterns
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" gutterBottom>
                  Most Used Memories
                </Typography>
                <List dense>
                  {knowledgeMetrics.usagePatterns.mostUsed.map((memory, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={memory.title}
                        secondary={`Used ${memory.count} times`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" gutterBottom>
                  Recently Accessed
                </Typography>
                <List dense>
                  {knowledgeMetrics.usagePatterns.recentlyAccessed.map((memory, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={memory.title}
                        secondary={new Date(memory.lastAccessed).toLocaleString()}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" gutterBottom>
                  Trending Memories
                </Typography>
                <List dense>
                  {knowledgeMetrics.usagePatterns.trending.map((memory, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={memory.title}
                        secondary={
                          <Box display="flex" alignItems="center">
                            <TrendingUpIcon sx={{ fontSize: 16, mr: 0.5 }} />
                            {memory.trend > 0 ? '+' : ''}{memory.trend}%
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </>
    )}
  </Box>
);

export default KnowledgeAnalyticsPanel;
