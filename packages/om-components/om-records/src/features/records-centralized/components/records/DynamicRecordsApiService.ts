/**
 * Dynamic Records API Service
 * Discovers and works with any om_church_## tables ending in _records
 * Uses column positions instead of field names for display
 */

import { apiClient } from '@/api/utils/axiosInstance';
import { apiJson, FieldMapperApiError } from '@/sandbox/field-mapper/api/client';

// Types
export interface DynamicRecordApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RecordFilters {
  search?: string;
  [key: string]: any;
}

export interface RecordSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
  primaryKey: string;
  displayName: string;
  recordType: string;
}

export interface ColumnInfo {
  position: number;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'json';
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey?: boolean;
  displayName?: string;
  width?: number;
  sortable?: boolean;
}

export interface RecordData {
  [key: string]: any;
  _columnPositions?: { [position: number]: any };
  _displayData?: { [position: number]: any };
}

// API Endpoints
const ENDPOINTS = {
  // Table discovery
  discoverTables: (churchId: string) => `/api/churches/${churchId}/tables/discover`,
  getTableSchema: (churchId: string, tableName: string) => `/api/churches/${churchId}/tables/${tableName}/schema`,
  
  // Dynamic records CRUD
  records: (churchId: string, tableName: string) => `/api/churches/${churchId}/tables/${tableName}/records`,
  recordById: (churchId: string, tableName: string, id: string) => `/api/churches/${churchId}/tables/${tableName}/records/${id}`,
  
  // Search and filtering
  search: (churchId: string, tableName: string) => `/api/churches/${churchId}/tables/${tableName}/search`,
  
  // Import/Export
  import: (churchId: string, tableName: string) => `/api/churches/${churchId}/tables/${tableName}/import`,
  export: (churchId: string, tableName: string) => `/api/churches/${churchId}/tables/${tableName}/export`,
  
  // Utilities
  dropdownOptions: (churchId: string) => `/api/churches/${churchId}/dropdown-options`,
  healthCheck: () => '/api/health',
} as const;

class DynamicRecordsApiService {
  private churchId: string;
  private tableCache: Map<string, TableSchema> = new Map();

  constructor(churchId: string) {
    this.churchId = churchId;
  }

  // ═══════════════════════════════════════════════════════════════
  // TABLE DISCOVERY
  // ═══════════════════════════════════════════════════════════════

  /**
   * Discover all record tables for this church
   */
  async discoverRecordTables(): Promise<DynamicRecordApiResponse<TableSchema[]>> {
    try {
      const data = await apiJson<TableSchema[]>(ENDPOINTS.discoverTables(this.churchId));
      
      // Cache the table schemas
      data.forEach(table => {
        this.tableCache.set(table.tableName, table);
      });
      
      return {
        success: true,
        data,
        message: `Discovered ${data.length} record tables`
      };
    } catch (error) {
      return this.handleError(error, 'Failed to discover record tables');
    }
  }

  /**
   * Get schema for a specific table
   */
  async getTableSchema(tableName: string): Promise<DynamicRecordApiResponse<TableSchema>> {
    try {
      // Check cache first
      if (this.tableCache.has(tableName)) {
        return {
          success: true,
          data: this.tableCache.get(tableName)!,
          message: 'Table schema retrieved from cache'
        };
      }

      const data = await apiJson<TableSchema>(ENDPOINTS.getTableSchema(this.churchId, tableName));
      
      // Cache the schema
      this.tableCache.set(tableName, data);
      
      return {
        success: true,
        data,
        message: 'Table schema retrieved successfully'
      };
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve table schema');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DYNAMIC RECORDS CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all records for a specific table
   */
  async getRecords(
    tableName: string,
    filters?: RecordFilters,
    sort?: RecordSort,
    pagination?: { page: number; limit: number }
  ): Promise<DynamicRecordApiResponse<PaginatedResponse<RecordData>>> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }
      
      if (sort) {
        params.append('sortBy', sort.field);
        params.append('sortOrder', sort.direction);
      }
      
      if (pagination) {
        params.append('page', pagination.page.toString());
        params.append('limit', pagination.limit.toString());
      }

      const url = `${ENDPOINTS.records(this.churchId, tableName)}?${params.toString()}`;
      const data = await apiJson<PaginatedResponse<RecordData>>(url);
      
      // Transform data to include column position information
      const transformedData = {
        ...data,
        data: data.data.map(record => this.transformRecordData(record, tableName))
      };
      
      return {
        success: true,
        data: transformedData,
        message: 'Records retrieved successfully'
      };
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve records');
    }
  }

  /**
   * Get a single record by ID
   */
  async getRecord(
    tableName: string,
    id: string
  ): Promise<DynamicRecordApiResponse<RecordData>> {
    try {
      const data = await apiJson<RecordData>(ENDPOINTS.recordById(this.churchId, tableName, id));
      
      return {
        success: true,
        data: this.transformRecordData(data, tableName),
        message: 'Record retrieved successfully'
      };
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve record');
    }
  }

  /**
   * Create a new record
   */
  async createRecord(
    tableName: string,
    recordData: Partial<RecordData>
  ): Promise<DynamicRecordApiResponse<RecordData>> {
    try {
      const data = await apiJson<RecordData>(ENDPOINTS.records(this.churchId, tableName), {
        method: 'POST',
        body: JSON.stringify(recordData)
      });
      
      return {
        success: true,
        data: this.transformRecordData(data, tableName),
        message: 'Record created successfully'
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create record');
    }
  }

  /**
   * Update an existing record
   */
  async updateRecord(
    tableName: string,
    id: string,
    recordData: Partial<RecordData>
  ): Promise<DynamicRecordApiResponse<RecordData>> {
    try {
      const data = await apiJson<RecordData>(ENDPOINTS.recordById(this.churchId, tableName, id), {
        method: 'PUT',
        body: JSON.stringify(recordData)
      });
      
      return {
        success: true,
        data: this.transformRecordData(data, tableName),
        message: 'Record updated successfully'
      };
    } catch (error) {
      return this.handleError(error, 'Failed to update record');
    }
  }

  /**
   * Delete a record
   */
  async deleteRecord(
    tableName: string,
    id: string
  ): Promise<DynamicRecordApiResponse<void>> {
    try {
      await apiJson<void>(ENDPOINTS.recordById(this.churchId, tableName, id), {
        method: 'DELETE'
      });
      
      return {
        success: true,
        message: 'Record deleted successfully'
      };
    } catch (error) {
      return this.handleError(error, 'Failed to delete record');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SEARCH AND FILTERING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Search records with advanced filtering
   */
  async searchRecords(
    tableName: string,
    searchTerm: string,
    filters?: RecordFilters,
    sort?: RecordSort,
    pagination?: { page: number; limit: number }
  ): Promise<DynamicRecordApiResponse<PaginatedResponse<RecordData>>> {
    try {
      const params = new URLSearchParams();
      params.append('q', searchTerm);
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }
      
      if (sort) {
        params.append('sortBy', sort.field);
        params.append('sortOrder', sort.direction);
      }
      
      if (pagination) {
        params.append('page', pagination.page.toString());
        params.append('limit', pagination.limit.toString());
      }

      const url = `${ENDPOINTS.search(this.churchId, tableName)}?${params.toString()}`;
      const data = await apiJson<PaginatedResponse<RecordData>>(url);
      
      // Transform data to include column position information
      const transformedData = {
        ...data,
        data: data.data.map(record => this.transformRecordData(record, tableName))
      };
      
      return {
        success: true,
        data: transformedData,
        message: 'Search completed successfully'
      };
    } catch (error) {
      return this.handleError(error, 'Failed to search records');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // IMPORT/EXPORT OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Import records from file
   */
  async importRecords(
    tableName: string,
    file: File,
    options?: { mapping?: any; skipValidation?: boolean }
  ): Promise<DynamicRecordApiResponse<{ imported: number; errors: any[] }>> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (options?.mapping) {
        formData.append('mapping', JSON.stringify(options.mapping));
      }
      
      if (options?.skipValidation) {
        formData.append('skipValidation', 'true');
      }

      const data = await apiJson<{ imported: number; errors: any[] }>(
        ENDPOINTS.import(this.churchId, tableName),
        {
          method: 'POST',
          body: formData
        }
      );
      
      return {
        success: true,
        data,
        message: `Successfully imported ${data.imported} records`
      };
    } catch (error) {
      return this.handleError(error, 'Failed to import records');
    }
  }

  /**
   * Export records to file
   */
  async exportRecords(
    tableName: string,
    format: 'csv' | 'pdf' | 'excel',
    filters?: RecordFilters
  ): Promise<DynamicRecordApiResponse<Blob>> {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }

      const exportUrl = ENDPOINTS.export(this.churchId, tableName).replace(/^\/api/, '');
      const blob = await apiClient.request<Blob>({
        method: 'GET',
        url: `${exportUrl}?${params.toString()}`,
        responseType: 'blob',
      });
      
      return {
        success: true,
        data: blob,
        message: 'Records exported successfully'
      };
    } catch (error) {
      return this.handleError(error, 'Failed to export records');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get dropdown options for forms
   */
  async getDropdownOptions(): Promise<DynamicRecordApiResponse<any>> {
    try {
      const data = await apiJson<any>(ENDPOINTS.dropdownOptions(this.churchId));
      
      return {
        success: true,
        data,
        message: 'Dropdown options retrieved successfully'
      };
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve dropdown options');
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<DynamicRecordApiResponse<{ status: string; timestamp: string }>> {
    try {
      const data = await apiJson<{ status: string; timestamp: string }>(ENDPOINTS.healthCheck());
      
      return {
        success: true,
        data,
        message: 'Health check completed'
      };
    } catch (error) {
      return this.handleError(error, 'Health check failed');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DATA TRANSFORMATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Transform record data to include column position information
   */
  private transformRecordData(record: RecordData, tableName: string): RecordData {
    const schema = this.tableCache.get(tableName);
    if (!schema) {
      return record;
    }

    const transformedRecord = { ...record };
    const columnPositions: { [position: number]: any } = {};
    const displayData: { [position: number]: any } = {};

    // Map data by column position
    schema.columns.forEach(column => {
      const value = record[column.name];
      columnPositions[column.position] = value;
      
      // Format display data based on column type
      displayData[column.position] = this.formatDisplayValue(value, column);
    });

    transformedRecord._columnPositions = columnPositions;
    transformedRecord._displayData = displayData;

    return transformedRecord;
  }

  /**
   * Format display value based on column type
   */
  private formatDisplayValue(value: any, column: ColumnInfo): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }

    switch (column.type) {
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'number':
        return value.toString();
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'json':
        return typeof value === 'string' ? value : JSON.stringify(value);
      default:
        return String(value);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════

  private handleError(error: any, defaultMessage: string): DynamicRecordApiResponse<any> {
    console.error('Dynamic Records API Error:', error);
    
    let message = defaultMessage;
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error instanceof FieldMapperApiError) {
      message = error.apiError.message;
      errorCode = error.apiError.code || 'API_ERROR';
    } else if (error instanceof Error) {
      message = error.message;
    }
    
    return {
      success: false,
      error: message,
      message: `Error: ${message}`
    };
  }
}

// Factory function to create service instance
export const createDynamicRecordsApiService = (churchId: string) => new DynamicRecordsApiService(churchId);

// Export singleton for default church (if available)
export const dynamicRecordsApiService = createDynamicRecordsApiService('default');

export default DynamicRecordsApiService;
