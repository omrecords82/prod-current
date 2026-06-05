/**
 * OCR Record Type Classifier
 * Keyword-based classifier that suggests record type from OCR text.
 * Returns suggested_type + confidence. Unknown stays Unknown.
 */

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
  method: 'heuristic';
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
