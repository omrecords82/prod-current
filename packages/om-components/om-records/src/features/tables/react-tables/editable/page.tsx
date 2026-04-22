/**
 * ReactEditableTable Component
 * 
 * React Table with editable cells.
 * Allows inline editing of table cells.
 * 
 * Route: /react-tables/editable
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
  IconButton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Check as CheckIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
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
];

const columnHelper = createColumnHelper<TableData>();

const ReactEditableTable: React.FC = () => {
  const [data, setData] = useState<TableData[]>(() => [...sampleData]);
  const [editingCell, setEditingCell] = useState<{ rowId: number; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleEdit = (rowId: number, columnId: string, currentValue: string) => {
    setEditingCell({ rowId, columnId });
    setEditValue(currentValue);
  };

  const handleSave = (rowId: number, columnId: string) => {
    setData((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, [columnId]: editValue } : row
      )
    );
    setEditingCell(null);
    setEditValue('');
  };

  const handleCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const columns = [
    columnHelper.accessor('id', {
      header: () => 'ID',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('name', {
      header: () => 'Name',
      cell: (info) => {
        const isEditing = editingCell?.rowId === info.row.original.id && editingCell?.columnId === 'name';
        return isEditing ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
            />
            <IconButton size="small" onClick={() => handleSave(info.row.original.id, 'name')}>
              <CheckIcon />
            </IconButton>
            <IconButton size="small" onClick={handleCancel}>
              <CancelIcon />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {info.getValue()}
            <IconButton
              size="small"
              onClick={() => handleEdit(info.row.original.id, 'name', info.getValue())}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Box>
        );
      },
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
          Editable Table
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          React Table with inline editing capabilities. Click the edit icon to modify cell values.
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

export default ReactEditableTable;
