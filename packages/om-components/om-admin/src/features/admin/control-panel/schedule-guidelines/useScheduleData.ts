/**
 * Orthodox Schedule Guidelines — Data Loading Hook
 *
 * Loads schedule data from the backend API. If the API returns
 * source='database', uses DB rows. Otherwise falls back to the
 * client-side restriction engine.
 */

import { useState, useEffect, useMemo } from 'react';
import apiClient from '@/api/utils/axiosInstance';
import { normalizeScheduleData } from './scheduleAdapter';
import type { ScheduleData, ScheduleApiResponse, CalendarType } from './scheduleTypes';

interface UseScheduleDataResult {
  data: ScheduleData;
  source: 'database' | 'engine';
  loading: boolean;
  error: string | null;
}

// Default empty schedule
const EMPTY_SCHEDULE: ScheduleData = { days: new Map(), events: [] };

export function useScheduleData(
  churchId: number,
  year: number,
  calendarType: CalendarType,
): UseScheduleDataResult {
  const [apiSource, setApiSource] = useState<'database' | 'engine'>('engine');
  const [apiRows, setApiRows] = useState<ScheduleApiResponse['guidelines']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient
      .get(`/admin/orthodox-schedule-guidelines/${churchId}`, {
        params: { year, calendarType },
      })
      .then((res) => {
        if (cancelled) return;
        const payload: ScheduleApiResponse = res.data;
        setApiSource(payload.source);
        setApiRows(payload.guidelines);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[useScheduleData] API error, falling back to engine:', err.message);
        setApiSource('engine');
        setApiRows(null);
        setError(null); // Silently fall back — not a user-facing error
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [churchId, year, calendarType]);

  const data = useMemo<ScheduleData>(() => {
    if (loading) return EMPTY_SCHEDULE;
    return normalizeScheduleData(apiSource, {
      year,
      calendar: calendarType,
      dbRows: apiSource === 'database' && apiRows ? apiRows : undefined,
    });
  }, [loading, apiSource, apiRows, year, calendarType]);

  return { data, source: apiSource, loading, error };
}
