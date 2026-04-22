/**
 * Orthodox Metrics - Record Table Configuration API Service
 * Handles all API calls related to record table configurations
 */

import { apiJson } from '@/sandbox/field-mapper/api/client';

export interface RecordTableConfig {
  id: number;
  table_name: string;
  display_name: string;
  description?: string;
  table_type: 'baptism' | 'marriage' | 'funeral' | 'custom';
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
  field_type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'email' | 'phone';
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

export interface FieldValidation {
  min_length?: number;
  max_length?: number;
  min?: number;
  max?: number;
  pattern?: string;
  not_future?: boolean;
  not_past?: boolean;
}

export interface DisplaySettings {
  default_page_size: number;
  max_page_size: number;
  show_actions: boolean;
  actions: string[];
  bulk_actions: string[];
  row_height: 'small' | 'medium' | 'large';
  sticky_header: boolean;
  show_pagination: boolean;
  show_search: boolean;
  show_filters: boolean;
  theme: string;
}

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

export interface RecordTableConfigResponse {
  success: boolean;
  data: RecordTableConfig | RecordTableConfig[];
  church?: {
    id: number;
    db: string;
  };
  error?: string;
  details?: string;
}

export interface CreateRecordTableConfigRequest {
  table_name: string;
  display_name: string;
  description?: string;
  table_type?: 'baptism' | 'marriage' | 'funeral' | 'custom';
  table_config?: Partial<TableConfig>;
  field_definitions?: FieldDefinition[];
  display_settings?: Partial<DisplaySettings>;
  search_config?: Partial<SearchConfig>;
  validation_rules?: Partial<ValidationRules>;
  import_export_config?: Partial<ImportExportConfig>;
  certificate_config?: Partial<CertificateConfig>;
}

export interface UpdateRecordTableConfigRequest extends Partial<CreateRecordTableConfigRequest> {}

class RecordTableConfigApiService {
  private baseUrl = '/api/record-table-config';

  /**
   * Get all record table configurations for a church
   */
  async getTableConfigs(churchId: number): Promise<RecordTableConfig[]> {
    try {
      const response = await apiJson.get<RecordTableConfigResponse>(
        `${this.baseUrl}?church_id=${churchId}`
      );
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch table configurations');
      }
      
      return Array.isArray(response.data) ? response.data : [response.data];
    } catch (error) {
      console.error('Error fetching table configurations:', error);
      throw error;
    }
  }

  /**
   * Get specific table configuration
   */
  async getTableConfig(
    churchId: number, 
    tableName: string
  ): Promise<RecordTableConfig | null> {
    try {
      const response = await apiJson.get<RecordTableConfigResponse>(
        `${this.baseUrl}/${tableName}?church_id=${churchId}`
      );
      
      if (!response.success) {
        if (response.error?.includes('not found')) {
          return null;
        }
        throw new Error(response.error || 'Failed to fetch table configuration');
      }
      
      return Array.isArray(response.data) ? response.data[0] : response.data;
    } catch (error) {
      console.error('Error fetching table configuration:', error);
      throw error;
    }
  }

  /**
   * Create new table configuration
   */
  async createTableConfig(
    churchId: number,
    config: CreateRecordTableConfigRequest
  ): Promise<RecordTableConfig> {
    try {
      const response = await apiJson.post<RecordTableConfigResponse>(
        `${this.baseUrl}?church_id=${churchId}`,
        config
      );
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create table configuration');
      }
      
      return Array.isArray(response.data) ? response.data[0] : response.data;
    } catch (error) {
      console.error('Error creating table configuration:', error);
      throw error;
    }
  }

  /**
   * Update table configuration
   */
  async updateTableConfig(
    churchId: number,
    tableName: string,
    config: UpdateRecordTableConfigRequest
  ): Promise<RecordTableConfig> {
    try {
      const response = await apiJson.put<RecordTableConfigResponse>(
        `${this.baseUrl}/${tableName}?church_id=${churchId}`,
        config
      );
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update table configuration');
      }
      
      return Array.isArray(response.data) ? response.data[0] : response.data;
    } catch (error) {
      console.error('Error updating table configuration:', error);
      throw error;
    }
  }

  /**
   * Delete table configuration
   */
  async deleteTableConfig(churchId: number, tableName: string): Promise<void> {
    try {
      const response = await apiJson.delete<RecordTableConfigResponse>(
        `${this.baseUrl}/${tableName}?church_id=${churchId}`
      );
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete table configuration');
      }
    } catch (error) {
      console.error('Error deleting table configuration:', error);
      throw error;
    }
  }

  /**
   * Get field definitions for a table
   */
  async getFieldDefinitions(
    churchId: number,
    tableName: string
  ): Promise<FieldDefinition[]> {
    try {
      const response = await apiJson.get<{
        success: boolean;
        data: FieldDefinition[];
        error?: string;
      }>(`${this.baseUrl}/${tableName}/fields?church_id=${churchId}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch field definitions');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching field definitions:', error);
      throw error;
    }
  }

  /**
   * Get display settings for a table
   */
  async getDisplaySettings(
    churchId: number,
    tableName: string
  ): Promise<DisplaySettings> {
    try {
      const response = await apiJson.get<{
        success: boolean;
        data: DisplaySettings;
        error?: string;
      }>(`${this.baseUrl}/${tableName}/display-settings?church_id=${churchId}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch display settings');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching display settings:', error);
      throw error;
    }
  }

  /**
   * Get search configuration for a table
   */
  async getSearchConfig(
    churchId: number,
    tableName: string
  ): Promise<SearchConfig> {
    try {
      const response = await apiJson.get<{
        success: boolean;
        data: SearchConfig;
        error?: string;
      }>(`${this.baseUrl}/${tableName}/search-config?church_id=${churchId}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch search configuration');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching search configuration:', error);
      throw error;
    }
  }

  /**
   * Get validation rules for a table
   */
  async getValidationRules(
    churchId: number,
    tableName: string
  ): Promise<ValidationRules> {
    try {
      const config = await this.getTableConfig(churchId, tableName);
      return config?.validation_rules || { required_fields: [], field_validations: {} };
    } catch (error) {
      console.error('Error fetching validation rules:', error);
      throw error;
    }
  }

  /**
   * Get import/export configuration for a table
   */
  async getImportExportConfig(
    churchId: number,
    tableName: string
  ): Promise<ImportExportConfig> {
    try {
      const config = await this.getTableConfig(churchId, tableName);
      return config?.import_export_config || {
        supported_formats: [],
        export_fields: [],
        import_mapping: {},
        bulk_import_limit: 1000
      };
    } catch (error) {
      console.error('Error fetching import/export configuration:', error);
      throw error;
    }
  }

  /**
   * Get certificate configuration for a table
   */
  async getCertificateConfig(
    churchId: number,
    tableName: string
  ): Promise<CertificateConfig> {
    try {
      const config = await this.getTableConfig(churchId, tableName);
      return config?.certificate_config || {
        enabled: false,
        template_path: '',
        field_positions: {},
        field_mapping: {},
        output_format: 'png',
        quality: 95
      };
    } catch (error) {
      console.error('Error fetching certificate configuration:', error);
      throw error;
    }
  }

  /**
   * Validate record data against table configuration
   */
  async validateRecordData(
    churchId: number,
    tableName: string,
    recordData: Record<string, any>
  ): Promise<{ isValid: boolean; errors: Array<{ field: string; message: string }> }> {
    try {
      const response = await apiJson.post<{
        success: boolean;
        data: { isValid: boolean; errors: Array<{ field: string; message: string }> };
        error?: string;
      }>(`${this.baseUrl}/${tableName}/validate?church_id=${churchId}`, recordData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to validate record data');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error validating record data:', error);
      throw error;
    }
  }

  /**
   * Get table schema information
   */
  async getTableSchema(
    churchId: number,
    tableName: string
  ): Promise<{
    tableName: string;
    displayName: string;
    description?: string;
    tableType: string;
    primaryKey: string;
    churchIdField: string;
    dateField: string;
    nameFields: string[];
    sortDefault: string;
    sortDirection: string;
    fields: FieldDefinition[];
    displaySettings: DisplaySettings;
    searchConfig: SearchConfig;
    validationRules: ValidationRules;
    importExportConfig: ImportExportConfig;
    certificateConfig: CertificateConfig;
  } | null> {
    try {
      const config = await this.getTableConfig(churchId, tableName);
      if (!config) return null;

      return {
        tableName: config.table_name,
        displayName: config.display_name,
        description: config.description,
        tableType: config.table_type,
        primaryKey: config.table_config.primary_key,
        churchIdField: config.table_config.church_id_field,
        dateField: config.table_config.date_field,
        nameFields: config.table_config.name_fields,
        sortDefault: config.table_config.sort_default,
        sortDirection: config.table_config.sort_direction,
        fields: config.field_definitions,
        displaySettings: config.display_settings,
        searchConfig: config.search_config,
        validationRules: config.validation_rules,
        importExportConfig: config.import_export_config,
        certificateConfig: config.certificate_config
      };
    } catch (error) {
      console.error('Error fetching table schema:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const recordTableConfigApiService = new RecordTableConfigApiService();

// Export class for testing
export { RecordTableConfigApiService };
