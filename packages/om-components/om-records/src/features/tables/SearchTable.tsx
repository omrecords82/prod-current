/**
 * SearchTable Component
 * 
 * Table component with advanced search functionality.
 * Shows a table with search capabilities across multiple columns.
 * 
 * Route: /tables/search
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Chip,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

interface Data {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
}

const SearchTable: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const rows: Data[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', department: 'IT', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', department: 'HR', status: 'Active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Editor', department: 'Marketing', status: 'Inactive' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'User', department: 'Finance', status: 'Active' },
    { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', role: 'Admin', department: 'IT', status: 'Active' },
    { id: 6, name: 'Diana Prince', email: 'diana@example.com', role: 'Editor', department: 'Operations', status: 'Active' },
  ];

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) {
      return rows;
    }

    const searchLower = searchTerm.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchLower)
      )
    );
  }, [searchTerm]);

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const getStatusColor = (status: string) => {
    return status === 'Active' ? 'success' : 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Search Table
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          A table component with advanced search functionality across all columns.
        </Typography>

        <TextField
          fullWidth
          label="Search across all columns"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <ClearIcon
                  style={{ cursor: 'pointer' }}
                  onClick={handleClearSearch}
                />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
          placeholder="Type to search..."
        />

        {filteredRows.length === 0 ? (
          <Alert severity="info">
            No results found for "{searchTerm}". Try a different search term.
          </Alert>
        ) : (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {filteredRows.length} of {rows.length} results
                {searchTerm && ` for "${searchTerm}"`}
              </Typography>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.role}</TableCell>
                      <TableCell>{row.department}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.status}
                          color={getStatusColor(row.status) as any}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default SearchTable;
