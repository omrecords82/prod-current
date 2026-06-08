// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import CustomCheckbox from '@/components/forms/theme-elements/CustomCheckbox';
import CustomFormLabel from '@/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '@/components/forms/theme-elements/CustomTextField';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { loginType } from '@/types/auth/auth';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControlLabel,
    FormGroup,
    Stack,
    Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const AuthLogin = ({ subtitle, subtext }: loginType) => {
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
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));

    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (error) clearError();
  };

  const handleRememberMeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, rememberMe: event.target.checked }));
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.username.trim()) errors.username = t('auth.error_username_required');
    if (!formData.password) errors.password = t('auth.error_password_required');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      const result = await login(
        formData.username,
        formData.password,
        formData.rememberMe,
      );
      if (result && typeof result === 'object' && 'pendingRedirect' in result && (result as { pendingRedirect?: boolean }).pendingRedirect) {
        return;
      }
      if (result && typeof result === 'object' && 'redirectUrl' in result && result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        try {
          const { apiClient } = await import('@/api/utils/axiosInstance');
          const me = await apiClient.get<{
            onboarding?: {
              must_change_password?: boolean;
              table_configuration_completed?: boolean;
              layout_configuration_completed?: boolean;
            };
          }>('/api/onboarding/me');
          if (me.onboarding?.must_change_password) {
            navigate('/onboarding/change-password', { replace: true });
            return;
          }
          if (me.onboarding && !me.onboarding.table_configuration_completed) {
            navigate('/onboarding/record-tables', { replace: true });
            return;
          }
          if (me.onboarding && !me.onboarding.layout_configuration_completed) {
            navigate('/onboarding/record-layouts', { replace: true });
            return;
          }
        } catch {
          /* not an onboarding user */
        }
        const userData = JSON.parse(localStorage.getItem('auth_user') || '{}');
        const role = userData?.role;
        if (role === 'super_admin' || role === 'admin') {
          navigate('/task-wheel', { replace: true });
        } else {
          navigate('/portal', { replace: true });
        }
      }
    } catch (err: unknown) {
      console.error('Login failed:', err);
    }
  };

  return (
    <>
      {subtext}

      {error && (
        <Alert severity="error" icon={<ErrorOutlineIcon />} sx={{ mt: 2, mb: 2 }}>
          <Box>
            <Typography variant="body1" component="div" sx={{ mb: 1 }}>
              {error}
            </Typography>
            {error.includes('connecting to the server') && (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                {t('auth.error_still_trouble')}{' '}
                <Typography component="a" href="/support" sx={{ color: 'primary.main', textDecoration: 'underline', cursor: 'pointer' }}>
                  {t('auth.error_contact_support')}
                </Typography>
                {' '}{t('auth.error_or_refresh')}
              </Typography>
            )}
            {(error.includes('Incorrect email or password') || error.includes('credentials')) && (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                {t('auth.error_forgot_password')}{' '}
                <Typography component={Link} to="/auth/forgot-password" sx={{ color: 'primary.main', textDecoration: 'underline' }}>
                  {t('auth.error_reset_here')}
                </Typography>
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
              autoComplete="username"
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
              autoComplete="current-password"
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
            <Typography component={Link} to="/auth/forgot-password" fontWeight="500" sx={{ textDecoration: 'none', color: 'primary.main' }}>
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
