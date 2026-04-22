/**
 * useRecordsFetch.ts — Data fetching functions for RecordsPage.
 */
import { apiClient } from '@/api/utils/axiosInstance';
import churchService, { Church } from '@/shared/lib/churchService';
import LookupService from '@/shared/lib/lookupService';
import { RECORD_TYPE_CONFIGS, DEFAULT_DATE_SORT_FIELD } from './utils';

interface FetchRecordsParams {
  recordType: string;
  churchId?: number;
  search?: string;
  serverPage?: number;
  serverLimit?: number;
  sortField?: string;
  sortDir?: string;
}

interface FetchCallbacks {
  setRecords: (records: any[]) => void;
  setTotalRecords: (total: number) => void;
  setLoading: (v: boolean) => void;
  setSearchLoading: (v: boolean) => void;
  setError: (err: string | null) => void;
  setChurches: (churches: Church[]) => void;
  setPriestOptions: (opts: string[]) => void;
  showToast: (msg: string, severity: 'success' | 'error' | 'info') => void;
  t: (key: string) => string;
  page: number;
  rowsPerPage: number;
  searchTerm: string;
  sortConfig: { key: string; direction: string };
}

export async function fetchChurches(cb: Pick<FetchCallbacks, 'setLoading' | 'setChurches' | 'setError' | 'showToast'>) {
  try {
    cb.setLoading(true);
    const churchData = await churchService.fetchChurches({ includeRecordCounts: true });

    const allChurchesOption: Church = {
      id: 0,
      church_name: 'All Churches',
      email: '',
      is_active: true,
      has_baptism_records: true,
      has_marriage_records: true,
      has_funeral_records: true,
      setup_complete: true,
      created_at: '',
      updated_at: '',
    };

    cb.setChurches([allChurchesOption, ...churchData]);
  } catch (err) {
    console.error('Error fetching churches:', err);
    cb.setError('Failed to fetch churches');
    cb.showToast('Failed to load churches', 'error');
  } finally {
    cb.setLoading(false);
  }
}

export async function fetchRecords(
  params: FetchRecordsParams,
  cb: FetchCallbacks,
) {
  const { recordType, churchId, search, serverPage, serverLimit, sortField, sortDir } = params;
  if (!recordType) return;

  const isSearchFetch = search !== undefined && search !== '';

  try {
    if (isSearchFetch) cb.setSearchLoading(true); else cb.setLoading(true);
    cb.setError(null);

    const selectedType = RECORD_TYPE_CONFIGS.find(type => type.value === recordType);
    if (!selectedType) throw new Error('Invalid record type selected');

    const querySearch = search !== undefined ? search : cb.searchTerm;
    const requestPage = (serverPage ?? cb.page) + 1;
    const requestLimit = serverLimit ?? cb.rowsPerPage;
    const activeSortField = sortField ?? cb.sortConfig.key;
    const activeSortDir = sortDir ?? cb.sortConfig.direction;

    let recordData;
    if (churchId && churchId !== 0) {
      recordData = await churchService.fetchChurchRecords(churchId, selectedType.apiEndpoint, {
        page: requestPage,
        limit: requestLimit,
        search: querySearch,
        sortField: activeSortField,
        sortDirection: activeSortDir,
      });
    } else {
      const data = await apiClient.get<any>(`/${selectedType.apiEndpoint}-records?page=${requestPage}&limit=${requestLimit}&search=${encodeURIComponent(querySearch || '')}&sortField=${encodeURIComponent(activeSortField)}&sortDirection=${encodeURIComponent(activeSortDir)}`);

      if (data && data.records) {
        recordData = {
          records: data.records,
          totalRecords: data.totalRecords || data.pagination?.total || data.records.length,
          currentPage: data.currentPage || data.pagination?.page || requestPage,
          totalPages: data.totalPages || data.pagination?.pages || 1,
        };
      } else {
        throw new Error('Failed to fetch records from API');
      }
    }

    cb.setRecords(recordData.records || []);
    const total = recordData.totalRecords || recordData.records?.length || 0;
    cb.setTotalRecords(total);

    if (isSearchFetch) {
      cb.showToast(`Found ${total} match${total !== 1 ? 'es' : ''} for "${search}" in ${cb.t(selectedType.labelKey)}`, 'success');
    } else {
      const displayCount = Math.min(requestLimit, total);
      cb.showToast(`Displaying ${displayCount} of ${total} ${cb.t(selectedType.labelKey).toLowerCase()}`, 'success');
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') console.error(`Error fetching ${recordType} records:`, err);
    cb.setError(err instanceof Error ? err.message : 'Failed to fetch records');
  } finally {
    cb.setLoading(false);
    cb.setSearchLoading(false);
  }
}

export async function fetchPriestOptions(
  recordType: string,
  selectedChurch: number | null,
  setPriestOptions: (opts: string[]) => void,
) {
  if (!selectedChurch) {
    setPriestOptions([]);
    return;
  }
  try {
    const response = await LookupService.getClergy({ churchId: selectedChurch, recordType });
    const validPriests = response.items
      .map(item => item.value)
      .filter((name: string) => name && name.trim() !== '');
    setPriestOptions(validPriests);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') console.error('Error fetching priest options:', err);
    setPriestOptions([]);
  }
}
