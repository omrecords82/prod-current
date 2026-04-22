/**
 * ReactColumnVisibilityTable Component
 * 
 * React Table with column visibility controls.
 * Allows users to show/hide columns dynamically.
 * 
 * Route: /react-tables/column-visiblity
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
  FormGroup,
  FormControlLabel,
  Checkbox,
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

const sampleData: TableData[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', department: 'IT' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', department: 'HR' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Editor', department: 'Marketing' },
];

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

const ReactColumnVisibilityTable: React.FC = () => {
  const [data] = React.useState<TableData[]>(() => [...sampleData]);
  const [columnVisibility, setColumnVisibility] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
  });

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Column Visibility Table
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          React Table with column visibility controls. Toggle columns to show/hide them.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Toggle Columns
          </Typography>
          <FormGroup row>
            {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => (
              <FormControlLabel
                key={column.id}
                control={
                  <Checkbox
                    checked={column.getIsVisible()}
                    onChange={(e) => column.toggleVisibility(e.target.checked)}
                  />
                }
                label={column.id}
              />
            ))}
          </FormGroup>
        </Box>

        <TableContainer>
          <Table>
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

export default ReactColumnVisibilityTable;
