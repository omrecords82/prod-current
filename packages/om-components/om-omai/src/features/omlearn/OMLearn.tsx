/**
 * OMLearn Component
 * 
 * Learning and documentation module for OrthodoxMetrics.
 * Provides tutorials, guides, and educational content for users.
 * 
 * Route: /apps/om-learn
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Button,
} from '@mui/material';
import {
  School as SchoolIcon,
  Book as BookIcon,
  VideoLibrary as VideoIcon,
  Quiz as QuizIcon,
  Article as ArticleIcon,
  Code as CodeIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`learn-tabpanel-${index}`}
      aria-labelledby={`learn-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const OMLearn: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const tutorials = [
    {
      title: 'Getting Started with OrthodoxMetrics',
      description: 'Learn the basics of navigating and using OrthodoxMetrics',
      icon: <DashboardIcon />,
      category: 'beginner',
    },
    {
      title: 'Managing Church Records',
      description: 'How to add, edit, and manage baptism, marriage, and funeral records',
      icon: <BookIcon />,
      category: 'records',
    },
    {
      title: 'User Management',
      description: 'Setting up users, roles, and permissions',
      icon: <SettingsIcon />,
      category: 'admin',
    },
    {
      title: 'OCR Processing',
      description: 'Using OCR to digitize paper records',
      icon: <CodeIcon />,
      category: 'advanced',
    },
  ];

  const guides = [
    { title: 'Quick Start Guide', icon: <ArticleIcon /> },
    { title: 'Record Entry Best Practices', icon: <ArticleIcon /> },
    { title: 'Security and Permissions', icon: <ArticleIcon /> },
    { title: 'API Documentation', icon: <CodeIcon /> },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <SchoolIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" gutterBottom>
              OMLearn
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Learn how to use OrthodoxMetrics effectively
            </Typography>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab icon={<SchoolIcon />} label="Tutorials" />
            <Tab icon={<BookIcon />} label="Guides" />
            <Tab icon={<VideoIcon />} label="Videos" />
            <Tab icon={<QuizIcon />} label="FAQs" />
          </Tabs>
        </Box>

        {/* Tutorials Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {tutorials.map((tutorial, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card>
                  <CardActionArea>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                        <Box sx={{ color: 'primary.main', mt: 1 }}>
                          {tutorial.icon}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="h6">
                              {tutorial.title}
                            </Typography>
                            <Chip
                              label={tutorial.category}
                              size="small"
                              color={
                                tutorial.category === 'beginner'
                                  ? 'primary'
                                  : tutorial.category === 'advanced'
                                  ? 'error'
                                  : 'default'
                              }
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {tutorial.description}
                          </Typography>
                          <Button
                            variant="text"
                            sx={{ mt: 2 }}
                            onClick={() => {
                              // TODO: Navigate to tutorial
                            }}
                          >
                            Start Tutorial →
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Guides Tab */}
        <TabPanel value={tabValue} index={1}>
          <List>
            {guides.map((guide, index) => (
              <ListItem
                key={index}
                button
                onClick={() => {
                  // TODO: Open guide
                }}
              >
                <ListItemIcon>{guide.icon}</ListItemIcon>
                <ListItemText
                  primary={guide.title}
                  secondary="Click to view guide"
                />
              </ListItem>
            ))}
          </List>
        </TabPanel>

        {/* Videos Tab */}
        <TabPanel value={tabValue} index={2}>
          <Alert severity="info">
            Video tutorials are coming soon. Check back later for video content.
          </Alert>
        </TabPanel>

        {/* FAQs Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Frequently Asked Questions
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="How do I add a new record?"
                  secondary="Navigate to Records → Add Record, then fill out the form and save."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="How do I change my password?"
                  secondary="Go to Settings → Account → Change Password."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="What are the different user roles?"
                  secondary="Super Admin: Full system access. Admin: Church management. Priest/Deacon: Record entry. Editor: Limited editing."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="How do I export records?"
                  secondary="Go to Records → Export, select your filters, and choose export format."
                />
              </ListItem>
            </List>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default OMLearn;
