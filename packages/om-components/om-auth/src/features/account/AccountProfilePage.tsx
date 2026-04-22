/**
 * AccountProfilePage — Read-only profile overview card.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { RoleAvatar, getRoleLabel } from '@/utils/roleAvatars';
import { profileApi } from './accountApi';

interface ProfileData {
  display_name: string;
  email: string;
  phone: string;
  company: string;
  location: string;
  first_name: string;
  last_name: string;
}

const AccountProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await profileApi.getProfile();
        if (data.success && data.profile) {
          const p = data.profile;
          setProfile({
            display_name: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            email: p.email || user?.email || '',
            phone: p.phone || '',
            company: p.company || '',
            location: p.location || '',
            first_name: p.first_name || '',
            last_name: p.last_name || '',
          });
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user?.id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  const infoRows: { label: string; value: string }[] = [
    { label: t('account.label_email'), value: profile?.email || '—' },
    { label: t('account.label_display_name'), value: profile?.display_name || '—' },
    { label: t('account.label_phone'), value: profile?.phone || '—' },
    { label: t('account.label_organization'), value: profile?.company || '—' },
    { label: t('account.label_location'), value: profile?.location || '—' },
    { label: t('account.label_role'), value: getRoleLabel(user?.role) },
    { label: t('account.label_church'), value: user?.church_name || '—' },
  ];

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <RoleAvatar role={user?.role} size={64} />
            <Box>
              <Typography variant="h5" fontWeight={600}>
                {profile?.display_name || profile?.email}
              </Typography>
              <Chip
                label={getRoleLabel(user?.role)}
                size="small"
                color="primary"
                sx={{ fontWeight: 600, mt: 0.5 }}
              />
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate('/account/personal-info')}
          >
            {t('account.edit_profile')}
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Info grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2.5,
          }}
        >
          {infoRows.map((row) => (
            <Box key={row.label}>
              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                {row.label}
              </Typography>
              <Typography variant="body1">{row.value}</Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default AccountProfilePage;
