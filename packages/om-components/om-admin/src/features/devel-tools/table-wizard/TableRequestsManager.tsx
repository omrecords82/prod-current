/**
 * TableRequestsManager Component
 *
 * Super_admin view for reviewing, approving, and rejecting table creation requests.
 *
 * Route: /devel-tools/table-requests
 */

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, FormControl, InputLabel, Select,
  MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Alert, CircularProgress, IconButton, Collapse, Tooltip,
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Refresh as RefreshIcon,
  Gavel as GavelIcon,
} from '@mui/icons-material';

interface TableRequest {
  id: number;
  church_id: number;
  table_name: string;
  display_name: string;
  columns_json: any[];
  sql_preview: string;
  status: string;
  requested_by_name: string;
  requested_by_email: string;
  church_name: string;
  church_short_name: string;
  database_name: string;
  reviewed_by_name: string | null;
  review_notes: string | null;
  error_message: string | null;
  created_at: string;
  executed_at: string | null;
}

const STATUS_COLORS: Record<string, 'warning' | 'success' | 'error' | 'info' | 'default'> = {
  pending: 'warning',
  approved: 'success',
  executed: 'success',
  rejected: 'error',
  failed: 'error',
};

const TableRequestsManager: React.FC = () => {
  const [requests, setRequests] = useState<TableRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject'>('approve');
  const [dialogRequestId, setDialogRequestId] = useState<number | null>(null);
  const [dialogNotes, setDialogNotes] = useState('');
  const [dialogSubmitting, setDialogSubmitting] = useState(false);
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);

      const data = await apiClient.get<any>(`/admin/table-requests?${params}`);
      if (data.success) {
        setRequests(data.data.requests || []);
      } else {
        throw new Error(data.error || 'Failed to load requests');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const openDialog = (requestId: number, action: 'approve' | 'reject') => {
    setDialogRequestId(requestId);
    setDialogAction(action);
    setDialogNotes('');
    setDialogOpen(true);
    setActionResult(null);
  };

  const handleDialogSubmit = async () => {
    if (!dialogRequestId) return;
    if (dialogAction === 'reject' && !dialogNotes.trim()) {
      setActionResult({ type: 'error', message: 'Rejection reason is required' });
      return;
    }

    setDialogSubmitting(true);
    setActionResult(null);

    try {
      const data = await apiClient.post<any>(`/admin/table-requests/${dialogRequestId}/${dialogAction}`, { notes: dialogNotes });

      if (data.success) {
        setDialogOpen(false);
        setActionResult(null);
        fetchRequests();
      } else {
        setActionResult({ type: 'error', message: data.error || `Failed to ${dialogAction} request` });
      }
    } catch (err: any) {
      setActionResult({ type: 'error', message: err.message });
    } finally {
      setDialogSubmitting(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <GavelIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4">Table Requests</Typography>
              <Typography variant="body2" color="text.secondary">
                Review and approve table creation requests
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="executed">Executed</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchRequests} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : requests.length === 0 ? (
          <Alert severity="info">No table requests found.</Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width={40} />
                  <TableCell>ID</TableCell>
                  <TableCell>Table Name</TableCell>
                  <TableCell>Church</TableCell>
                  <TableCell>Requested By</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((req) => (
                  <React.Fragment key={req.id}>
                    <TableRow hover>
                      <TableCell>
                        <IconButton size="small" onClick={() => toggleExpand(req.id)}>
                          {expandedId === req.id ? <CollapseIcon /> : <ExpandIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>#{req.id}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">{req.table_name}</Typography>
                        {req.display_name && req.display_name !== req.table_name && (
                          <Typography variant="caption" color="text.secondary">{req.display_name}</Typography>
                        )}
                      </TableCell>
                      <TableCell>{req.church_name || req.church_short_name}</TableCell>
                      <TableCell>{req.requested_by_name || req.requested_by_email}</TableCell>
                      <TableCell>
                        <Chip label={req.status} color={STATUS_COLORS[req.status] || 'default'} size="small" />
                      </TableCell>
                      <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {req.status === 'pending' && (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Approve">
                              <IconButton color="success" size="small" onClick={() => openDialog(req.id, 'approve')}>
                                <ApproveIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton color="error" size="small" onClick={() => openDialog(req.id, 'reject')}>
                                <RejectIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Expanded detail row */}
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 0 }}>
                        <Collapse in={expandedId === req.id}>
                          <Box sx={{ p: 2 }}>
                            {req.review_notes && (
                              <Alert severity={req.status === 'rejected' ? 'error' : 'info'} sx={{ mb: 2 }}>
                                <strong>Review notes:</strong> {req.review_notes}
                                {req.reviewed_by_name && ` (by ${req.reviewed_by_name})`}
                              </Alert>
                            )}
                            {req.error_message && (
                              <Alert severity="error" sx={{ mb: 2 }}>
                                <strong>Error:</strong> {req.error_message}
                              </Alert>
                            )}

                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                              Columns ({Array.isArray(req.columns_json) ? req.columns_json.length : 0})
                            </Typography>
                            {Array.isArray(req.columns_json) && (
                              <Table size="small" sx={{ mb: 2 }}>
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Nullable</TableCell>
                                    <TableCell>Default</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {req.columns_json.map((col: any, idx: number) => (
                                    <TableRow key={idx}>
                                      <TableCell>{col.name}</TableCell>
                                      <TableCell>
                                        {col.type}
                                        {col.type === 'VARCHAR' && `(${col.length || 255})`}
                                        {col.type === 'DECIMAL' && `(${col.precision || 10},${col.scale || 2})`}
                                      </TableCell>
                                      <TableCell>{col.nullable !== false ? 'YES' : 'NO'}</TableCell>
                                      <TableCell>{col.defaultValue || '-'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}

                            <Typography variant="subtitle2" sx={{ mb: 1 }}>SQL Preview</Typography>
                            <Paper
                              variant="outlined"
                              sx={{ p: 2, bgcolor: '#1e1e1e', color: '#d4d4d4', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: 300 }}
                            >
                              {req.sql_preview}
                            </Paper>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Approve/Reject Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogAction === 'approve' ? 'Approve Table Request' : 'Reject Table Request'}
        </DialogTitle>
        <DialogContent>
          {actionResult && (
            <Alert severity={actionResult.type} sx={{ mb: 2 }}>{actionResult.message}</Alert>
          )}
          <TextField
            label={dialogAction === 'reject' ? 'Rejection Reason *' : 'Notes (optional)'}
            fullWidth
            multiline
            rows={3}
            value={dialogNotes}
            onChange={(e) => setDialogNotes(e.target.value)}
            sx={{ mt: 1 }}
          />
          {dialogAction === 'approve' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Approving will immediately create the table in the church database.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={dialogSubmitting}>Cancel</Button>
          <Button
            variant="contained"
            color={dialogAction === 'approve' ? 'success' : 'error'}
            onClick={handleDialogSubmit}
            disabled={dialogSubmitting}
            startIcon={dialogSubmitting ? <CircularProgress size={16} /> : undefined}
          >
            {dialogSubmitting ? 'Processing...' : dialogAction === 'approve' ? 'Approve & Execute' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TableRequestsManager;
