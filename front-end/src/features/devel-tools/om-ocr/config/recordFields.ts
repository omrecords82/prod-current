/**
 * Record Fields Configuration
 * Default field definitions aligned with parish Records DB headers
 * (see prod/docs/sample_records/{baptism,marriage,funeral}/header_fields.png).
 * Churches override labels/headers/visibility via /api/church/:id/ocr/record-fields.
 */

export type RecordFieldType = 'text' | 'date' | 'textarea';

export interface FieldDefinition {
  name: string;
  label: string;
  required: boolean;
  type: RecordFieldType;
  /** Printed ledger column header (e.g. "FIRST NAME") */
  headerLabel?: string;
  /** When false the field is hidden from OCR review and agent forms */
  visible?: boolean;
  sortOrder?: number;
}

export type RecordTypeKey = 'baptism' | 'marriage' | 'funeral';

export interface ChurchRecordFieldRow {
  key: string;
  label: string;
  headerLabel: string;
  required: boolean;
  visible: boolean;
  sortOrder: number;
  type: RecordFieldType;
}

/** Canonical extraction targets — matches Records Management column headers. */
export const RECORD_FIELDS: Record<string, FieldDefinition[]> = {
  baptism: [
    { name: 'child_first_name', label: 'First Name', required: true, type: 'text', headerLabel: 'FIRST NAME', visible: true, sortOrder: 0 },
    { name: 'child_last_name', label: 'Last Name', required: true, type: 'text', headerLabel: 'LAST NAME', visible: true, sortOrder: 1 },
    { name: 'date_of_birth', label: 'Date of Birth', required: false, type: 'date', headerLabel: 'DATE OF BIRTH', visible: true, sortOrder: 2 },
    { name: 'date_of_baptism', label: 'Baptism Date', required: true, type: 'date', headerLabel: 'BAPTISM DATE', visible: true, sortOrder: 3 },
    { name: 'place_of_birth', label: 'Birthplace', required: false, type: 'text', headerLabel: 'BIRTHPLACE', visible: true, sortOrder: 4 },
    { name: 'entry_type', label: 'Entry Type', required: false, type: 'text', headerLabel: 'ENTRY TYPE', visible: true, sortOrder: 5 },
    { name: 'godparents', label: 'Sponsors', required: false, type: 'text', headerLabel: 'SPONSORS', visible: true, sortOrder: 6 },
    { name: 'parents', label: 'Parents', required: false, type: 'text', headerLabel: 'PARENTS', visible: true, sortOrder: 7 },
    { name: 'performed_by', label: 'Officiating Priest', required: false, type: 'text', headerLabel: 'OFFICIATING PRIEST', visible: true, sortOrder: 8 },
    { name: 'notes', label: 'Notes', required: false, type: 'textarea', headerLabel: 'NOTES', visible: true, sortOrder: 9 },
    // Legacy / ledger-only keys (kept for agent output compatibility, hidden in review)
    { name: 'record_number', label: 'Record #', required: false, type: 'text', headerLabel: 'NUMBER', visible: false, sortOrder: 90 },
    { name: 'child_name', label: 'Name of Child (combined)', required: false, type: 'text', headerLabel: 'NAME OF CHILD', visible: false, sortOrder: 91 },
    { name: 'father_name', label: "Father's Name", required: false, type: 'text', headerLabel: "FATHER'S NAME", visible: false, sortOrder: 92 },
    { name: 'mother_name', label: "Mother's Name", required: false, type: 'text', headerLabel: "MOTHER'S NAME", visible: false, sortOrder: 93 },
    { name: 'address', label: 'Address', required: false, type: 'text', headerLabel: 'ADDRESS', visible: false, sortOrder: 94 },
    { name: 'church', label: 'Church', required: false, type: 'text', headerLabel: 'CHURCH', visible: false, sortOrder: 95 },
  ],
  marriage: [
    { name: 'date_of_marriage', label: 'Marriage Date', required: true, type: 'date', headerLabel: 'MARRIAGE DATE', visible: true, sortOrder: 0 },
    { name: 'groom_first_name', label: "Groom's First Name", required: true, type: 'text', headerLabel: "GROOM'S FIRST NAME", visible: true, sortOrder: 1 },
    { name: 'groom_last_name', label: "Groom's Last Name", required: true, type: 'text', headerLabel: "GROOM'S LAST NAME", visible: true, sortOrder: 2 },
    { name: 'groom_parents', label: "Groom's Parents", required: false, type: 'text', headerLabel: "GROOM'S PARENTS", visible: true, sortOrder: 3 },
    { name: 'bride_first_name', label: "Bride's First Name", required: true, type: 'text', headerLabel: "BRIDE'S FIRST NAME", visible: true, sortOrder: 4 },
    { name: 'bride_last_name', label: "Bride's Last Name", required: true, type: 'text', headerLabel: "BRIDE'S LAST NAME", visible: true, sortOrder: 5 },
    { name: 'bride_parents', label: "Bride's Parents", required: false, type: 'text', headerLabel: "BRIDE'S PARENTS", visible: true, sortOrder: 6 },
    { name: 'witnesses', label: 'Witnesses', required: false, type: 'text', headerLabel: 'WITNESSES', visible: true, sortOrder: 7 },
    { name: 'marriage_license', label: 'Marriage License', required: false, type: 'text', headerLabel: 'MARRIAGE LICENSE', visible: true, sortOrder: 8 },
    { name: 'officiant', label: 'Officiating Priest', required: false, type: 'text', headerLabel: 'OFFICIATING PRIEST', visible: true, sortOrder: 9 },
    { name: 'notes', label: 'Notes', required: false, type: 'textarea', headerLabel: 'NOTES', visible: true, sortOrder: 10 },
    { name: 'record_number', label: 'Record #', required: false, type: 'text', headerLabel: 'NUMBER', visible: false, sortOrder: 90 },
    { name: 'groom_name', label: 'Groom Name (combined)', required: false, type: 'text', headerLabel: 'GROOM', visible: false, sortOrder: 91 },
    { name: 'bride_name', label: 'Bride Name (combined)', required: false, type: 'text', headerLabel: 'BRIDE', visible: false, sortOrder: 92 },
    { name: 'place_of_marriage', label: 'Place of Marriage', required: false, type: 'text', headerLabel: 'PLACE OF MARRIAGE', visible: false, sortOrder: 93 },
    { name: 'best_man', label: 'Best Man', required: false, type: 'text', headerLabel: 'BEST MAN', visible: false, sortOrder: 94 },
    { name: 'maid_of_honor', label: 'Maid of Honor', required: false, type: 'text', headerLabel: 'MAID OF HONOR', visible: false, sortOrder: 95 },
    { name: 'church', label: 'Church', required: false, type: 'text', headerLabel: 'CHURCH', visible: false, sortOrder: 96 },
  ],
  funeral: [
    { name: 'date_of_death', label: 'Date of Death', required: false, type: 'date', headerLabel: 'DATE OF DEATH', visible: true, sortOrder: 0 },
    { name: 'date_of_burial', label: 'Burial Date', required: false, type: 'date', headerLabel: 'BURIAL DATE', visible: true, sortOrder: 1 },
    { name: 'deceased_first_name', label: "Deceased's First Name", required: true, type: 'text', headerLabel: "DECEASED'S FIRST NAME", visible: true, sortOrder: 2 },
    { name: 'deceased_last_name', label: "Deceased's Last Name", required: true, type: 'text', headerLabel: "DECEASED'S LAST NAME", visible: true, sortOrder: 3 },
    { name: 'age_at_death', label: 'Age at Death', required: false, type: 'text', headerLabel: 'AGE AT DEATH', visible: true, sortOrder: 4 },
    { name: 'officiant', label: 'Officiating Priest', required: false, type: 'text', headerLabel: 'OFFICIATING PRIEST', visible: true, sortOrder: 5 },
    { name: 'place_of_burial', label: 'Burial Location', required: false, type: 'text', headerLabel: 'BURIAL LOCATION', visible: true, sortOrder: 6 },
    { name: 'notes', label: 'Notes', required: false, type: 'textarea', headerLabel: 'NOTES', visible: true, sortOrder: 7 },
    { name: 'record_number', label: 'Record #', required: false, type: 'text', headerLabel: 'NUMBER', visible: false, sortOrder: 90 },
    { name: 'deceased_name', label: 'Deceased Name (combined)', required: false, type: 'text', headerLabel: 'NAME OF DECEASED', visible: false, sortOrder: 91 },
    { name: 'date_of_funeral', label: 'Date of Funeral', required: false, type: 'date', headerLabel: 'DATE OF FUNERAL', visible: false, sortOrder: 92 },
    { name: 'cause_of_death', label: 'Cause of Death', required: false, type: 'text', headerLabel: 'CAUSE OF DEATH', visible: false, sortOrder: 93 },
    { name: 'church', label: 'Church', required: false, type: 'text', headerLabel: 'CHURCH', visible: false, sortOrder: 94 },
  ],
};

export type ChurchRecordFieldConfig = Partial<Record<RecordTypeKey, ChurchRecordFieldRow[]>>;

function splitCombinedName(full?: string): { first: string; last: string } {
  const trimmed = (full || '').trim();
  if (!trimmed) return { first: '', last: '' };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

/** Map legacy combined-name agent output into split first/last fields for review. */
export function normalizeExtractRecord(recordType: string, rec: Record<string, string>): Record<string, string> {
  const out = { ...rec };
  if (recordType === 'baptism') {
    if (!out.child_first_name?.trim() && !out.child_last_name?.trim() && out.child_name?.trim()) {
      const { first, last } = splitCombinedName(out.child_name);
      out.child_first_name = first;
      out.child_last_name = last;
    }
    if (!out.parents?.trim() && (out.father_name || out.mother_name)) {
      out.parents = [out.father_name, out.mother_name].filter(Boolean).join(', ');
    }
  } else if (recordType === 'marriage') {
    if (!out.groom_first_name?.trim() && !out.groom_last_name?.trim() && out.groom_name?.trim()) {
      const { first, last } = splitCombinedName(out.groom_name);
      out.groom_first_name = first;
      out.groom_last_name = last;
    }
    if (!out.bride_first_name?.trim() && !out.bride_last_name?.trim() && out.bride_name?.trim()) {
      const { first, last } = splitCombinedName(out.bride_name);
      out.bride_first_name = first;
      out.bride_last_name = last;
    }
  } else if (recordType === 'funeral') {
    if (!out.deceased_first_name?.trim() && !out.deceased_last_name?.trim() && out.deceased_name?.trim()) {
      const { first, last } = splitCombinedName(out.deceased_name);
      out.deceased_first_name = first;
      out.deceased_last_name = last;
    }
  }
  return out;
}

export function normalizeExtractRecords(
  recordType: string,
  records: Array<Record<string, string>>,
): Array<Record<string, string>> {
  return records.map((r) => normalizeExtractRecord(recordType, r));
}

export function recordDisplayName(recordType: string, rec: Record<string, string>): string {
  const n = normalizeExtractRecord(recordType, rec);
  if (recordType === 'baptism') {
    return [n.child_first_name, n.child_last_name].filter(Boolean).join(' ') || n.child_name || '';
  }
  if (recordType === 'marriage') {
    const groom = [n.groom_first_name, n.groom_last_name].filter(Boolean).join(' ');
    const bride = [n.bride_first_name, n.bride_last_name].filter(Boolean).join(' ');
    if (groom && bride) return `${groom} & ${bride}`;
    return groom || bride || n.groom_name || n.bride_name || '';
  }
  if (recordType === 'funeral') {
    return [n.deceased_first_name, n.deceased_last_name].filter(Boolean).join(' ') || n.deceased_name || '';
  }
  return '';
}

export function churchRowToFieldDefinition(row: ChurchRecordFieldRow): FieldDefinition {
  return {
    name: row.key,
    label: row.label,
    required: row.required,
    type: (row.type as RecordFieldType) || 'text',
    headerLabel: row.headerLabel,
    visible: row.visible,
    sortOrder: row.sortOrder,
  };
}

/** Visible review fields for a record type, using church config when available. */
export function resolveRecordFields(
  recordType: string,
  churchConfig?: ChurchRecordFieldConfig | null,
): FieldDefinition[] {
  const rt = (recordType in RECORD_FIELDS ? recordType : 'baptism') as RecordTypeKey;
  const churchRows = churchConfig?.[rt];
  if (churchRows?.length) {
    return churchRows
      .filter((r) => r.visible !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map(churchRowToFieldDefinition);
  }
  return (RECORD_FIELDS[rt] || RECORD_FIELDS.baptism)
    .filter((f) => f.visible !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** All configurable rows (including hidden) for the settings editor. */
export function resolveAllRecordFieldRows(
  recordType: RecordTypeKey,
  churchConfig?: ChurchRecordFieldConfig | null,
): ChurchRecordFieldRow[] {
  const churchRows = churchConfig?.[recordType];
  if (churchRows?.length) {
    return [...churchRows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  return (RECORD_FIELDS[recordType] || []).map((f, idx) => ({
    key: f.name,
    label: f.label,
    headerLabel: f.headerLabel || f.label.toUpperCase(),
    required: f.required,
    visible: f.visible !== false,
    sortOrder: f.sortOrder ?? idx,
    type: f.type,
  }));
}
