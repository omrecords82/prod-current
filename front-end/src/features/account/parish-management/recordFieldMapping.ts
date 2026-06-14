/** Virtual / system columns controllable in Database Mapping (not raw DB columns). */

export const ROW_NUMBER_COLUMN = '__row_number__';
export const STATUS_COLUMN = 'status';

export interface MappingFieldDef {
  column: string;
  displayName: string;
  group: string;
  visible: boolean;
  sortable: boolean;
  searchWeight: number;
}

/** Prepended to every record-type field list in the mapping wizard. */
export const VIRTUAL_MAPPING_FIELDS: MappingFieldDef[] = [
  {
    column: ROW_NUMBER_COLUMN,
    displayName: 'Row #',
    group: 'System',
    visible: true,
    sortable: false,
    searchWeight: 0,
  },
  {
    column: STATUS_COLUMN,
    displayName: 'Status',
    group: 'System',
    visible: true,
    sortable: true,
    searchWeight: 0,
  },
];

/** DB columns excluded from the mappable field list (includes virtual status). */
export const EXCLUDED_DB_COLUMNS = new Set([
  'id',
  'source_scan_id',
  'church_id',
  'ocr_confidence',
  'verified_by',
  'verified_at',
  'created_at',
  'updated_at',
  'deleted_at',
  STATUS_COLUMN,
]);

export function isVirtualMappingColumn(column: string): boolean {
  return column === ROW_NUMBER_COLUMN || column === STATUS_COLUMN;
}

/** Ensure saved mapping configs include virtual system columns. */
export function withVirtualMappingFields(fields: MappingFieldDef[]): MappingFieldDef[] {
  if (!fields.length) return fields;
  const byCol = new Map(fields.map((f) => [f.column, f]));
  const virtual = VIRTUAL_MAPPING_FIELDS.map((v) => {
    const saved = byCol.get(v.column);
    if (!saved) return v;
    return {
      ...v,
      displayName: saved.displayName || v.displayName,
      visible: typeof saved.visible === 'boolean' ? saved.visible : v.visible,
      sortable: typeof saved.sortable === 'boolean' ? saved.sortable : v.sortable,
      searchWeight: typeof saved.searchWeight === 'number' ? saved.searchWeight : v.searchWeight,
    };
  });
  const rest = fields.filter((f) => !isVirtualMappingColumn(f.column));
  return [...virtual, ...rest];
}
