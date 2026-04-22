import { useEffect, useState } from 'react';
import { Box, Paper, Skeleton, Typography, useTheme } from '@mui/material';
import Grid2 from '@/components/compat/Grid2';
import {
  IconScan,
  IconCalendarStats,
  IconClipboardCheck,
} from '@tabler/icons-react';
import { apiClient } from '@/api/utils/axiosInstance';

interface OcrStats {
  totalDigitized: number;
  pagesThisMonth: number;
  pendingReview: number;
  monthLabel: string;
}

interface Props {
  churchId: number | null;
}

const tileMeta = [
  {
    key: 'totalDigitized' as const,
    label: 'Total OCR Records',
    icon: IconScan,
    color: '#3949ab',
  },
  {
    key: 'pagesThisMonth' as const,
    label: 'Pages This Month',
    icon: IconCalendarStats,
    color: '#039be5',
  },
  {
    key: 'pendingReview' as const,
    label: 'Pending Review',
    icon: IconClipboardCheck,
    color: '#fb8c00',
  },
];

const OcrStatsCard = ({ churchId }: Props) => {
  const theme = useTheme();
  const [stats, setStats] = useState<OcrStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!churchId) {
      setStats(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<any>(`/church/${churchId}/ocr/stats`);
        if (!cancelled) setStats(res.data || res);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.error || err?.message || 'Failed to load OCR stats');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [churchId]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#fff',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          OCR Digitization
        </Typography>
        {stats?.monthLabel && (
          <Typography variant="caption" color="text.secondary">
            {stats.monthLabel}
          </Typography>
        )}
      </Box>

      {error && (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      )}

      {!error && (
        <Grid2 container spacing={2}>
          {tileMeta.map(({ key, label, icon: Icon, color }) => (
            <Grid2 key={key} size={{ xs: 12, sm: 4 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: `${color}0F`,
                  border: '1px solid',
                  borderColor: `${color}33`,
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: `${color}1F`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={22} color={color} />
                </Box>
                <Box>
                  {loading ? (
                    <Skeleton variant="text" width={60} height={32} />
                  ) : (
                    <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.1 }}>
                      {(stats?.[key] ?? 0).toLocaleString()}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                </Box>
              </Box>
            </Grid2>
          ))}
        </Grid2>
      )}
    </Paper>
  );
};

export default OcrStatsCard;
