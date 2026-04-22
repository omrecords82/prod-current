import React from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Grid,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Computer as ComputerIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  RemoveRedEye as ViewIcon,
} from '@mui/icons-material';
import { getStatusColor, parseTasksJson, formatDate } from './helpers';

interface HistoryFilters {
  email: string;
  status: string;
  type: string;
  dateFrom: string;
  dateTo: string;
}

interface HistoryDialogProps {
  open: boolean;
  onClose: () => void;
  historyData: any[];
  historyLoading: boolean;
  historyPage: number;
  historyRowsPerPage: number;
  historyFilters: HistoryFilters;
  onRefresh: () => void;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFilterChange: (filter: string, value: string) => void;
}

const HistoryDialog: React.FC<HistoryDialogProps> = ({
  open,
  onClose,
  historyData,
  historyLoading,
  historyPage,
  historyRowsPerPage,
  historyFilters,
  onRefresh,
  onPageChange,
  onRowsPerPageChange,
  onFilterChange,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
    <DialogTitle>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="h6">Task Assignment History</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          disabled={historyLoading}
        >
          Refresh
        </Button>
      </Box>
    </DialogTitle>
    <DialogContent>
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }} variant="outlined">
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="Email"
              value={historyFilters.email}
              onChange={(e) => onFilterChange('email', e.target.value)}
              placeholder="Filter by email..."
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={historyFilters.status}
                onChange={(e) => onFilterChange('status', e.target.value)}
                label="Status"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="processed">Processed</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={historyFilters.type}
                onChange={(e) => onFilterChange('type', e.target.value)}
                label="Type"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="email_link">Email Link</MenuItem>
                <MenuItem value="public_token">Public Token</MenuItem>
                <MenuItem value="internal">Internal</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="From Date"
              value={historyFilters.dateFrom}
              onChange={(e) => onFilterChange('dateFrom', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="To Date"
              value={historyFilters.dateTo}
              onChange={(e) => onFilterChange('dateTo', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* History Table */}
      {historyLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Tasks</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>IP Address</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historyData.map((submission) => {
                const tasks = parseTasksJson(submission.tasks_json);
                return (
                  <TableRow key={submission.id}>
                    <TableCell>{submission.email}</TableCell>
                    <TableCell>{tasks.length} tasks</TableCell>
                    <TableCell>{formatDate(submission.submitted_at)}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <ComputerIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2" fontFamily="monospace">
                          {submission.ip_address}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={submission.status}
                        color={getStatusColor(submission.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={submission.submission_type}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="View Details">
                          <IconButton size="small">
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download">
                          <IconButton size="small">
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={-1}
            rowsPerPage={historyRowsPerPage}
            page={historyPage}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
          />
        </TableContainer>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>
        Close
      </Button>
    </DialogActions>
  </Dialog>
);

export default HistoryDialog;
