import { FIELD_DEFINITIONS, RECORD_TYPES } from '@/features/records-centralized/constants';
import { formatRecordDate } from '@/utils/formatDate';
import React from 'react';

// Helper to safely parse JSON fields (godparents, witnesses)
export const parseJsonField = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // If it's a semicolon or comma separated string, split it
      if (value.includes(';')) return value.split(';').map((s: string) => s.trim()).filter(Boolean);
      if (value.includes(',')) return value.split(',').map((s: string) => s.trim()).filter(Boolean);
      return [value];
    }
  }
  return [];
};

// Helper to display JSON array fields as comma-separated string
export const displayJsonField = (value: any): string => {
  const items = parseJsonField(value);
  return items.join('; ');
};

// Helper to highlight search matches in cell text
export const highlightMatch = (text: string, searchTerm: string): React.ReactNode => {
  if (!searchTerm || !text) return text;
  const parts = text.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return React.createElement(
    'span',
    null,
    ...parts.map((part: string, i: number) =>
      part.toLowerCase() === searchTerm.toLowerCase()
        ? React.createElement('mark', {
            key: i,
            style: { backgroundColor: '#fff176', padding: '0 2px', borderRadius: '2px' }
          }, part)
        : part
    )
  );
};

// Record types configuration (labels resolved via t() inside component)
export const RECORD_TYPE_CONFIGS = [
  { value: 'baptism', labelKey: 'records.baptism_records_label', apiEndpoint: 'baptism' },
  { value: 'marriage', labelKey: 'records.marriage_records_label', apiEndpoint: 'marriage' },
  { value: 'funeral', labelKey: 'records.funeral_records_label', apiEndpoint: 'funeral' },
] as const;

// Function to get column definitions based on record type
export const getColumnDefinitions = (recordType: string) => {
  switch (recordType) {
    case 'marriage':
      return FIELD_DEFINITIONS[RECORD_TYPES.MARRIAGE]?.tableColumns || [];
    case 'funeral':
      return FIELD_DEFINITIONS[RECORD_TYPES.FUNERAL]?.tableColumns || [];
    case 'baptism':
    default:
      return FIELD_DEFINITIONS[RECORD_TYPES.BAPTISM]?.tableColumns || [];
  }
};

// Function to get sort fields based on record type
export const getSortFields = (recordType: string) => {
  switch (recordType) {
    case 'marriage':
      return FIELD_DEFINITIONS[RECORD_TYPES.MARRIAGE]?.sortFields || [];
    case 'funeral':
      return FIELD_DEFINITIONS[RECORD_TYPES.FUNERAL]?.sortFields || [];
    case 'baptism':
    default:
      return FIELD_DEFINITIONS[RECORD_TYPES.BAPTISM]?.sortFields || [];
  }
};

// Function to get cell value based on column field and record type
// Updated to support production schema (05_sacrament_tables.sql) with formatRecordDate
export const getCellValue = (record: any, column: any) => {
  if (column.valueGetter) {
    try {
      return column.valueGetter({ data: record });
    } catch (error) {
      // If valueGetter fails, fall through to switch statement
      console.warn('valueGetter failed:', error);
    }
  }

  // Handle all field mappings with fallbacks - support both production and legacy schemas
  switch (column.field) {
    // ═══════════════════════════════════════════════════════════════
    // BAPTISM RECORD MAPPINGS (Saints Peter & Paul schema)
    // ═══════════════════════════════════════════════════════════════
    case 'first_name':
    case 'person_first':
      return record.person_first || record.first_name || record.firstName || '';
    case 'middle_name':
    case 'person_middle':
      return record.person_middle || record.middle_name || '';
    case 'last_name':
    case 'person_last':
      return record.person_last || record.last_name || record.lastName || '';
    case 'person_full':
      if (record.person_full) return record.person_full;
      const bapFirst = record.person_first || record.first_name || record.firstName || '';
      const bapMiddle = record.person_middle || '';
      const bapLast = record.person_last || record.last_name || record.lastName || '';
      return [bapFirst, bapMiddle, bapLast].filter(Boolean).join(' ').trim() || '';
    case 'clergy':
    case 'officiant_name':
      return record.officiant_name || record.clergy || record.priest || '';
    case 'reception_date':
    case 'baptism_date':
      return formatRecordDate(record.baptism_date || record.reception_date || record.dateOfBaptism) || '';
    case 'birth_date':
      return formatRecordDate(record.birth_date || record.dateOfBirth) || '';
    case 'birthplace':
    case 'place_name':
      return record.place_name || record.birthplace || record.placeOfBirth || record.placeOfBaptism || '';
    case 'sponsors':
    case 'godparents':
      return displayJsonField(record.godparents) || record.sponsors || record.godparentNames || '';
    case 'entry_type':
      return record.entry_type || record.entryType || record._originalRecord?.entry_type || record.originalRecord?.entry_type || '';
    case 'parents':
      if (record.parents) return record.parents;
      const father = record.father_name || record.fatherName || '';
      const mother = record.mother_name || record.motherName || '';
      if (father && mother) return `${father} & ${mother}`;
      return father || mother || '';
    case 'father_name':
      return record.father_name || record.fatherName || '';
    case 'mother_name':
      return record.mother_name || record.motherName || '';

    // ═══════════════════════════════════════════════════════════════
    // MARRIAGE RECORD MAPPINGS (Saints Peter & Paul schema)
    // ═══════════════════════════════════════════════════════════════
    case 'fname_groom':
    case 'groom_first':
      return record.fname_groom || record.groom_first || record.groomFirstName || '';
    case 'groom_middle':
      return record.groom_middle || '';
    case 'lname_groom':
    case 'groom_last':
      return record.lname_groom || record.groom_last || record.groomLastName || '';
    case 'groom_full':
      if (record.groom_full) return record.groom_full;
      const gFirst = record.fname_groom || record.groom_first || record.groomFirstName || '';
      const gMiddle = record.groom_middle || '';
      const gLast = record.lname_groom || record.groom_last || record.groomLastName || '';
      return [gFirst, gMiddle, gLast].filter(Boolean).join(' ').trim() || '';
    case 'fname_bride':
    case 'bride_first':
      return record.fname_bride || record.bride_first || record.brideFirstName || '';
    case 'bride_middle':
      return record.bride_middle || '';
    case 'lname_bride':
    case 'bride_last':
      return record.lname_bride || record.bride_last || record.brideLastName || '';
    case 'bride_full':
      if (record.bride_full) return record.bride_full;
      const bFirst = record.fname_bride || record.bride_first || record.brideFirstName || '';
      const bMiddle = record.bride_middle || '';
      const bLast = record.lname_bride || record.bride_last || record.brideLastName || '';
      return [bFirst, bMiddle, bLast].filter(Boolean).join(' ').trim() || '';
    case 'mdate':
    case 'marriage_date':
      return formatRecordDate(record.mdate || record.marriage_date || record.marriageDate) || '';
    case 'marriage_place':
      return record.place_name || record.marriage_place || record.marriageLocation || '';
    case 'parentsg':
      return record.parentsg || record.groomParents || '';
    case 'parentsb':
      return record.parentsb || record.brideParents || '';
    case 'witness':
    case 'witnesses':
      return displayJsonField(record.witnesses) || record.witness || '';
    case 'mlicense':
      return record.mlicense || record.marriageLicense || '';

    // ═══════════════════════════════════════════════════════════════
    // FUNERAL RECORD MAPPINGS (Saints Peter & Paul - actual MySQL columns)
    // ═══════════════════════════════════════════════════════════════
    case 'name':
      return record.name || record.firstName || record.first_name || '';
    case 'lastname':
      return record.lastname || record.lastName || record.last_name || '';
    case 'deceased_date':
      return formatRecordDate(record.deceased_date || record.date_of_death || record.dateOfDeath) || '';
    case 'burial_date':
      return formatRecordDate(
        record.burial_date ||
        record.burialDate ||
        record.dateOfFuneral ||
        record._originalRecord?.burial_date ||
        record.originalRecord?.burial_date
      ) || '';
    case 'age':
      return record.age || '';
    case 'burial_location':
      return record.burial_location || record.burialLocation || record.cemetery || '';
    case 'deceased_full':
      if (record.deceased_full) return record.deceased_full;
      const dFirst = record.name || record.firstName || record.first_name || '';
      const dLast = record.lastname || record.lastName || record.last_name || '';
      return [dFirst, dLast].filter(Boolean).join(' ').trim() || '';
    case 'notes':
      return record.notes || record.note || '';

    // ═══════════════════════════════════════════════════════════════
    // METADATA FIELDS (production schema)
    // ═══════════════════════════════════════════════════════════════
    case 'source_system':
      return record.source_system || '';
    case 'source_hash':
      return record.source_hash || '';
    case 'source_row_id':
      return record.source_row_id || '';
    case 'certificate_no':
      return record.certificate_no || record.registryNumber || '';
    case 'book_no':
      return record.book_no || '';
    case 'page_no':
      return record.page_no || '';
    case 'entry_no':
      return record.entry_no || '';

    default:
      // For any other fields not explicitly mapped
      const isDateField = column.field && (
        column.field.includes('date') ||
        column.field.includes('Date') ||
        column.field.includes('_date')
      );
      if (isDateField || column.cellRenderer === 'dateRenderer') {
        return formatRecordDate(record[column.field]) || '';
      }
      const value = record[column.field];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
      return '';
  }
};

export const DEFAULT_DATE_SORT_FIELD: Record<string, string> = {
  baptism: 'reception_date',
  marriage: 'mdate',
  funeral: 'burial_date',
};
