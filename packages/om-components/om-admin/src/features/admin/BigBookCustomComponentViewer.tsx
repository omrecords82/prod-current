import React, { useState, useEffect, Suspense, Component } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Breadcrumbs,
  Link,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { apiClient } from '@/api/utils/axiosInstance';

// Simple Error Boundary component
class ErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

interface BigBookCustomComponentViewerProps {
  componentName: string;
  onBack: () => void;
  onError?: (error: string) => void;
}

interface CustomComponentRegistry {
  components: Record<string, {
    id: string;
    name: string;
    path: string;
    route: string;
    displayName: string;
    description?: string;
    installedAt: string;
    autoInstalled: boolean;
    isDefaultExport: boolean;
    hasJSX: boolean;
    hasHooks: boolean;
    dependencies: string[];
  }>;
  routes: Record<string, string>;
  menu: Array<{
    id: string;
    name: string;
    displayName: string;
    route: string;
    icon?: string;
  }>;
  lastUpdated: string | null;
  version: string;
}

const BigBookCustomComponentViewer: React.FC<BigBookCustomComponentViewerProps> = ({
  componentName,
  onBack,
  onError
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [componentInfo, setComponentInfo] = useState<any>(null);
  const [CustomComponent, setCustomComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    loadCustomComponent();
  }, [componentName]);

  const loadCustomComponent = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load the custom component registry
      const registry = await apiClient.get<CustomComponentRegistry>('/bigbook/custom-components-registry');
      const component = registry.components[componentName];

      if (!component) {
        throw new Error(`Component "${componentName}" not found in registry`);
      }

      setComponentInfo(component);

      // Dynamically import the component
      try {
        // Convert the server path to a relative import path (matching BigBookDynamicRoute pattern)
        const importPath = component.path.replace('src/', '../');
        console.log(`📦 Importing component from: ${importPath}`);
        
        const module = await import(/* @vite-ignore */ importPath);
        
        let ComponentToRender;
        if (component.isDefaultExport) {
          ComponentToRender = module.default;
        } else {
          ComponentToRender = module[component.name];
        }
        
        if (!ComponentToRender) {
          throw new Error(`Component "${componentName}" not found in module`);
        }

        console.log('🎉 Component imported successfully');
        setCustomComponent(() => ComponentToRender);
      } catch (importError) {
        console.error('Component import error:', importError);
        throw new Error(`Failed to load component: ${importError instanceof Error ? importError.message : 'Unknown error'}`);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadCustomComponent();
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight={300}
        flexDirection="column"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading custom component: {componentName}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <IconButton onClick={onBack} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6">
            Custom Component Error
          </Typography>
        </Box>
        
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Tooltip title="Retry loading component">
              <IconButton
                color="inherit"
                size="small"
                onClick={handleRefresh}
              >
                <RefreshIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          }
        >
          <Typography variant="subtitle2" gutterBottom>
            Failed to load component: {componentName}
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>

        <Typography variant="body2" color="text.secondary">
          This usually happens when:
        </Typography>
        <Box component="ul" sx={{ mt: 1, mb: 2 }}>
          <li>The component file was moved or deleted</li>
          <li>There are syntax errors in the component</li>
          <li>Required dependencies are missing</li>
          <li>The component export doesn't match the registry</li>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with navigation */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton onClick={onBack} size="small">
              <ArrowBackIcon />
            </IconButton>
            
            <Breadcrumbs>
              <Link 
                color="inherit" 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  onBack();
                }}
                sx={{ cursor: 'pointer' }}
              >
                Big Book
              </Link>
              <Typography color="text.primary">
                Custom Components
              </Typography>
              <Typography color="text.primary" fontWeight={600}>
                {componentInfo?.displayName || componentName}
              </Typography>
            </Breadcrumbs>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Refresh component">
              <IconButton onClick={handleRefresh} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {componentInfo?.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {componentInfo.description}
          </Typography>
        )}
      </Paper>

      {/* Component container */}
      <Paper sx={{ flex: 1, p: 2, overflow: 'auto' }}>
        <Suspense 
          fallback={
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
              <CircularProgress />
            </Box>
          }
        >
          {CustomComponent ? (
            <ErrorBoundary
              fallback={
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Component Runtime Error
                  </Typography>
                  <Typography variant="body2">
                    The component "{componentName}" encountered an error during rendering.
                    Check the browser console for more details.
                  </Typography>
                </Alert>
              }
            >
              <CustomComponent />
            </ErrorBoundary>
          ) : (
            <Alert severity="warning">
              <Typography variant="body2">
                Component "{componentName}" loaded but is not renderable.
              </Typography>
            </Alert>
          )}
        </Suspense>
      </Paper>
    </Box>
  );
};

export default BigBookCustomComponentViewer; 