/**
 * Adapter layer between the raw JSON sample data files and the public Samples page.
 *
 * This keeps the Samples page decoupled from the JSON schema — if field names
 * change in the data files, only this adapter needs updating.
 *
 * Available JSON files:
 *   en_samples.json / gr_samples.json / ru_samples.json / ro_samples.json / ge_samples.json
 *     → { baptism_records: BaptismRecord[] }
 *   en_baptism_75.json  → BaptismRecord[]
 *   en_marriage_75.json → MarriageRecord[]
 *   en_funeral_75.json  → FuneralRecord[]
 */

import enSamples from '@/assets/en_samples.json';
import grSamples from '@/assets/gr_samples.json';
import ruSamples from '@/assets/ru_samples.json';
import enMarriage from '@/assets/en_marriage_75.json';

// ── Raw types matching the JSON schema ──

interface RawBaptismRecord {
  record_type: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  date_of_baptism: string;
  birthplace: string;
  sponsors: string;
  parents_names: string;
  clergy_name: string;
}

interface RawMarriageRecord {
  date_married: string;
  groom_name: string;
  bride_name: string;
  grooms_parents_names: string;
  brides_parents_names: string;
  witnesses: string;
  marriage_license: string;
  clergy: string;
}

// ── Display types used by the Samples page ──

export interface BaptismSample {
  childName: string;
  dateOfBirth: string;
  dateOfBaptism: string;
  parents: string;
  godparents: string;
  celebrant: string;
  parish: string;
  city: string;
}

export interface MarriageSample {
  groomName: string;
  brideName: string;
  dateMarried: string;
  witnesses: string;
  officiant: string;
  licenseNo: string;
}

export interface MultiLangSample {
  language: string;
  languageNative: string;
  sacrament: string;
  name: string;
  date: string;
  priest: string;
}

// ── Helpers ──

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function splitParents(raw: string): string {
  // "Christopher Harris & Claire Franklin" → keep as-is
  return raw;
}

// ── Public API ──

/** Returns one baptism sample record for the Samples page certificate display. */
export function getBaptismSample(): BaptismSample {
  const r = (enSamples as { baptism_records: RawBaptismRecord[] }).baptism_records[0];
  return {
    childName: `${r.first_name} ${r.last_name}`,
    dateOfBirth: formatDate(r.date_of_birth),
    dateOfBaptism: formatDate(r.date_of_baptism),
    parents: splitParents(r.parents_names),
    godparents: r.sponsors,
    celebrant: r.clergy_name,
    parish: 'Holy Trinity Orthodox Church',
    city: r.birthplace,
  };
}

/** Returns one marriage sample record for the Samples page. */
export function getMarriageSample(): MarriageSample {
  const r = (enMarriage as RawMarriageRecord[])[1]; // index 1 has better name data
  return {
    groomName: r.groom_name,
    brideName: r.bride_name,
    dateMarried: formatDate(r.date_married),
    witnesses: r.witnesses,
    officiant: r.clergy,
    licenseNo: r.marriage_license,
  };
}

/** Returns multi-language sample records for the Samples page language showcase. */
export function getMultiLangSamples(): MultiLangSample[] {
  const gr = (grSamples as { baptism_records: RawBaptismRecord[] }).baptism_records[0];
  const ru = (ruSamples as { baptism_records: RawBaptismRecord[] }).baptism_records[0];

  return [
    {
      language: 'Greek',
      languageNative: 'Ελληνικά',
      sacrament: 'Βάπτισμα',
      name: `${gr.first_name} ${gr.last_name}`,
      date: gr.date_of_baptism,
      priest: gr.clergy_name,
    },
    {
      language: 'Russian',
      languageNative: 'Русский',
      sacrament: 'Крещение',
      name: `${ru.first_name} ${ru.last_name}`,
      date: ru.date_of_baptism,
      priest: ru.clergy_name,
    },
    {
      language: 'Arabic',
      languageNative: 'العربية',
      sacrament: 'المعمودية',
      name: 'يوحنا الخوري',
      date: '2023-07-15',
      priest: 'الأب جورج حداد',
    },
  ];
}

/** A small set of search-result-like records for the interactive demo on the Samples page. */
export function getSearchDemoResults() {
  const records = (enSamples as { baptism_records: RawBaptismRecord[] }).baptism_records;
  const gr = (grSamples as { baptism_records: RawBaptismRecord[] }).baptism_records[0];
  const marriage = (enMarriage as RawMarriageRecord[])[1];

  return [
    {
      name: `${records[0].first_name} ${records[0].last_name}`,
      type: 'Baptism',
      date: formatDate(records[0].date_of_baptism),
      parish: 'Holy Trinity',
    },
    {
      name: `${marriage.groom_name} & ${marriage.bride_name}`,
      type: 'Marriage',
      date: formatDate(marriage.date_married),
      parish: 'St. Nicholas',
    },
    {
      name: `${gr.first_name} ${gr.last_name}`,
      type: 'Baptism',
      date: formatDate(gr.date_of_baptism),
      parish: 'Holy Trinity',
    },
  ];
}
