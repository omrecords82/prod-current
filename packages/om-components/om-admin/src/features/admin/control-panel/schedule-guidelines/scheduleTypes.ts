/**
 * Orthodox Schedule Guidelines — Shared Types
 */

export type RestrictionLevel = 'allowed' | 'conditional' | 'restricted';
export type SacramentType = 'baptism' | 'marriage' | 'funeral';
export type EventType = 'feast' | 'fast' | 'restriction' | 'memorial' | 'other';
export type ViewMode = 'calendar' | 'timeline' | 'table';
export type CalendarType = 'new' | 'old';

export interface ScheduleEvent {
  name: string;
  eventKey: string;
  startDate: string; // ISO YYYY-MM-DD
  endDate: string;
  type: EventType;
  isMajorFeast: boolean;
  restrictions: {
    baptism: RestrictionLevel;
    marriage: RestrictionLevel;
    funeral: RestrictionLevel;
  };
  explanations: {
    baptism?: string;
    marriage?: string;
    funeral?: string;
    liturgical?: string;
  };
  colorToken?: string;
}

export interface ScheduleDay {
  date: string; // ISO YYYY-MM-DD
  events: ScheduleEvent[];
  restrictions: {
    baptism: RestrictionLevel;
    marriage: RestrictionLevel;
    funeral: RestrictionLevel;
  };
}

export interface ScheduleData {
  days: Map<string, ScheduleDay>;
  events: ScheduleEvent[];
}

/** Raw DB row shape from the API */
export interface GuidelineRow {
  id: number;
  church_id: number | null;
  calendar_type: CalendarType;
  guideline_year: number;
  event_key: string;
  event_name: string;
  event_type: EventType;
  is_major_feast: boolean | number;
  start_date: string;
  end_date: string;
  display_start_date: string | null;
  display_end_date: string | null;
  baptism_rule: RestrictionLevel;
  marriage_rule: RestrictionLevel;
  funeral_rule: RestrictionLevel;
  baptism_note: string | null;
  marriage_note: string | null;
  funeral_note: string | null;
  liturgical_note: string | null;
  color_token: string | null;
  sort_order: number;
  is_active: boolean | number;
}

export interface ScheduleApiResponse {
  success: boolean;
  source: 'database' | 'engine';
  churchId: number;
  year: number;
  calendarType: CalendarType;
  guidelines: GuidelineRow[] | null;
}
