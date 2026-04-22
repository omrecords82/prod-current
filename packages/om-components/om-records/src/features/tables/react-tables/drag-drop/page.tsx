/**
 * ReactDragDropTable Component
 * 
 * React Table with drag and drop functionality.
 * Allows reordering rows or columns via drag and drop.
 * 
 * Route: /react-tables/drag-drop
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
  Alert,
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
  order: number;
}

const sampleData: TableData[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', order: 1 },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', order: 2 },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Editor', order: 3 },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'User', order: 4 },
];

const columnHelper = createColumnHelper<TableData>();

const columns = [
  columnHelper.accessor('order', {
    header: () => 'Order',
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
];

const ReactDragDropTable: React.FC = () => {
  const [data, setData] = React.useState<TableData[]>(() => [...sampleData]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Drag & Drop Table
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          React Table with drag and drop functionality for reordering rows.
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          Drag and drop functionality requires additional libraries (e.g., @dnd-kit or react-beautiful-dnd).
          This is a placeholder implementation. Full drag-and-drop can be added later.
        </Alert>

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
                <TableRow key={row.id} sx={{ cursor: 'move' }}>
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

export default ReactDragDropTable;
