/**
 * Orthodox Metrics - Unified Records API Service
 * Combines record table configuration and AG Grid configuration for complete record management
 */

import { recordTableConfigApiService, RecordTableConfig, FieldDefinition, TableConfig } from './RecordTableConfigApiService';
import { agGridConfigApiService, AgGridConfig, ColumnDefinition, GridOptions } from './AgGridConfigApiService';
import { apiJson } from '@/sandbox/field-mapper/api/client';

export interface UnifiedRecordConfig {
  tableConfig: RecordTableConfig;
  agGridConfig: AgGridConfig;
  schema: UnifiedTableSchema;
}

export interface UnifiedTableSchema {
  tableName: string;
  displayName: string;
  description?: string;
  tableType: 'baptism' | 'marriage' | 'funeral' | 'custom';
  primaryKey: string;
  churchIdField: string;
  dateField: string;
  nameFields: string[];
  sortDefault: string;
  sortDirection: 'ASC' | 'DESC';
  fields: FieldDefinition[];
  displaySettings: any;
  searchConfig: any;
  validationRules: any;
  importExportConfig: any;
  certificateConfig: any;
  gridOptions: GridOptions;
  columnDefs: ColumnDefinition[];
  defaultColDef: Record<string, any>;
  themeSettings: any;
  exportSettings: any;
}

export interface RecordData {
  [key: string]: any;
}

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

export interface RecordApiResponse {
  success: boolean;
  data: RecordData | RecordData[] | PaginatedRecordsResponse;
  church?: {
    id: number;
    db: string;
  };
  error?: string;
  details?: string;
}

class UnifiedRecordsApiService {
  private baseUrl = '/api/dynamic-records';

  /**
   * Get unified configuration for a table (combines table config + AG Grid config)
   */
  async getUnifiedConfig(
    churchId: number,
    tableName: string,
    agGridConfigName: string = 'default'
  ): Promise<UnifiedRecordConfig | null> {
    try {
      const [tableConfig, agGridConfig] = await Promise.all([
        recordTableConfigApiService.getTableConfig(churchId, tableName),
        agGridConfigApiService.getGridConfig(churchId, tableName, agGridConfigName)
      ]);

      if (!tableConfig || !agGridConfig) {
        return null;
      }

      const schema = this.createUnifiedSchema(tableConfig, agGridConfig);

      return {
        tableConfig,
        agGridConfig,
        schema
      };
    } catch (error) {
      console.error('Error fetching unified configuration:', error);
      throw error;
    }
  }

  /**
   * Get records with unified configuration
   */
  async getRecords(
    churchId: number,
    tableName: string,
    filters: RecordFilters = {}
  ): Promise<PaginatedRecordsResponse> {
    try {
      const queryParams = new URLSearchParams({
        church_id: churchId.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.sort && { 
          sortField: filters.sort.field,
          sortDirection: filters.sort.direction
        }),
        ...(filters.pagination && {
          page: filters.pagination.page.toString(),
          limit: filters.pagination.limit.toString()
        }),
        ...(filters.filters && { filters: JSON.stringify(filters.filters) })
      });

      const response = await apiJson.get<RecordApiResponse>(
        `${this.baseUrl}/tables/${tableName}/records?${queryParams}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch records');
      }

      return response.data as PaginatedRecordsResponse;
    } catch (error) {
      console.error('Error fetching records:', error);
      throw error;
    }
  }

  /**
   * Get single record by ID
   */
  async getRecord(
    churchId: number,
    tableName: string,
    recordId: string | number
  ): Promise<RecordData> {
    try {
      const response = await apiJson.get<RecordApiResponse>(
        `${this.baseUrl}/tables/${tableName}/records/${recordId}?church_id=${churchId}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch record');
      }

      return (response.data as any).record;
    } catch (error) {
      console.error('Error fetching record:', error);
      throw error;
    }
  }

  /**
   * Create new record
   */
  async createRecord(
    churchId: number,
    tableName: string,
    recordData: RecordData
  ): Promise<RecordData> {
    try {
      const response = await apiJson.post<RecordApiResponse>(
        `${this.baseUrl}/tables/${tableName}/records?church_id=${churchId}`,
        recordData
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to create record');
      }

      return response.data as RecordData;
    } catch (error) {
      console.error('Error creating record:', error);
      throw error;
    }
  }

  /**
   * Update existing record
   */
  async updateRecord(
    churchId: number,
    tableName: string,
    recordId: string | number,
    recordData: RecordData
  ): Promise<RecordData> {
    try {
      const response = await apiJson.put<RecordApiResponse>(
        `${this.baseUrl}/tables/${tableName}/records/${recordId}?church_id=${churchId}`,
        recordData
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update record');
      }

      return response.data as RecordData;
    } catch (error) {
      console.error('Error updating record:', error);
      throw error;
    }
  }

  /**
   * Delete record
   */
  async deleteRecord(
    churchId: number,
    tableName: string,
    recordId: string | number
  ): Promise<void> {
    try {
      const response = await apiJson.delete<RecordApiResponse>(
        `${this.baseUrl}/tables/${tableName}/records/${recordId}?church_id=${churchId}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete record');
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      throw error;
    }
  }

  /**
   * Validate record data
   */
  async validateRecord(
    churchId: number,
    tableName: string,
    recordData: RecordData
  ): Promise<{ isValid: boolean; errors: Array<{ field: string; message: string }> }> {
    try {
      const response = await apiJson.post<{
        success: boolean;
        data: { isValid: boolean; errors: Array<{ field: string; message: string }> };
        error?: string;
      }>(`${this.baseUrl}/tables/${tableName}/validate?church_id=${churchId}`, recordData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to validate record');
      }

      return response.data;
    } catch (error) {
      console.error('Error validating record:', error);
      throw error;
    }
  }

  /**
   * Get available tables for a church
   */
  async getAvailableTables(churchId: number): Promise<Array<{
    tableName: string;
    displayName: string;
    tableType: string;
    fieldCount: number;
    hasCertificate: boolean;
  }>> {
    try {
      const response = await apiJson.get<{
        success: boolean;
        data: Array<{
          tableName: string;
          displayName: string;
          tableType: string;
          fieldCount: number;
          hasCertificate: boolean;
        }>;
        error?: string;
      }>(`${this.baseUrl}/tables?church_id=${churchId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch available tables');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching available tables:', error);
      throw error;
    }
  }

  /**
   * Get table schema
   */
  async getTableSchema(
    churchId: number,
    tableName: string
  ): Promise<UnifiedTableSchema | null> {
    try {
      const config = await this.getUnifiedConfig(churchId, tableName);
      return config?.schema || null;
    } catch (error) {
      console.error('Error fetching table schema:', error);
      throw error;
    }
  }

  /**
   * Save user's grid state
   */
  async saveGridState(
    churchId: number,
    tableName: string,
    stateData: any,
    configName: string = 'default'
  ): Promise<void> {
    try {
      await agGridConfigApiService.saveGridState(churchId, tableName, stateData, configName);
    } catch (error) {
      console.error('Error saving grid state:', error);
      throw error;
    }
  }

  /**
   * Load user's saved grid state
   */
  async loadGridState(
    churchId: number,
    tableName: string,
    configName: string = 'default'
  ): Promise<any> {
    try {
      return await agGridConfigApiService.loadGridState(churchId, tableName, configName);
    } catch (error) {
      console.error('Error loading grid state:', error);
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
      return await recordTableConfigApiService.getFieldDefinitions(churchId, tableName);
    } catch (error) {
      console.error('Error fetching field definitions:', error);
      throw error;
    }
  }

  /**
   * Get column definitions for AG Grid
   */
  async getColumnDefinitions(
    churchId: number,
    tableName: string,
    configName: string = 'default'
  ): Promise<ColumnDefinition[]> {
    try {
      return await agGridConfigApiService.getColumnDefinitions(churchId, tableName, configName);
    } catch (error) {
      console.error('Error fetching column definitions:', error);
      throw error;
    }
  }

  /**
   * Create unified schema from table and AG Grid configurations
   */
  private createUnifiedSchema(
    tableConfig: RecordTableConfig,
    agGridConfig: AgGridConfig
  ): UnifiedTableSchema {
    return {
      tableName: tableConfig.table_name,
      displayName: tableConfig.display_name,
      description: tableConfig.description,
      tableType: tableConfig.table_type,
      primaryKey: tableConfig.table_config.primary_key,
      churchIdField: tableConfig.table_config.church_id_field,
      dateField: tableConfig.table_config.date_field,
      nameFields: tableConfig.table_config.name_fields,
      sortDefault: tableConfig.table_config.sort_default,
      sortDirection: tableConfig.table_config.sort_direction,
      fields: tableConfig.field_definitions,
      displaySettings: tableConfig.display_settings,
      searchConfig: tableConfig.search_config,
      validationRules: tableConfig.validation_rules,
      importExportConfig: tableConfig.import_export_config,
      certificateConfig: tableConfig.certificate_config,
      gridOptions: agGridConfig.grid_options,
      columnDefs: agGridConfig.column_definitions,
      defaultColDef: agGridConfig.default_column_state,
      themeSettings: agGridConfig.theme_settings,
      exportSettings: agGridConfig.export_settings
    };
  }

  /**
   * Get searchable fields for a table
   */
  async getSearchableFields(churchId: number, tableName: string): Promise<string[]> {
    try {
      const schema = await this.getTableSchema(churchId, tableName);
      return schema?.searchConfig.searchable_fields || [];
    } catch (error) {
      console.error('Error fetching searchable fields:', error);
      throw error;
    }
  }

  /**
   * Get sortable fields for a table
   */
  async getSortableFields(churchId: number, tableName: string): Promise<string[]> {
    try {
      const schema = await this.getTableSchema(churchId, tableName);
      return schema?.searchConfig.sortable_fields || [];
    } catch (error) {
      console.error('Error fetching sortable fields:', error);
      throw error;
    }
  }

  /**
   * Get required fields for a table
   */
  async getRequiredFields(churchId: number, tableName: string): Promise<string[]> {
    try {
      const schema = await this.getTableSchema(churchId, tableName);
      return schema?.validationRules.required_fields || [];
    } catch (error) {
      console.error('Error fetching required fields:', error);
      throw error;
    }
  }

  /**
   * Get dropdown options for a field
   */
  async getDropdownOptions(
    churchId: number,
    tableName: string,
    fieldName: string
  ): Promise<string[]> {
    try {
      // This would typically call a dropdown API
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const unifiedRecordsApiService = new UnifiedRecordsApiService();

// Export class for testing
export { UnifiedRecordsApiService };
