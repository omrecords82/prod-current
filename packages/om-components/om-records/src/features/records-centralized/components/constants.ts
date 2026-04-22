/**
 * TypeScript constants for record management across baptism, marriage, and funeral records
 */

// Record types
export const RECORD_TYPES = {
  BAPTISM: 'baptism',
  MARRIAGE: 'marriage',
  FUNERAL: 'funeral'
} as const;

export type RecordType = typeof RECORD_TYPES[keyof typeof RECORD_TYPES];

// Field types
export type FieldType = 'text' | 'email' | 'number' | 'date' | 'select' | 'multiselect' | 'textarea' | 'switch' | 'checkbox' | 'radio';

// Field definition interface
export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: any; label: string }>;
  optionsSource?: string;
  validation?: any;
  helperText?: string;
  gridSize?: { xs?: number; sm?: number; md?: number; lg?: number };
}

// Table column definition interface
export interface TableColumnDefinition {
  field: string;
  headerName: string;
  width?: number | string;
  cellRenderer?: string;
  valueGetter?: (params: { data: any }) => any;
}

// Filter definition interface
export interface FilterDefinition {
  name: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange' | 'multiselect';
  options?: Array<{ value: any; label: string }>;
  optionsSource?: string;
}

// Sort field definition interface
export interface SortFieldDefinition {
  field: string;
  label: string;
}

// Validation schema interface
export interface ValidationSchema {
  [key: string]: {
    required?: string;
    min?: number;
    max?: number;
    message?: string;
  };
}

// Certificate configuration interfaces
export interface CertificateFieldOffset {
  x: number;
  y: number;
}

export interface CertificateConfig {
  defaultFieldOffsets: Record<string, CertificateFieldOffset>;
  defaultFontSizes: Record<string, number>;
}

// Main field definitions interface
export interface RecordFieldDefinitions {
  fields: FieldDefinition[];
  displayName: (record: any) => string;
  sortFields: SortFieldDefinition[];
  defaultSort: { field: string; direction: 'asc' | 'desc' };
  filters: FilterDefinition[];
  tableColumns: TableColumnDefinition[];
  validationSchema: ValidationSchema;
  certificateConfig: CertificateConfig;
}

// Field definitions for each record type
export const FIELD_DEFINITIONS: Record<RecordType, RecordFieldDefinitions> = {
  [RECORD_TYPES.BAPTISM]: {
    fields: [
      { name: 'first_name', label: 'First Name', type: 'text', required: true },
      { name: 'last_name', label: 'Last Name', type: 'text', required: true },
      { name: 'birth_date', label: 'Birth Date', type: 'date', required: false },
      { name: 'reception_date', label: 'Reception Date', type: 'date', required: true },
      { name: 'birthplace', label: 'Birthplace', type: 'text', required: false },
      { name: 'entry_type', label: 'Entry Type', type: 'select', required: false, options: [
        { value: 'Baptism', label: 'Baptism' },
        { value: 'Chrismation', label: 'Chrismation' },
        { value: 'Transfer', label: 'Transfer' }
      ]},
      { name: 'sponsors', label: 'Sponsors', type: 'textarea', required: false },
      { name: 'parents', label: 'Parents', type: 'textarea', required: true },
      { name: 'clergy', label: 'Clergy', type: 'select', required: true, optionsSource: 'clergy' }
    ],
    displayName: (record) => `${record.first_name} ${record.last_name}`,
    sortFields: [
      { field: 'last_name', label: 'Name' },
      { field: 'birth_date', label: 'Birth Date' },
      { field: 'reception_date', label: 'Reception Date' },
      { field: 'birthplace', label: 'Birthplace' },
      { field: 'clergy', label: 'Clergy' }
    ],
    defaultSort: { field: 'reception_date', direction: 'desc' },
    filters: [
      { name: 'startDate', label: 'Start Date', type: 'date' },
      { name: 'endDate', label: 'End Date', type: 'date' },
      { name: 'birthplace', label: 'Birthplace', type: 'select', optionsSource: 'locations' },
      { name: 'clergy', label: 'Clergy', type: 'select', optionsSource: 'clergy' },
      { name: 'entry_type', label: 'Entry Type', type: 'select', options: [
        { value: 'Baptism', label: 'Baptism' },
        { value: 'Chrismation', label: 'Chrismation' },
        { value: 'Transfer', label: 'Transfer' }
      ]}
    ],
    tableColumns: [
      { field: 'firstName', headerName: 'First Name' },
      { field: 'lastName', headerName: 'Last Name' },
      { field: 'dateOfBirth', headerName: 'Birth Date', cellRenderer: 'dateRenderer' },
      { field: 'dateOfBaptism', headerName: 'Baptism Date', cellRenderer: 'dateRenderer' },
      { field: 'placeOfBirth', headerName: 'Birthplace' },
      { field: 'priest', headerName: 'Clergy' }
    ],
    validationSchema: {
      first_name: { required: 'First name is required' },
      last_name: { required: 'Last name is required' },
      reception_date: { required: 'Reception date is required' },
      parents: { required: 'Parents information is required' },
      clergy: { required: 'Clergy is required' }
    },
    certificateConfig: {
      defaultFieldOffsets: {
        name: { x: 400, y: 335 },
        birthplace: { x: 420, y: 350 },
        birthDateMD: { x: 350, y: 605 },
        birthDateY: { x: 550, y: 605 },
        clergyBy: { x: 400, y: 425 },
        churchName: { x: 430, y: 440 },
        receptionDateMD: { x: 350, y: 460 },
        receptionDateY: { x: 485, y: 460 },
        sponsors: { x: 400, y: 475 },
        rector: { x: 465, y: 505 }
      },
      defaultFontSizes: {
        name: 18,
        birthplace: 16,
        birthDateMD: 16,
        birthDateY: 16,
        clergyBy: 16,
        churchName: 16,
        receptionDateMD: 16,
        receptionDateY: 16,
        sponsors: 16,
        rector: 14
      }
    }
  },
  [RECORD_TYPES.MARRIAGE]: {
    fields: [
      { name: 'fname_groom', label: 'Groom First Name', type: 'text', required: true },
      { name: 'lname_groom', label: 'Groom Last Name', type: 'text', required: true },
      { name: 'fname_bride', label: 'Bride First Name', type: 'text', required: true },
      { name: 'lname_bride', label: 'Bride Last Name', type: 'text', required: true },
      { name: 'mdate', label: 'Marriage Date', type: 'date', required: true },
      { name: 'parentsg', label: "Groom's Parents", type: 'textarea', required: false },
      { name: 'parentsb', label: "Bride's Parents", type: 'textarea', required: false },
      { name: 'witness', label: 'Witness', type: 'text', required: false },
      { name: 'mlicense', label: 'Marriage License', type: 'text', required: false },
      { name: 'clergy', label: 'Clergy', type: 'select', required: true, optionsSource: 'clergy' }
    ],
    displayName: (record) => `${record.fname_groom} ${record.lname_groom} & ${record.fname_bride} ${record.lname_bride}`,
    sortFields: [
      { field: 'lname_groom', label: 'Groom' },
      { field: 'lname_bride', label: 'Bride' },
      { field: 'mdate', label: 'Date' },
      { field: 'clergy', label: 'Clergy' }
    ],
    defaultSort: { field: 'mdate', direction: 'desc' },
    filters: [
      { name: 'startDate', label: 'Start Date', type: 'date' },
      { name: 'endDate', label: 'End Date', type: 'date' },
      { name: 'clergy', label: 'Clergy', type: 'select', optionsSource: 'clergy' }
    ],
    tableColumns: [
      { field: 'groomFirstName', headerName: 'Groom First Name' },
      { field: 'groomLastName', headerName: 'Groom Last Name' },
      { field: 'brideFirstName', headerName: 'Bride First Name' },
      { field: 'brideLastName', headerName: 'Bride Last Name' },
      { field: 'marriageDate', headerName: 'Marriage Date', cellRenderer: 'dateRenderer' },
      { field: 'groomParents', headerName: "Groom's Parents" },
      { field: 'brideParents', headerName: "Bride's Parents" },
      { field: 'witnesses', headerName: 'Witnesses' },
      { field: 'marriageLicense', headerName: 'Marriage License' },
      { field: 'clergy', headerName: 'Clergy' }
    ],
    validationSchema: {
      fname_groom: { required: 'Groom first name is required' },
      lname_groom: { required: 'Groom last name is required' },
      fname_bride: { required: 'Bride first name is required' },
      lname_bride: { required: 'Bride last name is required' },
      mdate: { required: 'Marriage date is required' },
      clergy: { required: 'Clergy is required' }
    },
    certificateConfig: {
      defaultFieldOffsets: {
        groomName: { x: 397, y: 263 },
        brideName: { x: 397, y: 299 },
        clergyBy: { x: 397, y: 406 },
        churchName: { x: 397, y: 442 },
        marriageDateMD: { x: 350, y: 478 },
        marriageDateY: { x: 550, y: 478 },
        witness: { x: 397, y: 514 },
        rector: { x: 397, y: 550 }
      },
      defaultFontSizes: {
        groomName: 18,
        brideName: 18,
        clergyBy: 16,
        churchName: 16,
        marriageDateMD: 16,
        marriageDateY: 16,
        witness: 16,
        rector: 14
      }
    }
  },
  [RECORD_TYPES.FUNERAL]: {
    fields: [
      { name: 'name', label: 'First Name', type: 'text', required: true },
      { name: 'lastname', label: 'Last Name', type: 'text', required: true },
      { name: 'deceased_date', label: 'Date of Death', type: 'date', required: true },
      { name: 'burial_date', label: 'Burial Date', type: 'date', required: false },
      { name: 'age', label: 'Age', type: 'number', required: false },
      { name: 'burial_location', label: 'Burial Location', type: 'text', required: false },
      { name: 'clergy', label: 'Clergy', type: 'select', required: true, optionsSource: 'clergy' }
    ],
    displayName: (record) => `${record.name} ${record.lastname}`,
    sortFields: [
      { field: 'lastname', label: 'Name' },
      { field: 'deceased_date', label: 'Date of Death' },
      { field: 'burial_date', label: 'Burial Date' },
      { field: 'age', label: 'Age' },
      { field: 'burial_location', label: 'Burial Location' },
      { field: 'clergy', label: 'Clergy' }
    ],
    defaultSort: { field: 'deceased_date', direction: 'desc' },
    filters: [
      { name: 'startDate', label: 'Start Date', type: 'date' },
      { name: 'endDate', label: 'End Date', type: 'date' },
      { name: 'burial_location', label: 'Burial Location', type: 'select', optionsSource: 'locations' },
      { name: 'clergy', label: 'Clergy', type: 'select', optionsSource: 'clergy' }
    ],
    tableColumns: [
      { field: 'firstName', headerName: 'First Name' },
      { field: 'lastName', headerName: 'Last Name' },
      { field: 'dateOfDeath', headerName: 'Date of Death', cellRenderer: 'dateRenderer' },
      { field: 'dateOfFuneral', headerName: 'Funeral Date', cellRenderer: 'dateRenderer' },
      { field: 'age', headerName: 'Age', cellRenderer: 'numericColumn' },
      { field: 'burialLocation', headerName: 'Burial Location' },
      { field: 'clergy', headerName: 'Clergy' }
    ],
    validationSchema: {
      name: { required: 'First name is required' },
      lastname: { required: 'Last name is required' },
      deceased_date: { required: 'Date of death is required' },
      age: { min: 0, message: 'Age must be positive' },
      clergy: { required: 'Clergy is required' }
    },
    certificateConfig: {
      defaultFieldOffsets: {
        fullName: { x: -100, y: -26 },
        deathDate: { x: 22, y: -31 },
        burialDate: { x: 12, y: -36 },
        age: { x: 5, y: -34 },
        clergy: { x: 5, y: -34 },
        burialLocation: { x: 7, y: -34 }
      },
      defaultFontSizes: {
        fullName: 18,
        deathDate: 16,
        burialDate: 16,
        age: 14,
        clergy: 16,
        burialLocation: 16
      }
    }
  }
};

// CSV export headers for each record type
export const CSV_HEADERS = {
  [RECORD_TYPES.BAPTISM]: [
    { label: 'First Name', key: 'first_name' },
    { label: 'Last Name', key: 'last_name' },
    { label: 'Birth Date', key: 'birth_date' },
    { label: 'Reception Date', key: 'reception_date' },
    { label: 'Birthplace', key: 'birthplace' },
    { label: 'Entry Type', key: 'entry_type' },
    { label: 'Sponsors', key: 'sponsors' },
    { label: 'Parents', key: 'parents' },
    { label: 'Clergy', key: 'clergy' }
  ],
  [RECORD_TYPES.MARRIAGE]: [
    { label: 'Groom First Name', key: 'fname_groom' },
    { label: 'Groom Last Name', key: 'lname_groom' },
    { label: 'Bride First Name', key: 'fname_bride' },
    { label: 'Bride Last Name', key: 'lname_bride' },
    { label: 'Marriage Date', key: 'mdate' },
    { label: 'Groom Parents', key: 'parentsg' },
    { label: 'Bride Parents', key: 'parentsb' },
    { label: 'Witness', key: 'witness' },
    { label: 'Marriage License', key: 'mlicense' },
    { label: 'Clergy', key: 'clergy' }
  ],
  [RECORD_TYPES.FUNERAL]: [
    { label: 'First Name', key: 'name' },
    { label: 'Last Name', key: 'lastname' },
    { label: 'Date of Death', key: 'deceased_date' },
    { label: 'Burial Date', key: 'burial_date' },
    { label: 'Age', key: 'age' },
    { label: 'Burial Location', key: 'burial_location' },
    { label: 'Clergy', key: 'clergy' }
  ]
};

// PDF document titles for each record type
export const PDF_TITLES = {
  [RECORD_TYPES.BAPTISM]: 'Baptism Records',
  [RECORD_TYPES.MARRIAGE]: 'Marriage Records',
  [RECORD_TYPES.FUNERAL]: 'Funeral Records'
};

// Certificate file name templates for each record type
export const CERTIFICATE_FILENAMES = {
  [RECORD_TYPES.BAPTISM]: (record: any) => `baptism_certificate_${record.first_name}_${record.last_name}.png`,
  [RECORD_TYPES.MARRIAGE]: (record: any) => {
    const groomName = `${record.fname_groom || ''}_${record.lname_groom || ''}`.trim().replace(/\s+/g, '_');
    const brideName = `${record.fname_bride || ''}_${record.lname_bride || ''}`.trim().replace(/\s+/g, '_');
    return `marriage_certificate_${groomName}_${brideName}.png`;
  },
  [RECORD_TYPES.FUNERAL]: (record: any) => {
    const fullName = `${record.name || ''}_${record.lastname || ''}`.trim().replace(/\s+/g, '_');
    return `funeral_certificate_${fullName}.png`;
  }
};

// Theme colors for each record type - Unified Orthodox Ocean Blue & Stained Gold Theme
export const THEME_COLORS = {
  [RECORD_TYPES.BAPTISM]: {
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', // Ocean blue gradient
    header: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    search: 'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
    table: 'rgba(255, 255, 255, 0.98)',
    tableHeader: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    addButton: 'linear-gradient(135deg, #b45309 0%, #c8a951 100%)', // Stained gold button
    accent: '#c8a951', // Stained gold
    text: '#1e3a8a'
  },
  [RECORD_TYPES.MARRIAGE]: {
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', // Same ocean blue gradient
    header: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    search: 'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
    table: 'rgba(255, 255, 255, 0.98)',
    tableHeader: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    addButton: 'linear-gradient(135deg, #b45309 0%, #c8a951 100%)', // Stained gold button
    accent: '#c8a951', // Stained gold
    text: '#1e3a8a'
  },
  [RECORD_TYPES.FUNERAL]: {
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', // Same ocean blue gradient
    header: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    search: 'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
    table: 'rgba(255, 255, 255, 0.98)',
    tableHeader: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
    addButton: 'linear-gradient(135deg, #b45309 0%, #c8a951 100%)', // Stained gold button
    accent: '#c8a951', // Stained gold
    text: '#1e3a8a'
  }
};

// API endpoints for each record type
export const API_ENDPOINTS = {
  [RECORD_TYPES.BAPTISM]: '/api/baptism-records',
  [RECORD_TYPES.MARRIAGE]: '/api/marriage-records',
  [RECORD_TYPES.FUNERAL]: '/api/funeral-records'
};

// Certificate endpoints for each record type
export const CERTIFICATE_ENDPOINTS = {
  [RECORD_TYPES.BAPTISM]: '/api/certificate/baptism',
  [RECORD_TYPES.MARRIAGE]: '/api/certificate/marriage',
  [RECORD_TYPES.FUNERAL]: '/api/certificate/funeral'
};
