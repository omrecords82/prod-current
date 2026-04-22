/**
 * WizardSteps — Step content components for ChurchSetupWizard.
 * Extracted from ChurchSetupWizard.tsx
 */
import React, { useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Paper,
  Stack,
  Checkbox,
  Tabs,
  Tab,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon,
  Church as ChurchIcon,
  People as PeopleIcon,
  Web as WebIcon,
  Storage as StorageIcon,
  ContentCopy as CopyIcon,
  VpnKey as TokenIcon,
  TableChart as TableIcon,
} from '@mui/icons-material';
import Button from '@mui/material/Button';
import { LiveTableBuilder } from '@/features/devel-tools/live-table-builder/components/LiveTableBuilder';
import type { TableData } from '@/features/devel-tools/live-table-builder/types';
import type { ChurchWizardData, CustomField, ChurchUser, TemplateChurch } from './types';
import { AVAILABLE_RECORD_TABLES, DEFAULT_APP_OPTIONS } from './constants';

export const BasicInformationStep: React.FC<{ formik: any }> = ({ formik }) => (
  <Grid container spacing={3}>
    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        name="name"
        label="Church Name"
        value={formik.values.name}
        onChange={formik.handleChange}
        error={formik.touched.name && Boolean(formik.errors.name)}
        helperText={formik.touched.name && formik.errors.name}
        required
      />
    </Grid>
    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        name="email"
        label="Admin Email"
        type="email"
        value={formik.values.email}
        onChange={formik.handleChange}
        error={formik.touched.email && Boolean(formik.errors.email)}
        helperText={formik.touched.email && formik.errors.email}
        required
      />
    </Grid>
    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        name="phone"
        label="Phone Number"
        value={formik.values.phone}
        onChange={formik.handleChange}
        error={formik.touched.phone && Boolean(formik.errors.phone)}
        helperText={formik.touched.phone && formik.errors.phone}
        required
      />
    </Grid>
    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        name="website"
        label="Website URL"
        value={formik.values.website}
        onChange={formik.handleChange}
      />
    </Grid>
    <Grid item xs={12}>
      <TextField
        fullWidth
        name="address"
        label="Address"
        value={formik.values.address}
        onChange={formik.handleChange}
      />
    </Grid>
    <Grid item xs={12} md={4}>
      <TextField
        fullWidth
        name="city"
        label="City"
        value={formik.values.city}
        onChange={formik.handleChange}
        error={formik.touched.city && Boolean(formik.errors.city)}
        helperText={formik.touched.city && formik.errors.city}
        required
      />
    </Grid>
    <Grid item xs={12} md={4}>
      <TextField
        fullWidth
        name="state_province"
        label="State/Province"
        value={formik.values.state_province}
        onChange={formik.handleChange}
      />
    </Grid>
    <Grid item xs={12} md={4}>
      <TextField
        fullWidth
        name="postal_code"
        label="Postal Code"
        value={formik.values.postal_code}
        onChange={formik.handleChange}
      />
    </Grid>
    <Grid item xs={12} md={4}>
      <FormControl fullWidth>
        <InputLabel>Country</InputLabel>
        <Select
          name="country"
          label="Country"
          value={formik.values.country}
          onChange={formik.handleChange}
          error={formik.touched.country && Boolean(formik.errors.country)}
        >
          <MenuItem value="United States">United States</MenuItem>
          <MenuItem value="Canada">Canada</MenuItem>
          <MenuItem value="Greece">Greece</MenuItem>
          <MenuItem value="Romania">Romania</MenuItem>
          <MenuItem value="Russia">Russia</MenuItem>
          <MenuItem value="Serbia">Serbia</MenuItem>
          <MenuItem value="Bulgaria">Bulgaria</MenuItem>
          <MenuItem value="Other">Other</MenuItem>
        </Select>
      </FormControl>
    </Grid>
    <Grid item xs={12} md={4}>
      <FormControl fullWidth>
        <InputLabel>Language</InputLabel>
        <Select
          name="preferred_language"
          label="Language"
          value={formik.values.preferred_language}
          onChange={formik.handleChange}
        >
          <MenuItem value="en">English</MenuItem>
          <MenuItem value="el">Greek</MenuItem>
          <MenuItem value="ro">Romanian</MenuItem>
          <MenuItem value="ru">Russian</MenuItem>
          <MenuItem value="sr">Serbian</MenuItem>
          <MenuItem value="bg">Bulgarian</MenuItem>
        </Select>
      </FormControl>
    </Grid>
    <Grid item xs={12} md={4}>
      <FormControl fullWidth>
        <InputLabel>Currency</InputLabel>
        <Select
          name="currency"
          label="Currency"
          value={formik.values.currency}
          onChange={formik.handleChange}
        >
          <MenuItem value="USD">USD ($)</MenuItem>
          <MenuItem value="CAD">CAD ($)</MenuItem>
          <MenuItem value="EUR">EUR</MenuItem>
          <MenuItem value="GBP">GBP</MenuItem>
          <MenuItem value="RON">RON (lei)</MenuItem>
          <MenuItem value="RUB">RUB</MenuItem>
        </Select>
      </FormControl>
    </Grid>
  </Grid>
);

export const TemplateSelectionStep: React.FC<{
  formik: any;
  templateChurches: TemplateChurch[];
  selectedTemplate: TemplateChurch | null;
  onTemplateSelect: (templateId: number | null) => void;
  loading: boolean;
}> = ({ formik, templateChurches, selectedTemplate, onTemplateSelect, loading }) => (
  <Box>
    <Typography variant="body2" color="text.secondary" paragraph>
      Select an existing church to use as a template. This will copy its table structure and settings.
    </Typography>

    {loading ? (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
        <Typography ml={2}>Loading template churches...</Typography>
      </Box>
    ) : (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 1,
              cursor: 'pointer',
              borderColor: formik.values.template_church_id === null ? 'primary.main' : 'divider',
              borderWidth: formik.values.template_church_id === null ? 2 : 1,
              bgcolor: formik.values.template_church_id === null ? (theme: any) => alpha(theme.palette.primary.main, 0.04) : 'transparent',
            }}
            onClick={() => onTemplateSelect(null)}
          >
            <FormControlLabel
              control={<Checkbox checked={formik.values.template_church_id === null} onChange={() => onTemplateSelect(null)} />}
              label={
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>Start from Scratch</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create a new church with default table structures
                  </Typography>
                </Box>
              }
            />
          </Paper>
        </Grid>

        {templateChurches.map((church) => (
          <Grid item xs={12} md={6} key={church.id}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                cursor: 'pointer',
                borderWidth: selectedTemplate?.id === church.id ? 2 : 1,
                borderColor: selectedTemplate?.id === church.id ? 'primary.main' : 'divider',
                bgcolor: selectedTemplate?.id === church.id ? (theme: any) => alpha(theme.palette.primary.main, 0.04) : 'transparent',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.light' },
              }}
              onClick={() => onTemplateSelect(church.id)}
            >
              <FormControlLabel
                control={<Checkbox checked={selectedTemplate?.id === church.id} onChange={() => onTemplateSelect(church.id)} />}
                label={
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>{church.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {church.city}, {church.country}
                    </Typography>
                    <Chip label={`${church.available_tables.length} tables`} size="small" sx={{ mt: 0.5 }} />
                  </Box>
                }
              />
            </Paper>
          </Grid>
        ))}
      </Grid>
    )}
  </Box>
);

export const RecordTablesStep: React.FC<{
  formik: any;
  selectedTemplate: TemplateChurch | null;
  onAddCustomField: () => void;
  onEditCustomField: (field: CustomField) => void;
  onDeleteCustomField: (fieldId: string) => void;
  onToast: (message: string, severity?: 'success' | 'error' | 'warning' | 'info') => void;
}> = ({ formik, selectedTemplate, onAddCustomField, onEditCustomField, onDeleteCustomField, onToast }) => {
  const [tabValue, setTabValue] = useState(0);

  return (
    <Box>
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Standard Tables" icon={<StorageIcon />} iconPosition="start" />
        <Tab label="Custom Table Builder" icon={<TableIcon />} iconPosition="start" />
      </Tabs>

      {tabValue === 0 && (
        <>
          <Typography variant="body2" color="text.secondary" paragraph>
            Choose which record tables to create in the church database.
          </Typography>

          <Grid container spacing={2}>
            {AVAILABLE_RECORD_TABLES.map((table) => (
              <Grid item xs={12} md={6} key={table.key}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderColor: formik.values.selected_tables.includes(table.key) ? 'primary.main' : 'divider',
                    borderWidth: formik.values.selected_tables.includes(table.key) ? 2 : 1,
                    bgcolor: formik.values.selected_tables.includes(table.key) ? (theme: any) => alpha(theme.palette.primary.main, 0.04) : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formik.values.selected_tables.includes(table.key)}
                        onChange={(e) => {
                          const currentTables = formik.values.selected_tables;
                          if (e.target.checked) {
                            formik.setFieldValue('selected_tables', [...currentTables, table.key]);
                          } else {
                            formik.setFieldValue('selected_tables', currentTables.filter((t: string) => t !== table.key));
                          }
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>{table.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {table.description}
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" fontWeight={600}>Custom Fields</Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={onAddCustomField}
            >
              Add Custom Field
            </Button>
          </Box>

          {formik.values.custom_fields.length === 0 ? (
            <Alert severity="info" variant="outlined">
              No custom fields added. You can extend any table with additional columns.
            </Alert>
          ) : (
            <List dense>
              {formik.values.custom_fields.map((field: CustomField) => (
                <ListItem key={field.id} divider>
                  <ListItemText
                    primary={`${field.field_name} (${field.field_type})`}
                    secondary={`Table: ${field.table_name} - ${field.description}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => onEditCustomField(field)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => onDeleteCustomField(field.id)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </>
      )}

      {tabValue === 1 && (
        <Box>
          <Typography variant="body2" color="text.secondary" paragraph>
            Use the interactive table builder to design a custom record table. Define columns and optionally pre-populate rows.
          </Typography>

          <TextField
            fullWidth
            label="Custom Table Name"
            placeholder="e.g., special_services"
            value={formik.values.custom_table_builder?.table_name || ''}
            onChange={(e) => {
              const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
              formik.setFieldValue('custom_table_builder', {
                ...formik.values.custom_table_builder,
                table_name: sanitized,
                data: formik.values.custom_table_builder?.data || { columns: [], rows: [] },
              });
            }}
            helperText="Use lowercase letters, numbers, and underscores only"
            sx={{ mb: 2 }}
          />

          <Paper variant="outlined" sx={{ p: 2, minHeight: 300 }}>
            <LiveTableBuilder
              data={formik.values.custom_table_builder?.data || { columns: [{ id: 'col_0', label: 'Column A' }], rows: [{ id: 'row_0', cells: { col_0: '' } }] }}
              onDataChange={(data: TableData) => {
                formik.setFieldValue('custom_table_builder', {
                  ...formik.values.custom_table_builder,
                  table_name: formik.values.custom_table_builder?.table_name || '',
                  data,
                });
              }}
              onToast={onToast}
            />
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export const UserManagementStep: React.FC<{
  formik: any;
  onAddUser: () => void;
  onEditUser: (user: ChurchUser) => void;
  onDeleteUser: (userId: string) => void;
}> = ({ formik, onAddUser, onEditUser, onDeleteUser }) => (
  <Box>
    <Typography variant="body2" color="text.secondary" paragraph>
      Add users who will have access to the new church's records. They will receive email invitations.
    </Typography>

    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
      <Typography variant="subtitle1" fontWeight={600}>
        Users ({formik.values.initial_users.length})
      </Typography>
      <Button
        variant="outlined"
        size="small"
        startIcon={<AddIcon />}
        onClick={onAddUser}
      >
        Add User
      </Button>
    </Box>

    {formik.values.initial_users.length === 0 ? (
      <Alert severity="info" variant="outlined">
        No users added yet. Users can also be added after church creation, or they can self-register using the church's registration token.
      </Alert>
    ) : (
      <List dense>
        {formik.values.initial_users.map((user: ChurchUser) => (
          <ListItem key={user.id} divider>
            <ListItemText
              primary={`${user.first_name} ${user.last_name}`}
              secondary={`${user.email} - ${user.role.toUpperCase()}`}
            />
            <ListItemSecondaryAction>
              <Chip
                label={user.send_invite ? 'Invite' : 'No invite'}
                color={user.send_invite ? 'success' : 'default'}
                size="small"
                variant="outlined"
                sx={{ mr: 1 }}
              />
              <IconButton size="small" onClick={() => onEditUser(user)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => onDeleteUser(user.id)} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    )}
  </Box>
);

export const LandingPageStep: React.FC<{ formik: any }> = ({ formik }) => (
  <Box>
    <Typography variant="body2" color="text.secondary" paragraph>
      Configure a custom landing page for church members.
    </Typography>

    <FormControlLabel
      control={
        <Switch
          checked={formik.values.custom_landing_page.enabled}
          onChange={(e) =>
            formik.setFieldValue('custom_landing_page.enabled', e.target.checked)
          }
        />
      }
      label="Enable Custom Landing Page"
      sx={{ mb: 3 }}
    />

    {formik.values.custom_landing_page.enabled && (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Landing Page Title"
            value={formik.values.custom_landing_page.title}
            onChange={(e) =>
              formik.setFieldValue('custom_landing_page.title', e.target.value)
            }
            placeholder="Welcome to Our Church"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Primary Color"
            type="color"
            value={formik.values.custom_landing_page.primary_color}
            onChange={(e) =>
              formik.setFieldValue('custom_landing_page.primary_color', e.target.value)
            }
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Welcome Message"
            value={formik.values.custom_landing_page.welcome_message}
            onChange={(e) =>
              formik.setFieldValue('custom_landing_page.welcome_message', e.target.value)
            }
            placeholder="Enter a welcome message for members..."
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Logo URL"
            value={formik.values.custom_landing_page.logo_url}
            onChange={(e) =>
              formik.setFieldValue('custom_landing_page.logo_url', e.target.value)
            }
            placeholder="https://example.com/logo.png"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Default Application</InputLabel>
            <Select
              value={formik.values.custom_landing_page.default_app}
              onChange={(e) =>
                formik.setFieldValue('custom_landing_page.default_app', e.target.value)
              }
              label="Default Application"
            >
              {DEFAULT_APP_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    )}
  </Box>
);

export const ReviewStep: React.FC<{
  formik: any;
  selectedTemplate: TemplateChurch | null;
}> = ({ formik, selectedTemplate }) => (
  <Box>
    <Typography variant="body2" color="text.secondary" paragraph>
      Please review all settings before creating the church.
    </Typography>

    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.03) }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <ChurchIcon fontSize="small" color="primary" />
            <Typography variant="subtitle2" fontWeight={700}>Church Information</Typography>
          </Stack>
          <Typography variant="body2"><strong>Name:</strong> {formik.values.name}</Typography>
          <Typography variant="body2"><strong>Email:</strong> {formik.values.email}</Typography>
          <Typography variant="body2"><strong>Location:</strong> {formik.values.city}, {formik.values.country}</Typography>
          <Typography variant="body2"><strong>Language:</strong> {formik.values.preferred_language}</Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.info.main, 0.03) }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <StorageIcon fontSize="small" color="info" />
            <Typography variant="subtitle2" fontWeight={700}>Database Setup</Typography>
          </Stack>
          <Typography variant="body2">
            <strong>Template:</strong> {selectedTemplate ? selectedTemplate.name : 'Default'}
          </Typography>
          <Typography variant="body2">
            <strong>Tables:</strong> {formik.values.selected_tables.length} selected
          </Typography>
          <Typography variant="body2">
            <strong>Custom Fields:</strong> {formik.values.custom_fields.length}
          </Typography>
          {formik.values.custom_table_builder?.table_name && (
            <Typography variant="body2">
              <strong>Custom Table:</strong> {formik.values.custom_table_builder.table_name}
            </Typography>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.success.main, 0.03) }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <PeopleIcon fontSize="small" color="success" />
            <Typography variant="subtitle2" fontWeight={700}>Users</Typography>
          </Stack>
          <Typography variant="body2">
            <strong>Initial Users:</strong> {formik.values.initial_users.length}
          </Typography>
          {formik.values.initial_users.slice(0, 3).map((user: ChurchUser) => (
            <Typography key={user.id} variant="body2">
              &bull; {user.first_name} {user.last_name} ({user.role})
            </Typography>
          ))}
          {formik.values.initial_users.length > 3 && (
            <Typography variant="body2" color="text.secondary">
              ... and {formik.values.initial_users.length - 3} more
            </Typography>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.warning.main, 0.03) }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <WebIcon fontSize="small" color="warning" />
            <Typography variant="subtitle2" fontWeight={700}>Landing Page</Typography>
          </Stack>
          <Typography variant="body2">
            <strong>Enabled:</strong> {formik.values.custom_landing_page.enabled ? 'Yes' : 'No'}
          </Typography>
          {formik.values.custom_landing_page.enabled && (
            <>
              <Typography variant="body2">
                <strong>Title:</strong> {formik.values.custom_landing_page.title || 'Not set'}
              </Typography>
              <Typography variant="body2">
                <strong>Default App:</strong> {
                  DEFAULT_APP_OPTIONS.find(option =>
                    option.value === formik.values.custom_landing_page.default_app
                  )?.label || 'Not set'
                }
              </Typography>
            </>
          )}
        </Paper>
      </Grid>
    </Grid>

    <Alert severity="info" variant="outlined" sx={{ mt: 3 }}>
      A unique <strong>registration token</strong> will be generated after creation. Share it with church members so they can self-register.
    </Alert>
  </Box>
);

// ============================================================================
// Registration Token Step (Post-Creation)
// ============================================================================

export const RegistrationTokenStep: React.FC<{
  result: {
    church_id: number;
    db_name: string;
    registration_token: string;
    church_name: string;
  };
  onCopyToken: () => void;
  tokenCopied: boolean;
}> = ({ result, onCopyToken, tokenCopied }) => (
  <Box>
    <Alert severity="success" sx={{ mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700}>
        Church created successfully!
      </Typography>
      <Typography variant="body2">
        "{result.church_name}" has been set up with database <code>{result.db_name}</code>.
      </Typography>
    </Alert>

    <Paper
      elevation={2}
      sx={{
        p: 3,
        mb: 3,
        border: '2px solid',
        borderColor: 'primary.main',
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <TokenIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>
          Registration Token
        </Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" paragraph>
        Share this token with church members. They can use it along with the church name to register at:
      </Typography>

      <Paper
        variant="outlined"
        sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50', borderRadius: 1 }}
      >
        <Typography variant="body2" color="primary.main" fontWeight={500} sx={{ fontFamily: 'monospace' }}>
          {window.location.origin}/auth/register
        </Typography>
      </Paper>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 2,
          bgcolor: 'grey.900',
          borderRadius: 1,
          mb: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontFamily: 'monospace',
            color: '#4caf50',
            wordBreak: 'break-all',
            flex: 1,
            fontSize: '0.85rem',
          }}
        >
          {result.registration_token}
        </Typography>
        <Tooltip title={tokenCopied ? 'Copied!' : 'Copy to clipboard'}>
          <IconButton
            onClick={onCopyToken}
            size="small"
            sx={{ color: tokenCopied ? 'success.main' : 'grey.400' }}
          >
            {tokenCopied ? <CheckIcon /> : <CopyIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      <Alert severity="warning" variant="outlined">
        <Typography variant="body2">
          <strong>Important:</strong> Save this token securely. Users who register with this token will have their accounts locked by default until a super admin reviews and assigns them a role.
        </Typography>
      </Alert>
    </Paper>

    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom fontWeight={600}>
        Registration Details
      </Typography>
      <Typography variant="body2">
        <strong>Church Name:</strong> {result.church_name}
      </Typography>
      <Typography variant="body2">
        <strong>Church ID:</strong> {result.church_id}
      </Typography>
      <Typography variant="body2">
        <strong>Database:</strong> {result.db_name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Members will need both the <strong>church name</strong> (exactly as shown above) and the <strong>registration token</strong> to create their accounts.
      </Typography>
    </Paper>
  </Box>
);
