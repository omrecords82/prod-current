/**
 * ReactExpandingTable Component
 * 
 * React Table with expandable rows.
 * Allows rows to be expanded to show additional details.
 * 
 * Route: /react-tables/expanding
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
  IconButton,
  Collapse,
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
} from '@mui/icons-material';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getExpandedRowModel,
} from '@tanstack/react-table';

interface TableData {
  id: number;
  name: string;
  email: string;
  role: string;
  details?: string;
}

const sampleData: TableData[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', details: 'Administrator with full access' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', details: 'Standard user account' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Editor', details: 'Content editor with editing permissions' },
];

const columnHelper = createColumnHelper<TableData>();

const ReactExpandingTable: React.FC = () => {
  const [data] = React.useState<TableData[]>(() => [...sampleData]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (rowId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  const columns = [
    columnHelper.display({
      id: 'expand',
      header: () => '',
      cell: ({ row }) => (
        <IconButton
          size="small"
          onClick={() => toggleRow(row.original.id)}
        >
          {expandedRows.has(row.original.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
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
  });

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Expanding Table
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          React Table with expandable rows to show additional details.
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
                <React.Fragment key={row.id}>
                  <TableRow>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedRows.has(row.original.id) && (
                    <TableRow>
                      <TableCell colSpan={columns.length} sx={{ py: 2 }}>
                        <Box sx={{ pl: 4 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Additional Details
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {row.original.details || 'No additional details available'}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ReactExpandingTable;
