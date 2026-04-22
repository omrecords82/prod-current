/**
 * Dynamic hooks for any record table
 * Works with om_church_## tables ending in _records
 * Uses column positions instead of field names
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createDynamicRecordsApiService, 
  RecordFilters, 
  RecordSort, 
  PaginatedResponse,
  TableSchema,
  RecordData 
} from './DynamicRecordsApiService';

// Query keys for consistent caching
const QUERY_KEYS = {
  tables: (churchId: string) => ['dynamic-tables', churchId],
  tableSchema: (churchId: string, tableName: string) => ['table-schema', churchId, tableName],
  records: (churchId: string, tableName: string, filters?: RecordFilters, sort?: RecordSort, pagination?: any) => 
    ['dynamic-records', churchId, tableName, filters, sort, pagination],
  record: (churchId: string, tableName: string, id: string) => 
    ['dynamic-record', churchId, tableName, id],
  dropdownOptions: (churchId: string) => ['dropdown-options', churchId],
} as const;

/**
 * Hook for discovering available record tables
 */
export function useRecordTables(churchId: string) {
  const apiService = useMemo(() => createDynamicRecordsApiService(churchId), [churchId]);
  
  const {
    data,
    error,
    isLoading,
    refetch
  } = useQuery({
    queryKey: QUERY_KEYS.tables(churchId),
    queryFn: () => apiService.discoverRecordTables(),
    enabled: !!churchId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  return {
    tables: data?.data || [],
    isLoading,
    error: error || data?.error,
    refetch,
    success: data?.success || false,
  };
}

/**
 * Hook for getting table schema
 */
export function useTableSchema(churchId: string, tableName: string) {
  const apiService = useMemo(() => createDynamicRecordsApiService(churchId), [churchId]);
  
  const {
    data,
    error,
    isLoading,
    refetch
  } = useQuery({
    queryKey: QUERY_KEYS.tableSchema(churchId, tableName),
    queryFn: () => apiService.getTableSchema(tableName),
    enabled: !!churchId && !!tableName,
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
  });

  return {
    schema: data?.data,
    isLoading,
    error: error || data?.error,
    refetch,
    success: data?.success || false,
  };
}

/**
 * Hook for managing records with pagination, filtering, and sorting
 */
export function useDynamicRecords(
  churchId: string,
  tableName: string,
  options: {
    filters?: RecordFilters;
    sort?: RecordSort;
    pagination?: { page: number; limit: number };
    enabled?: boolean;
  } = {}
) {
  const apiService = useMemo(() => createDynamicRecordsApiService(churchId), [churchId]);
  
  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: QUERY_KEYS.records(churchId, tableName, options.filters, options.sort, options.pagination),
    queryFn: () => apiService.getRecords(tableName, options.filters, options.sort, options.pagination),
    enabled: options.enabled !== false && !!churchId && !!tableName,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  return {
    records: data?.data?.data || [],
    total: data?.data?.total || 0,
    page: data?.data?.page || 1,
    totalPages: data?.data?.totalPages || 0,
    isLoading,
    isFetching,
    error: error || data?.error,
    refetch,
    success: data?.success || false,
  };
}

/**
 * Hook for managing a single record
 */
export function useDynamicRecord(
  churchId: string,
  tableName: string,
  recordId: string,
  options: { enabled?: boolean } = {}
) {
  const apiService = useMemo(() => createDynamicRecordsApiService(churchId), [churchId]);
  
  const {
    data,
    error,
    isLoading,
    refetch
  } = useQuery({
    queryKey: QUERY_KEYS.record(churchId, tableName, recordId),
    queryFn: () => apiService.getRecord(tableName, recordId),
    enabled: options.enabled !== false && !!churchId && !!tableName && !!recordId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    record: data?.data,
    isLoading,
    error: error || data?.error,
    refetch,
    success: data?.success || false,
  };
}

/**
 * Hook for record mutations (create, update, delete)
 */
export function useDynamicRecordMutations(
  churchId: string,
  tableName: string
) {
  const queryClient = useQueryClient();
  const apiService = useMemo(() => createDynamicRecordsApiService(churchId), [churchId]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (recordData: Partial<RecordData>) => apiService.createRecord(tableName, recordData),
    onSuccess: () => {
      // Invalidate and refetch records
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.records(churchId, tableName) 
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RecordData> }) => 
      apiService.updateRecord(tableName, id, data),
    onSuccess: (_, { id }) => {
      // Invalidate records and specific record
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.records(churchId, tableName) 
      });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.record(churchId, tableName, id) 
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiService.deleteRecord(tableName, id),
    onSuccess: () => {
      // Invalidate records
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.records(churchId, tableName) 
      });
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
  };
}

/**
 * Hook for search functionality
 */
export function useDynamicRecordSearch(
  churchId: string,
  tableName: string,
  searchTerm: string,
  options: {
    filters?: RecordFilters;
    sort?: RecordSort;
    pagination?: { page: number; limit: number };
    enabled?: boolean;
  } = {}
) {
  const apiService = useMemo(() => createDynamicRecordsApiService(churchId), [churchId]);
  
  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch
  } = useQuery({
    queryKey: ['dynamic-search', churchId, tableName, searchTerm, options.filters, options.sort, options.pagination],
    queryFn: () => apiService.searchRecords(
      tableName, 
      searchTerm, 
      options.filters, 
      options.sort, 
      options.pagination
    ),
    enabled: (options.enabled !== false) && !!churchId && !!tableName && !!searchTerm.trim(),
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
  });

  return {
    results: data?.data?.data || [],
    total: data?.data?.total || 0,
    page: data?.data?.page || 1,
    totalPages: data?.data?.totalPages || 0,
    isLoading,
    isFetching,
    error: error || data?.error,
    refetch,
    success: data?.success || false,
  };
}

/**
 * Hook for import/export operations
 */
export function useDynamicRecordImportExport(churchId: string, tableName: string) {
  const apiService = useMemo(() => createDynamicRecordsApiService(churchId), [churchId]);
  const queryClient = useQueryClient();

  // Import mutation
  const importMutation = useMutation({
    mutationFn: ({ file, options }: { file: File; options?: any }) => 
      apiService.importRecords(tableName, file, options),
    onSuccess: () => {
      // Invalidate records after import
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.records(churchId, tableName) 
      });
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: ({ format, filters }: { format: 'csv' | 'pdf' | 'excel'; filters?: RecordFilters }) => 
      apiService.exportRecords(tableName, format, filters),
  });

  return {
    import: importMutation,
    export: exportMutation,
  };
}

/**
 * Hook for dropdown options
 */
export function useDynamicDropdownOptions(churchId: string) {
  const apiService = useMemo(() => createDynamicRecordsApiService(churchId), [churchId]);
  
  const {
    data,
    error,
    isLoading,
    refetch
  } = useQuery({
    queryKey: QUERY_KEYS.dropdownOptions(churchId),
    queryFn: () => apiService.getDropdownOptions(),
    enabled: !!churchId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  return {
    options: data?.data || {},
    isLoading,
    error: error || data?.error,
    refetch,
    success: data?.success || false,
  };
}

/**
 * Hook for generating table columns from schema
 */
export function useTableColumns(churchId: string, tableName: string) {
  const { schema, isLoading, error } = useTableSchema(churchId, tableName);

  const columns = useMemo(() => {
    if (!schema) return [];

    return schema.columns
      .filter(column => !column.isPrimaryKey) // Exclude primary key from display
      .sort((a, b) => a.position - b.position) // Sort by position
      .map(column => ({
        key: `col_${column.position}`,
        label: column.displayName || column.name,
        width: column.width || 'auto',
        sortable: column.sortable !== false,
        position: column.position,
        type: column.type,
        render: (value: any, record: RecordData) => {
          // Use column position data if available
          if (record._displayData && record._displayData[column.position] !== undefined) {
            return record._displayData[column.position];
          }
          
          // Fallback to column name
          const columnValue = record[column.name];
          return formatDisplayValue(columnValue, column);
        },
      }));
  }, [schema]);

  return {
    columns,
    isLoading,
    error,
    schema,
  };
}

/**
 * Hook for generating form fields from schema
 */
export function useFormFields(churchId: string, tableName: string) {
  const { schema, isLoading, error } = useTableSchema(churchId, tableName);

  const fields = useMemo(() => {
    if (!schema) return [];

    return schema.columns
      .filter(column => !column.isPrimaryKey) // Exclude primary key from form
      .sort((a, b) => a.position - b.position) // Sort by position
      .map(column => ({
        key: column.name,
        label: column.displayName || column.name,
        type: mapColumnTypeToFormType(column.type),
        required: !column.nullable,
        placeholder: `Enter ${column.displayName || column.name.toLowerCase()}`,
        gridSize: { xs: 12, sm: 6, md: 4 },
        position: column.position,
      }));
  }, [schema]);

  return {
    fields,
    isLoading,
    error,
    schema,
  };
}

/**
 * Hook for generating search filters from schema
 */
export function useSearchFilters(churchId: string, tableName: string) {
  const { schema, isLoading, error } = useTableSchema(churchId, tableName);

  const filters = useMemo(() => {
    if (!schema) return [];

    return schema.columns
      .filter(column => 
        !column.isPrimaryKey && 
        (column.type === 'text' || column.type === 'date' || column.type === 'number')
      )
      .sort((a, b) => a.position - b.position)
      .map(column => ({
        key: column.name,
        label: column.displayName || column.name,
        type: mapColumnTypeToFilterType(column.type),
        position: column.position,
      }));
  }, [schema]);

  return {
    filters,
    isLoading,
    error,
    schema,
  };
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function formatDisplayValue(value: any, column: any): string {
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

function mapColumnTypeToFormType(columnType: string): string {
  switch (columnType) {
    case 'date':
      return 'date';
    case 'number':
      return 'number';
    case 'boolean':
      return 'switch';
    case 'json':
      return 'textarea';
    default:
      return 'text';
  }
}

function mapColumnTypeToFilterType(columnType: string): string {
  switch (columnType) {
    case 'date':
      return 'date';
    case 'number':
      return 'text';
    default:
      return 'text';
  }
}
