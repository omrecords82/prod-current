// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Button,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { loginType } from '@/types/auth/auth';
import CustomCheckbox from '@/components/forms/theme-elements/CustomCheckbox';
import CustomTextField from '@/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from '@/components/forms/theme-elements/CustomFormLabel';
import { useLanguage } from '@/context/LanguageContext';

const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuth();
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }

    // Clear global error
    if (error) {
      clearError();
    }
  };

  const handleRememberMeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      rememberMe: event.target.checked,
    }));
  };


  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.username.trim()) {
      errors.username = t('auth.error_username_required');
    }

    if (!formData.password) {
      errors.password = t('auth.error_password_required');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }


    try {
      const result = await login(formData.username, formData.password, formData.rememberMe);
      // Use redirectUrl from login response if available, otherwise route based on role
      if (result && typeof result === 'object' && 'redirectUrl' in result && result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        // Navigate directly to the correct layout based on role
        // This avoids a flash of FullLayout when SmartRedirect runs at '/'
        const userData = JSON.parse(localStorage.getItem('auth_user') || '{}');
        const role = userData?.role;
        if (role === 'super_admin' || role === 'admin') {
          navigate('/admin/control-panel', { replace: true });
        } else {
          navigate('/portal', { replace: true });
        }
      }
    } catch (err) {
      // Error is handled by the auth context
      console.error('Login failed:', err);
    }
  };

  return (
    <>
      {subtext}

      {error && (
        <Alert
          severity="error"
          icon={<ErrorOutlineIcon />}
          sx={{ mt: 2, mb: 2 }}
        >
          <Box>
            <Typography variant="body1" component="div" sx={{ mb: 1 }}>
              {error}
            </Typography>
            {error.includes("connecting to the server") && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: '0.875rem' }}
              >
                {t('auth.error_still_trouble')}{' '}
                <Typography
                  component="a"
                  href="/support"
                  sx={{
                    color: 'primary.main',
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  {t('auth.error_contact_support')}
                </Typography>
                {' '}{t('auth.error_or_refresh')}
              </Typography>
            )}
            {(error.includes("Incorrect email or password") || error.includes("credentials")) && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: '0.875rem' }}
              >
                {t('auth.error_forgot_password')}{' '}
                <Typography
                  component={Link}
                  to="/auth/forgot-password"
                  sx={{
                    color: 'primary.main',
                    textDecoration: 'underline'
                  }}
                >
                  {t('auth.error_reset_here')}
                </Typography>
              </Typography>
            )}
            {error.includes("temporarily unavailable") && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: '0.875rem' }}
              >
                {t('auth.error_check_status_prefix')}{' '}
                <Typography
                  component="a"
                  href="/status"
                  sx={{
                    color: 'primary.main',
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  {t('auth.error_status_page')}
                </Typography>
                {' '}{t('auth.error_check_status_suffix')}
              </Typography>
            )}
          </Box>
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <Box>
            <CustomFormLabel htmlFor="username">{t('auth.label_email')}</CustomFormLabel>
            <CustomTextField
              id="username"
              variant="outlined"
              fullWidth
              value={formData.username}
              onChange={handleInputChange('username')}
              error={!!formErrors.username}
              helperText={formErrors.username}
              disabled={loading}
            />
          </Box>
          <Box>
            <CustomFormLabel htmlFor="password">{t('auth.label_password')}</CustomFormLabel>
            <CustomTextField
              id="password"
              type="password"
              variant="outlined"
              fullWidth
              value={formData.password}
              onChange={handleInputChange('password')}
              error={!!formErrors.password}
              helperText={formErrors.password}
              disabled={loading}
            />
          </Box>
          <Stack justifyContent="space-between" direction="row" alignItems="center" my={2}>
            <FormGroup>
              <FormControlLabel
                control={
                  <CustomCheckbox
                    checked={formData.rememberMe}
                    onChange={handleRememberMeChange}
                    disabled={loading}
                  />
                }
                label={t('auth.remember_device')}
              />
            </FormGroup>
            <Typography
              component={Link}
              to="/auth/forgot-password"
              fontWeight="500"
              sx={{
                textDecoration: 'none',
                color: 'primary.main',
              }}
            >
              {t('auth.forgot_password')}
            </Typography>
          </Stack>
        </Stack>
        <Box mt={3}>
          <Button
            color="primary"
            variant="contained"
            size="large"
            fullWidth
            type="submit"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? t('auth.btn_signing_in') : t('auth.btn_sign_in')}
          </Button>
        </Box>
      </Box>
      {subtitle}
    </>
  );
};

export default AuthLogin;
