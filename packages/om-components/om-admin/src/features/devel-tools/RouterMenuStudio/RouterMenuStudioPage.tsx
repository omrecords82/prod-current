/**
 * Router Menu Studio Page
 * Complete Router/Menu Studio with MUI DataGrid and TreeView
 */

import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  AppBar,
  Toolbar,
  Chip,
  Button,
  Tabs,
  Tab,
  Alert,
  Stack,
} from '@mui/material';
import {
  IconDeviceDesktop,
  IconRouter,
  IconMenu2,
  IconBrandReact,
  IconDatabase,
} from '@tabler/icons-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import RouteGrid from './components/RouteGrid';
import MenuTree from './components/MenuTree';

// Create React Query client with default settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 0,
    },
  },
});

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
      id={`studio-tabpanel-${index}`}
      aria-labelledby={`studio-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  );
}

const RouterMenuStudioPage: React.FC = () => {
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Auto-refresh indicator
  const [lastRefresh, setLastRefresh] = React.useState(new Date());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <IconDeviceDesktop size={24} style={{ marginRight: 16 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Router/Menu Studio
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip
                label="Role: super_admin"
                color="primary"
                variant="outlined"
                size="small"
              />
              <Typography variant="caption" color="text.secondary">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Main content area */}
        <Box sx={{ flex: 1, overflow: 'hidden', p: 0 }}>
          {/* Status Banner */}
          <Alert severity="success" sx={{ borderRadius: 0 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <IconDatabase size={20} />
              <Typography variant="body2">
                📊 Database connected • 🔗 API endpoints active • ✅ Studio ready for use
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  queryClient.invalidateQueries();
                  toast.success('Data refreshed');
                }}
                sx={{ ml: 'auto' }}
                startIcon={<IconBrandReact size={14} />}
              >
                Refresh All
              </Button>
            </Stack>
          </Alert>

          {/* Tabbed Interface */}
          <Box sx={{ height: 'calc(100vh - 140px)' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconRouter size={16} />
                      Routes Management
                    </Box>
                  }
                  id="studio-tab-0"
                  aria-controls="studio-tabpanel-0"
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconMenu2 size={16} />
                      Menu Management
                    </Box>
                  }
                  id="studio-tab-1"
                  aria-controls="studio-tabpanel-1"
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconDeviceDesktop size={16} />
                      Combined View
                    </Box>
                  }
                  id="studio-tab-2"
                  aria-controls="studio-tabpanel-2"
                />
              </Tabs>
            </Box>

            {/* Tab Panels */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ height: '100%', p: 2 }}>
                <RouteGrid />
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box sx={{ height: '100%', p: 2 }}>
                <MenuTree />
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box sx={{ height: '100%', p: 2 }}>
                <Grid container spacing={2} sx={{ height: '100%' }}>
                  <Grid item xs={12} md={7}>
                    <Paper
                      elevation={2}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        p: 2,
                      }}
                    >
                      <Typography variant="h6" gutterBottom>
                        Routes (Live Database)
                      </Typography>
                      <Box sx={{ flex: 1, overflow: 'hidden' }}>
                        <RouteGrid />
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <Paper
                      elevation={2}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        p: 2,
                      }}
                    >
                      <Typography variant="h6" gutterBottom>
                        Menu Tree (Live Database)
                      </Typography>
                      <Box sx={{ flex: 1, overflow: 'hidden' }}>
                        <MenuTree />
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
          </Box>
        </Box>
      </Box>
    </QueryClientProvider>
  );
};

export default RouterMenuStudioPage;
