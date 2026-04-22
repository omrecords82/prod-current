import React from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Refresh as RefreshCwIcon,
  Extension as AddonIcon,
  Visibility as ViewIcon,
  Delete as Trash2Icon,
} from '@mui/icons-material';
import BigBookCustomComponentViewer from '../BigBookCustomComponentViewer';

interface Props {
  customComponentsLoading: boolean;
  customComponents: any;
  selectedCustomComponent: string | null;
  setSelectedCustomComponent: (id: string | null) => void;
  loadCustomComponents: () => void;
  handleRemoveCustomComponent: (component: any) => void;
  addConsoleMessage: (type: string, message: string) => void;
}

const CustomComponentsPanel: React.FC<Props> = ({
  customComponentsLoading,
  customComponents,
  selectedCustomComponent,
  setSelectedCustomComponent,
  loadCustomComponents,
  handleRemoveCustomComponent,
  addConsoleMessage,
}) => {
  if (selectedCustomComponent) {
    return (
      <BigBookCustomComponentViewer
        componentName={selectedCustomComponent}
        onBack={() => setSelectedCustomComponent(null)}
        onError={(error: string) => {
          addConsoleMessage('error', `Component viewer error: ${error}`);
          setSelectedCustomComponent(null);
        }}
      />
    );
  }

  if (customComponentsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Loading custom components...</Typography>
      </Box>
    );
  }

  const componentCount = customComponents ? Object.keys(customComponents.components || {}).length : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Custom Components
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Big Book custom components with automatic menu integration ({componentCount} components)
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshCwIcon />}
          onClick={loadCustomComponents}
        >
          Refresh
        </Button>
      </Box>

      {componentCount === 0 ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            No Custom Components Found
          </Typography>
          <Typography variant="body2">
            Use the TSX Component Installation Wizard with "Big Book Auto-Install Mode" to add custom components with automatic menu integration.
          </Typography>
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {Object.entries(customComponents.components || {}).map(([componentId, component]: [string, any]) => (
            <Grid item xs={12} sm={6} md={4} key={componentId}>
              <Card
                sx={{
                  cursor: 'pointer',
                  height: '100%',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                  }
                }}
                onClick={() => setSelectedCustomComponent(componentId)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <AddonIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="div">
                      {component.displayName || component.name}
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: '2.5em' }}>
                    {component.description || `Custom Big Book component: ${component.displayName || component.name}`}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={component.route}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 1, mb: 1 }}
                    />
                    {component.hasJSX && (
                      <Chip
                        label="JSX"
                        size="small"
                        color="primary"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    )}
                    {component.hasHooks && (
                      <Chip
                        label="Hooks"
                        size="small"
                        color="secondary"
                        sx={{ mr: 1, mb: 1 }}
                      />
                    )}
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    Installed: {new Date(component.installedAt).toLocaleDateString()}
                  </Typography>

                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ViewIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomComponent(componentId);
                      }}
                    >
                      View
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<Trash2Icon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveCustomComponent(component);
                      }}
                    >
                      Remove
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {customComponents?.menu && customComponents.menu.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Sidebar Menu Items
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These components are automatically added to the Big Book sidebar navigation
          </Typography>
          <List>
            {customComponents.menu.map((menuItem: any) => (
              <ListItem key={menuItem.id} divider>
                <ListItemIcon>
                  <AddonIcon />
                </ListItemIcon>
                <ListItemText
                  primary={menuItem.displayName}
                  secondary={`Route: ${menuItem.route}`}
                />
                <ListItemSecondaryAction>
                  <Button
                    size="small"
                    onClick={() => setSelectedCustomComponent(menuItem.id)}
                  >
                    Open
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  );
};

export default CustomComponentsPanel;
