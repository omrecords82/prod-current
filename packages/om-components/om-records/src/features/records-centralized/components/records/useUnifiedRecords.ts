/**
 * Orthodox Metrics - useUnifiedRecords Hook
 * React hook that combines record table configuration and AG Grid configuration
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  unifiedRecordsApiService,
  UnifiedRecordConfig,
  UnifiedTableSchema,
  RecordData,
  RecordFilters,
  PaginatedRecordsResponse,
  ValidationResult
} from './UnifiedRecordsApiService';
import { useRecordTableConfig } from './useRecordTableConfig';
import { useAgGridConfig } from './useAgGridConfig';

export interface UseUnifiedRecordsOptions {
  churchId: number;
  tableName: string;
  agGridConfigName?: string;
  filters?: RecordFilters;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface UseUnifiedRecordsReturn {
  // Data
  records: RecordData[] | undefined;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | undefined;
  schema: UnifiedTableSchema | undefined;
  config: UnifiedRecordConfig | undefined;
  
  // Loading states
  loading: boolean;
  recordsLoading: boolean;
  configLoading: boolean;
  error: string | null;
  
  // Actions
  refetch: () => void;
  refetchRecords: () => void;
  refetchConfig: () => void;
  setFilters: (filters: RecordFilters) => void;
  setSort: (sort: { field: string; direction: 'asc' | 'desc' }) => void;
  setPagination: (pagination: { page: number; limit: number }) => void;
  
  // Grid state management
  saveGridState: (state: any) => Promise<void>;
  loadGridState: () => Promise<any>;
  isSavingState: boolean;
  isLoadingState: boolean;
}

export interface UseUnifiedRecordMutationsOptions {
  churchId: number;
  tableName: string;
  onSuccess?: (data: RecordData) => void;
  onError?: (error: Error) => void;
}

export interface UseUnifiedRecordMutationsReturn {
  createRecord: (data: RecordData) => Promise<RecordData>;
  updateRecord: (id: string | number, data: RecordData) => Promise<RecordData>;
  deleteRecord: (id: string | number) => Promise<void>;
  validateRecord: (data: RecordData) => Promise<ValidationResult>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isValidating: boolean;
  error: string | null;
}

export interface UseAvailableTablesOptions {
  churchId: number;
  enabled?: boolean;
}

export interface UseAvailableTablesReturn {
  tables: Array<{
    tableName: string;
    displayName: string;
    tableType: string;
    fieldCount: number;
    hasCertificate: boolean;
  }>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Main hook for unified records management
 */
export const useUnifiedRecords = ({
  churchId,
  tableName,
  agGridConfigName = 'default',
  filters = {},
  enabled = true,
  refetchInterval
}: UseUnifiedRecordsOptions): UseUnifiedRecordsReturn => {
  const [currentFilters, setCurrentFilters] = useState<RecordFilters>(filters);
  const queryClient = useQueryClient();

  // Get unified configuration
  const {
    data: config,
    isLoading: configLoading,
    error: configError,
    refetch: refetchConfig
  } = useQuery({
    queryKey: ['unifiedConfig', churchId, tableName, agGridConfigName],
    queryFn: () => unifiedRecordsApiService.getUnifiedConfig(churchId, tableName, agGridConfigName),
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3
  });

  // Get records with current filters
  const {
    data: recordsResponse,
    isLoading: recordsLoading,
    error: recordsError,
    refetch: refetchRecords
  } = useQuery({
    queryKey: ['unifiedRecords', churchId, tableName, currentFilters],
    queryFn: () => unifiedRecordsApiService.getRecords(churchId, tableName, currentFilters),
    enabled: enabled && !!churchId && !!tableName,
    refetchInterval,
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 3
  });

  // Grid state management
  const {
    saveState: saveGridState,
    loadState: loadGridState,
    isSaving: isSavingState,
    isLoading: isLoadingState
  } = useAgGridConfig({
    churchId,
    tableName,
    configName: agGridConfigName,
    enabled: enabled && !!churchId && !!tableName
  });

  // Memoized values
  const records = useMemo(() => recordsResponse?.records, [recordsResponse]);
  const pagination = useMemo(() => recordsResponse?.pagination, [recordsResponse]);
  const schema = useMemo(() => recordsResponse?.schema || config?.schema, [recordsResponse, config]);
  
  const loading = configLoading || recordsLoading;
  const error = configError?.message || recordsError?.message || null;

  // Action handlers
  const setFilters = useCallback((newFilters: RecordFilters) => {
    setCurrentFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const setSort = useCallback((sort: { field: string; direction: 'asc' | 'desc' }) => {
    setCurrentFilters(prev => ({ ...prev, sort }));
  }, []);

  const setPagination = useCallback((pagination: { page: number; limit: number }) => {
    setCurrentFilters(prev => ({ ...prev, pagination }));
  }, []);

  const refetch = useCallback(() => {
    refetchConfig();
    refetchRecords();
  }, [refetchConfig, refetchRecords]);

  return {
    // Data
    records,
    pagination,
    schema,
    config,
    
    // Loading states
    loading,
    recordsLoading,
    configLoading,
    error,
    
    // Actions
    refetch,
    refetchRecords,
    refetchConfig,
    setFilters,
    setSort,
    setPagination,
    
    // Grid state management
    saveGridState,
    loadGridState,
    isSavingState,
    isLoadingState
  };
};

/**
 * Hook for record mutations (create, update, delete, validate)
 */
export const useUnifiedRecordMutations = ({
  churchId,
  tableName,
  onSuccess,
  onError
}: UseUnifiedRecordMutationsOptions): UseUnifiedRecordMutationsReturn => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: RecordData) =>
      unifiedRecordsApiService.createRecord(churchId, tableName, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['unifiedRecords', churchId, tableName] });
      onSuccess?.(data);
    },
    onError: (error) => {
      onError?.(error);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: RecordData }) =>
      unifiedRecordsApiService.updateRecord(churchId, tableName, id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['unifiedRecords', churchId, tableName] });
      onSuccess?.(data);
    },
    onError: (error) => {
      onError?.(error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) =>
      unifiedRecordsApiService.deleteRecord(churchId, tableName, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifiedRecords', churchId, tableName] });
    },
    onError: (error) => {
      onError?.(error);
    }
  });

  const validateMutation = useMutation({
    mutationFn: (data: RecordData) =>
      unifiedRecordsApiService.validateRecord(churchId, tableName, data),
    onError: (error) => {
      onError?.(error);
    }
  });

  return {
    createRecord: createMutation.mutateAsync,
    updateRecord: (id: string | number, data: RecordData) =>
      updateMutation.mutateAsync({ id, data }),
    deleteRecord: deleteMutation.mutateAsync,
    validateRecord: validateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isValidating: validateMutation.isPending,
    error: createMutation.error?.message || updateMutation.error?.message || deleteMutation.error?.message || validateMutation.error?.message || null
  };
};

/**
 * Hook to get available tables for a church
 */
export const useAvailableTables = ({
  churchId,
  enabled = true
}: UseAvailableTablesOptions): UseAvailableTablesReturn => {
  const {
    data: tables = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['availableTables', churchId],
    queryFn: () => unifiedRecordsApiService.getAvailableTables(churchId),
    enabled: enabled && !!churchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3
  });

  return {
    tables,
    loading,
    error: error?.message || null,
    refetch
  };
};

/**
 * Hook to get table schema
 */
export const useTableSchema = (
  churchId: number,
  tableName: string,
  enabled: boolean = true
) => {
  const {
    data: schema,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['tableSchema', churchId, tableName],
    queryFn: () => unifiedRecordsApiService.getTableSchema(churchId, tableName),
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3
  });

  return {
    schema,
    loading,
    error: error?.message || null,
    refetch
  };
};

/**
 * Hook to get field definitions for a table
 */
export const useFieldDefinitions = (
  churchId: number,
  tableName: string,
  enabled: boolean = true
) => {
  const {
    data: fields = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['fieldDefinitions', churchId, tableName],
    queryFn: () => unifiedRecordsApiService.getFieldDefinitions(churchId, tableName),
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3
  });

  return {
    fields,
    loading,
    error: error?.message || null,
    refetch
  };
};

/**
 * Hook to get column definitions for AG Grid
 */
export const useColumnDefinitions = (
  churchId: number,
  tableName: string,
  configName: string = 'default',
  enabled: boolean = true
) => {
  const {
    data: columns = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['columnDefinitions', churchId, tableName, configName],
    queryFn: () => unifiedRecordsApiService.getColumnDefinitions(churchId, tableName, configName),
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3
  });

  return {
    columns,
    loading,
    error: error?.message || null,
    refetch
  };
};

/**
 * Hook to get searchable fields for a table
 */
export const useSearchableFields = (
  churchId: number,
  tableName: string,
  enabled: boolean = true
) => {
  const {
    data: fields = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['searchableFields', churchId, tableName],
    queryFn: () => unifiedRecordsApiService.getSearchableFields(churchId, tableName),
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3
  });

  return {
    fields,
    loading,
    error: error?.message || null,
    refetch
  };
};

/**
 * Hook to get sortable fields for a table
 */
export const useSortableFields = (
  churchId: number,
  tableName: string,
  enabled: boolean = true
) => {
  const {
    data: fields = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['sortableFields', churchId, tableName],
    queryFn: () => unifiedRecordsApiService.getSortableFields(churchId, tableName),
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3
  });

  return {
    fields,
    loading,
    error: error?.message || null,
    refetch
  };
};

/**
 * Hook to get required fields for a table
 */
export const useRequiredFields = (
  churchId: number,
  tableName: string,
  enabled: boolean = true
) => {
  const {
    data: fields = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['requiredFields', churchId, tableName],
    queryFn: () => unifiedRecordsApiService.getRequiredFields(churchId, tableName),
    enabled: enabled && !!churchId && !!tableName,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3
  });

  return {
    fields,
    loading,
    error: error?.message || null,
    refetch
  };
};

/**
 * Hook to get dropdown options for a field
 */
export const useDropdownOptions = (
  churchId: number,
  tableName: string,
  fieldName: string,
  enabled: boolean = true
) => {
  const {
    data: options = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['dropdownOptions', churchId, tableName, fieldName],
    queryFn: () => unifiedRecordsApiService.getDropdownOptions(churchId, tableName, fieldName),
    enabled: enabled && !!churchId && !!tableName && !!fieldName,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3
  });

  return {
    options,
    loading,
    error: error?.message || null,
    refetch
  };
};
