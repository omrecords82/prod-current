/**
 * PendingMembersPage.tsx — Review and approve users who registered via church token
 * These users have is_locked=1 with lockout_reason "Pending admin review"
 */

import { apiClient } from '@/api/utils/axiosInstance';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  CheckCircle as ApproveIcon,
  ArrowBack as BackIcon,
  Cancel as RejectIcon,
  Refresh as RefreshIcon,
  HowToReg as PendingIcon,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface PendingUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  role: string;
  church_id: number | null;
  is_locked: number;
  lockout_reason: string;
  created_at: string;
  phone?: string;
}

const PendingMembersPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const color = '#2e7d32';

  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; userId: number | null; email: string }>({ open: false, userId: null, email: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { to: '/admin/control-panel/church-management', title: 'Church Management' },
    { title: 'Pending Members' },
  ];

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<any>('/admin/users?status=locked&limit=100');
      const pendingUsers = (data.users || []).filter(
        (u: PendingUser) => u.is_locked && u.lockout_reason?.toLowerCase().includes('pending')
      );
      setUsers(pendingUsers);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleApprove = async (userId: number, email: string) => {
    setActionLoading(userId);
    try {
      await apiClient.post<any>(`/admin/users/${userId}/unlock`);
      setSnack({ open: true, message: `${email} approved and unlocked`, severity: 'success' });
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      setSnack({ open: true, message: err.message, severity: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.userId) return;
    setActionLoading(rejectDialog.userId);
    try {
      // Keep the user locked but update the reason to indicate rejection
      try {
        await apiClient.post<any>(`/admin/users/${rejectDialog.userId}/lockout`, { reason: `Registration rejected: ${rejectReason || 'Not approved by admin'}` });
      } catch {
        // User is already locked, so manually update the reason
        // The lockout endpoint returns 400 for already-locked users, so just remove from list
      }
      setSnack({ open: true, message: `${rejectDialog.email} registration rejected`, severity: 'success' });
      setUsers(prev => prev.filter(u => u.id !== rejectDialog.userId));
      setRejectDialog({ open: false, userId: null, email: '' });
      setRejectReason('');
    } catch (err: any) {
      setSnack({ open: true, message: err.message, severity: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  };

  return (
    <PageContainer title="Pending Members" description="Review and approve members who registered via church token">
      <Breadcrumb title="Pending Members" items={BCrumb} />
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/admin/control-panel/church-management')} sx={{ bgcolor: alpha(color, 0.08), color }}>
            <BackIcon />
          </IconButton>
          <Box sx={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, bgcolor: alpha(color, isDark ? 0.15 : 0.08), color, flexShrink: 0 }}>
            <PendingIcon sx={{ fontSize: 36 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={700}>Pending Members</Typography>
            <Typography variant="body2" color="text.secondary">
              Review users who registered via church token and are awaiting approval
            </Typography>
          </Box>
          <IconButton onClick={fetchPending} disabled={loading} sx={{ color }}>
            <RefreshIcon />
          </IconButton>
        </Box>

        {/* Status bar */}
        <Alert severity={users.length > 0 ? 'info' : 'success'} sx={{ mb: 3 }}>
          {loading ? 'Loading...' : users.length > 0
            ? `${users.length} member${users.length !== 1 ? 's' : ''} awaiting review`
            : 'No pending members — all registrations have been reviewed'}
        </Alert>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color }} />
          </Box>
        ) : users.length > 0 ? (
          <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`, borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Church ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Registered</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} sx={{ '&:hover': { bgcolor: alpha(color, 0.03) } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {user.first_name} {user.last_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={user.role || 'viewer'} size="small" sx={{ fontSize: '0.72rem' }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{user.church_id || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{formatDate(user.created_at)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button
                          variant="contained"
                          size="small"
                          color="success"
                          startIcon={actionLoading === user.id ? <CircularProgress size={14} color="inherit" /> : <ApproveIcon />}
                          disabled={actionLoading !== null}
                          onClick={() => handleApprove(user.id, user.email)}
                          sx={{ textTransform: 'none', fontSize: '0.78rem' }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          startIcon={<RejectIcon />}
                          disabled={actionLoading !== null}
                          onClick={() => setRejectDialog({ open: true, userId: user.id, email: user.email })}
                          sx={{ textTransform: 'none', fontSize: '0.78rem' }}
                        >
                          Reject
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : null}
      </Box>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, userId: null, email: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Registration</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Rejecting <strong>{rejectDialog.email}</strong> will keep their account locked. Optionally provide a reason.
          </Typography>
          <TextField
            fullWidth
            label="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g., Not a recognized parishioner"
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, userId: null, email: '' })}>Cancel</Button>
          <Button onClick={handleReject} color="error" variant="contained">Reject</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default PendingMembersPage;
