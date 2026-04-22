/**
 * CollapsibleTable Component
 * 
 * Table component with collapsible rows.
 * Shows a table where rows can be expanded to show additional details.
 * 
 * Route: /tables/collapsible
 */

import React, { useState } from 'react';
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
  IconButton,
  Collapse,
  Chip,
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
} from '@mui/icons-material';

const CollapsibleTable: React.FC = () => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const rows = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Admin',
      details: {
        department: 'IT',
        phone: '555-0101',
        location: 'New York',
        joinDate: '2020-01-15',
      },
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'User',
      details: {
        department: 'HR',
        phone: '555-0102',
        location: 'Los Angeles',
        joinDate: '2021-03-20',
      },
    },
    {
      id: 3,
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'Editor',
      details: {
        department: 'Marketing',
        phone: '555-0103',
        location: 'Chicago',
        joinDate: '2019-11-10',
      },
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Collapsible Table
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          A table component with expandable rows to show additional details.
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow>
                    <TableCell>
                      <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => toggleRow(row.id)}
                      >
                        {expandedRows.has(row.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>
                      <Chip label={row.role} size="small" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                      <Collapse in={expandedRows.has(row.id)} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                          <Typography variant="h6" gutterBottom component="div">
                            Details
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Department
                              </Typography>
                              <Typography variant="body1">{row.details.department}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Phone
                              </Typography>
                              <Typography variant="body1">{row.details.phone}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Location
                              </Typography>
                              <Typography variant="body1">{row.details.location}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Join Date
                              </Typography>
                              <Typography variant="body1">{row.details.joinDate}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default CollapsibleTable;
