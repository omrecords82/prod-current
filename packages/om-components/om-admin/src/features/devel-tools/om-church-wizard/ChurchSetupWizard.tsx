import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  Card,
  CardContent,
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
  Snackbar,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  CheckCircle as CheckIcon,
  Church as ChurchIcon,
  People as PeopleIcon,
  Web as WebIcon,
  Storage as StorageIcon,
  ContentCopy as CopyIcon,
  VpnKey as TokenIcon,
  TableChart as TableIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { LiveTableBuilder } from '@/features/devel-tools/live-table-builder/components/LiveTableBuilder';
import type { TableData } from '@/features/devel-tools/live-table-builder/types';
import type { ChurchWizardData, CustomField, ChurchUser, TemplateChurch } from './ChurchSetupWizard/types';
import {
  STEP_CONFIG,
  steps,
  AVAILABLE_RECORD_TABLES,
  FIELD_TYPES,
  DEFAULT_APP_OPTIONS,
  StyledStepConnector,
} from './ChurchSetupWizard/constants';
import CustomFieldDialog from './ChurchSetupWizard/CustomFieldDialog';
import UserDialog from './ChurchSetupWizard/UserDialog';
import {
  BasicInformationStep,
  TemplateSelectionStep,
  RecordTablesStep,
  UserManagementStep,
  LandingPageStep,
  ReviewStep,
  RegistrationTokenStep,
} from './ChurchSetupWizard/WizardSteps';

const ChurchSetupWizard: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [templateChurches, setTemplateChurches] = useState<TemplateChurch[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateChurch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog states
  const [customFieldDialog, setCustomFieldDialog] = useState(false);
  const [userDialog, setUserDialog] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [editingUser, setEditingUser] = useState<ChurchUser | null>(null);

  // Completion state
  const [wizardResult, setWizardResult] = useState<{
    church_id: number;
    db_name: string;
    registration_token: string;
    church_name: string;
  } | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // Validation schemas for each step
  const validationSchemas = [
    // Step 1: Basic Information
    Yup.object({
      name: Yup.string().required('Church name is required').min(3, 'Name must be at least 3 characters'),
      email: Yup.string().email('Invalid email format').required('Email is required'),
      phone: Yup.string().required('Phone number is required'),
      city: Yup.string().required('City is required'),
      country: Yup.string().required('Country is required'),
      preferred_language: Yup.string().required('Language is required'),
    }),
  ];

  // Formik setup
  const formik = useFormik<ChurchWizardData>({
    initialValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state_province: '',
      postal_code: '',
      country: '',
      website: '',
      preferred_language: 'en',
      timezone: 'UTC',
      currency: 'USD',
      is_active: true,
      template_church_id: null,
      selected_tables: ['baptism_records', 'marriage_records', 'funeral_records'],
      custom_fields: [],
      initial_users: [],
      custom_landing_page: {
        enabled: false,
        title: '',
        welcome_message: '',
        primary_color: '#1976d2',
        logo_url: '',
        default_app: 'liturgical_calendar'
      },
      custom_table_builder: null,
    },
    validationSchema: validationSchemas[0],
    onSubmit: async (values) => {
      await handleFinalSubmit(values);
    }
  });

  // Load template churches
  useEffect(() => {
    const fetchTemplateChurches = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get<any>('/admin/churches?preferred_language=en');
        const templatesWithTables = await Promise.all(
          data.churches.map(async (church: any) => {
            try {
              const tablesData = await apiClient.get<any>(`/admin/churches/${church.id}/tables`);
              return {
                ...church,
                available_tables: tablesData.tables || []
              };
            } catch {
              return {
                ...church,
                available_tables: []
              };
            }
          })
        );
        setTemplateChurches(templatesWithTables);
      } catch (error) {
        console.error('Error fetching template churches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplateChurches();
  }, []);

  // Handle template selection
  const handleTemplateSelection = (templateId: number | null) => {
    const template = templateChurches.find(t => t.id === templateId) || null;
    setSelectedTemplate(template);
    formik.setFieldValue('template_church_id', templateId);

    if (template) {
      formik.setFieldValue('selected_tables', template.available_tables);
    }
  };

  // Handle adding custom field
  const handleAddCustomField = (field: CustomField) => {
    const currentFields = formik.values.custom_fields;
    if (editingField) {
      const updatedFields = currentFields.map(f => f.id === field.id ? field : f);
      formik.setFieldValue('custom_fields', updatedFields);
      setEditingField(null);
    } else {
      formik.setFieldValue('custom_fields', [...currentFields, { ...field, id: Date.now().toString() }]);
    }
    setCustomFieldDialog(false);
  };

  // Handle adding user
  const handleAddUser = (user: ChurchUser) => {
    const currentUsers = formik.values.initial_users;
    if (editingUser) {
      const updatedUsers = currentUsers.map(u => u.id === user.id ? user : u);
      formik.setFieldValue('initial_users', updatedUsers);
      setEditingUser(null);
    } else {
      formik.setFieldValue('initial_users', [...currentUsers, { ...user, id: Date.now().toString() }]);
    }
    setUserDialog(false);
  };

  // Handle step navigation
  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  // Copy token to clipboard
  const handleCopyToken = async () => {
    if (wizardResult?.registration_token) {
      try {
        await navigator.clipboard.writeText(wizardResult.registration_token);
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 2000);
      } catch {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = wizardResult.registration_token;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 2000);
      }
    }
  };

  // Handle final submission
  const handleFinalSubmit = async (values: ChurchWizardData) => {
    try {
      setIsSubmitting(true);

      const result = await apiClient.post<any>('/admin/churches/wizard', values);
      // Store result and advance to token step
      setWizardResult({
        church_id: result.church_id,
        db_name: result.db_name,
        registration_token: result.registration_token,
        church_name: values.name,
      });
      setActiveStep(steps.length - 1); // Go to Registration Token step
    } catch (error: any) {
      console.error('Error creating church:', error);
      if (!error.message?.includes('required fields')) {
        setToast({ message: 'An unexpected error occurred. Please try again.', severity: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle table builder toast
  const handleBuilderToast = useCallback((message: string, severity?: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ message, severity: severity || 'info' });
  }, []);

  // Render step content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <BasicInformationStep formik={formik} />;
      case 1:
        return (
          <TemplateSelectionStep
            formik={formik}
            templateChurches={templateChurches}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={handleTemplateSelection}
            loading={loading}
          />
        );
      case 2:
        return (
          <RecordTablesStep
            formik={formik}
            selectedTemplate={selectedTemplate}
            onAddCustomField={() => setCustomFieldDialog(true)}
            onEditCustomField={(field) => {
              setEditingField(field);
              setCustomFieldDialog(true);
            }}
            onDeleteCustomField={(fieldId) => {
              const updatedFields = formik.values.custom_fields.filter(f => f.id !== fieldId);
              formik.setFieldValue('custom_fields', updatedFields);
            }}
            onToast={handleBuilderToast}
          />
        );
      case 3:
        return (
          <UserManagementStep
            formik={formik}
            onAddUser={() => setUserDialog(true)}
            onEditUser={(user) => {
              setEditingUser(user);
              setUserDialog(true);
            }}
            onDeleteUser={(userId) => {
              const updatedUsers = formik.values.initial_users.filter(u => u.id !== userId);
              formik.setFieldValue('initial_users', updatedUsers);
            }}
          />
        );
      case 4:
        return <LandingPageStep formik={formik} />;
      case 5:
        return <ReviewStep formik={formik} selectedTemplate={selectedTemplate} />;
      case 6:
        return wizardResult ? (
          <RegistrationTokenStep
            result={wizardResult}
            onCopyToken={handleCopyToken}
            tokenCopied={tokenCopied}
          />
        ) : null;
      default:
        return null;
    }
  };

  // Check if user has permission to create churches
  if (!hasRole(['super_admin'])) {
    return (
      <Box p={3}>
        <Alert severity="error">
          You don't have permission to create churches. Please contact a system administrator.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3} maxWidth={1100} mx="auto">
      <Card elevation={3}>
        <CardContent sx={{ p: { xs: 2, md: 4 } }}>
          {/* Header */}
          <Box mb={4}>
            <Stack direction="row" alignItems="center" spacing={2} mb={1}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChurchIcon color="primary" fontSize="large" />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  Church Setup Wizard
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Step {activeStep + 1} of {steps.length} &mdash; {STEP_CONFIG[activeStep].description}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Stepper
            activeStep={activeStep}
            orientation="vertical"
            connector={<StyledStepConnector />}
          >
            {steps.map((label, index) => (
              <Step key={label} completed={wizardResult ? index < steps.length - 1 : undefined}>
                <StepLabel
                  StepIconProps={{
                    sx: {
                      '&.Mui-active': { color: 'primary.main' },
                      '&.Mui-completed': { color: 'success.main' },
                    }
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle1" fontWeight={activeStep === index ? 700 : 500}>
                      {label}
                    </Typography>
                    {activeStep === index && (
                      <Chip
                        label="Current"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </Stack>
                </StepLabel>
                <StepContent>
                  <Box my={2}>
                    {renderStepContent(index)}
                  </Box>

                  {/* Navigation buttons - don't show on token step */}
                  {index < steps.length - 1 && (
                    <Box mt={3} display="flex" gap={1}>
                      <Button
                        disabled={activeStep === 0}
                        onClick={handleBack}
                        variant="outlined"
                        size="small"
                      >
                        Back
                      </Button>

                      {activeStep === steps.length - 2 ? (
                        <Button
                          variant="contained"
                          onClick={() => formik.handleSubmit()}
                          disabled={isSubmitting}
                          startIcon={isSubmitting ? <CircularProgress size={18} /> : <SaveIcon />}
                        >
                          {isSubmitting ? 'Creating Church...' : 'Create Church'}
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          onClick={handleNext}
                        >
                          Continue
                        </Button>
                      )}
                    </Box>
                  )}

                  {/* Token step - show finish button */}
                  {index === steps.length - 1 && wizardResult && (
                    <Box mt={3}>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => navigate(`/apps/church-management/edit/${wizardResult.church_id}`, {
                          state: {
                            message: `Church "${wizardResult.church_name}" created successfully!`,
                            severity: 'success'
                          }
                        })}
                        startIcon={<CheckIcon />}
                      >
                        Go to Church Management
                      </Button>
                    </Box>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Custom Field Dialog */}
      <CustomFieldDialog
        open={customFieldDialog}
        onClose={() => {
          setCustomFieldDialog(false);
          setEditingField(null);
        }}
        onSave={handleAddCustomField}
        editingField={editingField}
        existingTables={formik.values.selected_tables}
      />

      {/* User Dialog */}
      <UserDialog
        open={userDialog}
        onClose={() => {
          setUserDialog(false);
          setEditingUser(null);
        }}
        onSave={handleAddUser}
        editingUser={editingUser}
      />

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} variant="filled">
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};

export default ChurchSetupWizard;
