/**
 * ReactBasicTable Component
 * 
 * Basic React Table using TanStack Table (React Table).
 * Demonstrates basic table functionality with React Table library.
 * 
 * Route: /react-tables/basic
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

// Sample data type
interface TableData {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

// Sample data
const sampleData: TableData[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Editor', status: 'Inactive' },
];

const columnHelper = createColumnHelper<TableData>();

const columns = [
  columnHelper.accessor('id', {
    header: () => 'ID',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('name', {
    header: () => 'Name',
    cell: (info) => (
      <Typography variant="body1" fontWeight={600}>
        {info.getValue()}
      </Typography>
    ),
  }),
  columnHelper.accessor('email', {
    header: () => 'Email',
    cell: (info) => (
      <Typography variant="body2" color="text.secondary">
        {info.getValue()}
      </Typography>
    ),
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

const ReactBasicTable: React.FC = () => {
  const [data] = React.useState<TableData[]>(() => [...sampleData]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          React Basic Table
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Basic table implementation using TanStack Table (React Table) library.
        </Typography>

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

export default ReactBasicTable;
