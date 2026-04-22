/**
 * ReactStickyTable Component
 * 
 * React Table with sticky header.
 * Shows a table with a sticky header that remains visible while scrolling.
 * 
 * Route: /react-tables/sticky
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
} from '@mui/material';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

interface TableData {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
}

// Generate more data for scrolling demonstration
const generateData = (count: number): TableData[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: i % 3 === 0 ? 'Admin' : i % 2 === 0 ? 'Editor' : 'User',
    department: ['IT', 'HR', 'Finance', 'Operations'][i % 4],
  }));
};

const columnHelper = createColumnHelper<TableData>();

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
  columnHelper.accessor('department', {
    header: () => 'Department',
    cell: (info) => info.getValue(),
  }),
];

const ReactStickyTable: React.FC = () => {
  const [data] = React.useState<TableData[]>(() => generateData(30));

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Sticky Header Table
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          React Table with a sticky header that remains visible while scrolling through data.
        </Typography>

        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader sx={{ whiteSpace: 'nowrap' }}>
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableCell key={header.id} sx={{ bgcolor: 'background.paper' }}>
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

export default ReactStickyTable;
