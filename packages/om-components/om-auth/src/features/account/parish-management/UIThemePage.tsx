/**
 * UIThemePage — Accent color picker, default view, display toggles, custom CSS.
 * Persists via /api/parish-settings/:churchId/ui using useParishSettingsWithLocal.
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
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useParishSettingsWithLocal } from './useParishSettings';

interface UISettings {
  accent: string;
  defaultView: string;
  showAnalytics: boolean;
  enableAdvancedGrid: boolean;
  customCss: string;
}

const DEFAULTS: UISettings = {
  accent: '#9333EA',
  defaultView: 'table',
  showAnalytics: true,
  enableAdvancedGrid: false,
  customCss: '',
};

const accentColors = [
  { name: 'Purple', value: '#9333EA' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Green', value: '#16A34A' },
  { name: 'Red', value: '#DC2626' },
  { name: 'Gold', value: '#D97706' },
];

const UIThemePage: React.FC = () => {
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
  } = useParishSettingsWithLocal<UISettings>('ui');

  const settings: UISettings = { ...DEFAULTS, ...(serverData ?? {}) };

  const setField = <K extends keyof UISettings>(key: K, value: UISettings[K]) => {
    updateLocal((prev) => ({ ...DEFAULTS, ...(prev ?? {}), [key]: value }));
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontFamily: "'Inter'", fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
            UI Theme
          </Typography>
          <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
            Configure user interface behavior and visual preferences
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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
          {/* Configuration */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Accent Color */}
            <Paper
              variant="outlined"
              sx={{ p: 2.5, borderRadius: 2, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}
            >
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
                Accent Color
              </Typography>
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#6b7280', mb: 2 }}>
                Choose the primary accent color for buttons, links, and interactive elements
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1.5 }}>
                {accentColors.map((c) => (
                  <Box
                    key={c.value}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select ${c.name} accent color`}
                    onClick={() => setField('accent', c.value)}
                    onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setField('accent', c.value); } }}
                    sx={{ cursor: 'pointer', textAlign: 'center' }}
                  >
                    <Box
                      sx={{
                        width: '100%',
                        height: 56,
                        borderRadius: 1.5,
                        bgcolor: c.value,
                        border: settings.accent === c.value ? `2px solid ${c.value}` : '2px solid transparent',
                        boxShadow: settings.accent === c.value ? `0 0 0 3px ${c.value}33` : 'none',
                        transition: 'all 0.15s ease',
                        '&:hover': { transform: 'scale(1.05)' },
                      }}
                    />
                    <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.6875rem', color: isDark ? '#9ca3af' : '#6b7280', mt: 0.75 }}>
                      {c.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>

            {/* Default View */}
            <Paper
              variant="outlined"
              sx={{ p: 2.5, borderRadius: 2, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}
            >
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
                Default View
              </Typography>
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#6b7280', mb: 2 }}>
                Choose how records are displayed by default
              </Typography>
              <Select
                size="small"
                fullWidth
                value={settings.defaultView}
                onChange={(e) => setField('defaultView', e.target.value)}
                sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem' }}
              >
                <MenuItem value="table">Table View</MenuItem>
                <MenuItem value="cards">Card View</MenuItem>
                <MenuItem value="list">List View</MenuItem>
              </Select>
            </Paper>

            {/* Toggle Options */}
            <Paper
              variant="outlined"
              sx={{ p: 2.5, borderRadius: 2, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}
            >
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 2 }}>
                Display Options
              </Typography>
              {[
                { label: 'Show Analytics in Header', desc: 'Display record counts and statistics in the page header', key: 'showAnalytics' as const },
                { label: 'Enable Advanced Grid', desc: 'Use advanced data grid with filtering and inline editing', key: 'enableAdvancedGrid' as const },
              ].map((opt, i) => (
                <Box
                  key={opt.label}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: 1.5,
                    borderBottom: i === 0 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` : 'none',
                  }}
                >
                  <Box>
                    <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', fontWeight: 500, color: isDark ? '#f3f4f6' : '#111827' }}>
                      {opt.label}
                    </Typography>
                    <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.6875rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
                      {opt.desc}
                    </Typography>
                  </Box>
                  <Switch size="small" checked={settings[opt.key]} onChange={(e) => setField(opt.key, e.target.checked)} />
                </Box>
              ))}
            </Paper>

            {/* Custom CSS */}
            <Paper
              variant="outlined"
              sx={{ p: 2.5, borderRadius: 2, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}
            >
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
                Advanced Customization
              </Typography>
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#6b7280', mb: 2 }}>
                Add custom CSS to further customize the appearance
              </Typography>
              <textarea
                aria-label="Custom CSS"
                placeholder="/* Enter custom CSS here */"
                value={settings.customCss}
                onChange={(e) => setField('customCss', e.target.value)}
                style={{
                  width: '100%',
                  height: 100,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db'}`,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                  color: isDark ? '#f3f4f6' : '#111827',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.75rem',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </Paper>
          </Box>

          {/* Preview Panel */}
          <Box sx={{ position: { lg: 'sticky' }, top: { lg: 16 }, height: 'fit-content', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Button Preview */}
            <Paper
              variant="outlined"
              sx={{ p: 2.5, borderRadius: 2, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}
            >
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 2 }}>
                Button Preview
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box
                  component="button"
                  sx={{
                    width: '100%',
                    px: 2,
                    py: 1.25,
                    borderRadius: 1.5,
                    fontFamily: "'Inter'",
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: '#fff',
                    bgcolor: settings.accent,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                  }}
                >
                  <SearchOutlinedIcon sx={{ fontSize: 16 }} /> Search Records
                </Box>
                <Box
                  component="button"
                  sx={{
                    width: '100%',
                    px: 2,
                    py: 1.25,
                    borderRadius: 1.5,
                    fontFamily: "'Inter'",
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: settings.accent,
                    bgcolor: 'transparent',
                    border: `2px solid ${settings.accent}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                  }}
                >
                  <AddOutlinedIcon sx={{ fontSize: 16 }} /> Add Record
                </Box>
              </Box>
            </Paper>

            {/* Link Preview */}
            <Paper
              variant="outlined"
              sx={{ p: 2.5, borderRadius: 2, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }}
            >
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 1.5 }}>
                Link Preview
              </Typography>
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
                This is a sample paragraph with{' '}
                <span style={{ color: settings.accent, fontWeight: 500, cursor: 'pointer' }}>
                  a clickable link
                </span>{' '}
                using your accent color.
              </Typography>
            </Paper>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default UIThemePage;
