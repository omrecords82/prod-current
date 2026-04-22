/**
 * Liturgical Calendar Toolbar
 *
 * Navigation toolbar with prev/next/today, view selector,
 * liturgical season badge, and auto-theme toggle.
 */

import React from 'react';
import {
  Box, Button, ButtonGroup, Typography, Stack, Chip, Tooltip, IconButton,
  alpha, useTheme, useMediaQuery,
} from '@mui/material';
import {
  IconChevronLeft, IconChevronRight, IconCalendar, IconPalette,
} from '@tabler/icons-react';
import FullCalendar from '@fullcalendar/react';
import { setManualThemeOverride } from '../hooks/useLiturgicalAutoTheme';

// Map liturgical colors to hex for season badge
const COLOR_HEX: Record<string, string> = {
  white: '#E8E8E3',
  gold: '#C9A227',
  blue: '#1E6B8C',
  red: '#B22234',
  purple: '#6B2D75',
  green: '#4CAF50',
};

interface LiturgicalCalendarToolbarProps {
  calendarRef: React.RefObject<FullCalendar | null>;
  season?: string;
  liturgicalColor?: string;
}

const LiturgicalCalendarToolbar: React.FC<LiturgicalCalendarToolbarProps> = ({
  calendarRef,
  season,
  liturgicalColor,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [title, setTitle] = React.useState('');

  const updateTitle = React.useCallback(() => {
    const api = calendarRef.current?.getApi();
    if (api) {
      setTitle(api.view.title);
    }
  }, [calendarRef]);

  React.useEffect(() => {
    // Slight delay to ensure FullCalendar is initialized
    const timer = setTimeout(updateTitle, 100);
    return () => clearTimeout(timer);
  }, [updateTitle]);

  const handlePrev = () => {
    calendarRef.current?.getApi().prev();
    updateTitle();
  };

  const handleNext = () => {
    calendarRef.current?.getApi().next();
    updateTitle();
  };

  const handleToday = () => {
    calendarRef.current?.getApi().today();
    updateTitle();
  };

  const handleViewChange = (view: string) => {
    calendarRef.current?.getApi().changeView(view);
    updateTitle();
  };

  const handleResetAutoTheme = () => {
    setManualThemeOverride(false);
    // Trigger reload to re-apply auto-theme
    window.location.reload();
  };

  const seasonColor = liturgicalColor ? COLOR_HEX[liturgicalColor] || COLOR_HEX.green : undefined;

  return (
    <Box
      display="flex"
      flexDirection={isMobile ? 'column' : 'row'}
      alignItems={isMobile ? 'stretch' : 'center'}
      justifyContent="space-between"
      gap={1.5}
      p={2}
      pb={1}
    >
      {/* Left: Navigation */}
      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          variant="outlined"
          size="small"
          onClick={handleToday}
          startIcon={<IconCalendar size={16} />}
        >
          Today
        </Button>
        <IconButton size="small" onClick={handlePrev}>
          <IconChevronLeft size={20} />
        </IconButton>
        <IconButton size="small" onClick={handleNext}>
          <IconChevronRight size={20} />
        </IconButton>
        <Typography variant="h6" fontWeight={600} noWrap sx={{ ml: 1 }}>
          {title}
        </Typography>
      </Stack>

      {/* Center: Season Badge */}
      {season && seasonColor && (
        <Chip
          label={season}
          size="small"
          className="liturgical-season-badge"
          sx={{
            backgroundColor: alpha(seasonColor, 0.12),
            color: seasonColor,
            fontWeight: 600,
            fontSize: '0.7rem',
            letterSpacing: 0.5,
            alignSelf: 'center',
          }}
        />
      )}

      {/* Right: View Selector + Auto-theme */}
      <Stack direction="row" spacing={1} alignItems="center">
        {!isMobile && (
          <ButtonGroup size="small" variant="outlined">
            <Button onClick={() => handleViewChange('dayGridMonth')}>Month</Button>
            <Button onClick={() => handleViewChange('timeGridWeek')}>Week</Button>
            <Button onClick={() => handleViewChange('timeGridDay')}>Day</Button>
            <Button onClick={() => handleViewChange('listMonth')}>List</Button>
          </ButtonGroup>
        )}
        <Tooltip title="Reset to Liturgical Auto-Theme">
          <IconButton size="small" onClick={handleResetAutoTheme}>
            <IconPalette size={18} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
};

export default LiturgicalCalendarToolbar;
