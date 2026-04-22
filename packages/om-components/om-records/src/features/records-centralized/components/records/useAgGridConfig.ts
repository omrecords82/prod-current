// useAgGridConfig hook for records-centralized features
// Placeholder implementation

import { useMemo } from 'react';

export const useAgGridConfig = (options: any = {}) => {
  return useMemo(() => ({
    defaultColDef: {
      flex: 1,
      minWidth: 100,
      resizable: true,
      sortable: true,
      filter: true,
    },
    columnDefs: [],
    rowData: [],
    pagination: true,
    paginationPageSize: 20,
    ...options
  }), [options]);
};
