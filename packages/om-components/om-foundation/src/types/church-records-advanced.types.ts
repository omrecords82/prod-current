/**
 * Orthodox Metrics - Church Records Management Types
 * Shared interfaces and types for Baptism, Marriage, and Funeral records
 */

export type RecordType = 'baptism' | 'marriage' | 'funeral';
export type FieldType = 'text' | 'number' | 'date' | 'email' | 'phone' | 'textarea' | 'select' | 'boolean';

/**
 * Core field interface for church records
 */
export interface RecordField {
  key: string;                    // Unique field identifier
  label: string;                  // Display label for the field
  value: string | number | Date | boolean | null;  // Field value
  type: FieldType;               // Input type for form rendering
  editable: boolean;             // Whether field can be edited
  required?: boolean;            // Whether field is required
  color?: string;                // Hex color or Tailwind class for highlighting
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  options?: string[];            // For select type fields
  placeholder?: string;          // Input placeholder text
  section?: string;              // Grouping section (Personal, Church, etc.)
}

/**
 * Church record base interface
 */
export interface ChurchRecord {
  id: string;
  recordType: RecordType;
  fields: RecordField[];
  metadata: {
    churchId: number;
    createdBy: number;
    createdAt: Date;
    updatedBy?: number;
    updatedAt?: Date;
    status: 'draft' | 'active' | 'archived';
    version: number;
  };
  colorOverrides?: { [fieldKey: string]: string };
  tags?: string[];
}

/**
 * Baptism-specific record fields
 */
export interface BaptismRecord extends ChurchRecord {
  recordType: 'baptism';
}

/**
 * Marriage-specific record fields
 */
export interface MarriageRecord extends ChurchRecord {
  recordType: 'marriage';
}

/**
 * Funeral-specific record fields
 */
export interface FuneralRecord extends ChurchRecord {
  recordType: 'funeral';
}

/**
 * AG Grid column definition for records
 */
export interface RecordColumnDef {
  field: string;
  headerName: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  sortable?: boolean;
  filter?: boolean;
  editable?: boolean;
  cellStyle?: (params: any) => any;
  cellRenderer?: string | ((params: any) => any);
  valueFormatter?: (params: any) => string;
  type?: 'text' | 'number' | 'date' | 'boolean';
}

/**
 * Color palette for field highlighting
 */
export interface ColorPalette {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    neutral: string;
  };
}

/**
 * Record schema configuration
 */
export interface RecordSchema {
  recordType: RecordType;
  title: string;
  description: string;
  sections: {
    id: string;
    title: string;
    fields: string[]; // Field keys
  }[];
  requiredFields: string[];
  defaultColors: { [fieldKey: string]: string };
}

/**
 * Props for AG Grid view-only component
 */
export interface AGGridViewOnlyProps {
  data: ChurchRecord[];
  recordType: RecordType;
  columns?: RecordColumnDef[];
  onCellClick?: (fieldKey: string, record: ChurchRecord) => void;
  onRowSelect?: (record: ChurchRecord) => void;
  colorOverrides?: { [fieldKey: string]: string };
  loading?: boolean;
  error?: string | null;
  height?: number;
  enableFilters?: boolean;
  enableSorting?: boolean;
  enableExport?: boolean;
}

/**
 * Props for editable record page
 */
export interface EditableRecordPageProps {
  recordType: RecordType;
  recordId?: string;
  onSave?: (record: ChurchRecord) => void;
  onCancel?: () => void;
  readonly?: boolean;
  showPreview?: boolean;
}

/**
 * Color picker component props
 */
export interface ColorPickerProps {
  currentColor?: string;
  onColorChange: (color: string) => void;
  onClose: () => void;
  position?: { x: number; y: number };
  predefinedColors?: string[];
}

/**
 * Record preview modal props
 */
export interface RecordPreviewProps {
  record: ChurchRecord;
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onPrint?: () => void;
  onExport?: (format: 'pdf' | 'docx' | 'png') => void;
  showCertificateView?: boolean;
}

/**
 * Default color palettes
 */
export const DEFAULT_PALETTES: ColorPalette[] = [
  {
    id: 'orthodox-traditional',
    name: 'Orthodox Traditional',
    colors: {
      primary: '#1E40AF',     // Deep blue
      secondary: '#7C3AED',   // Purple
      accent: '#DC2626',      // Red
      success: '#059669',     // Green
      warning: '#D97706',     // Orange
      error: '#DC2626',       // Red
      info: '#0284C7',        // Sky blue
      neutral: '#6B7280',     // Gray
    }
  },
  {
    id: 'liturgical-seasons',
    name: 'Liturgical Seasons',
    colors: {
      primary: '#FFD700',     // Gold (Feast days)
      secondary: '#8B0000',   // Dark red (Martyrs)
      accent: '#FFFFFF',      // White (Resurrection)
      success: '#228B22',     // Green (Ordinary time)
      warning: '#9932CC',     // Purple (Lent)
      error: '#000000',       // Black (Good Friday)
      info: '#87CEEB',        // Sky blue (Theophany)
      neutral: '#C0C0C0',     // Silver (Saints)
    }
  }
];

/**
 * Utility functions
 */
export const createEmptyRecord = (recordType: RecordType): ChurchRecord => ({
  id: `temp-${Date.now()}`,
  recordType,
  fields: [],
  metadata: {
    churchId: 0,
    createdBy: 0,
    createdAt: new Date(),
    status: 'draft',
    version: 1,
  },
  colorOverrides: {},
  tags: [],
});

export const getFieldByKey = (record: ChurchRecord, key: string): RecordField | undefined => {
  return record.fields.find(field => field.key === key);
};

export const updateFieldValue = (
  record: ChurchRecord, 
  fieldKey: string, 
  value: any
): ChurchRecord => ({
  ...record,
  fields: record.fields.map(field =>
    field.key === fieldKey ? { ...field, value } : field
  ),
  metadata: {
    ...record.metadata,
    updatedAt: new Date(),
    version: record.metadata.version + 1,
  },
});

export const setFieldColor = (
  record: ChurchRecord,
  fieldKey: string,
  color: string
): ChurchRecord => ({
  ...record,
  colorOverrides: {
    ...record.colorOverrides,
    [fieldKey]: color,
  },
});
