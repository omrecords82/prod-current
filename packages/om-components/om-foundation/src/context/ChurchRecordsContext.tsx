import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { apiClient } from '@/api/utils/axiosInstance';

export interface ChurchRecord {
  id: string;
  type: 'baptism' | 'marriage' | 'funeral' | 'membership' | 'clergy' | 'donation';
  recordNumber: string;
  fullName: string;
  displayName: string;
  date: string;
  parish: string;
  clergy: string;
  language: 'english' | 'greek' | 'arabic' | 'slavonic';
  status: 'complete' | 'needs_review' | 'pending' | 'archived';
  metadata: {
    // Baptism specific
    godparents?: string[];
    birthDate?: string;
    birthPlace?: string;
    parents?: string[];
    
    // Marriage specific
    brideName?: string;
    groomName?: string;
    witnesses?: string[];
    marriagePlace?: string;
    
    // Funeral specific
    deceaseDate?: string;
    burialDate?: string;
    cemetery?: string;
    cause?: string;
    
    // Common
    notes?: string;
    attachments?: string[];
    certificate?: {
      issued: boolean;
      issuedDate?: string;
      issuedBy?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface RecordFilter {
  type: string[];
  status: string[];
  dateRange: {
    start: string | null;
    end: string | null;
  };
  parish: string[];
  clergy: string[];
  language: string[];
  searchTerm: string;
  sortBy: 'date' | 'fullName' | 'type' | 'status' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

interface ChurchRecordsContextType {
  records: ChurchRecord[];
  filteredRecords: ChurchRecord[];
  availableParishes: string[];
  availableClergy: string[];
  filters: RecordFilter;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    rowsPerPage: number;
    totalCount: number;
  };
  updateFilters: (newFilters: Partial<RecordFilter>) => void;
  clearFilters: () => void;
  refreshRecords: () => void;
  setPagination: (pagination: Partial<{ page: number; rowsPerPage: number }>) => void;
  getRecordById: (id: string) => ChurchRecord | undefined;
  exportRecords: (recordIds: string[], format: 'pdf' | 'excel' | 'csv') => void;
  generateCertificate: (recordId: string) => void;
}

const defaultFilters: RecordFilter = {
  type: [],
  status: [],
  dateRange: { start: null, end: null },
  parish: [],
  clergy: [],
  language: [],
  searchTerm: '',
  sortBy: 'date',
  sortOrder: 'desc'
};

const ChurchRecordsContext = createContext<ChurchRecordsContextType | null>(null);

export const useChurchRecords = () => {
  const context = useContext(ChurchRecordsContext);
  if (!context) {
    throw new Error('useChurchRecords must be used within a ChurchRecordsProvider');
  }
  return context;
};

export const ChurchRecordsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<ChurchRecord[]>([]);
  const [availableParishes, setAvailableParishes] = useState<string[]>([]);
  const [availableClergy, setAvailableClergy] = useState<string[]>([]);
  const [filters, setFilters] = useState<RecordFilter>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPaginationState] = useState({
    page: 0,
    rowsPerPage: 25,
    totalCount: 0
  });

  // Load records from API using Legacy Records approach
  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Loading records using Legacy Records approach...');

      // Get list of churches first (like Legacy Records does)
      const churchesData = await apiClient.get<any>('/admin/churches?is_active=1');
      const churches = churchesData.churches || [];
      
      if (churches.length === 0) {
        setRecords([]);
        setPaginationState(prev => ({ ...prev, totalCount: 0 }));
        return;
      }

      // Collect all records from all types using existing endpoints
      let allRecords: ChurchRecord[] = [];
      let availableParishes = new Set<string>();
      let availableClergy = new Set<string>();

      // Define the types to fetch
      const typesToFetch = filters.type.length > 0 ? filters.type : ['baptism', 'marriage', 'funeral'];

      // Fetch each record type using existing endpoints (like Legacy Records)
      for (const recordType of typesToFetch) {
        try {
          let endpoint = '';
          switch (recordType) {
            case 'baptism':
              endpoint = '/baptism-records';
              break;
            case 'marriage':
              endpoint = '/marriage-records';
              break;
            case 'funeral':
              endpoint = '/funeral-records';
              break;
            default:
              continue;
          }

          const params = new URLSearchParams();
          params.append('limit', '1000'); // Get all records
          if (filters.searchTerm) {
            params.append('search', filters.searchTerm);
          }

          const recordsData = await apiClient.get<any>(`${endpoint}?${params.toString()}`);
          const records = recordsData.records || [];

          // Transform records to unified format
          const transformedRecords = records.map((record: any) => {
            // Find church name
            const church = churches.find((c: any) => c.id === record.church_id);
            const churchName = church?.name || 'Unknown Church';

            let fullName = '';
            let date = '';
            
            if (recordType === 'baptism') {
              fullName = `${record.first_name || ''} ${record.last_name || ''}`.trim();
              date = record.reception_date || record.created_at;
            } else if (recordType === 'marriage') {
              const groom = `${record.fname_groom || ''} ${record.lname_groom || ''}`.trim();
              const bride = `${record.fname_bride || ''} ${record.lname_bride || ''}`.trim();
              fullName = `${groom} & ${bride}`;
              date = record.mdate || record.created_at;
            } else if (recordType === 'funeral') {
              fullName = `${record.name || ''} ${record.lastname || ''}`.trim();
              date = record.burial_date || record.deceased_date || record.created_at;
            }

            const transformedRecord: ChurchRecord = {
              id: `${recordType}_${record.church_id || 0}_${record.id}`,
              fullName: fullName || 'Unknown',
              displayName: fullName || 'Unknown',
              type: recordType as 'baptism' | 'marriage' | 'funeral',
              date: date || new Date().toISOString(),
              parish: churchName,
              clergy: record.clergy || 'Unknown',
              status: 'complete' as const,
              recordNumber: `${recordType.charAt(0).toUpperCase()}-${record.church_id || 0}-${record.id}`,
              language: 'english' as const,
              createdAt: record.created_at || new Date().toISOString(),
              updatedAt: record.updated_at || new Date().toISOString(),
              createdBy: record.clergy || 'Unknown',
              metadata: {
                notes: record.notes || undefined,
                // Add record type specific metadata
                ...(recordType === 'baptism' && {
                  birthDate: record.birth_date,
                  birthPlace: record.birthplace,
                  parents: record.parents ? [record.parents] : undefined,
                  godparents: record.sponsors ? [record.sponsors] : undefined
                }),
                ...(recordType === 'marriage' && {
                  groomName: `${record.fname_groom || ''} ${record.lname_groom || ''}`.trim() || undefined,
                  brideName: `${record.fname_bride || ''} ${record.lname_bride || ''}`.trim() || undefined,
                  witnesses: record.witness ? [record.witness] : undefined,
                  marriagePlace: record.location || undefined
                }),
                ...(recordType === 'funeral' && {
                  deceaseDate: record.deceased_date,
                  burialDate: record.burial_date,
                  cemetery: record.burial_location
                })
              }
            };

            // Collect filter options
            availableParishes.add(churchName);
            availableClergy.add(record.clergy || 'Unknown');

            return transformedRecord;
          });

          allRecords = allRecords.concat(transformedRecords);
        } catch (recordError) {
          console.warn(`⚠️ Error fetching ${recordType} records:`, recordError);
          // Continue with other record types
        }
      }

      // Apply additional filters
      let filteredRecords = allRecords;

      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredRecords = filteredRecords.filter(record => 
          record.fullName.toLowerCase().includes(searchLower) ||
          record.recordNumber.toLowerCase().includes(searchLower) ||
          record.parish.toLowerCase().includes(searchLower) ||
          record.clergy.toLowerCase().includes(searchLower)
        );
      }

      // Parish filter
      if (filters.parish.length > 0) {
        filteredRecords = filteredRecords.filter(record => 
          filters.parish.includes(record.parish)
        );
      }

      // Clergy filter
      if (filters.clergy.length > 0) {
        filteredRecords = filteredRecords.filter(record => 
          filters.clergy.includes(record.clergy)
        );
      }

      // Status filter
      if (filters.status.length > 0) {
        filteredRecords = filteredRecords.filter(record => 
          filters.status.includes(record.status)
        );
      }

      // Date range filter
      if (filters.dateRange.start || filters.dateRange.end) {
        filteredRecords = filteredRecords.filter(record => {
          const recordDate = new Date(record.date);
          if (filters.dateRange.start && recordDate < new Date(filters.dateRange.start)) return false;
          if (filters.dateRange.end && recordDate > new Date(filters.dateRange.end)) return false;
          return true;
        });
      }

      // Sort records
      filteredRecords.sort((a, b) => {
        let valueA: any, valueB: any;
        
        if (filters.sortBy === 'date') {
          valueA = new Date(a.date);
          valueB = new Date(b.date);
        } else {
          valueA = a[filters.sortBy as keyof ChurchRecord] || '';
          valueB = b[filters.sortBy as keyof ChurchRecord] || '';
        }
        
        if (filters.sortOrder === 'desc') {
          return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
        } else {
          return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        }
      });

      // Apply pagination
      const totalCount = filteredRecords.length;
      const offset = pagination.page * pagination.rowsPerPage;
      const paginatedRecords = filteredRecords.slice(offset, offset + pagination.rowsPerPage);

      console.log(`✅ Found ${totalCount} records, showing ${paginatedRecords.length} for page ${pagination.page}`);

      setRecords(paginatedRecords);
      setPaginationState(prev => ({ ...prev, totalCount }));
      setAvailableParishes(Array.from(availableParishes).sort());
      setAvailableClergy(Array.from(availableClergy).sort());

    } catch (err) {
      console.error('Error loading records:', err);
      setError(err instanceof Error ? err.message : 'Failed to load records');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.rowsPerPage]);

  // Load records when component mounts or dependencies change
  useEffect(() => {
    // Don't automatically load records on app startup
    // Records will be loaded when refreshRecords() is called explicitly
    // loadRecords();
  }, [loadRecords]);

  // Add a flag to track if records have been loaded
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Modified refresh function that loads on first call
  const refreshRecords = () => {
    setHasLoadedOnce(true);
    loadRecords();
  };

  // Initialize with empty state instead of loading
  useEffect(() => {
    console.log('📋 ChurchRecordsProvider initialized (records will load on demand)');
    setLoading(false); // Set loading to false since we're not loading automatically
  }, []);

  // Filter records client-side for immediate feedback
  const filteredRecords = React.useMemo(() => {
    let filtered = [...records];

    // Apply filters
    if (filters.type.length > 0) {
      filtered = filtered.filter(record => filters.type.includes(record.type));
    }
    
    if (filters.status.length > 0) {
      filtered = filtered.filter(record => filters.status.includes(record.status));
    }
    
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(record => 
        record.fullName.toLowerCase().includes(searchLower) ||
        record.recordNumber.toLowerCase().includes(searchLower) ||
        record.parish.toLowerCase().includes(searchLower) ||
        record.clergy.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[filters.sortBy];
      const bValue = b[filters.sortBy];
      const modifier = filters.sortOrder === 'asc' ? 1 : -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * modifier;
      }
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return (aValue.getTime() - bValue.getTime()) * modifier;
      }
      
      return (aValue > bValue ? 1 : -1) * modifier;
    });

    return filtered;
  }, [records, filters]);

  const updateFilters = (newFilters: Partial<RecordFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    // Reset to first page when filters change
    setPaginationState(prev => ({ ...prev, page: 0 }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setPaginationState(prev => ({ ...prev, page: 0 }));
  };

  const setPagination = (newPagination: Partial<{ page: number; rowsPerPage: number }>) => {
    setPaginationState(prev => ({ ...prev, ...newPagination }));
  };

  const getRecordById = (id: string) => {
    return records.find(record => record.id === id);
  };

  const exportRecords = async (recordIds: string[], format: 'pdf' | 'excel' | 'csv') => {
    try {
      const blob = await apiClient.post<Blob>('/records/export', { recordIds, format }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `church_records_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export records');
    }
  };

  const generateCertificate = async (recordId: string) => {
    try {
      const blob = await apiClient.post<Blob>(`/records/${recordId}/certificate`, undefined, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate_${recordId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Refresh records to update certificate status
      refreshRecords();
    } catch (error) {
      console.error('Certificate generation error:', error);
      setError('Failed to generate certificate');
    }
  };

  return (
    <ChurchRecordsContext.Provider
      value={{
        records,
        filteredRecords,
        availableParishes,
        availableClergy,
        filters,
        loading,
        error,
        pagination,
        updateFilters,
        clearFilters,
        refreshRecords,
        setPagination,
        getRecordById,
        exportRecords,
        generateCertificate
      }}
    >
      {children}
    </ChurchRecordsContext.Provider>
  );
}; 