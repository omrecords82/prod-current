/**
 * Orthodox Metrics - Church Management Create/Edit Form
 * Comprehensive form with user management, database config, and full validation.
 */

import { adminAPI } from '@/api/admin.api';
import { apiClient } from '@/api/utils/axiosInstance';
import { useAuth } from '@/context/AuthContext';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { fetchWithChurchContext } from '@/shared/lib/fetchWithChurchContext';
import BlankCard from '@/shared/ui/BlankCard';
import PageContainer from '@/shared/ui/PageContainer';
import type { SupportedLanguage } from '@/types/orthodox-metrics.types';
import { logger } from '@/utils/logger';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Snackbar,
    Stack,
    Switch,
    Tab,
    Tabs,
    TextField,
    Typography
} from '@mui/material';
import {
    IconBuilding,
    IconDatabase,
    IconSettings,
    IconUsers,
} from '@tabler/icons-react';
import { useFormik } from 'formik';
import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import * as Yup from 'yup';
import ChurchInfoTab from './ChurchForm/ChurchInfoTab';
import DatabaseTab from './ChurchForm/DatabaseTab';
import UsersTab from './ChurchForm/UsersTab';
import UserManagementDialog from './UserManagementDialog';

const validationSchema = Yup.object({
  name: Yup.string().required('Church name is required').min(2, 'Name must be at least 2 characters'),
  email: Yup.string().email('Invalid email format').required('Email is required'),
  phone: Yup.string().matches(/^[+]?[\d\s()-]*$/, 'Invalid phone format').nullable(),
  city: Yup.string(),
  state_province: Yup.string(),
  postal_code: Yup.string(),
  country: Yup.string(),
  preferred_language: Yup.string().required('Language preference is required'),
  timezone: Yup.string().required('Timezone is required'),
  currency: Yup.string(),
  tax_id: Yup.string(),
  website: Yup.string()
    .nullable()
    .transform((value) => {
      // If empty or null, return as-is
      if (!value || value.trim() === '') return value;
      
      // If it already has a protocol, return as-is
      if (/^https?:\/\//i.test(value)) return value;
      
      // Otherwise, prepend http://
      return `http://${value}`;
    })
    .url('Must be a valid URL'),
});

const ChurchForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasRole } = useAuth();
  type PageBucket = {
    loading: boolean;
    error: string | null;
    success: string | null;
    activeTab: number;
  };
  const [page, setPage] = useState<PageBucket>({
    loading: false,
    error: null,
    success: null,
    activeTab: 0,
  });
  const setPageField = useCallback(<K extends keyof PageBucket>(key: K, value: PageBucket[K]) => {
    setPage(prev => ({ ...prev, [key]: value }));
  }, []);
  const { loading, error, success, activeTab } = page;
  const setLoading = useCallback((v: boolean) => setPageField('loading', v), [setPageField]);
  const setError = useCallback((v: string | null) => setPageField('error', v), [setPageField]);
  const setSuccess = useCallback((v: string | null) => setPageField('success', v), [setPageField]);
  const setActiveTab = useCallback((v: number) => setPageField('activeTab', v), [setPageField]);

  // User management
  type UsersBucket = {
    churchUsers: any[];
    loadingUsers: boolean;
    userDialogOpen: boolean;
    userDialogAction: 'add' | 'edit';
    selectedUser: any;
  };
  const [usersState, setUsersState] = useState<UsersBucket>({
    churchUsers: [],
    loadingUsers: false,
    userDialogOpen: false,
    userDialogAction: 'add',
    selectedUser: null,
  });
  const setUsersField = useCallback(<K extends keyof UsersBucket>(key: K, value: UsersBucket[K]) => {
    setUsersState(prev => ({ ...prev, [key]: value }));
  }, []);
  const { churchUsers, loadingUsers, userDialogOpen, userDialogAction, selectedUser } = usersState;
  const setChurchUsers = useCallback((v: any[]) => setUsersField('churchUsers', v), [setUsersField]);
  const setLoadingUsers = useCallback((v: boolean) => setUsersField('loadingUsers', v), [setUsersField]);
  const setUserDialogOpen = useCallback((v: boolean) => setUsersField('userDialogOpen', v), [setUsersField]);
  const setUserDialogAction = useCallback((v: 'add' | 'edit') => setUsersField('userDialogAction', v), [setUsersField]);
  const setSelectedUser = useCallback((v: any) => setUsersField('selectedUser', v), [setUsersField]);

  // Database + feature flag tooling
  type DbBucket = {
    databaseInfo: any;
    loadingDatabase: boolean;
    selectedTemplate: string;
    updatingDatabase: boolean;
    databaseUpdateResult: { success: boolean; message: string } | null;
    loadingFeatures: boolean;
    updatingFeatures: boolean;
  };
  const [dbState, setDbState] = useState<DbBucket>({
    databaseInfo: null,
    loadingDatabase: false,
    selectedTemplate: '',
    updatingDatabase: false,
    databaseUpdateResult: null,
    loadingFeatures: false,
    updatingFeatures: false,
  });
  const setDbField = useCallback(<K extends keyof DbBucket>(key: K, value: DbBucket[K]) => {
    setDbState(prev => ({ ...prev, [key]: value }));
  }, []);
  const { databaseInfo, loadingDatabase, selectedTemplate, updatingDatabase, databaseUpdateResult, loadingFeatures, updatingFeatures } = dbState;
  const setDatabaseInfo = useCallback((v: any) => setDbField('databaseInfo', v), [setDbField]);
  const setLoadingDatabase = useCallback((v: boolean) => setDbField('loadingDatabase', v), [setDbField]);
  const setSelectedTemplate = useCallback((v: string) => setDbField('selectedTemplate', v), [setDbField]);
  const setUpdatingDatabase = useCallback((v: boolean) => setDbField('updatingDatabase', v), [setDbField]);
  const setDatabaseUpdateResult = useCallback((v: { success: boolean; message: string } | null) => setDbField('databaseUpdateResult', v), [setDbField]);
  const setLoadingFeatures = useCallback((v: boolean) => setDbField('loadingFeatures', v), [setDbField]);
  const setUpdatingFeatures = useCallback((v: boolean) => setDbField('updatingFeatures', v), [setDbField]);

  // Feature flags data — kept standalone because callsites use updater fn
  type FeatureData = { globalDefaults?: any; overrides?: any; effective: any };
  const [featureData, setFeatureData] = useState<FeatureData>({
    effective: {
      ag_grid_enabled: false,
      power_search_enabled: false,
      custom_field_mapping_enabled: false,
      om_charts_enabled: true
    }
  });

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' });

  const isEdit = Boolean(id);
  const hasLoadedRef = React.useRef(false);

  // Open users tab if navigated with state
  useEffect(() => {
    if ((location.state as any)?.openUsers) {
      setActiveTab(1);
      if (id) loadChurchUsers(id);
    }
  }, [location.state, id]);

  const loadChurchUsers = async (churchId: string) => {
    try {
      setLoadingUsers(true);
      const response = await fetchWithChurchContext(`/api/admin/churches/${churchId}/users`, {
        churchId,
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setChurchUsers(data.users || []);
      } else {
        console.error('Error loading church users: HTTP', response.status);
      }
    } catch (err) {
      console.error('Error loading church users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadDatabaseInfo = async (churchId: string) => {
    try {
      setLoadingDatabase(true);
      const response = await fetchWithChurchContext(`/api/admin/churches/${churchId}/database-info`, {
        churchId,
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setDatabaseInfo(data.database || null);
      }
    } catch (err) {
      console.error('Error loading database info:', err);
    } finally {
      setLoadingDatabase(false);
    }
  };

  const loadFeatures = async (churchId: string) => {
    try {
      setLoadingFeatures(true);
      const data = await apiClient.get<any>(`/churches/${churchId}/features`);
      if (data.success && data.data) {
        setFeatureData({
          globalDefaults: data.data.globalDefaults,
          overrides: data.data.overrides,
          effective: data.data.effective
        });
      }
    } catch (err) {
      console.error('Error loading features:', err);
    } finally {
      setLoadingFeatures(false);
    }
  };

  const updateFeature = async (featureKey: string, value: boolean) => {
    if (!id) return;
    
    try {
      setUpdatingFeatures(true);
      
      // Optimistic update
      const previousFeatureData = { ...featureData };
      setFeatureData(prev => ({
        ...prev,
        effective: { ...prev.effective, [featureKey]: value }
      }));

      const data = await apiClient.put<any>(`/churches/${id}/features`, {
        features: { [featureKey]: value }
      });

      if (data.success && data.data) {
        setFeatureData({
          globalDefaults: data.data.globalDefaults,
          overrides: data.data.overrides,
          effective: data.data.effective
        });
        setSnackbar({ 
          open: true, 
          message: 'Feature override updated successfully', 
          severity: 'success' 
        });
      } else {
        // Revert on failure
        setFeatureData(previousFeatureData);
        setSnackbar({ 
          open: true, 
          message: data.error?.message || 'Failed to update feature', 
          severity: 'error' 
        });
      }
    } catch (err: any) {
      // Revert on error
      setFeatureData(previousFeatureData);
      setSnackbar({ 
        open: true, 
        message: `Error: ${err.message}`, 
        severity: 'error' 
      });
    } finally {
      setUpdatingFeatures(false);
    }
  };

  const testDatabaseConnection = async (churchId: string) => {
    try {
      setLoadingDatabase(true);
      const data = await apiClient.post<any>(`/admin/churches/${churchId}/test-connection`);
      if (data.success && data.data?.connection) {
        setSnackbar({ open: true, message: `Connection OK (${data.data.connection.connection_time_ms}ms)`, severity: 'success' });
        await loadDatabaseInfo(churchId);
      } else {
        setSnackbar({ open: true, message: `Connection failed: ${data.error || 'Unknown'}`, severity: 'error' });
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: `Connection error: ${err.message}`, severity: 'error' });
    } finally {
      setLoadingDatabase(false);
    }
  };

  const handleUserSave = async (userData: any) => {
    try {
      const endpoint = userDialogAction === 'add'
        ? `/api/admin/churches/${id}/users`
        : `/api/admin/churches/${id}/users/${selectedUser?.id}`;

      const method = userDialogAction === 'add' ? 'post' : 'put';
      const data = await apiClient[method]<any>(endpoint.replace('/api', ''), userData);
      setSnackbar({ open: true, message: `User ${userDialogAction === 'add' ? 'added' : 'updated'} successfully`, severity: 'success' });
      setUserDialogOpen(false);
      setSelectedUser(null);
      if (id) loadChurchUsers(id);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleUserAction = async (userId: number, action: string) => {
    try {
      await apiClient.post<any>(`/admin/churches/${id}/users/${userId}/${action}`);
      setSnackbar({ open: true, message: `User ${action} successful`, severity: 'success' });
      if (id) loadChurchUsers(id);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handlePasswordReset = async (userId: number, email: string) => {
    try {
      const data = await apiClient.post<any>(`/admin/churches/${id}/users/${userId}/reset-password`);
      setSnackbar({ open: true, message: `Password reset for ${email}. New: ${data.newPassword}`, severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleUpdateDatabase = async () => {
    if (!selectedTemplate || !id) return;
    try {
      setUpdatingDatabase(true);
      setDatabaseUpdateResult(null);
      const result = await apiClient.post<any>(`/admin/churches/${id}/update-database`, { template: selectedTemplate });
      setDatabaseUpdateResult({
        success: true,
        message: result.message || 'Database updated',
      });
    } catch (err: any) {
      setDatabaseUpdateResult({ success: false, message: err.message });
    } finally {
      setUpdatingDatabase(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state_province: '',
      postal_code: '',
      country: '',
      preferred_language: 'en',
      timezone: 'America/New_York',
      currency: 'USD',
      calendar_type: 'Revised Julian' as 'Julian' | 'Revised Julian',
      tax_id: '',
      website: '',
      description_multilang: '',
      settings: '',
      is_active: true,
      database_name: '',
      has_baptism_records: true,
      has_marriage_records: true,
      has_funeral_records: true,
      setup_complete: false,
      template_church_id: null as number | null,
      default_landing_page: 'church_records',
      church_id: null as number | null,
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);

        const churchData = {
          ...values,
          preferred_language: values.preferred_language as SupportedLanguage,
        };

        if (isEdit && id) {
          await adminAPI.churches.update(parseInt(id), churchData);
          setSuccess('Church updated successfully!');
          logger.info('Church Management', 'Church updated', { churchId: id, churchName: values.name });
        } else {
          await adminAPI.churches.create(churchData);
          setSuccess('Church created successfully!');
          logger.info('Church Management', 'Church created', { churchName: values.name });
        }

        setTimeout(() => navigate('/apps/church-management'), 2000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'An error occurred';
        setError(msg);
        logger.error('Church Management', `Church ${isEdit ? 'update' : 'creation'} failed`, { error: msg });
      } finally {
        setLoading(false);
      }
    },
  });

  // Load church data for editing
  useEffect(() => {
    if (!isEdit || !id || hasLoadedRef.current) return;

    hasLoadedRef.current = true;
    let isMounted = true;

    const loadChurch = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Loading church with ID:', id);
        const church = await adminAPI.churches.getById(parseInt(id));
        console.log('Church data loaded:', church);
        
        if (!isMounted) return;
        
        if (!church) {
          throw new Error('Church data not found');
        }

        formik.setValues({
          name: church?.name || '',
          email: church?.email || '',
          phone: church?.phone || '',
          address: church?.address || '',
          city: church?.city || '',
          state_province: church?.state_province || '',
          postal_code: church?.postal_code || '',
          country: church?.country || '',
          preferred_language: church?.preferred_language || 'en',
          timezone: church?.timezone || 'America/New_York',
          currency: church?.currency || 'USD',
          calendar_type: church?.calendar_type || 'Revised Julian',
          tax_id: church?.tax_id || '',
          website: church?.website || '',
          description_multilang: church?.description_multilang || '',
          settings: church?.settings || '',
          is_active: church?.is_active ?? true,
          database_name: church?.database_name || '',
          has_baptism_records: church?.has_baptism_records ?? true,
          has_marriage_records: church?.has_marriage_records ?? true,
          has_funeral_records: church?.has_funeral_records ?? true,
          setup_complete: church?.setup_complete ?? false,
          template_church_id: church?.template_church_id || null,
          default_landing_page: church?.default_landing_page || 'church_records',
          church_id: church?.id || church?.church_id || null,
        });

        // Load users and database info
        if (isMounted) {
          loadChurchUsers(id);
          loadDatabaseInfo(id);
        }
      } catch (err: any) {
        if (!isMounted) return;
        
        console.error('Error loading church:', err);
        
        // Extract meaningful error message
        let msg = 'Failed to load church';
        if (err?.response?.data?.message) {
          msg = err.response.data.message;
        } else if (err?.response?.data?.error) {
          msg = err.response.data.error;
        } else if (err?.message) {
          msg = err.message;
        }
        
        // Check if it's a 404 or permission error
        const status = err?.response?.status;
        if (status === 404) {
          msg = 'Church not found. It may have been deleted.';
        } else if (status === 403) {
          msg = 'Access denied. You do not have permission to edit this church.';
        }
        
        setError(msg);
        logger.error('Church Management', 'Failed to load church for editing', { 
          churchId: id, 
          error: msg,
          status 
        });
        
        // Only redirect on 404 or if explicitly not found
        if (status === 404 || msg.toLowerCase().includes('not found')) {
          setTimeout(() => navigate('/apps/church-management'), 3000);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadChurch();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Reset hasLoadedRef when navigating to a different church
  useEffect(() => {
    hasLoadedRef.current = false;
  }, [id]);

  if (!hasRole('admin') && !hasRole('super_admin') && !hasRole('supervisor')) {
    return (
      <PageContainer title="Church Management" description="Church management system">
        <Alert severity="error">Access denied. Administrator privileges required.</Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={isEdit ? 'Edit Church' : 'Add Church'}
      description={isEdit ? 'Edit church information' : 'Create a new church'}
    >
      <Breadcrumb
        title={isEdit ? 'Edit Church' : 'Add Church'}
        items={[
          { to: '/', title: 'Home' },
          { to: '/apps/church-management', title: 'Church Management' },
          { title: isEdit ? 'Edit Church' : 'Add Church' },
        ]}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {loading && isEdit ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Stack spacing={3} alignItems="center">
            <CircularProgress size={60} />
            <Typography variant="h6">Loading church data...</Typography>
          </Stack>
        </Box>
      ) : (
        <>
          {/* Tabs for Edit mode */}
          {isEdit && (
            <BlankCard sx={{ mb: 3 }}>
              <Tabs
                value={activeTab}
                onChange={(_, val) => {
                  setActiveTab(val);
                  if (val === 1 && id && churchUsers.length === 0) loadChurchUsers(id);
                  if (val === 2 && id) {
                    if (!databaseInfo) loadDatabaseInfo(id);
                    if (!loadingFeatures) loadFeatures(id);
                  }
                }}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab icon={<IconBuilding size={18} />} iconPosition="start" label="Church Info" />
                <Tab icon={<IconUsers size={18} />} iconPosition="start" label={`Users (${churchUsers.length})`} />
                <Tab icon={<IconDatabase size={18} />} iconPosition="start" label="Database" />
              </Tabs>
            </BlankCard>
          )}

          {/* Tab 0: Church Info Form */}
          {(activeTab === 0 || !isEdit) && (
            <ChurchInfoTab
              formik={formik}
              isEdit={isEdit}
              loading={loading}
              id={id}
              onNavigateBack={() => navigate('/apps/church-management')}
              onOpenFieldMapper={() => window.open(`/apps/church-management/${id}/field-mapper`, '_blank')}
            />
          )}

          {/* Tab 1: User Management */}
          {activeTab === 1 && isEdit && (
            <UsersTab
              churchId={id}
              churchUsers={churchUsers}
              loadingUsers={loadingUsers}
              loadChurchUsers={loadChurchUsers}
              handlePasswordReset={handlePasswordReset}
              handleUserAction={handleUserAction}
              onAddUser={() => { setUserDialogAction('add'); setSelectedUser(null); setUserDialogOpen(true); }}
              onEditUser={(u) => { setUserDialogAction('edit'); setSelectedUser(u); setUserDialogOpen(true); }}
            />
          )}

          {/* Tab 2: Database Management */}
          {activeTab === 2 && isEdit && (
            <DatabaseTab
              churchId={id}
              databaseName={formik.values.database_name}
              databaseInfo={databaseInfo}
              loadingDatabase={loadingDatabase}
              loadDatabaseInfo={loadDatabaseInfo}
              testDatabaseConnection={testDatabaseConnection}
              selectedTemplate={selectedTemplate}
              setSelectedTemplate={setSelectedTemplate}
              updatingDatabase={updatingDatabase}
              handleUpdateDatabase={handleUpdateDatabase}
              databaseUpdateResult={databaseUpdateResult}
              loadingFeatures={loadingFeatures}
              featureData={featureData}
              updatingFeatures={updatingFeatures}
              updateFeature={updateFeature}
              hasRole={hasRole}
            />
          )}
        </>
      )}

      {/* User Management Dialog */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {userDialogAction === 'add' ? 'Add New User' : 'Edit User'}
        </DialogTitle>
        <DialogContent>
          <UserManagementDialog
            user={selectedUser}
            action={userDialogAction}
            churchId={id || '0'}
            onSave={handleUserSave}
            onCancel={() => setUserDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default ChurchForm;
