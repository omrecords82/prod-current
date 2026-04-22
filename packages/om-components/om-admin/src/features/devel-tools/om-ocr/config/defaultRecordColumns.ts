/**
 * Default Database Columns Configuration
 * Defines canonical default columns for each record type table
 */

export type RecordType = 'baptism' | 'marriage' | 'funeral';

/**
 * Default columns for each record type table
 * These are the standard columns that exist in the database schema
 */
export const DEFAULT_COLUMNS_BY_TABLE: Record<RecordType, string[]> = {
  baptism: [
    'id',
    'first_name',
    'last_name',
    'birth_date',
    'reception_date',
    'birthplace',
    'entry_type',
    'sponsors',
    'parents',
    'clergy',
    'church_id',
  ],
  marriage: [
    'id',
    'mdate',
    'fname_groom',
    'lname_groom',
    'parentsg',
    'fname_bride',
    'lname_bride',
    'parentsb',
    'witness',
    'mlicense',
    'clergy',
    'church_id',
  ],
  funeral: [
    'id',
    'deceased_date',
    'burial_date',
    'name',
    'lastname',
    'age',
    'clergy',
    'burial_location',
    'church_id',
  ],
};

/**
 * Required columns for each record type
 * These columns must have values (cannot be NULL) when creating records
 */
export const REQUIRED_COLUMNS_BY_TABLE: Record<RecordType, string[]> = {
  baptism: [
    'first_name',
    'last_name',
    'reception_date',
    'clergy',
  ],
  marriage: [
    'mdate',
    'fname_groom',
    'lname_groom',
    'fname_bride',
    'lname_bride',
    'clergy',
  ],
  funeral: [
    'burial_date',
    'name',
    'clergy',
  ],
};

/**
 * Get default columns for a record type, excluding church_id
 * church_id is automatically assigned and should not be user-mapped
 */
export function getDefaultColumns(recordType: RecordType): string[] {
  return DEFAULT_COLUMNS_BY_TABLE[recordType].filter(col => col !== 'church_id');
}

/**
 * Get required columns for a record type
 */
export function getRequiredColumns(recordType: RecordType): string[] {
  return REQUIRED_COLUMNS_BY_TABLE[recordType];
}

/**
 * Check if a column is a default column for the record type
 */
export function isDefaultColumn(recordType: RecordType, columnName: string): boolean {
  return DEFAULT_COLUMNS_BY_TABLE[recordType].includes(columnName);
}

