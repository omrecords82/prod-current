/**
 * Orthodox Schedule Guidelines — Data Adapter
 *
 * Two input paths, one normalised output.
 * A. Engine: existing getRestrictionsForYear() + validators
 * B. Database: rows from orthodox_schedule_guidelines table
 *
 * No hybrid mixing — either full DB or full engine.
 */

import {
  getRestrictionsForYear,
  calculatePascha,
  getBaptismDateRestriction,
  getMarriageDateRestriction,
  type OrthodoxCalendar,
  type RestrictionPeriod,
} from '@/shared/lib/sacramentalDateRestrictions';

import type {
  ScheduleData,
  ScheduleDay,
  ScheduleEvent,
  RestrictionLevel,
  GuidelineRow,
  CalendarType,
} from './scheduleTypes';

// ─── Constants ─────────────────────────────────────────────

const DAY_MS = 86_400_000;

const MAJOR_FEAST_LABELS = new Set([
  'Pascha',
  'Nativity of Christ',
  'Christmas–Theophany',
  'Theophany',
  'Annunciation',
  'Transfiguration',
  'Dormition of the Theotokos',
  'Elevation of the Cross',
  'Presentation',
  'Pentecost',
  'Ascension',
  'Palm Sunday',
  'Beheading of St. John',
  'Nativity of the Theotokos',
]);

const FAST_LABELS = new Set([
  'Great Lent',
  'Holy Week',
  'Dormition Fast',
  'Nativity Fast',
  "Apostles' Fast",
]);

// ─── Helpers ───────────────────────────────────────────────

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function eachDayInRange(startISO: string, endISO: string): string[] {
  const dates: string[] = [];
  let cur = new Date(startISO + 'T12:00:00');
  const end = new Date(endISO + 'T12:00:00');
  while (cur <= end) {
    dates.push(toISO(cur));
    cur = new Date(cur.getTime() + DAY_MS);
  }
  return dates;
}

function severityToLevel(severity: 'error' | 'warning'): RestrictionLevel {
  return severity === 'error' ? 'restricted' : 'conditional';
}

function mergeRestriction(current: RestrictionLevel, incoming: RestrictionLevel): RestrictionLevel {
  const order: Record<RestrictionLevel, number> = { restricted: 2, conditional: 1, allowed: 0 };
  return order[incoming] > order[current] ? incoming : current;
}

// ─── Engine Adapter ────────────────────────────────────────

/**
 * Group flat RestrictionPeriod[] into contiguous events by label + sacrament.
 */
function groupPeriodsIntoEvents(periods: RestrictionPeriod[]): ScheduleEvent[] {
  // Group by label
  const labelMap = new Map<string, RestrictionPeriod[]>();
  for (const p of periods) {
    const key = p.label;
    const arr = labelMap.get(key);
    if (arr) arr.push(p);
    else labelMap.set(key, [p]);
  }

  const events: ScheduleEvent[] = [];

  for (const [label, labelPeriods] of labelMap) {
    // Get unique dates sorted
    const uniqueDates = [...new Set(labelPeriods.map((p) => p.date))].sort();
    if (uniqueDates.length === 0) continue;

    // Determine type
    const isFast = FAST_LABELS.has(label);
    const isFeast = !isFast && MAJOR_FEAST_LABELS.has(label);
    const type = isFast ? 'fast' : isFeast ? 'feast' : 'restriction';

    // Compute restriction levels from all periods with this label
    let baptism: RestrictionLevel = 'allowed';
    let marriage: RestrictionLevel = 'allowed';
    let funeral: RestrictionLevel = 'allowed';

    for (const p of labelPeriods) {
      const level = severityToLevel(p.severity);
      if (p.sacrament === 'baptism') baptism = mergeRestriction(baptism, level);
      if (p.sacrament === 'marriage') marriage = mergeRestriction(marriage, level);
      if (p.sacrament === 'funeral') funeral = mergeRestriction(funeral, level);
    }

    // Build explanations from the restriction messages
    const explanations: ScheduleEvent['explanations'] = {};
    if (baptism !== 'allowed') {
      const sample = labelPeriods.find((p) => p.sacrament === 'baptism');
      if (sample) explanations.baptism = `Baptisms: ${label}`;
    }
    if (marriage !== 'allowed') {
      const sample = labelPeriods.find((p) => p.sacrament === 'marriage');
      if (sample) explanations.marriage = `Marriages: ${label}`;
    }
    if (funeral !== 'allowed') {
      const sample = labelPeriods.find((p) => p.sacrament === 'funeral');
      if (sample) explanations.funeral = `Funerals: ${label}`;
    }

    // Split into contiguous date ranges to avoid spanning gaps
    // (e.g. Christmas–Theophany covers Jan 1-6 AND Dec 25-31, not the whole year)
    const contiguousRanges: { start: string; end: string }[] = [];
    let rangeStart = uniqueDates[0];
    let rangeEnd = uniqueDates[0];

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevTime = new Date(rangeEnd + 'T12:00:00').getTime();
      const curTime = new Date(uniqueDates[i] + 'T12:00:00').getTime();
      if (curTime - prevTime <= DAY_MS + 1000) {
        // Contiguous — extend the range
        rangeEnd = uniqueDates[i];
      } else {
        // Gap detected — close current range and start new one
        contiguousRanges.push({ start: rangeStart, end: rangeEnd });
        rangeStart = uniqueDates[i];
        rangeEnd = uniqueDates[i];
      }
    }
    contiguousRanges.push({ start: rangeStart, end: rangeEnd });

    for (const range of contiguousRanges) {
      events.push({
        name: label,
        eventKey: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        startDate: range.start,
        endDate: range.end,
        type,
        isMajorFeast: MAJOR_FEAST_LABELS.has(label),
        restrictions: { baptism, marriage, funeral },
        explanations,
      });
    }
  }

  // Sort by start date
  events.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return events;
}

/**
 * Build the day map from events.
 */
function buildDayMap(events: ScheduleEvent[]): Map<string, ScheduleDay> {
  const days = new Map<string, ScheduleDay>();

  for (const event of events) {
    const dates = eachDayInRange(event.startDate, event.endDate);
    for (const date of dates) {
      let day = days.get(date);
      if (!day) {
        day = {
          date,
          events: [],
          restrictions: { baptism: 'allowed', marriage: 'allowed', funeral: 'allowed' },
        };
        days.set(date, day);
      }
      day.events.push(event);
      day.restrictions.baptism = mergeRestriction(day.restrictions.baptism, event.restrictions.baptism);
      day.restrictions.marriage = mergeRestriction(day.restrictions.marriage, event.restrictions.marriage);
      day.restrictions.funeral = mergeRestriction(day.restrictions.funeral, event.restrictions.funeral);
    }
  }

  return days;
}

/**
 * Adapt data from the existing client-side restriction engine.
 */
export function adaptEngineSchedule(year: number, calendar: CalendarType): ScheduleData {
  const periods = getRestrictionsForYear(year, calendar as OrthodoxCalendar);

  // Also add Pascha as a feast event (it only appears as restriction in some sacraments)
  const pascha = calculatePascha(year);
  const paschaISO = toISO(pascha);
  const hasPaschaRestriction = periods.some((p) => p.date === paschaISO);

  // Use per-date validators to enrich funeral data
  // The engine already provides this via getRestrictionsForYear

  const events = groupPeriodsIntoEvents(periods);

  // Ensure Pascha appears as a feast even if only referenced as a restriction
  if (!events.find((e) => e.name === 'Pascha' && e.type === 'feast')) {
    const paschaEvent = events.find((e) => e.name === 'Pascha');
    if (paschaEvent) {
      paschaEvent.type = 'feast';
      paschaEvent.isMajorFeast = true;
    }
  }

  const days = buildDayMap(events);
  return { days, events };
}

// ─── Database Adapter ──────────────────────────────────────

/**
 * Adapt data from DB rows (orthodox_schedule_guidelines).
 */
export function adaptDatabaseSchedule(rows: GuidelineRow[]): ScheduleData {
  const events: ScheduleEvent[] = rows.map((row) => {
    // Normalise date strings (DB may return Date objects or ISO strings)
    const startDate = typeof row.start_date === 'string'
      ? row.start_date.slice(0, 10)
      : toISO(new Date(row.start_date));
    const endDate = typeof row.end_date === 'string'
      ? row.end_date.slice(0, 10)
      : toISO(new Date(row.end_date));

    return {
      name: row.event_name,
      eventKey: row.event_key,
      startDate,
      endDate,
      type: row.event_type,
      isMajorFeast: Boolean(row.is_major_feast),
      restrictions: {
        baptism: row.baptism_rule,
        marriage: row.marriage_rule,
        funeral: row.funeral_rule,
      },
      explanations: {
        baptism: row.baptism_note || undefined,
        marriage: row.marriage_note || undefined,
        funeral: row.funeral_note || undefined,
        liturgical: row.liturgical_note || undefined,
      },
      colorToken: row.color_token || undefined,
    };
  });

  events.sort((a, b) => a.startDate.localeCompare(b.startDate));
  const days = buildDayMap(events);
  return { days, events };
}

// ─── Dispatcher ────────────────────────────────────────────

export function normalizeScheduleData(
  source: 'database' | 'engine',
  opts: { year: number; calendar: CalendarType; dbRows?: GuidelineRow[] },
): ScheduleData {
  if (source === 'database' && opts.dbRows) {
    return adaptDatabaseSchedule(opts.dbRows);
  }
  return adaptEngineSchedule(opts.year, opts.calendar);
}
