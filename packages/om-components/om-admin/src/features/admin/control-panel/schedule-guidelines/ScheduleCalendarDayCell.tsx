/**
 * ScheduleCalendarDayCell — Single day cell in the calendar grid.
 *
 * Color logic:
 * - Feast/fast period days share a single liturgical color (purple tint)
 * - The actual feast day itself gets an emphasized gold highlight
 * - Non-liturgical days with restrictions use restriction colors (red/yellow/green)
 * - Plain days with no events get no styling
 */

import React from 'react';
import { Box, Tooltip, alpha } from '@mui/material';
import type { ScheduleDay, SacramentType } from './scheduleTypes';

interface ScheduleCalendarDayCellProps {
  day: number;
  scheduleDay: ScheduleDay | undefined;
  sacramentType: SacramentType;
  highlightFeasts: boolean;
  highlightFasts: boolean;
  onClick: () => void;
}

// Color constants
const COLORS = {
  allowed: '#10B981',
  conditional: '#F59E0B',
  restricted: '#EF4444',
  // Liturgical period base color (feasts + fasts share this)
  liturgical: '#7C3AED',
  // Emphasized color for the actual feast day
  feastDay: '#D97706',
};

const ScheduleCalendarDayCell: React.FC<ScheduleCalendarDayCellProps> = ({
  day,
  scheduleDay,
  sacramentType,
  highlightFeasts,
  highlightFasts,
  onClick,
}) => {
  // No schedule data — plain day
  if (!scheduleDay) {
    return (
      <Box
        onClick={onClick}
        sx={{
          width: '100%',
          aspectRatio: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1,
          fontSize: '0.8rem',
          cursor: 'pointer',
          border: '2px solid transparent',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        {day}
      </Box>
    );
  }

  const restriction = scheduleDay.restrictions[sacramentType];
  const hasMajorFeast = scheduleDay.events.some((e) => e.isMajorFeast);
  const hasFeast = scheduleDay.events.some((e) => e.type === 'feast');
  const hasFast = scheduleDay.events.some((e) => e.type === 'fast');
  const hasEvents = scheduleDay.events.length > 0;

  // Determine if this is the actual feast day (single-day feast, not a multi-day period)
  const isActualFeastDay = scheduleDay.events.some(
    (e) => e.type === 'feast' && e.startDate === e.endDate,
  );

  // Color logic:
  // 1. Actual feast day → emphasized gold highlight
  // 2. Liturgical period (feast period or fast) → purple tint
  // 3. Restriction-only days → restriction colors
  let bgColor: string;
  let borderColor: string;

  if (highlightFeasts && isActualFeastDay) {
    // The feast day itself — emphasized gold
    bgColor = alpha(COLORS.feastDay, 0.25);
    borderColor = COLORS.feastDay;
  } else if ((highlightFeasts && hasFeast) || (highlightFasts && hasFast)) {
    // Part of a liturgical period (feast span or fast) — shared purple
    bgColor = alpha(COLORS.liturgical, 0.12);
    borderColor = COLORS.liturgical;
  } else {
    // Restriction-only coloring
    switch (restriction) {
      case 'restricted':
        bgColor = alpha(COLORS.restricted, 0.15);
        borderColor = COLORS.restricted;
        break;
      case 'conditional':
        bgColor = alpha(COLORS.conditional, 0.15);
        borderColor = COLORS.conditional;
        break;
      default:
        bgColor = alpha(COLORS.allowed, 0.08);
        borderColor = COLORS.allowed;
        break;
    }
  }

  // Tooltip content
  const tooltipLines: string[] = [];
  if (hasEvents) {
    for (const e of scheduleDay.events) {
      tooltipLines.push(e.name);
    }
  }
  tooltipLines.push(`${sacramentType}: ${restriction}`);

  return (
    <Tooltip
      title={
        <Box sx={{ whiteSpace: 'pre-line', fontSize: '0.75rem' }}>
          {tooltipLines.join('\n')}
        </Box>
      }
      arrow
      placement="top"
    >
      <Box
        onClick={onClick}
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1,
          border: `2px solid ${borderColor}`,
          bgcolor: bgColor,
          fontSize: '0.8rem',
          fontWeight: hasEvents ? 600 : 400,
          cursor: 'pointer',
          transition: 'all 0.15s',
          '&:hover': {
            transform: 'scale(1.08)',
            boxShadow: 2,
          },
        }}
      >
        {day}
        {hasEvents && (
          <Box sx={{ position: 'absolute', bottom: 2, display: 'flex', gap: '2px' }}>
            {scheduleDay.events.slice(0, 3).map((_, i) => (
              <Box key={i} sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'currentcolor', opacity: 0.5 }} />
            ))}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
};

export default ScheduleCalendarDayCell;
