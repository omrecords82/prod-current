/**
 * Restore History Viewer Component
 * 
 * Displays audit log of all file restore operations.
 * Shows who restored what, when, and from which source.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  TablePagination
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { 
  History, 
  Download, 
  CheckCircle, 
  XCircle,
  User,
  Calendar,
  FileText,
  HardDrive,
  RefreshCw
} from '@/ui/icons';
import { RestoreHistoryEntry, RestoreHistoryStats } from '@/types/refactorConsole';
import refactorConsoleClient from '../api/refactorConsoleClient';

interface RestoreHistoryViewerProps {
  open: boolean;
  onClose: () => void;
}

const RestoreHistoryViewer: React.FC<RestoreHistoryViewerProps> = ({
  open,
  onClose
}) => {
  const theme = useTheme();
  const [entries, setEntries] = useState<RestoreHistoryEntry[]>([]);
  const [stats, setStats] = useState<RestoreHistoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (open) {
      loadHistory();
      loadStats();
    }
  }, [open, page, rowsPerPage]);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await refactorConsoleClient.getRestoreHistory(
        rowsPerPage,
        page * rowsPerPage
      );
      
      setEntries(result.entries);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to load restore history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await refactorConsoleClient.getRestoreHistoryStats();
      setStats(result.stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleExport = async () => {
    try {
      await refactorConsoleClient.exportRestoreHistory(1000);
    } catch (err) {
      console.error('Failed to export history:', err);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          bgcolor: 'background.paper'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History className="w-5 h-5" />
            <Typography variant="h6">Restore History</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Tooltip title="Export to CSV">
              <IconButton size="small" onClick={handleExport}>
                <Download className="w-4 h-4" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={() => { loadHistory(); loadStats(); }}>
                <RefreshCw className="w-4 h-4" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Statistics Cards */}
        {stats && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: 2, 
            mb: 3 
          }}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), border: 1, borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total Restores</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{stats.totalRestores}</Typography>
            </Paper>
            <Paper elevation={0} sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), border: 1, borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Successful</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>{stats.successfulRestores}</Typography>
            </Paper>
            <Paper elevation={0} sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), border: 1, borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Failed</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>{stats.failedRestores}</Typography>
            </Paper>
            <Paper elevation={0} sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.1), border: 1, borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Unique Files</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{stats.uniqueFiles}</Typography>
            </Paper>
            <Paper elevation={0} sx={{ p: 2, bgcolor: alpha(theme.palette.secondary.main, 0.1), border: 1, borderColor: 'divider' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Users</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>{stats.uniqueUsers}</Typography>
            </Paper>
          </Box>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* History Table */}
        {!isLoading && entries.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>Status</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>File Path</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Snapshot</TableCell>
                  <TableCell align="right">Size</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow 
                    key={entry.id}
                    hover
                    sx={{
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) }
                    }}
                  >
                    <TableCell>
                      {entry.success ? (
                        <Tooltip title="Success">
                          <CheckCircle className="w-4 h-4" style={{ color: theme.palette.success.main }} />
                        </Tooltip>
                      ) : (
                        <Tooltip title={entry.error || 'Failed'}>
                          <XCircle className="w-4 h-4" style={{ color: theme.palette.error.main }} />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Calendar className="w-3 h-3" style={{ color: theme.palette.text.secondary }} />
                        <Typography variant="caption">{formatDate(entry.timestamp)}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <User className="w-3 h-3" style={{ color: theme.palette.text.secondary }} />
                        <Typography variant="caption">
                          {entry.user || entry.userEmail || 'anonymous'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FileText className="w-3 h-3" style={{ color: theme.palette.text.secondary }} />
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontFamily: 'monospace',
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={entry.relPath}
                        >
                          {entry.relPath}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={entry.sourceType} 
                        size="small" 
                        color={entry.sourceType === 'remote' ? 'secondary' : 'default'}
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      {entry.snapshotId ? (
                        <Chip 
                          label={entry.snapshotId} 
                          size="small" 
                          color="primary"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                        <HardDrive className="w-3 h-3" style={{ color: theme.palette.text.secondary }} />
                        <Typography variant="caption">{formatSize(entry.fileSize)}</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Empty State */}
        {!isLoading && entries.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <History className="w-12 h-12 mx-auto mb-2" style={{ color: theme.palette.text.secondary, opacity: 0.5 }} />
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              No restore history yet
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              Restore operations will be logged here for audit purposes
            </Typography>
          </Box>
        )}

        {/* Pagination */}
        {!isLoading && entries.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default RestoreHistoryViewer;
