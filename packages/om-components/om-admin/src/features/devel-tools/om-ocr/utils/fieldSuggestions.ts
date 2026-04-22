/**
 * Intelligent Field Suggestions — Entity detection + scoring for OCR field mapping.
 *
 * When a user focuses a field (e.g., "Deceased Name"), this utility:
 *   1. Scans all cell text in the record's source row
 *   2. Classifies each cell's content (name/date/number/address/text)
 *   3. Scores relevance based on field expectation match
 *   4. Returns ranked suggestions with bboxes for image highlighting
 *   5. Detects possible merged records (more names than expected)
 */

// ── Entity Types ────────────────────────────────────────────────────────────

export type EntityType = 'name' | 'date' | 'number' | 'address' | 'text';

export interface CellSuggestion {
  text: string;
  entityType: EntityType;
  score: number;
  bbox: [number, number, number, number] | null; // [x_min, y_min, x_max, y_max] fractional
  columnKey: string;
  columnIndex: number;
}

export interface SuggestionResult {
  suggestions: CellSuggestion[];
  splitWarning: boolean;
  nameCount: number;
  expectedNameFields: number;
  fieldKey: string;
}

// ── Entity Detection Patterns ───────────────────────────────────────────────

// Latin names: "John Smith", "Joseph D. Zydizk", "Fr. Michael"
const LATIN_NAME_RE = /\b(?:Mr\.?|Mrs\.?|Ms\.?|Fr\.?|Rev\.?|Dr\.?|Sr\.?|Jr\.?)\s+[A-Z][a-z]+|[A-Z][a-z]{1,}(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]{1,}/g;

// Cyrillic names: "Иван Петров"
const CYRILLIC_NAME_RE = /[А-ЯЁ][а-яё]{1,}(?:\s+[А-ЯЁ]\.?)?\s+[А-ЯЁ][а-яё]{1,}/g;

// Dates: MM/DD/YYYY, MM-DD-YYYY, Month DD YYYY, DD Month YYYY
const DATE_RE = /\b(?:\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{2,4}|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{2,4})\b/gi;

// Numbers / Age: "75", "75 yrs", "3 years"
const NUMBER_AGE_RE = /\b\d{1,3}\s*(?:yrs?|years?|mos?|months?|days?)?\b/gi;

// Addresses: "123 Main St.", "456 Oak Avenue"
const ADDRESS_RE = /\b\d+\s+[A-Z][a-z]+(?:\s+[A-Z]?[a-z]*)?\s+(?:St|Ave|Rd|Blvd|Dr|Ln|Ct|Pl|Way|Pkwy|Cir|Terr?)\.?\b/gi;

// ── Field → Entity Type Mapping ─────────────────────────────────────────────

export const FIELD_ENTITY_MAP: Record<string, EntityType> = {
  // Baptism
  child_name: 'name',
  father_name: 'name',
  mother_name: 'name',
  godparents: 'name',
  performed_by: 'name',
  date_of_birth: 'date',
  date_of_baptism: 'date',
  place_of_birth: 'address',
  address: 'address',

  // Marriage
  groom_name: 'name',
  bride_name: 'name',
  witnesses: 'name',
  officiant: 'name',
  date_of_marriage: 'date',
  place_of_marriage: 'address',

  // Funeral
  deceased_name: 'name',
  next_of_kin: 'name',
  date_of_death: 'date',
  date_of_funeral: 'date',
  date_of_burial: 'date',
  age_at_death: 'number',
  cause_of_death: 'text',
  place_of_burial: 'address',

  // Generic
  notes: 'text',
};

// ── Spatial Position Hints ───────────────────────────────────────────────────

type PositionHint = 'left' | 'center' | 'right';

const FIELD_POSITION_HINTS: Record<string, PositionHint> = {
  deceased_name: 'left',
  place_of_burial: 'right',
  officiant: 'right',
  age_at_death: 'center',
  child_name: 'left',
  performed_by: 'right',
  groom_name: 'left',
  bride_name: 'left',
};

// Fields that represent a single person's name per record
const SINGLE_NAME_FIELDS: Record<string, string[]> = {
  baptism: ['child_name'],
  marriage: ['groom_name', 'bride_name'],
  funeral: ['deceased_name'],
};

// ── Entity Detection ────────────────────────────────────────────────────────

interface DetectedEntity {
  text: string;
  type: EntityType;
  startIndex: number;
}

function detectEntities(text: string): DetectedEntity[] {
  const entities: DetectedEntity[] = [];
  const seen = new Set<string>();

  // Names (Latin)
  for (const m of text.matchAll(LATIN_NAME_RE)) {
    const key = `name:${m[0].trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      entities.push({ text: m[0].trim(), type: 'name', startIndex: m.index! });
    }
  }

  // Names (Cyrillic)
  for (const m of text.matchAll(CYRILLIC_NAME_RE)) {
    const key = `name:${m[0].trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      entities.push({ text: m[0].trim(), type: 'name', startIndex: m.index! });
    }
  }

  // Dates
  for (const m of text.matchAll(DATE_RE)) {
    const key = `date:${m[0].trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      entities.push({ text: m[0].trim(), type: 'date', startIndex: m.index! });
    }
  }

  // Addresses (check before numbers since addresses contain numbers)
  for (const m of text.matchAll(ADDRESS_RE)) {
    const key = `address:${m[0].trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      entities.push({ text: m[0].trim(), type: 'address', startIndex: m.index! });
    }
  }

  // Numbers / Age (only if not part of an address)
  for (const m of text.matchAll(NUMBER_AGE_RE)) {
    const numText = m[0].trim();
    // Skip if this number is inside an already-detected address
    const isPartOfAddress = entities.some(
      e => e.type === 'address' && m.index! >= e.startIndex && m.index! < e.startIndex + e.text.length
    );
    if (!isPartOfAddress) {
      const key = `number:${numText}`;
      if (!seen.has(key)) {
        seen.add(key);
        entities.push({ text: numText, type: 'number', startIndex: m.index! });
      }
    }
  }

  return entities;
}

// ── Table Cell Interface ────────────────────────────────────────────────────

export interface TableCell {
  content: string;
  column_key: string;
  column_index: number;
  bbox: [number, number, number, number] | null;
  confidence?: number | null;
}

// ── Main Suggestion Engine ──────────────────────────────────────────────────

/**
 * Compute field suggestions for a focused field by scanning all cells in a record row.
 *
 * @param fieldKey       - The focused field key (e.g., 'deceased_name')
 * @param recordType     - 'baptism' | 'marriage' | 'funeral'
 * @param rowCells       - All cells from the record's source row(s) in the table extraction
 * @param columnMapping  - Current column→field mapping (column_key → field_key)
 * @param usedValues     - Values already assigned to other fields (excluded from suggestions)
 */
export function computeFieldSuggestions(
  fieldKey: string,
  recordType: string,
  rowCells: TableCell[],
  columnMapping: Record<string, string> = {},
  usedValues: string[] = [],
): SuggestionResult {
  const expectedType = FIELD_ENTITY_MAP[fieldKey] || 'text';
  const suggestions: CellSuggestion[] = [];

  // Collect all name entities across all cells for split detection
  let totalNameCount = 0;

  for (const cell of rowCells) {
    const content = (cell.content || '').trim();
    if (!content) continue;

    const entities = detectEntities(content);

    // Count names for split detection
    totalNameCount += entities.filter(e => e.type === 'name').length;

    // If the field expects 'text' (e.g. notes), treat the whole cell as a suggestion
    if (expectedType === 'text') {
      suggestions.push({
        text: content,
        entityType: 'text',
        score: 0.3,
        bbox: cell.bbox,
        columnKey: cell.column_key,
        columnIndex: cell.column_index,
      });
      continue;
    }

    // Score each detected entity
    for (const entity of entities) {
      let score = 0.1; // base

      // Entity type matches field expectation
      if (entity.type === expectedType) {
        score += 0.5;
      }

      // Column is already mapped to this field
      if (columnMapping[cell.column_key] === fieldKey) {
        score += 0.3;
      }
      // Column is unmapped (potential value)
      else if (!columnMapping[cell.column_key]) {
        score += 0.1;
      }

      // Slight boost for entities that appear earlier in the text (more likely primary)
      if (entity.startIndex === 0) {
        score += 0.05;
      }

      // Spatial position scoring: boost when cell x-center matches expected zone
      const posHint = FIELD_POSITION_HINTS[fieldKey];
      if (posHint && cell.bbox) {
        const xCenter = (cell.bbox[0] + cell.bbox[2]) / 2;
        if (posHint === 'left' && xCenter < 0.4) score += 0.15;
        else if (posHint === 'right' && xCenter > 0.6) score += 0.15;
        else if (posHint === 'center' && xCenter >= 0.3 && xCenter <= 0.7) score += 0.15;
      }

      suggestions.push({
        text: entity.text,
        entityType: entity.type,
        score: Math.round(score * 100) / 100,
        bbox: cell.bbox,
        columnKey: cell.column_key,
        columnIndex: cell.column_index,
      });
    }

    // If no entities matched but content exists, add as generic text suggestion
    if (entities.length === 0 && content.length > 1) {
      suggestions.push({
        text: content,
        entityType: 'text',
        score: 0.1,
        bbox: cell.bbox,
        columnKey: cell.column_key,
        columnIndex: cell.column_index,
      });
    }
  }

  // Sort by score descending, then by entity type match
  suggestions.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Prefer matching entity type
    const aMatch = a.entityType === expectedType ? 1 : 0;
    const bMatch = b.entityType === expectedType ? 1 : 0;
    return bMatch - aMatch;
  });

  // Deduplicate by text (keep highest score)
  const seen = new Set<string>();
  const deduped = suggestions.filter(s => {
    const key = s.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Filter out values already assigned to other fields
  const usedSet = new Set(usedValues.map(v => v.trim().toLowerCase()).filter(Boolean));
  const filtered = deduped.filter(s => !usedSet.has(s.text.trim().toLowerCase()));

  // Split detection: count expected single-name fields for this record type
  const singleNameFields = SINGLE_NAME_FIELDS[recordType] || [];
  const expectedNameFields = singleNameFields.length;
  // Recompute name count from filtered list so banner matches visible chips
  const filteredNameCount = filtered.filter(s => s.entityType === 'name').length;
  const splitWarning = expectedNameFields > 0 && filteredNameCount > expectedNameFields;

  return {
    suggestions: filtered.slice(0, 8), // top 8
    splitWarning,
    nameCount: filteredNameCount,
    expectedNameFields,
    fieldKey,
  };
}

/**
 * Extract all cells from a specific record's source rows in the table extraction JSON.
 */
export function getCellsForRecord(
  tableExtractionJson: any,
  sourceRowIndex: number | number[],
): TableCell[] {
  if (!tableExtractionJson?.tables?.[0]?.rows) return [];

  const rows = tableExtractionJson.tables[0].rows;
  const indices = Array.isArray(sourceRowIndex) ? sourceRowIndex : [sourceRowIndex];
  const cells: TableCell[] = [];

  for (const ri of indices) {
    const row = rows.find((r: any) => r.row_index === ri);
    if (!row?.cells) continue;
    for (const cell of row.cells) {
      cells.push({
        content: cell.content || '',
        column_key: cell.column_key || `col_${cell.column_index + 1}`,
        column_index: cell.column_index,
        bbox: cell.bbox || null,
        confidence: cell.confidence ?? null,
      });
    }
  }

  return cells;
}
