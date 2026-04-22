import { useState, useEffect } from 'react';
import { Box, Alert, Skeleton } from '@mui/material';
import Grid2 from '@/components/compat/Grid2';
import PageContainer from '@/shared/ui/PageContainer';
import { useChurch } from '@/context/ChurchContext';
import { apiClient } from '@/api/utils/axiosInstance';

import SacramentCountCards from './widgets/SacramentCountCards';
import SacramentsByYearChart from './widgets/SacramentsByYearChart';
import TypeDistributionChart from './widgets/TypeDistributionChart';
import RecentActivityList from './widgets/RecentActivityList';
import YearOverYearCard from './widgets/YearOverYearCard';
import CompletenessGauge from './widgets/CompletenessGauge';
import OcrStatsCard from './widgets/OcrStatsCard';

interface DashboardData {
  counts: { baptisms: number; marriages: number; funerals: number; total: number };
  recentActivity: { name: string; type: 'baptism' | 'marriage' | 'funeral'; date: string }[];
  typeDistribution: { name: string; value: number }[];
  monthlyActivity: { month: string; baptism: number; marriage: number; funeral: number }[];
  yearOverYear: { currentYear: number; previousYear: number; current: number; previous: number; changePercent: number };
  completeness: number;
  dateRange: { earliest: number | null; latest: number | null };
}

const Modern = () => {
  const { activeChurchId } = useChurch();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeChurchId) {
      setData(null);
      return;
    }

    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<any>(`/churches/${activeChurchId}/dashboard`);
        if (!cancelled) {
          setData(res.data || res);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.error || err?.message || 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [activeChurchId]);

  if (!activeChurchId) {
    return (
      <PageContainer title="Dashboard" description="Church Dashboard">
        <Alert severity="info" sx={{ mt: 2 }}>
          Select a church from the sidebar to view dashboard data.
        </Alert>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer title="Dashboard" description="Church Dashboard">
        <Box>
          <Grid2 container spacing={3}>
            <Grid2 size={12}>
              <Grid2 container spacing={3}>
                {[1, 2, 3, 4].map(i => (
                  <Grid2 key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                    <Skeleton variant="rounded" height={100} />
                  </Grid2>
                ))}
              </Grid2>
            </Grid2>
            <Grid2 size={{ xs: 12, lg: 8 }}><Skeleton variant="rounded" height={400} /></Grid2>
            <Grid2 size={{ xs: 12, lg: 4 }}><Skeleton variant="rounded" height={400} /></Grid2>
            <Grid2 size={{ xs: 12, md: 4 }}><Skeleton variant="rounded" height={350} /></Grid2>
            <Grid2 size={{ xs: 12, md: 4 }}><Skeleton variant="rounded" height={350} /></Grid2>
            <Grid2 size={{ xs: 12, md: 4 }}><Skeleton variant="rounded" height={350} /></Grid2>
          </Grid2>
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Dashboard" description="Church Dashboard">
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      </PageContainer>
    );
  }

  if (!data) return null;

  return (
    <PageContainer title="Dashboard" description="Church Dashboard">
      <Box>
        <Grid2 container spacing={3}>
          {/* Top row: 4 count cards */}
          <Grid2 size={12}>
            <SacramentCountCards counts={data.counts} yearOverYear={data.yearOverYear} />
          </Grid2>

          {/* OCR digitization widget */}
          <Grid2 size={12}>
            <OcrStatsCard churchId={activeChurchId} />
          </Grid2>

          {/* Middle row: bar chart + donut */}
          <Grid2 size={{ xs: 12, lg: 8 }}>
            <SacramentsByYearChart data={data.monthlyActivity} />
          </Grid2>
          <Grid2 size={{ xs: 12, lg: 4 }}>
            <TypeDistributionChart data={data.typeDistribution} />
          </Grid2>

          {/* Bottom row: recent activity, year-over-year, completeness */}
          <Grid2 size={{ xs: 12, md: 4 }}>
            <RecentActivityList data={data.recentActivity} />
          </Grid2>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <YearOverYearCard data={data.yearOverYear} />
          </Grid2>
          <Grid2 size={{ xs: 12, md: 4 }}>
            <CompletenessGauge value={data.completeness} dateRange={data.dateRange} />
          </Grid2>
        </Grid2>
      </Box>
    </PageContainer>
  );
};

export default Modern;
