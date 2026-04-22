import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, CircularProgress, Alert, Stack, Typography,
  FormControl, InputLabel, Select, MenuItem, useTheme,
} from '@mui/material';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';
import { IconDroplet, IconHeart, IconCross, IconChartBar, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/api/utils/axiosInstance';

/* ── Sacramental Color Palette ── */
const PALETTE = {
  baptism: '#6366F1',
  marriage: '#22C55E',
  funeral: '#F59E0B',
};
const PALETTE_HOVER = {
  baptism: '#818CF8',
  marriage: '#4ADE80',
  funeral: '#FBBF24',
};

/* ── Interfaces ── */
interface ChartData {
  sacramentsByYear: Array<{ year: number; baptism: number; marriage: number; funeral: number }>;
  monthlyTrends: Array<{ month: string; baptism: number; marriage: number; funeral: number }>;
  byPriest: Array<{ name: string; count: number }>;
  baptismAge: Array<{ range: string; count: number }>;
  typeDistribution: Array<{ name: string; value: number }>;
  seasonalPatterns: Array<{ month: string; baptism: number; marriage: number; funeral: number }>;
}

interface DashboardData {
  counts: { baptisms: number; marriages: number; funerals: number; total: number };
  recentActivity: { name: string; type: 'baptism' | 'marriage' | 'funeral'; date: string }[];
  typeDistribution: { name: string; value: number }[];
  monthlyActivity: { month: string; baptism: number; marriage: number; funeral: number }[];
  yearOverYear: { currentYear: number; previousYear: number; current: number; previous: number; changePercent: number };
  completeness: number;
  dateRange: { earliest: number | null; latest: number | null };
}

interface ChurchOption { id: number; name: string; }

/* ── Chart Card Wrapper ── */
const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, children, className = '' }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <div className={`rounded-xl border shadow-sm p-6 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} ${className}`}>
      <div className="mb-4">
        <h3 className={`text-base font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{title}</h3>
        {subtitle && <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
};

/* ── Custom Tooltip ── */
const AnalyticsTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm">
      <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600 dark:text-slate-300">{entry.name}</span>
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100 tabular-nums">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Donut Center Label ── */
const DonutCenter: React.FC<{ total: number; isDark: boolean }> = ({ total, isDark }) => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 32 }}>
    <div className="text-center">
      <div className={`text-2xl font-bold tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
        {total.toLocaleString()}
      </div>
      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Records</div>
    </div>
  </div>
);

/* ── KPI Card ── */
const KpiCard: React.FC<{
  label: string;
  value: number;
  subtitle?: string;
  trend?: number;
  icon: React.ElementType;
  color: string;
}> = ({ label, value, subtitle, trend, icon: Icon, color }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <div className={`rounded-xl border shadow-sm p-5 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
          <p className={`text-3xl font-semibold mt-1 tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {value.toLocaleString()}
          </p>
          {subtitle && <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{subtitle}</p>}
          {trend !== undefined && trend !== 0 && (
            <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {trend > 0 ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
              {trend > 0 ? '+' : ''}{trend}% from last year
            </div>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}18` }}
        >
          <Icon size={20} color={color} />
        </div>
      </div>
    </div>
  );
};

/* ── Empty State ── */
const EmptyState: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <div className={`rounded-xl border shadow-sm py-20 px-8 text-center ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
      <IconChartBar size={48} className={`mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
      <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
        No sacramental records available yet.
      </h3>
      <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        Once records are added, parish insights will appear here.
      </p>
    </div>
  );
};

/* ═══════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                     */
/* ═══════════════════════════════════════════════════ */

const OMChartsPage: React.FC = () => {
  const { churchId: paramChurchId } = useParams<{ churchId?: string }>();
  const { user } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [selectedChurchId, setSelectedChurchId] = useState<string | number>(
    paramChurchId || user?.church_id || ''
  );
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [loadingChurches, setLoadingChurches] = useState(false);

  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);

  const needsChurchPicker = !paramChurchId && (!user?.church_id || user?.role === 'super_admin');

  /* ── Chart theme tokens ── */
  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const labelColor = isDark ? '#cbd5e1' : '#475569';

  /* ── Fetch churches ── */
  useEffect(() => {
    if (!needsChurchPicker) return;
    const fetchChurches = async () => {
      setLoadingChurches(true);
      try {
        const res: any = await apiClient.get('/my/churches');
        const raw = res.data?.churches || res.churches || [];
        const list = (Array.isArray(raw) ? raw : [])
          .filter((c: any) => c.is_active !== false)
          .map((c: any) => ({ id: c.id, name: c.name || c.church_name || `Church ${c.id}` }));
        setChurches(list);
        if (list.length > 0 && !selectedChurchId) setSelectedChurchId(list[0].id);
      } catch (err) {
        console.error('Failed to fetch churches:', err);
      } finally {
        setLoadingChurches(false);
      }
    };
    fetchChurches();
  }, [needsChurchPicker]);

  /* ── Fetch chart data ── */
  const fetchChartData = useCallback(async (churchId: string | number) => {
    if (!churchId) return;
    try {
      setLoading(true);
      setError(null);
      setData(null);
      const res: any = await apiClient.get(`/churches/${churchId}/charts/summary`);
      if (res.success) setData(res.data);
      else setError(res.error?.message || res.error || 'Failed to load chart data');
    } catch (err: any) {
      if (err.status === 403) setError('OM Charts is not enabled for this church. Ask an administrator to enable it.');
      else setError(err.message || 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Fetch dashboard data ── */
  const fetchDashData = useCallback(async (churchId: string | number) => {
    if (!churchId) return;
    setDashLoading(true);
    try {
      const res = await apiClient.get<any>(`/churches/${churchId}/dashboard`);
      setDashData(res.data || res);
    } catch { /* non-critical */ }
    finally { setDashLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedChurchId) {
      fetchChartData(selectedChurchId);
      fetchDashData(selectedChurchId);
    }
  }, [selectedChurchId, fetchChartData, fetchDashData]);

  /* ── Derived data ── */
  const counts = dashData?.counts ?? { baptisms: 0, marriages: 0, funerals: 0, total: 0 };
  const yoy = dashData?.yearOverYear;
  const hasData = data && (data.sacramentsByYear.length > 0 || data.typeDistribution.some(d => d.value > 0));

  /* ── Sort priests by count descending ── */
  const sortedPriests = useMemo(() =>
    data?.byPriest ? [...data.byPriest].sort((a, b) => b.count - a.count) : [],
    [data?.byPriest]
  );

  /* ── Distribution total for donut center ── */
  const distributionTotal = useMemo(() =>
    data?.typeDistribution?.reduce((s, d) => s + d.value, 0) ?? 0,
    [data?.typeDistribution]
  );

  const distributionColors = useMemo(() =>
    data?.typeDistribution?.map(d => {
      const key = d.name.toLowerCase();
      if (key.includes('baptism')) return PALETTE.baptism;
      if (key.includes('marriage')) return PALETTE.marriage;
      if (key.includes('funeral')) return PALETTE.funeral;
      return '#94a3b8';
    }) ?? [],
    [data?.typeDistribution]
  );

  /* ── Loading ── */
  if (loadingChurches) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (needsChurchPicker && churches.length === 0 && !loadingChurches) {
    return <Alert severity="info" sx={{ mt: 2 }}>No churches available.</Alert>;
  }

  const isLoading = loading || dashLoading;

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* ── Header ── */}
      <Stack direction="row" alignItems="center" spacing={2} mb={1} flexWrap="wrap">
        <Typography variant="h4" fontWeight={700}>Parish Analytics</Typography>
        {needsChurchPicker && (
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <InputLabel>Church</InputLabel>
            <Select value={selectedChurchId} label="Church" onChange={(e) => setSelectedChurchId(e.target.value)}>
              {churches.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
        )}
      </Stack>
      <p className={`text-sm mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Sacramental records overview and historical trends
      </p>

      {/* ── Loading skeleton ── */}
      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`rounded-xl h-28 animate-pulse ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className={`rounded-xl h-80 animate-pulse ${isDark ? 'bg-slate-800' : 'bg-slate-100'} ${i === 1 ? 'lg:col-span-2' : ''}`} />
            ))}
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {!isLoading && error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {/* ── Empty state ── */}
      {!isLoading && !error && !hasData && selectedChurchId && <EmptyState />}

      {/* ── Dashboard content ── */}
      {!isLoading && !error && hasData && (
        <div className="space-y-6">

          {/* ════ PHASE 2: KPI Row ════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <KpiCard
              label="Total Sacraments"
              value={counts.total}
              icon={IconChartBar}
              color="#6366F1"
              trend={yoy?.changePercent}
            />
            <KpiCard
              label="Baptisms"
              value={counts.baptisms}
              subtitle={yoy ? `${yoy.currentYear} year-to-date` : undefined}
              icon={IconDroplet}
              color={PALETTE.baptism}
            />
            <KpiCard
              label="Marriages"
              value={counts.marriages}
              subtitle={yoy ? `${yoy.currentYear} year-to-date` : undefined}
              icon={IconHeart}
              color={PALETTE.marriage}
            />
            <KpiCard
              label="Funerals"
              value={counts.funerals}
              subtitle={yoy ? `${yoy.currentYear} year-to-date` : undefined}
              icon={IconCross}
              color={PALETTE.funeral}
            />
          </div>

          {/* ════ PHASE 3-4: Chart Grid with Hierarchy ════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

            {/* ── 1. Sacraments Over Time — Stacked Area (large) ── */}
            {data!.sacramentsByYear.length > 0 && (
              <ChartCard
                title="Sacraments Over Time"
                subtitle="Historical parish sacramental activity"
                className="lg:col-span-2"
              >
                <ResponsiveContainer width="100%" height={360}>
                  <AreaChart data={data!.sacramentsByYear}>
                    <defs>
                      <linearGradient id="gradBaptism" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PALETTE.baptism} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={PALETTE.baptism} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradMarriage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PALETTE.marriage} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={PALETTE.marriage} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradFuneral" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PALETTE.funeral} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={PALETTE.funeral} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={gridStroke} strokeDasharray="none" vertical={false} />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: axisColor, fontSize: 12 }}
                      axisLine={{ stroke: gridStroke }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: axisColor, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ paddingTop: 16, fontSize: 13, color: labelColor }}
                    />
                    <Area
                      type="monotone" dataKey="baptism" name="Baptisms"
                      stroke={PALETTE.baptism} fill="url(#gradBaptism)" strokeWidth={2}
                      stackId="1" animationDuration={400} animationEasing="ease-out"
                    />
                    <Area
                      type="monotone" dataKey="marriage" name="Marriages"
                      stroke={PALETTE.marriage} fill="url(#gradMarriage)" strokeWidth={2}
                      stackId="1" animationDuration={400} animationEasing="ease-out"
                    />
                    <Area
                      type="monotone" dataKey="funeral" name="Funerals"
                      stroke={PALETTE.funeral} fill="url(#gradFuneral)" strokeWidth={2}
                      stackId="1" animationDuration={400} animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* ── 2. Sacrament Distribution — Donut ── */}
            {data!.typeDistribution.length > 0 && (
              <ChartCard title="Sacrament Distribution" subtitle="Breakdown by record type">
                <div className="relative">
                  <DonutCenter total={distributionTotal} isDark={isDark} />
                  <ResponsiveContainer width="100%" height={360}>
                    <PieChart>
                      <Pie
                        data={data!.typeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={3}
                        dataKey="value"
                        animationDuration={400}
                        animationEasing="ease-out"
                        label={false}
                      >
                        {data!.typeDistribution.map((_, i) => (
                          <Cell key={i} fill={distributionColors[i]} style={{ outline: 'none' }} />
                        ))}
                      </Pie>
                      <Tooltip content={<AnalyticsTooltip />} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ paddingTop: 16, fontSize: 13, color: labelColor }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            )}

            {/* ── 3. Monthly Trends — Grouped Bar ── */}
            {data!.monthlyTrends.length > 0 && (
              <ChartCard title="Monthly Trends" subtitle="Sacramental activity by month">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data!.monthlyTrends} barCategoryGap="20%">
                    <CartesianGrid stroke={gridStroke} strokeDasharray="none" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: axisColor, fontSize: 11 }}
                      axisLine={{ stroke: gridStroke }}
                      tickLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 12, fontSize: 13, color: labelColor }} />
                    <Bar dataKey="baptism" name="Baptisms" fill={PALETTE.baptism} radius={[3, 3, 0, 0]} animationDuration={400} animationEasing="ease-out" />
                    <Bar dataKey="marriage" name="Marriages" fill={PALETTE.marriage} radius={[3, 3, 0, 0]} animationDuration={400} animationEasing="ease-out" />
                    <Bar dataKey="funeral" name="Funerals" fill={PALETTE.funeral} radius={[3, 3, 0, 0]} animationDuration={400} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* ── 4. Baptism Age Distribution — Histogram ── */}
            {data!.baptismAge.length > 0 && (
              <ChartCard title="Baptism Age at Reception" subtitle="Age distribution of baptismal candidates">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data!.baptismAge} barCategoryGap="15%">
                    <CartesianGrid stroke={gridStroke} strokeDasharray="none" vertical={false} />
                    <XAxis
                      dataKey="range"
                      tick={{ fill: axisColor, fontSize: 11 }}
                      axisLine={{ stroke: gridStroke }}
                      tickLine={false}
                    />
                    <YAxis tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Bar
                      dataKey="count" name="Baptisms"
                      fill={PALETTE.baptism}
                      radius={[4, 4, 0, 0]}
                      animationDuration={400}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* ── 5. Clergy Activity — Horizontal Bar ── */}
            {sortedPriests.length > 0 && (
              <ChartCard title="Clergy Activity" subtitle="Sacraments performed by priest">
                <ResponsiveContainer width="100%" height={Math.max(320, sortedPriests.length * 36)}>
                  <BarChart data={sortedPriests} layout="vertical" barCategoryGap="25%">
                    <CartesianGrid stroke={gridStroke} strokeDasharray="none" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: axisColor, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={130}
                      tick={{ fill: labelColor, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Bar
                      dataKey="count" name="Sacraments"
                      fill={PALETTE.baptism}
                      radius={[0, 4, 4, 0]}
                      animationDuration={400}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* ── 6. Seasonal Patterns — Stacked Monthly Bar ── */}
            {data!.seasonalPatterns.length > 0 && (
              <ChartCard title="Seasonal Patterns" subtitle="Monthly aggregates across all years">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data!.seasonalPatterns} barCategoryGap="20%">
                    <CartesianGrid stroke={gridStroke} strokeDasharray="none" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: axisColor, fontSize: 12 }}
                      axisLine={{ stroke: gridStroke }}
                      tickLine={false}
                    />
                    <YAxis tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 12, fontSize: 13, color: labelColor }} />
                    <Bar dataKey="baptism" name="Baptisms" stackId="season" fill={PALETTE.baptism} radius={[0, 0, 0, 0]} animationDuration={400} animationEasing="ease-out" />
                    <Bar dataKey="marriage" name="Marriages" stackId="season" fill={PALETTE.marriage} animationDuration={400} animationEasing="ease-out" />
                    <Bar dataKey="funeral" name="Funerals" stackId="season" fill={PALETTE.funeral} radius={[3, 3, 0, 0]} animationDuration={400} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default OMChartsPage;
