// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import CustomCheckbox from '@/components/forms/theme-elements/CustomCheckbox';
import CustomFormLabel from '@/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from '@/components/forms/theme-elements/CustomTextField';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { loginType } from '@/types/auth/auth';
import AuthService from '@/shared/lib/authService';
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
    otp: '',
    rememberMe: false,
  });
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
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
    if (setupUrl) setSetupUrl(null);
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
      setSetupUrl(null);
      const result = await login(
        formData.username,
        formData.password,
        formData.rememberMe,
        formData.otp.trim() || undefined,
      );
      if (result && typeof result === 'object' && 'pendingRedirect' in result && (result as { pendingRedirect?: boolean }).pendingRedirect) {
        return;
      }
      if (result && typeof result === 'object' && 'redirectUrl' in result && result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        const userData = JSON.parse(localStorage.getItem('auth_user') || '{}');
        const role = userData?.role;
        if (role === 'super_admin' || role === 'admin') {
          navigate('/task-wheel', { replace: true });
        } else {
          navigate('/portal', { replace: true });
        }
      }
    } catch (err: unknown) {
      const e = err as { setupUrl?: string };
      if (e.setupUrl) setSetupUrl(e.setupUrl);
      console.error('Login failed:', err);
    }
  };

  const enrollHref = setupUrl || AuthService.mfaSetupUrl('/portal');

  return (
    <>
      {subtext}

      {error && (
        <Alert severity="error" icon={<ErrorOutlineIcon />} sx={{ mt: 2, mb: 2 }}>
          <Box>
            <Typography variant="body1" component="div" sx={{ mb: 1 }}>
              {error}
            </Typography>
            {(error.includes('authenticator') || setupUrl) && (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                <Typography component="a" href={enrollHref} sx={{ color: 'primary.main', textDecoration: 'underline' }}>
                  {t('auth.setup_authenticator')}
                </Typography>
              </Typography>
            )}
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
          <Box>
            <CustomFormLabel htmlFor="otp">{t('auth.label_otp')}</CustomFormLabel>
            <CustomTextField
              id="otp"
              variant="outlined"
              fullWidth
              value={formData.otp}
              onChange={handleInputChange('otp')}
              disabled={loading}
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6, autoComplete: 'one-time-code' }}
              placeholder={t('auth.otp_placeholder')}
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
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          <Typography component="a" href={AuthService.mfaSetupUrl('/portal')} sx={{ color: 'primary.main', textDecoration: 'underline' }}>
            {t('auth.setup_authenticator')}
          </Typography>
        </Typography>
      </Box>
      {subtitle}
    </>
  );
};

export default AuthLogin;
