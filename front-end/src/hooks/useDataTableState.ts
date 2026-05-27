/**
 * useDataTableState — Generic, type-safe hook for data-table search,
 * pagination, and optional sort state.
 *
 * Eliminates the repeated useState / offset-calculation / page-reset
 * boilerplate duplicated across ActivityLogsTab, SessionsTab, LogSearch,
 * OcrActivityMonitor, ComponentManager, etc.
 *
 * Usage (server-side pagination):
 *   const table = useDataTableState<MyRow>({ pageSize: 25 });
 *   // use table.searchTerm, table.page, table.offset in your fetch call
 *   // after fetch: table.setTotalPages(response.pages)
 *
 * Usage (client-side filtering):
 *   const table = useDataTableState<MyRow>({
 *     pageSize: 20,
 *     data: allRows,
 *     filterFn: (row, q) => row.name.toLowerCase().includes(q),
 *   });
 *   // render table.paginatedData directly
 */

import { useState, useMemo, useCallback } from 'react';

// ── Options ─────────────────────────────────────────────────────────────────

export interface DataTableStateOptions<T> {
  /** Items per page. Default: 25. */
  pageSize?: number;
  /** Initial sort field (empty string = no sort). */
  initialSortField?: string;
  /** Initial sort direction. Default: 'DESC'. */
  initialSortDir?: 'ASC' | 'DESC';
  /** For client-side filtering: the full dataset. */
  data?: T[];
  /** For client-side filtering: return true to keep the item. */
  filterFn?: (item: T, searchTerm: string) => boolean;
}

// ── Return type ─────────────────────────────────────────────────────────────

export interface DataTableState<T> {
  // Search
  searchTerm: string;
  setSearchTerm: (term: string) => void;

  // Pagination
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  totalPages: number;
  /** For server-side pagination — call after receiving total from API. */
  setTotalPages: (n: number) => void;
  /** Convenience: `(page - 1) * pageSize` for API offset params. */
  offset: number;
  /** Resets page to 1 (call when filters change). */
  resetPage: () => void;

  // Loading
  loading: boolean;
  setLoading: (v: boolean) => void;

  // Sort
  sortField: string;
  sortDir: 'ASC' | 'DESC';
  /** Toggle sort on a field — flips direction if same field, else resets to DESC. */
  toggleSort: (field: string) => void;

  // Client-side derived data (only populated when `data` + `filterFn` are supplied)
  /** All items that pass the search filter. */
  filteredData: T[];
  /** The page-sliced subset of filteredData. */
  paginatedData: T[];
  /** Total filtered count (useful for "N results" labels). */
  filteredCount: number;
}

// ── Hook ────────────────────────────────────────────────────────────────────

function useDataTableState<T = unknown>(
  options: DataTableStateOptions<T> = {},
): DataTableState<T> {
  const {
    pageSize = 25,
    initialSortField = '',
    initialSortDir = 'DESC',
    data,
    filterFn,
  } = options;

  // ── Core state ──────────────────────────────────────────────────────────
  const [searchTerm, setSearchTermRaw] = useState('');
  const [page, setPageRaw] = useState(1);
  const [totalPagesServer, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState(initialSortField);
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>(initialSortDir);

  // ── Derived ─────────────────────────────────────────────────────────────
  const offset = (page - 1) * pageSize;

  const resetPage = useCallback(() => setPageRaw(1), []);

  const setSearchTerm = useCallback(
    (term: string) => {
      setSearchTermRaw(term);
      setPageRaw(1);
    },
    [],
  );

  const setPage = useCallback((p: number) => setPageRaw(p), []);

  const toggleSort = useCallback(
    (field: string) => {
      setSortField((prev) => {
        if (prev === field) {
          setSortDir((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
        } else {
          setSortDir('DESC');
        }
        return field;
      });
      setPageRaw(1);
    },
    [],
  );

  // ── Client-side filtering & pagination ──────────────────────────────────
  const filteredData = useMemo(() => {
    if (!data) return [] as T[];
    if (!filterFn || !searchTerm.trim()) return data;
    const q = searchTerm.toLowerCase();
    return data.filter((item) => filterFn(item, q));
  }, [data, filterFn, searchTerm]);

  const filteredCount = filteredData.length;

  const clientTotalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(filteredCount / pageSize)) : totalPagesServer),
    [data, filteredCount, pageSize, totalPagesServer],
  );

  const paginatedData = useMemo(() => {
    if (!data) return [] as T[];
    return filteredData.slice(offset, offset + pageSize);
  }, [data, filteredData, offset, pageSize]);

  // Use client total if data is provided, otherwise server total
  const totalPages = data ? clientTotalPages : totalPagesServer;

  return {
    searchTerm,
    setSearchTerm,
    page,
    setPage,
    pageSize,
    totalPages,
    setTotalPages,
    offset,
    resetPage,
    loading,
    setLoading,
    sortField,
    sortDir,
    toggleSort,
    filteredData,
    paginatedData,
    filteredCount,
  };
}

export default useDataTableState;
