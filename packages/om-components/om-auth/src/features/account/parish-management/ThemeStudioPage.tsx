/**
 * ThemeStudioPage — Liturgical theme selector with color palettes and preview.
 * Persists via /api/parish-settings/:churchId/theme using useParishSettingsWithLocal.
 */

import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Switch,
  Typography,
  useTheme,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useParishSettingsWithLocal } from './useParishSettings';

interface LiturgicalTheme {
  id: string;
  name: string;
  description: string;
  colors: { primary: string; secondary: string; accent: string; background: string };
}

interface ThemeSettings {
  selectedTheme: string;
  globalTheme: boolean;
}

const DEFAULTS: ThemeSettings = {
  selectedTheme: 'traditional',
  globalTheme: false,
};

const themes: LiturgicalTheme[] = [
  {
    id: 'traditional',
    name: 'Orthodox Traditional',
    description: 'Classic gold and deep red tones inspired by Byzantine iconography',
    colors: { primary: '#B8860B', secondary: '#8B0000', accent: '#DAA520', background: '#FFFEF7' },
  },
  {
    id: 'pascha',
    name: 'Pascha',
    description: 'Bright and joyful colors celebrating the Resurrection',
    colors: { primary: '#DC143C', secondary: '#FFD700', accent: '#FFFFFF', background: '#FFF5F5' },
  },
  {
    id: 'nativity',
    name: 'Nativity',
    description: 'Deep winter tones with warm gold accents',
    colors: { primary: '#1B4D3E', secondary: '#8B4513', accent: '#FFD700', background: '#F0F8F5' },
  },
  {
    id: 'palm-sunday',
    name: 'Palm Sunday',
    description: 'Fresh green tones celebrating Christ\'s entry into Jerusalem',
    colors: { primary: '#228B22', secondary: '#8FBC8F', accent: '#F4E4C1', background: '#F5FFF5' },
  },
];

const ThemeStudioPage: React.FC = () => {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  const {
    data: serverData,
    loading,
    saving,
    error,
    dirty,
    updateLocal,
    save,
  } = useParishSettingsWithLocal<ThemeSettings>('theme');

  const settings: ThemeSettings = { ...DEFAULTS, ...(serverData ?? {}) };

  const setField = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    updateLocal((prev) => ({ ...DEFAULTS, ...(prev ?? {}), [key]: value }));
  };

  const activeTheme = themes.find((t) => t.id === settings.selectedTheme) ?? themes[0];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontFamily: "'Inter'", fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
            Theme Studio
          </Typography>
          <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
            Choose from liturgical themes or create custom color palettes
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
        <>
          {/* Global Theme Toggle */}
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 2,
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
              bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.25 }}>
                Apply as Global Theme
              </Typography>
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
                Use this theme across all parishes in your organization
              </Typography>
            </Box>
            <Switch checked={settings.globalTheme} onChange={(e) => setField('globalTheme', e.target.checked)} />
          </Paper>

          {/* Theme Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
            {themes.map((t) => {
              const isSelected = settings.selectedTheme === t.id;
              return (
                <Paper
                  key={t.id}
                  variant="outlined"
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${t.name} theme${isSelected ? ' (selected)' : ''}`}
                  onClick={() => setField('selectedTheme', t.id)}
                  onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setField('selectedTheme', t.id); } }}
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected
                      ? isDark ? '#d4af37' : '#2d1b4e'
                      : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.08)',
                    },
                  }}
                >
                  {/* Color Preview Bar */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', height: 80 }}>
                    <Box sx={{ bgcolor: t.colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isSelected && <CheckIcon sx={{ fontSize: 28, color: '#fff', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))' }} />}
                    </Box>
                    <Box sx={{ bgcolor: t.colors.secondary }} />
                    <Box sx={{ bgcolor: t.colors.accent }} />
                    <Box sx={{ bgcolor: t.colors.background, border: '1px solid rgba(0,0,0,0.05)' }} />
                  </Box>

                  {/* Theme Info */}
                  <Box sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ fontFamily: "'Inter'", fontSize: '1rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827' }}>
                        {t.name}
                      </Typography>
                      {isSelected && (
                        <Typography
                          sx={{
                            fontFamily: "'Inter'",
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            px: 1.5,
                            py: 0.25,
                            borderRadius: 5,
                            bgcolor: isDark ? 'rgba(212,175,55,0.15)' : 'rgba(45,27,78,0.08)',
                            color: isDark ? '#d4af37' : '#2d1b4e',
                          }}
                        >
                          Active
                        </Typography>
                      )}
                    </Box>
                    <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#6b7280', mb: 2 }}>
                      {t.description}
                    </Typography>

                    {/* Color Swatches */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5 }}>
                      {Object.entries(t.colors).map(([name, color]) => (
                        <Box key={name}>
                          <Box sx={{ width: '100%', height: 36, borderRadius: 1, bgcolor: color, border: '1px solid rgba(0,0,0,0.08)', mb: 0.5 }} />
                          <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.5625rem', color: isDark ? '#6b7280' : '#9ca3af', textTransform: 'capitalize' }}>
                            {name}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Box>

          {/* Typography Preview */}
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 2,
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
              bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
            }}
          >
            <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 2 }}>
              Typography & Preview
            </Typography>
            <Box sx={{ p: 4, borderRadius: 1.5, bgcolor: activeTheme.colors.background }}>
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '1.75rem', fontWeight: 600, color: activeTheme.colors.primary, mb: 1 }}>
                Sample Heading
              </Typography>
              <Typography sx={{ fontFamily: "'Inter'", fontSize: '1rem', color: activeTheme.colors.secondary, mb: 2 }}>
                This is how your content will look with the selected theme.
              </Typography>
              <Box
                component="button"
                sx={{
                  px: 3,
                  py: 1.25,
                  borderRadius: 1.5,
                  fontFamily: "'Inter'",
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#fff',
                  bgcolor: activeTheme.colors.primary,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Sample Button
              </Box>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default ThemeStudioPage;
