import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  Grid,
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Assessment as SurveyIcon,
  Folder as FolderIcon,
  Menu as MenuIcon,
  People as PeopleIcon,
  Web as CrawlerIcon,
  Storage as DatabaseIcon,
  PlayArrow as StartIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';

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
      id={`survey-tabpanel-${index}`}
      aria-labelledby={`survey-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `survey-tab-${index}`,
    'aria-controls': `survey-tabpanel-${index}`,
  };
}

const OMSiteSurvey: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [surveyRunning, setSurveyRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filesystemData, setFilesystemData] = useState<any>(null);
  const [menuData, setMenuData] = useState<any>(null);
  const [roleData, setRoleData] = useState<any>(null);
  const [crawlerData, setCrawlerData] = useState<any>(null);
  const [databaseData, setDatabaseData] = useState<any>(null);

  // Access control - only super_admin can access
  if (!user || user.role !== 'super_admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6">Access Denied</Typography>
          <Typography>
            This tool is only accessible to users with super_admin privileges.
            Current role: {user?.role || 'Not authenticated'}
          </Typography>
        </Alert>
      </Box>
    );
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const startCompleteSurvey = async () => {
    setSurveyRunning(true);
    setProgress(0);

    try {
      // Sequential execution of survey components
      const steps = [
        { name: 'Filesystem Analysis', endpoint: '/api/survey/filesystem', setter: setFilesystemData },
        { name: 'Menu Audit', endpoint: '/api/survey/menu-audit', setter: setMenuData },
        { name: 'Role Mapping', endpoint: '/api/survey/user-roles', setter: setRoleData },
        { name: 'Database Analysis', endpoint: '/api/survey/database-analysis', setter: setDatabaseData },
        { name: 'Site Crawler', endpoint: '/api/survey/start-crawler', setter: setCrawlerData }
      ];

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        setProgress((i / steps.length) * 100);
        
        console.log(`🔄 Executing: ${step.name}`);
        
        try {
          const result = await apiClient.post<any>(step.endpoint.replace('/api', ''));
          
          if (result.success) {
            step.setter(result);
            console.log(`✅ ${step.name} completed`);
          } else {
            console.error(`❌ ${step.name} failed:`, result.error);
          }
        } catch (stepError) {
          console.error(`❌ ${step.name} error:`, stepError);
        }
        
        setProgress(((i + 1) / steps.length) * 100);
      }

      console.log('🎉 Survey complete!');
    } catch (error) {
      console.error('❌ Survey failed:', error);
    } finally {
      setSurveyRunning(false);
    }
  };

  const exportResults = (format: 'csv' | 'json' | 'md') => {
    // TODO: Implement export functionality
    console.log(`Exporting results as ${format}`);
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SurveyIcon color="primary" />
          OrthodoxMetrics Site Survey
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
          Comprehensive internal site analysis and audit tool for super administrators
        </Typography>

        {/* Survey Controls */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={surveyRunning ? <CircularProgress size={16} /> : <StartIcon />}
            onClick={startCompleteSurvey}
            disabled={surveyRunning}
            size="large"
          >
            {surveyRunning ? 'Running Survey...' : 'Start Complete Survey'}
          </Button>

          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={() => exportResults('json')}
            disabled={surveyRunning}
          >
            Export JSON
          </Button>

          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={() => exportResults('csv')}
            disabled={surveyRunning}
          >
            Export CSV
          </Button>

          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={() => exportResults('md')}
            disabled={surveyRunning}
          >
            Export Markdown
          </Button>
        </Box>

        {/* Progress Bar */}
        {surveyRunning && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Survey Progress: {Math.round(progress)}%
            </Typography>
          </Box>
        )}
      </Box>

      {/* Main Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="survey tabs">
          <Tab
            label="Filesystem Audit"
            icon={<FolderIcon />}
            iconPosition="start"
            {...a11yProps(0)}
          />
          <Tab
            label="Menu Map"
            icon={<MenuIcon />}
            iconPosition="start"
            {...a11yProps(1)}
          />
          <Tab
            label="Role/Access Matrix"
            icon={<PeopleIcon />}
            iconPosition="start"
            {...a11yProps(2)}
          />
          <Tab
            label="Live Crawler Console"
            icon={<CrawlerIcon />}
            iconPosition="start"
            {...a11yProps(3)}
          />
          <Tab
            label="Database Snapshot"
            icon={<DatabaseIcon />}
            iconPosition="start"
            {...a11yProps(4)}
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <FilesystemAudit data={filesystemData} />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <MenuMap data={menuData} />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <RoleAccessMatrix data={roleData} />
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <LiveCrawlerConsole data={crawlerData} />
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <DatabaseSnapshot data={databaseData} />
      </TabPanel>
    </Box>
  );
};

// Sub-components for each tab
const FilesystemAudit: React.FC<{ data: any }> = ({ data }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          🗂 Filesystem Analysis
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Scans the entire /prod directory for TypeScript, JavaScript, and SQL files.
          Shows last modified dates and identifies unused files.
        </Alert>
        
        {data && data.success ? (
          <Box>
            {/* Summary Stats */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip 
                label={`Total Files: ${data.summary.totalFiles}`} 
                color="primary" 
                icon={<FolderIcon />}
              />
              <Chip 
                label={`Stale Files (60+ days): ${data.summary.staleFiles}`} 
                color="warning" 
                icon={<WarningIcon />}
              />
              <Chip 
                label={`Categories: ${Object.keys(data.summary.categories).length}`} 
                color="info" 
                icon={<InfoIcon />}
              />
            </Box>

            {/* Categories Breakdown */}
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">
                  📊 File Categories & Extensions
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Categories</Typography>
                    {data.summary?.categories ? Object.entries(data.summary.categories).map(([category, count]) => (
                      <Box key={category} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">{category}</Typography>
                        <Chip size="small" label={count} />
                      </Box>
                    )) : <Typography variant="body2" color="textSecondary">No category data</Typography>}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Extensions</Typography>
                    {data.summary?.extensions ? Object.entries(data.summary.extensions).map(([ext, count]) => (
                      <Box key={ext} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{ext}</Typography>
                        <Chip size="small" label={count} />
                      </Box>
                    )) : <Typography variant="body2" color="textSecondary">No extension data</Typography>}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* File List */}
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Path</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Last Modified</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.data.slice(0, 100).map((file: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {file.path}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={file.category} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {(file.size / 1024).toFixed(1)} KB
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(file.lastModified).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {file.isStale ? (
                          <Chip size="small" label="Stale" color="warning" icon={<WarningIcon />} />
                        ) : (
                          <Chip size="small" label="Active" color="success" icon={<CheckIcon />} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {data.data.length > 100 && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                Showing first 100 of {data.data.length} files. Export for complete data.
              </Typography>
            )}

            <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
              Last updated: {new Date(data.timestamp).toLocaleString()}
            </Typography>
          </Box>
        ) : (
          <Alert severity="info">
            Click "Start Complete Survey" to analyze the filesystem structure
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

const MenuMap: React.FC<{ data: any }> = ({ data }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          🧭 Menu Structure Audit
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Analyzes vertical, horizontal, and quick link menus.
          Shows role-based visibility and orphaned routes.
        </Alert>
        
        {data && data.success ? (
          <Box>
            {/* Summary Stats */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip 
                label={`Total Menu Items: ${data.summary.totalItems}`} 
                color="primary" 
                icon={<MenuIcon />}
              />
              <Chip 
                label={`Orphaned Routes: ${data.summary.orphanedRoutes}`} 
                color="error" 
                icon={<ErrorIcon />}
              />
              {data.summary?.menuTypes ? Object.entries(data.summary.menuTypes).map(([type, count]) => (
                <Chip 
                  key={type}
                  label={`${type}: ${count}`} 
                  color="info" 
                />
              )) : null}
            </Box>

            {/* Menu Items Table */}
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Route</TableCell>
                    <TableCell>Menu Type</TableCell>
                    <TableCell>Roles</TableCell>
                    <TableCell>Visible To</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.data.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2">{item.title}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {item.route}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={item.menuType} />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {item.roles.map((role: string) => (
                            <Chip key={role} size="small" label={role} variant="outlined" />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.visibleToUsers.length} users
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {item.isOrphaned ? (
                          <Chip size="small" label="Orphaned" color="error" icon={<ErrorIcon />} />
                        ) : (
                          <Chip size="small" label="Active" color="success" icon={<CheckIcon />} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
              Last updated: {new Date(data.timestamp).toLocaleString()}
            </Typography>
          </Box>
        ) : (
          <Alert severity="info">
            Click "Start Complete Survey" to analyze menu structure
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

const RoleAccessMatrix: React.FC<{ data: any }> = ({ data }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          👥 User Role & Access Matrix
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Maps user accounts to their roles and shows menu visibility.
          Highlights role conflicts and unused permissions.
        </Alert>
        
        {/* TODO: Implement role matrix UI */}
        <Typography variant="body2" color="textSecondary">
          Role access matrix will be implemented here...
        </Typography>
      </CardContent>
    </Card>
  );
};

const LiveCrawlerConsole: React.FC<{ data: any }> = ({ data }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          🧪 Live Site Crawler
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Headless browser crawler that navigates through all site areas.
          Shows real-time console output and identifies issues.
        </Alert>
        
        {/* TODO: Implement crawler console UI */}
        <Typography variant="body2" color="textSecondary">
          Live crawler console will be implemented here...
        </Typography>
      </CardContent>
    </Card>
  );
};

const DatabaseSnapshot: React.FC<{ data: any }> = ({ data }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          🧬 Database Analysis
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Analyzes MariaDB schema, identifies duplicate tables,
          and shows database relationships.
        </Alert>
        
        {/* TODO: Implement database analysis UI */}
        <Typography variant="body2" color="textSecondary">
          Database analysis will be implemented here...
        </Typography>
      </CardContent>
    </Card>
  );
};

export default OMSiteSurvey; 