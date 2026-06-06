/**
 * OCR Settings Page
 * Document processing, auto-deletion, rules engine toggles, clergy tenures, and locations.
 */

import { useAuth } from '@/context/AuthContext';
import { CustomizerContext } from '@/context/CustomizerContext';
import { apiClient } from '@/shared/lib/axiosInstance';
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Switch,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
} from '@mui/material';
import {
    IconCode,
    IconFileDescription,
    IconUser,
    IconSettings,
    IconUserCheck,
    IconMapPin,
    IconPlus,
    IconTrash,
    IconEdit,
} from '@tabler/icons-react';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  useRecordSnippets: boolean;
  documentProcessing: DocumentProcessingSettings;
  documentDeletion: DocumentDeletionSettings;
}

const OCRSettingsPage: React.FC = () => {
  const { isLayout } = useContext(CustomizerContext);
  const { user, isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const churchParam = searchParams.get('church');

  // Church selector state (super_admin only)
  const [churches, setChurches] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(
    churchParam ? Number(churchParam) : user?.church_id ? Number(user.church_id) : null
  );

  const effectiveChurchId = selectedChurchId || (user?.church_id ? Number(user.church_id) : null);

  // Load churches list for super_admin
  useEffect(() => {
    if (!isSuperAdmin()) return;
    (async () => {
      try {
        const res: any = await apiClient.get('/api/churches');
        const list = res.data?.churches || res.churches || res.data || [];
        const sorted = (Array.isArray(list) ? list : []).sort((a: any, b: any) =>
          (a.name || '').localeCompare(b.name || '')
        );
        setChurches(sorted);
      } catch (err) {
        console.error('Failed to load churches:', err);
      }
    })();
  }, [isSuperAdmin]);

  const selectedChurchName = useMemo(() => {
    if (!selectedChurchId) return null;
    const found = churches.find(c => c.id === selectedChurchId);
    return found?.name || `Church #${selectedChurchId}`;
  }, [selectedChurchId, churches]);
  
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapHint, setMapHint] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<OCRSettingsData>({
    useRecordSnippets: true,
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

  // Rules and Config Entities State
  const [entities, setEntities] = useState<any[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  // Dialog & Form States
  const [clergyDialogOpen, setClergyDialogOpen] = useState(false);
  const [editingClergy, setEditingClergy] = useState<any>(null);
  const [clergyForm, setClergyForm] = useState({
    canonical_value: '',
    role: 'Rector',
    active_from: '',
    active_to: '',
    variants_json: '',
    source_notes: ''
  });

  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [locationForm, setLocationForm] = useState({
    canonical_value: '',
    display_label: '',
    variants_json: '',
    source_notes: ''
  });

  // Load Settings
  const loadSettings = useCallback(async () => {
    if (!effectiveChurchId) return;
    setLoading(true);
    try {
      const response: any = await apiClient.get(`/api/church/${effectiveChurchId}/ocr/settings`);
      const data = response?.settings || response;
      if (data) {
        setSettings({
          useRecordSnippets: data.useRecordSnippets !== undefined ? Boolean(data.useRecordSnippets) : true,
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
    } finally {
      setLoading(false);
    }
  }, [effectiveChurchId]);

  // Load Config Entities (Clergy/Locations)
  const loadEntities = useCallback(async () => {
    if (!effectiveChurchId) return;
    setEntitiesLoading(true);
    try {
      const res = await apiClient.get(`/api/church/${effectiveChurchId}/ocr/rules/config/entities`);
      const data = res.data?.entities || res.entities || [];
      setEntities(data);
    } catch (err) {
      console.error("Failed to load entities:", err);
    } finally {
      setEntitiesLoading(false);
    }
  }, [effectiveChurchId]);

  // Load Rules
  const loadRules = useCallback(async () => {
    if (!effectiveChurchId) return;
    setRulesLoading(true);
    try {
      const res = await apiClient.get(`/api/church/${effectiveChurchId}/ocr/rules`);
      const dbRules = res.data?.rules || res.rules || [];
      
      const rulesMap = new Map();
      const defaultRulesList = [
        {
          id: -1,
          name: 'Baptism Date preceding Birth Date check',
          description: 'Ensures the baptism/reception date is not before the birth date.',
          record_type: 'baptism',
          severity: 'blocker',
          is_active: true,
          conditions: { all: [{ field: 'reception_date', operator: 'is_before_field', value: 'birth_date' }] },
          actions: [{ type: 'block_record_completion', field: 'reception_date', explanation_template: 'Baptism/reception date cannot occur before the birth date.' }]
        },
        {
          id: -2,
          name: 'Funeral Date preceding Death Date check',
          description: 'Ensures the funeral/burial date is not before the death date.',
          record_type: 'funeral',
          severity: 'blocker',
          is_active: true,
          conditions: { all: [{ field: 'burial_date', operator: 'is_before_field', value: 'deceased_date' }] },
          actions: [{ type: 'block_record_completion', field: 'burial_date', explanation_template: 'Funeral or burial date cannot occur before the death date.' }]
        },
        {
          id: -3,
          name: 'Infer Child Surname from Father',
          description: 'Suggests child surname from the father\'s surname listed in the parents field.',
          record_type: 'baptism',
          severity: 'suggestion',
          is_active: true,
          conditions: { all: [{ field: 'last_name', operator: 'is_empty' }, { field: 'parents', operator: 'has_father_surname' }] },
          actions: [{ type: 'suggest_value', field: 'last_name', resolver: 'father_surname_from_parents', resolver_args: { source_field: 'parents' }, auto_apply: false, explanation_template: 'Suggested child surname from the father\'s surname listed in the parents field.' }]
        },
        {
          id: -4,
          name: 'Infer Child Surname from Shared Parent Surname',
          description: 'Suggests child surname because both parents appear to share the same surname.',
          record_type: 'baptism',
          severity: 'suggestion',
          is_active: true,
          conditions: { all: [{ field: 'last_name', operator: 'is_empty' }, { field: 'parents', operator: 'has_shared_parent_surname' }] },
          actions: [{ type: 'suggest_value', field: 'last_name', resolver: 'shared_parent_surname', resolver_args: { source_field: 'parents' }, auto_apply: false, explanation_template: 'Suggested child surname because both parents appear to share the same surname.' }]
        },
        {
          id: -5,
          name: 'Suggest Clergy from Tenure and Variants',
          description: 'Suggests or normalizes canonical clergy name based on event date and configured variants.',
          record_type: 'all',
          severity: 'suggestion',
          is_active: true,
          conditions: { any: [{ field: 'clergy', operator: 'is_empty' }, { field: 'clergy', operator: 'matches_entity_variant', value: { entity_type: 'clergy' } }] },
          actions: [{ type: 'suggest_value', field: 'clergy', resolver: 'best_matching_clergy_by_tenure_and_variant', auto_apply: false, explanation_template: 'Suggested officiant based on record event date and clergy active service periods.' }]
        }
      ];

      defaultRulesList.forEach(r => rulesMap.set(r.name, r));
      dbRules.forEach((r: any) => {
        const existing = rulesMap.get(r.name);
        rulesMap.set(r.name, { ...existing, ...r, is_active: r.is_active === 1 });
      });

      setRules(Array.from(rulesMap.values()));
    } catch (err) {
      console.error("Failed to load rules:", err);
    } finally {
      setRulesLoading(false);
    }
  }, [effectiveChurchId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Auto-dismiss mapHint after 3 seconds
  useEffect(() => {
    if (!mapHint) return;
    const timer = setTimeout(() => setMapHint(null), 3000);
    return () => clearTimeout(timer);
  }, [mapHint]);

  useEffect(() => {
    if (activeTab === 3) {
      loadRules();
    } else if (activeTab === 4 || activeTab === 5) {
      loadEntities();
    }
  }, [activeTab, loadRules, loadEntities]);

  const handleSaveSettings = useCallback(async () => {
    if (!effectiveChurchId) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
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

      await apiClient.put(`/api/church/${effectiveChurchId}/ocr/settings`, {
        useRecordSnippets: settings.useRecordSnippets,
        documentProcessing: settings.documentProcessing,
        documentDeletion: settings.documentDeletion,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [settings, effectiveChurchId]);

  // Toggle Default Rule Enabled/Disabled
  const handleToggleRule = async (rule: any) => {
    try {
      const activeState = !rule.is_active;
      if (rule.id < 0) {
        const res = await apiClient.post(`/api/church/${effectiveChurchId}/ocr/rules`, {
          name: rule.name,
          description: rule.description,
          record_type: rule.record_type,
          conditions_json: rule.conditions,
          actions_json: rule.actions,
          severity: rule.severity,
          priority: rule.priority
        });
        const createdId = res.data?.id || res.id;
        if (!activeState) {
          await apiClient.patch(`/api/church/${effectiveChurchId}/ocr/rules/${createdId}`, {
            is_active: 0
          });
        }
      } else {
        await apiClient.patch(`/api/church/${effectiveChurchId}/ocr/rules/${rule.id}`, {
          is_active: activeState ? 1 : 0
        });
      }
      setMapHint(`Rule "${rule.name}" ${activeState ? 'enabled' : 'disabled'}.`);
      loadRules();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to toggle rule");
    }
  };

  // Clergy Submit Handler
  const handleClergySubmit = async () => {
    try {
      const parsedVariants = clergyForm.variants_json
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);

      const payload = {
        entity_type: 'clergy',
        canonical_value: clergyForm.canonical_value,
        role: clergyForm.role,
        active_from: clergyForm.active_from || null,
        active_to: clergyForm.active_to || null,
        variants_json: parsedVariants,
        source_notes: clergyForm.source_notes || null
      };

      if (editingClergy) {
        await apiClient.patch(`/api/church/${effectiveChurchId}/ocr/rules/config/entities/${editingClergy.id}`, payload);
      } else {
        await apiClient.post(`/api/church/${effectiveChurchId}/ocr/rules/config/entities`, payload);
      }
      
      setClergyDialogOpen(false);
      loadEntities();
      setMapHint(editingClergy ? "Clergy updated successfully" : "Clergy added successfully");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save clergy configuration");
    }
  };

  // Location Submit Handler
  const handleLocationSubmit = async () => {
    try {
      const parsedVariants = locationForm.variants_json
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);

      const payload = {
        entity_type: 'location',
        canonical_value: locationForm.canonical_value,
        display_label: locationForm.display_label || null,
        variants_json: parsedVariants,
        source_notes: locationForm.source_notes || null
      };

      if (editingLocation) {
        await apiClient.patch(`/api/church/${effectiveChurchId}/ocr/rules/config/entities/${editingLocation.id}`, payload);
      } else {
        await apiClient.post(`/api/church/${effectiveChurchId}/ocr/rules/config/entities`, payload);
      }

      setLocationDialogOpen(false);
      loadEntities();
      setMapHint(editingLocation ? "Location updated successfully" : "Location added successfully");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save location");
    }
  };

  // Delete Entity Handler
  const handleDeleteEntity = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this configuration entity?")) return;
    try {
      await apiClient.delete(`/api/church/${effectiveChurchId}/ocr/rules/config/entities/${id}`);
      loadEntities();
      setMapHint("Entity deleted successfully");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete entity");
    }
  };

  const clergyList = entities.filter(e => e.entity_type === 'clergy');
  const locationList = entities.filter(e => e.entity_type === 'location');

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
          {selectedChurchName && (
            <Chip label={selectedChurchName} size="small" color="primary" variant="outlined" />
          )}
        </Stack>
        {isSuperAdmin() && churches.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>Church</InputLabel>
            <Select
              value={selectedChurchId || ''}
              label="Church"
              onChange={(e) => {
                const newId = Number(e.target.value);
                setSelectedChurchId(newId);
                setSearchParams({ church: String(newId) });
              }}
            >
              {churches.map((c: any) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name} (#{c.id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Alert severity="info" sx={{ m: 2, mb: 0 }}>
          Configure baptism, marriage, and funeral ledger column headers on the{' '}
          <a href="/devel/ocr-studio/record-fields">Record Headers</a> page.
        </Alert>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              minHeight: 64,
            },
          }}
        >
          <Tab icon={<IconFileDescription size={20} />} iconPosition="start" label="Documents" />
          <Tab icon={<IconCode size={20} />} iconPosition="start" label="API" />
          <Tab icon={<IconUser size={20} />} iconPosition="start" label="Profile" />
          <Tab icon={<IconSettings size={20} />} iconPosition="start" label="Rules Engine" />
          <Tab icon={<IconUserCheck size={20} />} iconPosition="start" label="Parish Clergy" />
          <Tab icon={<IconMapPin size={20} />} iconPosition="start" label="Locations" />
        </Tabs>
      </Paper>

      {/* Success/Error Alerts */}
      {mapHint && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMapHint(null)}>
          {mapHint}
        </Alert>
      )}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaveSuccess(false)}>
          Settings saved successfully!
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tab Panels */}
      <Paper sx={{ p: 3 }}>
        {/* Documents Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Document processing
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">Customize AI</Typography>
              <Chip label="Experimental" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
            </Stack>

            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel id="spelling-correction-label">Fix spelling mistakes</InputLabel>
                <Select
                  labelId="spelling-correction-label"
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

              <FormControl fullWidth>
                <InputLabel id="extract-all-text-label">Extract all text</InputLabel>
                <Select
                  labelId="extract-all-text-label"
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

              <FormControl fullWidth>
                <InputLabel id="improve-formatting-label">Improving formatting for better readability</InputLabel>
                <Select
                  labelId="improve-formatting-label"
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
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.useRecordSnippets}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        useRecordSnippets: e.target.checked,
                      }))
                    }
                    size="small"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2">Use Record Snippets</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Split pages into individual record snippets. If disabled, the entire page is processed as one image record.
                    </Typography>
                  </Box>
                }
                sx={{ mt: 1.5 }}
              />
            </Stack>

            <Button variant="outlined" onClick={handleSaveSettings} disabled={saving || loading} sx={{ mt: 3 }}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </Box>

          <Divider sx={{ my: 4 }} />

          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>Document deletion</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Control how quickly your documents are automatically deleted from our server.
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2">Delete files after</Typography>
              <TextField
                type="number"
                value={settings.documentDeletion.deleteAfter}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) {
                    setSettings(prev => ({
                      ...prev,
                      documentDeletion: { ...prev.documentDeletion, deleteAfter: val }
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
                  <MenuItem value="days">days</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Minimum 10 minutes. Maximum 14 days. Files will be deleted automatically after the selected period.
            </Typography>
            <Button variant="outlined" onClick={handleSaveSettings} disabled={saving || loading} sx={{ mt: 2 }}>
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </Box>
        </TabPanel>

        {/* API Tab */}
        <TabPanel value={activeTab} index={1}>
          <Typography variant="h6" gutterBottom>API Settings</Typography>
          <Typography variant="body2" color="text.secondary">API configuration and access tokens will be available here.</Typography>
        </TabPanel>

        {/* Profile Tab */}
        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" gutterBottom>Profile Settings</Typography>
          <Typography variant="body2" color="text.secondary">User profile settings will be available here.</Typography>
        </TabPanel>

        {/* Rules Engine Tab */}
        <TabPanel value={activeTab} index={3}>
          <Typography variant="h6" fontWeight={600} gutterBottom>Parish Validation & Inference Rules</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Tweak the rules applied to OCR/LLM extractions before records are finalized.
          </Typography>
          
           {rulesLoading ? (
            <Typography>Loading rules...</Typography>
          ) : rules.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>No Validation Rules Configured</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Rules validate OCR-extracted records before they are finalized. Add rules to catch data errors, suggest values, and enforce consistency.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Rule Name & Description</TableCell>
                    <TableCell>Scope</TableCell>
                    <TableCell>Record Type</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell align="center">Enabled</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.name}>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={600}>{rule.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{rule.description}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={rule.scope || 'global'}
                          size="small"
                          color={rule.scope === 'global' ? 'primary' : rule.scope === 'diocesan' ? 'secondary' : 'default'}
                          variant="filled"
                          sx={{ textTransform: 'capitalize', fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{rule.record_type}</TableCell>
                      <TableCell>
                        <Chip
                          label={rule.severity}
                          size="small"
                          color={rule.severity === 'blocker' ? 'error' : rule.severity === 'warning' ? 'warning' : 'info'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={rule.is_active}
                          onChange={() => handleToggleRule(rule)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Parish Clergy Tab */}
        <TabPanel value={activeTab} index={4}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={600}>Parish Clergy Tenures</Typography>
              <Typography variant="body2" color="text.secondary">
                Configure clergy canonical names, spellings, active date ranges, and OCR variants.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<IconPlus size={16} />}
              onClick={() => {
                setEditingClergy(null);
                setClergyForm({
                  canonical_value: '',
                  role: 'Rector',
                  active_from: '',
                  active_to: '',
                  variants_json: '',
                  source_notes: ''
                });
                setClergyDialogOpen(true);
              }}
            >
              Add Clergy
            </Button>
          </Stack>

          {entitiesLoading ? (
            <Typography>Loading clergy...</Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Canonical Name</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Service Dates</TableCell>
                    <TableCell>Variants</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clergyList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No clergy tenures configured. Add clergy to enable tenure-based officiant suggestion.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clergyList.map((c) => {
                      let variantsArr = [];
                      try {
                        variantsArr = typeof c.variants_json === 'string' ? JSON.parse(c.variants_json) : (c.variants_json || []);
                      } catch (_) {}
                      return (
                        <TableRow key={c.id}>
                          <TableCell sx={{ fontWeight: 600 }}>{c.canonical_value}</TableCell>
                          <TableCell>{c.role}</TableCell>
                          <TableCell>
                            {c.active_from || '—'} to {c.active_to || '—'}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                              {variantsArr.map((v: string) => (
                                <Chip key={v} label={v} size="small" variant="outlined" />
                              ))}
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200, noWrap: true, textOverflow: 'ellipsis', overflow: 'hidden' }}>{c.source_notes || '—'}</TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setEditingClergy(c);
                                  setClergyForm({
                                    canonical_value: c.canonical_value,
                                    role: c.role || 'Rector',
                                    active_from: c.active_from || '',
                                    active_to: c.active_to || '',
                                    variants_json: variantsArr.join(', '),
                                    source_notes: c.source_notes || ''
                                  });
                                  setClergyDialogOpen(true);
                                }}
                              >
                                <IconEdit size={16} />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDeleteEntity(c.id)}>
                                <IconTrash size={16} />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        {/* Locations Tab */}
        <TabPanel value={activeTab} index={5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={600}>Known Locations & Spelling Variants</Typography>
              <Typography variant="body2" color="text.secondary">
                Configure canonical location values and OCR spelling mappings for your parish ledger.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<IconPlus size={16} />}
              onClick={() => {
                setEditingLocation(null);
                setLocationForm({
                  canonical_value: '',
                  display_label: '',
                  variants_json: '',
                  source_notes: ''
                });
                setLocationDialogOpen(true);
              }}
            >
              Add Location
            </Button>
          </Stack>

          {entitiesLoading ? (
            <Typography>Loading locations...</Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Canonical Value</TableCell>
                    <TableCell>Display Label</TableCell>
                    <TableCell>Variants</TableCell>
                    <TableCell>Notes</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {locationList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No locations configured.
                      </TableCell>
                    </TableRow>
                  ) : (
                    locationList.map((l) => {
                      let variantsArr = [];
                      try {
                        variantsArr = typeof l.variants_json === 'string' ? JSON.parse(l.variants_json) : (l.variants_json || []);
                      } catch (_) {}
                      return (
                        <TableRow key={l.id}>
                          <TableCell sx={{ fontWeight: 600 }}>{l.canonical_value}</TableCell>
                          <TableCell>{l.display_label || '—'}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                              {variantsArr.map((v: string) => (
                                <Chip key={v} label={v} size="small" variant="outlined" />
                              ))}
                            </Stack>
                          </TableCell>
                          <TableCell>{l.source_notes || '—'}</TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setEditingLocation(l);
                                  setLocationForm({
                                    canonical_value: l.canonical_value,
                                    display_label: l.display_label || '',
                                    variants_json: variantsArr.join(', '),
                                    source_notes: l.source_notes || ''
                                  });
                                  setLocationDialogOpen(true);
                                }}
                              >
                                <IconEdit size={16} />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDeleteEntity(l.id)}>
                                <IconTrash size={16} />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Paper>

      {/* Clergy Dialog */}
      <Dialog open={clergyDialogOpen} onClose={() => setClergyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingClergy ? "Edit Clergy Tenure" : "Add Clergy Tenure"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Canonical Name"
              placeholder="e.g. V. Rev. James Parsells"
              value={clergyForm.canonical_value}
              onChange={(e) => setClergyForm(prev => ({ ...prev, canonical_value: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="Role"
              placeholder="e.g. Rector, Assistant Priest, Visiting Priest"
              value={clergyForm.role}
              onChange={(e) => setClergyForm(prev => ({ ...prev, role: e.target.value }))}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                size="small"
                label="Active From"
                placeholder="YYYY-MM-DD"
                value={clergyForm.active_from}
                onChange={(e) => setClergyForm(prev => ({ ...prev, active_from: e.target.value }))}
              />
              <TextField
                fullWidth
                size="small"
                label="Active To"
                placeholder="YYYY-MM-DD or blank"
                value={clergyForm.active_to}
                onChange={(e) => setClergyForm(prev => ({ ...prev, active_to: e.target.value }))}
              />
            </Stack>
            <TextField
              fullWidth
              size="small"
              label="Spelling/OCR Variants"
              placeholder="Comma separated: Fr. James, Fr. Parsells, J. Parsells"
              value={clergyForm.variants_json}
              onChange={(e) => setClergyForm(prev => ({ ...prev, variants_json: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="Source/Audit Notes"
              placeholder="e.g. Parish registry record or ordination records"
              value={clergyForm.source_notes}
              onChange={(e) => setClergyForm(prev => ({ ...prev, source_notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClergyDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleClergySubmit} disabled={!clergyForm.canonical_value}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={locationDialogOpen} onClose={() => setLocationDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingLocation ? "Edit Known Location" : "Add Known Location"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Canonical Value"
              placeholder="e.g. St. Vladimir Church"
              value={locationForm.canonical_value}
              onChange={(e) => setLocationForm(prev => ({ ...prev, canonical_value: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="Display Label"
              placeholder="e.g. St. Vladimir, Trenton, NJ"
              value={locationForm.display_label}
              onChange={(e) => setLocationForm(prev => ({ ...prev, display_label: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="Spelling/OCR Variants"
              placeholder="Comma separated spelling variants: St. Vladimirs, Trenton"
              value={locationForm.variants_json}
              onChange={(e) => setLocationForm(prev => ({ ...prev, variants_json: e.target.value }))}
            />
            <TextField
              fullWidth
              size="small"
              label="Notes"
              value={locationForm.source_notes}
              onChange={(e) => setLocationForm(prev => ({ ...prev, source_notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocationDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleLocationSubmit} disabled={!locationForm.canonical_value}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OCRSettingsPage;
