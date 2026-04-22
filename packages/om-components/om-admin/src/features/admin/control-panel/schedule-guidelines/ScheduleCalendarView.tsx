/**
 * ScheduleCalendarView — 12-month grid of day cells.
 */

import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import ScheduleCalendarDayCell from './ScheduleCalendarDayCell';
import type { ScheduleData, SacramentType } from './scheduleTypes';

interface ScheduleCalendarViewProps {
  year: number;
  data: ScheduleData;
  sacramentType: SacramentType;
  highlightFeasts: boolean;
  highlightFasts: boolean;
  onDateClick: (date: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const ScheduleCalendarView: React.FC<ScheduleCalendarViewProps> = ({
  year,
  data,
  sacramentType,
  highlightFeasts,
  highlightFasts,
  onDateClick,
}) => {
  const renderMonth = (month: number) => {
    const days = daysInMonth(year, month);
    const startDay = firstDayOfWeek(year, month);

    return (
      <Paper key={month} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography
          variant="subtitle2"
          align="center"
          sx={{ mb: 1.5, color: 'var(--orthodox-purple)', fontWeight: 600 }}
        >
          {MONTH_NAMES[month]} {year}
        </Typography>

        {/* Day-of-week headers */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', mb: 0.5 }}>
          {DOW.map((d) => (
            <Box key={d} sx={{ textAlign: 'center', fontSize: '0.65rem', color: 'text.secondary', fontWeight: 600, py: 0.5 }}>
              {d}
            </Box>
          ))}
        </Box>

        {/* Day cells */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {/* Empty leading cells */}
          {Array.from({ length: startDay }, (_, i) => (
            <Box key={`e-${i}`} sx={{ aspectRatio: '1' }} />
          ))}
          {/* Day cells */}
          {Array.from({ length: days }, (_, i) => {
            const day = i + 1;
            const iso = toISO(year, month, day);
            const scheduleDay = data.days.get(iso);

            return (
              <ScheduleCalendarDayCell
                key={day}
                day={day}
                scheduleDay={scheduleDay}
                sacramentType={sacramentType}
                highlightFeasts={highlightFeasts}
                highlightFasts={highlightFasts}
                onClick={() => onDateClick(iso)}
              />
            );
          })}
        </Box>
      </Paper>
    );
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
        gap: 3,
      }}
    >
      {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
    </Box>
  );
};

export default ScheduleCalendarView;
