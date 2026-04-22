/**
 * Monthly Liturgical Calendar Component
 * Displays Orthodox liturgical calendar in monthly grid format
 * Inspired by GOARCH calendar with royal purple and gold theme
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  IconButton,
  Button,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Card,
  CardContent,
  Badge
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  Church,
  Star,
  Restaurant,
  Celebration,
  MenuBook,
  AutoAwesome
} from '@mui/icons-material';
import dayjs, { Dayjs } from 'dayjs';

import { orthodoxCalendarService } from '@/shared/lib/orthodoxCalendarService';
import {
  OrthodoxCalendarDay,
  CalendarLanguage,
  CalendarType,
  FeastType,
  FastingType
} from '../../../types/orthodox-calendar.types';

// Brand colors
const brand = {
  purple: '#4C1D95',      // royal purple
  purpleDark: '#2E1065',  // deeper purple
  purpleLight: '#7C3AED', // lighter purple
  gold: '#F6C90E',        // gold
  goldDark: '#D4A80A',    // deeper gold
  goldLight: '#FDE047',   // lighter gold
  white: '#FFFFFF',
  gray: '#F8FAFC',        // lighter gray for better contrast
  grayDark: '#475569',    // darker gray for better readability
  grayLight: '#E2E8F0'    // light gray for borders
};

// Fasting type colors and labels
const FASTING_COLORS = {
  'strict': { bg: '#DC2626', text: '#FFFFFF', label: 'Strict Fast' },
  'wine': { bg: '#9333EA', text: '#FFFFFF', label: 'Wine & Oil' },
  'fish': { bg: '#2563EB', text: '#FFFFFF', label: 'Fish Allowed' },
  'dairy': { bg: '#EA580C', text: '#FFFFFF', label: 'Dairy Allowed' },
  'none': { bg: '#F59E0B', text: '#FFFFFF', label: 'Fast Free' }
};

interface MonthlyLiturgicalCalendarProps {
  language?: CalendarLanguage;
  calendarType?: CalendarType;
  onDateSelect?: (date: Date) => void;
  onEventSelect?: (event: any) => void;
  height?: number;
}

const MonthlyLiturgicalCalendar: React.FC<MonthlyLiturgicalCalendarProps> = ({
  language = 'en',
  calendarType = 'gregorian',
  onDateSelect,
  onEventSelect,
  height = 800
}) => {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [liturgicalData, setLiturgicalData] = useState<OrthodoxCalendarDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Get month data
  const monthData = useMemo(() => {
    const year = currentDate.year();
    const month = currentDate.month();
    const daysInMonth = currentDate.daysInMonth();
    const firstDayOfMonth = dayjs(new Date(year, month, 1));
    const firstDayWeekday = firstDayOfMonth.day(); // 0 = Sunday
    
    const days = [];
    
    // Add previous month's days to fill first week
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const prevDate = firstDayOfMonth.subtract(i + 1, 'day');
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        dayNumber: prevDate.date(),
        liturgicalData: null
      });
    }
    
    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = dayjs(new Date(year, month, i));
      const liturgicalDay = liturgicalData.find(d => 
        d.date === date.format('YYYY-MM-DD')
      );
      
      days.push({
        date,
        isCurrentMonth: true,
        dayNumber: i,
        liturgicalData: liturgicalDay || null
      });
    }
    
    // Add next month's days to fill last week
    const lastDayOfMonth = dayjs(new Date(year, month, daysInMonth));
    const lastDayWeekday = lastDayOfMonth.day();
    for (let i = 1; i <= 6 - lastDayWeekday; i++) {
      const nextDate = lastDayOfMonth.add(i, 'day');
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        dayNumber: nextDate.date(),
        liturgicalData: null
      });
    }
    
    return days;
  }, [currentDate, liturgicalData]);

  // Load liturgical data for the current month
  useEffect(() => {
    const loadLiturgicalData = async () => {
      setLoading(true);
      setError('');
      
      try {
        const year = currentDate.year();
        const month = currentDate.month() + 1;
        const data = await orthodoxCalendarService.getCalendarMonth(year, month, language, calendarType);
        setLiturgicalData(data);
      } catch (err) {
        setError('Failed to load liturgical data');
        console.error('Error loading liturgical data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLiturgicalData();
  }, [currentDate, language, calendarType]);

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(prev => prev.subtract(1, 'month'));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => prev.add(1, 'month'));
  };

  const goToToday = () => {
    setCurrentDate(dayjs());
  };

  // Get fasting type color
  const getFastingColor = (fastingType: FastingType) => {
    return FASTING_COLORS[fastingType] || FASTING_COLORS.none;
  };

  // Get feast importance color
  const getFeastColor = (feastType: FeastType) => {
    switch (feastType) {
      case 'major':
        return brand.gold;
      case 'minor':
        return brand.purpleLight;
      case 'commemoration':
        return brand.grayDark;
      default:
        return brand.grayDark;
    }
  };

  // Render calendar day
  const renderCalendarDay = (day: any) => {
    const isToday = day.date.isSame(dayjs(), 'day');
    const hasLiturgicalData = day.liturgicalData;
    
    return (
      <Paper
        key={day.date.format('YYYY-MM-DD')}
        elevation={isToday ? 4 : 1}
        sx={{
          height: 140,
          p: 1.5,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          border: isToday ? `3px solid ${brand.gold}` : `1px solid ${brand.grayLight}`,
          bgcolor: day.isCurrentMonth ? 'white' : '#F1F5F9',
          '&:hover': {
            elevation: 6,
            transform: 'translateY(-2px)',
            boxShadow: `0 12px 30px rgba(76, 29, 149, 0.2)`,
            borderColor: brand.purpleLight
          }
        }}
        onClick={() => onDateSelect?.(day.date.toDate())}
      >
        {/* Day Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: isToday ? 800 : 700,
              color: day.isCurrentMonth ? brand.purpleDark : brand.grayDark,
              fontSize: '1.1rem',
              lineHeight: 1.2
            }}
          >
            {day.dayNumber}
          </Typography>
          
          {/* Fasting indicator */}
          {hasLiturgicalData?.fastingType && (
            <Tooltip title={getFastingColor(hasLiturgicalData.fastingType).label}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: getFastingColor(hasLiturgicalData.fastingType).bg,
                  border: `2px solid ${brand.white}`,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              />
            </Tooltip>
          )}
        </Box>

        {/* Liturgical Content */}
        {hasLiturgicalData && (
          <Box sx={{ height: 100, overflow: 'hidden' }}>
            {/* Main feast */}
            {hasLiturgicalData.mainFeast && (
              <Typography
                variant="body2"
                sx={{
                  display: 'block',
                  fontWeight: 700,
                  color: getFeastColor(hasLiturgicalData.mainFeast.type),
                  fontSize: '0.8rem',
                  lineHeight: 1.3,
                  mb: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}
              >
                {hasLiturgicalData.mainFeast.name}
              </Typography>
            )}

            {/* Saints count */}
            {hasLiturgicalData.saints && hasLiturgicalData.saints.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                <Star sx={{ fontSize: '0.9rem', color: brand.gold, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }} />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.75rem',
                    color: brand.purpleDark,
                    fontWeight: 600,
                    lineHeight: 1.2
                  }}
                >
                  {hasLiturgicalData.saints.length} saint{hasLiturgicalData.saints.length > 1 ? 's' : ''}
                </Typography>
              </Box>
            )}

            {/* Readings indicator */}
            {hasLiturgicalData.readings && hasLiturgicalData.readings.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <MenuBook sx={{ fontSize: '0.9rem', color: brand.purpleLight, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }} />
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.75rem',
                    color: brand.purpleDark,
                    fontWeight: 600,
                    lineHeight: 1.2
                  }}
                >
                  {hasLiturgicalData.readings.length} reading{hasLiturgicalData.readings.length > 1 ? 's' : ''}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Empty state for days without liturgical data */}
        {!hasLiturgicalData && day.isCurrentMonth && (
          <Box sx={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography
              variant="caption"
              sx={{
                color: brand.grayDark,
                fontStyle: 'italic',
                fontSize: '0.7rem',
                opacity: 0.6
              }}
            >
              No events
            </Typography>
          </Box>
        )}
      </Paper>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
        <CircularProgress sx={{ color: brand.purple }} size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ height, bgcolor: 'white', borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      {/* Calendar Header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${brand.purple} 0%, ${brand.purpleDark} 100%)`,
          color: 'white',
          p: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 20px rgba(76, 29, 149, 0.3)'
        }}
      >
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 800,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            letterSpacing: '0.5px'
          }}
        >
          {currentDate.format('MMMM YYYY')}
        </Typography>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Today />}
            onClick={goToToday}
            sx={{
              color: brand.white,
              borderColor: brand.white,
              borderWidth: 2,
              px: 3,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              '&:hover': {
                borderColor: brand.gold,
                bgcolor: 'rgba(246, 201, 14, 0.15)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(246, 201, 14, 0.3)'
              }
            }}
          >
            Today
          </Button>
          
          <IconButton
            onClick={goToPreviousMonth}
            sx={{
              color: brand.white,
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              width: 48,
              height: 48,
              '&:hover': { 
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                transform: 'scale(1.1)'
              }
            }}
          >
            <ChevronLeft sx={{ fontSize: 28 }} />
          </IconButton>
          
          <IconButton
            onClick={goToNextMonth}
            sx={{
              color: brand.white,
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              width: 48,
              height: 48,
              '&:hover': { 
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                transform: 'scale(1.1)'
              }
            }}
          >
            <ChevronRight sx={{ fontSize: 28 }} />
          </IconButton>
        </Stack>
      </Box>

      {/* Weekday Headers */}
      <Box sx={{ bgcolor: brand.gray, p: 3, borderBottom: `1px solid ${brand.grayLight}` }}>
        <Grid container spacing={2}>
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
            <Grid item xs key={day}>
              <Typography
                variant="h6"
                sx={{
                  textAlign: 'center',
                  fontWeight: 700,
                  color: brand.purpleDark,
                  fontSize: '1rem',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}
              >
                {day.slice(0, 3)}
              </Typography>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Calendar Grid */}
      <Box sx={{ p: 3, flex: 1, bgcolor: brand.gray }}>
        <Grid container spacing={2}>
          {monthData.map((day) => (
            <Grid item xs key={day.date.format('YYYY-MM-DD')}>
              {renderCalendarDay(day)}
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Fasting Legend */}
      <Box sx={{ p: 4, bgcolor: 'white', borderTop: `2px solid ${brand.purpleLight}` }}>
        <Typography 
          variant="h5" 
          sx={{ 
            color: brand.purpleDark, 
            mb: 3, 
            fontWeight: 700,
            textAlign: 'center',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          Fasting Legend
        </Typography>
        <Grid container spacing={3} justifyContent="center">
          {Object.entries(FASTING_COLORS).map(([key, value]) => (
            <Grid item key={key}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: value.bg,
                    border: `3px solid ${brand.white}`,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                  }}
                />
                <Typography
                  variant="body1"
                  sx={{
                    color: brand.purpleDark,
                    fontWeight: 600,
                    fontSize: '1rem',
                    letterSpacing: '0.3px'
                  }}
                >
                  {value.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default MonthlyLiturgicalCalendar;
