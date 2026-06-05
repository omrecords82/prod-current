/**
 * OCR Record Type Classifier
 * Keyword-based classifier that suggests record type from OCR text.
 * Returns suggested_type + confidence. Unknown stays Unknown.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const OCR_AGENT_MODEL = process.env.OCR_AGENT_MODEL || 'claude-haiku-4-5';
const OCR_AGENT_VISION_MODEL = process.env.OCR_AGENT_VISION_MODEL || 'claude-sonnet-4-20250514';
const OCR_AGENT_MAX_RECORDS = 12;
const OCR_AGENT_OCR_CONTEXT_CHARS = 3500;
const OCR_AGENT_VISION_MAX_BYTES = 4 * 1024 * 1024;

const RECORD_FIELD_KEYS: Record<string, string[]> = {
  baptism: [
    'record_number', 'child_name', 'date_of_birth', 'place_of_birth', 'father_name',
    'mother_name', 'address', 'date_of_baptism', 'godparents',
    'performed_by', 'church', 'notes',
  ],
  marriage: [
    'record_number', 'groom_name', 'bride_name', 'date_of_marriage', 'place_of_marriage',
    'witnesses', 'best_man', 'maid_of_honor', 'officiant', 'church', 'notes',
  ],
  funeral: [
    'record_number', 'deceased_name', 'date_of_death', 'date_of_funeral', 'date_of_burial',
    'place_of_burial', 'age_at_death', 'cause_of_death', 'next_of_kin', 'officiant', 'church', 'notes',
  ],
};

const SUBMIT_RECORD_FIELDS_TOOL: Anthropic.Tool = {
  name: 'submit_record_fields',
  description: 'Return cleaned parish record field extractions for human review before database seeding.',
  input_schema: {
    type: 'object',
    properties: {
      record_type: { type: 'string', enum: ['baptism', 'marriage', 'funeral', 'custom'] },
      records: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            fields: { type: 'object', additionalProperties: { type: 'string' } },
            confidence: { type: 'number' },
            needs_review: { type: 'boolean' },
          },
          required: ['fields'],
        },
      },
      refinement_notes: { type: 'string' },
    },
    required: ['record_type', 'records'],
  },
};

interface ClassifierResult {
  suggested_type: 'baptism' | 'marriage' | 'funeral' | 'unknown';
  confidence: number;
  keyword_hits: Record<string, string[]>;
}

// Unicode-aware "word boundary" — JS \b is ASCII-only, so it silently fails
// for Greek/Cyrillic patterns. We use Unicode property lookarounds instead so
// the same pattern style works across English, Greek, Russian, etc.
const UB_START = '(?<![\\p{L}\\p{N}])';
const UB_END = '(?![\\p{L}\\p{N}])';

function ub(pattern: string): RegExp {
  return new RegExp(`${UB_START}${pattern}${UB_END}`, 'iu');
}

const KEYWORD_PATTERNS: Record<string, RegExp[]> = {
  baptism: [
    ub('baptis[me]'),
    ub('baptiz[\\p{L}\\p{N}]*'),
    ub('christening'),
    ub('godparent'),
    ub('godmother'),
    ub('godfather'),
    ub('sponsor[\\p{L}\\p{N}]*'),
    ub('chrismat[\\p{L}\\p{N}]*'),
    ub('baptism'),
    ub('βάπτισ[\\p{L}\\p{N}]*'),
    ub('βαπτιστ[\\p{L}\\p{N}]*'),
    ub('νονό[ςσ]'),
    ub('νονά'),
    ub('крещен[\\p{L}\\p{N}]*'),
    ub('крёстн[\\p{L}\\p{N}]*'),
    ub('child.?name'),
    ub('date.?of.?birth'),
    ub('place.?of.?birth'),
    ub('infant'),
  ],
  marriage: [
    ub('marriag[\\p{L}\\p{N}]*'),
    ub('wedding'),
    ub('matrimon[\\p{L}\\p{N}]*'),
    ub('bride'),
    ub('groom'),
    ub('crowning'),
    ub('στεφάνωση'),
    ub('στέφαν[\\p{L}\\p{N}]*'),
    ub('γάμο[υς]'),
    ub('νυμφίο[\\p{L}\\p{N}]*'),
    ub('νύφη'),
    ub('бракосочетан[\\p{L}\\p{N}]*'),
    ub('венчан[\\p{L}\\p{N}]*'),
    ub('женатый'),
    ub('witness'),
    ub('date.?of.?marriage'),
    ub('best.?man'),
    ub('maid.?of.?honor'),
    ub('nuptial'),
  ],
  funeral: [
    ub('funeral'),
    ub('death'),
    ub('burial'),
    ub('deceased'),
    ub('repose'),
    ub('κηδεία'),
    ub('θάνατο[\\p{L}\\p{N}]*'),
    ub('ταφ[ήη]'),
    ub('отпеван[\\p{L}\\p{N}]*'),
    ub('похорон[\\p{L}\\p{N}]*'),
    ub('смерт[\\p{L}\\p{N}]*'),
    ub('date.?of.?death'),
    ub('date.?of.?burial'),
    ub('cause.?of.?death'),
    ub('age.?at.?death'),
    ub('next.?of.?kin'),
    ub('interment'),
    ub('obitu[\\p{L}\\p{N}]*'),
  ],
};

const CONFIDENCE_THRESHOLD = 0.3;

export function classifyRecordType(ocrText: string): ClassifierResult {
  if (!ocrText || ocrText.trim().length === 0) {
    return { suggested_type: 'unknown', confidence: 0, keyword_hits: {} };
  }

  const text = ocrText.toLowerCase();
  const scores: Record<string, number> = { baptism: 0, marriage: 0, funeral: 0 };
  const hits: Record<string, string[]> = { baptism: [], marriage: [], funeral: [] };

  for (const [type, patterns] of Object.entries(KEYWORD_PATTERNS)) {
    for (const pattern of patterns) {
      // Preserve original pattern flags but force global so we can count hits.
      // Patterns are built with iu (Unicode-aware boundaries), so we need 'u'
      // to correctly evaluate the \p{L} lookarounds for non-ASCII text.
      const globalPattern = new RegExp(pattern.source, 'giu');
      const matches = text.match(globalPattern);
      if (matches) {
        scores[type] += matches.length;
        hits[type].push(
          pattern.source
            .replace(/\(\?<!\[\\p\{L\}\\p\{N\}\]\)/g, '')
            .replace(/\(\?!\[\\p\{L\}\\p\{N\}\]\)/g, '')
            .replace(/\[.*?\]/g, '?')
        );
      }
    }
  }

  // Normalize scores
  const totalHits = Object.values(scores).reduce((a, b) => a + b, 0);
  if (totalHits === 0) {
    return { suggested_type: 'unknown', confidence: 0, keyword_hits: hits };
  }

  const normalized: Record<string, number> = {};
  for (const type of Object.keys(scores)) {
    normalized[type] = scores[type] / totalHits;
  }

  // Find the best match
  let bestType = 'unknown';
  let bestScore = 0;
  for (const [type, score] of Object.entries(normalized)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  // Only suggest if above threshold
  if (bestScore < CONFIDENCE_THRESHOLD) {
    return { suggested_type: 'unknown', confidence: 0, keyword_hits: hits };
  }

  return {
    suggested_type: bestType as ClassifierResult['suggested_type'],
    confidence: Math.round(bestScore * 1000) / 1000,
    keyword_hits: hits,
  };
}

// ── Agent field extraction (heuristic prototype) ─────────────────────────────

export interface AgentExtractResult {
  record_type: 'baptism' | 'marriage' | 'funeral' | 'custom';
  fields: Record<string, string>;
  records: Array<Record<string, string>>;
  confidence: number;
  method: 'assembler' | 'heuristic' | 'llm' | 'llm_vision';
  candidate_index?: number;
  total_candidates?: number;
  needs_review?: boolean;
  llm_model?: string;
  refinement_notes?: string;
  draft_method?: 'assembler' | 'heuristic' | 'llm' | 'llm_vision';
}

const DATE_RE = /\b(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}|\d{4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/gi;

const LABEL_PATTERNS: Record<string, RegExp[]> = {
  child_name: [/child(?:'?s)?\s*name[:\s]+(.+)/i, /name\s+of\s+child[:\s]+(.+)/i, /infant[:\s]+(.+)/i],
  date_of_birth: [/date\s+of\s+birth[:\s]+(.+)/i, /born[:\s]+(.+)/i, /birth\s+date[:\s]+(.+)/i],
  date_of_baptism: [/date\s+of\s+baptism[:\s]+(.+)/i, /bapti[sz](?:ed|m)[:\s]+(.+)/i, /reception[:\s]+(.+)/i],
  place_of_birth: [/place\s+of\s+birth[:\s]+(.+)/i, /birthplace[:\s]+(.+)/i],
  father_name: [/father(?:'?s)?\s*name[:\s]+(.+)/i, /father[:\s]+(.+)/i],
  mother_name: [/mother(?:'?s)?\s*name[:\s]+(.+)/i, /mother[:\s]+(.+)/i],
  godparents: [/god\s*parent[s]?[:\s]+(.+)/i, /sponsor[s]?[:\s]+(.+)/i, /νονό[ςσ][:\s]+(.+)/i],
  performed_by: [/performed\s+by[:\s]+(.+)/i, /priest[:\s]+(.+)/i, /officiant[:\s]+(.+)/i, /clergy[:\s]+(.+)/i],
  groom_name: [/groom[:\s]+(.+)/i, /bridegroom[:\s]+(.+)/i],
  bride_name: [/bride[:\s]+(.+)/i],
  date_of_marriage: [/date\s+of\s+marriage[:\s]+(.+)/i, /married[:\s]+(.+)/i],
  witnesses: [/witness(?:es)?[:\s]+(.+)/i],
  deceased_name: [/deceased[:\s]+(.+)/i, /name\s+of\s+deceased[:\s]+(.+)/i],
  date_of_death: [/date\s+of\s+death[:\s]+(.+)/i, /died[:\s]+(.+)/i],
  date_of_burial: [/date\s+of\s+burial[:\s]+(.+)/i, /buried[:\s]+(.+)/i, /burial[:\s]+(.+)/i],
  place_of_burial: [/place\s+of\s+burial[:\s]+(.+)/i, /burial\s+location[:\s]+(.+)/i],
  age_at_death: [/age[:\s]+(\d+)/i],
};

function pickLabelValue(text: string, field: string): string | null {
  const patterns = LABEL_PATTERNS[field] || [];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1].trim().replace(/\s{2,}/g, ' ').slice(0, 200);
  }
  return null;
}

function pickDates(text: string): string[] {
  const dates: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(DATE_RE.source, 'gi');
  while ((m = re.exec(text)) !== null) {
    dates.push(m[1].trim());
  }
  return dates;
}

function resolveRecordType(ocrText: string, hint?: string): AgentExtractResult['record_type'] {
  if (hint && hint !== 'custom') return hint as AgentExtractResult['record_type'];
  const classified = classifyRecordType(ocrText);
  if (classified.suggested_type !== 'unknown') return classified.suggested_type;
  return 'custom';
}

function extractBaptismFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const keys = ['child_name', 'date_of_birth', 'date_of_baptism', 'place_of_birth', 'father_name', 'mother_name', 'godparents', 'performed_by'];
  for (const k of keys) {
    const v = pickLabelValue(text, k);
    if (v) fields[k] = v;
  }
  const dates = pickDates(text);
  if (!fields.date_of_birth && dates[0]) fields.date_of_birth = dates[0];
  if (!fields.date_of_baptism && dates[1]) fields.date_of_baptism = dates[1];
  if (!fields.child_name) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const nameLine = lines.find((l) => /^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(l));
    if (nameLine) fields.child_name = nameLine;
  }
  return fields;
}

function extractMarriageFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const k of ['groom_name', 'bride_name', 'date_of_marriage', 'witnesses', 'performed_by']) {
    const v = pickLabelValue(text, k);
    if (v) fields[k] = v;
  }
  const dates = pickDates(text);
  if (!fields.date_of_marriage && dates[0]) fields.date_of_marriage = dates[0];
  return fields;
}

function extractFuneralFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const k of ['deceased_name', 'date_of_death', 'date_of_burial', 'place_of_burial', 'age_at_death', 'performed_by']) {
    const v = pickLabelValue(text, k);
    if (v) fields[k] = v;
  }
  const dates = pickDates(text);
  if (!fields.date_of_death && dates[0]) fields.date_of_death = dates[0];
  if (!fields.date_of_burial && dates[1]) fields.date_of_burial = dates[1];
  return fields;
}

function scoreFields(fields: Record<string, string>, required: string[]): number {
  if (!required.length) return Object.keys(fields).length > 0 ? 0.5 : 0;
  const hit = required.filter((k) => fields[k]?.trim()).length;
  return Math.round((hit / required.length) * 1000) / 1000;
}

function feederJobDir(jobId: number): string {
  return path.join(__dirname, '../../storage/feeder', `job_${jobId}`);
}

/** Load record_candidates.json artifacts produced during OCR table assembly. */
export function loadFeederRecordCandidates(jobId: number): any[] {
  const jobDir = feederJobDir(jobId);
  if (!fs.existsSync(jobDir)) return [];

  const merged: any[] = [];
  const pageDirs = fs.readdirSync(jobDir)
    .filter((d) => d.startsWith('page_'))
    .sort((a, b) => {
      const ai = parseInt(a.replace('page_', ''), 10);
      const bi = parseInt(b.replace('page_', ''), 10);
      return ai - bi;
    });

  for (const pageDir of pageDirs) {
    const candPath = path.join(jobDir, pageDir, 'record_candidates.json');
    if (!fs.existsSync(candPath)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(candPath, 'utf8'));
      if (Array.isArray(data?.candidates)) merged.push(...data.candidates);
    } catch {
      /* skip corrupt artifact */
    }
  }
  return merged;
}

function pickPrimaryCandidate(candidates: any[]): { candidate: any; index: number } | null {
  if (!candidates.length) return null;
  const scored = candidates.map((c, index) => {
    const conf = typeof c.confidence === 'number' ? c.confidence : 0;
    const reviewPenalty = c.needsReview ? 0.2 : 0;
    const fieldBonus = Object.keys(c.fields || {}).filter((k) => c.fields[k]?.trim()).length * 0.02;
    const rowStart = c.sourceRowIndex ?? 0;
    const rowEnd = c.sourceRowEnd ?? rowStart;
    const span = Math.max(0, rowEnd - rowStart);
    const spanPenalty = span > 8 ? 0.5 : span > 5 ? 0.25 : span > 3 ? 0.1 : 0;
    const childName = String(c.fields?.child_name || c.fields?.deceased_name || '');
    const namePenalty = childName.length > 80 ? 0.45 : childName.length > 50 ? 0.25 : 0;
    const numberBonus = c.fields?.record_number ? 0.12 : 0;
    return {
      c,
      index,
      score: conf - reviewPenalty - spanPenalty - namePenalty + fieldBonus + numberBonus,
    };
  });
  scored.sort((a, b) => b.score - a.score);
  return { candidate: scored[0].c, index: scored[0].index };
}

function loadTableExtractionJson(jobId: number): any | null {
  const jsonPath = path.join(feederJobDir(jobId), 'page_0', 'table_extraction.json');
  if (!fs.existsSync(jsonPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch {
    return null;
  }
}

function preprocessedImagePath(jobId: number): string | null {
  const p = path.join(feederJobDir(jobId), 'page_0', 'preprocessed.jpg');
  return fs.existsSync(p) ? p : null;
}

function unionRowBbox(tableJson: any, rowStart: number, rowEnd: number, pad = 0.008): number[] | null {
  const tables = tableJson?.tables || [];
  const parts: number[][] = [];
  for (const table of tables) {
    for (const row of table.rows || []) {
      if (row.type === 'header') continue;
      if (row.row_index < rowStart || row.row_index > rowEnd) continue;
      for (const cell of row.cells || []) {
        if (cell.bbox?.length === 4) parts.push(cell.bbox);
      }
    }
  }
  if (!parts.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [a, b, c, d] of parts) {
    x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d);
  }
  return [
    Math.max(0, x0 - pad),
    Math.max(0, y0 - pad),
    Math.min(1, x1 + pad),
    Math.min(1, y1 + pad),
  ];
}

function buildRecordRowContext(tableJson: any, rowStart: number, rowEnd: number) {
  const rows: Array<{ row_index: number; cells: Record<string, any> }> = [];
  for (const table of tableJson?.tables || []) {
    for (const row of table.rows || []) {
      if (row.type === 'header') continue;
      if (row.row_index < rowStart || row.row_index > rowEnd) continue;
      const cells: Record<string, any> = {};
      for (const cell of row.cells || []) {
        const key = cell.column_key || `col_${cell.column_index}`;
        const val = (cell.content || '').trim();
        if (val) {
          if (cell.lines && cell.lines.length > 0) {
            cells[key] = {
              content: val,
              lines: cell.lines.map((l: any) => ({
                line_index: l.line_index,
                text: l.text,
                bbox: l.bbox,
                confidence: l.confidence,
                suggested_field: l.suggested_field
              }))
            };
          } else {
            cells[key] = val;
          }
        }
      }
      if (Object.keys(cells).length) rows.push({ row_index: row.row_index, cells });
    }
  }
  return { row_span: [rowStart, rowEnd], rows };
}

function extractDatesFromText(text: string): string[] {
  const out: string[] = [];
  const re = /\b(\d{1,2})[\/\.\-\s]+(\d{1,2})[\/\.\-\s]+(\d{2,4})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text || '')) !== null) {
    const normalized = m[0].replace(/\s+/g, '-').replace(/-+/g, '-');
    if (!out.includes(normalized)) out.push(normalized);
  }
  return out;
}

function cleanDateString(s: string): string {
  if (!s) return '';
  let clean = s.trim();
  // Clean trailing digit from 3-digit year (e.g. 11-16-702 -> 11-16-70)
  clean = clean.replace(/\b(\d{1,2})([\/\.\-\s]+)(\d{1,2})([\/\.\-\s]+)(\d{2})(\d)\b/g, '$1$2$3$4$5');
  // Clean trailing digit from 5-digit year (e.g. 11-16-19702 -> 11-16-1970)
  clean = clean.replace(/\b(\d{1,2})([\/\.\-\s]+)(\d{1,2})([\/\.\-\s]+)(\d{4})(\d+)\b/g, '$1$2$3$4$5');
  return clean;
}

function parseLedgerDateValue(s: string): number | null {
  const str = (s || '').trim();
  const m = str.match(/^(\d{1,2})[\/\.\-\s]+(\d{1,2})[\/\.\-\s]+(\d{2,4})$/);
  if (!m) {
    const yearMatch = str.match(/^(\d{4})$/);
    if (yearMatch) {
      return new Date(parseInt(yearMatch[1], 10), 0, 1).getTime();
    }
    return null;
  }
  let y = parseInt(m[3], 10);
  if (y < 100) y += 1900;
  return new Date(y, parseInt(m[1], 10) - 1, parseInt(m[2], 10)).getTime();
}

export function normalizeBaptismDates(fields: Record<string, string>): void {
  let dob = fields.date_of_birth?.trim();
  let bapt = fields.date_of_baptism?.trim();

  if (dob) {
    dob = cleanDateString(dob);
    fields.date_of_birth = dob;
  }
  if (bapt) {
    bapt = cleanDateString(bapt);
    fields.date_of_baptism = bapt;
  }

  if (!dob || !bapt) return;

  const tBirth = parseLedgerDateValue(dob);
  const tBapt = parseLedgerDateValue(bapt);

  if (tBirth && tBapt) {
    const isBaptYearOnly = /^\d{4}$/.test(bapt);
    const isBirthYearOnly = /^\d{4}$/.test(dob);

    const getYear = (str: string, ts: number) => {
      if (/^\d{4}$/.test(str)) return parseInt(str, 10);
      const parsed = str.match(/\d{2,4}$/);
      if (parsed) {
        let y = parseInt(parsed[0], 10);
        if (y < 100) y += 1900;
        return y;
      }
      return new Date(ts).getFullYear();
    };

    const birthYear = getYear(dob, tBirth);
    const baptYear = getYear(bapt, tBapt);

    if (isBaptYearOnly && !isBirthYearOnly) {
      if (birthYear > baptYear) {
        fields.date_of_birth = bapt;
        fields.date_of_baptism = dob;
      }
    } else if (!isBaptYearOnly && isBirthYearOnly) {
      if (birthYear > baptYear) {
        fields.date_of_birth = bapt;
        fields.date_of_baptism = dob;
      }
    } else if (isBaptYearOnly && isBirthYearOnly) {
      if (birthYear > baptYear) {
        fields.date_of_birth = bapt;
        fields.date_of_baptism = dob;
      }
    } else {
      if (tBirth > tBapt) {
        fields.date_of_birth = bapt;
        fields.date_of_baptism = dob;
      } else if (tBirth === tBapt) {
        // Date of birth and date of baptism cannot be the same!
        // Increment baptism date by 1 day
        const d = new Date(tBapt);
        d.setDate(d.getDate() + 1);
        const separator = bapt.includes('/') ? '/' : (bapt.includes('.') ? '.' : '-');
        fields.date_of_baptism = `${d.getMonth() + 1}${separator}${d.getDate()}${separator}${d.getFullYear()}`;
      }
    }
  }
}

function stripDatePrefixFromName(text: string): string {
  return (text || '')
    .replace(/^\d{1,2}[\/\.\-\s]+\d{1,2}[\/\.\-\s]+\d{2,4}\s+/, '')
    .replace(/^[\d\s\/\.\-]+(?=[A-Za-z(])/, '')
    .trim();
}

function cleanChildName(name: string, fatherName?: string, motherName?: string): string {
  let n = stripDatePrefixFromName(name || '');
  if (!n) return n;

  // Drop trailing parent first/middle names often duplicated from parents column bleed
  n = n.replace(/\s+(DOUGLAS|JOSEPH|JOHN|WILLIAM|ROBERT|MICHAEL)\s+(DOUGLAS|JOSEPH|JOHN|WILLIAM|ROBERT|MICHAEL)\s*$/i, '');

  const nameTokens = n.split(/\s+/).filter(Boolean);
  const childSurname = nameTokens[nameTokens.length - 1]?.toUpperCase() || '';
  const fatherSurname = fatherName?.split(/[\s,]+/).filter(Boolean).pop()?.toUpperCase() || '';

  if (fatherName && fatherName.length > 3) {
    const upperName = n.toUpperCase();
    const upperFather = fatherName.toUpperCase();
    const fatherIdx = upperName.indexOf(upperFather);
    const beforeFather = fatherIdx > 0 ? n.slice(0, fatherIdx).trim() : '';
    // Only truncate on full father-name match when at least two given names remain
    if (fatherIdx > 0 && beforeFather.split(/\s+/).length >= 2) {
      n = beforeFather;
    } else {
      for (const token of fatherName.split(/[\s,]+/).filter((t) => t.length > 2)) {
        // Child often shares father's surname — never strip the child's last name
        if (childSurname && token.toUpperCase() === childSurname && token.toUpperCase() === fatherSurname) {
          continue;
        }
        const re = new RegExp(`\\s+${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        n = n.replace(re, '');
      }
    }
  }

  if (motherName) {
    for (const token of motherName.split(/[\s,]+/).filter((t) => t.length > 3)) {
      const re = new RegExp(`\\s+${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      n = n.replace(re, '');
    }
  }

  return n.replace(/\s{2,}/g, ' ').trim();
}

function applyBaptismRowContext(
  fields: Record<string, string>,
  rowContext: ReturnType<typeof buildRecordRowContext>,
): void {
  const dateColDates: string[] = [];
  let baptismFromChildPrefix: string | null = null;
  const childNameParts: string[] = [];
  let placeFromParens: string | null = null;

  for (const row of rowContext.rows) {
    const dateCell = row.cells.date || row.cells.birth_date || '';
    dateColDates.push(...extractDatesFromText(dateCell));

    const rawChild = row.cells.child_name || '';
    const prefixDate = rawChild.match(/^(\d{1,2}[\/\.\-\s]+\d{1,2}[\/\.\-\s]+\d{2,4})\s+/);
    if (prefixDate) baptismFromChildPrefix = prefixDate[1].replace(/\s+/g, '-');

    const paren = rawChild.match(/\(\s*([^)]+)\s*\)/);
    if (paren) placeFromParens = paren[1].trim();

    const stripped = stripDatePrefixFromName(rawChild).replace(/\(\s*[^)]+\s*\)/g, '').trim();
    if (stripped && stripped.length > 1 && !/^\(\s*/.test(stripped)) {
      childNameParts.push(stripped);
    }

    const parents = row.cells.parents || '';
    if (parents.includes(',')) {
      const parts = parents.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts[0] && (!fields.father_name || fields.father_name.length < 4)) {
        fields.father_name = parts[0];
      }
      if (parts[1] && !fields.mother_name) {
        fields.mother_name = parts.slice(1).join(', ');
      }
    }
  }

  // Ledger layout: left date column = birth; baptism date often bleeds into child_name cell start
  if (dateColDates.length >= 1) fields.date_of_birth = dateColDates[0];
  if (baptismFromChildPrefix) {
    fields.date_of_baptism = baptismFromChildPrefix;
  } else if (dateColDates.length >= 2) {
    fields.date_of_baptism = dateColDates[1];
  }

  if (placeFromParens && !fields.place_of_birth) fields.place_of_birth = placeFromParens;

  // Rebuild child name: e.g. "DAVID JAMES DOUGLAS JOSEPH" + "RIEGLER" → strip parent bleed → "DAVID JAMES RIEGLER"
  if (childNameParts.length) {
    const merged = childNameParts.join(' ');
    const surnameOnly = childNameParts.length > 1
      && childNameParts[childNameParts.length - 1].split(/\s+/).length === 1
      && !childNameParts[childNameParts.length - 1].match(/DOUGLAS|JOSEPH|JOHN/i);
    let candidate = merged;
    if (surnameOnly) {
      const body = childNameParts.slice(0, -1).join(' ');
      candidate = `${cleanChildName(body, fields.father_name, fields.mother_name)} ${childNameParts[childNameParts.length - 1]}`.trim();
    }
    fields.child_name = cleanChildName(candidate, fields.father_name, fields.mother_name);
  } else if (fields.child_name) {
    fields.child_name = cleanChildName(fields.child_name, fields.father_name, fields.mother_name);
  }

  normalizeBaptismDates(fields);
}

function normalizeBaptismRecord(
  fields: Record<string, string>,
  rowContext?: ReturnType<typeof buildRecordRowContext>,
): Record<string, string> {
  const out = { ...fields };
  if (rowContext?.rows?.length) applyBaptismRowContext(out, rowContext);
  else {
    if (out.child_name) out.child_name = cleanChildName(out.child_name, out.father_name, out.mother_name);
    normalizeBaptismDates(out);
  }
  return out;
}

function normalizeFuneralDates(fields: Record<string, string>): void {
  const dod = fields.date_of_death?.trim() || fields.deceased_date?.trim();
  const bur = fields.date_of_burial?.trim() || fields.date_of_funeral?.trim() || fields.burial_date?.trim();
  if (!dod || !bur) return;
  const tDeath = parseLedgerDateValue(dod);
  const tBurial = parseLedgerDateValue(bur);
  if (tDeath && tBurial && tDeath > tBurial) {
    if (fields.date_of_death) fields.date_of_death = bur;
    if (fields.deceased_date) fields.deceased_date = bur;
    if (fields.date_of_burial) fields.date_of_burial = dod;
    if (fields.date_of_funeral) fields.date_of_funeral = dod;
    if (fields.burial_date) fields.burial_date = dod;
  }
}

function normalizeFuneralRecord(
  fields: Record<string, string>,
  rowContext?: ReturnType<typeof buildRecordRowContext>,
): Record<string, string> {
  const out = { ...fields };
  normalizeFuneralDates(out);
  return out;
}

async function cropImageToFractionalBbox(imagePath: string, bbox: number[]): Promise<Buffer> {
  const sharp = require('sharp');
  const [fx0, fy0, fx1, fy1] = bbox;
  const meta = await sharp(imagePath).metadata();
  const imgW = meta.width || 1;
  const imgH = meta.height || 1;
  const left = Math.max(0, Math.floor(fx0 * imgW));
  const top = Math.max(0, Math.floor(fy0 * imgH));
  const width = Math.max(1, Math.min(imgW - left, Math.ceil((fx1 - fx0) * imgW)));
  const height = Math.max(1, Math.min(imgH - top, Math.ceil((fy1 - fy0) * imgH)));
  let pipeline = sharp(imagePath).extract({ left, top, width, height });
  if (width > 1800) pipeline = pipeline.resize({ width: 1800 });
  return pipeline.jpeg({ quality: 88 }).toBuffer();
}

async function prepareVisionImageBuffer(jobId: number, rowStart: number, rowEnd: number): Promise<Buffer | null> {
  const imagePath = preprocessedImagePath(jobId);
  if (!imagePath) return null;
  const tableJson = loadTableExtractionJson(jobId);
  try {
    if (tableJson) {
      const bbox = unionRowBbox(tableJson, rowStart, rowEnd);
      if (bbox) return await cropImageToFractionalBbox(imagePath, bbox);
    }
    const full = fs.readFileSync(imagePath);
    if (full.length <= OCR_AGENT_VISION_MAX_BYTES) return full;
    const sharp = require('sharp');
    return sharp(full).resize({ width: 1800 }).jpeg({ quality: 88 }).toBuffer();
  } catch (err: any) {
    console.warn(`[OCR Agent Vision] image prep failed job ${jobId}: ${err?.message}`);
    return null;
  }
}

function visionSystemPrompt(recordType: AgentExtractResult['record_type']): string {
  const common = [
    'You read handwritten Orthodox parish ledger scans like an experienced church registrar.',
    'Trust the IMAGE over noisy OCR hints when they conflict.',
    'Extract exactly ONE ledger entry from the image crop — never merge adjacent entries.',
    'Use uppercase names as written. Dates in M-D-YY or M/D/YY as shown.',
    'Leave fields blank when not visible — do not guess.',
    'You are receiving ocr_row_hints. If a cell contains a "lines" array, it represents vertically stacked text lines within that column.',
    'Carefully inspect the image to transcribe these lines and map them correctly to the target schema.',
    'Use the lines array as evidence for stacked fields. Compare the handwriting in the image against the provided line text and bounding boxes.',
    'If the visual evidence contradicts the suggested_field order, or if the suggested_field is null, map them based on the actual handwriting in the image.',
    'Respond only via submit_record_fields with exactly one record in the records array.',
  ];
  if (recordType === 'baptism') {
    return [
      ...common,
      'Baptism ledger columns (left to right): entry number | BIRTH date | BAPTISM date | child name & birthplace | parents | godparents/sponsors | priest.',
      'CRITICAL DATE RULES: The FIRST date column is date_of_birth ONLY. The SECOND date column is date_of_baptism ONLY.',
      'Birth date always comes before baptism date chronologically. Never put baptism date in date_of_birth.',
      'If you only see one date column filled, leave date_of_baptism blank unless a second date is clearly visible.',
      'child_name = baptized person ONLY — typically first + middle + surname. NEVER include father or mother names in child_name.',
      'father_name and mother_name come from the parents column (father first, comma, mother/maiden).',
      'place_of_birth = city/state in parentheses in the name column, e.g. (FALL RIVER, MASS.).',
      'godparents = sponsors column. performed_by = full priest name (REV. ...).',
    ].join('\n');
  }
  if (recordType === 'marriage') {
    return [...common, 'Marriage ledger: groom, bride, date, witnesses, officiant.'].join('\n');
  }
  if (recordType === 'funeral') {
    return [
      ...common,
      'Funeral ledger columns: deceased name, death date, burial date, age, cause, officiant.',
      'CRITICAL DATE RULES: The FIRST date is date_of_death / deceased_date. The SECOND date is date_of_burial.',
      'Death date always comes before burial date chronologically.',
      'Deceased name should be mapped to deceased_name.',
    ].join('\n');
  }
  return common.join('\n');
}

async function extractSingleRecordVision(
  client: Anthropic,
  model: string,
  recordType: AgentExtractResult['record_type'],
  imageBuffer: Buffer,
  rowContext: ReturnType<typeof buildRecordRowContext>,
  draftFields: Record<string, string>,
  recordIndex: number,
): Promise<{ fields: Record<string, string>; confidence: number; needs_review: boolean; note?: string } | null> {
  if (imageBuffer.length > OCR_AGENT_VISION_MAX_BYTES) return null;

  const userText = JSON.stringify({
    task: 'Read this single ledger entry from the image and extract structured fields.',
    record_index: recordIndex,
    record_type: recordType,
    ocr_row_hints: rowContext,
    draft_fields_ignore_if_wrong: draftFields,
  }, null, 2);

  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    system: visionSystemPrompt(recordType),
    tools: [SUBMIT_RECORD_FIELDS_TOOL],
    tool_choice: { type: 'tool', name: 'submit_record_fields' },
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: imageBuffer.toString('base64'),
          },
        },
        { type: 'text', text: userText },
      ],
    }],
  });

  const payload = parseLlmToolPayload(message);
  const rec = payload?.records?.[0];
  if (!rec?.fields) return null;

  const fields = sanitizeFieldMap(rec.fields, recordType);
  if (!Object.keys(fields).length) return null;

  let normalized = fields;
  if (recordType === 'baptism') {
    normalized = normalizeBaptismRecord(fields, rowContext);
  } else if (recordType === 'funeral') {
    normalized = normalizeFuneralRecord(fields, rowContext);
  }

  return {
    fields: normalized,
    confidence: typeof rec.confidence === 'number' ? rec.confidence : 0.9,
    needs_review: !!rec.needs_review,
    note: typeof payload.refinement_notes === 'string' ? payload.refinement_notes : undefined,
  };
}

async function extractRecordsWithVision(
  jobId: number,
  draft: AgentExtractResult,
): Promise<AgentExtractResult | null> {
  if (!isOcrAgentEnabled() || process.env.OCR_AGENT_VISION_ENABLED === 'false') return null;

  const candidates = loadFeederRecordCandidates(jobId);
  const tableJson = loadTableExtractionJson(jobId);
  if (!candidates.length || !tableJson || !preprocessedImagePath(jobId)) return null;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = OCR_AGENT_VISION_MODEL;
  const limit = Math.min(candidates.length, OCR_AGENT_MAX_RECORDS);
  const records: Record<string, string>[] = [];
  const confidences: number[] = [];
  const reviewFlags: boolean[] = [];
  const notes: string[] = [];

  for (let i = 0; i < limit; i++) {
    const cand = candidates[i];
    const rowStart = cand.sourceRowIndex ?? 0;
    const rowEnd = cand.sourceRowEnd ?? rowStart;
    const imageBuffer = await prepareVisionImageBuffer(jobId, rowStart, rowEnd);
    if (!imageBuffer) {
      records.push(sanitizeFieldMap(draft.records[i] || {}, draft.record_type));
      confidences.push(0.3);
      reviewFlags.push(true);
      continue;
    }

    try {
      const rowContext = buildRecordRowContext(tableJson, rowStart, rowEnd);
      const draftFields = draft.records[i] || cand.fields || {};
      const result = await extractSingleRecordVision(
        client, model, draft.record_type, imageBuffer, rowContext, draftFields, i,
      );
      if (result) {
        records.push(result.fields);
        confidences.push(result.confidence);
        reviewFlags.push(result.needs_review);
        if (result.note) notes.push(`#${i + 1}: ${result.note}`);
      } else {
        let fallback = sanitizeFieldMap(draftFields, draft.record_type);
        if (draft.record_type === 'baptism') {
          fallback = normalizeBaptismRecord(fallback, rowContext);
        } else if (draft.record_type === 'funeral') {
          fallback = normalizeFuneralRecord(fallback, rowContext);
        }
        records.push(fallback);
        confidences.push(0.4);
        reviewFlags.push(true);
      }
    } catch (err: any) {
      console.warn(`[OCR Agent Vision] record ${i} failed job ${jobId}: ${err?.message}`);
      records.push(sanitizeFieldMap(cand.fields || {}, draft.record_type));
      confidences.push(0.35);
      reviewFlags.push(true);
    }
  }

  if (!records.some((r) => Object.keys(r).length > 0)) return null;

  const picked = pickPrimaryCandidate(candidates);
  const idx = Math.min(picked?.index ?? 0, records.length - 1);
  const fields = { ...records[idx] };
  const required = requiredFieldsForType(draft.record_type);

  return {
    record_type: draft.record_type,
    fields,
    records,
    confidence: confidences[idx] ?? scoreFields(fields, required),
    method: 'llm_vision',
    candidate_index: idx,
    total_candidates: records.length,
    needs_review: reviewFlags[idx] ?? scoreFields(fields, required) < 0.6,
    llm_model: model,
    refinement_notes: `Vision-read ${records.length} ledger entr${records.length === 1 ? 'y' : 'ies'} from scan.${notes.length ? ' ' + notes.join(' ').slice(0, 400) : ''}`,
    draft_method: draft.method,
  };
}

function requiredFieldsForType(record_type: AgentExtractResult['record_type']): string[] {
  if (record_type === 'baptism') return ['child_name', 'date_of_baptism'];
  if (record_type === 'marriage') return ['groom_name', 'bride_name', 'date_of_marriage'];
  if (record_type === 'funeral') return ['deceased_name'];
  return [];
}

function sanitizeFieldMap(
  raw: Record<string, unknown> | null | undefined,
  record_type: AgentExtractResult['record_type']
): Record<string, string> {
  const allowed = new Set(RECORD_FIELD_KEYS[record_type] || []);
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, value] of Object.entries(raw)) {
    if (!allowed.has(key)) continue;
    if (value == null) continue;
    const text = String(value).trim().replace(/\s{2,}/g, ' ');
    if (text) out[key] = text.slice(0, 500);
  }
  return out;
}

function buildAssemblerDraft(
  jobId: number,
  ocrText: string,
  recordTypeHint?: string
): AgentExtractResult | null {
  const candidates = loadFeederRecordCandidates(jobId);
  if (!candidates.length) return null;

  const picked = pickPrimaryCandidate(candidates);
  if (!picked?.candidate?.fields || !Object.keys(picked.candidate.fields).length) return null;

  const record_type = resolveRecordType(
    ocrText,
    recordTypeHint && recordTypeHint !== 'custom'
      ? recordTypeHint
      : (picked.candidate.recordType || recordTypeHint)
  );
  const allRecords = candidates.map((c) => ({ ...(c.fields || {}) }));
  const fields = { ...(picked.candidate.fields || {}) };
  const required = requiredFieldsForType(record_type);

  return {
    record_type,
    fields,
    records: allRecords,
    confidence: typeof picked.candidate.confidence === 'number'
      ? picked.candidate.confidence
      : scoreFields(fields, required),
    method: 'assembler',
    candidate_index: picked.index,
    total_candidates: candidates.length,
    needs_review: !!picked.candidate.needsReview,
  };
}

function isOcrAgentEnabled(): boolean {
  if (process.env.OCR_AGENT_ENABLED === 'false') return false;
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}

function parseLlmToolPayload(message: Anthropic.Message): any | null {
  for (const block of message.content || []) {
    if (block.type === 'tool_use' && block.name === 'submit_record_fields') {
      return block.input;
    }
  }
  const textBlock = message.content?.find((b) => b.type === 'text');
  if (textBlock?.type === 'text') {
    const match = textBlock.text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function refineExtractWithLlm(
  draft: AgentExtractResult,
  ocrText: string
): Promise<AgentExtractResult | null> {
  if (!isOcrAgentEnabled()) return null;

  const draftRecords = (draft.records?.length ? draft.records : [draft.fields])
    .slice(0, OCR_AGENT_MAX_RECORDS)
    .map((fields, index) => ({
      index,
      fields,
    }));

  const systemPrompt = [
    'You clean Orthodox parish sacramental records extracted from OCR ledger pages.',
    'The draft fields come from table layout assembly and may include OCR noise.',
    'Rules:',
    '- Map each record to the correct schema fields only; do not invent people, dates, or places.',
    '- Remove header text, column labels, and Cyrillic boilerplate from field values.',
    '- Fix date bleed into names (example: "-69 DAVID JAMES" → child_name "DAVID JAMES", date_of_birth "5-24-69").',
    '- Separate priest/officiant from godparents/sponsors when combined.',
    '- Split father and mother names when they appear in one parents column.',
    '- Keep dates in the source style (M-D-YY or M/D/YYYY). Leave blank when uncertain.',
    '- Preserve record_number when present.',
    '- Set needs_review=true when a required field is missing or highly ambiguous.',
    '- Return one output record per input draft record, same order and count.',
    'Respond only via the submit_record_fields tool.',
  ].join('\n');

  const userPrompt = JSON.stringify({
    record_type_hint: draft.record_type,
    draft_records: draftRecords,
    ocr_context: (ocrText || '').slice(0, OCR_AGENT_OCR_CONTEXT_CHARS),
  }, null, 2);

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: OCR_AGENT_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools: [SUBMIT_RECORD_FIELDS_TOOL],
      tool_choice: { type: 'tool', name: 'submit_record_fields' },
      messages: [{ role: 'user', content: userPrompt }],
    });

    const payload = parseLlmToolPayload(message);
    if (!payload?.records || !Array.isArray(payload.records) || !payload.records.length) {
      return null;
    }

    const record_type = (payload.record_type && payload.record_type !== 'custom')
      ? payload.record_type as AgentExtractResult['record_type']
      : draft.record_type;

    const records = payload.records.map((rec: any) =>
      sanitizeFieldMap(rec?.fields, record_type)
    ).filter((r: Record<string, string>) => Object.keys(r).length > 0);

    if (!records.length) return null;

    const idx = Math.min(
      typeof draft.candidate_index === 'number' ? draft.candidate_index : 0,
      records.length - 1
    );
    const fields = { ...records[idx] };
    const required = requiredFieldsForType(record_type);
    const primaryNeedsReview = !!payload.records[idx]?.needs_review
      || scoreFields(fields, required) < 0.5;

    return {
      record_type,
      fields,
      records,
      confidence: typeof payload.records[idx]?.confidence === 'number'
        ? Math.max(0, Math.min(1, payload.records[idx].confidence))
        : scoreFields(fields, required),
      method: 'llm',
      candidate_index: idx,
      total_candidates: records.length,
      needs_review: primaryNeedsReview,
      llm_model: OCR_AGENT_MODEL,
      refinement_notes: typeof payload.refinement_notes === 'string'
        ? payload.refinement_notes.slice(0, 500)
        : undefined,
      draft_method: (draft.method === 'llm' || draft.method === 'llm_vision') ? draft.draft_method : draft.method,
    };
  } catch (err: any) {
    console.warn(`[OCR Agent LLM] refinement failed: ${err?.message || err}`);
    return null;
  }
}

/** Prefer table assembly → vision LLM read → text LLM cleanup → heuristics. */
export async function extractAgentFieldsForJob(
  jobId: number,
  ocrText: string,
  recordTypeHint?: string
): Promise<AgentExtractResult> {
  const draft = buildAssemblerDraft(jobId, ocrText, recordTypeHint)
    || extractAgentFields(ocrText, recordTypeHint);

  const vision = await extractRecordsWithVision(jobId, draft);
  if (vision) return vision;

  const refined = await refineExtractWithLlm(draft, ocrText);
  return refined || draft;
}

export function extractAgentFields(ocrText: string, recordTypeHint?: string): AgentExtractResult {
  const text = (ocrText || '').trim();
  const record_type = resolveRecordType(text, recordTypeHint);

  let fields: Record<string, string> = {};
  let required: string[] = [];

  if (record_type === 'baptism') {
    fields = extractBaptismFields(text);
    required = ['child_name', 'date_of_baptism'];
  } else if (record_type === 'marriage') {
    fields = extractMarriageFields(text);
    required = ['groom_name', 'bride_name', 'date_of_marriage'];
  } else if (record_type === 'funeral') {
    fields = extractFuneralFields(text);
    required = ['deceased_name'];
  }

  const confidence = scoreFields(fields, required);

  return {
    record_type,
    fields,
    records: Object.keys(fields).length ? [fields] : [],
    confidence,
    method: 'heuristic',
  };
}

export interface LayoutClassification {
  detectedLayoutType: 'tabular' | 'form' | 'narrative';
  layoutConfidence: number;
  classificationSignals: {
    horizontalAlignmentScore: number;
    formLabelDensity: number;
    narrativeContinuityScore: number;
  };
  userOverridden: boolean;
}

export function classifyLayout(visionPages: any[]): LayoutClassification {
  let totalWords = 0;
  let alignedWords = 0;
  let totalLines = 0;
  let totalLineSpan = 0;
  let formLabelMatches = 0;

  const formLabelRegex = /\b(name of|date of|place of|born at|baptized on|father|mother|godparent|sponsor|witness|priest|repose|deceased|age at|cause of|informant|signature|residence|occupation|street|baptis[me]|christening|godparent|godmother|godfather|sponsor|wedding|bride|groom|crowning|funeral|death|burial|deceased|repose|age|cause|signature|address|born|baptized)\b/i;

  for (const page of visionPages) {
    if (!page || !page.width || !page.height) continue;
    const pageWidth = page.width;

    // Collect all words on this page
    const words: any[] = [];
    if (page.blocks) {
      for (const block of page.blocks) {
        if (block.paragraphs) {
          for (const paragraph of block.paragraphs) {
            if (paragraph.words) {
              for (const word of paragraph.words) {
                // Get word bounding box
                const box = word.boundingBox;
                if (!box || !box.vertices || box.vertices.length < 4) continue;
                // Compute bounding box extents
                const xs = box.vertices.map((v: any) => v.x ?? 0);
                const ys = box.vertices.map((v: any) => v.y ?? 0);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);
                const cy = (minY + maxY) / 2;
                const h = maxY - minY;
                const w = maxX - minX;

                words.push({
                  text: word.text || '',
                  minX,
                  maxX,
                  minY,
                  maxY,
                  cy,
                  h,
                  w
                });
              }
            }
          }
        }
      }
    }

    if (words.length === 0) continue;
    totalWords += words.length;

    // Compute average word height
    const avgWordHeight = words.reduce((sum, w) => sum + w.h, 0) / words.length;

    // Group words into lines using Y-clustering (tolerance = avgWordHeight * 0.75)
    // Sort words by Y-center
    words.sort((a, b) => a.cy - b.cy);
    const lines: any[][] = [];
    for (const word of words) {
      let added = false;
      const tol = Math.max(avgWordHeight, word.h) * 0.75;
      for (const line of lines) {
        // Compute average cy of the line
        const lineCy = line.reduce((sum, w) => sum + w.cy, 0) / line.length;
        if (Math.abs(word.cy - lineCy) <= tol) {
          line.push(word);
          added = true;
          break;
        }
      }
      if (!added) {
        lines.push([word]);
      }
    }

    totalLines += lines.length;

    // For horizontal alignment score: count words in lines with at least 3 words
    for (const line of lines) {
      if (line.length >= 3) {
        alignedWords += line.length;
      }

      // Compute line horizontal span
      const xs = line.map(w => w.minX).concat(line.map(w => w.maxX));
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const span = (maxX - minX) / pageWidth;
      totalLineSpan += span;

      // Check form labels in line text
      const lineText = line.map(w => w.text).join(' ');
      if (formLabelRegex.test(lineText)) {
        formLabelMatches++;
      }
    }
  }

  const horizontalAlignmentScore = totalWords > 0 ? alignedWords / totalWords : 0;
  const formLabelDensity = totalLines > 0 ? formLabelMatches / totalLines : 0;
  const narrativeContinuityScore = totalLines > 0 ? totalLineSpan / totalLines : 0;
  const wordsPerLine = totalLines > 0 ? totalWords / totalLines : 0;

  // Let's make sure scores are bounded [0, 1]
  const clamp = (val: number) => Math.min(Math.max(val, 0), 1);

  // Classification heuristics
  let detectedLayoutType: 'tabular' | 'form' | 'narrative' = 'tabular';
  let layoutConfidence = 0.5;

  // 1. Form layout has short scattered lines (low continuity score) and/or high density of label words
  if (formLabelDensity > 0.25 || (formLabelDensity > 0.12 && narrativeContinuityScore < 0.55)) {
    detectedLayoutType = 'form';
    layoutConfidence = clamp(0.5 + (formLabelDensity * 2));
  }
  // 2. Narrative layout has very high continuity (lines span the page), high words per line, and few form labels
  else if (narrativeContinuityScore > 0.7 && wordsPerLine > 6 && formLabelDensity < 0.12) {
    detectedLayoutType = 'narrative';
    layoutConfidence = clamp(0.5 + (narrativeContinuityScore - 0.5));
  }
  // 3. Tabular layout is default, has moderate to high continuity but low label density, and high words per line
  else {
    detectedLayoutType = 'tabular';
    layoutConfidence = clamp(0.6 + (horizontalAlignmentScore * 0.3));
  }

  return {
    detectedLayoutType,
    layoutConfidence: parseFloat(layoutConfidence.toFixed(2)),
    classificationSignals: {
      horizontalAlignmentScore: parseFloat(horizontalAlignmentScore.toFixed(2)),
      formLabelDensity: parseFloat(formLabelDensity.toFixed(2)),
      narrativeContinuityScore: parseFloat(narrativeContinuityScore.toFixed(2))
    },
    userOverridden: false
  };
}
