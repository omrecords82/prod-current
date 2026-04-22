/**
 * Modernize Liturgical Calendar - React Big Calendar Implementation
 * Enhanced liturgical calendar with Modernize template styling
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  ButtonGroup,
  Chip,
  Tooltip,
  Paper,
  Alert,
  CircularProgress,
  Grid,
  Badge,
  Divider
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  CalendarToday,
  Event,
  StarBorder,
  Restaurant,
  Church,
  Celebration
} from '@mui/icons-material';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { orthodoxCalendarService } from '@/shared/lib/orthodoxCalendarService';
import {
  OrthodoxCalendarDay,
  CalendarLanguage,
  CalendarType,
  FeastType,
  FastingType
} from '../../../types/orthodox-calendar.types';

// Initialize moment localizer
const localizer = momentLocalizer(moment);

interface LiturgicalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: {
    type: 'feast' | 'fast' | 'commemoration' | 'reading';
    importance: 'major' | 'minor' | 'commemoration';
    fastingType?: FastingType;
    feastType?: FeastType;
    color: string;
    description?: string;
    saints?: string[];
    readings?: string[];
  };
}

interface ModernizeLiturgicalCalendarProps {
  language?: CalendarLanguage;
  calendarType?: CalendarType;
  onDateSelect?: (date: Date) => void;
  onEventSelect?: (event: LiturgicalEvent) => void;
  height?: number;
  compact?: boolean;
}

const ModernizeLiturgicalCalendar: React.FC<ModernizeLiturgicalCalendarProps> = ({
  language = 'en',
  calendarType = 'gregorian',
  onDateSelect,
  onEventSelect,
  height = 600,
  compact = false
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);
  const [liturgicalData, setLiturgicalData] = useState<OrthodoxCalendarDay[]>([]);
  const [events, setEvents] = useState<LiturgicalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Load liturgical data for the current month
  useEffect(() => {
    const loadLiturgicalData = async () => {
      setLoading(true);
      setError('');
      
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        
        const data = await orthodoxCalendarService.getCalendarMonth(
          year,
          month,
          language,
          calendarType
        );
        
        setLiturgicalData(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load liturgical data:', error);
        setError('Failed to load liturgical data. Please try again.');
        setLiturgicalData([]);
      } finally {
        setLoading(false);
      }
    };

    loadLiturgicalData();
  }, [currentDate, language, calendarType]);

  // Transform liturgical data to calendar events
  useEffect(() => {
    const transformedEvents: LiturgicalEvent[] = [];

    liturgicalData.forEach((dayData) => {
      const eventDate = new Date(dayData.date);
      
      // Major feasts
      dayData.feasts?.major?.forEach((feast, index) => {
        transformedEvents.push({
          id: `feast-major-${dayData.date}-${index}`,
          title: feast.name,
          start: eventDate,
          end: eventDate,
          allDay: true,
          resource: {
            type: 'feast',
            importance: 'major',
            feastType: feast.type || 'movable',
            color: '#d32f2f', // Red for major feasts
            description: feast.description,
            readings: feast.readings
          }
        });
      });

      // Minor feasts
      dayData.feasts?.minor?.forEach((feast, index) => {
        transformedEvents.push({
          id: `feast-minor-${dayData.date}-${index}`,
          title: feast.name,
          start: eventDate,
          end: eventDate,
          allDay: true,
          resource: {
            type: 'feast',
            importance: 'minor',
            feastType: feast.type || 'movable',
            color: '#1976d2', // Blue for minor feasts
            description: feast.description,
            readings: feast.readings
          }
        });
      });

      // Fasting information
      if (dayData.fasting && dayData.fasting.type !== 'none') {
        transformedEvents.push({
          id: `fasting-${dayData.date}`,
          title: `${dayData.fasting.name} (Fasting)`,
          start: eventDate,
          end: eventDate,
          allDay: true,
          resource: {
            type: 'fast',
            importance: 'minor',
            fastingType: dayData.fasting.type,
            color: '#7b1fa2', // Purple for fasting
            description: dayData.fasting.description
          }
        });
      }

      // Commemorations/Saints
      dayData.commemorations?.forEach((commemoration, index) => {
        transformedEvents.push({
          id: `commemoration-${dayData.date}-${index}`,
          title: commemoration.name,
          start: eventDate,
          end: eventDate,
          allDay: true,
          resource: {
            type: 'commemoration',
            importance: 'commemoration',
            color: '#388e3c', // Green for commemorations
            description: commemoration.description,
            saints: [commemoration.name]
          }
        });
      });
    });

    setEvents(transformedEvents);
  }, [liturgicalData]);

  // Event style getter for calendar appearance
  const eventStyleGetter = (event: LiturgicalEvent) => {
    return {
      style: {
        backgroundColor: event.resource.color,
        borderColor: event.resource.color,
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: compact ? '11px' : '12px',
        padding: '2px 4px'
      }
    };
  };

  // Custom event component
  const EventComponent = ({ event }: { event: LiturgicalEvent }) => (
    <Tooltip title={event.resource.description || event.title} placement="top">
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 0.5,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {event.resource.type === 'feast' && event.resource.importance === 'major' && <StarBorder sx={{ fontSize: 12 }} />}
        {event.resource.type === 'fast' && <Restaurant sx={{ fontSize: 12 }} />}
        {event.resource.type === 'commemoration' && <Church sx={{ fontSize: 12 }} />}
        <Typography variant="caption" sx={{ fontSize: 'inherit' }}>
          {event.title}
        </Typography>
      </Box>
    </Tooltip>
  );

  // Date cell wrapper to show liturgical season colors
  const DateCellWrapper = ({ children, value }: { children: React.ReactNode; value: Date }) => {
    const dayData = liturgicalData.find(d => 
      new Date(d.date).toDateString() === value.toDateString()
    );
    
    let backgroundColor = 'transparent';
    if (dayData?.liturgical_season) {
      switch (dayData.liturgical_season) {
        case 'lent':
          backgroundColor = 'rgba(156, 39, 176, 0.1)'; // Purple tint
          break;
        case 'pascha':
          backgroundColor = 'rgba(255, 193, 7, 0.1)'; // Gold tint
          break;
        case 'nativity':
          backgroundColor = 'rgba(76, 175, 80, 0.1)'; // Green tint
          break;
        case 'pentecost':
          backgroundColor = 'rgba(244, 67, 54, 0.1)'; // Red tint
          break;
      }
    }

    return (
      <div style={{ backgroundColor, height: '100%' }}>
        {children}
      </div>
    );
  };

  const navigateToDate = (direction: 'prev' | 'next' | 'today') => {
    let newDate = new Date(currentDate);
    
    switch (direction) {
      case 'prev':
        if (view === Views.MONTH) {
          newDate.setMonth(newDate.getMonth() - 1);
        } else if (view === Views.WEEK) {
          newDate.setDate(newDate.getDate() - 7);
        } else {
          newDate.setDate(newDate.getDate() - 1);
        }
        break;
      case 'next':
        if (view === Views.MONTH) {
          newDate.setMonth(newDate.getMonth() + 1);
        } else if (view === Views.WEEK) {
          newDate.setDate(newDate.getDate() + 7);
        } else {
          newDate.setDate(newDate.getDate() + 1);
        }
        break;
      case 'today':
        newDate = new Date();
        break;
    }
    
    setCurrentDate(newDate);
  };

  const handleSelectEvent = (event: LiturgicalEvent) => {
    if (onEventSelect) {
      onEventSelect(event);
    }
  };

  const handleSelectSlot = ({ start }: { start: Date }) => {
    if (onDateSelect) {
      onDateSelect(start);
    }
  };

  const formatDateTitle = () => {
    if (view === Views.MONTH) {
      return moment(currentDate).format('MMMM YYYY');
    } else if (view === Views.WEEK) {
      const startWeek = moment(currentDate).startOf('week');
      const endWeek = moment(currentDate).endOf('week');
      return `${startWeek.format('MMM DD')} - ${endWeek.format('MMM DD, YYYY')}`;
    } else {
      return moment(currentDate).format('MMMM DD, YYYY');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: compact ? 2 : 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header Controls */}
        <Stack 
          direction={{ xs: 'column', md: 'row' }} 
          spacing={2} 
          alignItems={{ xs: 'stretch', md: 'center' }}
          sx={{ mb: 2 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => navigateToDate('prev')} size="large">
              <ChevronLeft />
            </IconButton>
            <Typography variant={compact ? "h6" : "h5"} sx={{ minWidth: 200, textAlign: 'center' }}>
              {formatDateTitle()}
            </Typography>
            <IconButton onClick={() => navigateToDate('next')} size="large">
              <ChevronRight />
            </IconButton>
            <Button
              variant="outlined"
              startIcon={<Today />}
              onClick={() => navigateToDate('today')}
              size="small"
            >
              Today
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <ButtonGroup size="small">
              <Button 
                variant={view === Views.MONTH ? 'contained' : 'outlined'}
                onClick={() => setView(Views.MONTH)}
              >
                Month
              </Button>
              <Button 
                variant={view === Views.WEEK ? 'contained' : 'outlined'}
                onClick={() => setView(Views.WEEK)}
              >
                Week
              </Button>
              <Button 
                variant={view === Views.DAY ? 'contained' : 'outlined'}
                onClick={() => setView(Views.DAY)}
              >
                Day
              </Button>
            </ButtonGroup>
          </Box>
        </Stack>

        {/* Legend */}
        {!compact && (
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Chip icon={<StarBorder />} label="Major Feast" size="small" sx={{ bgcolor: '#d32f2f', color: 'white' }} />
            <Chip icon={<Event />} label="Minor Feast" size="small" sx={{ bgcolor: '#1976d2', color: 'white' }} />
            <Chip icon={<Restaurant />} label="Fasting" size="small" sx={{ bgcolor: '#7b1fa2', color: 'white' }} />
            <Chip icon={<Church />} label="Saints" size="small" sx={{ bgcolor: '#388e3c', color: 'white' }} />
          </Stack>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Calendar */}
        <Box sx={{ flexGrow: 1, minHeight: height - 200 }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={setView}
            date={currentDate}
            onNavigate={setCurrentDate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={eventStyleGetter}
            components={{
              event: EventComponent,
              dateCellWrapper: DateCellWrapper
            }}
            messages={{
              next: 'Next',
              previous: 'Previous',
              today: 'Today',
              month: 'Month',
              week: 'Week',
              day: 'Day',
              agenda: 'Agenda',
              noEventsInRange: 'No liturgical events in this range.',
              showMore: (total: number) => `+${total} more`
            }}
            formats={{
              monthHeaderFormat: 'MMMM YYYY',
              dayHeaderFormat: 'dddd MMM DD',
              dayRangeHeaderFormat: ({ start, end }) => 
                `${moment(start).format('MMM DD')} - ${moment(end).format('MMM DD, YYYY')}`
            }}
            style={{ height: '100%' }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default ModernizeLiturgicalCalendar;