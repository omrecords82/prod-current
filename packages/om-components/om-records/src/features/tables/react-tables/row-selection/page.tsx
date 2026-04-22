/**
 * ReactRowSelectionTable Component
 * 
 * React Table with row selection.
 * Allows selecting one or multiple rows with checkboxes.
 * 
 * Route: /react-tables/row-selection
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
  Checkbox,
  Chip,
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
}

const sampleData: TableData[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Editor' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'User' },
];

const columnHelper = createColumnHelper<TableData>();

const ReactRowSelectionTable: React.FC = () => {
  const [data] = React.useState<TableData[]>(() => [...sampleData]);
  const [rowSelection, setRowSelection] = useState({});

  const columns = [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    }),
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
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Row Selection Table
            </Typography>
            <Typography variant="body2" color="text.secondary">
              React Table with row selection using checkboxes.
            </Typography>
          </Box>
          {selectedCount > 0 && (
            <Chip
              label={`${selectedCount} selected`}
              color="primary"
            />
          )}
        </Box>

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
                <TableRow
                  key={row.id}
                  selected={row.getIsSelected()}
                  sx={{
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                    },
                  }}
                >
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

export default ReactRowSelectionTable;
