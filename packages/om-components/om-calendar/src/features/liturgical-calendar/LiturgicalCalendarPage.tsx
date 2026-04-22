/**
 * Liturgical Calendar Page
 *
 * Professional Eastern Orthodox calendar built on FullCalendar.
 * Shows liturgical colors, feasts, saints, readings, and fasting for each day.
 * Modeled after the GOARCH Chapel Calendar (goarch.org/chapel/calendar).
 */

import React, { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { Box, Card, useTheme, useMediaQuery } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { DayCellContentArg, DayCellMountArg, EventInput } from '@fullcalendar/core';

import PageContainer from '@/shared/ui/PageContainer';
import { useLiturgicalCalendar } from './hooks/useLiturgicalCalendar';
import LiturgicalCalendarToolbar from './components/LiturgicalCalendarToolbar';
import LiturgicalDaySidebar from './components/LiturgicalDaySidebar';
import './liturgical-calendar.css';

// Liturgical color → hex mapping for FullCalendar events
const LITURGICAL_COLOR_HEX: Record<string, string> = {
  white: '#9E9E9E', // Use gray for visibility on white bg
  gold: '#C9A227',
  blue: '#1E6B8C',
  red: '#B22234',
  purple: '#6B2D75',
  green: '#4CAF50',
};

const LiturgicalCalendarPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const calendarRef = useRef<FullCalendar | null>(null);

  const {
    year, month, monthName, monthData,
    selectedDay, selectedDate,
    isLoading, error,
    setSelectedDate,
    goToMonth, goToPrevMonth, goToNextMonth, goToToday,
  } = useLiturgicalCalendar();

  // Track current season/color from first day's data
  const [currentSeason, setCurrentSeason] = useState<string>('');
  const [currentColor, setCurrentColor] = useState<string>('green');

  useEffect(() => {
    // Get today's liturgical info from month data
    const today = new Date();
    if (today.getFullYear() === year && today.getMonth() + 1 === month) {
      const todayData = monthData[today.getDate()];
      if (todayData) {
        setCurrentSeason(todayData.season);
        setCurrentColor(todayData.liturgicalColor);
      }
    } else {
      // Use first day of the displayed month
      const firstDay = monthData[1];
      if (firstDay) {
        setCurrentSeason(firstDay.season);
        setCurrentColor(firstDay.liturgicalColor);
      }
    }
  }, [monthData, year, month]);

  // Sync FullCalendar's date with our state when month changes via toolbar
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api) {
      const currentDate = api.getDate();
      if (currentDate.getFullYear() !== year || currentDate.getMonth() + 1 !== month) {
        api.gotoDate(new Date(year, month - 1, 1));
      }
    }
  }, [year, month]);

  // Convert month data to FullCalendar events (all feasts + commemorations)
  const liturgicalEvents: EventInput[] = useMemo(() => {
    const events: EventInput[] = [];
    for (const [dayStr, data] of Object.entries(monthData)) {
      if (data.feastName) {
        const day = dayStr.padStart(2, '0');
        const monthStr = String(month).padStart(2, '0');
        events.push({
          id: `feast-${dayStr}`,
          title: data.feastName,
          start: `${year}-${monthStr}-${day}`,
          allDay: true,
          backgroundColor: LITURGICAL_COLOR_HEX[data.liturgicalColor] || LITURGICAL_COLOR_HEX.green,
          borderColor: 'transparent',
          textColor: '#fff',
          classNames: ['liturgical-feast-event'],
          extendedProps: { rank: data.feastRank },
        });
      }
    }
    return events;
  }, [monthData, year, month]);

  // Apply liturgical color class to day cells
  const handleDayCellDidMount = useCallback((arg: DayCellMountArg) => {
    const cellDate = arg.date;
    const cellMonth = cellDate.getMonth() + 1;
    const cellYear = cellDate.getFullYear();

    if (cellYear === year && cellMonth === month) {
      const dayData = monthData[cellDate.getDate()];
      if (dayData) {
        arg.el.classList.add(`liturgical-day--${dayData.liturgicalColor}`);
      }
    }
  }, [monthData, year, month]);

  // Custom day cell content with fasting/feast indicators
  const handleDayCellContent = useCallback((arg: DayCellContentArg) => {
    const cellDate = arg.date;
    const cellMonth = cellDate.getMonth() + 1;
    const cellYear = cellDate.getFullYear();

    if (cellYear === year && cellMonth === month) {
      const dayData = monthData[cellDate.getDate()];
      if (dayData) {
        return (
          <Box display="flex" alignItems="center" gap={0.3}>
            <span>{arg.dayNumberText}</span>
            {dayData.feastRank === 'great' && (
              <span className="liturgical-feast-dot liturgical-feast-dot--great" title="Great Feast" />
            )}
            {dayData.feastRank === 'major' && (
              <span className="liturgical-feast-dot liturgical-feast-dot--major" title="Major Feast" />
            )}
            {dayData.fasting.level !== 'fast_free' && (
              <span
                className={`liturgical-fasting-dot liturgical-fasting-dot--${dayData.fasting.level}`}
                title={dayData.fasting.description}
              />
            )}
          </Box>
        );
      }
    }
    return arg.dayNumberText;
  }, [monthData, year, month]);

  // Handle day click — show sidebar
  const handleDateClick = useCallback((info: { date: Date }) => {
    setSelectedDate(info.date);
  }, [setSelectedDate]);

  // Handle FullCalendar date navigation — sync data fetching with view changes
  const handleDatesSet = useCallback((dateInfo: { start: Date; end: Date; view: { currentStart: Date } }) => {
    const viewStart = dateInfo.view.currentStart;
    const viewMonth = viewStart.getMonth() + 1;
    const viewYear = viewStart.getFullYear();
    if (viewYear !== year || viewMonth !== month) {
      goToMonth(viewYear, viewMonth);
    }
  }, [year, month, goToMonth]);

  return (
    <PageContainer title="Liturgical Calendar" description="Eastern Orthodox Liturgical Calendar">

      <Box display="flex" gap={2} flexDirection={{ xs: 'column', md: 'row' }}>
        {/* Calendar Panel */}
        <Box flex={selectedDay ? '0 0 66.6%' : '1 1 100%'} minWidth={0}>
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              overflow: 'hidden',
            }}
          >
            <LiturgicalCalendarToolbar
              calendarRef={calendarRef}
              season={currentSeason}
              liturgicalColor={currentColor}
            />

            <Box px={2} pb={2}>
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView={isMobile ? 'listMonth' : 'dayGridMonth'}
                initialDate={new Date(year, month - 1, 1)}
                headerToolbar={false}
                events={liturgicalEvents}
                dateClick={handleDateClick}
                dayCellDidMount={handleDayCellDidMount}
                dayCellContent={handleDayCellContent}
                datesSet={handleDatesSet}
                height="auto"
                dayMaxEvents={2}
                fixedWeekCount={false}
                showNonCurrentDates={true}
                firstDay={0}
                eventDisplay="block"
              />
            </Box>
          </Card>
        </Box>

        {/* Day Detail Sidebar */}
        {selectedDay && selectedDate && (
          <Box flex="0 0 33.3%" minWidth={0}>
            <LiturgicalDaySidebar
              day={selectedDay}
              date={selectedDate}
              onClose={() => setSelectedDate(null)}
            />
          </Box>
        )}
      </Box>
    </PageContainer>
  );
};

export default LiturgicalCalendarPage;
