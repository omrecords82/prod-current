/**
 * ReleaseHistoryPage.tsx
 * Shows promoted (and rolled-back) change_sets as a structured release log.
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  CheckCircle as PromotedIcon,
  History as HistoryIcon,
  Undo as RolledBackIcon,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Chip,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/shared/lib/apiClient';

interface Release {
  id: number;
  code: string;
  title: string;
  status: string;
  change_type: string;
  priority: string;
  git_branch: string | null;
  prod_commit_sha: string | null;
  reviewed_by_email: string | null;
  promoted_at: string | null;
  item_count: number;
}

const ReleaseHistoryPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { to: '/admin/control-panel/om-daily', title: 'OM Daily' },
    { to: '/admin/control-panel/om-daily/change-sets', title: 'Change Sets' },
    { title: 'Release History' },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/change-sets/releases');
      setReleases(res.data.items || []);
    } catch (err) {
      console.error('Failed to load releases:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <PageContainer title="Release History" description="Deployed change sets">
      <Breadcrumb title="Release History" items={BCrumb} />

      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={700}>
            <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle', color: theme.palette.primary.main }} />
            Release History
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            All promoted and rolled-back change sets
          </Typography>
        </Box>

        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Commit</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Items</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Approved By</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Promoted At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : releases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No releases yet</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                releases.map((rel) => (
                  <TableRow
                    key={rel.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/admin/control-panel/om-daily/change-sets/${rel.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>{rel.code}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{rel.title}</Typography>
                    </TableCell>
                    <TableCell>
                      {rel.status === 'promoted' ? (
                        <Chip icon={<PromotedIcon />} label="Promoted" size="small" color="success" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      ) : (
                        <Chip icon={<RolledBackIcon />} label="Rolled Back" size="small" color="error" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{rel.change_type}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {rel.prod_commit_sha ? rel.prod_commit_sha.substring(0, 8) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={600}>{rel.item_count}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{rel.reviewed_by_email || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        {formatDate(rel.promoted_at)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </PageContainer>
  );
};

export default ReleaseHistoryPage;
