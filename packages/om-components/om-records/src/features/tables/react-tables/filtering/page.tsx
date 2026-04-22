/**
 * ReactFilterTable Component
 * 
 * React Table with filtering functionality.
 * Allows filtering table data by column values.
 * 
 * Route: /react-tables/filter
 */

import React, { useState } from 'react';
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
  TextField,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
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

const ReactFilterTable: React.FC = () => {
  const [data] = React.useState<TableData[]>(() => [...sampleData]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = [
    columnHelper.accessor('id', {
      header: () => 'ID',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('name', {
      header: () => 'Name',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('email', {
      header: () => 'Email',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('role', {
      header: () => 'Role',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('status', {
      header: () => 'Status',
      cell: (info) => info.getValue(),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Filter Table
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          React Table with global filtering functionality.
        </Typography>

        <TextField
          fullWidth
          label="Search"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        <TableContainer>
          <Table sx={{ whiteSpace: 'nowrap' }}>
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableCell key={header.id}>
                      <Typography variant="h6">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </Typography>
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

export default ReactFilterTable;
