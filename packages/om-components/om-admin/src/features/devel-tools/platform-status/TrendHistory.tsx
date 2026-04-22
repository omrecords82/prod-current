/**
 * TrendHistory — 24h trend charts for key platform metrics.
 * Self-contained component with own data fetching and state.
 * Extracted from PlatformStatusPage.tsx
 */
import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Grid,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  IconTrendingUp,
} from '@tabler/icons-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { apiClient } from '@/api/utils/axiosInstance';

// ─── Types ───────────────────────────────────────────────────────

interface SnapshotMetrics {
  connections: number;
  latency_ms: number;
  disk_usage_pct: number;
  last_backup_age_hours: number;
  app_cpu_usage_pct?: number;
  app_memory_used_pct?: number;
}

interface Snapshot {
  id: number;
  overall_status: string;
  metrics: SnapshotMetrics;
  created_at: string;
}

interface TrendPoint {
  time: string;
  ts: number;
  latency_ms: number;
  connections: number;
  disk_usage_pct: number;
  backup_age_hours: number;
  app_cpu_pct: number;
  app_mem_pct: number;
}

function formatAxisTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

const TREND_CHARTS: { key: keyof Omit<TrendPoint, 'time' | 'ts'>; label: string; unit: string; color: string; warnLine: number; critLine: number }[] = [
  { key: 'latency_ms', label: 'Query Latency', unit: 'ms', color: '#5c6bc0', warnLine: 50, critLine: 100 },
  { key: 'connections', label: 'Connections', unit: '', color: '#26a69a', warnLine: 150, critLine: 180 },
  { key: 'disk_usage_pct', label: 'DB Disk', unit: '%', color: '#ef5350', warnLine: 80, critLine: 90 },
  { key: 'backup_age_hours', label: 'Backup Age', unit: 'h', color: '#ffa726', warnLine: 12, critLine: 24 },
  { key: 'app_cpu_pct', label: 'VM CPU', unit: '%', color: '#ab47bc', warnLine: 85, critLine: 95 },
  { key: 'app_mem_pct', label: 'VM Memory', unit: '%', color: '#42a5f5', warnLine: 85, critLine: 95 },
];

const TrendChart: React.FC<{
  chart: typeof TREND_CHARTS[0];
  points: TrendPoint[];
  gridColor: string;
  textColor: string;
  isDark: boolean;
}> = ({ chart, points, gridColor, textColor, isDark }) => {
  const theme = useTheme();
  const values = points.map(p => p[chart.key] as number);
  const current = values[values.length - 1] ?? 0;
  const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const maxVal = Math.max(...values, chart.critLine * 1.1);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.3, px: 0.5 }}>
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.65rem' }}>
          {chart.label}
        </Typography>
        <Typography variant="caption" fontFamily="monospace" sx={{ fontSize: '0.65rem' }}>
          <Box component="span" fontWeight={700}>{current}{chart.unit}</Box>
          <Box component="span" color="text.disabled"> / avg {avg}{chart.unit}</Box>
        </Typography>
      </Stack>
      <Box sx={{ width: '100%', height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${chart.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chart.color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chart.color} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            {/* Warning zone */}
            <ReferenceArea
              y1={chart.warnLine}
              y2={chart.critLine}
              fill={theme.palette.warning.main}
              fillOpacity={0.04}
              ifOverflow="visible"
            />
            {/* Critical zone */}
            <ReferenceArea
              y1={chart.critLine}
              y2={maxVal}
              fill={theme.palette.error.main}
              fillOpacity={0.04}
              ifOverflow="visible"
            />
            <XAxis
              dataKey="ts" type="number" domain={['dataMin', 'dataMax']}
              tickFormatter={formatAxisTime}
              tick={{ fontSize: 9, fill: textColor }} stroke={gridColor}
              tickLine={false} minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 9, fill: textColor }} stroke={gridColor}
              tickLine={false} axisLine={false} width={36}
              domain={[0, maxVal]}
            />
            <RechartsTooltip
              labelFormatter={(ts: number) => new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              formatter={(v: number) => [`${v}${chart.unit}`, chart.label]}
              contentStyle={{
                fontSize: 11, borderRadius: 6, padding: '4px 8px',
                border: `1px solid ${gridColor}`,
                backgroundColor: isDark ? '#1e1e1e' : '#fff',
              }}
            />
            <ReferenceLine y={chart.warnLine} stroke={theme.palette.warning.main} strokeDasharray="4 3" strokeWidth={1} />
            <ReferenceLine y={chart.critLine} stroke={theme.palette.error.main} strokeDasharray="4 3" strokeWidth={1} />
            <Area
              type="monotone" dataKey={chart.key}
              stroke={chart.color} strokeWidth={1.5}
              fill={`url(#grad-${chart.key})`}
              dot={false} activeDot={{ r: 2.5, strokeWidth: 1 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

const TrendHistory: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [histError, setHistError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<{ snapshots: Snapshot[]; hours: number; count: number }>('/platform/status/history?hours=24')
      .then((res) => {
        const snaps: Snapshot[] = res.snapshots || [];
        const sorted = [...snaps].reverse();
        setPoints(sorted.map(s => ({
          time: new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ts: new Date(s.created_at).getTime(),
          latency_ms: s.metrics?.latency_ms ?? 0,
          connections: s.metrics?.connections ?? 0,
          disk_usage_pct: s.metrics?.disk_usage_pct ?? 0,
          backup_age_hours: s.metrics?.last_backup_age_hours ?? 0,
          app_cpu_pct: s.metrics?.app_cpu_usage_pct ?? 0,
          app_mem_pct: s.metrics?.app_memory_used_pct ?? 0,
        })));
      })
      .catch((err: any) => setHistError(err?.message || 'Failed to load history'))
      .finally(() => setHistLoading(false));
  }, []);

  if (histLoading) {
    return (
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, mb: 2 }}>
        <Skeleton width={160} height={20} sx={{ mb: 1 }} />
        <Grid container spacing={1.5}>
          {[0, 1, 2, 3].map(i => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  }

  if (histError) {
    return (
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">Could not load trends: {histError}</Typography>
      </Paper>
    );
  }

  if (points.length < 2) {
    return (
      <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={0.8}>
          <IconTrendingUp size={16} color={theme.palette.text.secondary} />
          <Typography variant="body2" color="text.secondary">
            Trends will appear after snapshots accumulate (~5 min intervals).
          </Typography>
        </Stack>
      </Paper>
    );
  }

  const activeCharts = TREND_CHARTS.filter(chart =>
    points.some(p => (p[chart.key] as number) > 0)
  );

  const gridColor = isDark ? '#2a2a2a' : '#e8e8e8';
  const textColor = theme.palette.text.secondary;

  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, mb: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.8}>
          <IconTrendingUp size={16} color={theme.palette.primary.main} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.8rem' }}>24h Trends</Typography>
        </Stack>
        <Typography variant="caption" fontFamily="monospace" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
          {points.length} snapshots
        </Typography>
      </Stack>

      <Grid container spacing={1.5}>
        {activeCharts.map(chart => (
          <Grid item xs={12} md={6} key={chart.key}>
            <TrendChart chart={chart} points={points} gridColor={gridColor} textColor={textColor} isDark={isDark} />
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default TrendHistory;
