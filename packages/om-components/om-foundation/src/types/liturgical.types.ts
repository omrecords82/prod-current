// Liturgical Calendar Types for OrthodMetrics
export interface LiturgicalDay {
  date: string;
  liturgicalColor?: string;
  feasts?: Feast[];
  saints?: Saint[];
  fastingPeriods?: FastingPeriod[];
  events?: CalendarEvent[];
  readings?: LiturgicalReading[];
  tone?: number;
  weekOfYear?: number;
}

export interface Feast {
  id: number;
  name: string;
  date: string;
  rank: 'major' | 'minor' | 'commemoration';
  color: 'red' | 'gold' | 'white' | 'green' | 'purple' | 'blue' | 'black' | 'silver';
  moveable: boolean;
  description?: string;
  importance: 'high' | 'medium' | 'low';
}

export interface Saint {
  id: number;
  name: string;
  feastDay: string;
  feastRank: 'great' | 'major' | 'minor' | 'commemoration';
  patronage?: string[];
  biography?: string;
  iconPath?: string;
  type: 'martyr' | 'bishop' | 'monk' | 'virgin' | 'apostle' | 'prophet' | 'unmercenary' | 'other';
}

export interface FastingPeriod {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  type: 'strict' | 'wine_oil' | 'fish' | 'dairy' | 'none';
  description?: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  time?: string;
  description?: string;
  churchId?: number;
  type: 'service' | 'meeting' | 'special' | 'other';
}

export interface LiturgicalReading {
  id: number;
  date: string;
  type: 'epistle' | 'gospel' | 'old_testament';
  book: string;
  chapter: number;
  verses: string;
  text?: string;
  language: 'en' | 'gr' | 'ru' | 'ro';
}

export interface LiturgicalCalendarFilters {
  startDate: string;
  endDate: string;
  language?: 'en' | 'gr' | 'ru' | 'ro';
  churchId?: number;
  includeFeasts?: boolean;
  includeSaints?: boolean;
  includeFasting?: boolean;
  includeEvents?: boolean;
  calendarType?: 'julian' | 'revised_julian';
}

export interface LiturgicalCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  type: 'feast' | 'saint' | 'fasting' | 'event';
  data: Feast | Saint | FastingPeriod | CalendarEvent;
  description?: string;
  importance?: 'high' | 'medium' | 'low';
}

// Additional types for calendar component
export type CalendarType = 'gregorian' | 'julian' | 'both';
export type Language = 'en' | 'el' | 'ro' | 'ru';
