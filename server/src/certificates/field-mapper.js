/**
 * Field Mapper — Maps sacramental record data into certificate field values
 *
 * Takes a record + church metadata + template field definitions
 * and produces a key→value map ready for PDF rendering.
 *
 * Handles:
 *   - Direct record field access
 *   - Church metadata fields (name, rector)
 *   - Computed fields (full names from parts)
 *   - Date formatting
 *   - Text transforms (uppercase, capitalize)
 */

/**
 * Map record data to certificate field values using template field definitions.
 *
 * @param {object[]} fields — certificate_template_fields rows
 * @param {object} record — sacramental record from church DB
 * @param {object} church — church metadata { name, rector_name, seal_image_path, ... }
 * @returns {object} Map of field_key → rendered string value
 */
function mapFieldValues(fields, record, church = {}) {
  const result = {};

  for (const field of fields) {
    let value = '';

    switch (field.source_type) {
      case 'record':
        value = resolveRecordValue(field.source_path, record);
        break;

      case 'church':
        value = resolveChurchValue(field.source_path, church);
        break;

      case 'computed':
        value = resolveComputedValue(field.source_path, record, church);
        break;

      case 'static':
        value = field.source_path || '';
        break;

      case 'user_input':
        // User-provided at generation time — leave empty for now
        value = '';
        break;
    }

    // Format dates — only for raw record-typed date columns. Computed
    // values use their own format directives (e.g. birth_date|md), so
    // applying formatDate here would mangle "12/3" back into a long
    // "Month Day, Year" string.
    if (value && field.source_type === 'record' && isDateField(field.field_key, field.source_path)) {
      value = formatDate(value);
    }

    // Apply text transform
    if (value && field.text_transform && field.text_transform !== 'none') {
      value = applyTextTransform(value, field.text_transform);
    }

    result[field.field_key] = value;
  }

  return result;
}

/**
 * Resolve a value from the sacramental record.
 */
function resolveRecordValue(sourcePath, record) {
  if (!sourcePath || !record) return '';

  // Support dot notation: e.g. 'sponsors'
  const parts = sourcePath.split('.');
  let val = record;
  for (const p of parts) {
    if (val == null) return '';
    val = val[p];
  }
  return val != null ? String(val) : '';
}

/**
 * Resolve a value from church metadata.
 */
function resolveChurchValue(sourcePath, church) {
  if (!sourcePath || !church) return '';

  const parts = sourcePath.split('.');
  let val = church;
  for (const p of parts) {
    if (val == null) return '';
    val = val[p];
  }
  return val != null ? String(val) : '';
}

/**
 * Resolve computed values — typically combining or formatting record fields.
 *
 * source_path conventions:
 *   'first_name+last_name'  — joins with space
 *   'fname_groom+lname_groom' — joins with space
 *   'parents'               — returns parents field directly (used for child baptism "child of" line)
 *
 *   Format directives — `path|format`. The directive is applied AFTER the
 *   field is resolved. Used by the OCA template fields where the artwork
 *   has separate placeholder spots (e.g. "ON ____, 20___" with the year
 *   pre-printed as "20"):
 *
 *     'birth_date|md'      — "12/3"   (month/day, no zero-pad)
 *     'birth_date|yy'      — "25"     (last 2 digits of year)
 *     'birth_date|yyyy'    — "2025"   (4-digit year)
 *     'reception_date|md'  — same shape as |md above
 *     'parents|first'      — "Nicholas Torrisi"  (first half of "A & B" / "A, B")
 *     'parents|second'     — "Samantha Dominy"   (second half)
 *     'witness|first'      — same split for marriage witnesses
 *     'witness|second'     — ditto
 */
function resolveComputedValue(sourcePath, record, church) {
  if (!sourcePath) return '';

  // Format directive: path|format
  if (sourcePath.includes('|')) {
    const [rawPath, format] = sourcePath.split('|', 2).map(s => s.trim());
    const raw = record[rawPath] != null ? record[rawPath] : (church[rawPath] != null ? church[rawPath] : '');
    return applyComputedFormat(raw, format);
  }

  // Concatenation pattern: field1+field2
  if (sourcePath.includes('+')) {
    const parts = sourcePath.split('+');
    return parts
      .map(p => record[p.trim()] || '')
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  // Simple field fallback
  if (record[sourcePath] != null) return String(record[sourcePath]);
  if (church[sourcePath] != null) return String(church[sourcePath]);

  return '';
}

// Apply a |format directive to a resolved raw value. Used for OCA's
// split-field placeholders. Returns '' on any parse failure rather than
// surfacing the raw value, since "wrong format" on a certificate is
// worse than "blank".
function applyComputedFormat(raw, format) {
  if (raw == null || raw === '') return '';

  switch (format) {
    case 'md': {
      const d = parseDate(raw);
      if (!d) return '';
      return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
    }
    case 'yy': {
      const d = parseDate(raw);
      if (!d) return '';
      return String(d.getUTCFullYear()).slice(-2);
    }
    case 'yyyy': {
      const d = parseDate(raw);
      if (!d) return '';
      return String(d.getUTCFullYear());
    }
    case 'first':
    case 'second': {
      const [a, b] = splitTwoParty(String(raw));
      return format === 'first' ? a : b;
    }
    default:
      // Unknown directive — return raw to avoid silently dropping.
      return String(raw);
  }
}

// Robust date parse — accepts Date objects, ISO strings, YYYY-MM-DD, or
// MySQL TIMESTAMP strings. Returns a Date in UTC (so getUTCMonth/Date
// match the date the DB stored, regardless of server timezone).
function parseDate(raw) {
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }
  if (typeof raw === 'string') {
    // YYYY-MM-DD — interpret as UTC midnight (no timezone shift).
    const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (ymd) {
      return new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])));
    }
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// Split a combined "A & B" / "A, B" / "A; B" string into [A, B].
// Mirrors the front-end splitTwoParty helper to keep round-trip stable.
function splitTwoParty(combined) {
  if (!combined) return ['', ''];
  const trimmed = String(combined).trim();
  if (!trimmed) return ['', ''];
  for (const sep of [' & ', '&', ';', ',']) {
    if (trimmed.includes(sep)) {
      const parts = trimmed.split(sep).map(s => s.trim()).filter(Boolean);
      return [parts[0] || '', parts[1] || ''];
    }
  }
  return [trimmed, ''];
}

/**
 * Detect date fields by key or source path.
 */
function isDateField(fieldKey, sourcePath) {
  const datePatterns = ['date', '_date', 'mdate', 'reception_date', 'birth_date', 'deceased_date', 'burial_date'];
  const combined = `${fieldKey} ${sourcePath || ''}`.toLowerCase();
  return datePatterns.some(p => combined.includes(p));
}

/**
 * Format a date value for certificate display.
 * Produces "Month Day, Year" format (e.g., "March 15, 2026").
 */
function formatDate(value) {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return String(value);
  }
}

/**
 * Apply text transforms.
 */
function applyTextTransform(value, transform) {
  switch (transform) {
    case 'uppercase': return value.toUpperCase();
    case 'lowercase': return value.toLowerCase();
    case 'capitalize':
      return value.replace(/\b\w/g, c => c.toUpperCase());
    default: return value;
  }
}

module.exports = {
  mapFieldValues,
  formatDate,
  resolveComputedValue,
};
