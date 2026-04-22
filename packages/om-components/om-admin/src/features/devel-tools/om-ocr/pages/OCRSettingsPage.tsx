/**
 * OCR Settings Page
 * Document processing and deletion settings matching redesigned OCR interface
 */

import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/shared/lib/axiosInstance';
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import {
    IconCode,
    IconFileDescription,
    IconUser,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useState } from 'react';
import OcrStudioNav from '../components/OcrStudioNav';

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
      id={`ocr-settings-tabpanel-${index}`}
      aria-labelledby={`ocr-settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface DocumentProcessingSettings {
  spellingCorrection: 'exact' | 'fix';
  extractAllText: 'yes' | 'no';
  improveFormatting: 'yes' | 'no';
}

interface DocumentDeletionSettings {
  deleteAfter: number;
  deleteUnit: 'minutes' | 'hours' | 'days';
}

interface OCRSettingsData {
  documentProcessing: DocumentProcessingSettings;
  documentDeletion: DocumentDeletionSettings;
}

const OCRSettingsPage: React.FC = () => {
  const { isLayout } = useContext(CustomizerContext);
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<OCRSettingsData>({
    documentProcessing: {
      spellingCorrection: 'fix',
      extractAllText: 'yes',
      improveFormatting: 'yes',
    },
    documentDeletion: {
      deleteAfter: 7,
      deleteUnit: 'days',
    },
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = useCallback(async () => {
    if (!user?.church_id) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/church/${user.church_id}/ocr/settings`);
      const data = response.data?.settings || response.data;
      
      if (data) {
        setSettings({
          documentProcessing: {
            spellingCorrection: data.documentProcessing?.spellingCorrection || 'fix',
            extractAllText: data.documentProcessing?.extractAllText || 'yes',
            improveFormatting: data.documentProcessing?.improveFormatting || 'yes',
          },
          documentDeletion: {
            deleteAfter: data.documentDeletion?.deleteAfter || 7,
            deleteUnit: data.documentDeletion?.deleteUnit || 'days',
          },
        });
      }
    } catch (err: any) {
      console.error('[OCRSettingsPage] Failed to load settings:', err);
      // Don't show error - use defaults
    } finally {
      setLoading(false);
    }
  }, [user?.church_id]);

  const handleSave = useCallback(async () => {
    if (!user?.church_id) {
      setError('Church ID not available');
      return;
    }

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Validate deletion settings
      const deleteAfterMinutes = settings.documentDeletion.deleteUnit === 'minutes'
        ? settings.documentDeletion.deleteAfter
        : settings.documentDeletion.deleteUnit === 'hours'
        ? settings.documentDeletion.deleteAfter * 60
        : settings.documentDeletion.deleteAfter * 24 * 60;

      if (deleteAfterMinutes < 10) {
        setError('Minimum deletion time is 10 minutes');
        setSaving(false);
        return;
      }

      if (deleteAfterMinutes > 14 * 24 * 60) {
        setError('Maximum deletion time is 14 days');
        setSaving(false);
        return;
      }

      // Save settings - only send document processing and deletion settings
      // Backend will merge with existing settings
      await apiClient.put(`/api/church/${user.church_id}/ocr/settings`, {
        documentProcessing: settings.documentProcessing,
        documentDeletion: settings.documentDeletion,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('[OCRSettingsPage] Failed to save settings:', err);
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [settings, user?.church_id]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3, maxWidth: isLayout === 'full' ? '100%' : 1200, mx: 'auto' }}>
      <OcrStudioNav />
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconFileDescription size={24} />
          <Typography variant="h5" fontWeight={600}>
            Settings
          </Typography>
        </Stack>
        <Select
          value="account"
          size="small"
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="account">Account</MenuItem>
        </Select>
      </Stack>

      {/* Credit Warning Banner (placeholder - can be removed if not needed) */}
      {/* Uncomment if credit system is implemented
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <span>You have used all of your page credits. To process more documents, please <a href="#" style={{ textDecoration: 'underline' }}>buy credits</a>.</span>
        </Stack>
      </Alert>
      */}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              minHeight: 64,
            },
          }}
        >
          <Tab
            icon={<IconFileDescription size={20} />}
            iconPosition="start"
            label="Documents"
            id="ocr-settings-tab-0"
            aria-controls="ocr-settings-tabpanel-0"
          />
          <Tab
            icon={<IconCode size={20} />}
            iconPosition="start"
            label="API"
            id="ocr-settings-tab-1"
            aria-controls="ocr-settings-tabpanel-1"
          />
          <Tab
            icon={<IconUser size={20} />}
            iconPosition="start"
            label="Profile"
            id="ocr-settings-tab-2"
            aria-controls="ocr-settings-tabpanel-2"
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <Paper sx={{ p: 3 }}>
        {/* Documents Tab */}
        <TabPanel value={activeTab} index={0}>
          {/* Document Processing Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Document processing
            </Typography>
            
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Customize AI
              </Typography>
              <Chip
                label="Experimental"
                size="small"
                color="default"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Stack>

            <Stack spacing={3}>
              {/* Fix spelling mistakes */}
              <FormControl fullWidth>
                <InputLabel id="spelling-correction-label">Fix spelling mistakes</InputLabel>
                <Select
                  labelId="spelling-correction-label"
                  id="spelling-correction"
                  value={settings.documentProcessing.spellingCorrection}
                  label="Fix spelling mistakes"
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      documentProcessing: {
                        ...prev.documentProcessing,
                        spellingCorrection: e.target.value as 'exact' | 'fix',
                      },
                    }))
                  }
                >
                  <MenuItem value="exact">Transcribe exactly as written</MenuItem>
                  <MenuItem value="fix">Fix spelling mistakes</MenuItem>
                </Select>
              </FormControl>

              {/* Extract all text */}
              <FormControl fullWidth>
                <InputLabel id="extract-all-text-label">Extract all text</InputLabel>
                <Select
                  labelId="extract-all-text-label"
                  id="extract-all-text"
                  value={settings.documentProcessing.extractAllText}
                  label="Extract all text"
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      documentProcessing: {
                        ...prev.documentProcessing,
                        extractAllText: e.target.value as 'yes' | 'no',
                      },
                    }))
                  }
                >
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </Select>
              </FormControl>

              {/* Improve formatting */}
              <FormControl fullWidth>
                <InputLabel id="improve-formatting-label">Improving formatting for better readability</InputLabel>
                <Select
                  labelId="improve-formatting-label"
                  id="improve-formatting"
                  value={settings.documentProcessing.improveFormatting}
                  label="Improving formatting for better readability"
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      documentProcessing: {
                        ...prev.documentProcessing,
                        improveFormatting: e.target.value as 'yes' | 'no',
                      },
                    }))
                  }
                >
                  <MenuItem value="yes">Yes</MenuItem>
                  <MenuItem value="no">No</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Button
              variant="outlined"
              onClick={handleSave}
              disabled={saving || loading}
              sx={{ mt: 3 }}
            >
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Document Deletion Section */}
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Document deletion
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Control how quickly your documents are automatically deleted from our server.
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2">Delete files after</Typography>
              <TextField
                type="number"
                value={settings.documentDeletion.deleteAfter}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value) && value > 0) {
                    setSettings((prev) => ({
                      ...prev,
                      documentDeletion: {
                        ...prev.documentDeletion,
                        deleteAfter: value,
                      },
                    }));
                  }
                }}
                inputProps={{ min: 1 }}
                sx={{ width: 100 }}
                size="small"
              />
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select
                  value={settings.documentDeletion.deleteUnit}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      documentDeletion: {
                        ...prev.documentDeletion,
                        deleteUnit: e.target.value as 'minutes' | 'hours' | 'days',
                      },
                    }))
                  }
                >
                  <MenuItem value="minutes">minutes</MenuItem>
                  <MenuItem value="hours">hours</MenuItem>
                  <MenuItem value="days">day</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Minimum 10 minutes. Maximum 14 days. Files will be deleted automatically after the selected period. Changes will not apply to existing documents.
            </Typography>

            <Button
              variant="outlined"
              onClick={handleSave}
              disabled={saving || loading}
              sx={{ mt: 2 }}
            >
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </Box>
        </TabPanel>

        {/* API Tab */}
        <TabPanel value={activeTab} index={1}>
          <Typography variant="h6" gutterBottom>
            API Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            API configuration and access tokens will be available here.
          </Typography>
        </TabPanel>

        {/* Profile Tab */}
        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Profile Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            User profile settings will be available here.
          </Typography>
        </TabPanel>
      </Paper>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setSaveSuccess(false)}>
          Settings saved successfully!
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default OCRSettingsPage;

