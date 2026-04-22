// Orthodox Calendar API Service - Enhanced for GOarch-style functionality
import { apiClient } from '@/api/utils/axiosInstance';
import type {
    CalendarLanguage,
    CalendarType,
    Feast,
    LiturgicalReadings,
    OrthodoxCalendarDay,
    OrthodoxCalendarResponse,
    ParishEvent,
    Saint
} from '@/types/orthodox-calendar.types';

class OrthodoxCalendarService {
  private async apiRequest<T>(url: string): Promise<T> {
    // Strip /api prefix if present — apiClient adds it automatically
    const cleanUrl = url.startsWith('/api') ? url.slice(4) : url;
    return apiClient.get<T>(cleanUrl);
  }

  /**
   * Get Orthodox calendar data for a specific month
   */
  async getCalendarMonth(
    year: number,
    month: number,
    language: CalendarLanguage = 'en',
    calendarType: CalendarType = 'gregorian'
  ): Promise<OrthodoxCalendarDay[]> {
    try {
      const response = await this.apiRequest<OrthodoxCalendarResponse>(
        `/api/calendar/month/${year}/${month}?lang=${language}&type=${calendarType}`
      );
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch calendar month:', error);
      // Return mock data for development
      return this.generateMockCalendarData(year, month);
    }
  }

  /**
   * Get calendar data for a specific date
   */
  async getCalendarDate(
    date: string,
    language: CalendarLanguage = 'en'
  ): Promise<OrthodoxCalendarDay | null> {
    try {
      const response = await this.apiRequest<{ data: OrthodoxCalendarDay }>(
        `/api/calendar/date/${date}?lang=${language}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch calendar date:', error);
      return null;
    }
  }

  /**
   * Get today's liturgical information
   */
  async getToday(language: CalendarLanguage = 'en'): Promise<OrthodoxCalendarDay | null> {
    try {
      const response = await this.apiRequest<{ data: OrthodoxCalendarDay }>(
        `/api/calendar/today?lang=${language}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch today\'s data:', error);
      return null;
    }
  }

  /**
   * Get saints for a specific date
   */
  async getSaintsByDate(date: string, language: CalendarLanguage = 'en'): Promise<Saint[]> {
    try {
      const response = await this.apiRequest<{ data: Saint[] }>(
        `/api/calendar/saints?date=${date}&lang=${language}`
      );
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch saints:', error);
      return [];
    }
  }

  /**
   * Get feasts for a specific date
   */
  async getFeastsByDate(date: string, language: CalendarLanguage = 'en'): Promise<Feast[]> {
    try {
      const response = await this.apiRequest<{ data: Feast[] }>(
        `/api/calendar/feasts?date=${date}&lang=${language}`
      );
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch feasts:', error);
      return [];
    }
  }

  /**
   * Get liturgical readings for a date
   */
  async getReadings(date: string, language: CalendarLanguage = 'en'): Promise<LiturgicalReadings | null> {
    try {
      const response = await this.apiRequest<{ data: LiturgicalReadings }>(
        `/api/calendar/readings?date=${date}&lang=${language}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch readings:', error);
      return null;
    }
  }

  /**
   * Get Pascha (Easter) date for a specific year
   */
  async getPaschaDate(year: number): Promise<string | null> {
    try {
      const response = await this.apiRequest<{ paschaDate: string }>(
        `/api/calendar/pascha/${year}`
      );
      return response.paschaDate;
    } catch (error) {
      console.error('Failed to fetch Pascha date:', error);
      return null;
    }
  }

  /**
   * Get parish events for a date range
   */
  async getParishEvents(
    startDate: string,
    endDate: string,
    churchId?: number
  ): Promise<ParishEvent[]> {
    try {
      const url = churchId 
        ? `/api/calendar/events/${churchId}?start=${startDate}&end=${endDate}`
        : `/api/calendar/events?start=${startDate}&end=${endDate}`;
      
      const response = await this.apiRequest<{ data: ParishEvent[] }>(url);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch parish events:', error);
      return [];
    }
  }

  /**
   * Search saints by name
   */
  async searchSaints(query: string, language: CalendarLanguage = 'en'): Promise<Saint[]> {
    try {
      const response = await this.apiRequest<{ data: Saint[] }>(
        `/api/calendar/saints/search?q=${encodeURIComponent(query)}&lang=${language}`
      );
      return response.data || [];
    } catch (error) {
      console.error('Failed to search saints:', error);
      return [];
    }
  }

  /**
   * Search feasts by name
   */
  async searchFeasts(query: string, language: CalendarLanguage = 'en'): Promise<Feast[]> {
    try {
      const response = await this.apiRequest<{ data: Feast[] }>(
        `/api/calendar/feasts/search?q=${encodeURIComponent(query)}&lang=${language}`
      );
      return response.data || [];
    } catch (error) {
      console.error('Failed to search feasts:', error);
      return [];
    }
  }

  /**
   * Generate mock calendar data for development/testing
   */
  private generateMockCalendarData(year: number, month: number): OrthodoxCalendarDay[] {
    const daysInMonth = new Date(year, month, 0).getDate();
    const data: OrthodoxCalendarDay[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const isSunday = dayOfWeek === 0;
      
      // Determine fasting type based on day of week and special periods
      let fastingType: any = 'fast_free';
      if (dayOfWeek === 3 || dayOfWeek === 5) { // Wednesday, Friday
        fastingType = 'strict';
      } else if (dayOfWeek === 6) { // Saturday
        fastingType = 'wine_oil';
      }

      // Sample saints based on day
      const saints = [
        {
          id: day,
          name: `Saint ${day % 12 === 0 ? 'Nicholas' : day % 7 === 0 ? 'John Chrysostom' : day % 5 === 0 ? 'Basil the Great' : `Example ${day}`}`,
          feastDay: dateStr,
          rank: day % 10 === 0 ? 'great' : day % 5 === 0 ? 'major' : 'minor',
          type: day % 8 === 0 ? 'hieromartyr' : day % 6 === 0 ? 'bishop' : 'martyr',
        } as Saint,
      ];

      // Sample feasts for major days
      const feasts = day % 7 === 0 ? [
        {
          id: day,
          name: `Feast of ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
          date: dateStr,
          rank: 'major',
          type: 'saint',
          moveable: false,
        } as Feast,
      ] : [];

      // Sample readings
      const readings = {
        epistle: {
          book: day % 2 === 0 ? 'Romans' : 'I Corinthians',
          chapter: Math.floor(day / 3) + 1,
          verses: `${day % 20 + 1}-${day % 20 + 10}`,
          reference: `${day % 2 === 0 ? 'Romans' : 'I Corinthians'} ${Math.floor(day / 3) + 1}:${day % 20 + 1}-${day % 20 + 10}`,
        },
        gospel: {
          book: day % 3 === 0 ? 'Matthew' : day % 3 === 1 ? 'Mark' : 'Luke',
          chapter: Math.floor(day / 4) + 1,
          verses: `${day % 15 + 1}-${day % 15 + 8}`,
          reference: `${day % 3 === 0 ? 'Matthew' : day % 3 === 1 ? 'Mark' : 'Luke'} ${Math.floor(day / 4) + 1}:${day % 15 + 1}-${day % 15 + 8}`,
        },
        ...(isSunday && {
          matinsGospel: {
            book: 'John',
            chapter: Math.floor(day / 5) + 1,
            verses: `${day % 12 + 1}-${day % 12 + 6}`,
            reference: `John ${Math.floor(day / 5) + 1}:${day % 12 + 1}-${day % 12 + 6}`,
          },
        }),
      };

      data.push({
        date: dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
        gregorianDate: dateStr,
        fastingType,
        fastingDescription: this.getFastingDescription(fastingType),
        saints,
        feasts,
        readings,
        tone: isSunday ? (day % 8) + 1 : undefined,
        liturgicalRank: day % 10 === 0 ? 'great_feast' : day % 5 === 0 ? 'major_feast' : 'ordinary',
        isSunday,
        isMajorFeast: day % 10 === 0,
        isPaschalSeason: false,
      });
    }

    return data;
  }

  private getFastingDescription(fastingType: string): string {
    const descriptions = {
      strict: 'Refrain from meat, fish, oil, wine, dairy, and eggs.',
      wine_oil: 'Wine and oil are allowed. Refrain from meat, fish, dairy, and eggs.',
      fish: 'Fish, oil and wine are allowed. Refrain from meat, dairy and eggs.',
      dairy: 'Dairy, eggs, fish, oil and wine are allowed. Refrain from meat.',
      fast_free: 'No fasting restrictions.',
    };
    return descriptions[fastingType as keyof typeof descriptions] || 'No fasting restrictions.';
  }
}

// Export singleton instance
export const orthodoxCalendarService = new OrthodoxCalendarService();
export default orthodoxCalendarService;