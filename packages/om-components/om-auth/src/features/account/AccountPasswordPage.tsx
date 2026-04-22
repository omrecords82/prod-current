/**
 * AccountPasswordPage — Password & Authentication security page.
 *
 * Sections:
 * 1. Security Overview — account age, last login, password age, session count
 * 2. Change Password — current/new/confirm with strength guidance
 * 3. Two-Factor Authentication — truthful status (not yet implemented)
 * 4. Security Tips — actionable recommendations based on real state
 *
 * Uses:
 *   PUT  /api/user/profile/password       — change password + revoke other sessions
 *   GET  /api/user/profile/security-status — security metadata
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { useLanguage } from '@/context/LanguageContext';
import LockIcon from '@mui/icons-material/Lock';
import ShieldIcon from '@mui/icons-material/Shield';
import SecurityIcon from '@mui/icons-material/Security';
import DevicesIcon from '@mui/icons-material/Devices';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ScheduleIcon from '@mui/icons-material/Schedule';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import SendIcon from '@mui/icons-material/Send';

// ── Types ──────────────────────────────────────────────────────────────────

interface SecurityStatus {
  account_created_at: string | null;
  last_login: string | null;
  password_changed_at: string | null;
  email_verified: boolean;
  verification_status: 'none' | 'pending' | 'verified';
  verification_sent_at: string | null;
  active_sessions: number;
  two_factor_enabled: boolean;
}

// SnackbarState imported from accountConstants — uses SNACKBAR_DURATION_LONG for security actions
import { SnackbarState, SNACKBAR_CLOSED, SNACKBAR_DURATION_LONG } from './accountConstants';
import { profileApi, extractErrorMessage } from './accountApi';

// ── Password Strength ──────────────────────────────────────────────────────

interface StrengthResult {
  score: number; // 0–4
  labelKey: string;
  color: 'error' | 'warning' | 'info' | 'success';
  checks: { labelKey: string; met: boolean }[];
}

function evaluateStrength(pw: string): StrengthResult {
  const checks = [
    { labelKey: 'account.check_8_characters', met: pw.length >= 8 },
    { labelKey: 'account.check_uppercase', met: /[A-Z]/.test(pw) },
    { labelKey: 'account.check_lowercase', met: /[a-z]/.test(pw) },
    { labelKey: 'account.check_number', met: /\d/.test(pw) },
    { labelKey: 'account.check_special', met: /[^A-Za-z0-9]/.test(pw) },
  ];
  const score = checks.filter((c) => c.met).length;
  if (score <= 1) return { score: 0, labelKey: 'account.strength_very_weak', color: 'error', checks };
  if (score === 2) return { score: 1, labelKey: 'account.strength_weak', color: 'error', checks };
  if (score === 3) return { score: 2, labelKey: 'account.strength_fair', color: 'warning', checks };
  if (score === 4) return { score: 3, labelKey: 'account.strength_good', color: 'info', checks };
  return { score: 4, labelKey: 'account.strength_strong', color: 'success', checks };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

function formatAbsoluteDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Component ──────────────────────────────────────────────────────────────

// ── Shared action button styles ──────────────────────────────────────────
const useActionStyles = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const accent = isDark ? '#d4af37' : '#2d1b4e';
  const accentHover = isDark ? '#c29d2f' : '#1f1236';
  const accentBorder = isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(45, 27, 78, 0.2)';
  const accentBorderHover = isDark ? 'rgba(212, 175, 55, 0.5)' : 'rgba(45, 27, 78, 0.4)';
  const accentBgHover = isDark ? 'rgba(212, 175, 55, 0.08)' : 'rgba(45, 27, 78, 0.04)';
  const onAccent = isDark ? '#1a1a2e' : '#fff';

  return { isDark, accent, accentHover, accentBorder, accentBorderHover, accentBgHover, onAccent };
};

const AccountPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { accent, accentHover, accentBorder, accentBorderHover, accentBgHover, onAccent } = useActionStyles();

  // Password form
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(SNACKBAR_CLOSED);

  // Security status
  const [security, setSecurity] = useState<SecurityStatus | null>(null);
  const [loadingSecurity, setLoadingSecurity] = useState(true);
  const [sendingVerification, setSendingVerification] = useState(false);

  // ── Load security status ──

  const loadSecurityStatus = useCallback(async () => {
    try {
      const data = await profileApi.getSecurityStatus();
      if (data.success && data.security) {
        setSecurity(data.security);
      }
    } catch {
      // Non-critical — page still works without status
    } finally {
      setLoadingSecurity(false);
    }
  }, []);

  useEffect(() => {
    loadSecurityStatus();
  }, [loadSecurityStatus]);

  // ── Resend verification email ──

  const handleResendVerification = useCallback(async () => {
    setSendingVerification(true);
    try {
      const data = await profileApi.resendVerification();
      setSnackbar({ open: true, message: data.message || 'Verification email sent.', severity: 'success' });
      loadSecurityStatus(); // Refresh to pick up verification_sent_at
    } catch (err: any) {
      if (err.status === 429) {
        setSnackbar({ open: true, message: err.message || t('account.verification_wait'), severity: 'info' });
      } else {
        setSnackbar({ open: true, message: err.message || t('account.verification_failed'), severity: 'error' });
      }
    } finally {
      setSendingVerification(false);
    }
  }, [loadSecurityStatus]);

  // ── Password strength ──

  const strength = useMemo(() => evaluateStrength(form.newPassword), [form.newPassword]);

  // ── Validation ──

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (form.newPassword && form.newPassword.length < 8) {
      errors.newPassword = t('account.error_min_8');
    }
    if (form.confirmPassword && form.newPassword !== form.confirmPassword) {
      errors.confirmPassword = t('account.error_passwords_no_match');
    }
    if (form.newPassword && form.currentPassword && form.newPassword === form.currentPassword) {
      errors.newPassword = t('account.error_same_password');
    }
    return errors;
  }, [form]);

  const canSubmit = useMemo(
    () =>
      form.currentPassword.length > 0 &&
      form.newPassword.length >= 8 &&
      form.confirmPassword.length > 0 &&
      form.newPassword === form.confirmPassword &&
      form.newPassword !== form.currentPassword &&
      !saving,
    [form, saving],
  );

  // ── Handlers ──

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const toggleShow = (field: keyof typeof showPw) => {
    setShowPw((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const data = await profileApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      const revokedMsg =
        data.sessions_revoked > 0
          ? ` ${data.sessions_revoked} other session${data.sessions_revoked > 1 ? 's' : ''} signed out for security.`
          : '';
      setSnackbar({ open: true, message: `${t('account.password_changed_success')}${revokedMsg}`, severity: 'success' });
      // Refresh security status to reflect new password_changed_at
      loadSecurityStatus();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || t('account.password_change_failed'), severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ── Security recommendations ──

  const recommendations = useMemo(() => {
    if (!security) return [];
    const items: { text: string; severity: 'warning' | 'info' }[] = [];
    if (!security.password_changed_at) {
      items.push({ text: t('account.never_changed_password'), severity: 'warning' });
    } else {
      const daysSince = Math.floor((Date.now() - new Date(security.password_changed_at).getTime()) / 86400000);
      if (daysSince > 180) {
        items.push({ text: t('account.password_old_warning').replace('{days}', String(daysSince)), severity: 'warning' });
      }
    }
    if (security.active_sessions > 3) {
      items.push({
        text: t('account.sessions_review_warning').replace('{count}', String(security.active_sessions)),
        severity: 'info',
      });
    }
    if (!security.email_verified) {
      items.push({ text: t('account.email_not_verified_rec'), severity: 'warning' });
    }
    if (!security.two_factor_enabled) {
      items.push({ text: t('account.twofactor_not_available_rec'), severity: 'info' });
    }
    return items;
  }, [security]);

  // ── Password field helper ──

  const pwField = (
    label: string,
    field: 'current' | 'new' | 'confirm',
    formKey: keyof typeof form,
    helperText?: string,
  ) => (
    <TextField
      label={label}
      type={showPw[field] ? 'text' : 'password'}
      value={form[formKey]}
      onChange={handleChange(formKey)}
      error={!!validationErrors[formKey]}
      helperText={validationErrors[formKey] || helperText || ''}
      fullWidth
      autoComplete={field === 'current' ? 'current-password' : 'new-password'}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={() => toggleShow(field)} edge="end" size="small" tabIndex={-1}>
              {showPw[field] ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );

  // ── Render ──

  return (
    <>
      {/* ── Security Overview ── */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <SecurityIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              {t('account.security_overview')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t('account.security_overview_desc')}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {loadingSecurity ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={24} />
            </Box>
          ) : security ? (
            <Box
              display="grid"
              gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}
              gap={2}
            >
              <StatusItem
                icon={<ScheduleIcon sx={{ fontSize: 20 }} />}
                label={t('account.account_created')}
                value={formatRelativeDate(security.account_created_at)}
                tooltip={formatAbsoluteDate(security.account_created_at)}
              />
              <StatusItem
                icon={<LockIcon sx={{ fontSize: 20 }} />}
                label={t('account.password_last_changed')}
                value={security.password_changed_at ? formatRelativeDate(security.password_changed_at) : t('account.never')}
                tooltip={security.password_changed_at ? formatAbsoluteDate(security.password_changed_at) : t('account.password_not_changed_tooltip')}
                warn={!security.password_changed_at}
              />
              <StatusItem
                icon={<DevicesIcon sx={{ fontSize: 20 }} />}
                label={t('account.label_active_sessions')}
                value={String(security.active_sessions)}
                action={
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate('/account/sessions')}
                    sx={{
                      '&&': {
                        color: `${accent} !important`,
                        borderColor: `${accentBorder} !important`,
                      },
                      ml: 1,
                      minWidth: 'auto',
                      textTransform: 'none',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      px: 1.5,
                      py: 0.25,
                      borderRadius: '4px',
                      letterSpacing: '0.02em',
                      '&:hover': {
                        borderColor: `${accentBorderHover} !important`,
                        bgcolor: accentBgHover,
                      },
                    }}
                  >
                    {t('account.label_view')}
                  </Button>
                }
              />
              <StatusItem
                icon={<MarkEmailReadIcon sx={{ fontSize: 20 }} />}
                label={t('account.email_verification_label')}
                value={security.email_verified ? t('account.verified') : t('account.not_verified')}
                chipColor={security.email_verified ? 'success' : 'warning'}
                action={
                  !security.email_verified ? (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleResendVerification}
                      disabled={sendingVerification}
                      startIcon={sendingVerification ? <CircularProgress size={10} /> : <SendIcon sx={{ fontSize: 12 }} />}
                      sx={{
                        '&&': {
                          color: `${accent} !important`,
                          borderColor: `${accentBorder} !important`,
                        },
                        ml: 1,
                        minWidth: 'auto',
                        textTransform: 'none',
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        px: 1.5,
                        py: 0.25,
                        borderRadius: '4px',
                        letterSpacing: '0.02em',
                        '&:hover': {
                          borderColor: `${accentBorderHover} !important`,
                          bgcolor: accentBgHover,
                        },
                      }}
                    >
                      {sendingVerification ? t('account.sending') : t('account.verify')}
                    </Button>
                  ) : undefined
                }
              />
              <StatusItem
                icon={<ShieldIcon sx={{ fontSize: 20 }} />}
                label={t('account.twofactor_auth')}
                value={security.two_factor_enabled ? t('account.enabled') : t('account.not_available')}
                chipColor={security.two_factor_enabled ? 'success' : 'default'}
              />
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('account.unable_to_load_security')}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* ── Email Verification ── */}
      {security && !security.email_verified && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <MarkEmailReadIcon color="primary" />
              <Typography variant="h5" fontWeight={600}>
                {t('account.email_verification')}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {t('account.email_verification_desc')}
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: 'warning.light',
                border: '1px solid',
                borderColor: 'warning.main',
              }}
            >
              <WarningAmberIcon sx={{ color: 'warning.dark', mt: 0.25 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600} color="warning.dark" mb={0.5}>
                  {t('account.email_not_verified')}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1.5}>
                  {t('account.email_not_verified_warning')}
                </Typography>
                {security.verification_sent_at && (
                  <Typography variant="caption" color="text.disabled" display="block" mb={1}>
                    Last sent {formatAbsoluteDate(security.verification_sent_at)}.
                    {t('account.check_inbox')}
                  </Typography>
                )}
                <Button
                  variant="contained"
                  size="small"
                  startIcon={sendingVerification ? <CircularProgress size={14} color="inherit" /> : <SendIcon sx={{ fontSize: 16 }} />}
                  onClick={handleResendVerification}
                  disabled={sendingVerification}
                  sx={{
                    '&&': {
                      bgcolor: `${accent} !important`,
                      color: `${onAccent} !important`,
                    },
                    borderRadius: '4px',
                    px: 2.5,
                    py: 0.75,
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    '&:hover': {
                      bgcolor: `${accentHover} !important`,
                    },
                  }}
                >
                  {sendingVerification ? t('account.sending') : t('account.send_verification_email')}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── Change Password ── */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <LockIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              {t('account.change_password')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={0.5}>
            {t('account.choose_strong_password')}
          </Typography>
          <Typography variant="caption" color="text.disabled" mb={3} component="div">
            {t('account.password_signout_warning')}
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Stack spacing={2.5} sx={{ maxWidth: 480 }}>
            {pwField(t('account.label_current_password'), 'current', 'currentPassword')}
            {pwField(t('account.label_new_password'), 'new', 'newPassword', t('account.minimum_8_characters'))}

            {/* Strength indicator */}
            {form.newPassword.length > 0 && (
              <Box>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    {t('account.password_strength')}
                  </Typography>
                  <Typography variant="caption" color={`${strength.color}.main`} fontWeight={600}>
                    {t(strength.labelKey)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(strength.score / 4) * 100}
                  color={strength.color}
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <Stack spacing={0.25} mt={1}>
                  {strength.checks.map((c) => (
                    <Typography
                      key={c.label}
                      variant="caption"
                      color={c.met ? 'success.main' : 'text.disabled'}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                      {c.met ? <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> : <InfoOutlinedIcon sx={{ fontSize: 14 }} />}
                      {t(c.labelKey)}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}

            {pwField(t('account.label_confirm_new_password'), 'confirm', 'confirmPassword')}

            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!canSubmit}
              sx={{
                '&&': {
                  bgcolor: `${accent} !important`,
                  color: `${onAccent} !important`,
                },
                alignSelf: 'flex-start',
                borderRadius: '4px',
                px: 3,
                py: 0.875,
                fontSize: '0.8125rem',
                fontWeight: 600,
                letterSpacing: '0.01em',
                '&:hover': {
                  bgcolor: `${accentHover} !important`,
                },
              }}
            >
              {saving ? <CircularProgress size={20} color="inherit" /> : t('account.change_password')}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ── Two-Factor Authentication ── */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <ShieldIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              {t('account.twofactor_authentication')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {t('account.twofactor_desc')}
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          >
            <ShieldIcon sx={{ color: 'text.disabled', mt: 0.25 }} />
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Typography variant="body2" fontWeight={600}>
                  {t('account.status')}
                </Typography>
                <Chip
                  label={t('account.not_available_chip')}
                  size="small"
                  variant="outlined"
                  color="default"
                  sx={{ borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.02em' }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t('account.twofactor_not_implemented')}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ── Security Recommendations ── */}
      {recommendations.length > 0 && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <InfoOutlinedIcon color="primary" />
              <Typography variant="h5" fontWeight={600}>
                {t('account.security_recommendations')}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t('account.security_recommendations_desc')}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={1.5}>
              {recommendations.map((rec, i) => (
                <Box
                  key={i}
                  display="flex"
                  alignItems="flex-start"
                  gap={1.5}
                  sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}
                >
                  {rec.severity === 'warning' ? (
                    <WarningAmberIcon sx={{ fontSize: 20, color: 'warning.main', mt: 0.25 }} />
                  ) : (
                    <InfoOutlinedIcon sx={{ fontSize: 20, color: 'info.main', mt: 0.25 }} />
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {rec.text}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={SNACKBAR_DURATION_LONG}
        onClose={() => setSnackbar(SNACKBAR_CLOSED)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(SNACKBAR_CLOSED)}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

// ── StatusItem sub-component ───────────────────────────────────────────────

interface StatusItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tooltip?: string;
  warn?: boolean;
  chipColor?: 'default' | 'success' | 'warning' | 'error';
  action?: React.ReactNode;
}

const StatusItem: React.FC<StatusItemProps> = ({ icon, label, value, tooltip, warn, chipColor, action }) => {
  const content = (
    <Box
      display="flex"
      alignItems="center"
      gap={1.5}
      sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}
    >
      <Box sx={{ color: warn ? 'warning.main' : 'text.secondary' }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.disabled">
          {label}
        </Typography>
        <Box display="flex" alignItems="center">
          {chipColor ? (
            <Chip label={value} size="small" variant="outlined" color={chipColor} sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 500, borderRadius: '4px', letterSpacing: '0.02em' }} />
          ) : (
            <Typography variant="body2" fontWeight={500} color={warn ? 'warning.main' : 'text.primary'}>
              {value}
            </Typography>
          )}
          {action}
        </Box>
      </Box>
    </Box>
  );

  return tooltip ? <Tooltip title={tooltip} placement="top">{content}</Tooltip> : content;
};

export default AccountPasswordPage;
