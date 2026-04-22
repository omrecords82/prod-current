/**
 * Record Schema Registry
 * 
 * Centralized registry for record schemas (baptism, marriage, funeral).
 * Provides schema definitions and validation utilities.
 */

export type RecordType = 'baptism' | 'marriage' | 'funeral';

export interface SchemaField {
  key: string;
  label: string;
  type: 'string' | 'date' | 'number' | 'text';
  required?: boolean;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

// Baptism record schema
const BAPTISM_SCHEMA: SchemaField[] = [
  { key: 'child_name', label: 'Child Name', type: 'string', required: true },
  { key: 'parents_name', label: 'Parents Name', type: 'string' },
  { key: 'father_name', label: 'Father Name', type: 'string' },
  { key: 'mother_name', label: 'Mother Name', type: 'string' },
  { key: 'address', label: 'Address', type: 'string' },
  { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
  { key: 'date_of_baptism', label: 'Date of Baptism', type: 'date', required: true },
  { key: 'place_of_birth', label: 'Place of Birth', type: 'string' },
  { key: 'godparents', label: 'Godparents', type: 'string' },
  { key: 'performed_by', label: 'Performed By', type: 'string' },
  { key: 'church', label: 'Church', type: 'string' },
  { key: 'record_number', label: 'Record Number', type: 'string' },
];

// Marriage record schema
const MARRIAGE_SCHEMA: SchemaField[] = [
  { key: 'groom_name', label: 'Groom Name', type: 'string', required: true },
  { key: 'bride_name', label: 'Bride Name', type: 'string', required: true },
  { key: 'date_of_marriage', label: 'Date of Marriage', type: 'date', required: true },
  { key: 'place_of_marriage', label: 'Place of Marriage', type: 'string' },
  { key: 'witnesses', label: 'Witnesses', type: 'string' },
  { key: 'best_man', label: 'Best Man', type: 'string' },
  { key: 'maid_of_honor', label: 'Maid of Honor', type: 'string' },
  { key: 'officiant', label: 'Officiant', type: 'string' },
  { key: 'church', label: 'Church', type: 'string' },
  { key: 'record_number', label: 'Record Number', type: 'string' },
];

// Funeral record schema
const FUNERAL_SCHEMA: SchemaField[] = [
  { key: 'deceased_name', label: 'Deceased Name', type: 'string', required: true },
  { key: 'date_of_death', label: 'Date of Death', type: 'date' },
  { key: 'date_of_funeral', label: 'Date of Funeral', type: 'date' },
  { key: 'date_of_burial', label: 'Date of Burial', type: 'date' },
  { key: 'place_of_burial', label: 'Place of Burial', type: 'string' },
  { key: 'age_at_death', label: 'Age at Death', type: 'number' },
  { key: 'cause_of_death', label: 'Cause of Death', type: 'string' },
  { key: 'next_of_kin', label: 'Next of Kin', type: 'string' },
  { key: 'officiant', label: 'Officiant', type: 'string' },
  { key: 'church', label: 'Church', type: 'string' },
  { key: 'record_number', label: 'Record Number', type: 'string' },
];

// Schema registry
const SCHEMA_REGISTRY: Record<RecordType, SchemaField[]> = {
  baptism: BAPTISM_SCHEMA,
  marriage: MARRIAGE_SCHEMA,
  funeral: FUNERAL_SCHEMA,
};

/**
 * Get the schema for a specific record type
 * 
 * @param recordType - The type of record ('baptism', 'marriage', or 'funeral')
 * @returns Array of schema fields
 */
export function getRecordSchema(recordType: RecordType): SchemaField[] {
  return SCHEMA_REGISTRY[recordType] || SCHEMA_REGISTRY.baptism;
}

/**
 * Validate that field keys match the schema for a record type
 * 
 * @param recordType - The type of record
 * @param keys - Array of field keys to validate
 * @returns Validation result with valid flag and any errors
 */
export function validateFieldKeys(
  recordType: RecordType,
  keys: string[]
): SchemaValidationResult {
  const schema = getRecordSchema(recordType);
  const schemaKeys = new Set(schema.map(f => f.key));
  const errors: string[] = [];

  for (const key of keys) {
    if (!schemaKeys.has(key)) {
      errors.push(`Unknown field key "${key}" for record type "${recordType}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get all available record types
 */
export function getRecordTypes(): RecordType[] {
  return Object.keys(SCHEMA_REGISTRY) as RecordType[];
}

/**
 * Check if a record type is valid
 */
export function isValidRecordType(type: string): type is RecordType {
  return type in SCHEMA_REGISTRY;
}
