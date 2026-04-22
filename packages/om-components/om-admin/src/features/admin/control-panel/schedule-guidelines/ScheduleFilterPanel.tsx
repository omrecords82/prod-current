/**
 * ScheduleFilterPanel — Left sidebar with sacrament type, toggles, search, quick filters, legend.
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  Switch,
  TextField,
  InputAdornment,
  Button,
} from '@mui/material';
import { Search } from '@/ui/icons';
import type { SacramentType } from './scheduleTypes';

interface ScheduleFilterPanelProps {
  sacramentType: SacramentType;
  onSacramentTypeChange: (type: SacramentType) => void;
  highlightFeasts: boolean;
  onHighlightFeastsChange: (v: boolean) => void;
  highlightFasts: boolean;
  onHighlightFastsChange: (v: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onQuickFilter: (filter: string) => void;
}

const quickFilters = [
  { label: 'Great Lent', value: 'great-lent' },
  { label: 'Nativity Fast', value: 'nativity-fast' },
  { label: 'Pascha', value: 'pascha' },
  { label: 'Dormition Fast', value: 'dormition-fast' },
  { label: 'Major Feasts', value: 'major-feasts' },
];

const legendItems = [
  { color: 'var(--schedule-restricted)', label: 'Restricted', border: false },
  { color: 'var(--schedule-conditional)', label: 'Conditional', border: false },
  { color: 'var(--schedule-allowed)', label: 'Allowed', border: false },
  { color: 'var(--orthodox-gold)', label: 'Feast Day', border: true, borderColor: 'var(--orthodox-gold)' },
  { color: 'var(--orthodox-purple-light)', label: 'Liturgical Period', border: false },
];

const ScheduleFilterPanel: React.FC<ScheduleFilterPanelProps> = ({
  sacramentType,
  onSacramentTypeChange,
  highlightFeasts,
  onHighlightFeastsChange,
  highlightFasts,
  onHighlightFastsChange,
  searchQuery,
  onSearchQueryChange,
  onQuickFilter,
}) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        position: 'sticky',
        top: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Box>
        <Typography variant="subtitle1" fontWeight={600}>Filters & Controls</Typography>
        <Typography variant="body2" color="text.secondary">Customize your view</Typography>
      </Box>

      {/* Sacrament Type */}
      <Box>
        <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>Sacrament Type</Typography>
        <RadioGroup
          value={sacramentType}
          onChange={(e) => onSacramentTypeChange(e.target.value as SacramentType)}
        >
          <FormControlLabel value="baptism" control={<Radio size="small" />} label="Baptism" />
          <FormControlLabel value="marriage" control={<Radio size="small" />} label="Marriage" />
          <FormControlLabel value="funeral" control={<Radio size="small" />} label="Funeral" />
        </RadioGroup>
      </Box>

      {/* Display Options */}
      <Box>
        <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>Display Options</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2">Highlight Major Feasts</Typography>
            <Switch size="small" checked={highlightFeasts} onChange={(e) => onHighlightFeastsChange(e.target.checked)} />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2">Highlight Fast Periods</Typography>
            <Switch size="small" checked={highlightFasts} onChange={(e) => onHighlightFastsChange(e.target.checked)} />
          </Box>
        </Box>
      </Box>

      {/* Search */}
      <Box>
        <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>Search</Typography>
        <TextField
          size="small"
          fullWidth
          placeholder="Search feast, fast, or restriction..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Quick Filters */}
      <Box>
        <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>Quick Filters</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {quickFilters.map((f) => (
            <Button
              key={f.value}
              size="small"
              variant="text"
              onClick={() => onQuickFilter(f.value)}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                px: 1.5,
                py: 0.75,
                bgcolor: 'grey.50',
                '&:hover': { bgcolor: 'action.hover', color: 'var(--orthodox-purple)' },
              }}
            >
              {f.label}
            </Button>
          ))}
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>Color Legend</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {legendItems.map((item) => (
            <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: 0.5,
                  bgcolor: `${item.color}33`,
                  border: item.border ? `2px solid ${item.borderColor}` : `2px solid ${item.color}`,
                }}
              />
              <Typography variant="body2">{item.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};

export default ScheduleFilterPanel;
