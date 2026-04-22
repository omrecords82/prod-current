import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import {
  Camera as CameraIcon,
  Compare as CompareIcon,
  Psychology as PsychologyIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { checkVRTAccess, logVRTAction, vrtSecurity } from '../ai/vrt/vrtSecurity.ts';
import { type VRTSettings, DEFAULT_VRT_SETTINGS } from './vrtSettingsDefaults';
import {
  SnapshotSettingsTab,
  DiffSettingsTab,
  ConfidenceSettingsTab,
  PlaywrightSettingsTab,
  LearningSettingsTab,
  SecuritySettingsTab,
} from './VRTSettingsTabs';

// Mock useAuth hook (replace with real auth context in production)
const useAuth = () => ({ 
  user: { 
    id: 'user_123',
    name: 'Super Admin', 
    role: 'super_admin',
    email: 'admin@orthodoxmetrics.com' 
  } 
});

interface VRTSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const VRTSettingsPanel: React.FC<VRTSettingsPanelProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<VRTSettings>({ ...DEFAULT_VRT_SETTINGS });

  const [selectedTab, setSelectedTab] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      // In a real implementation, load settings from services
      // For now, we'll use the default settings
      console.log('[VRT] Loading settings...');
    } catch (error) {
      console.error('[VRT] Failed to load settings:', error);
    }
  };

  const handleSettingChange = (category: keyof VRTSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleNestedSettingChange = (category: keyof VRTSettings, parentKey: string, childKey: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [parentKey]: {
          ...(prev[category] as any)[parentKey],
          [childKey]: value
        }
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Check access before saving
    const accessCheck = checkVRTAccess(user);
    if (!accessCheck.allowed) {
      setError(`Cannot save settings: ${accessCheck.reason}`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Prepare configuration object
      const newConfig = {
        enabledInProduction: settings.enabledInProduction,
        requireSuperAdmin: settings.requireSuperAdmin,
        auditLogging: settings.auditLogging,
        maxSnapshotRetention: settings.snapshot.retentionDays,
        maxAuditLogRetention: settings.auditLogRetentionDays,
        rateLimitPerHour: settings.rateLimitPerHour
      };

      // Update VRT security configuration
      vrtSecurity.updateConfig(newConfig, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      });

      // Store VRT module settings in localStorage
      const vrtSettings = {
        snapshot: {
          enabled: settings.snapshot.enabled,
          retentionDays: settings.snapshot.retentionDays,
          breakpoints: settings.snapshot.breakpoints,
          quality: settings.snapshot.quality,
          format: settings.snapshot.format
        },
        diff: {
          sensitivity: settings.diff.sensitivity,
          minRegionSize: settings.diff.minRegionSize,
          maxRegions: settings.diff.maxRegions,
          colorThreshold: settings.diff.colorThreshold,
          layoutThreshold: settings.diff.layoutThreshold,
          enableTextDetection: settings.diff.enableTextDetection,
          enableStyleDetection: settings.diff.enableStyleDetection
        },
        confidence: {
          enabled: settings.confidence.enabled,
          visualWeight: settings.confidence.visualWeight,
          severityPenalties: settings.confidence.severityPenalties,
          typeBonuses: settings.confidence.typeBonuses,
          unexpectedChangePenalty: settings.confidence.unexpectedChangePenalty,
          intentionalChangeBonus: settings.confidence.intentionalChangeBonus,
          layoutStabilityBonus: settings.confidence.layoutStabilityBonus,
          minConfidence: settings.confidence.minConfidence,
          maxConfidence: settings.confidence.maxConfidence,
          learningEnabled: settings.confidence.learningEnabled
        },
        playwright: {
          enabled: settings.playwright.enabled,
          environments: settings.playwright.environments,
          defaultAssertions: settings.playwright.defaultAssertions,
          screenshotOptions: settings.playwright.screenshotOptions,
          accessibilityThreshold: settings.playwright.accessibilityThreshold,
          colorContrastThreshold: settings.playwright.colorContrastThreshold,
          responsiveBreakpoints: settings.playwright.responsiveBreakpoints,
          maxTestDuration: settings.playwright.maxTestDuration,
          retryAttempts: settings.playwright.retryAttempts
        },
        learning: {
          enabled: settings.learning.enabled,
          minSamplesForTraining: settings.learning.minSamplesForTraining,
          trainingInterval: settings.learning.trainingInterval,
          featureExtraction: settings.learning.featureExtraction,
          modelUpdate: settings.learning.modelUpdate,
          storage: settings.learning.storage
        }
      };

      localStorage.setItem('vrt_module_settings', JSON.stringify(vrtSettings));

      // Log successful save
      await logVRTAction(user, 'SETTINGS_UPDATE', {
        action: 'settings_saved',
        settingsUpdated: Object.keys(newConfig),
        timestamp: new Date().toISOString()
      });

      setSuccessMessage('VRT settings saved successfully!');
      
      // Auto-close success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (saveError) {
      const errorMessage = saveError instanceof Error ? saveError.message : 'Failed to save settings';
      setError(errorMessage);
      
      // Log failed save
      await logVRTAction(user, 'SETTINGS_UPDATE', {
        action: 'settings_save_failed',
        error: errorMessage
      }, undefined, undefined, false, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    // Check access before resetting
    const accessCheck = checkVRTAccess(user);
    if (!accessCheck.allowed) {
      setError(`Cannot reset settings: ${accessCheck.reason}`);
      return;
    }

    setLoading(true);
    
    try {
      setSettings({ ...DEFAULT_VRT_SETTINGS });

      // Log reset action
      await logVRTAction(user, 'SETTINGS_UPDATE', {
        action: 'settings_reset_to_defaults'
      });

      setSuccessMessage('Settings reset to defaults');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (resetError) {
      const errorMessage = resetError instanceof Error ? resetError.message : 'Failed to reset settings';
      setError(errorMessage);
      
      // Log failed reset
      await logVRTAction(user, 'SETTINGS_UPDATE', {
        action: 'settings_reset_failed',
        error: errorMessage
      }, undefined, undefined, false, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  if (!isOpen) return null;

  // Check access for rendering
  const accessCheck = checkVRTAccess(user);
  if (!accessCheck.allowed) {
    return (
      <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">VRT Settings</Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="h6">Access Denied</Typography>
            <Typography>{accessCheck.reason}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              VRT settings require super administrator privileges.
            </Typography>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Visual Regression Testing Settings</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        {/* Security Warning for Production */}
        {settings.enabledInProduction && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Production Warning</Typography>
            <Typography variant="body2">
              VRT is enabled in production. This may impact performance and storage usage.
              Ensure adequate monitoring and resource allocation.
            </Typography>
          </Alert>
        )}

        <Tabs value={selectedTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Snapshot Engine" icon={<CameraIcon />} />
            <Tab label="Diff Analysis" icon={<CompareIcon />} />
            <Tab label="Confidence" icon={<PsychologyIcon />} />
            <Tab label="Testing" icon={<SpeedIcon />} />
            <Tab label="Learning" icon={<StorageIcon />} />
            <Tab label="Security" icon={<SecurityIcon />} />
          </Tabs>

          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {selectedTab === 0 && (
              <SnapshotSettingsTab
                settings={settings.snapshot}
                onChange={(key, value) => handleSettingChange('snapshot', key, value)}
                onNestedChange={(parentKey, childKey, value) => handleNestedSettingChange('snapshot', parentKey, childKey, value)}
              />
            )}
            {selectedTab === 1 && (
              <DiffSettingsTab
                settings={settings.diff}
                onChange={(key, value) => handleSettingChange('diff', key, value)}
              />
            )}
            {selectedTab === 2 && (
              <ConfidenceSettingsTab
                settings={settings.confidence}
                onChange={(key, value) => handleSettingChange('confidence', key, value)}
                onNestedChange={(parentKey, childKey, value) => handleNestedSettingChange('confidence', parentKey, childKey, value)}
              />
            )}
            {selectedTab === 3 && (
              <PlaywrightSettingsTab
                settings={settings.playwright}
                onChange={(key, value) => handleSettingChange('playwright', key, value)}
                onNestedChange={(parentKey, childKey, value) => handleNestedSettingChange('playwright', parentKey, childKey, value)}
              />
            )}
            {selectedTab === 4 && (
              <LearningSettingsTab
                settings={settings.learning}
                onChange={(key, value) => handleSettingChange('learning', key, value)}
                onNestedChange={(parentKey, childKey, value) => handleNestedSettingChange('learning', parentKey, childKey, value)}
              />
            )}
            {selectedTab === 5 && (
              <SecuritySettingsTab
                settings={settings}
                onChange={(key, value) => handleSettingChange('settings', key, value)}
                onNestedChange={(parentKey, childKey, value) => handleNestedSettingChange('settings', parentKey, childKey, value)}
              />
            )}
          </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={handleReset} 
          color="secondary"
          disabled={loading}
        >
          Reset to Defaults
        </Button>
        <Button 
          onClick={onClose} 
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VRTSettingsPanel;
