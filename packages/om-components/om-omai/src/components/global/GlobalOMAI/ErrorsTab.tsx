import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Chip,
  Collapse,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  Button,
  Stack,
  Grid,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip,
} from '@mui/material';
import {
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Visibility as ShowIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useGlobalErrorStore, GlobalError } from '../../../hooks/useGlobalErrorStore';
import ErrorDetailsCard from '../ErrorDetailsCard';

interface Props {
  handleCreateTaskFromError: (error?: GlobalError) => void;
}

const ErrorsTab: React.FC<Props> = ({ handleCreateTaskFromError }) => {
  const {
    errors,
    filteredErrors,
    stats,
    filter,
    setFilter,
    dismissError,
    undismissError,
    toggleErrorExpansion,
    deleteError,
    clearErrors,
    clearDismissedErrors
  } = useGlobalErrorStore();

  const [showFilters, setShowFilters] = useState(false);

  return (
    <Box>
      {/* Error Statistics Dashboard */}
      <Card sx={{ mb: 2, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <ErrorIcon fontSize="small" sx={{ color: '#f57c00' }} />
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#424242' }}>
              Error Dashboard
            </Typography>
            <Box ml="auto" display="flex" gap={1}>
              <Tooltip title="Toggle Filters">
                <IconButton
                  size="small"
                  onClick={() => setShowFilters(!showFilters)}
                  sx={{
                    bgcolor: showFilters ? '#e3f2fd' : 'transparent',
                    color: showFilters ? '#1976d2' : '#666'
                  }}
                >
                  <FilterIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Stats Grid */}
          <Grid container spacing={1} mb={2}>
            <Grid item xs={3}>
              <Chip
                label={`Total: ${stats.total}`}
                size="small"
                sx={{ width: '100%', bgcolor: '#e0e0e0', color: '#424242', fontWeight: 'bold' }}
              />
            </Grid>
            <Grid item xs={3}>
              <Chip
                label={`Unique: ${stats.unique}`}
                size="small"
                sx={{ width: '100%', bgcolor: '#e8f4fd', color: '#1976d2', fontWeight: 'bold' }}
              />
            </Grid>
            <Grid item xs={3}>
              <Chip
                label={`Active: ${stats.unresolved}`}
                size="small"
                sx={{
                  width: '100%',
                  bgcolor: stats.unresolved > 0 ? '#ffebee' : '#e8f5e8',
                  color: stats.unresolved > 0 ? '#c62828' : '#2e7d32',
                  fontWeight: 'bold'
                }}
              />
            </Grid>
            <Grid item xs={3}>
              <Chip
                label={`Dismissed: ${stats.dismissed}`}
                size="small"
                sx={{ width: '100%', bgcolor: '#f5f5f5', color: '#666', fontWeight: 'bold' }}
              />
            </Grid>
          </Grid>

          {/* Severity Breakdown */}
          <Grid container spacing={0.5}>
            <Grid item xs={3}>
              <Chip
                label={`Critical: ${stats.criticalCount}`}
                size="small"
                sx={{ width: '100%', bgcolor: '#d32f2f', color: 'white', fontSize: '0.7rem' }}
              />
            </Grid>
            <Grid item xs={3}>
              <Chip
                label={`High: ${stats.highCount}`}
                size="small"
                sx={{ width: '100%', bgcolor: '#f57c00', color: 'white', fontSize: '0.7rem' }}
              />
            </Grid>
            <Grid item xs={3}>
              <Chip
                label={`Medium: ${stats.mediumCount}`}
                size="small"
                sx={{ width: '100%', bgcolor: '#1976d2', color: 'white', fontSize: '0.7rem' }}
              />
            </Grid>
            <Grid item xs={3}>
              <Chip
                label={`Low: ${stats.lowCount}`}
                size="small"
                sx={{ width: '100%', bgcolor: '#388e3c', color: 'white', fontSize: '0.7rem' }}
              />
            </Grid>
          </Grid>

          {/* Action Buttons */}
          {(stats.unresolved > 0 || stats.dismissed > 0) && (
            <Box mt={2} display="flex" gap={1} flexWrap="wrap">
              {stats.unresolved > 0 && (
                <Button
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={clearErrors}
                  sx={{ textTransform: 'none' }}
                >
                  Clear All
                </Button>
              )}
              {stats.dismissed > 0 && (
                <Button
                  size="small"
                  startIcon={<ShowIcon />}
                  onClick={clearDismissedErrors}
                  sx={{ textTransform: 'none' }}
                >
                  Restore Dismissed
                </Button>
              )}
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
                sx={{ textTransform: 'none' }}
              >
                Refresh Page
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Filter Panel */}
      <Collapse in={showFilters}>
        <Card sx={{ mb: 2, bgcolor: '#f8fffe', border: '1px solid #b2dfdb' }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ color: '#00695c' }}>
              🔍 Filters
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Severity</InputLabel>
                  <Select
                    multiple
                    value={filter.severity || []}
                    label="Severity"
                    onChange={(e) => setFilter(prev => ({...prev, severity: e.target.value as any}))}
                  >
                    <MenuItem value="critical">Critical</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filter.resolved !== undefined ? (filter.resolved ? 'resolved' : 'unresolved') : 'all'}
                    label="Status"
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilter(prev => ({
                        ...prev,
                        resolved: value === 'all' ? undefined : value === 'resolved'
                      }));
                    }}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="unresolved">Unresolved</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filter.dismissed === false}
                        onChange={(e) => setFilter(prev => ({
                          ...prev,
                          dismissed: e.target.checked ? false : undefined
                        }))}
                        size="small"
                      />
                    }
                    label="Hide Dismissed"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filter.showOnlyNew || false}
                        onChange={(e) => setFilter(prev => ({
                          ...prev,
                          showOnlyNew: e.target.checked
                        }))}
                        size="small"
                      />
                    }
                    label="Only New/Unique"
                  />
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Collapse>

      {/* Error List using ErrorDetailsCard */}
      <Box>
        <Typography variant="subtitle2" gutterBottom sx={{ color: '#424242', fontWeight: 'bold' }}>
          Recent Errors ({filteredErrors.length} shown)
        </Typography>

        {filteredErrors.length === 0 ? (
          <Card sx={{ bgcolor: '#e8f5e8', border: '1px solid #4caf50' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <CheckIcon sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} />
              <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                No errors to display!
              </Typography>
              <Typography variant="body2" sx={{ color: '#4caf50' }}>
                {errors.length === 0
                  ? 'Your application is running smoothly.'
                  : 'All errors have been filtered out or dismissed.'
                }
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {filteredErrors.map((error) => (
              <ErrorDetailsCard
                key={error.id}
                error={error}
                onToggleExpansion={toggleErrorExpansion}
                onCreateTask={handleCreateTaskFromError}
                onDismiss={dismissError}
                onUndismiss={undismissError}
                onDelete={deleteError}
                showTrackButton={true}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ErrorsTab;
