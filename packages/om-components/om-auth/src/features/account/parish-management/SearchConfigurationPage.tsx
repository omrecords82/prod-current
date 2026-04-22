/**
 * SearchConfigurationPage — Search performance, filters, and results display settings.
 * Persists via /api/parish-settings/:churchId/search using useParishSettingsWithLocal.
 */

import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Slider,
  Switch,
  Typography,
  useTheme,
} from '@mui/material';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useParishSettingsWithLocal } from './useParishSettings';

interface SearchSettings {
  fastSearch: boolean;
  fuzzyMatching: boolean;
  dateRangeFilter: boolean;
  recordTypeFilter: boolean;
  parishFilter: boolean;
  highlightMatches: boolean;
  minSearchLength: number;
  resultsPerPage: number;
}

const DEFAULTS: SearchSettings = {
  fastSearch: true,
  fuzzyMatching: true,
  dateRangeFilter: true,
  recordTypeFilter: true,
  parishFilter: false,
  highlightMatches: true,
  minSearchLength: 3,
  resultsPerPage: 25,
};

interface SettingGroup {
  title: string;
  icon: React.ElementType;
  settings: SettingItem[];
}

interface SettingItem {
  type: 'toggle' | 'slider';
  label: string;
  description?: string;
  key: keyof SearchSettings;
}

const SearchConfigurationPage: React.FC = () => {
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
  } = useParishSettingsWithLocal<SearchSettings>('search');

  const settings: SearchSettings = { ...DEFAULTS, ...(serverData ?? {}) };

  const setField = <K extends keyof SearchSettings>(key: K, value: SearchSettings[K]) => {
    updateLocal((prev) => ({ ...DEFAULTS, ...(prev ?? {}), [key]: value }));
  };

  const groups: SettingGroup[] = [
    {
      title: 'Search Performance',
      icon: BoltOutlinedIcon,
      settings: [
        { type: 'toggle', label: 'Enable Fast Search', description: 'Use indexed search for faster results', key: 'fastSearch' },
        { type: 'toggle', label: 'Fuzzy Matching', description: 'Find results even with typos or misspellings', key: 'fuzzyMatching' },
        { type: 'slider', label: 'Minimum Search Length', key: 'minSearchLength' },
      ],
    },
    {
      title: 'Available Filters',
      icon: FilterListOutlinedIcon,
      settings: [
        { type: 'toggle', label: 'Date Range Filter', key: 'dateRangeFilter' },
        { type: 'toggle', label: 'Record Type Filter', key: 'recordTypeFilter' },
        { type: 'toggle', label: 'Parish Filter', key: 'parishFilter' },
      ],
    },
    {
      title: 'Results Display',
      icon: SearchOutlinedIcon,
      settings: [
        { type: 'slider', label: 'Results Per Page', key: 'resultsPerPage' },
        { type: 'toggle', label: 'Highlight Matches', description: 'Show matching text in search results', key: 'highlightMatches' },
      ],
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontFamily: "'Inter'", fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
            Search Configuration
          </Typography>
          <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
            Configure global search behavior and performance settings
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
          {groups.map((group) => {
            const Icon = group.icon;
            return (
              <Paper
                key={group.title}
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
                    {group.title}
                  </Typography>
                </Box>

                {group.settings.map((setting, i) => (
                  <Box
                    key={setting.key}
                    sx={{
                      py: 1.5,
                      borderBottom: i < group.settings.length - 1
                        ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`
                        : 'none',
                    }}
                  >
                    {setting.type === 'toggle' ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', fontWeight: 500, color: isDark ? '#f3f4f6' : '#111827' }}>
                            {setting.label}
                          </Typography>
                          {setting.description && (
                            <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.6875rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
                              {setting.description}
                            </Typography>
                          )}
                        </Box>
                        <Switch
                          size="small"
                          checked={Boolean(settings[setting.key])}
                          onChange={(e) => setField(setting.key, e.target.checked as SearchSettings[typeof setting.key])}
                        />
                      </Box>
                    ) : (
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', fontWeight: 500, color: isDark ? '#f3f4f6' : '#111827' }}>
                            {setting.label}
                          </Typography>
                          <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
                            {setting.key === 'minSearchLength'
                              ? `${settings[setting.key]} characters`
                              : `${settings[setting.key]} results`}
                          </Typography>
                        </Box>
                        <Slider
                          size="small"
                          value={Number(settings[setting.key])}
                          onChange={(_, val) => setField(setting.key, val as SearchSettings[typeof setting.key])}
                          min={setting.key === 'minSearchLength' ? 1 : 10}
                          max={setting.key === 'minSearchLength' ? 5 : 100}
                          step={setting.key === 'minSearchLength' ? 1 : 5}
                          sx={{
                            color: isDark ? '#d4af37' : '#2d1b4e',
                            '& .MuiSlider-track': { bgcolor: isDark ? '#d4af37' : '#2d1b4e' },
                          }}
                        />
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

export default SearchConfigurationPage;
