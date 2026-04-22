/**
 * Sacramental Date Restrictions
 *
 * Shared utility for Eastern Orthodox sacramental date validation.
 * Centralises Pascha calculation and restriction checks for baptism,
 * marriage, and funeral record entry forms, plus a year-level
 * enumerator for the calendar viewer.
 */

// ─── Types ──────────────────────────────────────────────────

export type OrthodoxCalendar = 'new' | 'old';

export interface DateRestriction {
  message: string;
  severity: 'error' | 'warning';
}

export interface RestrictionPeriod {
  /** ISO date string YYYY-MM-DD */
  date: string;
  label: string;
  sacrament: 'baptism' | 'marriage' | 'funeral';
  severity: 'error' | 'warning';
}

// ─── Helpers ────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Julian-to-Gregorian offset in days.
 * Old Calendar (Julian) fixed feasts fall 13 days later on the civil
 * (Gregorian) calendar compared to New Calendar (Revised Julian) churches.
 * This offset is valid for the 21st–22nd centuries (1900-2100).
 */
const JULIAN_OFFSET_DAYS = 13;

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  return isNaN(d.getTime()) ? null : d;
}

// ─── Old Calendar date display helper ────────────────────────

const MONTH_ABBREVS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Shift a "New Calendar" date string like "Dec 25" or "Aug 1–14" by +13 days
 * to produce the Old Calendar (Julian) civil-calendar equivalent.
 */
export function toOldCalendarDates(newCalDates: string): string {
  // Ranges: "Dec 25 – Jan 6", "Aug 1–14", "Nov 15 – Dec 24"
  const rangeMatch = newCalDates.match(/^(\w+)\s+(\d+)\s*[–-]\s*(?:(\w+)\s+)?(\d+)$/);
  if (rangeMatch) {
    const startMonth = rangeMatch[1];
    const startDay = parseInt(rangeMatch[2], 10);
    const endMonth = rangeMatch[3] || startMonth;
    const endDay = parseInt(rangeMatch[4], 10);

    const startIdx = MONTH_ABBREVS.indexOf(startMonth);
    const endIdx = MONTH_ABBREVS.indexOf(endMonth);
    if (startIdx === -1 || endIdx === -1) return newCalDates;

    const sd = addDays(new Date(2026, startIdx, startDay), JULIAN_OFFSET_DAYS);
    const ed = addDays(new Date(2026, endIdx, endDay), JULIAN_OFFSET_DAYS);

    const sm = MONTH_ABBREVS[sd.getMonth()];
    const em = MONTH_ABBREVS[ed.getMonth()];

    if (sm === em) {
      return `${sm} ${sd.getDate()}–${ed.getDate()}`;
    }
    return `${sm} ${sd.getDate()} – ${em} ${ed.getDate()}`;
  }

  // Single date: "Feb 2", "Mar 25", etc.
  const singleMatch = newCalDates.match(/^(\w+)\s+(\d+)$/);
  if (singleMatch) {
    const monthStr = singleMatch[1];
    const day = parseInt(singleMatch[2], 10);
    const idx = MONTH_ABBREVS.indexOf(monthStr);
    if (idx === -1) return newCalDates;
    const shifted = addDays(new Date(2026, idx, day), JULIAN_OFFSET_DAYS);
    return `${MONTH_ABBREVS[shifted.getMonth()]} ${shifted.getDate()}`;
  }

  // Moveable or special (e.g. "Pascha − 7", "Always") — unchanged
  return newCalDates;
}

// ─── Pascha (Julian → Gregorian) ────────────────────────────

export function calculatePascha(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  const julianDate = new Date(year, month - 1, day);
  return new Date(julianDate.getTime() + 13 * DAY_MS);
}

// ─── Baptism Restrictions ───────────────────────────────────

export function getBaptismDateRestriction(dateStr: string): DateRestriction | null {
  const d = parseDate(dateStr);
  if (!d) return null;

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();

  // Fixed dates
  if ((month === 12 && day >= 25) || (month === 1 && day <= 6))
    return { message: 'Baptisms are not permitted during the Christmas to Theophany period (Dec 25 – Jan 6).', severity: 'error' };
  if (month === 9 && day === 14)
    return { message: 'Baptisms are not permitted on the Elevation of the Cross (Sep 14).', severity: 'error' };
  if (month === 2 && day === 2)
    return { message: 'Baptisms are not permitted on the Presentation of Christ in the Temple (Feb 2).', severity: 'error' };
  if (month === 3 && day === 25)
    return { message: 'Baptisms are not permitted on the Annunciation (Mar 25).', severity: 'error' };
  if (month === 8 && day === 6)
    return { message: 'Baptisms are not permitted on the Transfiguration (Aug 6).', severity: 'error' };
  if (month === 8 && day >= 1 && day <= 14)
    return { message: 'Baptisms are not permitted during the Dormition Fast (Aug 1–14).', severity: 'error' };

  // Moveable dates
  const pascha = calculatePascha(year);
  const diffDays = Math.round((d.getTime() - pascha.getTime()) / DAY_MS);

  if (diffDays === -7)
    return { message: 'Baptisms are not permitted on Palm Sunday.', severity: 'error' };
  if (diffDays >= -6 && diffDays <= -1)
    return { message: 'Baptisms are not permitted during Holy Week.', severity: 'error' };
  if (diffDays === 0)
    return { message: 'Baptisms are not permitted on Pascha (Easter).', severity: 'error' };
  if (diffDays === 39)
    return { message: 'Baptisms are not permitted on the Ascension.', severity: 'error' };
  if (diffDays === 49)
    return { message: 'Baptisms are not permitted on Pentecost.', severity: 'error' };

  return null;
}

// ─── Marriage Restrictions ──────────────────────────────────

export function getMarriageDateRestriction(dateStr: string): DateRestriction | null {
  const d = parseDate(dateStr);
  if (!d) return null;

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  const pascha = calculatePascha(year);
  const diffDays = Math.round((d.getTime() - pascha.getTime()) / DAY_MS);

  // ── Moveable periods ──

  // Great Lent (Pascha-48 through Pascha-1)
  if (diffDays >= -48 && diffDays <= -1)
    return { message: 'Marriages are not permitted during Great Lent.', severity: 'error' };

  // Bright Week (Pascha through Pascha+6)
  if (diffDays >= 0 && diffDays <= 6)
    return { message: 'Marriages are not permitted during Bright Week.', severity: 'error' };

  // Pentecost
  if (diffDays === 49)
    return { message: 'Marriages are not permitted on Pentecost.', severity: 'error' };

  // Apostles' Fast (Pascha+57 through June 28)
  const apostlesFastStart = addDays(pascha, 57);
  const apostlesFastEnd = new Date(year, 5, 28); // June 28
  if (apostlesFastStart <= apostlesFastEnd && d >= apostlesFastStart && d <= apostlesFastEnd)
    return { message: 'Marriages are not permitted during the Apostles\' Fast.', severity: 'error' };

  // ── Fixed periods ──

  // Dormition Fast (Aug 1–14)
  if (month === 8 && day >= 1 && day <= 14)
    return { message: 'Marriages are not permitted during the Dormition Fast (Aug 1–14).', severity: 'error' };

  // Nativity Fast (Nov 15 – Dec 24)
  if ((month === 11 && day >= 15) || (month === 12 && day <= 24))
    return { message: 'Marriages are not permitted during the Nativity Fast (Nov 15 – Dec 24).', severity: 'error' };

  // Christmas–Theophany (Dec 25 – Jan 6)
  if ((month === 12 && day >= 25) || (month === 1 && day <= 6))
    return { message: 'Marriages are not permitted during the Christmas to Theophany period (Dec 25 – Jan 6).', severity: 'error' };

  // ── Fixed feasts ──

  if (month === 8 && day === 29)
    return { message: 'Marriages are not permitted on the Beheading of St. John the Baptist (Aug 29).', severity: 'error' };
  if (month === 9 && day === 14)
    return { message: 'Marriages are not permitted on the Elevation of the Cross (Sep 14).', severity: 'error' };
  if (month === 2 && day === 2)
    return { message: 'Marriages are not permitted on the Presentation of Christ in the Temple (Feb 2).', severity: 'error' };
  if (month === 3 && day === 25)
    return { message: 'Marriages are not permitted on the Annunciation (Mar 25).', severity: 'error' };
  if (month === 8 && day === 6)
    return { message: 'Marriages are not permitted on the Transfiguration (Aug 6).', severity: 'error' };

  return null;
}

// ─── Funeral Restrictions ───────────────────────────────────

export function getFuneralDateRestriction(
  deathDateStr: string,
  burialDateStr: string,
): DateRestriction | null {
  if (!deathDateStr || !burialDateStr) return null;

  const death = parseDate(deathDateStr);
  const burial = parseDate(burialDateStr);
  if (!death || !burial) return null;

  // Hard block: burial before death
  if (burial < death)
    return { message: 'Burial date cannot be before the date of death.', severity: 'error' };

  const month = burial.getMonth() + 1;
  const day = burial.getDate();
  const year = burial.getFullYear();
  const pascha = calculatePascha(year);
  const diffDays = Math.round((burial.getTime() - pascha.getTime()) / DAY_MS);

  // ── Hard restrictions (error) ──

  // Great and Holy Friday
  if (diffDays === -2)
    return { message: 'Funeral services are not held on Great and Holy Friday.', severity: 'error' };

  // Great and Holy Saturday
  if (diffDays === -1)
    return { message: 'Funeral services are not held on Great and Holy Saturday.', severity: 'error' };

  // ── Warnings (special rite or generally avoided) ──

  // Pascha
  if (diffDays === 0)
    return { message: 'Burial on Pascha requires the special Paschal funeral rite.', severity: 'warning' };

  // Bright Week
  if (diffDays >= 1 && diffDays <= 6)
    return { message: 'Burial during Bright Week uses the modified Paschal funeral rite.', severity: 'warning' };

  // Pentecost
  if (diffDays === 49)
    return { message: 'Funerals are generally not held on Pentecost.', severity: 'warning' };

  // Nativity of Christ
  if (month === 12 && day === 25)
    return { message: 'Funerals are generally not held on the Nativity of Christ (Dec 25).', severity: 'warning' };

  // Theophany
  if (month === 1 && day === 6)
    return { message: 'Funerals are generally not held on Theophany (Jan 6).', severity: 'warning' };

  // Annunciation
  if (month === 3 && day === 25)
    return { message: 'Funerals are generally not held on the Annunciation (Mar 25).', severity: 'warning' };

  // Transfiguration
  if (month === 8 && day === 6)
    return { message: 'Funerals are generally not held on the Transfiguration (Aug 6).', severity: 'warning' };

  // Dormition of the Theotokos
  if (month === 8 && day === 15)
    return { message: 'Funerals are generally not held on the Dormition of the Theotokos (Aug 15).', severity: 'warning' };

  // Elevation of the Cross
  if (month === 9 && day === 14)
    return { message: 'Funerals are generally not held on the Elevation of the Cross (Sep 14).', severity: 'warning' };

  // Nativity of the Theotokos
  if (month === 9 && day === 8)
    return { message: 'Funerals are generally not held on the Nativity of the Theotokos (Sep 8).', severity: 'warning' };

  return null;
}

// ─── Year Restriction Enumerator (for calendar viewer) ──────

/**
 * Returns all restriction periods for a given year.
 * @param calendar 'new' = Revised Julian (fixed feasts on Gregorian dates),
 *                 'old' = Julian (fixed feasts shifted +13 days on Gregorian calendar).
 *                 Moveable feasts (Pascha-based) are the same for both.
 */
export function getRestrictionsForYear(year: number, calendar: OrthodoxCalendar = 'new'): RestrictionPeriod[] {
  const periods: RestrictionPeriod[] = [];
  const pascha = calculatePascha(year);
  const offset = calendar === 'old' ? JULIAN_OFFSET_DAYS : 0;

  /** Apply Julian offset to a fixed-date Date object */
  const fixedDate = (d: Date): Date => (offset ? addDays(d, offset) : d);

  // Helper to add a range of dates
  const addRange = (
    startDate: Date,
    endDate: Date,
    label: string,
    sacrament: RestrictionPeriod['sacrament'],
    severity: RestrictionPeriod['severity'] = 'error',
  ) => {
    let cur = new Date(startDate);
    while (cur <= endDate) {
      periods.push({ date: toISO(cur), label, sacrament, severity });
      cur = addDays(cur, 1);
    }
  };

  const addDay = (
    d: Date,
    label: string,
    sacrament: RestrictionPeriod['sacrament'],
    severity: RestrictionPeriod['severity'] = 'error',
  ) => {
    periods.push({ date: toISO(d), label, sacrament, severity });
  };

  // ── Baptism restrictions ──

  // Christmas–Theophany
  addRange(fixedDate(new Date(year, 0, 1)), fixedDate(new Date(year, 0, 6)), 'Christmas–Theophany', 'baptism');
  addRange(fixedDate(new Date(year, 11, 25)), fixedDate(new Date(year, 11, 31)), 'Christmas–Theophany', 'baptism');

  // Fixed feasts
  addDay(fixedDate(new Date(year, 1, 2)), 'Presentation', 'baptism');
  addDay(fixedDate(new Date(year, 2, 25)), 'Annunciation', 'baptism');
  addDay(fixedDate(new Date(year, 7, 6)), 'Transfiguration', 'baptism');
  addDay(fixedDate(new Date(year, 8, 14)), 'Elevation of the Cross', 'baptism');

  // Dormition Fast
  addRange(fixedDate(new Date(year, 7, 1)), fixedDate(new Date(year, 7, 14)), 'Dormition Fast', 'baptism');

  // Palm Sunday
  addDay(addDays(pascha, -7), 'Palm Sunday', 'baptism');
  // Holy Week
  addRange(addDays(pascha, -6), addDays(pascha, -1), 'Holy Week', 'baptism');
  // Pascha
  addDay(pascha, 'Pascha', 'baptism');
  // Ascension
  addDay(addDays(pascha, 39), 'Ascension', 'baptism');
  // Pentecost
  addDay(addDays(pascha, 49), 'Pentecost', 'baptism');

  // ── Marriage restrictions ──

  // Great Lent
  addRange(addDays(pascha, -48), addDays(pascha, -1), 'Great Lent', 'marriage');
  // Bright Week
  addRange(pascha, addDays(pascha, 6), 'Bright Week', 'marriage');
  // Pentecost
  addDay(addDays(pascha, 49), 'Pentecost', 'marriage');

  // Apostles' Fast (start is moveable, end is fixed: Jun 28 / Jul 11)
  const apostlesStart = addDays(pascha, 57);
  const apostlesEnd = fixedDate(new Date(year, 5, 28));
  if (apostlesStart <= apostlesEnd) {
    addRange(apostlesStart, apostlesEnd, 'Apostles\' Fast', 'marriage');
  }

  // Dormition Fast
  addRange(fixedDate(new Date(year, 7, 1)), fixedDate(new Date(year, 7, 14)), 'Dormition Fast', 'marriage');

  // Nativity Fast
  addRange(fixedDate(new Date(year, 10, 15)), fixedDate(new Date(year, 11, 24)), 'Nativity Fast', 'marriage');

  // Christmas–Theophany
  addRange(fixedDate(new Date(year, 0, 1)), fixedDate(new Date(year, 0, 6)), 'Christmas–Theophany', 'marriage');
  addRange(fixedDate(new Date(year, 11, 25)), fixedDate(new Date(year, 11, 31)), 'Christmas–Theophany', 'marriage');

  // Fixed feasts
  addDay(fixedDate(new Date(year, 7, 29)), 'Beheading of St. John', 'marriage');
  addDay(fixedDate(new Date(year, 8, 14)), 'Elevation of the Cross', 'marriage');
  addDay(fixedDate(new Date(year, 1, 2)), 'Presentation', 'marriage');
  addDay(fixedDate(new Date(year, 2, 25)), 'Annunciation', 'marriage');
  addDay(fixedDate(new Date(year, 7, 6)), 'Transfiguration', 'marriage');

  // ── Funeral restrictions ──

  // Hard restrictions
  addDay(addDays(pascha, -2), 'Great and Holy Friday', 'funeral', 'error');
  addDay(addDays(pascha, -1), 'Great and Holy Saturday', 'funeral', 'error');

  // Warnings
  addDay(pascha, 'Pascha – Paschal funeral rite', 'funeral', 'warning');
  addRange(addDays(pascha, 1), addDays(pascha, 6), 'Bright Week – modified rite', 'funeral', 'warning');
  addDay(addDays(pascha, 49), 'Pentecost', 'funeral', 'warning');

  // Fixed feasts
  addDay(fixedDate(new Date(year, 11, 25)), 'Nativity of Christ', 'funeral', 'warning');
  addDay(fixedDate(new Date(year, 0, 6)), 'Theophany', 'funeral', 'warning');
  addDay(fixedDate(new Date(year, 2, 25)), 'Annunciation', 'funeral', 'warning');
  addDay(fixedDate(new Date(year, 7, 6)), 'Transfiguration', 'funeral', 'warning');
  addDay(fixedDate(new Date(year, 7, 15)), 'Dormition of the Theotokos', 'funeral', 'warning');
  addDay(fixedDate(new Date(year, 8, 8)), 'Nativity of the Theotokos', 'funeral', 'warning');
  addDay(fixedDate(new Date(year, 8, 14)), 'Elevation of the Cross', 'funeral', 'warning');

  return periods;
}
