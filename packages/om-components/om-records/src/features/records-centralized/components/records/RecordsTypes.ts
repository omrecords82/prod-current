/**
 * Orthodox Metrics - Comprehensive TypeScript Types for Records System
 * Centralized type definitions for all record-related functionality
 */

// ========================================
// CORE RECORD TYPES
// ========================================

export interface BaseRecord {
  id: string | number;
  church_id: number;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface BaptismRecord extends BaseRecord {
  first_name: string;
  last_name: string;
  birth_date?: string;
  reception_date: string;
  birthplace?: string;
  entry_type?: string;
  sponsors?: string;
  parents?: string;
  clergy?: string;
}

export interface MarriageRecord extends BaseRecord {
  mdate: string;
  fname_groom: string;
  lname_groom: string;
  fname_bride: string;
  lname_bride: string;
  parentsg?: string;
  parentsb?: string;
  witness?: string;
  mlicense?: string;
  clergy?: string;
}

export interface FuneralRecord extends BaseRecord {
  deceased_date?: string;
  burial_date: string;
  name: string;
  lastname: string;
  age?: number;
  clergy?: string;
  burial_location?: string;
}

export type RecordType = 'baptism' | 'marriage' | 'funeral' | 'custom';
export type RecordData = BaptismRecord | MarriageRecord | FuneralRecord | Record<string, any>;

// ========================================
// TABLE CONFIGURATION TYPES
// ========================================

export interface RecordTableConfig {
  id: number;
  table_name: string;
  display_name: string;
  description?: string;
  table_type: RecordType;
  is_active: boolean;
  table_config: TableConfig;
  field_definitions: FieldDefinition[];
  display_settings: DisplaySettings;
  search_config: SearchConfig;
  validation_rules: ValidationRules;
  import_export_config: ImportExportConfig;
  certificate_config: CertificateConfig;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

export interface TableConfig {
  primary_key: string;
  church_id_field: string;
  date_field: string;
  name_fields: string[];
  sort_default: string;
  sort_direction: 'ASC' | 'DESC';
}

export interface FieldDefinition {
  column_name: string;
  display_name: string;
  field_type: FieldType;
  is_primary: boolean;
  is_required: boolean;
  is_searchable: boolean;
  is_sortable: boolean;
  display_order: number;
  column_width: number;
  is_hidden?: boolean;
  validation?: FieldValidation;
  options?: string[];
  options_source?: 'dropdown' | 'static';
}

export type FieldType = 
  | 'text' 
  | 'number' 
  | 'date' 
  | 'select' 
  | 'textarea' 
  | 'checkbox' 
  | 'email' 
  | 'phone'
  | 'url'
  | 'password'
  | 'file'
  | 'image';

export interface FieldValidation {
  min_length?: number;
  max_length?: number;
  min?: number;
  max?: number;
  pattern?: string;
  not_future?: boolean;
  not_past?: boolean;
  required?: boolean;
  custom?: (value: any) => string | null;
}

export interface DisplaySettings {
  default_page_size: number;
  max_page_size: number;
  show_actions: boolean;
  actions: ActionType[];
  bulk_actions: BulkActionType[];
  row_height: 'small' | 'medium' | 'large';
  sticky_header: boolean;
  show_pagination: boolean;
  show_search: boolean;
  show_filters: boolean;
  theme: string;
}

export type ActionType = 'view' | 'edit' | 'delete' | 'certificate' | 'history' | 'duplicate';
export type BulkActionType = 'export' | 'delete' | 'update' | 'archive';

export interface SearchConfig {
  searchable_fields: string[];
  filterable_fields: string[];
  sortable_fields: string[];
  default_search_field: string;
  search_placeholder: string;
  advanced_search: boolean;
}

export interface ValidationRules {
  required_fields: string[];
  field_validations: Record<string, FieldValidation>;
}

export interface ImportExportConfig {
  supported_formats: string[];
  export_fields: string[];
  import_mapping: Record<string, string[]>;
  bulk_import_limit: number;
}

export interface CertificateConfig {
  enabled: boolean;
  template_path: string;
  field_positions: Record<string, { x: number; y: number }>;
  field_mapping: Record<string, string[]>;
  output_format: string;
  quality: number;
}

// ========================================
// AG GRID CONFIGURATION TYPES
// ========================================

export interface AgGridConfig {
  id: number;
  table_name: string;
  config_name: string;
  is_active: boolean;
  grid_options: GridOptions;
  column_definitions: ColumnDefinition[];
  default_column_state: Record<string, ColumnState>;
  filter_model: Record<string, any>;
  sort_model: SortModel[];
  grid_settings: GridSettings;
  theme_settings: ThemeSettings;
  export_settings: ExportSettings;
  user_preferences: UserPreferences;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

export interface GridOptions {
  pagination?: boolean;
  paginationPageSize?: number;
  paginationPageSizeSelector?: number[];
  suppressRowClickSelection?: boolean;
  rowSelection?: 'single' | 'multiple';
  enableRangeSelection?: boolean;
  enableCharts?: boolean;
  enableClipboard?: boolean;
  suppressMenuHide?: boolean;
  allowContextMenuWithControlKey?: boolean;
  rowHeight?: number;
  headerHeight?: number;
  groupHeaderHeight?: number;
  floatingFiltersHeight?: number;
  pivotHeaderHeight?: number;
  pivotGroupHeaderHeight?: number;
  sideBar?: SideBarConfig;
  [key: string]: any;
}

export interface SideBarConfig {
  toolPanels: ToolPanel[];
  defaultToolPanel?: string;
}

export interface ToolPanel {
  id: string;
  labelDefault: string;
  labelKey: string;
  iconKey: string;
  toolPanel: string;
}

export interface ColumnDefinition {
  field: string;
  headerName: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  pinned?: 'left' | 'right';
  suppressMenu?: boolean;
  sortable?: boolean;
  filter?: string;
  editable?: boolean;
  cellEditor?: string;
  cellRenderer?: string;
  cellEditorParams?: Record<string, any>;
  hide?: boolean;
  [key: string]: any;
}

export interface ColumnState {
  width?: number;
  pinned?: 'left' | 'right';
  hide?: boolean;
  [key: string]: any;
}

export interface SortModel {
  colId: string;
  sort: 'asc' | 'desc';
}

export interface GridSettings {
  enableSorting?: boolean;
  enableFilter?: boolean;
  enableColResize?: boolean;
  enableRangeSelection?: boolean;
  enableCharts?: boolean;
  enableClipboard?: boolean;
  suppressRowClickSelection?: boolean;
  rowSelection?: 'single' | 'multiple';
  pagination?: boolean;
  paginationPageSize?: number;
  paginationPageSizeSelector?: number[];
  sideBar?: SideBarConfig;
  [key: string]: any;
}

export interface ThemeSettings {
  theme: string;
  customTheme?: boolean;
  darkMode?: boolean;
  compactMode?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  rowHeight?: number;
  headerHeight?: number;
  groupHeaderHeight?: number;
  floatingFiltersHeight?: number;
  pivotHeaderHeight?: number;
  pivotGroupHeaderHeight?: number;
}

export interface ExportSettings {
  enableExport?: boolean;
  exportFormats?: string[];
  exportFileName?: string;
  exportPath?: string;
  csvExport?: CsvExportSettings;
  excelExport?: ExcelExportSettings;
  pdfExport?: PdfExportSettings;
}

export interface CsvExportSettings {
  fileName: string;
  separator: string;
  suppressQuotes: boolean;
}

export interface ExcelExportSettings {
  fileName: string;
  sheetName: string;
  suppressTextAsCDATA: boolean;
}

export interface PdfExportSettings {
  fileName: string;
  title: string;
  author: string;
  subject: string;
  keywords: string;
}

export interface UserPreferences {
  rememberColumnState?: boolean;
  rememberGroupState?: boolean;
  rememberFilterState?: boolean;
  rememberSortState?: boolean;
  rememberPivotState?: boolean;
  rememberColumnWidth?: boolean;
  rememberColumnOrder?: boolean;
  rememberColumnVisibility?: boolean;
  rememberRowSelection?: boolean;
  rememberScrollPosition?: boolean;
  column_state?: Record<string, ColumnState>;
  filter_state?: Record<string, any>;
  sort_state?: SortModel[];
  group_state?: any;
  pivot_state?: any;
  scroll_position?: { top: number; left: number };
  row_selection?: any;
  last_saved?: string;
  saved_by?: number;
}

// ========================================
// UNIFIED CONFIGURATION TYPES
// ========================================

export interface UnifiedRecordConfig {
  tableConfig: RecordTableConfig;
  agGridConfig: AgGridConfig;
  schema: UnifiedTableSchema;
}

export interface UnifiedTableSchema {
  tableName: string;
  displayName: string;
  description?: string;
  tableType: RecordType;
  primaryKey: string;
  churchIdField: string;
  dateField: string;
  nameFields: string[];
  sortDefault: string;
  sortDirection: 'ASC' | 'DESC';
  fields: FieldDefinition[];
  displaySettings: DisplaySettings;
  searchConfig: SearchConfig;
  validationRules: ValidationRules;
  importExportConfig: ImportExportConfig;
  certificateConfig: CertificateConfig;
  gridOptions: GridOptions;
  columnDefs: ColumnDefinition[];
  defaultColDef: Record<string, any>;
  themeSettings: ThemeSettings;
  exportSettings: ExportSettings;
}

// ========================================
// API REQUEST/RESPONSE TYPES
// ========================================

export interface RecordFilters {
  search?: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface PaginatedRecordsResponse {
  records: RecordData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  schema: UnifiedTableSchema;
}

export interface RecordApiResponse<T = any> {
  success: boolean;
  data: T;
  church?: {
    id: number;
    db: string;
  };
  error?: string;
  details?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

// ========================================
// COMPONENT PROPS TYPES
// ========================================

export interface RecordsTableProps {
  churchId: number;
  tableName: string;
  configName?: string;
  data?: RecordData[];
  loading?: boolean;
  error?: string;
  onRecordSelect?: (record: RecordData) => void;
  onRecordEdit?: (record: RecordData) => void;
  onRecordDelete?: (record: RecordData) => void;
  onRecordCreate?: () => void;
  onFiltersChange?: (filters: RecordFilters) => void;
  onSortChange?: (sort: { field: string; direction: 'asc' | 'desc' }) => void;
  onPaginationChange?: (pagination: { page: number; limit: number }) => void;
}

export interface RecordsFormProps {
  churchId: number;
  tableName: string;
  record?: RecordData;
  onSave?: (record: RecordData) => void;
  onCancel?: () => void;
  loading?: boolean;
  error?: string;
}

export interface RecordsSearchProps {
  churchId: number;
  tableName: string;
  onSearch?: (filters: RecordFilters) => void;
  onClear?: () => void;
  loading?: boolean;
}

export interface RecordsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

// ========================================
// HOOK TYPES
// ========================================

export interface UseRecordsOptions {
  churchId: number;
  tableName: string;
  configName?: string;
  filters?: RecordFilters;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseRecordsReturn {
  data: RecordData[] | undefined;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | undefined;
  schema: UnifiedTableSchema | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setFilters: (filters: RecordFilters) => void;
  setSort: (sort: { field: string; direction: 'asc' | 'desc' }) => void;
  setPagination: (pagination: { page: number; limit: number }) => void;
}

export interface UseRecordMutationsOptions {
  churchId: number;
  tableName: string;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export interface UseRecordMutationsReturn {
  createRecord: (data: RecordData) => Promise<RecordData>;
  updateRecord: (id: string | number, data: RecordData) => Promise<RecordData>;
  deleteRecord: (id: string | number) => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
}

export interface UseTableConfigOptions {
  churchId: number;
  tableName: string;
  enabled?: boolean;
}

export interface UseTableConfigReturn {
  config: RecordTableConfig | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseAgGridConfigOptions {
  churchId: number;
  tableName: string;
  configName?: string;
  enabled?: boolean;
}

export interface UseAgGridConfigReturn {
  config: AgGridConfig | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  saveState: (state: any) => Promise<void>;
  loadState: () => Promise<any>;
}

// ========================================
// UTILITY TYPES
// ========================================

export type RecordFieldValue = string | number | boolean | Date | null | undefined;

export interface RecordField {
  name: string;
  value: RecordFieldValue;
  type: FieldType;
  required: boolean;
  validation?: FieldValidation;
}

export interface RecordFormData {
  [fieldName: string]: RecordFieldValue;
}

export interface TableColumn {
  field: string;
  headerName: string;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  cellRenderer?: string;
  cellEditor?: string;
}

export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte' | 'between';
  value: any;
  label?: string;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
  label?: string;
}

// ========================================
// ERROR TYPES
// ========================================

export interface RecordsError {
  code: string;
  message: string;
  details?: string;
  field?: string;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: string;
  code?: string;
}

// ========================================
// EVENT TYPES
// ========================================

export interface RecordEvent {
  type: 'create' | 'update' | 'delete' | 'view' | 'export' | 'import';
  recordId: string | number;
  tableName: string;
  userId: number;
  timestamp: string;
  data?: RecordData;
}

export interface TableEvent {
  type: 'config_updated' | 'schema_changed' | 'filters_applied' | 'sort_changed';
  tableName: string;
  userId: number;
  timestamp: string;
  data?: any;
}

// ========================================
// EXPORT TYPES
// ========================================

export type {
  // Re-export commonly used types with shorter names
  RecordTableConfig as TableConfig,
  AgGridConfig as GridConfig,
  UnifiedRecordConfig as UnifiedConfig,
  UnifiedTableSchema as TableSchema,
  FieldDefinition as Field,
  ColumnDefinition as Column,
  RecordData as Record,
  RecordFilters as Filters,
  PaginatedRecordsResponse as PaginatedResponse,
  ValidationResult as Validation,
  RecordsError as Error,
  RecordEvent as Event,
};
