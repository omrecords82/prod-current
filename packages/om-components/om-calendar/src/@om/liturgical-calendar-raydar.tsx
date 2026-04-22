/**
 * Raydar Liturgical Calendar - FullCalendar Implementation
 * Sleek FullCalendar-based liturgical calendar with Raydar styling
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Divider,
  Switch,
  FormControlLabel
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
  Celebration,
  ViewModule,
  ViewList,
  ViewWeek
} from '@mui/icons-material';

// FullCalendar imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

import { orthodoxCalendarService } from '@/shared/lib/orthodoxCalendarService';
import {
  OrthodoxCalendarDay,
  CalendarLanguage,
  CalendarType,
  FeastType,
  FastingType
} from '../../../types/orthodox-calendar.types';

interface LiturgicalEvent {
  id: string;
  title: string;
  start: string; // ISO date string for FullCalendar
  end?: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  classNames: string[];
  extendedProps: {
    type: 'feast' | 'fast' | 'commemoration' | 'reading';
    importance: 'major' | 'minor' | 'commemoration';
    fastingType?: FastingType;
    feastType?: FeastType;
    description?: string;
    saints?: string[];
    readings?: string[];
    liturgicalSeason?: string;
  };
}

interface RaydarLiturgicalCalendarProps {
  language?: CalendarLanguage;
  calendarType?: CalendarType;
  onDateSelect?: (date: Date) => void;
  onEventSelect?: (event: LiturgicalEvent) => void;
  height?: number;
  compact?: boolean;
  theme?: 'light' | 'dark';
}

const RaydarLiturgicalCalendar: React.FC<RaydarLiturgicalCalendarProps> = ({
  language = 'en',
  calendarType = 'gregorian',
  onDateSelect,
  onEventSelect,
  height = 600,
  compact = false,
  theme = 'light'
}) => {
  const calendarRef = useRef<FullCalendar>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('dayGridMonth');
  const [liturgicalData, setLiturgicalData] = useState<OrthodoxCalendarDay[]>([]);
  const [events, setEvents] = useState<LiturgicalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showMiniCalendar, setShowMiniCalendar] = useState(!compact);

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

  // Transform liturgical data to FullCalendar events
  useEffect(() => {
    const transformedEvents: LiturgicalEvent[] = [];

    liturgicalData.forEach((dayData) => {
      const eventDate = dayData.date; // Already in ISO format
      
      // Major feasts
      dayData.feasts?.major?.forEach((feast, index) => {
        transformedEvents.push({
          id: `feast-major-${dayData.date}-${index}`,
          title: feast.name,
          start: eventDate,
          allDay: true,
          backgroundColor: theme === 'dark' ? '#f44336' : '#d32f2f',
          borderColor: theme === 'dark' ? '#f44336' : '#d32f2f',
          textColor: 'white',
          classNames: ['liturgical-feast-major'],
          extendedProps: {
            type: 'feast',
            importance: 'major',
            feastType: feast.type || 'movable',
            description: feast.description,
            readings: feast.readings,
            liturgicalSeason: dayData.liturgical_season
          }
        });
      });

      // Minor feasts
      dayData.feasts?.minor?.forEach((feast, index) => {
        transformedEvents.push({
          id: `feast-minor-${dayData.date}-${index}`,
          title: feast.name,
          start: eventDate,
          allDay: true,
          backgroundColor: theme === 'dark' ? '#2196f3' : '#1976d2',
          borderColor: theme === 'dark' ? '#2196f3' : '#1976d2',
          textColor: 'white',
          classNames: ['liturgical-feast-minor'],
          extendedProps: {
            type: 'feast',
            importance: 'minor',
            feastType: feast.type || 'movable',
            description: feast.description,
            readings: feast.readings,
            liturgicalSeason: dayData.liturgical_season
          }
        });
      });

      // Fasting information
      if (dayData.fasting && dayData.fasting.type !== 'none') {
        transformedEvents.push({
          id: `fasting-${dayData.date}`,
          title: `${dayData.fasting.name}`,
          start: eventDate,
          allDay: true,
          backgroundColor: theme === 'dark' ? '#9c27b0' : '#7b1fa2',
          borderColor: theme === 'dark' ? '#9c27b0' : '#7b1fa2',
          textColor: 'white',
          classNames: ['liturgical-fasting'],
          extendedProps: {
            type: 'fast',
            importance: 'minor',
            fastingType: dayData.fasting.type,
            description: dayData.fasting.description,
            liturgicalSeason: dayData.liturgical_season
          }
        });
      }

      // Commemorations/Saints
      dayData.commemorations?.forEach((commemoration, index) => {
        transformedEvents.push({
          id: `commemoration-${dayData.date}-${index}`,
          title: commemoration.name,
          start: eventDate,
          allDay: true,
          backgroundColor: theme === 'dark' ? '#4caf50' : '#388e3c',
          borderColor: theme === 'dark' ? '#4caf50' : '#388e3c',
          textColor: 'white',
          classNames: ['liturgical-commemoration'],
          extendedProps: {
            type: 'commemoration',
            importance: 'commemoration',
            description: commemoration.description,
            saints: [commemoration.name],
            liturgicalSeason: dayData.liturgical_season
          }
        });
      });
    });

    setEvents(transformedEvents);
  }, [liturgicalData, theme]);

  // Navigate calendar
  const navigateCalendar = (direction: 'prev' | 'next' | 'today') => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return;

    switch (direction) {
      case 'prev':
        calendarApi.prev();
        break;
      case 'next':
        calendarApi.next();
        break;
      case 'today':
        calendarApi.today();
        break;
    }
    
    setCurrentDate(calendarApi.getDate());
  };

  // Handle event click
  const handleEventClick = (info: any) => {
    const event: LiturgicalEvent = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.startStr,
      end: info.event.endStr,
      allDay: info.event.allDay,
      backgroundColor: info.event.backgroundColor,
      borderColor: info.event.borderColor,
      textColor: info.event.textColor,
      classNames: info.event.classNames,
      extendedProps: info.event.extendedProps
    };

    if (onEventSelect) {
      onEventSelect(event);
    }
  };

  // Handle date click
  const handleDateClick = (info: any) => {
    if (onDateSelect) {
      onDateSelect(new Date(info.dateStr));
    }
  };

  // Change view
  const handleViewChange = (newView: string) => {
    setView(newView);
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.changeView(newView);
  };

  // Format current date for header
  const formatCurrentDate = () => {
    const calendarApi = calendarRef.current?.getApi();
    const currentDate = calendarApi?.getDate() || new Date();
    
    switch (view) {
      case 'dayGridMonth':
        return currentDate.toLocaleDateString(language, { month: 'long', year: 'numeric' });
      case 'timeGridWeek':
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return `${startOfWeek.toLocaleDateString(language, { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'timeGridDay':
        return currentDate.toLocaleDateString(language, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      case 'listWeek':
        return `Week of ${currentDate.toLocaleDateString(language, { month: 'long', day: 'numeric', year: 'numeric' })}`;
      default:
        return currentDate.toLocaleDateString(language, { month: 'long', year: 'numeric' });
    }
  };

  // Custom CSS for Raydar theme
  const raydarCalendarStyles = `
    .fc {
      font-family: 'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif;
    }
    
    .fc-theme-standard .fc-scrollgrid {
      border: 1px solid ${theme === 'dark' ? '#444' : '#e0e0e0'};
      border-radius: 8px;
    }
    
    .fc-col-header-cell {
      background-color: ${theme === 'dark' ? '#2c2c2c' : '#f8f9fa'};
      font-weight: 600;
      padding: 12px 4px;
    }
    
    .fc-daygrid-day {
      background-color: ${theme === 'dark' ? '#1e1e1e' : '#ffffff'};
      border-color: ${theme === 'dark' ? '#444' : '#e0e0e0'};
    }
    
    .fc-daygrid-day:hover {
      background-color: ${theme === 'dark' ? '#2a2a2a' : '#f5f5f5'};
    }
    
    .fc-daygrid-day-number {
      color: ${theme === 'dark' ? '#ffffff' : '#333333'};
      font-weight: 500;
      padding: 8px;
    }
    
    .fc-event {
      border-radius: 6px;
      border: none !important;
      font-size: 11px;
      font-weight: 500;
      margin: 1px;
      padding: 2px 6px;
    }
    
    .liturgical-feast-major {
      box-shadow: 0 2px 4px rgba(211, 47, 47, 0.3);
    }
    
    .liturgical-feast-minor {
      box-shadow: 0 2px 4px rgba(25, 118, 210, 0.3);
    }
    
    .liturgical-fasting {
      box-shadow: 0 2px 4px rgba(123, 31, 162, 0.3);
    }
    
    .liturgical-commemoration {
      box-shadow: 0 2px 4px rgba(56, 142, 60, 0.3);
    }
    
    .fc-button {
      background: ${theme === 'dark' ? '#333' : '#fff'};
      border: 1px solid ${theme === 'dark' ? '#555' : '#ddd'};
      color: ${theme === 'dark' ? '#fff' : '#333'};
      border-radius: 6px;
      font-weight: 500;
    }
    
    .fc-button:hover {
      background: ${theme === 'dark' ? '#444' : '#f0f0f0'};
    }
    
    .fc-button-active {
      background: #1976d2 !important;
      border-color: #1976d2 !important;
      color: white !important;
    }
    
    .fc-list {
      background: ${theme === 'dark' ? '#1e1e1e' : '#ffffff'};
    }
    
    .fc-list-event {
      border-color: ${theme === 'dark' ? '#444' : '#e0e0e0'};
    }
    
    .fc-list-event-title {
      color: ${theme === 'dark' ? '#ffffff' : '#333333'};
    }
  `;

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
    <>
      <style>{raydarCalendarStyles}</style>
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
              <IconButton onClick={() => navigateCalendar('prev')} size="large">
                <ChevronLeft />
              </IconButton>
              <Typography variant={compact ? "h6" : "h5"} sx={{ minWidth: 200, textAlign: 'center' }}>
                {formatCurrentDate()}
              </Typography>
              <IconButton onClick={() => navigateCalendar('next')} size="large">
                <ChevronRight />
              </IconButton>
              <Button
                variant="outlined"
                startIcon={<Today />}
                onClick={() => navigateCalendar('today')}
                size="small"
              >
                Today
              </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <ButtonGroup size="small">
                <Button 
                  variant={view === 'dayGridMonth' ? 'contained' : 'outlined'}
                  onClick={() => handleViewChange('dayGridMonth')}
                  startIcon={<ViewModule />}
                >
                  Month
                </Button>
                <Button 
                  variant={view === 'timeGridWeek' ? 'contained' : 'outlined'}
                  onClick={() => handleViewChange('timeGridWeek')}
                  startIcon={<ViewWeek />}
                >
                  Week
                </Button>
                <Button 
                  variant={view === 'listWeek' ? 'contained' : 'outlined'}
                  onClick={() => handleViewChange('listWeek')}
                  startIcon={<ViewList />}
                >
                  List
                </Button>
              </ButtonGroup>
              
              {!compact && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={showMiniCalendar}
                      onChange={(e) => setShowMiniCalendar(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Mini Calendar"
                />
              )}
            </Box>
          </Stack>

          {/* Legend */}
          {!compact && (
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Chip 
                icon={<StarBorder />} 
                label="Major Feast" 
                size="small" 
                sx={{ bgcolor: theme === 'dark' ? '#f44336' : '#d32f2f', color: 'white' }} 
              />
              <Chip 
                icon={<Event />} 
                label="Minor Feast" 
                size="small" 
                sx={{ bgcolor: theme === 'dark' ? '#2196f3' : '#1976d2', color: 'white' }} 
              />
              <Chip 
                icon={<Restaurant />} 
                label="Fasting" 
                size="small" 
                sx={{ bgcolor: theme === 'dark' ? '#9c27b0' : '#7b1fa2', color: 'white' }} 
              />
              <Chip 
                icon={<Church />} 
                label="Saints" 
                size="small" 
                sx={{ bgcolor: theme === 'dark' ? '#4caf50' : '#388e3c', color: 'white' }} 
              />
            </Stack>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Calendar Layout */}
          <Grid container spacing={2} sx={{ flexGrow: 1, height: height - 200 }}>
            {showMiniCalendar && !compact && (
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Quick Navigation
                  </Typography>
                  <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin]}
                    initialView="dayGridMonth"
                    height={250}
                    headerToolbar={false}
                    events={events}
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    dayMaxEvents={false}
                    eventDisplay="none"
                  />
                </Paper>
              </Grid>
            )}
            
            <Grid item xs={12} md={showMiniCalendar && !compact ? 9 : 12}>
              <Box sx={{ height: '100%' }}>
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                  initialView={view}
                  headerToolbar={false}
                  height={showMiniCalendar && !compact ? height - 200 : height - 150}
                  events={events}
                  eventClick={handleEventClick}
                  dateClick={handleDateClick}
                  dayMaxEvents={3}
                  moreLinkClick="popover"
                  eventTimeFormat={{
                    hour: 'numeric',
                    minute: '2-digit',
                    omitZeroMinute: true,
                    meridiem: 'short'
                  }}
                  dayHeaderFormat={{ weekday: 'short' }}
                  titleFormat={{ year: 'numeric', month: 'long' }}
                  buttonText={{
                    today: 'Today',
                    month: 'Month',
                    week: 'Week',
                    day: 'Day',
                    list: 'List'
                  }}
                  locale={language}
                  weekNumbers={false}
                  selectable={true}
                  selectMirror={true}
                  nowIndicator={true}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </>
  );
};

export default RaydarLiturgicalCalendar;