/**
 * Liturgical Calendar API Service
 *
 * Clean API client for the Orthodox liturgical calendar backend.
 * Uses the shared apiClient (auto-prepends /api).
 */

import apiClient from '@/api/utils/axiosInstance';

// ============================================================
// Types
// ============================================================

export interface LiturgicalSaint {
  name: string;
  description: string;
  type?: string;
}

export interface LiturgicalReadings {
  epistle: string | null;
  gospel: string | null;
}

export interface LiturgicalFasting {
  level: 'strict' | 'wine_oil' | 'fish' | 'dairy' | 'fast_free';
  description: string;
}

export interface LiturgicalDayData {
  date: string;
  dayOfWeek: string;
  tone: number | null;
  season: string;
  liturgicalColor: string;
  feastName: string | null;
  feastRank: 'great' | 'major' | 'minor' | 'commemoration' | 'ordinary';
  saints: LiturgicalSaint[];
  readings: LiturgicalReadings | null;
  fasting: LiturgicalFasting;
  isHolyWeek: boolean;
  isFastFree: boolean;
  isSunday: boolean;
  paschaDate: string;
  calendarType?: string;
  oldStyleDate?: string;
  localCommemorations?: any[];
  parishEvents?: any[];
}

export interface LiturgicalColorResponse {
  color: string;
  themeName: string;
  season: string;
  feastName: string | null;
  date: string;
}

export interface LiturgicalMonthResponse {
  year: number;
  month: number;
  monthName: string;
  data: Record<number, LiturgicalDayData>;
}

// ============================================================
// API Methods
// ============================================================

/**
 * Get today's liturgical color and corresponding theme name.
 */
export async function getLiturgicalColorToday(calendarType?: string): Promise<LiturgicalColorResponse> {
  const params = calendarType ? `?calendarType=${encodeURIComponent(calendarType)}` : '';
  return apiClient.get<LiturgicalColorResponse>(`/orthodox-calendar/liturgical-color/today${params}`);
}

/**
 * Get full liturgical data for today.
 */
export async function getToday(): Promise<LiturgicalDayData> {
  return apiClient.get<LiturgicalDayData>('/orthodox-calendar/today');
}

/**
 * Get full liturgical data for a specific date.
 * @param date - ISO date string (YYYY-MM-DD)
 */
export async function getDate(date: string, calendarType?: string): Promise<LiturgicalDayData> {
  const params = calendarType ? `?calendarType=${encodeURIComponent(calendarType)}` : '';
  return apiClient.get<LiturgicalDayData>(`/orthodox-calendar/date/${date}${params}`);
}

/**
 * Get liturgical data for an entire month.
 * @param year - Full year (e.g. 2026)
 * @param month - Month number 1-12
 */
export async function getMonth(year: number, month: number, calendarType?: string): Promise<LiturgicalMonthResponse> {
  const params = calendarType ? `?calendarType=${encodeURIComponent(calendarType)}` : '';
  return apiClient.get<LiturgicalMonthResponse>(`/orthodox-calendar/month/${year}/${month}${params}`);
}

/**
 * Get Pascha date for a given year.
 */
export async function getPascha(year: number): Promise<{ year: number; pascha: string; paschaFormatted: string }> {
  return apiClient.get(`/orthodox-calendar/pascha/${year}`);
}

/**
 * Get current liturgical season info.
 */
export async function getSeason(): Promise<{ season: string; liturgicalColor: string; tone: number | null; date: string }> {
  return apiClient.get('/orthodox-calendar/season');
}

/**
 * Search saints by name.
 */
export async function searchSaints(query: string): Promise<any[]> {
  return apiClient.get(`/orthodox-calendar/saints/search?q=${encodeURIComponent(query)}`);
}

/**
 * Search feasts by name.
 */
export async function searchFeasts(query: string): Promise<any[]> {
  return apiClient.get(`/orthodox-calendar/feasts/search?q=${encodeURIComponent(query)}`);
}
