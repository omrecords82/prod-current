// Orthodox Calendar Types - Enhanced for GOarch-style calendar

export interface OrthodoxCalendarDay {
  date: string;
  dayName: string;
  gregorianDate: string;
  julianDate?: string;
  
  // Fasting information
  fastingType: FastingType;
  fastingDescription: string;
  
  // Saints and commemorations
  saints: Saint[];
  feasts: Feast[];
  
  // Liturgical readings
  readings: LiturgicalReadings;
  
  // Additional liturgical info
  tone?: number;
  weekOfYear?: number;
  liturgicalSeason?: string;
  liturgicalRank: LiturgicalRank;
  liturgicalColor?: LiturgicalColor;
  
  // Special day markers
  isSunday: boolean;
  isMajorFeast: boolean;
  isPaschalSeason: boolean;
  
  // Church-specific events
  parishEvents?: ParishEvent[];
}

export type FastingType = 'strict' | 'wine_oil' | 'fish' | 'dairy' | 'fast_free';

export interface FastingInfo {
  type: FastingType;
  label: string;
  description: string;
  color: string;
  backgroundColor: string;
  restrictions: string[];
  allowed: string[];
}

export interface Saint {
  id: number;
  name: string;
  title?: string;
  feastDay: string;
  rank: SaintRank;
  type: SaintType;
  description?: string;
  biography?: string;
  iconUrl?: string;
  patronage?: string[];
  troparion?: string;
  kontakion?: string;
}

export type SaintRank = 'great' | 'major' | 'minor' | 'commemoration';
export type SaintType = 'martyr' | 'hieromartyr' | 'bishop' | 'monk' | 'virgin' | 'apostle' | 'prophet' | 'unmercenary' | 'righteous' | 'wonderworker' | 'confessor' | 'other';

export interface Feast {
  id: number;
  name: string;
  date: string;
  rank: FeastRank;
  type: FeastType;
  moveable: boolean;
  description?: string;
  significance?: string;
  liturgicalColor?: LiturgicalColor;
  troparion?: string;
  kontakion?: string;
}

export type FeastRank = 'great' | 'major' | 'minor' | 'commemoration';
export type FeastType = 'lords_feast' | 'theotokos' | 'apostle' | 'saint' | 'other';
export type LiturgicalRank = 'great_feast' | 'major_feast' | 'minor_feast' | 'saint' | 'commemoration' | 'ordinary';
export type LiturgicalColor = 'red' | 'gold' | 'white' | 'green' | 'purple' | 'blue' | 'black' | 'silver';

export interface LiturgicalReadings {
  matinsGospel?: Reading;
  epistle?: Reading;
  gospel?: Reading;
  oldTestament?: Reading[];
  prokeimenon?: string;
  alleluia?: string;
  communion?: string;
}

export interface Reading {
  book: string;
  chapter: number;
  verses: string;
  reference: string;
  text?: string;
  language?: string;
}

export interface ParishEvent {
  id: number;
  title: string;
  date: string;
  time?: string;
  type: ParishEventType;
  description?: string;
  location?: string;
  recurring?: boolean;
}

export type ParishEventType = 'liturgy' | 'vespers' | 'matins' | 'meeting' | 'education' | 'social' | 'memorial' | 'wedding' | 'baptism' | 'special';

export interface CalendarFilters {
  year: number;
  month?: number;
  language: CalendarLanguage;
  calendarType: CalendarType;
  includeFeasts: boolean;
  includeSaints: boolean;
  includeReadings: boolean;
  includeParishEvents: boolean;
  feastRankFilter?: FeastRank[];
  saintTypeFilter?: SaintType[];
}

export type CalendarLanguage = 'en' | 'el' | 'ru' | 'ro' | 'sr' | 'bg';
export type CalendarType = 'gregorian' | 'julian' | 'both';

export interface CalendarViewOptions {
  viewMode: 'grid' | 'list';
  filter: 'all' | 'saints' | 'readings' | 'feasts';
  showFastingLegend: boolean;
  showTone: boolean;
  showParishEvents: boolean;
}

// API Response types
export interface OrthodoxCalendarResponse {
  success: boolean;
  data: OrthodoxCalendarDay[];
  month: number;
  year: number;
  calendarType: CalendarType;
  language: CalendarLanguage;
  metadata?: {
    totalDays: number;
    majorFeasts: number;
    fastingDays: number;
    paschaDate?: string;
    easterCalculation?: string;
  };
}

export interface CalendarErrorResponse {
  success: false;
  error: string;
  details?: string;
}

// Constants for fasting types (matching GOarch colors and descriptions)
export const FASTING_TYPES: Record<FastingType, FastingInfo> = {
  strict: {
    type: 'strict',
    label: 'Strict Fast',
    description: 'Refrain from meat, fish, oil, wine, dairy, and eggs.',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    restrictions: ['meat', 'fish', 'oil', 'wine', 'dairy', 'eggs'],
    allowed: ['bread', 'vegetables', 'fruits', 'nuts', 'legumes'],
  },
  wine_oil: {
    type: 'wine_oil',
    label: 'Wine & Oil',
    description: 'Wine and oil are allowed. Refrain from meat, fish, dairy, and eggs.',
    color: '#7c3aed',
    backgroundColor: '#faf5ff',
    restrictions: ['meat', 'fish', 'dairy', 'eggs'],
    allowed: ['wine', 'oil', 'bread', 'vegetables', 'fruits', 'nuts', 'legumes'],
  },
  fish: {
    type: 'fish',
    label: 'Fish Allowed',
    description: 'Fish, oil and wine are allowed. Refrain from meat, dairy and eggs.',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    restrictions: ['meat', 'dairy', 'eggs'],
    allowed: ['fish', 'oil', 'wine', 'bread', 'vegetables', 'fruits', 'nuts', 'legumes'],
  },
  dairy: {
    type: 'dairy',
    label: 'Dairy Allowed',
    description: 'Dairy, eggs, fish, oil and wine are allowed. Refrain from meat.',
    color: '#ea580c',
    backgroundColor: '#fff7ed',
    restrictions: ['meat'],
    allowed: ['dairy', 'eggs', 'fish', 'oil', 'wine', 'bread', 'vegetables', 'fruits', 'nuts', 'legumes'],
  },
  fast_free: {
    type: 'fast_free',
    label: 'Fast Free',
    description: 'No fasting restrictions.',
    color: '#16a34a',
    backgroundColor: '#f0fdf4',
    restrictions: [],
    allowed: ['all foods'],
  },
};

// Liturgical seasons
export const LITURGICAL_SEASONS = {
  advent: 'Nativity Fast',
  christmas: 'Christmas Season',
  epiphany: 'Epiphany Season',
  triodion: 'Triodion',
  lent: 'Great Lent',
  holy_week: 'Holy Week',
  pascha: 'Bright Week',
  pentecost: 'Pentecost Season',
  apostles_fast: 'Apostles\' Fast',
  dormition_fast: 'Dormition Fast',
  ordinary: 'Ordinary Time',
};

export default OrthodoxCalendarDay;