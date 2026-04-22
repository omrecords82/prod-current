import React, { useState, useEffect, Suspense } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Breadcrumbs,
  Link,
  IconButton,
  Tooltip,
  Button
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon
} from '@mui/icons-material';

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

// Error Boundary for component rendering
class ComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; componentName: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(`Error in Big Book component "${this.props.componentName}":`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Component Error: {this.props.componentName}
          </Typography>
          <Typography variant="body2">
            {this.state.error?.message || 'Unknown error occurred while rendering component'}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => window.location.reload()}
            sx={{ mt: 1 }}
          >
            Reload Page
          </Button>
        </Alert>
      );
    }

    return this.props.children;
  }
}

const BigBookDynamicRoute: React.FC = () => {
  const { componentId } = useParams<{ componentId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [componentInfo, setComponentInfo] = useState<any>(null);
  const [CustomComponent, setCustomComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    if (componentId) {
      loadCustomComponent(componentId);
    } else {
      setError('No component ID provided');
      setLoading(false);
    }
  }, [componentId]);

  const loadCustomComponent = async (compId: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Loading Big Book component: ${compId}`);
      
      // Load the custom components registry
      const registry = await apiClient.get<CustomComponentRegistry>('/bigbook/custom-components-registry');
      console.log('📋 Registry loaded:', registry);

      // Find the component in the registry
      const component = registry.components[compId];
      if (!component) {
        throw new Error(`Component "${compId}" not found in registry`);
      }

      console.log('✅ Component found:', component);
      setComponentInfo(component);

      // Dynamically import the component
      try {
        // Convert the server path to a relative import path
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
          throw new Error(`Component "${component.name}" not found in module`);
        }

        console.log('🎉 Component imported successfully');
        setCustomComponent(() => ComponentToRender);

      } catch (importError) {
        console.error('❌ Component import failed:', importError);
        throw new Error(`Failed to load component: ${importError instanceof Error ? importError.message : 'Import failed'}`);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Big Book component loading failed:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/admin/settings');
  };

  const handleRefresh = () => {
    if (componentId) {
      loadCustomComponent(componentId);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 2
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="h6" color="text.secondary">
          Loading Big Book Component...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {componentId}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <IconButton onClick={handleBack} size="small">
              <ArrowBackIcon />
            </IconButton>
            <Breadcrumbs>
              <Link
                color="inherit"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleBack();
                }}
                sx={{ cursor: 'pointer' }}
              >
                Big Book
              </Link>
              <Typography color="text.primary">Error</Typography>
            </Breadcrumbs>
          </Box>

          <Alert severity="error">
            <Typography variant="subtitle2" gutterBottom>
              Failed to Load Component
            </Typography>
            <Typography variant="body2" gutterBottom>
              {error}
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={handleRefresh} startIcon={<RefreshIcon />}>
                Retry
              </Button>
              <Button variant="outlined" onClick={handleBack} startIcon={<HomeIcon />}>
                Back to Big Book
              </Button>
            </Box>
          </Alert>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton onClick={handleBack} size="small">
              <ArrowBackIcon />
            </IconButton>
            <Breadcrumbs>
              <Link
                color="inherit"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleBack();
                }}
                sx={{ cursor: 'pointer' }}
              >
                Big Book
              </Link>
              <Typography color="text.primary">Custom Components</Typography>
              <Typography color="text.primary" fontWeight={600}>
                {componentInfo?.displayName || componentId}
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

      {/* Component Content */}
      <Paper sx={{ flex: 1, overflow: 'auto' }}>
        <Suspense
          fallback={
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight={400}
            >
              <CircularProgress />
            </Box>
          }
        >
          {CustomComponent ? (
            <ComponentErrorBoundary componentName={componentInfo?.name || componentId || 'Unknown'}>
              <CustomComponent />
            </ComponentErrorBoundary>
          ) : (
            <Alert severity="warning" sx={{ m: 2 }}>
              <Typography variant="body2">
                Component "{componentId}" loaded but is not renderable.
              </Typography>
            </Alert>
          )}
        </Suspense>
      </Paper>
    </Box>
  );
};

export default BigBookDynamicRoute; 