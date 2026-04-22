import React from 'react';
import {
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Cancel as RejectIcon,
  CheckCircle as ApproveIcon,
  ContentCopy as CopyIcon,
  LinkOff as DeactivateIcon,
  VpnKey as TokenIcon,
} from '@mui/icons-material';
import { COLOR } from './constants';
import type { OnboardingPanelProps } from './types';

const OnboardingPanel: React.FC<OnboardingPanelProps> = ({
  members,
  tokens,
  isDark,
  totalMembers,
  activeMembers,
  pendingMembers,
  formatDate,
  actionLoading,
  handleApproveMember,
  setRejectDialog,
  hasActiveToken,
  generatingToken,
  handleGenerateToken,
  deactivatingToken,
  handleDeactivateToken,
  copyToClipboard,
}) => (
  <>
    {/* Members */}
    <Paper
      elevation={0}
      sx={{ mb: 2.5, overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 2 }}
    >
      <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" fontWeight={700}>Members</Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Chip label={`${totalMembers} total`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
          <Chip label={`${activeMembers} active`} size="small"
            sx={{ fontWeight: 600, bgcolor: alpha('#4caf50', isDark ? 0.2 : 0.1), color: '#4caf50', border: `1px solid ${alpha('#4caf50', 0.3)}` }}
          />
          {pendingMembers > 0 && (
            <Chip label={`${pendingMembers} pending`} size="small"
              sx={{ fontWeight: 600, bgcolor: alpha('#ff9800', isDark ? 0.2 : 0.1), color: '#ff9800', border: `1px solid ${alpha('#ff9800', 0.3)}` }}
            />
          )}
        </Box>
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(COLOR, isDark ? 0.08 : 0.04) }}>
              <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Registered</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No members found</Typography>
                </TableCell>
              </TableRow>
            ) : members.map(m => {
              const isPending = m.is_locked && m.lockout_reason?.toLowerCase().includes('pending');
              return (
                <TableRow key={m.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {m.full_name || `${m.first_name} ${m.last_name}`}
                    </Typography>
                  </TableCell>
                  <TableCell><Typography variant="body2">{m.email}</Typography></TableCell>
                  <TableCell><Chip label={m.role || 'viewer'} size="small" sx={{ fontSize: '0.72rem' }} /></TableCell>
                  <TableCell>
                    <Chip
                      label={m.is_locked ? 'Locked' : 'Active'}
                      size="small"
                      color={m.is_locked ? 'error' : 'success'}
                      variant={m.is_locked ? 'outlined' : 'filled'}
                    />
                  </TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{formatDate(m.created_at)}</Typography></TableCell>
                  <TableCell align="right">
                    {isPending && (
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button
                          variant="contained" size="small" color="success"
                          startIcon={actionLoading === m.id ? <CircularProgress size={14} color="inherit" /> : <ApproveIcon />}
                          disabled={actionLoading !== null}
                          onClick={() => handleApproveMember(m.id, m.email)}
                          sx={{ textTransform: 'none', fontSize: '0.78rem' }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outlined" size="small" color="error"
                          startIcon={<RejectIcon />}
                          disabled={actionLoading !== null}
                          onClick={() => setRejectDialog({ open: true, userId: m.id, email: m.email })}
                          sx={{ textTransform: 'none', fontSize: '0.78rem' }}
                        >
                          Reject
                        </Button>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>

    {/* Tokens */}
    <Paper
      elevation={0}
      sx={{ overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, borderRadius: 2 }}
    >
      <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TokenIcon sx={{ color: COLOR, fontSize: 20 }} />
          <Typography variant="subtitle1" fontWeight={700}>Token History</Typography>
        </Box>
        {!hasActiveToken && (
          <Button
            variant="contained" size="small"
            startIcon={generatingToken ? <CircularProgress size={14} color="inherit" /> : <TokenIcon />}
            disabled={generatingToken}
            onClick={handleGenerateToken}
            sx={{ textTransform: 'none', bgcolor: COLOR, '&:hover': { bgcolor: alpha(COLOR, 0.85) } }}
          >
            Generate Token
          </Button>
        )}
      </Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(COLOR, isDark ? 0.08 : 0.04) }}>
              <TableCell sx={{ fontWeight: 700 }}>Token</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Created By</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tokens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No tokens found</Typography>
                </TableCell>
              </TableRow>
            ) : tokens.map(t => (
              <TableRow key={t.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.token}
                    </Typography>
                    <Tooltip title="Copy token">
                      <IconButton size="small" onClick={() => copyToClipboard(t.token, 'Token copied')}>
                        <CopyIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={t.is_active ? 'Active' : 'Inactive'} size="small" color={t.is_active ? 'success' : 'default'} variant={t.is_active ? 'filled' : 'outlined'} />
                </TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{formatDate(t.created_at)}</Typography></TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{t.created_by || '—'}</Typography></TableCell>
                <TableCell align="right">
                  {t.is_active ? (
                    <Tooltip title="Deactivate token">
                      <IconButton size="small" color="error" disabled={deactivatingToken === t.id} onClick={() => handleDeactivateToken(t.id)}>
                        {deactivatingToken === t.id ? <CircularProgress size={18} /> : <DeactivateIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Typography variant="caption" color="text.disabled">—</Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  </>
);

export default OnboardingPanel;
