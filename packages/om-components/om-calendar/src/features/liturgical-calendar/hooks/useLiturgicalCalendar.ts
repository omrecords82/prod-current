/**
 * Hook for managing liturgical calendar state and data fetching.
 */

import { useState, useEffect, useCallback } from 'react';
import { getMonth, getDate, LiturgicalDayData, LiturgicalMonthResponse } from '../api/liturgicalCalendarApi';
import { useChurch } from '@/context/ChurchContext';

interface UseLiturgicalCalendarReturn {
  year: number;
  month: number;
  monthName: string;
  monthData: Record<number, LiturgicalDayData>;
  selectedDay: LiturgicalDayData | null;
  selectedDate: Date | null;
  isLoading: boolean;
  error: string | null;
  setSelectedDate: (date: Date | null) => void;
  goToMonth: (year: number, month: number) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
}

export function useLiturgicalCalendar(): UseLiturgicalCalendarReturn {
  const { churchMetadata } = useChurch();
  const calendarType = churchMetadata?.calendar_type;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [monthName, setMonthName] = useState('');
  const [monthData, setMonthData] = useState<Record<number, LiturgicalDayData>>({});
  const [selectedDay, setSelectedDay] = useState<LiturgicalDayData | null>(null);
  const [selectedDate, setSelectedDateState] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch month data
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getMonth(year, month, calendarType)
      .then((response: LiturgicalMonthResponse) => {
        if (cancelled) return;
        setMonthData(response.data);
        setMonthName(response.monthName);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load liturgical calendar data:', err);
        setError('Unable to load calendar data');
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [year, month, calendarType]);

  // Fetch selected day detail (with local commemorations/parish events)
  const setSelectedDate = useCallback((date: Date | null) => {
    setSelectedDateState(date);
    if (!date) {
      setSelectedDay(null);
      return;
    }

    const dateStr = date.toISOString().split('T')[0];
    getDate(dateStr, calendarType)
      .then((dayData) => {
        setSelectedDay(dayData);
      })
      .catch(() => {
        // Fall back to month data if individual fetch fails
        const day = date.getDate();
        if (monthData[day]) {
          setSelectedDay(monthData[day]);
        }
      });
  }, [monthData]);

  const goToMonth = useCallback((y: number, m: number) => {
    setYear(y);
    setMonth(m);
    setSelectedDay(null);
    setSelectedDateState(null);
  }, []);

  const goToPrevMonth = useCallback(() => {
    if (month === 1) {
      setYear(y => y - 1);
      setMonth(12);
    } else {
      setMonth(m => m - 1);
    }
    setSelectedDay(null);
    setSelectedDateState(null);
  }, [month]);

  const goToNextMonth = useCallback(() => {
    if (month === 12) {
      setYear(y => y + 1);
      setMonth(1);
    } else {
      setMonth(m => m + 1);
    }
    setSelectedDay(null);
    setSelectedDateState(null);
  }, [month]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
    setSelectedDate(today);
  }, [setSelectedDate]);

  return {
    year,
    month,
    monthName,
    monthData,
    selectedDay,
    selectedDate,
    isLoading,
    error,
    setSelectedDate,
    goToMonth,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
  };
}
