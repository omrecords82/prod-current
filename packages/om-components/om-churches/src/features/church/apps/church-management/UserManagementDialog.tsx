import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  Switch,
  FormControlLabel,
  DialogActions,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';

interface User {
  id?: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  phone?: string;
  landing_page?: string;
  church_id?: number | null;
  email_intake_authorized?: boolean;
}

interface UserManagementDialogProps {
  user: User | null;
  action: 'add' | 'edit';
  churchId: string;
  onSave: (userData: any) => void;
  onCancel: () => void;
}

const baseValidation = Yup.object({
  email: Yup.string().email('Invalid email address').required('Email is required'),
  first_name: Yup.string().required('First name is required').min(2, 'Must be at least 2 characters'),
  last_name: Yup.string().required('Last name is required').min(2, 'Must be at least 2 characters'),
  role: Yup.string().required('Role is required'),
  phone: Yup.string().matches(/^[+]?[\d\s()-]*$/, 'Invalid phone number format').nullable(),
});

const roleOptions = [
  { value: 'church_admin', label: 'Church Administrator', description: 'Full access to all church functions and settings' },
  { value: 'priest', label: 'Priest', description: 'Full clergy privileges and record lifecycle authority' },
  { value: 'deacon', label: 'Deacon', description: 'Partial clergy privileges, can assist with records' },
  { value: 'editor', label: 'Editor', description: 'Can add and edit records, no admin access' },
  { value: 'viewer', label: 'Viewer', description: 'View-only access to records and reports' },
  { value: 'manager', label: 'Manager', description: 'Manage church operations and users' },
  { value: 'admin', label: 'System Admin', description: 'System-level admin privileges' },
  { value: 'user', label: 'Basic User', description: 'Standard user with limited access' },
];

const landingPageOptions = [
  { value: '/dashboards/modern', label: 'Dashboard' },
  { value: '/records', label: 'Records Management' },
  { value: '/apps/liturgical-calendar', label: 'Orthodox Liturgical Calendar' },
  { value: '/apps/notes', label: 'Notes App' },
  { value: '/apps/church-management', label: 'Church Management' },
];

const UserManagementDialog: React.FC<UserManagementDialogProps> = ({
  user,
  action,
  churchId,
  onSave,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: user?.email || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      role: user?.role || 'user',
      is_active: user?.is_active !== false,
      phone: user?.phone || '',
      landing_page: user?.landing_page || '/dashboards/modern',
      password: '',
      church_id: user?.church_id ?? (churchId ? parseInt(churchId) : null),
      email_intake_authorized: user?.email_intake_authorized || false,
    },
    validationSchema: action === 'add'
      ? baseValidation.shape({
          password: Yup.string().min(8, 'Password must be at least 8 characters').required('Password is required for new users'),
        })
      : baseValidation,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const userData = { ...values, church_id: values.church_id ?? parseInt(churchId) };
        if (action === 'edit' && !values.password) {
          delete (userData as any).password;
        }
        onSave(userData);
      } catch (error) {
        console.error('Error saving user:', error);
      } finally {
        setLoading(false);
      }
    },
  });

  useEffect(() => {
    if (user) {
      formik.setValues({
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role || 'user',
        is_active: user.is_active !== false,
        phone: user.phone || '',
        landing_page: user.landing_page || '/dashboards/modern',
        password: '',
        church_id: user.church_id ?? (churchId ? parseInt(churchId) : null),
        email_intake_authorized: user.email_intake_authorized || false,
      });
    }
  }, [user]);

  const selectedRole = roleOptions.find(r => r.value === formik.values.role);

  return (
    <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            {action === 'add' ? 'Add New User' : 'Edit User Information'}
          </Typography>
          {action === 'add' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              A new user will be created and assigned to this church (ID: {churchId}). An email invitation will be sent.
            </Alert>
          )}
        </Grid>

        {/* Personal Information */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="First Name"
            name="first_name"
            value={formik.values.first_name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.first_name && Boolean(formik.errors.first_name)}
            helperText={formik.touched.first_name && formik.errors.first_name}
            disabled={loading}
            required
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Last Name"
            name="last_name"
            value={formik.values.last_name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.last_name && Boolean(formik.errors.last_name)}
            helperText={formik.touched.last_name && formik.errors.last_name}
            disabled={loading}
            required
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email Address"
            name="email"
            type="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
            disabled={loading}
            required
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Phone (Optional)"
            name="phone"
            value={formik.values.phone}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.phone && Boolean(formik.errors.phone)}
            helperText={formik.touched.phone && formik.errors.phone}
            disabled={loading}
          />
        </Grid>

        {/* Password */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label={action === 'add' ? 'Password' : 'New Password (leave blank to keep current)'}
            name="password"
            type="password"
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={
              (formik.touched.password && formik.errors.password) ||
              (action === 'edit' ? 'Only enter a password if you want to change it' : 'Minimum 8 characters')
            }
            disabled={loading}
            required={action === 'add'}
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 1, mb: 2 }}>
            Role & Permissions
          </Typography>
        </Grid>

        {/* Role */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              name="role"
              value={formik.values.role}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.role && Boolean(formik.errors.role)}
              disabled={loading}
              label="Role"
            >
              {roleOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Stack>
                    <Typography variant="body2" fontWeight={600}>{option.label}</Typography>
                    <Typography variant="caption" color="textSecondary">{option.description}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedRole && (
            <Box sx={{ mt: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={selectedRole.label} size="small" color="primary" variant="outlined" />
                <Typography variant="caption" color="textSecondary">{selectedRole.description}</Typography>
              </Stack>
            </Box>
          )}
        </Grid>

        {/* Landing Page */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Default Landing Page</InputLabel>
            <Select
              name="landing_page"
              value={formik.values.landing_page}
              onChange={formik.handleChange}
              disabled={loading}
              label="Default Landing Page"
            >
              {landingPageOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Church ID */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Church ID"
            name="church_id"
            type="number"
            value={formik.values.church_id ?? ''}
            onChange={(e) => formik.setFieldValue('church_id', e.target.value ? parseInt(e.target.value) : null)}
            disabled={loading}
            helperText="The church this user is assigned to"
            InputProps={{ readOnly: true }}
          />
        </Grid>

        {/* Account Status */}
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                name="is_active"
                checked={formik.values.is_active}
                onChange={(e) => formik.setFieldValue('is_active', e.target.checked)}
                disabled={loading}
              />
            }
            label="Account Active"
          />
          <Typography variant="caption" color="text.secondary" display="block">
            Inactive users cannot log in to the system
          </Typography>
        </Grid>

        {/* Email Intake Authorization */}
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                name="email_intake_authorized"
                checked={formik.values.email_intake_authorized}
                onChange={(e) => formik.setFieldValue('email_intake_authorized', e.target.checked)}
                disabled={loading}
              />
            }
            label="Email Intake Authorized"
          />
          <Typography variant="caption" color="text.secondary" display="block">
            Allow this user to submit records or queries via email to records@orthodoxmetrics.com
          </Typography>
        </Grid>
      </Grid>

      <DialogActions sx={{ mt: 3, px: 0 }}>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading || !formik.isValid || !formik.dirty}
        >
          {loading ? 'Saving...' : action === 'add' ? 'Add User' : 'Update User'}
        </Button>
      </DialogActions>
    </Box>
  );
};

export default UserManagementDialog;
