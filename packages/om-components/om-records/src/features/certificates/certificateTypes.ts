/**
 * certificateTypes — Shared constants, field configurations, interfaces,
 * and helper functions for the Certificate Generator.
 * Extracted from CertificateGeneratorPage.tsx
 */

export const API_BASE = '/api/church';

// Default field positions for baptism certificate
export const BAPTISM_DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  fullName: { x: 400, y: 340 },
  birthDate: { x: 530, y: 405 },
  birthplace: { x: 400, y: 405 },
  baptismDate: { x: 300, y: 510 },
  sponsors: { x: 400, y: 545 },
  clergyBy: { x: 400, y: 475 },
  clergyRector: { x: 600, y: 620 },
  church: { x: 500, y: 490 },
};

// Default field positions for marriage certificate
export const MARRIAGE_DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  groomName: { x: 383, y: 574 },
  brideName: { x: 383, y: 626 },
  marriageDate: { x: 444, y: 678 },
  witnesses: { x: 400, y: 782 },
  clergy: { x: 410, y: 730 },
  church: { x: 514, y: 756 },
};

// Field labels for display
export const BAPTISM_FIELD_LABELS: Record<string, string> = {
  fullName: 'Full Name',
  birthDate: 'Birth Date',
  birthplace: 'Birthplace',
  baptismDate: 'Baptism Date',
  sponsors: 'Sponsors/Godparents',
  clergyBy: 'Clergy (BY)',
  clergyRector: 'Rector',
  church: 'Church Name',
};

export const MARRIAGE_FIELD_LABELS: Record<string, string> = {
  groomName: 'Groom Name',
  brideName: 'Bride Name',
  marriageDate: 'Marriage Date',
  witnesses: 'Witnesses',
  clergy: 'Clergy',
  church: 'Church Name',
};

// Search fields for baptism records
export const BAPTISM_SEARCH_FIELDS = [
  { key: 'first_name', label: 'First Name', type: 'text' },
  { key: 'last_name', label: 'Last Name', type: 'text' },
  { key: 'birth_date', label: 'Birth Date', type: 'date' },
  { key: 'reception_date', label: 'Baptism Date', type: 'date' },
  { key: 'birthplace', label: 'Birthplace', type: 'text' },
  { key: 'sponsors', label: 'Sponsors', type: 'text' },
  { key: 'clergy', label: 'Clergy', type: 'text' },
];

// Search fields for marriage records
export const MARRIAGE_SEARCH_FIELDS = [
  { key: 'groom_first', label: 'Groom First Name', type: 'text' },
  { key: 'groom_last', label: 'Groom Last Name', type: 'text' },
  { key: 'bride_first', label: 'Bride First Name', type: 'text' },
  { key: 'bride_last', label: 'Bride Last Name', type: 'text' },
  { key: 'marriage_date', label: 'Marriage Date', type: 'date' },
  { key: 'clergy', label: 'Clergy', type: 'text' },
];

export interface RecordData {
  id: number;
  first_name?: string;
  last_name?: string;
  person_first?: string;
  person_last?: string;
  birth_date?: string;
  baptism_date?: string;
  reception_date?: string;
  sponsors?: string;
  godparents?: string;
  clergy?: string;
  fname_groom?: string;
  lname_groom?: string;
  groom_first?: string;
  groom_last?: string;
  fname_bride?: string;
  lname_bride?: string;
  bride_first?: string;
  bride_last?: string;
  marriage_date?: string;
  witnesses?: string;
  churchName?: string;
  birthplace?: string;
}

export interface SearchCriteria {
  field: string;
  value: string;
}

// Format date for display
export const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
};

// Get record display name based on record type
export const getRecordDisplayName = (record: RecordData, recordType: string): string => {
  if (recordType === 'marriage') {
    const groom = `${record.fname_groom || record.groom_first || ''} ${record.lname_groom || record.groom_last || ''}`.trim();
    const bride = `${record.fname_bride || record.bride_first || ''} ${record.lname_bride || record.bride_last || ''}`.trim();
    return `${groom} & ${bride}`;
  }
  return `${record.first_name || record.person_first || ''} ${record.last_name || record.person_last || ''}`.trim();
};
