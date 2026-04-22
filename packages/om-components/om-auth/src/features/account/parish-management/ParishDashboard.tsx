/**
 * ParishDashboard — Overview page for Parish Management Hub.
 * Stats grid, quick actions, and recent activity.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, useTheme, CircularProgress } from '@mui/material';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined';
import { useChurch } from '@/context/ChurchContext';
import { useLanguage } from '@/context/LanguageContext';
import apiClient from '@/api/utils/axiosInstance';

const BASE = '/account/parish-management';

interface ParishStats {
  baptisms: number;
  marriages: number;
  funerals: number;
  total: number;
}

const quickActions = [
  {
    titleKey: 'parish.configure_database_mapping',
    descriptionKey: 'parish.configure_database_mapping_desc',
    href: `${BASE}/database-mapping`,
    Icon: StorageOutlinedIcon,
  },
  {
    titleKey: 'parish.customize_landing_page',
    descriptionKey: 'parish.customize_landing_page_desc',
    href: `${BASE}/landing-page-branding`,
    Icon: BrushOutlinedIcon,
  },
] as const;

const recentActivity = [
  { actionKey: 'parish.activity_mapping_updated', time: '2 hours ago', user: 'Admin' },
  { actionKey: 'parish.activity_theme_changed', time: '1 day ago', user: 'Fr. John' },
  { actionKey: 'parish.activity_new_baptism', time: '2 days ago', user: 'Secretary' },
] as const;

const statsDef = [
  { key: 'total' as const, nameKey: 'parish.total_records', icon: StorageOutlinedIcon },
  { key: 'baptisms' as const, nameKey: 'parish.baptisms', icon: PeopleOutlinedIcon },
  { key: 'marriages' as const, nameKey: 'parish.marriages', icon: EventOutlinedIcon },
  { key: 'funerals' as const, nameKey: 'parish.funerals', icon: PaletteOutlinedIcon },
] as const;

const ParishDashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { churchMetadata, activeChurchId } = useChurch();
  const { t } = useLanguage();
  const churchName = churchMetadata?.church_name_display || t('parish.default_title');

  const [stats, setStats] = useState<ParishStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeChurchId) return;
    let cancelled = false;
    setLoading(true);
    apiClient.get<ParishStats>(`/parish-stats/${activeChurchId}`).then((res) => {
      if (!cancelled) setStats(res);
    }).catch(() => {
      if (!cancelled) setStats(null);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [activeChurchId]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '1.25rem',
            fontWeight: 600,
            color: isDark ? '#f3f4f6' : '#111827',
            mb: 0.5,
          }}
        >
          {t('parish.parish_dashboard')}
        </Typography>
        <Typography
          sx={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.8125rem',
            color: isDark ? '#9ca3af' : '#6b7280',
          }}
        >
          {t('parish.dashboard_desc').replace('{name}', churchName)}
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {loading ? (
          <Box sx={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : statsDef.map((stat) => {
          const Icon = stat.icon;
          const value = stats ? stats[stat.key] : '—';
          return (
            <Paper
              key={stat.name}
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2,
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
                bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box
                  sx={{
                    p: 0.75,
                    borderRadius: 1.5,
                    bgcolor: isDark ? 'rgba(45,27,78,0.3)' : 'rgba(45,27,78,0.08)',
                  }}
                >
                  <Icon sx={{ fontSize: 20, color: isDark ? '#d4af37' : '#2d1b4e' }} />
                </Box>
              </Box>
              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '1.375rem',
                  fontWeight: 600,
                  color: isDark ? '#f3f4f6' : '#111827',
                  mb: 0.25,
                }}
              >
                {value}
              </Typography>
              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  color: isDark ? '#9ca3af' : '#6b7280',
                }}
              >
                {t(stat.nameKey)}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      {/* Quick Actions */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '1rem',
            fontWeight: 600,
            color: isDark ? '#f3f4f6' : '#111827',
            mb: 1.5,
          }}
        >
          {t('parish.quick_actions')}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
            gap: 2,
          }}
        >
          {quickActions.map((action) => {
            const { Icon } = action;
            return (
              <Paper
                key={action.titleKey}
                variant="outlined"
                onClick={() => navigate(action.href)}
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
                  bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s ease',
                  '&:hover': { boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.08)' },
                  '&:hover .action-arrow': { opacity: 1 },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1.5,
                      bgcolor: isDark ? 'rgba(45,27,78,0.3)' : 'rgba(45,27,78,0.08)',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    <Icon sx={{ fontSize: 22, color: isDark ? '#d4af37' : '#2d1b4e' }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography
                        sx={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: isDark ? '#f3f4f6' : '#111827',
                          mr: 0.5,
                        }}
                      >
                        {t(action.titleKey)}
                      </Typography>
                      <ArrowForwardIcon
                        className="action-arrow"
                        sx={{ fontSize: 16, opacity: 0, transition: 'opacity 0.2s', color: isDark ? '#d4af37' : '#2d1b4e' }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.75rem',
                        color: isDark ? '#9ca3af' : '#6b7280',
                        mt: 0.25,
                      }}
                    >
                      {t(action.descriptionKey)}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            );
          })}
        </Box>
      </Box>

      {/* Recent Activity */}
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 2,
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
          bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
        }}
      >
        <Typography
          sx={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '1rem',
            fontWeight: 600,
            color: isDark ? '#f3f4f6' : '#111827',
            mb: 2,
          }}
        >
          {t('parish.recent_activity')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {recentActivity.map((activity, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1.5,
                borderBottom: i < recentActivity.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` : 'none',
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: isDark ? '#f3f4f6' : '#111827',
                  }}
                >
                  {t(activity.actionKey)}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.75rem',
                    color: isDark ? '#6b7280' : '#9ca3af',
                  }}
                >
                  {activity.user}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.75rem',
                  color: isDark ? '#6b7280' : '#9ca3af',
                }}
              >
                {activity.time}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

export default ParishDashboard;
