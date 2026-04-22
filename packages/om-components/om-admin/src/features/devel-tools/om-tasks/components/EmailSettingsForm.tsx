/**
 * EmailSettingsForm.tsx
 * SMTP Email Configuration Form for Admin Settings
 * Allows admins to configure custom email providers
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Paper
} from '@mui/material';
import {
  Save as SaveIcon,
  Send as TestIcon,
  Email as EmailIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';

// Types
interface EmailConfig {
  id?: number;
  provider: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass?: string; // Only used when updating password
  sender_name: string;
  sender_email: string;
  updated_at?: string;
}

interface EmailTestResponse {
  success: boolean;
  message: string;
  data?: {
    test_email: string;
    message_id: string;
    provider: string;
    smtp_host: string;
  };
  error?: string;
}

const EmailSettingsForm: React.FC = () => {
  const { hasRole, isSuperAdmin } = useAuth();
  const [config, setConfig] = useState<EmailConfig>({
    provider: 'Custom',
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: '',
    smtp_pass: '',
    sender_name: 'OMAI Task System',
    sender_email: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  // Check if user has permission
  const canManage = isSuperAdmin() || hasRole('admin');

  // Provider presets
  const providerPresets = {
    'GoDaddy': {
      smtp_host: 'smtpout.secureserver.net',
      smtp_port: 465,
      smtp_secure: true
    },
    'Outlook365': {
      smtp_host: 'smtp-mail.outlook.com',
      smtp_port: 587,
      smtp_secure: false
    },
    'Gmail': {
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_secure: false
    },
    'Yahoo': {
      smtp_host: 'smtp.mail.yahoo.com',
      smtp_port: 587,
      smtp_secure: false
    },
    'Custom': {
      smtp_host: '',
      smtp_port: 587,
      smtp_secure: false
    }
  };

  useEffect(() => {
    if (canManage) {
      fetchEmailConfig();
    }
  }, [canManage]);

  const fetchEmailConfig = async () => {
    try {
      setError(null);
      const data = await apiClient.get<any>('/settings/email');
      if (data.success && data.data) {
        setConfig(prev => ({ ...prev, ...data.data })); // Keep existing password if not provided
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load email configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (provider: string) => {
    const preset = providerPresets[provider as keyof typeof providerPresets];
    if (preset) {
      setConfig(prev => ({
        ...prev,
        provider,
        ...preset
      }));
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      // Validate required fields (password is optional - only required for new configs)
      if (!config.smtp_host || !config.smtp_user || !config.sender_email) {
        throw new Error('Please fill in all required fields');
      }
      
      // If this is a new configuration (no ID), password is required
      if (!config.id && !config.smtp_pass) {
        throw new Error('Password is required for new email configurations');
      }

      // Prepare request body - omit smtp_pass if it's empty/whitespace (for UPDATE operations)
      const requestBody: any = { ...config };
      // Only send password if it's provided (non-empty)
      // If password is empty/whitespace and we have an existing config, omit it to preserve existing password
      if ((!requestBody.smtp_pass || requestBody.smtp_pass.trim() === '') && config.id) {
        delete requestBody.smtp_pass;
      }

      const data = await apiClient.post<any>('/settings/email', requestBody);

      if (data.success) {
        setSuccess('Email configuration saved successfully!');
        setConfig(prev => ({ ...prev, ...data.data })); // Keep password field
      } else {
        throw new Error(data.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save email configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setError('Please enter a test email address');
      return;
    }

    setError(null);
    setSuccess(null);
    setTesting(true);

    try {
      const data: EmailTestResponse = await apiClient.post<any>('/settings/email/test', { test_email: testEmail });

      if (data.success) {
        setSuccess(`Test email sent successfully to ${testEmail}!`);
        setTestDialogOpen(false);
        setTestEmail('');
      } else {
        throw new Error(data.error || 'Email test failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  if (!canManage) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        You don't have permission to manage email settings.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading email configuration...
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          {/* Header */}
          <Box display="flex" alignItems="center" mb={3}>
            <EmailIcon sx={{ mr: 2, color: '#8c249d' }} />
            <Box>
              <Typography variant="h5">Email Configuration</Typography>
              <Typography variant="body2" color="text.secondary">
                Configure SMTP settings for OMAI task assignment emails
              </Typography>
            </Box>
          </Box>

          {/* Status Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {/* Form */}
          <Grid container spacing={3}>
            {/* Provider Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Email Provider</InputLabel>
                <Select
                  value={config.provider}
                  label="Email Provider"
                  onChange={(e) => handleProviderChange(e.target.value)}
                >
                  {Object.keys(providerPresets).map((provider) => (
                    <MenuItem key={provider} value={provider}>
                      {provider}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* SMTP Host */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SMTP Host"
                value={config.smtp_host}
                onChange={(e) => setConfig(prev => ({ ...prev, smtp_host: e.target.value }))}
                placeholder="smtp.example.com"
                required
              />
            </Grid>

            {/* SMTP Port and Security */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SMTP Port"
                type="number"
                value={config.smtp_port}
                onChange={(e) => setConfig(prev => ({ ...prev, smtp_port: parseInt(e.target.value) || 587 }))}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.smtp_secure}
                    onChange={(e) => setConfig(prev => ({ ...prev, smtp_secure: e.target.checked }))}
                  />
                }
                label={config.smtp_secure ? 'SSL (Port 465)' : 'STARTTLS (Port 587)'}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Authentication
              </Typography>
            </Grid>

            {/* SMTP Credentials */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SMTP Username"
                value={config.smtp_user}
                onChange={(e) => setConfig(prev => ({ ...prev, smtp_user: e.target.value }))}
                placeholder="your-email@example.com"
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="SMTP Password"
                type="password"
                value={config.smtp_pass}
                onChange={(e) => setConfig(prev => ({ ...prev, smtp_pass: e.target.value }))}
                placeholder="Leave blank to keep existing password"
                helperText="Only required when changing password. Leave blank to keep current encrypted password."
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Sender Information
              </Typography>
            </Grid>

            {/* Sender Info */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Sender Name"
                value={config.sender_name}
                onChange={(e) => setConfig(prev => ({ ...prev, sender_name: e.target.value }))}
                placeholder="OMAI Task System"
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Sender Email"
                type="email"
                value={config.sender_email}
                onChange={(e) => setConfig(prev => ({ ...prev, sender_email: e.target.value }))}
                placeholder="noreply@yourdomain.com"
                required
              />
            </Grid>
          </Grid>

          {/* Preview */}
          {config.sender_name && config.sender_email && (
            <Paper sx={{ p: 2, mt: 3, bgcolor: '#f9f9f9' }}>
              <Typography variant="subtitle2" gutterBottom>
                Email Preview:
              </Typography>
              <Typography variant="body2">
                <strong>From:</strong> "{config.sender_name}" &lt;{config.sender_email}&gt;
              </Typography>
              <Typography variant="body2">
                <strong>Server:</strong> {config.smtp_host}:{config.smtp_port} ({config.smtp_secure ? 'SSL' : 'STARTTLS'})
              </Typography>
            </Paper>
          )}

          {/* Action Buttons */}
          <Box display="flex" gap={2} mt={3}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              sx={{ bgcolor: '#8c249d' }}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>

            <Button
              variant="outlined"
              onClick={() => setTestDialogOpen(true)}
              disabled={!config.smtp_host || !config.smtp_user}
              startIcon={<TestIcon />}
            >
              Test Email
            </Button>
          </Box>

          {/* Help Text */}
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Provider Setup Tips:</strong>
              <br />
              • <strong>GoDaddy:</strong> Use your cPanel email or workspace email with an app password
              • <strong>Outlook 365:</strong> <strong>REQUIRES App Password!</strong> Get from Microsoft Account Security → Advanced security options → App passwords
              • <strong>Gmail:</strong> Use an app password instead of your regular password (enable 2FA first)
              • <strong>Custom:</strong> Contact your email provider for SMTP settings
              <br /><br />
              <strong>⚠️ Microsoft Outlook Email via GoDaddy:</strong>
              <br />
              If you purchased email from GoDaddy but it's Microsoft 365/Outlook, use the <strong>Outlook365</strong> provider (NOT GoDaddy).
              You MUST generate an app password from <a href="https://account.microsoft.com/security" target="_blank" rel="noopener noreferrer" style={{ color: '#8c249d', textDecoration: 'underline' }}>Microsoft Account Security</a>.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Test Email Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Test Email Configuration</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Send a test email to verify your SMTP configuration is working correctly.
          </Typography>
          <TextField
            fullWidth
            label="Test Email Address"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleTestEmail}
            variant="contained"
            disabled={testing || !testEmail}
            startIcon={testing ? <CircularProgress size={20} /> : <TestIcon />}
            sx={{ bgcolor: '#8c249d' }}
          >
            {testing ? 'Sending...' : 'Send Test Email'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EmailSettingsForm;

