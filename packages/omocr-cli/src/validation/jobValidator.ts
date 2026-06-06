import type { JobDetail, ValidationIssue, ValidationReport } from '../types/index.js';

function parseLedgerDate(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (!m) return null;
  let y = parseInt(m[3], 10);
  if (y < 100) y += y >= 50 ? 1900 : 2000;
  return new Date(y, parseInt(m[1], 10) - 1, parseInt(m[2], 10));
}

const REQUIRED: Record<string, string[]> = {
  baptism: ['child_first_name', 'child_last_name', 'date_of_baptism'],
  marriage: ['date_of_marriage', 'groom_first_name', 'groom_last_name', 'bride_first_name', 'bride_last_name'],
  funeral: ['deceased_first_name', 'deceased_last_name'],
};

export function validateJobLocally(jobId: number, churchId: number, detail: JobDetail, extract: unknown): ValidationReport {
  const issues: ValidationIssue[] = [];
  const ext = extract as {
    record_type?: string;
    records?: Array<Record<string, string>>;
    confirmed_indexes?: number[];
    method?: string;
  } | null;

  const recordType = ext?.record_type || detail.record_type || 'baptism';
  const records = ext?.records?.length ? ext.records : [];
  const page = detail.pages?.[0];
  const candidates = (page?.recordCandidates as { candidates?: unknown[] } | undefined)?.candidates ?? [];

  if (records.length && candidates.length && records.length !== candidates.length) {
    issues.push({
      code: 'record_candidate_count_mismatch',
      severity: 'warning',
      message: `Agent records (${records.length}) != candidates (${candidates.length})`,
    });
  }

  const required = REQUIRED[recordType] || [];
  records.forEach((rec, i) => {
    for (const field of required) {
      if (!(rec[field] || '').trim()) {
        issues.push({
          code: 'missing_required_field',
          severity: 'error',
          message: `Missing required field "${field}"`,
          recordIndex: i,
          field,
        });
      }
    }
    if (recordType === 'baptism') {
      const dob = parseLedgerDate(rec.date_of_birth || '');
      const bapt = parseLedgerDate(rec.date_of_baptism || '');
      if (dob && bapt && dob > bapt) {
        issues.push({
          code: 'chronology_birth_after_baptism',
          severity: 'error',
          message: 'Date of birth is after date of baptism',
          recordIndex: i,
        });
      }
    }
    if (recordType === 'funeral') {
      const death = parseLedgerDate(rec.date_of_death || '');
      const burial = parseLedgerDate(rec.date_of_burial || '');
      if (death && burial && death > burial) {
        issues.push({
          code: 'chronology_death_after_burial',
          severity: 'error',
          message: 'Date of death is after date of burial',
          recordIndex: i,
        });
      }
    }
  });

  const table = page?.tableExtractionJson as { page_dimensions?: { width: number; height: number }; column_bands?: Record<string, number[]> } | undefined;
  if (table?.column_bands) {
    for (const [key, band] of Object.entries(table.column_bands)) {
      if (!Array.isArray(band) || band.length !== 2) {
        issues.push({ code: 'invalid_column_band', severity: 'error', message: `Invalid column band for "${key}"` });
      } else if (band[0] < 0 || band[1] > 1 || band[0] >= band[1]) {
        issues.push({ code: 'column_band_out_of_range', severity: 'warning', message: `Column band "${key}" outside 0..1`, field: key });
      }
    }
  }

  const errors = issues.filter((i) => i.severity === 'error').length;
  return {
    jobId,
    churchId,
    passed: errors === 0,
    issues,
    summary: {
      recordType,
      recordCount: records.length,
      candidateCount: candidates.length,
      errorCount: errors,
      warningCount: issues.length - errors,
      extractionMethod: ext?.method ?? null,
    },
  };
}
