import React from 'react';
import {
  Alert,
  Box,
  Button,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { IconDatabase, IconSettings } from '@tabler/icons-react';
import BlankCard from '@/shared/ui/BlankCard';

interface FeatureData {
  globalDefaults?: any;
  overrides?: any;
  effective: any;
}

interface DatabaseTabProps {
  churchId: string | undefined;
  databaseName: string;
  databaseInfo: any;
  loadingDatabase: boolean;
  loadDatabaseInfo: (churchId: string) => void;
  testDatabaseConnection: (churchId: string) => void;
  selectedTemplate: string;
  setSelectedTemplate: (value: string) => void;
  updatingDatabase: boolean;
  handleUpdateDatabase: () => void;
  databaseUpdateResult: { success: boolean; message: string } | null;
  loadingFeatures: boolean;
  featureData: FeatureData;
  updatingFeatures: boolean;
  updateFeature: (featureKey: string, value: boolean) => void;
  hasRole: (role: string | string[]) => boolean;
}

interface FeatureCardProps {
  name: string;
  description: string;
  featureKey: string;
  featureData: FeatureData;
  updatingFeatures: boolean;
  updateFeature: (key: string, value: boolean) => void;
  isSuperAdmin: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  name,
  description,
  featureKey,
  featureData,
  updatingFeatures,
  updateFeature,
  isSuperAdmin,
}) => (
  <Grid item xs={12} md={6}>
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle1" fontWeight={600}>
          {name}
        </Typography>
        {isSuperAdmin ? (
          <Switch
            checked={featureData.effective[featureKey]}
            onChange={(e) => updateFeature(featureKey, e.target.checked)}
            disabled={updatingFeatures}
            size="small"
          />
        ) : (
          <Chip
            label={featureData.effective[featureKey] ? 'Enabled' : 'Disabled'}
            color={featureData.effective[featureKey] ? 'success' : 'default'}
            size="small"
          />
        )}
      </Stack>
      <Typography variant="body2" color="textSecondary" mb={1}>
        {description}
      </Typography>
      {isSuperAdmin && featureData.globalDefaults && (
        <Typography variant="caption" color="textSecondary">
          Global: {featureData.globalDefaults[featureKey] ? 'ON' : 'OFF'} |
          Override: {featureData.overrides?.[featureKey] !== undefined ? (featureData.overrides[featureKey] ? 'ON' : 'OFF') : 'None'}
        </Typography>
      )}
    </Paper>
  </Grid>
);

const FEATURES = [
  { key: 'ag_grid_enabled', name: 'AG Grid', description: 'Advanced data grid UI with sorting, filtering, and Excel-like features' },
  { key: 'power_search_enabled', name: 'Power Search', description: 'Operator-aware search with advanced query capabilities' },
  { key: 'custom_field_mapping_enabled', name: 'Custom Field Mapping', description: 'OCR and record field mapping tools for data import' },
  { key: 'om_charts_enabled', name: 'OM Charts', description: 'Graphical charts from church sacramental records' },
  { key: 'om_assistant_enabled', name: 'OM Assistant', description: 'AI assistant for chat, email intake, and record queries' },
] as const;

const DatabaseTab: React.FC<DatabaseTabProps> = ({
  churchId,
  databaseName,
  databaseInfo,
  loadingDatabase,
  loadDatabaseInfo,
  testDatabaseConnection,
  selectedTemplate,
  setSelectedTemplate,
  updatingDatabase,
  handleUpdateDatabase,
  databaseUpdateResult,
  loadingFeatures,
  featureData,
  updatingFeatures,
  updateFeature,
  hasRole,
}) => {
  const isSuperAdmin = hasRole(['super_admin']);

  return (
    <BlankCard>
      <CardContent>
        <Typography variant="h5" mb={1}>
          <IconDatabase size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Database Management
        </Typography>
        <Typography color="textSecondary" mb={3}>Database info and template updates</Typography>

        {databaseInfo && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="textSecondary">Database Name</Typography>
                <Typography variant="body1" fontFamily="monospace">{databaseInfo.name || databaseName || 'N/A'}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="textSecondary">Size</Typography>
                <Typography variant="body1">{databaseInfo.size || 'N/A'}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="textSecondary">Tables</Typography>
                <Typography variant="body1">{databaseInfo.table_count ?? 'N/A'}</Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        <Stack direction="row" spacing={2} mb={3}>
          <Button variant="outlined" startIcon={loadingDatabase ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={() => churchId && loadDatabaseInfo(churchId)} disabled={loadingDatabase}>
            Refresh Info
          </Button>
          <Button variant="outlined" color="secondary" onClick={() => churchId && testDatabaseConnection(churchId)} disabled={loadingDatabase}>
            Test Connection
          </Button>
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" mb={2}>Update Database from Template</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Select Template</InputLabel>
              <Select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} label="Select Template">
                <MenuItem value="record_template1">record_template1</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <Button
              variant="contained" color="secondary" fullWidth
              onClick={handleUpdateDatabase}
              disabled={!selectedTemplate || updatingDatabase}
              startIcon={updatingDatabase ? <CircularProgress size={16} /> : null}
            >
              {updatingDatabase ? 'Updating...' : 'Update Database'}
            </Button>
          </Grid>
        </Grid>
        {databaseUpdateResult && (
          <Alert severity={databaseUpdateResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
            {databaseUpdateResult.message}
          </Alert>
        )}

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" mb={2}>
          <IconSettings size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Features Enabled
        </Typography>
        <Typography color="textSecondary" mb={1}>
          Advanced features for this church (Global defaults + Church overrides)
        </Typography>
        {isSuperAdmin && featureData.globalDefaults && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Resolution:</strong> Church Override → Global Default → Disabled
          </Alert>
        )}

        {loadingFeatures ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {FEATURES.map((f) => (
              <FeatureCard
                key={f.key}
                name={f.name}
                description={f.description}
                featureKey={f.key}
                featureData={featureData}
                updatingFeatures={updatingFeatures}
                updateFeature={updateFeature}
                isSuperAdmin={isSuperAdmin}
              />
            ))}
          </Grid>
        )}

        {!isSuperAdmin && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Only Super Admins can modify feature flags. Contact your administrator to enable or disable features.
          </Alert>
        )}
      </CardContent>
    </BlankCard>
  );
};

export default DatabaseTab;
