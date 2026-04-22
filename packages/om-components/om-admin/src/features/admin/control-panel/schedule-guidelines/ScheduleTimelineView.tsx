/**
 * ScheduleTimelineView — Horizontal timeline showing fast periods and feast markers.
 */

import React from 'react';
import { Box, Paper, Typography, Tooltip } from '@mui/material';
import type { ScheduleData } from './scheduleTypes';

interface ScheduleTimelineViewProps {
  year: number;
  data: ScheduleData;
}

const MONTH_ABBREVS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayOfYear(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

function totalDaysInYear(year: number): number {
  return (new Date(year, 11, 31).getTime() - new Date(year, 0, 1).getTime()) / 86_400_000 + 1;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${MONTH_ABBREVS[d.getMonth()]} ${d.getDate()}`;
}

const ScheduleTimelineView: React.FC<ScheduleTimelineViewProps> = ({ year, data }) => {
  const total = totalDaysInYear(year);
  const fastEvents = data.events.filter((e) => e.type === 'fast');
  const feastEvents = data.events.filter((e) => e.type === 'feast' || e.isMajorFeast);

  return (
    <Paper variant="outlined" sx={{ p: 4 }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>Liturgical Timeline {year}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Visual overview of fast periods and major feasts
      </Typography>

      {/* Month Labels */}
      <Box sx={{ display: 'flex', borderBottom: 2, borderColor: 'divider', mb: 3 }}>
        {MONTH_ABBREVS.map((m, i) => (
          <Box
            key={m}
            sx={{
              flex: 1,
              textAlign: 'center',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'text.secondary',
              py: 0.5,
              borderLeft: i > 0 ? '1px solid' : 'none',
              borderColor: 'divider',
            }}
          >
            {m}
          </Box>
        ))}
      </Box>

      {/* Fast Periods */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>Fast Periods</Typography>
        <Box sx={{ position: 'relative', height: 100, bgcolor: 'grey.50', borderRadius: 2 }}>
          {fastEvents.map((event, idx) => {
            const left = (dayOfYear(event.startDate) / total) * 100;
            const startDay = dayOfYear(event.startDate);
            const endDay = dayOfYear(event.endDate);
            const width = ((endDay - startDay + 1) / total) * 100;

            return (
              <Tooltip key={idx} title={`${event.name}: ${formatDate(event.startDate)} – ${formatDate(event.endDate)}`} arrow>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    height: 56,
                    left: `${left}%`,
                    width: `${Math.max(width, 0.5)}%`,
                    bgcolor: 'var(--schedule-fast)',
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s',
                    '&:hover': { boxShadow: 4 },
                  }}
                >
                  {/* Label above */}
                  <Typography
                    sx={{
                      position: 'absolute',
                      top: -20,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '0.65rem',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {event.name}
                  </Typography>
                  {/* Start date */}
                  <Typography sx={{ position: 'absolute', bottom: -18, left: 0, fontSize: '0.6rem', color: 'text.secondary' }}>
                    {formatDate(event.startDate)}
                  </Typography>
                  {/* End date */}
                  <Typography sx={{ position: 'absolute', bottom: -18, right: 0, fontSize: '0.6rem', color: 'text.secondary' }}>
                    {formatDate(event.endDate)}
                  </Typography>
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Box>

      {/* Major Feasts */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>Major Feasts</Typography>
        <Box sx={{ position: 'relative', height: 70, bgcolor: 'grey.50', borderRadius: 2 }}>
          {feastEvents.map((event, idx) => {
            const left = (dayOfYear(event.startDate) / total) * 100;

            return (
              <Tooltip key={idx} title={`${event.name}: ${formatDate(event.startDate)}`} arrow>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 24,
                    left: `${left}%`,
                    transform: 'translateX(-50%)',
                    cursor: 'pointer',
                    '&:hover .feast-label': { opacity: 1 },
                  }}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: 'var(--schedule-feast)',
                      border: event.isMajorFeast ? '2px solid var(--orthodox-gold)' : 'none',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'scale(1.5)' },
                    }}
                  />
                  <Typography
                    className="feast-label"
                    sx={{
                      position: 'absolute',
                      top: -20,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '0.6rem',
                      color: 'text.secondary',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatDate(event.startDate)}
                  </Typography>
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 28, height: 10, bgcolor: 'var(--schedule-fast)', borderRadius: 0.5 }} />
          <Typography variant="caption">Fast Period</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'var(--schedule-feast)', border: '2px solid var(--orthodox-gold)' }} />
          <Typography variant="caption">Major Feast</Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default ScheduleTimelineView;
