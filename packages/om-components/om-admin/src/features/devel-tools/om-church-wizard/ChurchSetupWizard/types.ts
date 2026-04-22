import type { TableData } from '@/features/devel-tools/live-table-builder/types';

export interface ChurchWizardData {
  // Basic Info
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  website: string;
  preferred_language: string;
  timezone: string;
  currency: string;
  is_active: boolean;

  // Template Selection
  template_church_id: number | null;
  selected_tables: string[];

  // Custom Fields
  custom_fields: CustomField[];

  // User Management
  initial_users: ChurchUser[];

  // Landing Page
  custom_landing_page: {
    enabled: boolean;
    title: string;
    welcome_message: string;
    primary_color: string;
    logo_url: string;
    default_app: 'liturgical_calendar' | 'church_records' | 'notes_app';
  };

  // Custom Table Builder data
  custom_table_builder?: {
    table_name: string;
    data: TableData;
  } | null;
}

export interface CustomField {
  id: string;
  table_name: string;
  field_name: string;
  field_type: 'VARCHAR' | 'TEXT' | 'INT' | 'DATE' | 'BOOLEAN';
  field_length?: number;
  is_required: boolean;
  default_value?: string;
  description: string;
}

export interface ChurchUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  permissions: string[];
  send_invite: boolean;
}

export interface TemplateChurch {
  id: number;
  name: string;
  city: string;
  country: string;
  available_tables: string[];
}
