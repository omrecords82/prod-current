import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Switch,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Description as FileTextIcon,
  Code as CodeIcon,
  Terminal as TerminalIcon,
  Refresh as RefreshCwIcon,
  ExpandMore as ExpandMoreIcon,
  Extension as AddonIcon,
  Article as DocIcon,
  Tune as ConfigIcon,
  Archive as DataIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';

interface Props {
  registriesLoading: boolean;
  registriesError: string | null;
  registries: any;
  loadRegistries: () => void;
  toggleItemStatus: (type: string, id: string, enabled: boolean) => void;
}

const RegistryManagementPanel: React.FC<Props> = ({
  registriesLoading,
  registriesError,
  registries,
  loadRegistries,
  toggleItemStatus,
}) => {
  const getRegistryIcon = (type: string) => {
    switch (type) {
      case 'addons': return <AddonIcon />;
      case 'scripts': return <TerminalIcon />;
      case 'docs': return <DocIcon />;
      case 'configs': return <ConfigIcon />;
      case 'data': return <DataIcon />;
      default: return <FileTextIcon />;
    }
  };

  const getItemIcon = (item: any) => {
    if (item.type?.includes('component') || item.type?.includes('javascript')) return <CodeIcon />;
    if (item.type?.includes('script')) return <TerminalIcon />;
    if (item.type?.includes('doc')) return <DocIcon />;
    if (item.type?.includes('config')) return <ConfigIcon />;
    if (item.type?.includes('zip')) return <DataIcon />;
    return <FileTextIcon />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getItemPath = (item: any) => {
    return item.route || item.webPath || item.storagePath || item.path || 'N/A';
  };

  if (registriesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Loading registries...</Typography>
      </Box>
    );
  }

  if (registriesError) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load registries: {registriesError}
        </Alert>
        <Button variant="contained" onClick={loadRegistries}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!registries) {
    return (
      <Box p={3}>
        <Alert severity="info">
          No registry data available. Try loading some files first.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Registry Management</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshCwIcon />}
          onClick={loadRegistries}
        >
          Refresh
        </Button>
      </Box>

      {Object.entries(registries).map(([registryType, registry]: [string, any]) => (
        <Accordion key={registryType} defaultExpanded={Object.keys(registry.items || {}).length > 0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={1}>
              {getRegistryIcon(registryType)}
              <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                {registryType} ({Object.keys(registry.items || {}).length} items)
              </Typography>
              <Chip
                label={`v${registry?.version || '1.0'}`}
                size="small"
                variant="outlined"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {Object.keys(registry.items || {}).length === 0 ? (
              <Typography color="text.secondary">
                No {registryType} registered yet.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Path/Route</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(registry.items || {})
                      .filter(([, item]) => item !== null && item !== undefined)
                      .map(([itemId, item]: [string, any]) => (
                      <TableRow key={itemId}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getItemIcon(item)}
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {item.displayName || item.title || item.name || 'Unnamed'}
                              </Typography>
                              {item.description && (
                                <Typography variant="caption" color="text.secondary">
                                  {item.description}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.type || 'unknown'}
                            size="small"
                            variant="outlined"
                            color={item.enabled ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {getItemPath(item)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.enabled ? 'Enabled' : 'Disabled'}
                            size="small"
                            color={item.enabled ? 'success' : 'warning'}
                            variant={item.enabled ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {item.createdAt ? formatDate(item.createdAt) : 'Unknown'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={item.enabled || false}
                            onChange={(e) => toggleItemStatus(registryType, itemId, e.target.checked)}
                            size="small"
                          />
                          {item.route && (
                            <Tooltip title="Open in new tab">
                              <IconButton
                                size="small"
                                onClick={() => window.open(item.route, '_blank')}
                                sx={{ ml: 1 }}
                              >
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {registry?.lastUpdated && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Last updated: {formatDate(registry.lastUpdated)}
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      {Object.keys(registries).length === 0 && (
        <Alert severity="info">
          No registries found. Upload some files to populate the registries.
        </Alert>
      )}
    </Box>
  );
};

export default RegistryManagementPanel;
