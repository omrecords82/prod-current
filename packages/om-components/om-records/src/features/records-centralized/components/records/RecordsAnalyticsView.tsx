/**
 * RecordsAnalyticsView — Config-driven analytics dashboard for Records pages.
 *
 * Renders record-type-specific KPIs, charts, and insights using a shared
 * framework. Configuration is defined in analyticsConfig.ts.
 *
 * Data sources:
 *   /api/churches/:churchId/dashboard   — counts, YoY, completeness, recent
 *   /api/churches/:churchId/charts/summary — yearly, monthly, priest, age, seasonal
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Typography, Alert, useTheme } from '@mui/material';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';
import {
  IconDroplet, IconHeart, IconCross, IconChartBar,
  IconTrendingUp, IconTrendingDown,
} from '@tabler/icons-react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  PALETTE, ANALYTICS_CONFIGS, type RecordType, type RecordAnalyticsConfig,
  type AnalyticsContext,
} from './analyticsConfig';

/* ── Types ── */

interface DashboardData {
  counts: { baptisms: number; marriages: number; funerals: number; total: number };
  recentActivity: { name: string; type: 'baptism' | 'marriage' | 'funeral'; date: string }[];
  typeDistribution: { name: string; value: number }[];
  monthlyActivity: { month: string; baptism: number; marriage: number; funeral: number }[];
  yearOverYear: { currentYear: number; previousYear: number; current: number; previous: number; changePercent: number };
  completeness: number;
  dateRange: { earliest: number | null; latest: number | null };
}

interface ChartSummaryData {
  sacramentsByYear: Array<{ year: number; baptism: number; marriage: number; funeral: number }>;
  monthlyTrends: Array<{ month: string; baptism: number; marriage: number; funeral: number }>;
  byPriest: Array<{ name: string; count: number }>;
  baptismAge: Array<{ range: string; count: number }>;
  typeDistribution: Array<{ name: string; value: number }>;
  seasonalPatterns: Array<{ month: string; baptism: number; marriage: number; funeral: number }>;
}

interface Props {
  churchId: number | string;
  churchName?: string | null;
  recordType?: RecordType;
}

/* ══════════════════════════════════════════════════════════════ */
/*  SHARED UI COMPONENTS                                         */
/* ══════════════════════════════════════════════════════════════ */

/* ── Chart Card ── */
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

/* ── KPI Card ── */
const KpiCard: React.FC<{
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}> = ({ label, value, subtitle, icon: Icon, color }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <div className={`rounded-xl border shadow-sm p-6 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
          <p className={`text-3xl font-semibold mt-1 tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{subtitle}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
          <Icon size={20} color={color} />
        </div>
      </div>
    </div>
  );
};

/* ── Donut Center Label ── */
const DonutCenter: React.FC<{ total: number; label: string; isDark: boolean }> = ({ total, label, isDark }) => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 32 }}>
    <div className="text-center">
      <div className={`text-2xl font-bold tabular-nums ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{total.toLocaleString()}</div>
      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
    </div>
  </div>
);

/* ── Year-over-Year Comparison ── */
const YoYComparison: React.FC<{
  prevYear: number; prevCount: number;
  currYear: number; currCount: number;
  accentColor: string; isDark: boolean;
}> = ({ prevYear, prevCount, currYear, currCount, accentColor, isDark }) => {
  const maxVal = Math.max(currCount, prevCount, 1);
  const pct = prevCount > 0 ? Math.round(((currCount - prevCount) / prevCount) * 100) : (currCount > 0 ? 100 : 0);
  const isUp = pct > 0;
  const isDown = pct < 0;
  const trendColor = isUp ? '#22C55E' : isDown ? '#EF4444' : '#94A3B8';

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{prevYear}</span>
          <span className={`text-sm font-semibold tabular-nums ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{prevCount}</span>
        </div>
        <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max((prevCount / maxVal) * 100, 2)}%`, backgroundColor: isDark ? '#475569' : '#94A3B8' }} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{currYear}</span>
          <span className={`text-sm font-semibold tabular-nums ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{currCount}</span>
        </div>
        <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max((currCount / maxVal) * 100, 2)}%`, backgroundColor: accentColor }} />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${trendColor}18` }}>
          {isUp ? <IconTrendingUp size={14} color={trendColor} /> : isDown ? <IconTrendingDown size={14} color={trendColor} /> : <span className="w-2 h-0.5 rounded" style={{ backgroundColor: trendColor }} />}
        </div>
        <span className="text-sm font-semibold" style={{ color: trendColor }}>{isUp ? '+' : ''}{pct}%</span>
        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>year-over-year</span>
      </div>
    </div>
  );
};

/* ── Radial Completeness ── */
const CompletenessRadial: React.FC<{ value: number; dateRange: DashboardData['dateRange']; isDark: boolean }> = ({ value, dateRange, isDark }) => {
  const r = 60, sw = 10;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  const col = value >= 80 ? '#22C55E' : value >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex flex-col items-center">
      <svg width={148} height={148} viewBox="0 0 148 148" className="mb-3">
        <circle cx="74" cy="74" r={r} fill="none" stroke={isDark ? '#1e293b' : '#f1f5f9'} strokeWidth={sw} />
        <circle cx="74" cy="74" r={r} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 74 74)" className="transition-all duration-700" style={{ filter: `drop-shadow(0 0 4px ${col}40)` }} />
        <text x="74" y="68" textAnchor="middle" fill={isDark ? '#f1f5f9' : '#0f172a'} fontSize="26" fontWeight="700">{value}%</text>
        <text x="74" y="88" textAnchor="middle" fill={isDark ? '#94a3b8' : '#64748b'} fontSize="11">Complete</text>
      </svg>
      {dateRange.earliest && dateRange.latest && (
        <p className={`text-xs text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Records span {dateRange.earliest} &ndash; {dateRange.latest}</p>
      )}
    </div>
  );
};

/* ── Activity Timeline ── */
const ActivityTimeline: React.FC<{ items: DashboardData['recentActivity']; isDark: boolean }> = ({ items, isDark }) => {
  const cfg: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    baptism: { icon: IconDroplet, color: PALETTE.baptism, label: 'Baptism' },
    marriage: { icon: IconHeart, color: PALETTE.marriage, label: 'Marriage' },
    funeral: { icon: IconCross, color: PALETTE.funeral, label: 'Funeral' },
  };
  if (!items.length) return <div className={`flex items-center justify-center h-48 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No recent records</div>;
  return (
    <div className="space-y-1">
      {items.map((item, i) => {
        const c = cfg[item.type] || cfg.baptism;
        const Icon = c.icon;
        const d = item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        return (
          <div key={i} className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${c.color}18` }}>
              <Icon size={16} color={c.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{item.name || 'Unknown'}</p>
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{c.label} &middot; {d}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                               */
/* ══════════════════════════════════════════════════════════════ */

const RecordsAnalyticsView: React.FC<Props> = ({ churchId, churchName, recordType = 'baptism' }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const config: RecordAnalyticsConfig = ANALYTICS_CONFIGS[recordType] || ANALYTICS_CONFIGS.baptism;

  const isAllChurches = !churchId || Number(churchId) === 0;
  const effectiveChurchId = isAllChurches ? null : churchId;

  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [chartData, setChartData] = useState<ChartSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const labelColor = isDark ? '#cbd5e1' : '#475569';

  /* ── Fetch both APIs in parallel ── */
  const fetchData = useCallback(async () => {
    if (!effectiveChurchId) return;
    setLoading(true);
    setError(null);
    try {
      const [dashRes, chartRes] = await Promise.allSettled([
        apiClient.get(`/churches/${effectiveChurchId}/dashboard`),
        apiClient.get(`/churches/${effectiveChurchId}/charts/summary`),
      ]);

      if (dashRes.status === 'fulfilled') {
        const d: any = dashRes.value;
        setDashData(d.data || d);
      }
      if (chartRes.status === 'fulfilled') {
        const c: any = chartRes.value;
        if (c.success || c.data) setChartData(c.data || c);
      }

      if (dashRes.status === 'rejected' && chartRes.status === 'rejected') {
        setError('Failed to load analytics data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [effectiveChurchId]);

  useEffect(() => {
    if (!isAllChurches) fetchData();
    else { setLoading(false); setDashData(null); setChartData(null); }
  }, [fetchData, isAllChurches]);

  /* ── Build analytics context for KPI computations ── */
  const analyticsCtx: AnalyticsContext = useMemo(() => ({
    recordType,
    counts: dashData?.counts ?? { baptisms: 0, marriages: 0, funerals: 0, total: 0 },
    yearOverYear: dashData?.yearOverYear ?? null,
    chartData: chartData ? {
      sacramentsByYear: chartData.sacramentsByYear ?? [],
      monthlyTrends: chartData.monthlyTrends ?? [],
      byPriest: chartData.byPriest ?? [],
      baptismAge: chartData.baptismAge ?? [],
      seasonalPatterns: chartData.seasonalPatterns ?? [],
    } : null,
  }), [recordType, dashData, chartData]);

  /* ── Derived data ── */
  const counts = dashData?.counts ?? { baptisms: 0, marriages: 0, funerals: 0, total: 0 };
  const typeCount = recordType === 'baptism' ? counts.baptisms : recordType === 'marriage' ? counts.marriages : counts.funerals;
  const hasData = typeCount > 0 || (chartData?.sacramentsByYear?.some(r => (r[recordType] ?? 0) > 0));

  /* ── Monthly trend data (from charts/summary for richer history, or dashboard for last 12mo) ── */
  const trendData = useMemo(() => {
    const source = chartData?.monthlyTrends ?? dashData?.monthlyActivity ?? [];
    return source.map(d => {
      const [y, m] = d.month.split('-');
      const date = new Date(Number(y), Number(m) - 1);
      return { ...d, label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) };
    });
  }, [chartData?.monthlyTrends, dashData?.monthlyActivity]);

  /* ── Seasonal data ── */
  const seasonalData = useMemo(() => chartData?.seasonalPatterns ?? [], [chartData?.seasonalPatterns]);

  /* ── Clergy data (sorted desc) ── */
  const clergyData = useMemo(() =>
    chartData?.byPriest ? [...chartData.byPriest].sort((a, b) => b.count - a.count) : [],
    [chartData?.byPriest]
  );

  /* ── Baptism age data ── */
  const ageData = useMemo(() => chartData?.baptismAge ?? [], [chartData?.baptismAge]);

  /* ── Distribution ── */
  const distributionTotal = useMemo(() =>
    (chartData?.typeDistribution ?? dashData?.typeDistribution ?? []).reduce((s, d) => s + d.value, 0),
    [chartData?.typeDistribution, dashData?.typeDistribution]
  );
  const distributionData = useMemo(() =>
    chartData?.typeDistribution ?? dashData?.typeDistribution ?? [],
    [chartData?.typeDistribution, dashData?.typeDistribution]
  );
  const distributionColors = useMemo(() =>
    distributionData.map(d => {
      const k = d.name.toLowerCase();
      if (k.includes('baptism')) return PALETTE.baptism;
      if (k.includes('marriage')) return PALETTE.marriage;
      if (k.includes('funeral')) return PALETTE.funeral;
      return '#94a3b8';
    }),
    [distributionData]
  );

  /* ── Per-type YoY from sacramentsByYear ── */
  const typeYoY = useMemo(() => {
    if (!chartData?.sacramentsByYear?.length) return null;
    const currYr = new Date().getFullYear();
    const prevYr = currYr - 1;
    const curr = chartData.sacramentsByYear.find(r => r.year === currYr);
    const prev = chartData.sacramentsByYear.find(r => r.year === prevYr);
    return {
      currYear: currYr,
      prevYear: prevYr,
      currCount: curr ? (curr[recordType] ?? 0) : 0,
      prevCount: prev ? (prev[recordType] ?? 0) : 0,
    };
  }, [chartData?.sacramentsByYear, recordType]);

  /* ── Recent activity filtered to this record type ── */
  const filteredRecent = useMemo(() =>
    (dashData?.recentActivity ?? []).filter(r => r.type === recordType),
    [dashData?.recentActivity, recordType]
  );

  /* ── Early returns ── */
  if (isAllChurches) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
        <Typography variant="h6" sx={{ fontWeight: 500, mb: 0.5 }}>Select a specific church</Typography>
        <Typography variant="body2">Analytics are available when viewing records for a single church.</Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <div className="py-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className={`rounded-xl h-28 animate-pulse ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className={`rounded-xl h-80 animate-pulse ${isDark ? 'bg-slate-800' : 'bg-slate-100'} ${i === 1 ? 'lg:col-span-2' : ''}`} />)}
        </div>
      </div>
    );
  }

  if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;

  if (!dashData && !chartData) {
    const ConfigIcon = config.icon;
    return (
      <div className={`rounded-xl border shadow-sm py-20 px-8 text-center ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <ConfigIcon size={48} className={`mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
        <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{config.emptyTitle}</h3>
        <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{config.emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="py-4 max-w-[1600px]">
      {/* ── Header ── */}
      <div className="mb-6">
        <h2 className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          {churchName ? `${churchName} — ${config.title}` : config.title}
        </h2>
        <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{config.subtitle}</p>
      </div>

      <div className="space-y-6">

        {/* ════ KPI Row ════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {config.kpis.map(kpi => (
            <KpiCard
              key={kpi.id}
              label={kpi.label}
              value={kpi.getValue(analyticsCtx)}
              subtitle={kpi.getSubtitle?.(analyticsCtx)}
              icon={kpi.icon}
              color={kpi.color}
            />
          ))}
        </div>

        {/* ════ Chart Grid ════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

          {/* ── Trend Chart (large) ── */}
          <ChartCard title={config.trendChartTitle} subtitle={config.trendChartSubtitle} className="lg:col-span-2">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={trendData}>
                  <defs>
                    {(['baptism', 'marriage', 'funeral'] as const).map(t => (
                      <linearGradient key={t} id={`rav2Grad-${t}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PALETTE[t]} stopOpacity={t === recordType ? 0.35 : 0.08} />
                        <stop offset="100%" stopColor={PALETTE[t]} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="none" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 12 }} axisLine={{ stroke: gridStroke }} tickLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} width={35} />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 16, fontSize: 13, color: labelColor }} />
                  {(['baptism', 'marriage', 'funeral'] as const).map(t => (
                    <Area
                      key={t}
                      type="monotone"
                      dataKey={t}
                      name={t === 'baptism' ? 'Baptisms' : t === 'marriage' ? 'Marriages' : 'Funerals'}
                      stroke={PALETTE[t]}
                      fill={`url(#rav2Grad-${t})`}
                      strokeWidth={t === recordType ? 2.5 : 1}
                      strokeOpacity={t === recordType ? 1 : 0.4}
                      stackId="1"
                      animationDuration={400}
                      animationEasing="ease-out"
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className={`flex items-center justify-center h-80 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                No trend data available
              </div>
            )}
          </ChartCard>

          {/* ── Record Distribution — Donut ── */}
          {distributionData.length > 0 && distributionTotal > 0 && (
            <ChartCard title="Record Distribution" subtitle="Breakdown by sacrament type">
              <div className="relative">
                <DonutCenter total={distributionTotal} label="Total Records" isDark={isDark} />
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={distributionData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value" label={false} animationDuration={400} animationEasing="ease-out">
                      {distributionData.map((_, i) => <Cell key={i} fill={distributionColors[i]} style={{ outline: 'none' }} />)}
                    </Pie>
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: 16, fontSize: 13, color: labelColor }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          {/* ── Year-over-Year ── */}
          {typeYoY && (
            <ChartCard
              title="Year-over-Year"
              subtitle={`${typeYoY.prevYear} vs ${typeYoY.currYear} ${recordType} comparison`}
            >
              <YoYComparison
                prevYear={typeYoY.prevYear}
                prevCount={typeYoY.prevCount}
                currYear={typeYoY.currYear}
                currCount={typeYoY.currCount}
                accentColor={config.accentColor}
                isDark={isDark}
              />
            </ChartCard>
          )}

          {/* ── Baptism Age Distribution (baptism only) ── */}
          {config.showAgeDistribution && ageData.length > 0 && (
            <ChartCard title="Age at Reception" subtitle="Age distribution of baptismal candidates">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={ageData} barCategoryGap="15%">
                  <CartesianGrid stroke={gridStroke} strokeDasharray="none" vertical={false} />
                  <XAxis dataKey="range" tick={{ fill: axisColor, fontSize: 11 }} axisLine={{ stroke: gridStroke }} tickLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} width={35} />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Bar dataKey="count" name="Baptisms" fill={config.accentColor} radius={[4, 4, 0, 0]} animationDuration={400} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* ── Clergy Activity ── */}
          {clergyData.length > 0 && (
            <ChartCard title={config.clergyChartTitle} subtitle={config.clergyChartSubtitle}>
              <ResponsiveContainer width="100%" height={Math.max(320, clergyData.length * 36)}>
                <BarChart data={clergyData} layout="vertical" barCategoryGap="25%">
                  <CartesianGrid stroke={gridStroke} strokeDasharray="none" horizontal={false} />
                  <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={130} tick={{ fill: labelColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Bar dataKey="count" name="Sacraments" fill={config.accentColor} radius={[0, 4, 4, 0]} animationDuration={400} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* ── Seasonal Patterns ── */}
          {seasonalData.length > 0 && (
            <ChartCard title={config.seasonalChartTitle} subtitle={config.seasonalChartSubtitle}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={seasonalData} barCategoryGap="20%">
                  <CartesianGrid stroke={gridStroke} strokeDasharray="none" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 12 }} axisLine={{ stroke: gridStroke }} tickLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} width={35} />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Bar dataKey={recordType} name={config.title.replace(' Analytics', '')} fill={config.accentColor} radius={[4, 4, 0, 0]} animationDuration={400} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* ── Data Completeness ── */}
          {dashData && (
            <ChartCard title="Data Completeness" subtitle="Record quality assessment">
              <CompletenessRadial value={dashData.completeness} dateRange={dashData.dateRange} isDark={isDark} />
            </ChartCard>
          )}

          {/* ── Recent Records ── */}
          <ChartCard title={`Recent ${config.title.replace(' Analytics', '')} Records`} subtitle="Latest sacramental entries">
            <ActivityTimeline items={filteredRecent.length > 0 ? filteredRecent : (dashData?.recentActivity ?? [])} isDark={isDark} />
          </ChartCard>

        </div>
      </div>
    </div>
  );
};

export default RecordsAnalyticsView;
