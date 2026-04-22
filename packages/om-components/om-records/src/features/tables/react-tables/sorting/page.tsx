/**
 * ReactSortingTable Component
 * 
 * React Table with sorting functionality.
 * Allows sorting table columns by clicking on headers.
 * 
 * Route: /react-tables/sorting
 */

import React from 'react';
import {
  TableContainer,
  Table,
  TableRow,
  TableCell,
  TableBody,
  TableHead,
  Typography,
  Box,
  Paper,
  TableSortLabel,
} from '@mui/material';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
} from '@tanstack/react-table';

interface TableData {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

const sampleData: TableData[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Editor', status: 'Inactive' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'User', status: 'Active' },
];

const columnHelper = createColumnHelper<TableData>();

const ReactSortingTable: React.FC = () => {
  const [data] = React.useState<TableData[]>(() => [...sampleData]);

  const columns = [
    columnHelper.accessor('id', {
      header: () => 'ID',
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    columnHelper.accessor('name', {
      header: () => 'Name',
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    columnHelper.accessor('email', {
      header: () => 'Email',
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    columnHelper.accessor('role', {
      header: () => 'Role',
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
    columnHelper.accessor('status', {
      header: () => 'Status',
      cell: (info) => info.getValue(),
      enableSorting: true,
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Sorting Table
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          React Table with sortable columns. Click column headers to sort.
        </Typography>

        <TableContainer>
          <Table sx={{ whiteSpace: 'nowrap' }}>
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableCell key={header.id}>
                      {header.column.getCanSort() ? (
                        <TableSortLabel
                          active={header.column.getIsSorted() !== false}
                          direction={header.column.getIsSorted() === 'asc' ? 'asc' : 'desc'}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <Typography variant="h6">
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </Typography>
                        </TableSortLabel>
                      ) : (
                        <Typography variant="h6">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </Typography>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ReactSortingTable;
