import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  Card,
  CardContent,
  Grid,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Extension as ComponentIcon,
  Folder as FolderIcon,
  GetApp as InstallIcon,
  Visibility as PreviewIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Code as CodeIcon,
  Storage as RegistryIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';

interface TSXComponentInfo {
  fileName: string;
  componentName: string;
  isDefaultExport: boolean;
  imports: string[];
  content: string;
  size: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingPackages: string[];
  hasJSX: boolean;
  hasHooks: boolean;
  dependencies: string[];
}

interface InstallationOptions {
  targetDirectory: string;
  installMissingPackages: boolean;
  registerInRegistry: boolean;
  openPreview: boolean;
  overwriteExisting: boolean;
  bigBookAutoInstall: boolean;
}

interface TSXComponentInstallWizardProps {
  open: boolean;
  onClose: () => void;
  file: File | null;
  onInstallComplete: (result: any) => void;
  onConsoleMessage: (type: 'info' | 'success' | 'error' | 'warning', message: string) => void;
}

const TSXComponentInstallWizard: React.FC<TSXComponentInstallWizardProps> = ({
  open,
  onClose,
  file,
  onInstallComplete,
  onConsoleMessage
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [componentInfo, setComponentInfo] = useState<TSXComponentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [installOptions, setInstallOptions] = useState<InstallationOptions>({
    targetDirectory: 'src/components/',
    installMissingPackages: true,
    registerInRegistry: true,
    openPreview: true,
    overwriteExisting: false,
    bigBookAutoInstall: false
  });
  const [installationResult, setInstallationResult] = useState<any>(null);
  const [availableDirectories, setAvailableDirectories] = useState<string[]>([
    'src/components/',
    'src/components/admin/',
    '@/shared/ui/',
    'src/components/custom/',
    'src/pages/',
    'src/views/',
    'src/addons/'
  ]);

  const steps = ['Parse & Validate', 'Configure Installation', 'Install Component'];

  // Parse the .tsx file when dialog opens
  useEffect(() => {
    if (open && file && activeStep === 0) {
      parseComponentFile();
    }
  }, [open, file, activeStep]);

  const parseComponentFile = async () => {
    if (!file) return;

    setLoading(true);
    onConsoleMessage('info', `🔍 Parsing .tsx file: ${file.name}`);

    try {
      const content = await file.text();
      
      const result = await apiClient.post<any>('/bigbook/parse-tsx-component', {
        fileName: file.name,
        content: content
      });
      
      if (result.success) {
        setComponentInfo(result.componentInfo);
        onConsoleMessage('success', `✅ Component parsed successfully: ${result.componentInfo.componentName}`);
        
        if (result.componentInfo.warnings.length > 0) {
          result.componentInfo.warnings.forEach((warning: string) => {
            onConsoleMessage('warning', `⚠️ ${warning}`);
          });
        }
        
        setActiveStep(1); // Move to configuration step
      } else {
        onConsoleMessage('error', `❌ Failed to parse component: ${result.error}`);
        result.errors?.forEach((error: string) => {
          onConsoleMessage('error', `❌ ${error}`);
        });
      }
    } catch (error) {
      onConsoleMessage('error', `❌ Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInstallComponent = async () => {
    if (!componentInfo) return;

    setLoading(true);
    setActiveStep(2);
    onConsoleMessage('info', `🚀 Installing component: ${componentInfo.componentName}`);

    try {
      // Choose installation endpoint based on Big Book auto-install option
      const endpoint = installOptions.bigBookAutoInstall 
        ? '/bigbook/install-bigbook-component'
        : '/bigbook/install-tsx-component';
      
      onConsoleMessage('info', installOptions.bigBookAutoInstall 
        ? '📚 Installing as Big Book custom component with auto-menu integration...'
        : '🧩 Installing as standard TSX component...');

      const result = await apiClient.post<any>(endpoint, {
        componentInfo,
        installOptions
      });
      
      if (result.success) {
        setInstallationResult(result);
        onConsoleMessage('success', `🎉 Component installed successfully!`);
        onConsoleMessage('info', `📁 Location: ${result.installedPath}`);
        
        if (result.packagesInstalled && result.packagesInstalled.length > 0) {
          onConsoleMessage('success', `📦 Packages installed: ${result.packagesInstalled.join(', ')}`);
        }
        
        if (result.registryUpdated) {
          onConsoleMessage('success', `📝 Component registered in registry`);
        }
        
        if (result.menuUpdated) {
          onConsoleMessage('success', `🧩 Component added to Big Book sidebar menu`);
        }
        
        if (installOptions.openPreview && result.previewUrl) {
          onConsoleMessage('info', `🔗 Preview available at: ${result.previewUrl}`);
        }
        
        onInstallComplete(result);
      } else {
        onConsoleMessage('error', `❌ Installation failed: ${result.error}`);
      }
    } catch (error) {
      onConsoleMessage('error', `❌ Installation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveComponent = async () => {
    if (!installationResult) return;

    setLoading(true);
    onConsoleMessage('info', `🗑️ Removing component: ${componentInfo?.componentName}`);

    try {
      // Choose removal endpoint based on installation type
      const endpoint = installOptions.bigBookAutoInstall 
        ? '/bigbook/remove-bigbook-component'
        : '/bigbook/remove-tsx-component';
      
      const result = await apiClient.delete<any>(endpoint);
      
      if (result.success) {
        onConsoleMessage('success', `✅ Component removed successfully`);
        setInstallationResult(null);
        setActiveStep(1); // Back to configuration
      } else {
        onConsoleMessage('error', `❌ Removal failed: ${result.error}`);
      }
    } catch (error) {
      onConsoleMessage('error', `❌ Removal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const renderParseStep = () => (
    <Box sx={{ mt: 2 }}>
      {loading ? (
        <Box display="flex" alignItems="center" justifyContent="center" py={4}>
          <CircularProgress sx={{ mr: 2 }} />
          <Typography>Parsing component file...</Typography>
        </Box>
      ) : componentInfo ? (
        <Box>
          <Alert severity={componentInfo.isValid ? "success" : "error"} sx={{ mb: 2 }}>
            <Typography variant="h6">
              {componentInfo.isValid ? "Valid React Component" : "Invalid Component"}
            </Typography>
            <Typography variant="body2">
              {componentInfo.componentName} ({componentInfo.size} bytes)
            </Typography>
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <CodeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Component Details
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Component Name" 
                        secondary={componentInfo.componentName}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Export Type" 
                        secondary={componentInfo.isDefaultExport ? "Default Export" : "Named Export"}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Uses JSX" 
                        secondary={componentInfo.hasJSX ? "Yes" : "No"}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Uses Hooks" 
                        secondary={componentInfo.hasHooks ? "Yes" : "No"}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <InstallIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Dependencies
                  </Typography>
                  
                  {componentInfo.imports.length > 0 ? (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Imports:</Typography>
                      {componentInfo.imports.map((imp, index) => (
                        <Chip key={index} label={imp} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                      ))}
                    </Box>
                  ) : null}
                  
                  {componentInfo.missingPackages.length > 0 ? (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom color="warning.main">
                        Missing Packages:
                      </Typography>
                      {componentInfo.missingPackages.map((pkg, index) => (
                        <Chip 
                          key={index} 
                          label={pkg} 
                          size="small" 
                          color="warning" 
                          sx={{ mr: 0.5, mb: 0.5 }} 
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="success.main">
                      All dependencies available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {(componentInfo.errors.length > 0 || componentInfo.warnings.length > 0) && (
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  Issues ({componentInfo.errors.length} errors, {componentInfo.warnings.length} warnings)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {componentInfo.errors.map((error, index) => (
                  <Alert key={index} severity="error" sx={{ mb: 1 }}>
                    {error}
                  </Alert>
                ))}
                {componentInfo.warnings.map((warning, index) => (
                  <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                    {warning}
                  </Alert>
                ))}
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      ) : (
        <Alert severity="info">
          Drop a .tsx file to begin parsing...
        </Alert>
      )}
    </Box>
  );

  const renderConfigStep = () => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Installation Configuration
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={installOptions.bigBookAutoInstall}
                  onChange={(e) => {
                    const isEnabled = e.target.checked;
                    setInstallOptions(prev => ({ 
                      ...prev, 
                      bigBookAutoInstall: isEnabled,
                      targetDirectory: isEnabled ? 'src/components/bigbook/custom' : 'src/components/',
                      registerInRegistry: true // Always register for Big Book components
                    }));
                  }}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle1" fontWeight={600} color="primary.main">
                    🚀 Big Book Auto-Install Mode
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Install as Big Book custom component with automatic menu integration and routing
                  </Typography>
                </Box>
              }
            />
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth>
            <FormLabel>Target Directory</FormLabel>
            <TextField
              select
              value={installOptions.targetDirectory}
              onChange={(e) => setInstallOptions(prev => ({ ...prev, targetDirectory: e.target.value }))}
              SelectProps={{ native: true }}
              sx={{ mt: 1 }}
              disabled={installOptions.bigBookAutoInstall}
              helperText={installOptions.bigBookAutoInstall ? "Directory is automatically set for Big Book components" : "Choose where to install the component"}
            >
              {availableDirectories.map((dir) => (
                <option key={dir} value={dir}>{dir}</option>
              ))}
            </TextField>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Installation Options</Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={installOptions.installMissingPackages}
                  onChange={(e) => setInstallOptions(prev => ({ ...prev, installMissingPackages: e.target.checked }))}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Install Missing NPM Packages</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Automatically install any missing dependencies
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={installOptions.registerInRegistry}
                  onChange={(e) => setInstallOptions(prev => ({ ...prev, registerInRegistry: e.target.checked }))}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Register in Component Registry</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Add component to the system registry for discovery
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={installOptions.openPreview}
                  onChange={(e) => setInstallOptions(prev => ({ ...prev, openPreview: e.target.checked }))}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Open Component Preview</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Launch component preview after installation
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={installOptions.overwriteExisting}
                  onChange={(e) => setInstallOptions(prev => ({ ...prev, overwriteExisting: e.target.checked }))}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">Overwrite Existing Files</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Replace files if they already exist
                  </Typography>
                </Box>
              }
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const renderInstallStep = () => (
    <Box sx={{ mt: 2 }}>
      {loading ? (
        <Box display="flex" alignItems="center" justifyContent="center" py={4}>
          <CircularProgress sx={{ mr: 2 }} />
          <Typography>Installing component...</Typography>
        </Box>
      ) : installationResult ? (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="h6">Component Installed Successfully!</Typography>
            <Typography variant="body2">
              {componentInfo?.componentName} has been installed to {installationResult.installedPath}
            </Typography>
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Installation Summary</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><FolderIcon /></ListItemIcon>
                      <ListItemText 
                        primary="Installed to" 
                        secondary={installationResult.installedPath}
                      />
                    </ListItem>
                    {installationResult.packagesInstalled?.length > 0 && (
                      <ListItem>
                        <ListItemIcon><InstallIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Packages Installed" 
                          secondary={installationResult.packagesInstalled.join(', ')}
                        />
                      </ListItem>
                    )}
                    {installationResult.registryUpdated && (
                      <ListItem>
                        <ListItemIcon><RegistryIcon /></ListItemIcon>
                        <ListItemText 
                          primary="Registry Updated" 
                          secondary="Component added to registry"
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Quick Actions</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {installationResult.previewUrl && (
                      <Button
                        variant="outlined"
                        startIcon={<PreviewIcon />}
                        onClick={() => window.open(installationResult.previewUrl, '_blank')}
                      >
                        View Component Preview
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<ErrorIcon />}
                      onClick={handleRemoveComponent}
                      disabled={loading}
                    >
                      Remove Component
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      ) : (
        <Alert severity="info">
          Ready to install component...
        </Alert>
      )}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <ComponentIcon sx={{ mr: 1 }} />
          TSX Component Installation
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && renderParseStep()}
        {activeStep === 1 && renderConfigStep()}
        {activeStep === 2 && renderInstallStep()}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          {installationResult ? 'Close' : 'Cancel'}
        </Button>
        
        {/* Previous button */}
        {activeStep > 0 && !installationResult && (
          <Button onClick={() => setActiveStep(activeStep - 1)}>
            Previous
          </Button>
        )}
        
        {/* Parse button for step 0 */}
        {activeStep === 0 && !componentInfo && (
          <Button
            variant="contained"
            onClick={parseComponentFile}
            disabled={loading || !file}
            startIcon={loading ? <CircularProgress size={20} /> : <CodeIcon />}
          >
            Parse Component
          </Button>
        )}
        
        {/* Next button from step 0 to step 1 (after parsing) */}
        {activeStep === 0 && componentInfo?.isValid && (
          <Button
            variant="contained"
            onClick={() => setActiveStep(1)}
          >
            Next: Configure
          </Button>
        )}
        
        {/* Next button from step 1 to step 2 (configure to install) */}
        {activeStep === 1 && componentInfo && (
          <Button
            variant="contained"
            onClick={() => setActiveStep(2)}
            disabled={!componentInfo.isValid}
          >
            Next: Install Component
          </Button>
        )}
        
        {/* Install button for step 2 */}
        {activeStep === 2 && componentInfo?.isValid && !installationResult && (
          <Button
            variant="contained"
            onClick={handleInstallComponent}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <InstallIcon />}
            color="primary"
          >
            Install Component
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TSXComponentInstallWizard; 