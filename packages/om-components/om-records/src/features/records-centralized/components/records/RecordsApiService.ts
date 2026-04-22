/**
 * Unified Records API Service
 * Consolidates all record-related API calls with consistent error handling and loading states
 */

import { apiClient } from '@/api/utils/axiosInstance';
import { apiJson, FieldMapperApiError } from '../client';

// Types
export interface RecordApiResponse<T> {
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
  recordType?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  [key: string]: any;
}

export interface RecordSort {
  field: string;
  direction: 'asc' | 'desc';
}

// API Endpoints
const ENDPOINTS = {
  // Records CRUD
  records: (churchId: string, recordType: string) => `/api/churches/${churchId}/records/${recordType}`,
  recordById: (churchId: string, recordType: string, id: string) => `/api/churches/${churchId}/records/${recordType}/${id}`,
  
  // Search and filtering
  search: (churchId: string, recordType: string) => `/api/churches/${churchId}/records/${recordType}/search`,
  
  // Import/Export
  import: (churchId: string, recordType: string) => `/api/churches/${churchId}/records/${recordType}/import`,
  export: (churchId: string, recordType: string) => `/api/churches/${churchId}/records/${recordType}/export`,
  
  // Field mapping
  knownFields: (recordType: string) => `/api/records/${recordType}/known-fields`,
  columnSample: (churchId: string, recordType: string) => `/api/churches/${churchId}/records/${recordType}/columns`,
  fieldMapping: (churchId: string, recordType: string) => `/api/churches/${churchId}/records/${recordType}/field-mapping`,
  
  // Utilities
  dropdownOptions: (churchId: string) => `/api/churches/${churchId}/dropdown-options`,
  healthCheck: () => '/api/health',
} as const;

class RecordsApiService {
  private churchId: string;

  constructor(churchId: string) {
    this.churchId = churchId;
  }

  // ═══════════════════════════════════════════════════════════════
  // RECORDS CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all records for a specific type
   */
  async getRecords<T = any>(
    recordType: string,
    filters?: RecordFilters,
    sort?: RecordSort,
    pagination?: { page: number; limit: number }
  ): Promise<RecordApiResponse<PaginatedResponse<T>>> {
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

      const url = `${ENDPOINTS.records(this.churchId, recordType)}?${params.toString()}`;
      const data = await apiJson<PaginatedResponse<T>>(url);
      
      return {
        success: true,
        data,
        message: 'Records retrieved successfully'
      };
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve records');
    }
  }

  /**
   * Get a single record by ID
   */
  async getRecord<T = any>(
    recordType: string,
    id: string
  ): Promise<RecordApiResponse<T>> {
    try {
      const data = await apiJson<T>(ENDPOINTS.recordById(this.churchId, recordType, id));
      
      return {
        success: true,
        data,
        message: 'Record retrieved successfully'
      };
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve record');
    }
  }

  /**
   * Create a new record
   */
  async createRecord<T = any>(
    recordType: string,
    recordData: Partial<T>
  ): Promise<RecordApiResponse<T>> {
    try {
      const data = await apiJson<T>(ENDPOINTS.records(this.churchId, recordType), {
        method: 'POST',
        body: JSON.stringify(recordData)
      });
      
      return {
        success: true,
        data,
        message: 'Record created successfully'
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create record');
    }
  }

  /**
   * Update an existing record
   */
  async updateRecord<T = any>(
    recordType: string,
    id: string,
    recordData: Partial<T>
  ): Promise<RecordApiResponse<T>> {
    try {
      const data = await apiJson<T>(ENDPOINTS.recordById(this.churchId, recordType, id), {
        method: 'PUT',
        body: JSON.stringify(recordData)
      });
      
      return {
        success: true,
        data,
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
    recordType: string,
    id: string
  ): Promise<RecordApiResponse<void>> {
    try {
      await apiJson<void>(ENDPOINTS.recordById(this.churchId, recordType, id), {
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
  async searchRecords<T = any>(
    recordType: string,
    searchTerm: string,
    filters?: RecordFilters,
    sort?: RecordSort,
    pagination?: { page: number; limit: number }
  ): Promise<RecordApiResponse<PaginatedResponse<T>>> {
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

      const url = `${ENDPOINTS.search(this.churchId, recordType)}?${params.toString()}`;
      const data = await apiJson<PaginatedResponse<T>>(url);
      
      return {
        success: true,
        data,
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
    recordType: string,
    file: File,
    options?: { mapping?: any; skipValidation?: boolean }
  ): Promise<RecordApiResponse<{ imported: number; errors: any[] }>> {
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
        ENDPOINTS.import(this.churchId, recordType),
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
    recordType: string,
    format: 'csv' | 'pdf' | 'excel',
    filters?: RecordFilters
  ): Promise<RecordApiResponse<Blob>> {
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

      const exportUrl = ENDPOINTS.export(this.churchId, recordType).replace(/^\/api/, '');
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
  // FIELD MAPPING OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get known fields for a record type
   */
  async getKnownFields(recordType: string): Promise<RecordApiResponse<any[]>> {
    try {
      const data = await apiJson<any[]>(ENDPOINTS.knownFields(recordType));
      
      return {
        success: true,
        data,
        message: 'Known fields retrieved successfully'
      };
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve known fields');
    }
  }

  /**
   * Get column sample for field mapping
   */
  async getColumnSample(recordType: string): Promise<RecordApiResponse<any[]>> {
    try {
      const data = await apiJson<any[]>(ENDPOINTS.columnSample(this.churchId, recordType));
      
      return {
        success: true,
        data,
        message: 'Column sample retrieved successfully'
      };
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve column sample');
    }
  }

  /**
   * Get field mapping configuration
   */
  async getFieldMapping(recordType: string): Promise<RecordApiResponse<any>> {
    try {
      const data = await apiJson<any>(ENDPOINTS.fieldMapping(this.churchId, recordType));
      
      return {
        success: true,
        data,
        message: 'Field mapping retrieved successfully'
      };
    } catch (error) {
      return this.handleError(error, 'Failed to retrieve field mapping');
    }
  }

  /**
   * Save field mapping configuration
   */
  async saveFieldMapping(
    recordType: string,
    mapping: any
  ): Promise<RecordApiResponse<any>> {
    try {
      const data = await apiJson<any>(ENDPOINTS.fieldMapping(this.churchId, recordType), {
        method: 'PUT',
        body: JSON.stringify(mapping)
      });
      
      return {
        success: true,
        data,
        message: 'Field mapping saved successfully'
      };
    } catch (error) {
      return this.handleError(error, 'Failed to save field mapping');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get dropdown options for forms
   */
  async getDropdownOptions(): Promise<RecordApiResponse<any>> {
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
  async healthCheck(): Promise<RecordApiResponse<{ status: string; timestamp: string }>> {
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
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════

  private handleError(error: any, defaultMessage: string): RecordApiResponse<any> {
    console.error('Records API Error:', error);
    
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
export const createRecordsApiService = (churchId: string) => new RecordsApiService(churchId);

// Export singleton for default church (if available)
export const recordsApiService = createRecordsApiService('default');

export default RecordsApiService;
