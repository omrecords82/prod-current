/**
 * Data adapter for the Sample Records Explorer page.
 *
 * Loads ALL JSON sample files from assets/ and normalizes them into a unified
 * record format suitable for AG Grid, Cards, Timeline, and Analytics views.
 */

// ── English records ──
import enSamples from '@/assets/en_samples.json';
import enBaptism75 from '@/assets/en_baptism_75.json';
import enMarriage75 from '@/assets/en_marriage_75.json';
import enFuneral75 from '@/assets/en_funeral_75.json';

// ── Multi-language baptism samples ──
import grSamples from '@/assets/gr_samples.json';
import ruSamples from '@/assets/ru_samples.json';
import roSamples from '@/assets/ro_samples.json';
import geSamples from '@/assets/ge_samples.json';

// ── Georgian extended sets ──
import geBaptism50 from '@/assets/ge_baptism_records_50.json';
import geMarriage50 from '@/assets/ge_marriage_records_50.json';
import geFuneral50 from '@/assets/ge_funeral_records_50.json';

// ── Unified record type ──
export interface UnifiedSampleRecord {
  id: string;
  language: string;
  languageLabel: string;
  recordType: 'Baptism' | 'Marriage' | 'Funeral';
  fullName: string;
  date: string;        // primary date (baptism/marriage/death)
  secondaryDate: string; // secondary date (birth/burial)
  location: string;
  clergy: string;
  details: string;     // sponsors/witnesses/burial location
  parents: string;
  year: number;
  decade: string;
}

// ── Helpers ──

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function yearFrom(iso: string): number {
  if (!iso) return 0;
  return parseInt(iso.substring(0, 4), 10);
}

function decadeFrom(iso: string): string {
  const y = yearFrom(iso);
  if (!y) return 'Unknown';
  const d = Math.floor(y / 10) * 10;
  return `${d}s`;
}

function arrToStr(val: string | string[]): string {
  return Array.isArray(val) ? val.join(', ') : (val || '');
}

let nextId = 1;
function uid(): string {
  return `sr-${nextId++}`;
}

// ── Normalizers ──

function normalizeEnBaptism(rec: any, source: string): UnifiedSampleRecord {
  return {
    id: uid(),
    language: 'en',
    languageLabel: 'English',
    recordType: 'Baptism',
    fullName: `${rec.first_name} ${rec.last_name}`,
    date: formatDate(rec.date_of_baptism),
    secondaryDate: formatDate(rec.date_of_birth),
    location: rec.birthplace || '',
    clergy: rec.clergy_name || '',
    details: arrToStr(rec.sponsors),
    parents: arrToStr(rec.parents_names),
    year: yearFrom(rec.date_of_baptism),
    decade: decadeFrom(rec.date_of_baptism),
  };
}

function normalizeEnMarriage(rec: any): UnifiedSampleRecord {
  return {
    id: uid(),
    language: 'en',
    languageLabel: 'English',
    recordType: 'Marriage',
    fullName: `${rec.groom_name} & ${rec.bride_name}`,
    date: formatDate(rec.date_married),
    secondaryDate: '',
    location: '',
    clergy: rec.clergy || '',
    details: rec.witnesses || '',
    parents: [rec.grooms_parents_names, rec.brides_parents_names].filter(Boolean).join(' | '),
    year: yearFrom(rec.date_married),
    decade: decadeFrom(rec.date_married),
  };
}

function normalizeEnFuneral(rec: any): UnifiedSampleRecord {
  return {
    id: uid(),
    language: 'en',
    languageLabel: 'English',
    recordType: 'Funeral',
    fullName: `${rec.first_name} ${rec.last_name}`,
    date: formatDate(rec.date_of_death),
    secondaryDate: formatDate(rec.date_of_burial),
    location: rec.burial_location || '',
    clergy: rec.clergy || '',
    details: rec.age ? `Age: ${rec.age}` : '',
    parents: '',
    year: yearFrom(rec.date_of_death),
    decade: decadeFrom(rec.date_of_death),
  };
}

function normalizeLangBaptism(rec: any, lang: string, langLabel: string): UnifiedSampleRecord {
  // Standard field names (gr, ru, ro)
  return {
    id: uid(),
    language: lang,
    languageLabel: langLabel,
    recordType: 'Baptism',
    fullName: `${rec.first_name} ${rec.last_name}`,
    date: formatDate(rec.date_of_baptism),
    secondaryDate: formatDate(rec.date_of_birth),
    location: rec.birthplace || '',
    clergy: rec.clergy_name || '',
    details: rec.sponsors || '',
    parents: rec.parents_names || '',
    year: yearFrom(rec.date_of_baptism),
    decade: decadeFrom(rec.date_of_baptism),
  };
}

function normalizeGeBaptism(rec: any): UnifiedSampleRecord {
  return {
    id: uid(),
    language: 'ge',
    languageLabel: 'Georgian',
    recordType: 'Baptism',
    fullName: `${rec['სახელი']} ${rec['გვარი']}`,
    date: formatDate(rec['ნათლობის თარიღი']),
    secondaryDate: formatDate(rec['დაბადების თარიღი']),
    location: rec['დაბადების ადგილი'] || '',
    clergy: rec['მღვდელი'] || '',
    details: rec['ნათლები'] || '',
    parents: rec['მშობლები'] || '',
    year: yearFrom(rec['ნათლობის თარიღი']),
    decade: decadeFrom(rec['ნათლობის თარიღი']),
  };
}

function normalizeGeMarriage(rec: any): UnifiedSampleRecord {
  return {
    id: uid(),
    language: 'ge',
    languageLabel: 'Georgian',
    recordType: 'Marriage',
    fullName: `${rec['სიძე — სახელი']} ${rec['სიძე — გვარი']} & ${rec['ნეფე — სახელი']} ${rec['ნეფე — გვარი']}`,
    date: formatDate(rec['ქორწინების თარიღი']),
    secondaryDate: '',
    location: '',
    clergy: rec['მღვდელი'] || '',
    details: rec['მოწმე'] || '',
    parents: [rec['სიძის მშობლები'], rec['ნეფის მშობლები']].filter(Boolean).join(' | '),
    year: yearFrom(rec['ქორწინების თარიღი']),
    decade: decadeFrom(rec['ქორწინების თარიღი']),
  };
}

function normalizeGeFuneral(rec: any): UnifiedSampleRecord {
  return {
    id: uid(),
    language: 'ge',
    languageLabel: 'Georgian',
    recordType: 'Funeral',
    fullName: `${rec['სახელი']} ${rec['გვარი']}`,
    date: formatDate(rec['გარდაცვალების თარიღი']),
    secondaryDate: formatDate(rec['დასაფლავების თარიღი']),
    location: rec['დასაფლავების ადგილი'] || '',
    clergy: rec['მღვდელი'] || '',
    details: rec['ასაკი'] ? `Age: ${rec['ასაკი']}` : '',
    parents: '',
    year: yearFrom(rec['გარდაცვალების თარიღი']),
    decade: decadeFrom(rec['გარდაცვალების თარიღი']),
  };
}

// ── Build combined dataset ──

function buildAllRecords(): UnifiedSampleRecord[] {
  const records: UnifiedSampleRecord[] = [];

  // English baptisms from en_samples.json
  const enBaptismSamples = (enSamples as any).baptism_records || [];
  enBaptismSamples.forEach((r: any) => records.push(normalizeEnBaptism(r, 'en_samples')));

  // English baptism 75
  (enBaptism75 as any[]).forEach((r) => records.push(normalizeEnBaptism(r, 'en_baptism_75')));

  // English marriage 75
  (enMarriage75 as any[]).forEach((r) => records.push(normalizeEnMarriage(r)));

  // English funeral 75
  (enFuneral75 as any[]).forEach((r) => records.push(normalizeEnFuneral(r)));

  // Greek baptisms
  const grBaptisms = (grSamples as any).baptism_records || [];
  grBaptisms.forEach((r: any) => records.push(normalizeLangBaptism(r, 'gr', 'Greek')));

  // Russian baptisms
  const ruBaptisms = (ruSamples as any).baptism_records || [];
  ruBaptisms.forEach((r: any) => records.push(normalizeLangBaptism(r, 'ru', 'Russian')));

  // Romanian baptisms
  const roBaptisms = (roSamples as any).baptism_records || [];
  roBaptisms.forEach((r: any) => records.push(normalizeLangBaptism(r, 'ro', 'Romanian')));

  // Georgian baptisms (different field names)
  const geBaptisms = (geSamples as any).baptism_records || [];
  geBaptisms.forEach((r: any) => records.push(normalizeGeBaptism(r)));

  // Georgian extended sets
  (geBaptism50 as any[]).forEach((r) => records.push(normalizeGeBaptism(r)));
  (geMarriage50 as any[]).forEach((r) => records.push(normalizeGeMarriage(r)));
  (geFuneral50 as any[]).forEach((r) => records.push(normalizeGeFuneral(r)));

  return records;
}

// Memoized singleton
let _allRecords: UnifiedSampleRecord[] | null = null;

export function getAllSampleRecords(): UnifiedSampleRecord[] {
  if (!_allRecords) {
    _allRecords = buildAllRecords();
  }
  return _allRecords;
}

// ── Analytics helpers ──

export interface AnalyticsStat {
  label: string;
  value: number;
}

export function getRecordTypeCounts(records: UnifiedSampleRecord[]): AnalyticsStat[] {
  const counts: Record<string, number> = {};
  records.forEach((r) => {
    counts[r.recordType] = (counts[r.recordType] || 0) + 1;
  });
  return Object.entries(counts).map(([label, value]) => ({ label, value }));
}

export function getLanguageCounts(records: UnifiedSampleRecord[]): AnalyticsStat[] {
  const counts: Record<string, number> = {};
  records.forEach((r) => {
    counts[r.languageLabel] = (counts[r.languageLabel] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function getDecadeCounts(records: UnifiedSampleRecord[]): AnalyticsStat[] {
  const counts: Record<string, number> = {};
  records.forEach((r) => {
    if (r.decade !== 'Unknown') {
      counts[r.decade] = (counts[r.decade] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getClergyCounts(records: UnifiedSampleRecord[]): AnalyticsStat[] {
  const counts: Record<string, number> = {};
  records.forEach((r) => {
    if (r.clergy) {
      counts[r.clergy] = (counts[r.clergy] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);
}
