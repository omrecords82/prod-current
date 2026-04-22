/**
 * InteractiveReportReview Component
 * 
 * Review page for interactive reports submitted by recipients.
 * Allows administrators to review, approve, and manage interactive report submissions.
 * 
 * Route: /apps/interactive-reports/review
 */

import React, { useState, useEffect } from 'react';
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
  Chip,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

interface InteractiveReport {
  id: string;
  token: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  recipientName?: string;
  recipientEmail?: string;
  data: Record<string, any>;
}

const InteractiveReportReview: React.FC = () => {
  const [reports, setReports] = useState<InteractiveReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<InteractiveReport | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with actual API call
      // const response = await fetch('/api/interactive-reports/review');
      // const data = await response.json();
      // setReports(data.reports || []);
      
      // Placeholder data
      setReports([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reportId: string) => {
    try {
      // TODO: Implement approval API call
      // await fetch(`/api/interactive-reports/${reportId}/approve`, { method: 'POST' });
      fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve report');
    }
  };

  const handleReject = async (reportId: string) => {
    try {
      // TODO: Implement rejection API call
      // await fetch(`/api/interactive-reports/${reportId}/reject`, { method: 'POST' });
      fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject report');
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Interactive Report Review
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchReports}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && reports.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : reports.length === 0 ? (
          <Alert severity="info">
            No interactive reports to review at this time.
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Token</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Recipient</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>{report.token.substring(0, 8)}...</TableCell>
                    <TableCell>
                      {new Date(report.submittedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {report.recipientName || report.recipientEmail || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={report.status}
                        color={getStatusColor(report.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedReport(report);
                            setViewDialogOpen(true);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {report.status === 'pending' && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleApprove(report.id)}
                            >
                              <ApproveIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleReject(report.id)}
                            >
                              <RejectIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* View Report Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Report Details - {selectedReport?.token.substring(0, 8)}...
        </DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Submitted: {new Date(selectedReport.submittedAt).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Status: <Chip
                  label={selectedReport.status}
                  color={getStatusColor(selectedReport.status) as any}
                  size="small"
                />
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Report Data:
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={10}
                  value={JSON.stringify(selectedReport.data, null, 2)}
                  InputProps={{
                    readOnly: true,
                  }}
                  variant="outlined"
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InteractiveReportReview;
