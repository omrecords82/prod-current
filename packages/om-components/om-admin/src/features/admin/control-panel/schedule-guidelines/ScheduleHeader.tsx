/**
 * ScheduleHeader — Title bar with year selector, calendar toggle, view mode toggle.
 */

import React from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  IconButton,
} from '@mui/material';
import { CalendarDays, LayoutList, Table, ArrowLeft } from '@/ui/icons';
import { useNavigate } from 'react-router-dom';
import type { ViewMode, CalendarType } from './scheduleTypes';

interface ScheduleHeaderProps {
  year: number;
  onYearChange: (year: number) => void;
  calendar: CalendarType;
  onCalendarChange: (cal: CalendarType) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  source: 'database' | 'engine';
}

const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  year,
  onYearChange,
  calendar,
  onCalendarChange,
  viewMode,
  onViewModeChange,
  source,
}) => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        px: 3,
        py: 3,
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, alignItems: { lg: 'center' }, justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <IconButton size="small" onClick={() => navigate('/admin/control-panel/church-management')}>
              <ArrowLeft size={18} />
            </IconButton>
            <Typography variant="h4" sx={{ color: 'var(--orthodox-purple)', fontWeight: 600 }}>
              Orthodox Schedule Guidelines
            </Typography>
            <Chip
              label={source === 'database' ? 'Source: Database' : 'Source: Computed Engine'}
              size="small"
              variant="outlined"
              sx={{ ml: 1, fontSize: '0.7rem', height: 22 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ pl: 5 }}>
            Liturgical calendar and sacramental scheduling assistant
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
          {/* Year Selector */}
          <Select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            size="small"
            sx={{ minWidth: 100 }}
          >
            {years.map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </Select>

          {/* Calendar Toggle */}
          <ToggleButtonGroup
            value={calendar}
            exclusive
            onChange={(_e, val) => val && onCalendarChange(val as CalendarType)}
            size="small"
          >
            <ToggleButton value="new">New Cal</ToggleButton>
            <ToggleButton value="old">Old Cal</ToggleButton>
          </ToggleButtonGroup>

          {/* View Mode Toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_e, val) => val && onViewModeChange(val as ViewMode)}
            size="small"
          >
            <ToggleButton value="calendar">
              <CalendarDays size={16} />
              <Box component="span" sx={{ ml: 0.5, display: { xs: 'none', sm: 'inline' } }}>Calendar</Box>
            </ToggleButton>
            <ToggleButton value="timeline">
              <LayoutList size={16} />
              <Box component="span" sx={{ ml: 0.5, display: { xs: 'none', sm: 'inline' } }}>Timeline</Box>
            </ToggleButton>
            <ToggleButton value="table">
              <Table size={16} />
              <Box component="span" sx={{ ml: 0.5, display: { xs: 'none', sm: 'inline' } }}>Table</Box>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
    </Box>
  );
};

export default ScheduleHeader;
