/**
 * Orthodox Metrics - Church Management List View
 * Full-featured church management with stats, table/grid views, and user management.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Avatar,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Skeleton,
  FormControlLabel,
  Checkbox,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Snackbar,
  LinearProgress,
} from '@mui/material';
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconMapPin,
  IconMail,
  IconCalendar,
  IconFilter,
  IconBuilding,
  IconUsers,
  IconLayoutGrid,
  IconTable,
  IconRefresh,
  IconUserPlus,
  IconDatabase,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import BlankCard from '@/shared/ui/BlankCard';
import { useAuth } from '@/context/AuthContext';
import * as adminApiModule from '@/api/admin.api';
const adminAPI: any = (adminApiModule as any).default ?? (adminApiModule as any).adminAPI ?? (adminApiModule as any);
import { logger } from '@/utils/logger';
import type { Church } from '@/types/orthodox-metrics.types';
import OrthodoxChurchIcon from '@/shared/ui/OrthodoxChurchIcon';

function normalizeChurches(response: any): any[] {
  const raw =
    response?.churches ??
    response?.data?.churches ??
    response?.data ??
    response ??
    [];

  if (!Array.isArray(raw)) return [];

  return raw.map((it: any) => ({
    id: it?.id ?? it?.church_id ?? it?._id ?? Math.random(),
    name: it?.name ?? it?.church_name ?? 'Unnamed Church',
    email: it?.email ?? '',
    address: it?.address ?? [it?.city, it?.state_province ?? it?.state].filter(Boolean).join(', '),
    city: it?.city ?? '',
    state_province: it?.state_province ?? it?.state ?? '',
    preferred_language: it?.preferred_language ?? 'en',
    created_at: it?.created_at ?? it?.createdAt ?? null,
    is_active: typeof it?.is_active === 'boolean' ? it?.is_active : it?.is_active === 1,
    database_name: it?.database_name ?? '',
    user_count: it?.user_count ?? null,
  }));
}

const ChurchList: React.FC = () => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [churches, setChurches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChurch, setSelectedChurch] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [shouldDeleteDatabase, setShouldDeleteDatabase] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({ open: false, message: '', severity: 'info' });

  const BCrumb = [
    { to: '/', title: 'Home' },
    { title: 'Church Management' },
  ];

  const fetchChurches = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      if (!adminAPI?.churches?.getAll) {
        throw new Error('adminAPI.churches.getAll not available');
      }
      const response = await adminAPI.churches.getAll();
      if (response?.success === false) {
        throw new Error(response?.message || 'API returned success=false');
      }
      const normalized = normalizeChurches(response);
      setChurches(normalized);

      if (!silent) {
        logger.info('Church Management', 'Churches list loaded', {
          count: normalized.length,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch churches';
      if (!silent) setError(errorMessage);
      logger.error('Church Management', 'Failed to fetch churches', { error: errorMessage });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (hasRole('admin') || hasRole('super_admin')) {
      fetchChurches();
    } else {
      setError('Access denied. Admin privileges required.');
      setLoading(false);
    }
  }, [hasRole, fetchChurches]);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredChurches = churches.filter(church => {
    const matchesSearch = church.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      church.address?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      church.email?.toLowerCase().includes(debouncedSearch.toLowerCase());

    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && church.is_active) ||
      (filterStatus === 'inactive' && !church.is_active);

    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalChurches = churches.length;
  const activeChurches = churches.filter(c => c.is_active).length;
  const inactiveChurches = churches.filter(c => !c.is_active).length;
  const recentlyAdded = churches.filter(c => {
    if (!c.created_at) return false;
    const created = new Date(c.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return created >= thirtyDaysAgo;
  }).length;

  const handleDeleteChurch = async (church: any) => {
    try {
      await adminAPI.churches.removeAllUsers(church.id);
      await adminAPI.churches.delete(church.id, shouldDeleteDatabase);
      setChurches(prev => prev.filter(c => c.id !== church.id));
      setDeleteDialogOpen(false);
      setSelectedChurch(null);
      setShouldDeleteDatabase(false);
      setSnackbar({ open: true, message: `"${church.name}" deleted successfully`, severity: 'success' });
      logger.info('Church Management', 'Church deleted', { churchId: church.id, churchName: church.name });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete church';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  const handleRefresh = () => {
    fetchChurches(true);
  };

  if (!(hasRole('admin') || hasRole('super_admin') || hasRole('manager'))) {
    return (
      <PageContainer title="Church Management" description="Church management system">
        <Alert severity="error">
          Access denied. Administrator privileges required to view church management.
        </Alert>
      </PageContainer>
    );
  }

  const StatCard = ({ title, value, color, icon }: { title: string; value: number; color: string; icon: React.ReactNode }) => (
    <Card sx={{ height: '100%', borderTop: `3px solid ${color}` }}>
      <CardContent sx={{ py: 2, px: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" fontWeight={700}>{value}</Typography>
            <Typography variant="body2" color="textSecondary">{title}</Typography>
          </Box>
          <Avatar sx={{ bgcolor: `${color}20`, color, width: 48, height: 48 }}>
            {icon}
          </Avatar>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <PageContainer title="Church Management" description="Manage churches in the Orthodox Metrics system">
      <Breadcrumb title="Church Management" items={BCrumb} />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {refreshing && <LinearProgress sx={{ mb: 1 }} />}

      {/* Stats Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
        <StatCard title="Total Churches" value={totalChurches} color="#5D87FF" icon={<IconBuilding size={24} />} />
        <StatCard title="Active" value={activeChurches} color="#13DEB9" icon={<IconCheck size={24} />} />
        <StatCard title="Inactive" value={inactiveChurches} color="#FA896B" icon={<IconX size={24} />} />
        <StatCard title="Added (30d)" value={recentlyAdded} color="#FFAE1F" icon={<IconCalendar size={24} />} />
      </Box>

      {/* Controls */}
      <BlankCard sx={{ mb: 3, overflow: 'hidden' }}>
        <CardContent sx={{ overflow: 'hidden' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" flexGrow={1}>
              <TextField
                size="small"
                placeholder="Search churches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ minWidth: 280 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconSearch size={20} />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, val) => val && setViewMode(val)}
                size="small"
              >
                <ToggleButton value="grid"><IconLayoutGrid size={18} /></ToggleButton>
                <ToggleButton value="table"><IconTable size={18} /></ToggleButton>
              </ToggleButtonGroup>
              <Tooltip title="Refresh">
                <IconButton onClick={handleRefresh} disabled={refreshing}>
                  <IconRefresh size={20} />
                </IconButton>
              </Tooltip>
            </Stack>

            <Stack direction="row" spacing={1}>
              {hasRole('super_admin') && (
                <Button
                  variant="outlined"
                  startIcon={<IconPlus size={18} />}
                  onClick={() => navigate('/apps/church-management/wizard')}
                >
                  Setup Wizard
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={<IconPlus size={18} />}
                onClick={() => navigate('/apps/church-management/create')}
              >
                Add Church
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </BlankCard>

      {/* Church List */}
      <BlankCard sx={{ overflow: 'hidden' }}>
            <CardContent sx={{ overflow: 'hidden' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Churches ({filteredChurches.length})
                </Typography>
              </Stack>

              {loading ? (
                viewMode === 'grid' ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 3, minWidth: 0 }}>
                    {[1, 2, 3, 4, 5, 6].map((item) => (
                      <Card key={item}>
                        <CardContent>
                          <Stack spacing={2}>
                            <Skeleton variant="circular" width={40} height={40} />
                            <Skeleton variant="text" width="80%" height={28} />
                            <Skeleton variant="text" width="60%" height={20} />
                            <Skeleton variant="text" width="40%" height={20} />
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Box>
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rectangular" height={52} sx={{ mb: 1, borderRadius: 1 }} />)}
                  </Box>
                )
              ) : filteredChurches.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <IconBuilding size={64} style={{ opacity: 0.3, marginBottom: 16 }} />
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    {debouncedSearch || filterStatus !== 'all'
                      ? 'No churches match your search criteria'
                      : 'No churches have been added yet'
                    }
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    {debouncedSearch || filterStatus !== 'all'
                      ? 'Try adjusting your search or filter settings'
                      : 'Get started by adding your first church to the system'
                    }
                  </Typography>
                  {!debouncedSearch && filterStatus === 'all' && (
                    <Button
                      variant="contained"
                      startIcon={<IconPlus size={18} />}
                      onClick={() => navigate('/apps/church-management/create')}
                    >
                      Add First Church
                    </Button>
                  )}
                </Box>
              ) : viewMode === 'table' ? (
                /* Table View */
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Church</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Language</TableCell>
                        <TableCell>Database</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredChurches.map((church) => (
                        <TableRow key={church.id} hover sx={{ cursor: 'pointer' }}>
                          <TableCell>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                <OrthodoxChurchIcon />
                              </Avatar>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {church.name}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="textSecondary">{church.email || '-'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="textSecondary">{church.address || '-'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={church.preferred_language?.toUpperCase() || 'EN'} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="textSecondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                              {church.database_name || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={church.is_active ? 'Active' : 'Inactive'}
                              color={church.is_active ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="textSecondary">
                              {church.created_at ? new Date(church.created_at).toLocaleDateString() : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="View">
                                <IconButton size="small" onClick={() => { setSelectedChurch(church); setViewDialogOpen(true); }}>
                                  <IconEye size={16} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => navigate(`/apps/church-management/edit/${church.id}`)} sx={{ color: 'primary.main' }}>
                                  <IconEdit size={16} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Manage Users">
                                <IconButton size="small" onClick={() => navigate(`/apps/church-management/edit/${church.id}`, { state: { openUsers: true } })} sx={{ color: 'info.main' }}>
                                  <IconUsers size={16} />
                                </IconButton>
                              </Tooltip>
                              {hasRole('super_admin') && (
                                <Tooltip title="Delete">
                                  <IconButton size="small" onClick={() => { setSelectedChurch(church); setDeleteDialogOpen(true); }} sx={{ color: 'error.main' }}>
                                    <IconTrash size={16} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                /* Card Grid View */
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 3, minWidth: 0 }}>
                  {filteredChurches.map((church) => (
                    <Box key={church.id} sx={{ minWidth: 0 }}>
                      <Card
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: 4,
                          }
                        }}
                      >
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                              <OrthodoxChurchIcon />
                            </Avatar>
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography variant="h6" noWrap title={church.name}>
                                {church.name}
                              </Typography>
                              <Stack direction="row" spacing={0.5} mt={0.5}>
                                <Chip
                                  label={church.is_active ? 'Active' : 'Inactive'}
                                  color={church.is_active ? 'success' : 'default'}
                                  size="small"
                                />
                                <Chip
                                  label={church.preferred_language?.toUpperCase() || 'EN'}
                                  size="small"
                                  variant="outlined"
                                />
                              </Stack>
                            </Box>
                          </Box>

                          <Stack spacing={1}>
                            {church.address && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <IconMapPin size={16} style={{ marginRight: 8, opacity: 0.7, flexShrink: 0 }} />
                                <Typography variant="body2" color="textSecondary" noWrap>
                                  {church.address}
                                </Typography>
                              </Box>
                            )}
                            {church.email && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <IconMail size={16} style={{ marginRight: 8, opacity: 0.7, flexShrink: 0 }} />
                                <Typography variant="body2" color="textSecondary" noWrap>
                                  {church.email}
                                </Typography>
                              </Box>
                            )}
                            {church.database_name && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <IconDatabase size={16} style={{ marginRight: 8, opacity: 0.7, flexShrink: 0 }} />
                                <Typography variant="body2" color="textSecondary" noWrap sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                  {church.database_name}
                                </Typography>
                              </Box>
                            )}
                            {church.created_at && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <IconCalendar size={16} style={{ marginRight: 8, opacity: 0.7, flexShrink: 0 }} />
                                <Typography variant="body2" color="textSecondary">
                                  Added {new Date(church.created_at).toLocaleDateString()}
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </CardContent>

                        <Divider />

                        <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1.5 }}>
                          <Stack direction="row" spacing={0.5}>
                            <Button size="small" startIcon={<IconEye size={16} />} onClick={() => { setSelectedChurch(church); setViewDialogOpen(true); }}>
                              View
                            </Button>
                            <Button size="small" startIcon={<IconUsers size={16} />} onClick={() => navigate(`/apps/church-management/edit/${church.id}`, { state: { openUsers: true } })}>
                              Users
                            </Button>
                          </Stack>

                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => navigate(`/apps/church-management/edit/${church.id}`)} sx={{ color: 'primary.main' }}>
                                <IconEdit size={16} />
                              </IconButton>
                            </Tooltip>
                            {hasRole('super_admin') && (
                              <Tooltip title="Delete">
                                <IconButton size="small" onClick={() => { setSelectedChurch(church); setDeleteDialogOpen(true); }} sx={{ color: 'error.main' }}>
                                  <IconTrash size={16} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </CardActions>
                      </Card>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </BlankCard>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: '1px solid rgba(239, 68, 68, 0.15)',
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
        }}>
          <IconTrash size={22} style={{ marginRight: 8 }} />
          Delete Church
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography variant="body1">
            Are you sure you want to delete <strong>"{selectedChurch?.name}"</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            This action cannot be undone and will permanently remove the church from the system.
          </Typography>

          <FormControlLabel
            control={
              <Checkbox
                checked={shouldDeleteDatabase}
                onChange={(e) => setShouldDeleteDatabase(e.target.checked)}
                sx={{ color: '#ef4444', '&.Mui-checked': { color: '#ef4444' } }}
              />
            }
            label="Also remove the database and all church records"
            sx={{ mt: 2 }}
          />

          {shouldDeleteDatabase && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>Warning:</strong> This will permanently delete the church's database including all records, users, and data. This is irreversible.
            </Alert>
          )}

          {!shouldDeleteDatabase && (
            <Alert severity="info" sx={{ mt: 2 }}>
              The church record will be removed from the system, but the database and all records will be preserved.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#64748b' }}>
            Cancel
          </Button>
          <Button
            onClick={() => selectedChurch && handleDeleteChurch(selectedChurch)}
            variant="contained"
            color="error"
          >
            Delete Church
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Church Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
        }}>
          <IconEye size={22} style={{ marginRight: 8 }} />
          Church Details
        </DialogTitle>
        <DialogContent sx={{ p: 4 }}>
          {selectedChurch && (
            <Grid container spacing={2}>
              {[
                { label: 'Church Name', value: selectedChurch.name },
                { label: 'Status', value: null, chip: true },
                { label: 'Address', value: selectedChurch.address || 'Not specified' },
                { label: 'Email', value: selectedChurch.email || 'Not specified' },
                { label: 'Language', value: selectedChurch.preferred_language?.toUpperCase() || 'EN' },
                { label: 'Database', value: selectedChurch.database_name || 'Not assigned' },
                { label: 'Created', value: selectedChurch.created_at ? new Date(selectedChurch.created_at).toLocaleDateString() : 'N/A' },
              ].map((field, idx) => (
                <Grid item xs={12} md={6} key={idx}>
                  <Box sx={{ p: 2, backgroundColor: 'rgba(102, 126, 234, 0.05)', borderRadius: 2, border: '1px solid rgba(102, 126, 234, 0.1)' }}>
                    <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                      {field.label}
                    </Typography>
                    {field.chip ? (
                      <Chip
                        label={selectedChurch.is_active ? 'Active' : 'Inactive'}
                        color={selectedChurch.is_active ? 'success' : 'error'}
                        size="small"
                      />
                    ) : (
                      <Typography variant="body1">{field.value}</Typography>
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setViewDialogOpen(false)} sx={{ color: '#64748b' }}>
            Close
          </Button>
          <Button
            variant="outlined"
            startIcon={<IconUsers size={18} />}
            onClick={() => {
              setViewDialogOpen(false);
              navigate(`/apps/church-management/edit/${selectedChurch?.id}`, { state: { openUsers: true } });
            }}
          >
            Manage Users
          </Button>
          <Button
            variant="contained"
            startIcon={<IconEdit size={18} />}
            onClick={() => {
              setViewDialogOpen(false);
              navigate(`/apps/church-management/edit/${selectedChurch?.id}`);
            }}
          >
            Edit Church
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default ChurchList;
