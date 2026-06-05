/**
 * Record Fields Configuration
 * Default field definitions for baptism, marriage, and funeral ledgers.
 * Churches override labels/headers/visibility via /api/church/:id/ocr/record-fields.
 */

export type RecordFieldType = 'text' | 'date' | 'textarea';

export interface FieldDefinition {
  name: string;
  label: string;
  required: boolean;
  type: RecordFieldType;
  /** Printed ledger column header (e.g. "FATHER'S FULL NAME") */
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

export const RECORD_FIELDS: Record<string, FieldDefinition[]> = {
  baptism: [
    { name: 'record_number', label: 'Record #', required: false, type: 'text', headerLabel: 'NUMBER', visible: true, sortOrder: 0 },
    { name: 'date_of_birth', label: 'Date of Birth', required: false, type: 'date', headerLabel: 'BIRTH', visible: true, sortOrder: 1 },
    { name: 'date_of_baptism', label: 'Date of Baptism', required: true, type: 'date', headerLabel: 'BAPTISM', visible: true, sortOrder: 2 },
    { name: 'child_name', label: 'Name of Child', required: true, type: 'text', headerLabel: 'NAME OF CHILD', visible: true, sortOrder: 3 },
    { name: 'place_of_birth', label: 'City of Birth', required: false, type: 'text', headerLabel: 'CITY OF BIRTH', visible: true, sortOrder: 4 },
    { name: 'father_name', label: "Father's Full Name", required: false, type: 'text', headerLabel: "FATHER'S FULL NAME", visible: true, sortOrder: 5 },
    { name: 'mother_name', label: "Mother's Maiden Name", required: false, type: 'text', headerLabel: "MOTHER'S MAIDEN NAME", visible: true, sortOrder: 6 },
    { name: 'godparents', label: 'Sponsors', required: false, type: 'text', headerLabel: 'FULL NAMES OF SPONSORS', visible: true, sortOrder: 7 },
    { name: 'performed_by', label: "Priest's Name", required: false, type: 'text', headerLabel: "PRIEST'S NAME", visible: true, sortOrder: 8 },
    { name: 'address', label: 'Address', required: false, type: 'text', headerLabel: 'ADDRESS', visible: false, sortOrder: 9 },
    { name: 'church', label: 'Church', required: false, type: 'text', headerLabel: 'CHURCH', visible: false, sortOrder: 10 },
    { name: 'notes', label: 'Notes', required: false, type: 'textarea', headerLabel: 'NOTES', visible: true, sortOrder: 11 },
  ],
  marriage: [
    { name: 'record_number', label: 'Record #', required: false, type: 'text', headerLabel: 'NUMBER', visible: true, sortOrder: 0 },
    { name: 'groom_name', label: 'Groom Name', required: true, type: 'text', headerLabel: 'GROOM', visible: true, sortOrder: 1 },
    { name: 'groom_parents', label: "Groom's Parents First Names", required: false, type: 'text', headerLabel: "GROOM'S PARENTS", visible: true, sortOrder: 2 },
    { name: 'bride_name', label: 'Bride Name', required: true, type: 'text', headerLabel: 'BRIDE', visible: true, sortOrder: 3 },
    { name: 'bride_parents', label: "Bride's Parents First Names", required: false, type: 'text', headerLabel: "BRIDE'S PARENTS", visible: true, sortOrder: 4 },
    { name: 'date_of_marriage', label: 'Date of Marriage', required: true, type: 'date', headerLabel: 'DATE OF MARRIAGE', visible: true, sortOrder: 5 },
    { name: 'marriage_license', label: 'Marriage License #', required: false, type: 'text', headerLabel: 'MARRIAGE LICENSE', visible: true, sortOrder: 6 },
    { name: 'witnesses', label: 'Witnesses', required: false, type: 'text', headerLabel: 'WITNESSES', visible: true, sortOrder: 7 },
    { name: 'best_man', label: 'Best Man', required: false, type: 'text', headerLabel: 'BEST MAN', visible: false, sortOrder: 8 },
    { name: 'maid_of_honor', label: 'Maid of Honor', required: false, type: 'text', headerLabel: 'MAID OF HONOR', visible: false, sortOrder: 9 },
    { name: 'officiant', label: 'Officiant', required: false, type: 'text', headerLabel: "PRIEST'S NAME", visible: true, sortOrder: 10 },
    { name: 'place_of_marriage', label: 'Place of Marriage', required: false, type: 'text', headerLabel: 'PLACE OF MARRIAGE', visible: false, sortOrder: 11 },
    { name: 'church', label: 'Church', required: false, type: 'text', headerLabel: 'CHURCH', visible: false, sortOrder: 12 },
    { name: 'notes', label: 'Notes', required: false, type: 'textarea', headerLabel: 'NOTES', visible: true, sortOrder: 13 },
  ],
  funeral: [
    { name: 'record_number', label: 'Record #', required: false, type: 'text', headerLabel: 'NUMBER', visible: true, sortOrder: 0 },
    { name: 'deceased_name', label: 'Name of Deceased', required: true, type: 'text', headerLabel: 'NAME OF DECEASED', visible: true, sortOrder: 1 },
    { name: 'date_of_death', label: 'Date of Death', required: false, type: 'date', headerLabel: 'DATE OF DEATH', visible: true, sortOrder: 2 },
    { name: 'date_of_funeral', label: 'Date of Funeral', required: false, type: 'date', headerLabel: 'DATE OF FUNERAL', visible: false, sortOrder: 3 },
    { name: 'date_of_burial', label: 'Date of Burial', required: false, type: 'date', headerLabel: 'DATE OF BURIAL', visible: true, sortOrder: 4 },
    { name: 'place_of_burial', label: 'Place of Burial', required: false, type: 'text', headerLabel: 'PLACE OF BURIAL', visible: true, sortOrder: 5 },
    { name: 'age_at_death', label: 'Age at Death', required: false, type: 'text', headerLabel: 'AGE', visible: true, sortOrder: 6 },
    { name: 'cause_of_death', label: 'Cause of Death', required: false, type: 'text', headerLabel: 'CAUSE OF DEATH', visible: false, sortOrder: 7 },
    { name: 'officiant', label: 'Officiant', required: false, type: 'text', headerLabel: "PRIEST'S NAME", visible: true, sortOrder: 8 },
    { name: 'church', label: 'Church', required: false, type: 'text', headerLabel: 'CHURCH', visible: false, sortOrder: 9 },
    { name: 'notes', label: 'Notes', required: false, type: 'textarea', headerLabel: 'NOTES', visible: true, sortOrder: 10 },
  ],
};

export type ChurchRecordFieldConfig = Partial<Record<RecordTypeKey, ChurchRecordFieldRow[]>>;

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
