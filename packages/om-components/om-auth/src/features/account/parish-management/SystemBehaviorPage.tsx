/**
 * SystemBehaviorPage — Security, notifications, backup/export, data retention settings.
 * Persists via /api/parish-settings/:churchId/system using useParishSettingsWithLocal.
 */

import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Select,
  Switch,
  Typography,
  useTheme,
} from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import CloudDownloadOutlinedIcon from '@mui/icons-material/CloudDownloadOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useParishSettingsWithLocal } from './useParishSettings';

interface SystemSettings {
  requireAuth: boolean;
  twoFactor: boolean;
  emailNewRecords: boolean;
  dailySummary: boolean;
  maintenanceAlerts: boolean;
  autoBackups: boolean;
  softDelete: boolean;
  sessionTimeout: string;
  exportFormat: string;
  archiveOldRecords: string;
}

const DEFAULTS: SystemSettings = {
  requireAuth: true,
  twoFactor: false,
  emailNewRecords: true,
  dailySummary: false,
  maintenanceAlerts: true,
  autoBackups: true,
  softDelete: true,
  sessionTimeout: '30',
  exportFormat: 'csv',
  archiveOldRecords: 'never',
};

interface SettingSection {
  title: string;
  icon: React.ElementType;
  items: SectionItem[];
}

type SectionItem =
  | { type: 'toggle'; label: string; description?: string; key: keyof SystemSettings }
  | { type: 'select'; label: string; key: keyof SystemSettings; options: { value: string; label: string }[] };

const SystemBehaviorPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const {
    data: serverData,
    loading,
    saving,
    error,
    dirty,
    updateLocal,
    save,
  } = useParishSettingsWithLocal<SystemSettings>('system');

  const settings: SystemSettings = { ...DEFAULTS, ...(serverData ?? {}) };

  const setField = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    updateLocal((prev) => ({ ...DEFAULTS, ...(prev ?? {}), [key]: value }));
  };

  const sections: SettingSection[] = [
    {
      title: 'Security Settings',
      icon: ShieldOutlinedIcon,
      items: [
        { type: 'toggle', label: 'Require Authentication', description: 'Users must log in to view records', key: 'requireAuth' },
        { type: 'toggle', label: 'Two-Factor Authentication', description: 'Require 2FA for admin users', key: 'twoFactor' },
        {
          type: 'select',
          label: 'Session Timeout',
          key: 'sessionTimeout',
          options: [
            { value: '15', label: '15 minutes' },
            { value: '30', label: '30 minutes' },
            { value: '60', label: '1 hour' },
            { value: '120', label: '2 hours' },
          ],
        },
      ],
    },
    {
      title: 'Notifications',
      icon: NotificationsOutlinedIcon,
      items: [
        { type: 'toggle', label: 'Email notifications for new records', key: 'emailNewRecords' },
        { type: 'toggle', label: 'Daily activity summary', key: 'dailySummary' },
        { type: 'toggle', label: 'System maintenance alerts', key: 'maintenanceAlerts' },
      ],
    },
    {
      title: 'Backup & Export',
      icon: CloudDownloadOutlinedIcon,
      items: [
        { type: 'toggle', label: 'Automatic Backups', description: 'Daily automated database backups', key: 'autoBackups' },
        {
          type: 'select',
          label: 'Export Format',
          key: 'exportFormat',
          options: [
            { value: 'csv', label: 'CSV' },
            { value: 'xlsx', label: 'Excel (XLSX)' },
            { value: 'pdf', label: 'PDF' },
            { value: 'json', label: 'JSON' },
          ],
        },
      ],
    },
    {
      title: 'Data Retention',
      icon: InventoryOutlinedIcon,
      items: [
        {
          type: 'select',
          label: 'Archive Old Records',
          key: 'archiveOldRecords',
          options: [
            { value: 'never', label: 'Never' },
            { value: '1year', label: 'After 1 year' },
            { value: '5years', label: 'After 5 years' },
            { value: '10years', label: 'After 10 years' },
          ],
        },
        { type: 'toggle', label: 'Soft Delete', description: 'Mark records as deleted instead of removing', key: 'softDelete' },
      ],
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontFamily: "'Inter'", fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
            System Behavior
          </Typography>
          <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
            Configure advanced system settings and security options
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
          disabled={saving || !dirty || loading}
          onClick={() => { void save(); }}
          sx={{
            textTransform: 'none',
            fontFamily: "'Inter'",
            fontSize: '0.8125rem',
            bgcolor: '#2d1b4e',
            '&:hover': { bgcolor: '#3d2b5e' },
          }}
        >
          {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 720 }}>
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Paper
                key={section.title}
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
                  bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: isDark ? 'rgba(45,27,78,0.3)' : 'rgba(45,27,78,0.08)' }}>
                    <Icon sx={{ fontSize: 18, color: isDark ? '#d4af37' : '#2d1b4e' }} />
                  </Box>
                  <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827' }}>
                    {section.title}
                  </Typography>
                </Box>

                {section.items.map((item, i) => (
                  <Box
                    key={item.key}
                    sx={{
                      py: 1.5,
                      borderBottom: i < section.items.length - 1
                        ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`
                        : 'none',
                    }}
                  >
                    {item.type === 'toggle' ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', fontWeight: 500, color: isDark ? '#f3f4f6' : '#111827' }}>
                            {item.label}
                          </Typography>
                          {item.description && (
                            <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.6875rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
                              {item.description}
                            </Typography>
                          )}
                        </Box>
                        <Switch
                          size="small"
                          checked={Boolean(settings[item.key])}
                          onChange={(e) => setField(item.key, e.target.checked as SystemSettings[typeof item.key])}
                        />
                      </Box>
                    ) : (
                      <Box>
                        <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', fontWeight: 500, color: isDark ? '#f3f4f6' : '#111827', mb: 1 }}>
                          {item.label}
                        </Typography>
                        <Select
                          size="small"
                          fullWidth
                          value={String(settings[item.key] ?? '')}
                          onChange={(e) => setField(item.key, e.target.value as SystemSettings[typeof item.key])}
                          sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem' }}
                        >
                          {item.options.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </Box>
                    )}
                  </Box>
                ))}
              </Paper>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default SystemBehaviorPage;
