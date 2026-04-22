/**
 * AccountNotificationsPage — Manage notification preferences per type/channel.
 * Uses GET/PUT /api/notifications/preferences (existing endpoints).
 *
 * Accessible to all authenticated users.
 * Preferences are user-scoped and persisted in user_notification_preferences table.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Snackbar,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EmailIcon from '@mui/icons-material/Email';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SecurityIcon from '@mui/icons-material/Security';
import DescriptionIcon from '@mui/icons-material/Description';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { SnackbarState, SNACKBAR_CLOSED, SNACKBAR_DURATION } from './accountConstants';
import { notificationsApi, extractErrorMessage } from './accountApi';
import { useLanguage } from '@/context/LanguageContext';

// ── Types ──────────────────────────────────────────────────────────────────

interface NotifPref {
  type_name: string;
  category: string;
  email_enabled: number | boolean;
  push_enabled: number | boolean;
  in_app_enabled: number | boolean;
  sms_enabled: number | boolean;
  frequency: string;
}

// ── Category & Type Metadata ───────────────────────────────────────────────

/** Translation keys for notification types. */
const TYPE_META: Record<string, { labelKey: string; descriptionKey: string }> = {
  // Security
  login_alert: { labelKey: 'account.notif_login_alerts', descriptionKey: 'account.notif_login_alerts_desc' },
  password_reset: { labelKey: 'account.notif_password_changes', descriptionKey: 'account.notif_password_changes_desc' },
  account_locked: { labelKey: 'account.notif_account_lock', descriptionKey: 'account.notif_account_lock_desc' },

  // User / Account
  welcome: { labelKey: 'account.notif_welcome', descriptionKey: 'account.notif_welcome_desc' },
  profile_updated: { labelKey: 'account.notif_profile_updates', descriptionKey: 'account.notif_profile_updates_desc' },
  church_invitation: { labelKey: 'account.notif_parish_invitations', descriptionKey: 'account.notif_parish_invitations_desc' },
  role_changed: { labelKey: 'account.notif_role_changes', descriptionKey: 'account.notif_role_changes_desc' },
  weekly_digest: { labelKey: 'account.notif_weekly_digest', descriptionKey: 'account.notif_weekly_digest_desc' },

  // Records & Certificates
  certificate_ready: { labelKey: 'account.notif_certificate_ready', descriptionKey: 'account.notif_certificate_ready_desc' },
  certificate_expiring: { labelKey: 'account.notif_certificate_expiring', descriptionKey: 'account.notif_certificate_expiring_desc' },
  reminder_baptism: { labelKey: 'account.notif_baptism_reminders', descriptionKey: 'account.notif_baptism_reminders_desc' },
  reminder_marriage: { labelKey: 'account.notif_marriage_reminders', descriptionKey: 'account.notif_marriage_reminders_desc' },
  reminder_funeral: { labelKey: 'account.notif_funeral_reminders', descriptionKey: 'account.notif_funeral_reminders_desc' },
  data_export_ready: { labelKey: 'account.notif_data_export', descriptionKey: 'account.notif_data_export_desc' },

  // System
  system_alert: { labelKey: 'account.notif_system_alerts', descriptionKey: 'account.notif_system_alerts_desc' },
  system_maintenance: { labelKey: 'account.notif_maintenance', descriptionKey: 'account.notif_maintenance_desc' },

  // Notes & Collaboration
  note_shared: { labelKey: 'account.notif_shared_notes', descriptionKey: 'account.notif_shared_notes_desc' },
  note_comment: { labelKey: 'account.notif_note_comments', descriptionKey: 'account.notif_note_comments_desc' },
};

/** Categories shown to regular users, in display order. */
const USER_CATEGORIES: { key: string; labelKey: string; icon: React.ReactNode; descriptionKey: string }[] = [
  {
    key: 'security',
    labelKey: 'account.cat_security',
    icon: <SecurityIcon fontSize="small" />,
    descriptionKey: 'account.cat_security_desc',
  },
  {
    key: 'user',
    labelKey: 'account.cat_account_activity',
    icon: <NotificationsIcon fontSize="small" />,
    descriptionKey: 'account.cat_account_activity_desc',
  },
  {
    key: 'certificates',
    labelKey: 'account.cat_certificates',
    icon: <DescriptionIcon fontSize="small" />,
    descriptionKey: 'account.cat_certificates_desc',
  },
  {
    key: 'reminders',
    labelKey: 'account.cat_reminders',
    icon: <EventNoteIcon fontSize="small" />,
    descriptionKey: 'account.cat_reminders_desc',
  },
  {
    key: 'system',
    labelKey: 'account.cat_system',
    icon: <NotificationsActiveIcon fontSize="small" />,
    descriptionKey: 'account.cat_system_desc',
  },
];

/** Categories only relevant to admins — hidden from regular users. */
const ADMIN_CATEGORIES = new Set(['admin', 'billing', 'backup']);

/** Notification types that should not be user-togglable (always on). */
const LOCKED_TYPES = new Set(['password_reset', 'account_locked']);

// ── Helpers ────────────────────────────────────────────────────────────────

function toBool(v: number | boolean): boolean {
  return v === 1 || v === true;
}

function getTypeLabel(typeName: string): string {
  return TYPE_META[typeName]?.labelKey || typeName;
}

function getTypeDescription(typeName: string): string {
  return TYPE_META[typeName]?.descriptionKey || '';
}

// ── Component ──────────────────────────────────────────────────────────────

const AccountNotificationsPage: React.FC = () => {
  const [prefs, setPrefs] = useState<NotifPref[]>([]);
  const [saved, setSaved] = useState<NotifPref[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(SNACKBAR_CLOSED);
  const { t } = useLanguage();

  // ── Load ──

  useEffect(() => {
    const load = async () => {
      try {
        const preferences = await notificationsApi.getPreferences();
        setPrefs(preferences as NotifPref[]);
        setSaved(preferences as NotifPref[]);
      } catch (err) {
        console.error('Failed to load notification preferences:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Grouped & filtered data ──

  const grouped = useMemo(() => {
    const map = new Map<string, NotifPref[]>();
    for (const p of prefs) {
      if (ADMIN_CATEGORIES.has(p.category)) continue;
      if (!TYPE_META[p.type_name]) continue; // Skip types with no user-facing metadata
      const list = map.get(p.category) || [];
      list.push(p);
      map.set(p.category, list);
    }
    return map;
  }, [prefs]);

  // ── Dirty detection ──

  const isDirty = useMemo(() => {
    if (prefs.length !== saved.length) return false;
    return prefs.some((p, i) => {
      const s = saved.find((sp) => sp.type_name === p.type_name);
      if (!s) return true;
      return (
        toBool(p.email_enabled) !== toBool(s.email_enabled) ||
        toBool(p.in_app_enabled) !== toBool(s.in_app_enabled)
      );
    });
  }, [prefs, saved]);

  // ── Handlers ──

  const handleToggle = useCallback(
    (typeName: string, channel: 'email_enabled' | 'in_app_enabled') => {
      if (LOCKED_TYPES.has(typeName)) return;
      setPrefs((prev) =>
        prev.map((p) =>
          p.type_name === typeName ? { ...p, [channel]: toBool(p[channel]) ? 0 : 1 } : p,
        ),
      );
    },
    [],
  );

  const handleCancel = useCallback(() => {
    setPrefs([...saved]);
  }, [saved]);

  const handleSave = useCallback(async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      // Only send changed preferences
      const changed = prefs.filter((p) => {
        const s = saved.find((sp) => sp.type_name === p.type_name);
        if (!s) return false;
        return (
          toBool(p.email_enabled) !== toBool(s.email_enabled) ||
          toBool(p.in_app_enabled) !== toBool(s.in_app_enabled)
        );
      });

      await notificationsApi.updatePreferences(
        changed.map((p) => ({
          type_name: p.type_name,
          email_enabled: toBool(p.email_enabled),
          push_enabled: toBool(p.in_app_enabled), // mirror in-app for push
          in_app_enabled: toBool(p.in_app_enabled),
          sms_enabled: false,
          frequency: p.frequency || 'immediate',
        })),
      );
      setSaved([...prefs]);
      setSnackbar({ open: true, message: t('account.preferences_saved'), severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || t('account.preferences_save_failed'), severity: 'error' });
    } finally {
      setSaving(false);
    }
  }, [prefs, saved, isDirty, saving]);

  // ── Loading ──

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  // ── Render ──

  return (
    <>
      {/* Header */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <NotificationsActiveIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              {t('account.notification_preferences_title')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {t('account.notification_preferences_desc')}
          </Typography>
        </CardContent>
      </Card>

      {/* Category Sections */}
      {USER_CATEGORIES.map((cat) => {
        const items = grouped.get(cat.key);
        if (!items || items.length === 0) return null;

        return (
          <Card key={cat.key} variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                {cat.icon}
                <Typography variant="subtitle1" fontWeight={600}>
                  {t(cat.labelKey)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {t(cat.descriptionKey)}
              </Typography>
              <Divider sx={{ mb: 1 }} />

              {/* Column Headers */}
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                px={1}
                py={0.5}
              >
                <Typography variant="caption" color="text.disabled" sx={{ flex: 1 }}>
                  {t('account.col_notification')}
                </Typography>
                <Box display="flex" gap={4} sx={{ minWidth: 160, justifyContent: 'center' }}>
                  <Tooltip title={t('account.tooltip_receive_email')}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <EmailIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.disabled">
                        {t('account.col_email')}
                      </Typography>
                    </Box>
                  </Tooltip>
                  <Tooltip title={t('account.tooltip_receive_inapp')}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <NotificationsIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.disabled">
                        {t('account.col_in_app')}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>
              </Box>

              {/* Preference Rows */}
              {items.map((p) => {
                const isLocked = LOCKED_TYPES.has(p.type_name);
                return (
                  <Box
                    key={p.type_name}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    py={1}
                    px={1}
                    sx={{
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0, pr: 2 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {t(getTypeLabel(p.type_name))}
                      </Typography>
                      {getTypeDescription(p.type_name) && (
                        <Typography variant="caption" color="text.secondary">
                          {t(getTypeDescription(p.type_name))}
                        </Typography>
                      )}
                    </Box>
                    <Box display="flex" gap={4} sx={{ minWidth: 160, justifyContent: 'center' }}>
                      <Tooltip title={isLocked ? t('account.tooltip_locked') : ''}>
                        <span>
                          <Switch
                            size="small"
                            checked={toBool(p.email_enabled)}
                            onChange={() => handleToggle(p.type_name, 'email_enabled')}
                            disabled={isLocked}
                          />
                        </span>
                      </Tooltip>
                      <Tooltip title={isLocked ? t('account.tooltip_locked') : ''}>
                        <span>
                          <Switch
                            size="small"
                            checked={toBool(p.in_app_enabled)}
                            onChange={() => handleToggle(p.type_name, 'in_app_enabled')}
                            disabled={isLocked}
                          />
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Actions */}
      <Box display="flex" justifyContent="flex-end" gap={1.5} mt={1} mb={3}>
        <Button variant="outlined" disabled={!isDirty || saving} onClick={handleCancel}>
          {t('common.cancel')}
        </Button>
        <Button variant="contained" disabled={!isDirty || saving} onClick={handleSave}>
          {saving ? t('common.saving') : t('account.save_preferences')}
        </Button>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={SNACKBAR_DURATION}
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

export default AccountNotificationsPage;
