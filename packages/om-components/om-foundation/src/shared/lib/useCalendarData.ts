/**
 * Custom hooks for Liturgical Calendar data
 * Provides React Query powered data fetching for liturgical calendar
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, addDays, subDays } from 'date-fns';
import { calendarAPI } from '@/api/calendar.api';
import type {
    LiturgicalDay,
    CalendarMonth,
    Feast,
    Saint,
    CalendarFilters,
    CalendarSettings,
    ShareOptions
} from '@/types/liturgical.types';

// Settings hook
export const useCalendarSettings = () => {
    const [settings, setSettings] = useState<CalendarSettings>({
        calendarSystem: 'gregorian',
        timezone: 'America/New_York',
        language: 'en',
        showJulianDates: false,
        showTones: true,
        showPaschalion: true,
        notifications: {
            dailyReadings: false,
            fastingReminders: false,
            majorFeasts: true,
        }
    });

    const updateSettings = (newSettings: Partial<CalendarSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    return { settings, updateSettings };
};

// Filters hook
export const useCalendarFilters = () => {
    const [filters, setFilters] = useState<CalendarFilters>({
        feastTypes: ['great', 'major', 'minor'],
        saintTypes: [],
        fastingLevels: [],
        searchQuery: '',
    });

    const updateFilters = (newFilters: Partial<CalendarFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    const clearFilters = () => {
        setFilters({
            feastTypes: ['great', 'major', 'minor'],
            saintTypes: [],
            fastingLevels: [],
            searchQuery: '',
        });
    };

    return { filters, updateFilters, clearFilters };
};

// Single day hook
export const useCalendarDay = (date: Date, settings: CalendarSettings) => {
    const dateString = format(date, 'yyyy-MM-dd');

    return useQuery({
        queryKey: ['liturgical-day', dateString, settings.calendarSystem, settings.timezone, settings.language],
        queryFn: () => calendarAPI.liturgical.getDay(dateString, {
            calendarSystem: settings.calendarSystem,
            timezone: settings.timezone,
            language: settings.language,
        }),
        staleTime: 1000 * 60 * 60, // 1 hour
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
    });
};

// Month view hook
export const useCalendarMonth = (date: Date, settings: CalendarSettings) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() returns 0-11, API expects 1-12

    return useQuery({
        queryKey: ['liturgical-month', year, month, settings.calendarSystem, settings.timezone, settings.language],
        queryFn: () => calendarAPI.liturgical.getMonth(year, month, {
            calendarSystem: settings.calendarSystem,
            timezone: settings.timezone,
            language: settings.language,
        }),
        staleTime: 1000 * 60 * 30, // 30 minutes
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
    });
};

// Feasts hook
export const useFeasts = (year?: number, settings?: CalendarSettings) => {
    return useQuery({
        queryKey: ['liturgical-feasts', year, settings?.language],
        queryFn: () => calendarAPI.liturgical.getFeasts({
            year,
            language: settings?.language,
        }),
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
        gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
};

// Next feast hook
export const useNextFeast = (from?: Date) => {
    const fromString = from ? format(from, 'yyyy-MM-dd') : undefined;

    return useQuery({
        queryKey: ['liturgical-next-feast', fromString],
        queryFn: () => calendarAPI.liturgical.getNextFeast(fromString),
        staleTime: 1000 * 60 * 60, // 1 hour
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
    });
};

// Search hook
export const useCalendarSearch = (query: string, filters?: CalendarFilters, settings?: CalendarSettings) => {
    return useQuery({
        queryKey: ['liturgical-search', query, filters, settings?.language],
        queryFn: () => calendarAPI.liturgical.search(query, {
            type: 'all',
            dateRange: filters?.dateRange ? {
                start: format(filters.dateRange.start, 'yyyy-MM-dd'),
                end: format(filters.dateRange.end, 'yyyy-MM-dd'),
            } : undefined,
            language: settings?.language,
            limit: 50,
        }),
        enabled: query.length >= 2, // Only search if query is at least 2 characters
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
    });
};

// Saint search hook
export const useSaintSearch = (query: string, type?: string, settings?: CalendarSettings) => {
    return useQuery({
        queryKey: ['liturgical-saints-search', query, type, settings?.language],
        queryFn: () => calendarAPI.liturgical.searchSaints(query, {
            type,
            language: settings?.language,
            limit: 20,
        }),
        enabled: query.length >= 2,
        staleTime: 1000 * 60 * 10, // 10 minutes
        gcTime: 1000 * 60 * 60, // 1 hour
    });
};

// Saint details hook
export const useSaint = (id: string, settings?: CalendarSettings) => {
    return useQuery({
        queryKey: ['liturgical-saint', id, settings?.language],
        queryFn: () => calendarAPI.liturgical.getSaint(id, settings?.language),
        enabled: !!id,
        staleTime: 1000 * 60 * 60 * 24, // 24 hours
        gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
};

// Readings hook
export const useReadings = (date: Date, feastId?: string, settings?: CalendarSettings) => {
    const dateString = format(date, 'yyyy-MM-dd');

    return useQuery({
        queryKey: ['liturgical-readings', dateString, feastId, settings?.language],
        queryFn: () => calendarAPI.liturgical.getReadings(dateString, {
            feastId,
            type: 'all',
            language: settings?.language,
        }),
        staleTime: 1000 * 60 * 60, // 1 hour
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
    });
};

// Share mutation hook
export const useShareDay = () => {
    return useMutation({
        mutationFn: ({ date, options }: { date: string; options: ShareOptions }) =>
            calendarAPI.liturgical.shareDay(date, options),
    });
};

// Export mutation hook
export const useExportCalendar = () => {
    return useMutation({
        mutationFn: (options: ShareOptions & { dateRange: { start: string; end: string } }) =>
            calendarAPI.liturgical.export(options),
    });
};

// Compound hook for calendar view data
export const useCalendarData = (currentDate: Date, viewType: 'day' | 'week' | 'month' | 'year', settings: CalendarSettings) => {
    const queryClient = useQueryClient();

    // Main data queries based on view type
    const monthQuery = useCalendarMonth(currentDate, settings);
    const dayQuery = useCalendarDay(currentDate, settings);
    const feastsQuery = useFeasts(currentDate.getFullYear(), settings);
    const nextFeastQuery = useNextFeast(currentDate);

    // Prefetch adjacent months for smooth navigation
    const prefetchAdjacentMonths = () => {
        const prevMonth = addDays(startOfMonth(currentDate), -1);
        const nextMonth = addDays(endOfMonth(currentDate), 1);

        queryClient.prefetchQuery({
            queryKey: ['liturgical-month', prevMonth.getFullYear(), prevMonth.getMonth() + 1, settings.calendarSystem, settings.timezone, settings.language],
            queryFn: () => calendarAPI.liturgical.getMonth(prevMonth.getFullYear(), prevMonth.getMonth() + 1, {
                calendarSystem: settings.calendarSystem,
                timezone: settings.timezone,
                language: settings.language,
            }),
            staleTime: 1000 * 60 * 30,
        });

        queryClient.prefetchQuery({
            queryKey: ['liturgical-month', nextMonth.getFullYear(), nextMonth.getMonth() + 1, settings.calendarSystem, settings.timezone, settings.language],
            queryFn: () => calendarAPI.liturgical.getMonth(nextMonth.getFullYear(), nextMonth.getMonth() + 1, {
                calendarSystem: settings.calendarSystem,
                timezone: settings.timezone,
                language: settings.language,
            }),
            staleTime: 1000 * 60 * 30,
        });
    };

    // Computed values
    const isLoading = monthQuery.isLoading || (viewType === 'day' && dayQuery.isLoading);
    const error = monthQuery.error || dayQuery.error;
    const data = viewType === 'day' ? dayQuery.data : monthQuery.data;

    return {
        data,
        dayData: dayQuery.data,
        monthData: monthQuery.data,
        feasts: feastsQuery.data,
        nextFeast: nextFeastQuery.data,
        isLoading,
        error,
        refetch: () => {
            monthQuery.refetch();
            if (viewType === 'day') dayQuery.refetch();
            feastsQuery.refetch();
            nextFeastQuery.refetch();
        },
        prefetchAdjacentMonths,
    };
};
