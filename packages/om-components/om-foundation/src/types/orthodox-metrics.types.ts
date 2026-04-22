/**
 * OrthodMetrics - Complete TypeScript Type Definitions
 * Comprehensive type system for church management platform
 */

// ===== CORE TYPES =====
export type SupportedLanguage = 'en' | 'gr' | 'ru' | 'ro';
export type UserRole = 
  | 'super_admin'      // Global system owner
  | 'admin'            // Platform admin (global config, backups)
  | 'church_admin'     // Church-specific admin
  | 'priest'           // Full clergy privileges
  | 'deacon'           // Partial clergy privileges  
  | 'editor'           // Can edit records/content
  | 'viewer'           // Read-only access
  | 'guest';           // Unauthenticated access
export type CalendarType = 'julian' | 'revised_julian' | 'gregorian';
export type RecordType = 'baptism' | 'marriage' | 'funeral';
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
export type ProvisionStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'provisioning' | 'completed' | 'failed' | 'cancelled';
export type OCRStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type FeastRank = 'great' | 'major' | 'minor' | 'commemoration';
export type LiturgicalColor = 'red' | 'gold' | 'white' | 'green' | 'purple' | 'blue' | 'black' | 'silver';

// ===== AUTHENTICATION =====
// New user profile attributes interface
export interface UserProfileAttributes {
  titles: string[];                    // ['Secretary', 'Treasurer', 'Parish Council Member']
  ministries: string[];               // ['Youth Group', 'Choir', 'Sunday School']
  isParishCouncilMember: boolean;     // true/false
  specializations: string[];          // ['Financial Management', 'Event Planning']
  certifications: string[];          // ['First Aid', 'SafeChurch Training']
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;                     // Simplified canonical role
  profile_attributes?: UserProfileAttributes; // Contextual information
  church_id?: number;
  preferred_language: SupportedLanguage;
  first_name: string;
  last_name: string;
  timezone?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
  expires_at?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  remember_me?: boolean;
}

// ===== CHURCH MANAGEMENT =====
export interface Church {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  preferred_language: SupportedLanguage;
  timezone?: string;
  currency?: string;
  tax_id?: string;
  website?: string;
  description_multilang?: string;
  settings?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  has_baptism_records?: boolean;
  has_marriage_records?: boolean;
  has_funeral_records?: boolean;
  enable_ag_grid?: boolean;
  ag_grid_record_types?: string[];
  setup_complete?: boolean;
  database_name?: string;
}

export interface ChurchContact {
  id: number;
  church_id: number;
  name: string;
  title_multilang?: string;
  email?: string;
  phone?: string;
  role: 'priest' | 'deacon' | 'administrator' | 'treasurer' | 'secretary' | 'other';
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateChurchData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  preferred_language?: SupportedLanguage;
  timezone?: string;
  currency?: string;
  tax_id?: string;
  website?: string;
  description_multilang?: string;
  settings?: string;
  is_active?: boolean;
  has_baptism_records?: boolean;
  has_marriage_records?: boolean;
  has_funeral_records?: boolean;
  enable_ag_grid?: boolean;
  ag_grid_record_types?: string[];
  setup_complete?: boolean;
  database_name?: string;
}

export interface ChurchFilters {
  search?: string;
  language?: SupportedLanguage;
  is_active?: boolean;
  diocese?: string;
  page?: number;
  limit?: number;
}

// ===== LITURGICAL CALENDAR =====
export interface LiturgicalDay {
  date: string;
  calendar_type: CalendarType;
  liturgical_color?: LiturgicalColor;
  tone?: number;
  week_of_year?: number;
  feasts: Feast[];
  saints: Saint[];
  fasting_periods: FastingPeriod[];
  events: CalendarEvent[];
  readings?: LiturgicalReading[];
}

export interface Feast {
  id: number;
  name: string;
  date: string;
  rank: FeastRank;
  color: LiturgicalColor;
  moveable: boolean;
  description?: string;
  icon?: string;
  tradition?: string;
  language: SupportedLanguage;
}

export interface Saint {
  id: number;
  name: string;
  feast_day: string;
  rank: FeastRank;
  type: 'martyr' | 'bishop' | 'monk' | 'virgin' | 'apostle' | 'prophet' | 'doctor' | 'confessor';
  patronage?: string[];
  biography?: string;
  icon?: string;
  language: SupportedLanguage;
}

export interface FastingPeriod {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  type: 'lent' | 'advent' | 'apostles' | 'dormition' | 'christmas' | 'epiphany' | 'wednesday' | 'friday';
  description?: string;
  rules?: string;
  language: SupportedLanguage;
}

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  church_id: number;
  event_type: 'service' | 'meeting' | 'celebration' | 'memorial' | 'education';
  is_recurring: boolean;
  language: SupportedLanguage;
}

export interface LiturgicalReading {
  id: number;
  date: string;
  reading_type: 'epistle' | 'gospel' | 'old_testament' | 'psalm';
  book: string;
  chapter: number;
  verses: string;
  text?: string;
  language: SupportedLanguage;
}

export interface CalendarFilters {
  year: number;
  month?: number;
  calendar_type?: CalendarType;
  language?: SupportedLanguage;
  church_id?: number;
  include_feasts?: boolean;
  include_saints?: boolean;
  include_fasting?: boolean;
  include_events?: boolean;
}

// ===== CHURCH RECORDS =====
export interface BaptismRecord {
  id: number;
  child_name: string;
  child_birth_date: string;
  baptism_date: string;
  father_name: string;
  mother_name: string;
  godfather_name: string;
  godmother_name: string;
  priest_name: string;
  location: string;
  notes?: string;
  church_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface MarriageRecord {
  id: number;
  groom_name: string;
  bride_name: string;
  marriage_date: string;
  groom_birth_date: string;
  bride_birth_date: string;
  groom_father_name: string;
  groom_mother_name: string;
  bride_father_name: string;
  bride_mother_name: string;
  witness1_name: string;
  witness2_name: string;
  priest_name: string;
  location: string;
  notes?: string;
  church_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface FuneralRecord {
  id: number;
  deceased_name: string;
  death_date: string;
  funeral_date: string;
  birth_date: string;
  father_name: string;
  mother_name: string;
  spouse_name?: string;
  priest_name: string;
  location: string;
  cause_of_death?: string;
  notes?: string;
  church_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// ===== INVOICES =====
export interface Invoice {
  id: number;
  invoice_number: string;
  church_id: number;
  church_name?: string;
  subscription_id?: number;
  issue_date: string;
  due_date: string;
  language: string;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_percent: number;
  discount_amount: number;
  total_amount: number;
  status: InvoiceStatus;
  payment_terms_multilang?: string;
  notes_multilang?: string;
  internal_notes?: string;
  pdf_path?: string;
  sent_at?: string;
  paid_at?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
  church?: Church;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  item_code?: string;
  name_multilang: string;
  description_multilang?: string;
  category: 'service' | 'product' | 'subscription' | 'addon' | 'discount' | 'tax' | 'fee';
  quantity: number;
  unit_type: 'each' | 'hour' | 'month' | 'year' | 'record' | 'page' | 'gb';
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  line_total: number;
  tax_rate: number;
  tax_amount: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  church_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  language?: SupportedLanguage;
  currency?: string;
}

export interface CreateInvoiceData {
  church_id: number;
  issue_date: string;
  due_date: string;
  total_amount: number;
  tax_amount?: number;
  currency?: string;
  language?: string;
  internal_notes?: string;
  items?: Omit<InvoiceItem, 'id' | 'invoice_id' | 'created_at' | 'updated_at'>[];
}

export interface InvoiceStats {
  total_count: number;
  total_amount: number;
  by_status: Record<InvoiceStatus, { count: number; amount: number }>;
  by_currency: Record<string, { count: number; amount: number }>;
  recent_invoices: Invoice[];
}

// ===== OCR SYSTEM =====
export interface OCRUpload {
  id: string;
  filename: string;
  file_size: number;
  file_type: string;
  language: SupportedLanguage;
  status: OCRStatus;
  progress: number;
  barcode?: string;
  extracted_text?: string;
  extracted_data?: Record<string, any>;
  confidence_score?: number;
  processing_time?: number;
  error_message?: string;
  church_id: number;
  uploaded_by: number;
  uploaded_at: string;
  processed_at?: string;
}

export interface OCRResult {
  id: string;
  status: OCRStatus;
  extracted_text?: string;
  extracted_data?: {
    name?: string;
    date?: string;
    location?: string;
    priest?: string;
    parents?: string[];
    godparents?: string[];
    [key: string]: any;
  };
  confidence_score?: number;
  processing_time?: number;
  error_message?: string;
}

export interface OCRFilters {
  status?: OCRStatus;
  language?: SupportedLanguage;
  church_id?: number;
  uploaded_by?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

// ===== PROVISIONING =====
export interface ProvisionRequest {
  id: number;
  church_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  preferred_language: SupportedLanguage;
  address: string;
  diocese?: string;
  priest_name?: string;
  estimated_members?: number;
  website?: string;
  status: ProvisionStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  church_slug?: string;
  site_url?: string;
  admin_email?: string;
  admin_password?: string;
  notes?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: number;
  provisioned_at?: string;
}

export interface ProvisionLog {
  id: number;
  request_id: number;
  stage: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  message?: string;
  error_details?: string;
  started_at?: string;
  completed_at?: string;
  duration?: number;
}

export interface ProvisionFilters {
  status?: ProvisionStatus;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  language?: SupportedLanguage;
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

// ===== COMMON INTERFACES =====
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: Record<string, any>;
}

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf' | 'json' | 'ical';
  filename?: string;
  filters?: Record<string, any>;
  language?: SupportedLanguage;
}

// ===== DASHBOARD & ANALYTICS =====
export interface DashboardMetrics {
  total_churches: number;
  active_churches: number;
  total_records: {
    baptisms: number;
    marriages: number;
    funerals: number;
  };
  recent_activity: ActivityLog[];
  ocr_stats: {
    processed: number;
    pending: number;
    failed: number;
  };
  invoice_stats: {
    total_amount: number;
    paid_amount: number;
    overdue_count: number;
  };
  provisioning_stats: {
    pending: number;
    completed: number;
    failed: number;
  };
}

export interface ActivityLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  resource_type: string;
  resource_id?: number;
  description: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ===== SEARCH & FILTERS =====
export interface SearchFilters {
  search_term?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface DropdownOption {
  value: string | number;
  label: string;
  icon?: string;
  description?: string;
}

export interface DropdownOptions {
  locations: DropdownOption[];
  clergy: DropdownOption[];
  languages: DropdownOption[];
  dioceses: DropdownOption[];
  churches: DropdownOption[];
}

// ===== CONFIGURATION =====
export interface AppConfig {
  app_name: string;
  app_version: string;
  default_language: SupportedLanguage;
  supported_languages: SupportedLanguage[];
  default_calendar_type: CalendarType;
  max_file_size_mb: number;
  allowed_file_types: string[];
  enable_ocr: boolean;
  enable_provisioning: boolean;
  enable_invoicing: boolean;
  smtp_configured: boolean;
  features: {
    calendar: boolean;
    records: boolean;
    invoices: boolean;
    ocr: boolean;
    provisioning: boolean;
    analytics: boolean;
  };
}

// ===== TRANSLATIONS =====
export interface TranslationKey {
  [key: string]: string | TranslationKey;
}

export interface Translations {
  [language: string]: TranslationKey;
}

// ===== FORM TYPES =====
export interface FormErrors {
  [key: string]: string | string[];
}

export interface FormState<T> {
  data: T;
  errors: FormErrors;
  loading: boolean;
  dirty: boolean;
  valid: boolean;
}

// ===== COMPONENT PROPS =====
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: string | null;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
  };
  filters?: Record<string, any>;
  onFilterChange?: (filters: Record<string, any>) => void;
  actions?: TableAction<T>[];
  selectable?: boolean;
  onSelectionChange?: (selectedIds: number[]) => void;
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableAction<T> {
  key: string;
  label: string;
  icon?: string;
  onClick: (item: T) => void;
  disabled?: (item: T) => boolean;
  visible?: (item: T) => boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
}

// ===== HOOKS =====
export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  mutate: (data: T) => void;
}

export interface UseApiMutation<T, P = any> {
  trigger: (params: P) => Promise<T>;
  data: T | null;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

export interface UsePaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
}

export interface UseFiltersResult<T> {
  filters: T;
  setFilters: (filters: Partial<T>) => void;
  updateFilter: (key: keyof T, value: any) => void;
  resetFilters: () => void;
  clearFilter: (key: keyof T) => void;
}

// ===== EXPORT TYPES =====
export type {
  // Re-export commonly used types
  SupportedLanguage as Language,
  UserRole as Role,
  CalendarType as Calendar,
  InvoiceStatus as Status,
};
