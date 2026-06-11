/**
 * ParishUsersPage — church-scoped user directory for parish staff.
 * Wired to GET/POST unlock on /api/admin/church-users/:churchId
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography, useTheme,
} from '@mui/material';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import { useChurch } from '@/context/ChurchContext';
import { useLanguage } from '@/context/LanguageContext';
import apiClient from '@/api/utils/axiosInstance';

interface ParishUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  system_role: string;
  church_role: string;
  is_active: number;
  is_locked: number;
  lockout_reason: string | null;
  last_login: string | null;
  created_at: string;
}

const ParishUsersPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { activeChurchId, churchMetadata } = useChurch();
  const { t } = useLanguage();
  const [users, setUsers] = useState<ParishUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!activeChurchId) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get<{ success: boolean; data?: { users: ParishUser[] }; users?: ParishUser[] }>(
        `/admin/church-users/${activeChurchId}`,
      );
      const payload = res.data || res;
      setUsers(payload.users || []);
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Failed to load parish users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [activeChurchId]);

  useEffect(() => { load(); }, [load]);

  const unlockUser = async (userId: number) => {
    if (!activeChurchId) return;
    setActionId(userId);
    try {
      await apiClient.post(`/admin/church-users/${activeChurchId}/${userId}/unlock`, {});
      await load();
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Unlock failed');
    } finally {
      setActionId(null);
    }
  };

  const churchName = churchMetadata?.church_name_display || t('parish.default_title');
  const pendingCount = users.filter((u) => u.is_locked === 1).length;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <PeopleOutlinedIcon sx={{ color: isDark ? '#d4af37' : '#2d1b4e' }} />
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: '1.1rem' }}>{t('parish.parish_users')}</Typography>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            {t('parish.parish_users_desc').replace('{name}', churchName)}
          </Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {pendingCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('parish.users_pending_activation').replace('{count}', String(pendingCount))}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} /></Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Name', 'Email', 'Church role', 'Status', ''].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    {t('parish.users_empty')}
                  </TableCell>
                </TableRow>
              ) : users.map((u) => {
                const pending = u.is_locked === 1;
                const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email;
                return (
                  <TableRow key={u.id} hover>
                    <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{name}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{u.email}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{u.church_role || u.system_role}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={pending ? t('parish.user_pending') : t('parish.user_active')}
                        color={pending ? 'warning' : 'success'}
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {pending && (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={actionId === u.id}
                          onClick={() => unlockUser(u.id)}
                          sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                        >
                          {actionId === u.id ? '…' : t('parish.user_activate')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ParishUsersPage;
