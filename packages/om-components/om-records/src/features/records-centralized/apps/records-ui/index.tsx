/**
 * RecordsUIPage Component
 * 
 * Main records management UI page.
 * Provides a comprehensive interface for viewing and managing church records.
 * 
 * Routes:
 * - /apps/records-ui
 * - /apps/records-ui/:churchId
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import BaptismRecordsPage from '../../../records-centralized/components/baptism/BaptismRecordsPage';
import MarriageRecordsPage from '../../../records-centralized/components/marriage/MarriageRecordsPage';
import FuneralRecordsPage from '../../../records-centralized/components/death/FuneralRecordsPage';

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
      id={`records-tabpanel-${index}`}
      aria-labelledby={`records-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const RecordsUIPage: React.FC = () => {
  const { churchId } = useParams<{ churchId?: string }>();
  const [tabValue, setTabValue] = useState(0);
  const [selectedChurch, setSelectedChurch] = useState<string>(churchId || 'all');
  const [churches, setChurches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchChurches = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        // const response = await fetch('/api/churches');
        // const data = await response.json();
        // setChurches(data.churches || []);
        setChurches([]);
      } catch (err) {
        console.error('Failed to fetch churches:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChurches();
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ mb: 2 }}>
        <Box sx={{ p: 2, pb: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h4">
              Records Management
            </Typography>
            {churchId && (
              <Chip
                label={`Church ID: ${churchId}`}
                color="primary"
              />
            )}
          </Box>

          {/* Church Selector */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Select Church</InputLabel>
                <Select
                  value={selectedChurch}
                  label="Select Church"
                  onChange={(e) => setSelectedChurch(e.target.value)}
                  disabled={loading || !!churchId}
                >
                  <MenuItem value="all">All Churches</MenuItem>
                  {churches.map((church) => (
                    <MenuItem key={church.id} value={church.id}>
                      {church.church_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  label="Search Records"
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                >
                  Add Record
                </Button>
              </Box>
            </Grid>
          </Grid>

          {/* Tabs */}
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="records tabs"
          >
            <Tab label="Baptism Records" />
            <Tab label="Marriage Records" />
            <Tab label="Funeral Records" />
          </Tabs>
        </Box>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <BaptismRecordsPage />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <MarriageRecordsPage />
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <FuneralRecordsPage />
      </TabPanel>
    </Box>
  );
};

export default RecordsUIPage;
