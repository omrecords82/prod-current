/**
 * Record Assembler for Structured Table Extraction
 *
 * Groups multi-row physical table rows into logical records.
 * In template_locked_baptism_1950_v1, a single baptism record spans
 * 3-6 physical rows. A new logical record starts when:
 *   - The NUMBER column is non-empty (contains a digit), OR
 *   - The DATE column has a record-number prefix (digit(s) + X marker)
 *   - The DATE column has an X-marker without a number (unnumbered entry)
 *
 * Pure function — no DB or disk I/O.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface CanonicalRecord {
  record_number: string;
  // Baptism-specific fields (kept for backward compatibility)
  birth_date: string;
  baptism_date: string;
  child_name: string;
  city_of_birth: string;
  father_full_name: string;
  mother_maiden_name: string;
  sponsors: string;
  priest_name: string;
  notes_raw: string;
  source_rows: [number, number]; // [start_row_index, end_row_index]
  // Generic fields map for all record types
  fields: Record<string, string>;
  record_type: 'baptism' | 'funeral' | 'marriage';
}

export interface AssemblyResult {
  records: CanonicalRecord[];
  structured_rows: number;
  assembled_records: number;
  warnings: string[];
}

interface RowGroup {
  rows: any[];
  startIndex: number;
  endIndex: number;
}

// ── Record-type configuration ─────────────────────────────────────────────────

interface RecordTypeConfig {
  type: 'baptism' | 'funeral' | 'marriage';
  corroborationColumns: string[];   // Columns checked for content to confirm a boundary
  nameColumn: string;               // Primary name field for the record type
  keyFields: string[];              // Fields used for confidence calculation
  fieldMap: Record<string, string>; // canonical field → output field name
  columnMapping: Record<string, string>; // column_key → output field name (for metadata)
}

const BAPTISM_CONFIG: RecordTypeConfig = {
  type: 'baptism',
  corroborationColumns: ['child_name', 'parents', 'sponsors'],
  nameColumn: 'child_name',
  keyFields: ['child_name', 'birth_date', 'father_full_name', 'priest_name'],
  fieldMap: {
    record_number: 'record_number',
    birth_date: 'date_of_birth',
    baptism_date: 'date_of_baptism',
    child_name: 'child_name',
    city_of_birth: 'place_of_birth',
    father_full_name: 'father_name',
    mother_maiden_name: 'mother_name',
    sponsors: 'godparents',
    priest_name: 'performed_by',
    notes_raw: 'notes',
  },
  columnMapping: {
    number: 'record_number',
    date: 'date_of_birth',
    child_name: 'child_name',
    parents: 'father_name',
    sponsors: 'godparents',
    priest: 'performed_by',
    notes: 'notes',
  },
};

const FUNERAL_CONFIG: RecordTypeConfig = {
  type: 'funeral',
  corroborationColumns: ['deceased_name', 'age', 'cause', 'burial_place'],
  nameColumn: 'deceased_name',
  keyFields: ['deceased_name', 'date_of_death', 'cause', 'priest_name'],
  fieldMap: {
    record_number: 'record_number',
    date_of_death: 'date_of_death',
    deceased_name: 'deceased_name',
    age: 'age_at_death',
    cause: 'cause_of_death',
    burial_place: 'burial_place',
    priest_name: 'performed_by',
    notes_raw: 'notes',
  },
  columnMapping: {
    number: 'record_number',
    date: 'date_of_death',
    deceased_name: 'deceased_name',
    age: 'age_at_death',
    cause: 'cause_of_death',
    burial_place: 'burial_place',
    priest: 'performed_by',
    notes: 'notes',
  },
};

const MARRIAGE_CONFIG: RecordTypeConfig = {
  type: 'marriage',
  corroborationColumns: ['groom', 'bride', 'witnesses'],
  nameColumn: 'groom',
  keyFields: ['groom', 'bride', 'date_of_marriage', 'priest_name'],
  fieldMap: {
    record_number: 'record_number',
    date_of_marriage: 'date_of_marriage',
    groom: 'groom_name',
    groom_parents: 'groom_parents',
    bride: 'bride_name',
    bride_parents: 'bride_parents',
    priest_name: 'officiant',
    witnesses: 'witnesses',
    license: 'license',
    notes_raw: 'notes',
  },
  columnMapping: {
    number: 'record_number',
    date: 'date_of_marriage',
    groom: 'groom_name',
    groom_parents: 'groom_parents',
    bride: 'bride_name',
    bride_parents: 'bride_parents',
    priest: 'officiant',
    witnesses: 'witnesses',
    license: 'license',
  },
};

/**
 * Detect record type from column keys present in table data.
 * Falls back to 'baptism' if no distinguishing columns found.
 */
function detectRecordType(tableData: any): RecordTypeConfig {
  const columnKeys = new Set<string>();
  const rows = tableData?.tables?.[0]?.rows || [];
  for (const row of rows) {
    for (const cell of (row.cells || [])) {
      if (cell.column_key) columnKeys.add(cell.column_key);
    }
  }

  if (columnKeys.has('deceased_name') || columnKeys.has('cause') || columnKeys.has('burial_place')) {
    return FUNERAL_CONFIG;
  }
  if (columnKeys.has('groom') || columnKeys.has('bride')) {
    return MARRIAGE_CONFIG;
  }
  return BAPTISM_CONFIG;
}

// ── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalize a cell string for consistent matching:
 *  - null/undefined → ""
 *  - Unicode NFKC normalization (decomposes ligatures, normalizes width variants)
 *  - Replace all X-like characters with ASCII "x":
 *    × (U+00D7 multiplication sign), х/Х (Cyrillic), ✕ (U+2715), ✖ (U+2716),
 *    % (sometimes OCR misreads X as %)
 *  - Collapse whitespace, trim
 */
export function normalizeCell(s: string | null | undefined): string {
  if (!s) return '';
  let out = s.normalize('NFKC');
  // Replace all X-like chars with ASCII 'x'
  out = out.replace(/[×хХ✕✖%]/g, 'x');
  // Collapse whitespace
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCells(row: any): Record<string, string> {
  const cells: Record<string, string> = {};
  for (const c of (row.cells || [])) {
    cells[c.column_key] = (c.content || '').trim();
  }
  return cells;
}

/** Get cells with normalizeCell applied to all values */
function getNormalizedCells(row: any): Record<string, string> {
  const cells: Record<string, string> = {};
  for (const c of (row.cells || [])) {
    cells[c.column_key] = normalizeCell(c.content);
  }
  return cells;
}

function mergeColumn(rows: any[], columnKey: string): string {
  const parts: string[] = [];
  for (const row of rows) {
    const cell = (row.cells || []).find((c: any) => c.column_key === columnKey);
    const text = (cell?.content || '').trim();
    if (text) parts.push(text);
  }
  return parts.join('\n').replace(/[ \t]+/g, ' ').trim();
}

// ── Record boundary detection ────────────────────────────────────────────────

// All regexes operate on NORMALIZED strings (all X-like chars → "x")

// NUMBER column: digit(s), optionally followed by x marker
// e.g. "1", "1 x", "2 x", "3", "4x", "10", "12x"
const NUMBER_RE = /^\s*\d+\s*x?\s*$/i;

// DATE column: digit(s) + x marker at start (record number leaked into date)
// e.g. "2x 4-6-69", "5 x", "6x", "7 x", "11 x2-2-67"
const DATE_NUM_RE = /^\s*\d+\s*x/i;

// DATE column: x marker at start with NO digit prefix — record number was lost
// e.g. "x 8-2-699-27-49", "x 5-26-41", "ax 8-2-69" (Cyrillic noise before x)
const DATE_XMARK_RE = /^\s*[a-zа-я]*x\s*\d/i;

// ── Geometry helpers ─────────────────────────────────────────────────────────

/**
 * Get the Y-center of a row from its cell bboxes (fractional page coords).
 * Returns null if no cells have bbox data.
 */
function getRowYCenter(row: any): number | null {
  let yMin = Infinity, yMax = -Infinity;
  let found = false;
  for (const cell of (row.cells || [])) {
    if (cell.bbox && cell.bbox.length === 4) {
      found = true;
      if (cell.bbox[1] < yMin) yMin = cell.bbox[1];
      if (cell.bbox[3] > yMax) yMax = cell.bbox[3];
    }
  }
  return found ? (yMin + yMax) / 2 : null;
}

/**
 * Compute inter-row Y gaps. Returns array parallel to rows (gap BEFORE each row).
 * Index 0 is always 0. Values are in fractional page coordinates.
 */
function computeRowYGaps(rows: any[]): number[] {
  const gaps: number[] = new Array(rows.length).fill(0);
  let prevBottom: number | null = null;

  for (let i = 0; i < rows.length; i++) {
    let yMin = Infinity, yMax = -Infinity;
    let found = false;
    for (const cell of (rows[i].cells || [])) {
      if (cell.bbox && cell.bbox.length === 4) {
        found = true;
        if (cell.bbox[1] < yMin) yMin = cell.bbox[1];
        if (cell.bbox[3] > yMax) yMax = cell.bbox[3];
      }
    }
    if (found) {
      if (prevBottom !== null) {
        gaps[i] = Math.max(0, yMin - prevBottom);
      }
      prevBottom = yMax;
    }
  }
  return gaps;
}

/**
 * Compute the median of a non-empty array of numbers.
 */
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function fuzzyMatchExpectedNum(cleaned: string, expected: number): boolean {
  if (cleaned === String(expected)) return true;
  const val = cleaned.replace(/X$/i, '').trim();
  if (val === String(expected)) return true;

  const fuzzyMap: Record<number, string[]> = {
    1: ['1', 'I', 'L', '|', '!', '[', ']', '1X', 'IX', 'LX'],
    2: ['2', 'A', 'Z', 'R', '2X', 'AX', 'ZX', 'RX'],
    3: ['3', '3X'],
    4: ['4', 'A', 'H', 'K', 'I', 'L', '4X', 'AX', 'HX', 'KX', 'IX', 'LX'],
    5: ['5', 'S', '5X', 'SX'],
    6: ['6', 'B', 'G', '6X', 'BX', 'GX'],
    7: ['7', 'T', '7X', 'TX'],
    8: ['8', 'B', '8X', 'BX'],
    9: ['9', 'Q', 'G', 'O', '0', '9X', 'QX', 'GX', 'OX', '0X'],
    10: ['10', 'IO', '1O', '10X', 'IOX'],
    11: ['11', 'II', 'H', 'A', '11X', 'IIX', 'HX', 'AX'],
    12: ['12', '12X'],
    13: ['13', '13X'],
    14: ['14', '14X'],
    15: ['15', '15X']
  };

  const allowed = fuzzyMap[expected];
  if (allowed && allowed.includes(val)) {
    return true;
  }
  return false;
}

function isRecordStart(row: any, config: RecordTypeConfig = BAPTISM_CONFIG): boolean {
  const cells = getNormalizedCells(row);
  const numCol = cells.number || '';
  const dateCol = cells.date || '';

  const hasNumber = NUMBER_RE.test(numCol) || DATE_NUM_RE.test(dateCol) || DATE_XMARK_RE.test(dateCol);
  if (!hasNumber) return false;

  // Corroboration: at least one content column must be non-empty
  return config.corroborationColumns.some(col => !!cells[col]);
}

// ── Record number extraction ─────────────────────────────────────────────────

function extractRecordNumber(rows: any[]): string {
  // NUMBER column first (use normalized cells)
  for (const row of rows) {
    const cells = getNormalizedCells(row);
    if (cells.number && NUMBER_RE.test(cells.number)) {
      const m = cells.number.match(/(\d+)/);
      if (m) return m[1];
    }
  }
  // DATE column fallback (leading digits before x marker)
  for (const row of rows) {
    const cells = getNormalizedCells(row);
    if (cells.date && DATE_NUM_RE.test(cells.date)) {
      const m = cells.date.match(/^\s*(\d+)/);
      if (m) return m[1];
    }
  }
  return '';
}

// ── Date extraction ──────────────────────────────────────────────────────────

/**
 * OCR often concatenates two dates without spaces in the child_name column:
 *   "5-8-696-29-69 TARA LYNN" → birth="5-8-69", baptism="6-29-69"
 *   "6-30-467-14-46 VINCENT"  → birth="6-30-46", baptism="7-14-46"
 *   "2-17-697-19-69 SOFIA"    → birth="2-17-69", baptism="7-19-69"
 *
 * Also in date column:
 *   "x 5-26-41" → birth date
 *   "2X 4-6-69" → after stripping "2X ", date is "4-6-69"
 *
 * And standalone in child_name first line:
 *   "10-19 GERARD VERRELLI" → baptism="10-19" (partial, just M-D)
 *   "5-2469 DAVID JAMES"   → "5-24-69" with missing hyphen
 */
function extractDates(rows: any[]): { birthDate: string; baptismDate: string } {
  // Collect raw text from date and child_name columns
  const dateTexts: string[] = [];
  const childTexts: string[] = [];

  for (const row of rows) {
    const cells = getCells(row);
    if (cells.date) dateTexts.push(cells.date);
    if (cells.child_name) childTexts.push(cells.child_name);
  }

  const allDates: string[] = [];

  // From DATE column: strip record number prefix, then find dates
  // Use normalizeCell to handle all X-like chars uniformly
  for (const t of dateTexts) {
    const norm = normalizeCell(t);
    // Strip leading "Nx", "N x", "x", "ax" prefix
    const stripped = norm.replace(/^\s*\d*\s*[a-zа-я]*x?\s*/i, '').trim();
    if (!stripped) continue;

    // Try concatenated dates first: "8-2-699-27-49" → "8-2-69" + "9-27-49"
    const concatMatch = stripped.match(/^(\d{1,2}-\d{1,2}-\d{2})(\d{1,2}-\d{1,2}-\d{2,4})/);
    if (concatMatch) {
      allDates.push(concatMatch[1], concatMatch[2]);
    } else {
      // Single or separate dates
      const m = stripped.match(/(\d{1,2}-\d{1,2}-\d{2,4})/g);
      if (m) allDates.push(...m);
    }
  }

  // From child_name first line: try to parse concatenated dates
  // Pattern: "M-D-YYM-D-YY NAME" where the two dates run together
  if (childTexts.length > 0) {
    const firstLine = childTexts[0];

    // Try splitting concatenated dates: "5-8-696-29-69" → "5-8-69" + "6-29-69"
    // Pattern: digit-digit-2digitDigit-digit-2digit
    const concatMatch = firstLine.match(/^(\d{1,2}-\d{1,2}-\d{2})(\d{1,2}-\d{1,2}-\d{2})/);
    if (concatMatch) {
      allDates.push(concatMatch[1], concatMatch[2]);
    } else {
      // Try single date at start: "10-19 GERARD" or "5-2469 DAVID"
      const singleMatch = firstLine.match(/^(\d{1,2}-\d{1,2}(?:-\d{2,4})?)/);
      if (singleMatch && !allDates.some(d => d === singleMatch[1])) {
        allDates.push(singleMatch[1]);
      }
    }
  }

  return {
    birthDate: allDates[0] || '',
    baptismDate: allDates[1] || '',
  };
}

// ── Child name extraction ────────────────────────────────────────────────────

/**
 * Extract the actual child name from the child_name column.
 * Must remove:
 *   - Leading concatenated dates: "5-8-696-29-69 " or "10-19 " or "5-2469 "
 *   - City lines in parentheses: "( SOMERVILLE , N.T. )" or "41 ( SOMERVILLE ," + "N.T. )"
 *   - Stray numbers/fragments
 */
function extractChildName(rows: any[]): string {
  const nameParts: string[] = [];

  for (const row of rows) {
    const cells = getCells(row);
    const text = cells.child_name || '';
    if (!text) continue;

    // Skip lines that are city references (contain parentheses)
    if (/[()]/.test(text)) continue;

    // Strip leading date patterns aggressively from any row
    // Strip concatenated dates like "5-8-696-29-69 " or "6-30-467-14-46 "
    let cleaned = text.replace(/^\d{1,2}-\d{1,2}-\d{2,4}\d{1,2}-\d{1,2}-\d{2,4}\s*/, '');
    // Strip single date like "10-19 " or "5-2469 " or bare "10-11"
    cleaned = cleaned.replace(/^\d{1,2}-\d{2,4}\s*/, '');
    cleaned = cleaned.replace(/^\d{1,2}-\d{1,2}-\d{2,4}\s*/, '');
    cleaned = cleaned.replace(/^\d{1,2}-\d{1,2}\s*/, '');
    // Strip bare leading numbers (e.g. "41 " from "41 ( SOMERVILLE")
    cleaned = cleaned.replace(/^\d{1,4}\s+/, '');
    // Skip if just a number (no letters left)
    cleaned = cleaned.replace(/^\d{1,4}\s*$/, '');
    cleaned = cleaned.trim();
    if (cleaned) nameParts.push(cleaned);
  }

  return nameParts.join(' ').trim();
}

// ── City extraction ──────────────────────────────────────────────────────────

function extractCity(rows: any[]): string {
  const allChildText: string[] = [];
  for (const row of rows) {
    const cells = getCells(row);
    if (cells.child_name) allChildText.push(cells.child_name);
  }

  const merged = allChildText.join('\n');

  // Full parenthesized city: "( SOMERVILLE , N.T. )"
  const fullMatch = merged.match(/\(\s*(.+?)\s*\)/s);
  if (fullMatch) return fullMatch[1].replace(/\s+/g, ' ').trim();

  // Opening paren without closing: "( LEBANON , PENNA"
  const openMatch = merged.match(/\(\s*(.+)/);
  if (openMatch) return openMatch[1].replace(/\)\s*$/, '').replace(/\s+/g, ' ').trim();

  // Closing paren without opening: "N.T. )" or "CHARRISBURG , PA . )"
  for (const line of allChildText) {
    if (/\)\s*$/.test(line) && !/\(/.test(line)) {
      const cleaned = line.replace(/\)\s*$/, '').trim();
      if (cleaned && !/^\d+$/.test(cleaned)) return cleaned;
    }
  }

  return '';
}

// ── Parent extraction ────────────────────────────────────────────────────────

// Words that are NOT parent names — these leak from chrismation/conversion narratives
const PARENT_NOISE = /^(RECEIVED|ROMAN|BAPTIZED|BY|THE|WAS|INTO|HOLY|ORTHODOX|CHURCH|CATHOLIC|CHRISMATION|BYZANTINE|WHERE|HE|SHE|ONLY|FROM|ON|OF|\d+\s*,?)$/i;

function extractParents(rows: any[]): { father: string; mother: string } {
  const parts: string[] = [];
  for (const row of rows) {
    const cells = getCells(row);
    const text = (cells.parents || '').trim();
    if (!text) continue;
    // Filter out noise words (single-word lines that are narrative fragments)
    if (PARENT_NOISE.test(text)) continue;
    parts.push(text);
  }

  if (parts.length === 0) return { father: '', mother: '' };

  const fullText = parts.join(' ').replace(/\s+/g, ' ').trim();

  // Strip trailing "RECEIVED" or other noise from merged text
  const cleanedText = fullText
    .replace(/\s+RECEIVED\b.*$/i, '')
    .replace(/\s+ROMAN\b.*$/i, '')
    .replace(/\s+BAPTIZED\b.*$/i, '')
    .replace(/^\s*,\s*/, '') // Strip leading comma (father name was in previous column)
    .trim();

  // Split on FIRST comma for father/mother separation
  // But if there are multiple commas, try to find the main split
  // Pattern: "LASTNAME , MAIDEN_NAME" or "LASTNAME , MAIDEN OTHER_LAST , OTHER_MAIDEN"
  const commaIdx = cleanedText.indexOf(',');
  if (commaIdx >= 0) {
    const father = cleanedText.substring(0, commaIdx).trim();
    let mother = cleanedText.substring(commaIdx + 1).trim();
    // If mother part has another "LASTNAME , NAME" pattern, it's a second parent entry
    // (e.g. sponsor parents listed together) — just keep the first mother
    const secondComma = mother.indexOf(',');
    if (secondComma >= 0) {
      // Check if the part after second comma looks like a name (not noise)
      const afterSecond = mother.substring(secondComma + 1).trim();
      if (afterSecond && /^[A-Z]/.test(afterSecond) && !PARENT_NOISE.test(afterSecond)) {
        // Keep just the first mother name
        mother = mother.substring(0, secondComma).trim();
      }
    }
    return { father: father || '', mother: mother || '' };
  }

  return { father: cleanedText, mother: '' };
}

// ── Priest extraction ────────────────────────────────────────────────────────

/**
 * Priest name often spans priest + notes columns.
 * e.g. priest="GEORGE", notes="LEWIS" → "GEORGE LEWIS"
 *      priest="REV . ROBERT A.", notes="" → "REV . ROBERT A."
 *      priest="THE REV . ROBERT\nA. GEORGE LEWIS" → full name
 *
 * We merge both columns and deduplicate the common priest name pattern.
 */
function extractPriest(rows: any[]): string {
  // Collect all priest and notes fragments
  const priestParts: string[] = [];
  const notesParts: string[] = [];

  for (const row of rows) {
    const cells = getCells(row);
    if (cells.priest) priestParts.push(cells.priest);
    if (cells.notes) notesParts.push(cells.notes);
  }

  if (priestParts.length === 0) return '';

  // Build complete priest name by merging all priest rows
  let priestText = priestParts.join(' ').replace(/\s+/g, ' ').trim();

  // Append notes if they look like name continuation (all caps letters/periods)
  // Deduplicate notes first (e.g. "LEWIS" appearing twice)
  const uniqueNotes = [...new Set(notesParts.map(n => n.trim()).filter(Boolean))];
  for (const note of uniqueNotes) {
    if (/^[A-Z][A-Z.\s]*$/.test(note) && !priestText.includes(note)) {
      priestText = (priestText + ' ' + note).replace(/\s+/g, ' ').trim();
    }
  }

  // Clean up: remove leading "THE "
  priestText = priestText.replace(/^THE\s+/i, '');

  // Deduplicate: if priest text has multiple "REV" occurrences,
  // the name got duplicated across rows. Take from the LAST "REV" for the
  // most complete version (earlier fragments are often partial).
  const revPositions: number[] = [];
  const upperPriest = priestText.toUpperCase();
  let searchFrom = 0;
  while (true) {
    const idx = upperPriest.indexOf('REV', searchFrom);
    if (idx === -1) break;
    revPositions.push(idx);
    searchFrom = idx + 1;
  }
  if (revPositions.length >= 2) {
    priestText = priestText.substring(revPositions[revPositions.length - 1]).trim();
  }

  return priestText.trim();
}

// ── Sponsors extraction ──────────────────────────────────────────────────────

/**
 * Sponsors column sometimes contains chrismation/conversion narrative
 * instead of actual sponsor names. Separate them.
 *
 * Narrative markers: "INTO THE ... CHURCH", "RECEIVED", "CHRISMATION"
 * Real sponsors: "SOPCHAK , ELAINE MACINKO", "BRANCHICK , MARY JANE BRANCHICK"
 */
function extractSponsors(rows: any[]): { sponsors: string; notes: string } {
  const sponsorLines: string[] = [];
  const narrativeLines: string[] = [];

  for (const row of rows) {
    const cells = getCells(row);
    const text = (cells.sponsors || '').trim();
    if (!text) continue;

    // Detect narrative/conversion text
    if (/\b(INTO\s+THE|ORTHODOX\s+CHURCH|CATHOLIC\s+CHURCH|CHRISMATION|RECEIVED|BAPTIZED\s+ON|BYZANTINE)/i.test(text)) {
      narrativeLines.push(text);
    } else if (/^\d{4}\s*\.$/.test(text)) {
      // Year ending like "1969 ."
      narrativeLines.push(text);
    } else if (/^,\s*ON\s+/i.test(text)) {
      // ", ON JULY 14 1946..."
      narrativeLines.push(text);
    } else if (/^ON\s+\w+\s+\d/i.test(text)) {
      // "ON JULY 12 , ."
      narrativeLines.push(text);
    } else if (/^HOLY\s+WHERE/i.test(text)) {
      narrativeLines.push(text);
    } else {
      sponsorLines.push(text);
    }
  }

  return {
    sponsors: sponsorLines.join('\n').replace(/[ \t]+/g, ' ').trim(),
    notes: narrativeLines.join(' ').replace(/\s+/g, ' ').trim(),
  };
}

// ── Funeral field extraction ─────────────────────────────────────────────────

/**
 * Extract a simple date from the date column for funeral/marriage records.
 * Unlike baptism, these typically have a single date (no birth/baptism split).
 * Strips record number prefix (e.g. "2x 4-6-69" → "4-6-69").
 */
function extractSimpleDate(rows: any[], recNum?: string): string {
  for (const row of rows) {
    const cells = getCells(row);
    const dateText = cells.date || '';
    if (!dateText) continue;

    const norm = normalizeCell(dateText);

    // If we have a record number, check if the date starts with that record number
    if (recNum) {
      const regex = new RegExp(`^\\s*${recNum}\\s*(1[0-2]|0?[1-9])[-/\\.]\\s*([0-3]?\\d)[-/\\.]\\s*(\\d{2,4})`);
      const m = norm.match(regex);
      if (m) {
        return `${m[1]}-${m[2]}-${m[3]}`;
      }
    }

    // Strip leading "Nx", "N x", "x", "ax" prefix
    const stripped = norm.replace(/^\s*\d*\s*[a-zа-я]*x?\s*/i, '').trim();
    if (!stripped) continue;

    // Try to find a date pattern
    const m = stripped.match(/(\d{1,2}-\d{1,2}-\d{2,4})/);
    if (m) return m[1];

    // Partial date (M-D without year)
    const partial = stripped.match(/(\d{1,2}-\d{1,2})/);
    if (partial) return partial[1];
  }
  return '';
}

/**
 * Extract deceased name from the deceased_name column.
 * Reuses date-stripping logic from extractChildName.
 */
function extractDeceasedName(rows: any[]): string {
  const nameParts: string[] = [];

  for (const row of rows) {
    const cells = getCells(row);
    const text = cells.deceased_name || '';
    if (!text) continue;

    // Strip leading date patterns (same as extractChildName)
    let cleaned = text.replace(/^\d{1,2}-\d{1,2}-\d{2,4}\d{1,2}-\d{1,2}-\d{2,4}\s*/, '');
    cleaned = cleaned.replace(/^\d{1,2}-\d{2,4}\s*/, '');
    cleaned = cleaned.replace(/^\d{1,2}-\d{1,2}-\d{2,4}\s*/, '');
    cleaned = cleaned.replace(/^\d{1,2}-\d{1,2}\s*/, '');
    cleaned = cleaned.replace(/^\d{1,4}\s+/, '');
    cleaned = cleaned.replace(/^\d{1,4}\s*$/, '');
    cleaned = cleaned.trim();
    if (cleaned) nameParts.push(cleaned);
  }

  return nameParts.join(' ').trim();
}

function extractFuneralRecord(rows: any[]): Record<string, string> {
  const fields: Record<string, string> = {};

  const recNum = extractRecordNumber(rows);
  if (recNum) fields.record_number = recNum;

  const date = extractSimpleDate(rows, recNum);
  if (date) fields.date_of_death = date;

  const name = extractDeceasedName(rows);
  if (name) fields.deceased_name = name;

  const age = mergeColumn(rows, 'age');
  if (age) fields.age = age;

  const cause = mergeColumn(rows, 'cause');
  if (cause) fields.cause = cause;

  const burialPlace = mergeColumn(rows, 'burial_place');
  if (burialPlace) fields.burial_place = burialPlace;

  const priest = extractPriest(rows);
  if (priest) fields.priest_name = priest;

  const notes = mergeColumn(rows, 'notes');
  if (notes) fields.notes_raw = notes;

  return fields;
}

// ── Marriage field extraction ────────────────────────────────────────────────

function extractMarriageRecord(rows: any[]): Record<string, string> {
  const fields: Record<string, string> = {};

  const recNum = extractRecordNumber(rows);
  if (recNum) fields.record_number = recNum;

  const date = extractSimpleDate(rows, recNum);
  if (date) fields.date_of_marriage = date;

  const groom = mergeColumn(rows, 'groom');
  if (groom) fields.groom = groom;

  const groomParents = mergeColumn(rows, 'groom_parents');
  if (groomParents) fields.groom_parents = groomParents;

  const bride = mergeColumn(rows, 'bride');
  if (bride) fields.bride = bride;

  const brideParents = mergeColumn(rows, 'bride_parents');
  if (brideParents) fields.bride_parents = brideParents;

  const priest = extractPriest(rows);
  if (priest) fields.priest_name = priest;

  const witnesses = mergeColumn(rows, 'witnesses');
  if (witnesses) fields.witnesses = witnesses;

  const license = mergeColumn(rows, 'license');
  if (license) fields.license = license;

  const notes = mergeColumn(rows, 'notes');
  if (notes) fields.notes_raw = notes;

  return fields;
}

// ── Main assembler ───────────────────────────────────────────────────────────

export function assembleRecords(structuredTableOutput: any): AssemblyResult {
  const warnings: string[] = [];

  if (!structuredTableOutput?.tables?.length) {
    return { records: [], structured_rows: 0, assembled_records: 0, warnings: ['No tables in input'] };
  }

  // Detect record type from column keys
  const config = detectRecordType(structuredTableOutput);
  console.log(`  [RecordAssembler] Detected record type: ${config.type}`);

  const table = structuredTableOutput.tables[0];
  const dataRows = (table.rows || []).filter((r: any) => r.type !== 'header');
  const structuredRows = dataRows.length;

  if (dataRows.length === 0) {
    return { records: [], structured_rows: 0, assembled_records: 0, warnings: ['No data rows'] };
  }

  // ── Compute geometry signals ──
  const yGaps = computeRowYGaps(dataRows);
  const nonZeroGaps = yGaps.filter(g => g > 0);
  const medianGap = median(nonZeroGaps);
  // A "large" gap is > 2× the median — suggests a record boundary
  const gapThreshold = medianGap > 0 ? medianGap * 2 : 0.03;

  // ── Group rows into logical records ──
  const groups: RowGroup[] = [];
  let currentGroup: RowGroup | null = null;
  let orphanRows: any[] = []; // rows before first detected record start
  let maxNumberSeen = 0;

  // Log diagnostic table
  console.log(`  [RecordAssembler] Row boundary analysis (${dataRows.length} rows, medianGap=${medianGap.toFixed(4)}, gapThreshold=${gapThreshold.toFixed(4)}):`);

  for (let ri = 0; ri < dataRows.length; ri++) {
    const row = dataRows[ri];
    const cells = getNormalizedCells(row);
    const numCol = cells.number || '';
    const dateCol = cells.date || '';

    // Parse record number for monotonic check
    let parsedNum: number | null = null;
    let hasXmarkOnly = false; // X marker without record number
    const expectedNum = maxNumberSeen + 1;

    // 1. Try standard digit parsing
    if (numCol && NUMBER_RE.test(numCol)) {
      const m = numCol.match(/(\d+)/);
      if (m) parsedNum = parseInt(m[1], 10);
    } else if (dateCol && DATE_NUM_RE.test(dateCol)) {
      const m = dateCol.match(/^\s*(\d+)/);
      if (m) parsedNum = parseInt(m[1], 10);
    } else if (dateCol && DATE_XMARK_RE.test(dateCol)) {
      // X marker present but no record number — treat as boundary
      hasXmarkOnly = true;
    }

    // 2. Check for merged date + number (try expectedNum, expectedNum+1, expectedNum+2)
    if (parsedNum === null && dateCol) {
      for (let offset = 0; offset <= 2; offset++) {
        const targetNum = expectedNum + offset;
        const regex = new RegExp('^\\s*(' + targetNum + ')\\s*(1[0-2]|0?[1-9])[-\\/\\.]\\s*([0-3]?\\d)[-\\/\\.]\\s*(\\d{2,4})');
        const m = dateCol.match(regex);
        if (m) {
          parsedNum = targetNum;
          break;
        }
      }
    }

    // 3. OCR misread sequence corrector in number column
    if (parsedNum === null && numCol) {
      const cleaned = numCol.trim().toUpperCase().replace(/[\s\.]/g, '');
      if (fuzzyMatchExpectedNum(cleaned, expectedNum)) {
        parsedNum = expectedNum;
      }
    }

    // Corroboration: this row or the NEXT 1-4 rows have content in key columns.
    // If it's the last row and we have a parsed number, force corroborate to prevent it merging into previous.
    const hasContent = config.corroborationColumns.some(col => !!cells[col]);
    let lookaheadCorroboration = false;
    if (!hasContent) {
      for (let la = 1; la <= 4 && ri + la < dataRows.length; la++) {
        const laCells = getNormalizedCells(dataRows[ri + la]);
        if (config.corroborationColumns.some(col => !!laCells[col])) {
          lookaheadCorroboration = true;
          break;
        }
      }
    }
    const corroborated = hasContent || lookaheadCorroboration || (parsedNum !== null && ri === dataRows.length - 1);

    // Geometry signal: large Y gap before this row
    const hasLargeGap = yGaps[ri] > gapThreshold;

    let startsNew = false;
    let reason = 'continuation';

    if (ri === 0) {
      startsNew = true;
      reason = 'NEW (First Row)';
      maxNumberSeen = parsedNum || 1;
    } else if (parsedNum !== null && parsedNum > maxNumberSeen) {
      if (corroborated) {
        startsNew = true;
        reason = `NEW #${parsedNum} (prev max=${maxNumberSeen})${lookaheadCorroboration && !hasContent ? ' [lookahead]' : ''}`;
        maxNumberSeen = parsedNum;
      } else {
        reason = `num=${parsedNum} but no corroboration`;
      }
    } else if (parsedNum !== null) {
      reason = `num=${parsedNum} <= max=${maxNumberSeen} (monotonic skip)`;
    } else if (hasXmarkOnly) {
      if (corroborated) {
        startsNew = true;
        reason = `NEW (X-mark only, no record #)${lookaheadCorroboration && !hasContent ? ' [lookahead]' : ''}`;
      } else {
        reason = `X-mark only but no corroboration`;
      }
    } else if (hasLargeGap && currentGroup && currentGroup.rows.length >= 2) {
      // Geometry fallback: large Y gap suggests a record boundary even without
      // a number/x-marker. Only triggers if we already have ≥2 rows in the current group.
      // Requires corroboration in this or next rows.
      if (corroborated) {
        startsNew = true;
        reason = `NEW (geometry gap=${yGaps[ri].toFixed(4)} > ${gapThreshold.toFixed(4)})${lookaheadCorroboration && !hasContent ? ' [lookahead]' : ''}`;
      }
    }

    const gapInfo = yGaps[ri] > 0 ? ` gap=${yGaps[ri].toFixed(4)}${hasLargeGap ? '*' : ''}` : '';
    console.log(`  [RecordAssembler]   row ${String(row.row_index).padStart(2)}: NUM="${numCol}" DATE="${dateCol}"${gapInfo} → ${startsNew ? '** ' : '   '}${reason}`);

    if (startsNew) {
      if (currentGroup) {
        // Look back to see if we can align name boundaries.
        // We look for a contiguous block of preceding rows that have a name but no number.
        const currentGroupStartRi = dataRows.indexOf(currentGroup.rows[0]);
        let newGroupStartIdx = ri;
        let foundName = false;
        for (let rj = ri - 1; rj >= currentGroupStartRi; rj--) {
          const rjRow = dataRows[rj];
          const rjCells = getNormalizedCells(rjRow);
          
          if (rjCells.number) {
            break;
          }
          
          const hasName = !!rjCells[config.nameColumn];
          if (hasName) {
            foundName = true;
            newGroupStartIdx = rj;
          } else if (foundName) {
            break;
          }
        }

        if (newGroupStartIdx < ri) {
          console.log(`  [RecordAssembler]   → shifting new group start back from row ${ri} to ${newGroupStartIdx} (aligning name)`);
          
          const stolenCount = ri - newGroupStartIdx;
          const stolenRows = currentGroup.rows.slice(currentGroup.rows.length - stolenCount);
          currentGroup.rows = currentGroup.rows.slice(0, currentGroup.rows.length - stolenCount);
          currentGroup.endIndex = currentGroup.rows[currentGroup.rows.length - 1].row_index;
          
          if (currentGroup.rows.length > 0) {
            groups.push(currentGroup);
          }
          currentGroup = { rows: [...stolenRows, row], startIndex: stolenRows[0].row_index, endIndex: row.row_index };
        } else {
          groups.push(currentGroup);
          currentGroup = { rows: [row], startIndex: row.row_index, endIndex: row.row_index };
        }
      } else if (orphanRows.length > 0) {
        // Absorb orphan rows into this new record (they're likely city/header lines)
        console.log(`  [RecordAssembler]   → absorbing ${orphanRows.length} orphan row(s) into this record`);
        currentGroup = { rows: [...orphanRows, row], startIndex: orphanRows[0].row_index, endIndex: row.row_index };
        orphanRows = [];
      } else {
        currentGroup = { rows: [row], startIndex: row.row_index, endIndex: row.row_index };
      }
    } else if (currentGroup) {
      currentGroup.rows.push(row);
      currentGroup.endIndex = row.row_index;
    } else {
      // Orphan row before first record — buffer it
      orphanRows.push(row);
      warnings.push(`grouping_warning: Orphan row ${row.row_index} before first record start`);
      currentGroup = { rows: [row], startIndex: row.row_index, endIndex: row.row_index };
    }
  }
  if (currentGroup) groups.push(currentGroup);

  // ── Guardrails ──
  if (groups.length === 0) {
    warnings.push('grouping_warning: No record groups formed');
  }
  if (dataRows.length > 0 && !isRecordStart(dataRows[0], config)) {
    warnings.push('grouping_warning: First data row has no record number');
  }

  console.log(`  [RecordAssembler] Groups formed: ${groups.length}, maxNumberSeen: ${maxNumberSeen}`);

  // ── Convert groups to canonical records ──
  const records: CanonicalRecord[] = [];

  for (const group of groups) {
    if (config.type === 'funeral') {
      const f = extractFuneralRecord(group.rows);
      records.push({
        record_number: f.record_number || '',
        birth_date: '', baptism_date: '', child_name: '', city_of_birth: '',
        father_full_name: '', mother_maiden_name: '', sponsors: '',
        priest_name: f.priest_name || '',
        notes_raw: f.notes_raw || '',
        source_rows: [group.startIndex, group.endIndex],
        fields: f,
        record_type: 'funeral',
      });
    } else if (config.type === 'marriage') {
      const f = extractMarriageRecord(group.rows);
      records.push({
        record_number: f.record_number || '',
        birth_date: '', baptism_date: '', child_name: '', city_of_birth: '',
        father_full_name: '', mother_maiden_name: '', sponsors: '',
        priest_name: f.priest_name || '',
        notes_raw: f.notes_raw || '',
        source_rows: [group.startIndex, group.endIndex],
        fields: f,
        record_type: 'marriage',
      });
    } else {
      // Baptism — original extraction logic
      const recordNumber = extractRecordNumber(group.rows);
      const dates = extractDates(group.rows);
      const childName = extractChildName(group.rows);
      const city = extractCity(group.rows);
      const { father, mother } = extractParents(group.rows);
      const priestName = extractPriest(group.rows);
      const { sponsors, notes: sponsorNotes } = extractSponsors(group.rows);

      // Notes column often just has priest name overflow (e.g. "LEWIS")
      // Only include direct notes if they're NOT already in the priest name
      const directNotes = mergeColumn(group.rows, 'notes');
      let notesRaw = sponsorNotes;
      if (directNotes) {
        const noteLines = [...new Set(directNotes.split('\n').map(l => l.trim()).filter(Boolean))];
        const unusedNotes = noteLines.filter(n => !priestName.toUpperCase().includes(n.toUpperCase()));
        if (unusedNotes.length > 0) {
          const extra = unusedNotes.join(' ');
          notesRaw = notesRaw ? notesRaw + ' ' + extra : extra;
        }
      }

      const fields: Record<string, string> = {};
      if (recordNumber) fields.record_number = recordNumber;
      if (dates.birthDate) fields.birth_date = dates.birthDate;
      if (dates.baptismDate) fields.baptism_date = dates.baptismDate;
      if (childName) fields.child_name = childName;
      if (city) fields.city_of_birth = city;
      if (father) fields.father_full_name = father;
      if (mother) fields.mother_maiden_name = mother;
      if (sponsors) fields.sponsors = sponsors;
      if (priestName) fields.priest_name = priestName;
      if (notesRaw) fields.notes_raw = notesRaw;

      records.push({
        record_number: recordNumber,
        birth_date: dates.birthDate,
        baptism_date: dates.baptismDate,
        child_name: childName,
        city_of_birth: city,
        father_full_name: father,
        mother_maiden_name: mother,
        sponsors,
        priest_name: priestName,
        notes_raw: notesRaw,
        source_rows: [group.startIndex, group.endIndex],
        fields,
        record_type: 'baptism',
      });
    }
  }

  console.log(`  [RecordAssembler] Structured rows: ${structuredRows}, Assembled records: ${records.length}`);
  for (const w of warnings) {
    console.log(`  [RecordAssembler] ${w}`);
  }

  return { records, structured_rows: structuredRows, assembled_records: records.length, warnings };
}

// ── Convert to pipeline RecordCandidate format ──────────────────────────────

export function assembledToRecordCandidates(
  assemblyResult: AssemblyResult,
  recordType: string
): {
  candidates: Array<{
    recordType: string;
    confidence: number;
    fields: Record<string, string>;
    sourceRowIndex: number;
    sourceRowEnd: number;
    needsReview: boolean;
  }>;
  detectedType: string;
  typeConfidence: number;
  columnMapping: Record<string, string>;
  unmappedColumns: string[];
  parsedAt: string;
  assemblyMeta: {
    structured_rows: number;
    assembled_records: number;
    warnings: string[];
  };
} {
  // Determine config from first record's type (all records in an assembly share the same type)
  const detectedRecordType = assemblyResult.records[0]?.record_type || 'baptism';
  const config = detectedRecordType === 'funeral' ? FUNERAL_CONFIG
    : detectedRecordType === 'marriage' ? MARRIAGE_CONFIG
    : BAPTISM_CONFIG;

  const candidates = assemblyResult.records.map((rec) => {
    // For funeral/marriage, use the generic fields map with config.fieldMap
    // For baptism, use the legacy typed fields (backward compat)
    const fields: Record<string, string> = {};

    if (rec.record_type === 'baptism') {
      // Legacy baptism mapping
      if (rec.record_number) fields.record_number = rec.record_number;
      if (rec.birth_date) fields.date_of_birth = rec.birth_date;
      if (rec.baptism_date) fields.date_of_baptism = rec.baptism_date;
      if (rec.child_name) fields.child_name = rec.child_name;
      if (rec.city_of_birth) fields.place_of_birth = rec.city_of_birth;
      if (rec.father_full_name) fields.father_name = rec.father_full_name;
      if (rec.mother_maiden_name) fields.mother_name = rec.mother_maiden_name;
      if (rec.sponsors) fields.godparents = rec.sponsors;
      if (rec.priest_name) fields.performed_by = rec.priest_name;
      if (rec.notes_raw) fields.notes = rec.notes_raw;
    } else {
      // Generic mapping: apply config.fieldMap to rec.fields
      for (const [canonicalKey, outputKey] of Object.entries(config.fieldMap)) {
        const value = rec.fields[canonicalKey];
        if (value) fields[outputKey] = value;
      }
    }

    // Confidence: count how many key fields are populated
    const keyFieldCount = config.keyFields
      .map(k => rec.fields[k] || (rec as any)[k] || '')
      .filter(v => v.length > 0).length;
    const confidence = Math.round((0.5 + keyFieldCount * 0.125) * 100) / 100;

    // needsReview: missing primary name or date
    const primaryName = rec.fields[config.nameColumn] || (rec as any)[config.nameColumn] || '';
    const primaryDate = rec.record_type === 'baptism' ? rec.birth_date
      : rec.fields.date_of_death || rec.fields.date_of_marriage || '';
    const needsReview = !primaryName || !primaryDate;

    return {
      recordType,
      confidence,
      fields,
      sourceRowIndex: rec.source_rows[0],
      sourceRowEnd: rec.source_rows[1],
      needsReview,
    };
  });

  return {
    candidates,
    detectedType: recordType,
    typeConfidence: 0.85,
    columnMapping: config.columnMapping,
    unmappedColumns: [],
    parsedAt: new Date().toISOString(),
    assemblyMeta: {
      structured_rows: assemblyResult.structured_rows,
      assembled_records: assemblyResult.assembled_records,
      warnings: assemblyResult.warnings,
    },
  };
}
