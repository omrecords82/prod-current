/**
 * AccountParishInfoPage — Parish membership & church association overview.
 *
 * Read-only page showing the user's church context, role, and parish details.
 * Data sourced from:
 *   - useAuth()              → church_id, role
 *   - GET /api/my/church-settings → full church details
 *
 * Permission-aware action links to Church Details / Branding when user has edit access.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ChurchIcon from '@mui/icons-material/Church';
import PersonIcon from '@mui/icons-material/Person';
import PlaceIcon from '@mui/icons-material/Place';
import LanguageIcon from '@mui/icons-material/Language';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PublicIcon from '@mui/icons-material/Public';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import PaletteIcon from '@mui/icons-material/Palette';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getRoleLabel } from '@/utils/roleAvatars';
import { canEditBasicChurchInfo, canEditChurchSettings } from './accountPermissions';
import { LANGUAGE_LABEL_KEYS, ROLE_DESCRIPTION_KEYS, getChurchDisplayName } from './accountConstants';
import { churchApi } from './accountApi';

// ── Types ──────────────────────────────────────────────────────────────────

interface ChurchSettings {
  id: number;
  name: string;
  church_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  preferred_language: string | null;
  timezone: string | null;
  currency: string | null;
  calendar_type: string | null;
  website: string | null;
  jurisdiction: string | null;
  short_name: string | null;
  has_baptism_records: number | boolean;
  has_marriage_records: number | boolean;
  has_funeral_records: number | boolean;
  created_at: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatAddress(s: ChurchSettings): string | null {
  const parts = [s.address, s.city, s.state_province, s.postal_code].filter(Boolean);
  if (parts.length === 0) return null;
  // "605 Washington Ave, Manville, NJ 08835"
  const street = s.address || '';
  const cityState = [s.city, s.state_province].filter(Boolean).join(', ');
  const line = [street, cityState].filter(Boolean).join(', ');
  return s.postal_code ? `${line} ${s.postal_code}` : line;
}

function toBool(v: number | boolean | null | undefined): boolean {
  return v === 1 || v === true;
}

// ── Component ──────────────────────────────────────────────────────────────

const AccountParishInfoPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [church, setChurch] = useState<ChurchSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Load church settings ──

  useEffect(() => {
    if (!user?.church_id) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const settings = await churchApi.getSettings<ChurchSettings>();
        if (settings) {
          setChurch(settings);
        }
      } catch {
        setError(t('account.unable_to_load_church'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.church_id]);

  // ── Permission checks ──

  const canEditDetails = canEditBasicChurchInfo(user);
  const canEditBranding = canEditChurchSettings(user);

  // ── No church context ──

  if (!user?.church_id) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <ChurchIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              {t('account.parish_membership')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {t('account.your_church_affiliation')}
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box
            sx={{
              textAlign: 'center',
              py: 5,
              px: 3,
              bgcolor: 'action.hover',
              borderRadius: 2,
            }}
          >
            <ChurchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {t('account.no_parish_affiliation')}
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 400, mx: 'auto' }}>
              {t('account.no_parish_desc')}
            </Typography>
            <Chip
              label={getRoleLabel(user?.role)}
              size="small"
              variant="outlined"
              sx={{ mt: 2 }}
            />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // ── Loading ──

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  // ── Error ──

  if (error || !church) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          <Alert severity="warning">{error || t('account.unable_to_load_church')}</Alert>
        </CardContent>
      </Card>
    );
  }

  // ── Derived values ──

  const displayName = getChurchDisplayName(church) || '—';
  const address = formatAddress(church);
  const recordTypes = [
    toBool(church.has_baptism_records) && { label: t('account.record_baptism') },
    toBool(church.has_marriage_records) && { label: t('account.record_marriage') },
    toBool(church.has_funeral_records) && { label: t('account.record_funeral') },
  ].filter(Boolean) as { label: string }[];

  // ── Render ──

  return (
    <>
      {/* ── Membership Overview ── */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <ChurchIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              {t('account.parish_membership')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t('account.your_church_affiliation_system')}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {/* Hero card */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              bgcolor: 'action.hover',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ChurchIcon sx={{ fontSize: 28, color: 'primary.contrastText' }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" fontWeight={600} noWrap>
                {displayName}
              </Typography>
              {church.short_name && church.short_name !== displayName && (
                <Typography variant="caption" color="text.disabled">
                  {church.short_name}
                </Typography>
              )}
              <Box display="flex" alignItems="center" gap={1} mt={0.5} flexWrap="wrap">
                <Chip
                  icon={<PersonIcon sx={{ fontSize: 16 }} />}
                  label={getRoleLabel(user?.role)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                {church.jurisdiction && (
                  <Chip
                    label={church.jurisdiction}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ── Role & Access ── */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <PersonIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              {t('account.role_and_access')}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {t('account.your_permissions')}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
            }}
          >
            <PersonIcon sx={{ color: 'primary.main', mt: 0.25 }} />
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Typography variant="body1" fontWeight={600}>
                  {getRoleLabel(user?.role)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t(ROLE_DESCRIPTION_KEYS[user?.role || ''] || 'account.standard_access')}
              </Typography>
              <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap" useFlexGap>
                <AccessChip label={t('account.view_records')} allowed />
                <AccessChip label={t('account.edit_church_details')} allowed={canEditDetails} />
                <AccessChip label={t('account.manage_branding')} allowed={canEditBranding} />
              </Stack>
            </Box>
          </Box>

          {/* Info note */}
          <Box display="flex" alignItems="flex-start" gap={1} mt={2} sx={{ px: 1 }}>
            <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled', mt: 0.25 }} />
            <Typography variant="caption" color="text.disabled">
              {t('account.role_managed_note')}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* ── Church Details ── */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
            <Box display="flex" alignItems="center" gap={1}>
              <InfoOutlinedIcon color="primary" />
              <Typography variant="h5" fontWeight={600}>
                {t('account.church_information')}
              </Typography>
            </Box>
            {canEditDetails && (
              <Button
                size="small"
                variant="text"
                startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                onClick={() => navigate('/account/church-details')}
                sx={{ textTransform: 'none' }}
              >
                {t('account.label_edit')}
              </Button>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {canEditDetails ? t('account.parish_contact_details') : t('account.parish_contact_readonly')}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box
            display="grid"
            gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}
            gap={2}
          >
            <DetailRow icon={<ChurchIcon sx={{ fontSize: 18 }} />} label={t('account.label_full_name')} value={displayName} />
            {address && <DetailRow icon={<PlaceIcon sx={{ fontSize: 18 }} />} label={t('account.label_address')} value={address} />}
            {church.country && <DetailRow icon={<PublicIcon sx={{ fontSize: 18 }} />} label={t('account.label_country')} value={church.country} />}
            {church.phone && <DetailRow icon={<PhoneIcon sx={{ fontSize: 18 }} />} label={t('account.label_phone')} value={church.phone} />}
            {church.email && <DetailRow icon={<EmailIcon sx={{ fontSize: 18 }} />} label={t('account.label_email')} value={church.email} />}
            {church.website && (
              <DetailRow
                icon={<LanguageIcon sx={{ fontSize: 18 }} />}
                label={t('account.label_website')}
                value={church.website}
                link={church.website.startsWith('http') ? church.website : `https://${church.website}`}
              />
            )}
            {church.calendar_type && (
              <DetailRow icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />} label={t('account.label_calendar')} value={church.calendar_type} />
            )}
            {church.preferred_language && (
              <DetailRow
                icon={<LanguageIcon sx={{ fontSize: 18 }} />}
                label={t('account.label_language')}
                value={LANGUAGE_LABEL_KEYS[church.preferred_language] ? t(LANGUAGE_LABEL_KEYS[church.preferred_language]) : church.preferred_language}
              />
            )}
            {church.timezone && (
              <DetailRow icon={<PublicIcon sx={{ fontSize: 18 }} />} label={t('account.label_timezone')} value={church.timezone} />
            )}
          </Box>

          {/* Record types */}
          {recordTypes.length > 0 && (
            <Box mt={2.5}>
              <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                <DescriptionIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.disabled" fontWeight={500}>
                  {t('account.active_record_types')}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                {recordTypes.map((rt) => (
                  <Chip key={rt.label} label={rt.label} size="small" variant="outlined" color="primary" />
                ))}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Quick Actions ── */}
      {(canEditDetails || canEditBranding) && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
              {t('account.quick_actions')}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              {canEditDetails && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => navigate('/account/church-details')}
                  sx={{ textTransform: 'none' }}
                >
                  {t('account.edit_church_details')}
                </Button>
              )}
              {canEditBranding && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PaletteIcon />}
                  onClick={() => navigate('/account/branding')}
                  sx={{ textTransform: 'none' }}
                >
                  {t('account.manage_branding')}
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}
    </>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  link?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ icon, label, value, link }) => (
  <Box display="flex" alignItems="flex-start" gap={1}>
    <Box sx={{ color: 'text.disabled', mt: 0.25 }}>{icon}</Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.disabled" fontWeight={500}>
        {label}
      </Typography>
      {link ? (
        <Typography
          variant="body2"
          component="a"
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'primary.main',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {value}
          <OpenInNewIcon sx={{ fontSize: 14 }} />
        </Typography>
      ) : (
        <Typography variant="body2">{value}</Typography>
      )}
    </Box>
  </Box>
);

interface AccessChipProps {
  label: string;
  allowed: boolean;
}

const AccessChip: React.FC<AccessChipProps> = ({ label, allowed }) => {
  const { t } = useLanguage();
  return (
  <Tooltip title={allowed ? t('account.has_access').replace('{label}', label.toLowerCase()) : t('account.no_access').replace('{label}', label.toLowerCase())}>
    <Chip
      label={label}
      size="small"
      variant="outlined"
      color={allowed ? 'success' : 'default'}
      sx={{ opacity: allowed ? 1 : 0.5 }}
    />
  </Tooltip>
  );
};

export default AccountParishInfoPage;
