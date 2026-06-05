/**
 * Diocesan Church Analytics Dashboard
 * Executive benchmarking across parishes within an OCA diocese.
 * Diocese assignments sourced from color-coded sales xlsx (ext_id → us_churches).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
  CartesianGrid, Legend, Cell, ScatterChart, Scatter, ZAxis, ComposedChart,
} from 'recharts';
import {
  Alert, Box, Button, Chip, CircularProgress, Drawer, FormControl, InputLabel,
  MenuItem, Select, Typography, useTheme,
} from '@mui/material';
import {
  IconArrowDown, IconArrowUp, IconDownload, IconMapPin, IconMinus,
} from '@tabler/icons-react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import PageContainer from '@/shared/ui/PageContainer';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  DIOCESAN_PALETTE, DIOCESE_PERIODS, DIOCESE_RECORD_TYPES, DIOCESE_PARISH_SIZES, DIOCESE_OPTIONS,
  type DiocesanParishRow, type VsAverage,
} from '@/features/records-centralized/components/records/analyticsConfig';

const MAPBOX_TOKEN = import.meta.env.VITE_APP_MAPBOX_ACCESS_TOKEN;

/* ── Types ── */

interface MetricCard {
  value: number;
  previous: number;
  changePercent: number;
  label?: string;
}

interface DashboardPayload {
  filters: {
    diocese: string;
    dioceseName: string;
    periodLabel: string;
    period: string;
    recordType: string;
    region: string;
    parishSize: string;
  };
  dioceses: Array<{ slug: string; name: string; directoryParishes: number; reportingParishes: number; color?: string }>;
  regions: string[];
  executiveSummary: Record<string, MetricCard & { churchId?: number; name?: string; reason?: string; value?: number | string }>;
  averages: { totalRecords: number; addedInPeriod: number; completeness: number; baptism: number; marriage: number; funeral: number };
  parishes: DiocesanParishRow[];
  charts: {
    recordsByParish: Array<{ churchId: number; name: string; total: number; baptism: number; marriage: number; funeral: number; custom: number }>;
    activityOverTime: Array<Record<string, number | string>>;
    growthComparison: Array<{ churchId: number; name: string; changePercent: number; diocesanAvg: number }>;
    completenessMatrix: Array<{ churchId: number; name: string; baptism: number; marriage: number; funeral: number; overall: number }>;
    geoParishes: Array<{ churchId: number; name: string; city: string; state: string; latitude: number; longitude: number; total: number; addedInPeriod: number; changePercent: number }>;
  };
  insights: Array<{ type: string; severity: string; title: string; detail: string; parishIds: number[] }>;
  meta: { source: string; computedAt: string; totalParishesInDiocese: number };
}

/* ── Helpers ── */

const VS_AVERAGE_STYLES: Record<VsAverage, { label: string; color: string; icon: React.ElementType }> = {
  above: { label: 'Above avg', color: DIOCESAN_PALETTE.above, icon: IconArrowUp },
  near: { label: 'Near avg', color: DIOCESAN_PALETTE.near, icon: IconMinus },
  below: { label: 'Below avg', color: DIOCESAN_PALETTE.below, icon: IconArrowDown },
  no_data: { label: 'No data', color: '#94a3b8', icon: IconMinus },
};

function truncateName(name: string, max = 22) {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

function exportCsv(parishes: DiocesanParishRow[], dioceseName: string) {
  const headers = ['Parish', 'City', 'State', 'Total Records', 'Baptisms', 'Marriages', 'Funerals', 'Added (Period)', 'Change %', 'Completeness', 'vs Average', 'Last Activity', 'Status'];
  const rows = parishes.map((p) => [
    p.name, p.city, p.state, p.records.total, p.records.baptism, p.records.marriage, p.records.funeral,
    p.records.addedInPeriod, p.changePercent, p.records.completeness, p.vsDiocesanAverage,
    p.records.lastActivityAt || '', p.records.dataStatus,
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `diocesan-analytics-${dioceseName.replace(/\s+/g, '-').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Subcomponents ── */

const ChartShell: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; className?: string }> = ({
  title, subtitle, children, className = '',
}) => {
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

const SummaryCard: React.FC<{
  label: string;
  value: string | number;
  changePercent?: number;
  sublabel?: string;
  highlight?: boolean;
}> = ({ label, value, changePercent, sublabel, highlight }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const trend = changePercent ?? 0;
  const trendColor = trend > 0 ? DIOCESAN_PALETTE.above : trend < 0 ? DIOCESAN_PALETTE.below : DIOCESAN_PALETTE.near;

  return (
    <div
      className={`rounded-xl border p-5 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
      style={highlight ? { borderColor: DIOCESAN_PALETTE.gold } : undefined}
    >
      <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
      <p className={`text-2xl font-semibold mt-1 tabular-nums ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sublabel && <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{sublabel}</p>}
      {changePercent !== undefined && (
        <div className="flex items-center gap-1 mt-2 text-xs font-medium" style={{ color: trendColor }}>
          {trend > 0 ? <IconArrowUp size={14} /> : trend < 0 ? <IconArrowDown size={14} /> : <IconMinus size={14} />}
          {trend > 0 ? '+' : ''}{trend}% vs prior period
        </div>
      )}
    </div>
  );
};

const VsBadge: React.FC<{ status: VsAverage }> = ({ status }) => {
  const cfg = VS_AVERAGE_STYLES[status];
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
};

/* ══════════════════════════════════════════════════════════════ */
/*  MAIN DASHBOARD                                               */
/* ══════════════════════════════════════════════════════════════ */

const AnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [diocese, setDiocese] = useState('diocese-of-new-york-and-new-jersey');
  const [period, setPeriod] = useState('12m');
  const [recordType, setRecordType] = useState('all');
  const [region, setRegion] = useState('all');
  const [parishSize, setParishSize] = useState('all');
  const [highlightIds, setHighlightIds] = useState<number[]>([]);
  const [selectedParish, setSelectedParish] = useState<DiocesanParishRow | null>(null);

  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const axisColor = isDark ? '#94a3b8' : '#64748b';

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/analytics/diocesan-dashboard', {
        params: { diocese, period, recordType, region, parishSize },
      });
      setData(res.data || res);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to load diocesan dashboard');
    } finally {
      setLoading(false);
    }
  }, [diocese, period, recordType, region, parishSize]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const parishes = data?.parishes ?? [];
  const [mapPopup, setMapPopup] = useState<any | null>(null);

  const center = useMemo(() => {
    const geo = data?.charts.geoParishes ?? [];
    if (!geo.length) return { latitude: 40.7128, longitude: -74.0060, zoom: 7 };
    const lats = geo.map((g) => g.latitude).filter(Boolean);
    const lngs = geo.map((g) => g.longitude).filter(Boolean);
    if (!lats.length || !lngs.length) return { latitude: 40.7128, longitude: -74.0060, zoom: 7 };
    const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
    return { latitude: avgLat, longitude: avgLng, zoom: 7.5 };
  }, [data?.charts.geoParishes]);

  const sacramentalRatioStats = useMemo(() => {
    const reporting = parishes.filter((p) => p.records.total > 0);
    if (!reporting.length) return { avgRatio: 0, highest: null, lowest: null };

    let totalB = 0;
    let totalF = 0;
    let highestRatio = -1;
    let highestParish: DiocesanParishRow | null = null;
    let lowestRatio = 9999;
    let lowestParish: DiocesanParishRow | null = null;

    reporting.forEach((p) => {
      const b = p.records.baptism ?? 0;
      const f = p.records.funeral ?? 0;
      totalB += b;
      totalF += f;

      if (f > 0) {
        const ratio = b / f;
        if (ratio > highestRatio) {
          highestRatio = ratio;
          highestParish = p;
        }
        if (ratio < lowestRatio) {
          lowestRatio = ratio;
          lowestParish = p;
        }
      }
    });

    const avgRatio = totalF > 0 ? totalB / totalF : 0;
    return {
      avgRatio: parseFloat(avgRatio.toFixed(2)),
      highest: highestParish ? { name: highestParish.name, ratio: parseFloat(highestRatio.toFixed(2)) } : null,
      lowest: lowestParish ? { name: lowestParish.name, ratio: parseFloat(lowestRatio.toFixed(2)) } : null,
    };
  }, [parishes]);

  const topParishesChart = useMemo(
    () => (data?.charts.recordsByParish ?? []).slice(0, 20),
    [data?.charts.recordsByParish],
  );

  const lineColors = useMemo(() => {
    const palette = ['#c9a14a', '#6366F1', '#22C55E', '#F59E0B', '#3b82f6', '#ec4899', '#14b8a6'];
    const map: Record<number, string> = {};
    parishes.forEach((p, i) => { map[p.churchId] = palette[i % palette.length]; });
    return map;
  }, [parishes]);

  const highlightedSet = useMemo(() => new Set(highlightIds), [highlightIds]);

  const toggleHighlight = (id: number) => {
    setHighlightIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const es = data?.executiveSummary;

  const selectSx = {
    minWidth: 160,
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      backgroundColor: isDark ? 'rgba(30,41,59,0.6)' : DIOCESAN_PALETTE.cream,
    },
  };

  return (
    <PageContainer
      title="Diocesan Analytics"
      description="Executive parish benchmarking and record activity across your diocese"
    >
      <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, md: 3 }, pb: 6 }}>
        {/* Header */}
        <div className="mb-6 pt-2">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: DIOCESAN_PALETTE.gold }}>
                Orthodox Metrics · Diocesan Leadership
              </p>
              <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                {data?.filters.dioceseName || 'Diocesan Church Analytics'}
              </h1>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Compare parish performance, trends, and data quality — {data?.filters.periodLabel || 'loading…'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="small"
                variant="outlined"
                startIcon={<IconDownload size={16} />}
                onClick={() => data && exportCsv(parishes, data.filters.dioceseName)}
                disabled={!parishes.length}
                sx={{ borderColor: DIOCESAN_PALETTE.gold, color: DIOCESAN_PALETTE.gold }}
              >
                Export CSV
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => window.print()}
                sx={{ borderColor: isDark ? '#475569' : '#cbd5e1' }}
              >
                Print / PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          className={`sticky top-0 z-10 rounded-xl border p-4 mb-6 flex flex-wrap gap-3 items-end ${isDark ? 'bg-slate-900/95 border-slate-700 backdrop-blur' : 'bg-white/95 border-slate-200 backdrop-blur'}`}
        >
          <FormControl size="small" sx={selectSx}>
            <InputLabel>Diocese</InputLabel>
            <Select label="Diocese" value={diocese} onChange={(e) => setDiocese(e.target.value)}>
              {(data?.dioceses?.length ? data.dioceses : DIOCESE_OPTIONS).map((d) => (
                <MenuItem key={d.slug} value={d.slug}>{d.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={selectSx}>
            <InputLabel>Reporting period</InputLabel>
            <Select label="Reporting period" value={period} onChange={(e) => setPeriod(e.target.value)}>
              {DIOCESE_PERIODS.map((p) => <MenuItem key={p.id} value={p.id}>{p.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={selectSx}>
            <InputLabel>Record type</InputLabel>
            <Select label="Record type" value={recordType} onChange={(e) => setRecordType(e.target.value)}>
              {DIOCESE_RECORD_TYPES.map((r) => <MenuItem key={r.id} value={r.id}>{r.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={selectSx}>
            <InputLabel>Geographic region</InputLabel>
            <Select label="Geographic region" value={region} onChange={(e) => setRegion(e.target.value)}>
              {(data?.regions ?? ['all']).map((r) => <MenuItem key={r} value={r}>{r === 'all' ? 'All regions' : r}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={selectSx}>
            <InputLabel>Parish size</InputLabel>
            <Select label="Parish size" value={parishSize} onChange={(e) => setParishSize(e.target.value)}>
              {DIOCESE_PARISH_SIZES.map((s) => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
            </Select>
          </FormControl>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <CircularProgress sx={{ color: DIOCESAN_PALETTE.gold }} />
            <Typography color="textSecondary">Loading diocesan analytics…</Typography>
          </div>
        )}

        {error && !loading && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}

        {!loading && !error && data && parishes.length === 0 && (
          <Alert severity="info">
            No reporting parishes found for this diocese and filter combination.
            Diocese assignments are loaded from the color-coded OCA sales workbook.
          </Alert>
        )}

        {!loading && !error && data && parishes.length > 0 && (
          <>
            {/* Executive summary */}
            <section className="mb-8">
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Executive Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard
                  label="Parishes reporting"
                  value={es?.totalParishesReporting?.value ?? 0}
                  changePercent={es?.totalParishesReporting?.changePercent}
                  sublabel={es?.totalParishesReporting?.label}
                />
                <SummaryCard
                  label="Total records managed"
                  value={es?.totalRecordsManaged?.value ?? 0}
                  changePercent={es?.totalRecordsManaged?.changePercent}
                />
                <SummaryCard
                  label="Records added (period)"
                  value={es?.recordsAddedInPeriod?.value ?? 0}
                  changePercent={es?.recordsAddedInPeriod?.changePercent}
                />
                <SummaryCard
                  label="Avg records / parish"
                  value={es?.avgRecordsPerParish?.value ?? 0}
                  changePercent={es?.avgRecordsPerParish?.changePercent}
                />
                <SummaryCard
                  label="Participation rate"
                  value={`${es?.participationRate?.value ?? 0}%`}
                  sublabel={es?.participationRate?.label}
                />
                <SummaryCard
                  label="Diocesan growth rate"
                  value={`${es?.diocesanGrowthRate?.value ?? 0}%`}
                  changePercent={es?.diocesanGrowthRate?.changePercent}
                />
                <SummaryCard
                  label="Most active parish"
                  value={es?.mostActiveParish?.name ? truncateName(String(es.mostActiveParish.name), 28) : '—'}
                  sublabel={es?.mostActiveParish?.value != null ? `${es.mostActiveParish.value} added` : undefined}
                  highlight
                />
                <SummaryCard
                  label="Needs attention"
                  value={es?.parishRequiringAttention?.name ? truncateName(String(es.parishRequiringAttention.name), 28) : '—'}
                  sublabel={es?.parishRequiringAttention?.reason ? String(es.parishRequiringAttention.reason) : 'None flagged'}
                />
              </div>
            </section>

            {/* Insights */}
            {data.insights.length > 0 && (
              <section className="mb-8">
                <h2 className={`text-lg font-semibold mb-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Diocesan Insights</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.insights.map((ins, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-4 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
                      style={{ borderLeftWidth: 4, borderLeftColor: ins.severity === 'positive' ? DIOCESAN_PALETTE.above : ins.severity === 'warning' ? DIOCESAN_PALETTE.incomplete : DIOCESAN_PALETTE.gold }}
                    >
                      <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{ins.title}</p>
                      <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{ins.detail}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Comparison table */}
            <section className="mb-8">
              <ChartShell title="Parish Comparison" subtitle="Ranked by total records · click a row for drill-down">
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className={isDark ? 'text-slate-400 border-b border-slate-700' : 'text-slate-500 border-b border-slate-200'}>
                        <th className="text-left py-2 px-2 font-medium">Parish</th>
                        <th className="text-right py-2 px-2 font-medium">Total</th>
                        <th className="text-right py-2 px-2 font-medium">B</th>
                        <th className="text-right py-2 px-2 font-medium">M</th>
                        <th className="text-right py-2 px-2 font-medium">F</th>
                        <th className="text-right py-2 px-2 font-medium">Added</th>
                        <th className="text-right py-2 px-2 font-medium">Δ%</th>
                        <th className="text-right py-2 px-2 font-medium">Complete</th>
                        <th className="text-left py-2 px-2 font-medium">vs Avg</th>
                        <th className="text-left py-2 px-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parishes.map((p) => (
                        <tr
                          key={p.churchId}
                          onClick={() => setSelectedParish(p)}
                          className={`cursor-pointer border-b transition-colors ${isDark ? 'border-slate-800 hover:bg-slate-800/60' : 'border-slate-100 hover:bg-slate-50'}`}
                        >
                          <td className="py-2.5 px-2">
                            <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{p.name}</span>
                            <span className={`block text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{p.city}, {p.state}</span>
                          </td>
                          <td className="text-right py-2.5 px-2 tabular-nums">{p.records.total.toLocaleString()}</td>
                          <td className="text-right py-2.5 px-2 tabular-nums text-indigo-500">{p.records.baptism}</td>
                          <td className="text-right py-2.5 px-2 tabular-nums text-green-600">{p.records.marriage}</td>
                          <td className="text-right py-2.5 px-2 tabular-nums text-amber-600">{p.records.funeral}</td>
                          <td className="text-right py-2.5 px-2 tabular-nums">{p.records.addedInPeriod}</td>
                          <td className="text-right py-2.5 px-2 tabular-nums" style={{ color: p.changePercent >= 0 ? DIOCESAN_PALETTE.above : DIOCESAN_PALETTE.below }}>
                            {p.changePercent > 0 ? '+' : ''}{p.changePercent}%
                          </td>
                          <td className="text-right py-2.5 px-2 tabular-nums">{p.records.completeness}%</td>
                          <td className="py-2.5 px-2"><VsBadge status={p.vsDiocesanAverage} /></td>
                          <td className="py-2.5 px-2">
                            <Chip
                              size="small"
                              label={p.records.dataStatus.replace('_', ' ')}
                              sx={{
                                fontSize: '0.7rem',
                                bgcolor: p.records.dataStatus === 'live' ? `${DIOCESAN_PALETTE.above}22` : `${DIOCESAN_PALETTE.stale}22`,
                                color: p.records.dataStatus === 'live' ? DIOCESAN_PALETTE.above : DIOCESAN_PALETTE.stale,
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartShell>
            </section>

            {/* Charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ChartShell title="Records by Parish" subtitle="Top parishes by total sacramental records">
                <ResponsiveContainer width="100%" height={Math.max(280, topParishesChart.length * 28)}>
                  <BarChart data={topParishesChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                    <XAxis type="number" tick={{ fill: axisColor, fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fill: axisColor, fontSize: 10 }} tickFormatter={(v) => truncateName(v, 18)} />
                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: 8 }} />
                    <Bar dataKey="total" fill={DIOCESAN_PALETTE.navyMid} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartShell>

              <ChartShell title="Record-Type Distribution" subtitle="Baptism, marriage, and funeral mix by parish (top 12)">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={topParishesChart.slice(0, 12)} margin={{ bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 9 }} angle={-35} textAnchor="end" height={70} tickFormatter={(v) => truncateName(v, 14)} />
                    <YAxis tick={{ fill: axisColor, fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="baptism" stackId="a" fill={DIOCESAN_PALETTE.baptism} name="Baptism" />
                    <Bar dataKey="marriage" stackId="a" fill={DIOCESAN_PALETTE.marriage} name="Marriage" />
                    <Bar dataKey="funeral" stackId="a" fill={DIOCESAN_PALETTE.funeral} name="Funeral" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartShell>

              <ChartShell
                title="Parish Activity Over Time"
                subtitle="Click parish names in the table to highlight lines"
                className="lg:col-span-2"
              >
                <div className="flex flex-wrap gap-2 mb-3">
                  {parishes.slice(0, 10).map((p) => (
                    <Chip
                      key={p.churchId}
                      size="small"
                      label={truncateName(p.name, 16)}
                      onClick={() => toggleHighlight(p.churchId)}
                      sx={{
                        bgcolor: highlightedSet.has(p.churchId) ? `${lineColors[p.churchId]}33` : 'transparent',
                        borderColor: lineColors[p.churchId],
                        border: '1px solid',
                        opacity: highlightIds.length === 0 || highlightedSet.has(p.churchId) ? 1 : 0.35,
                      }}
                    />
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.charts.activityOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 10 }} />
                    <YAxis tick={{ fill: axisColor, fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: 8 }} />
                    {parishes.slice(0, 12).map((p) => (
                      <Line
                        key={p.churchId}
                        type="monotone"
                        dataKey={`p${p.churchId}`}
                        name={p.name}
                        stroke={lineColors[p.churchId]}
                        strokeWidth={highlightedSet.has(p.churchId) || highlightIds.length === 0 ? 2 : 1}
                        dot={false}
                        opacity={highlightIds.length === 0 || highlightedSet.has(p.churchId) ? 1 : 0.15}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartShell>

              <ChartShell title="Growth Comparison" subtitle="Period change % vs diocesan average">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={data.charts.growthComparison.slice(0, 16)} margin={{ bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 9 }} angle={-35} textAnchor="end" height={70} tickFormatter={(v) => truncateName(v, 12)} />
                    <YAxis tick={{ fill: axisColor, fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="changePercent" name="Parish %" radius={[4, 4, 0, 0]}>
                      {data.charts.growthComparison.slice(0, 16).map((entry, i) => (
                        <Cell key={i} fill={entry.changePercent >= 0 ? DIOCESAN_PALETTE.above : DIOCESAN_PALETTE.below} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="diocesanAvg" stroke={DIOCESAN_PALETTE.gold} strokeWidth={2} dot={false} name="Diocesan avg" />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartShell>

              <ChartShell title="Data Completeness Matrix" subtitle="Completeness % by record type">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.charts.completenessMatrix.slice(0, 14)} margin={{ bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 9 }} angle={-35} textAnchor="end" height={70} tickFormatter={(v) => truncateName(v, 12)} />
                    <YAxis domain={[0, 100]} tick={{ fill: axisColor, fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="baptism" fill={DIOCESAN_PALETTE.baptism} name="Baptism" />
                    <Bar dataKey="marriage" fill={DIOCESAN_PALETTE.marriage} name="Marriage" />
                    <Bar dataKey="funeral" fill={DIOCESAN_PALETTE.funeral} name="Funeral" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartShell>

              <ChartShell
                title="Geographic Parish Overview Map"
                subtitle="Marker size reflects record volume · Powered by Mapbox GL"
                className="lg:col-span-2"
              >
                {MAPBOX_TOKEN && data.charts.geoParishes.length > 0 ? (
                  <Box sx={{ position: 'relative', width: '100%', height: 420, borderRadius: '8px', overflow: 'hidden' }}>
                    <Map
                      initialViewState={{
                        latitude: center.latitude,
                        longitude: center.longitude,
                        zoom: center.zoom,
                      }}
                      mapboxAccessToken={MAPBOX_TOKEN}
                      mapStyle={isDark ? 'mapbox://styles/mapbox/dark-v10' : 'mapbox://styles/mapbox/light-v10'}
                      style={{ width: '100%', height: '100%' }}
                      attributionControl={false}
                    >
                      <NavigationControl position="top-left" showCompass={false} />
                      
                      {data.charts.geoParishes.map((p) => {
                        const markerSize = Math.max(20, Math.min(50, Math.round(p.total / 150) + 18));
                        return (
                          <Marker
                            key={p.churchId}
                            latitude={p.latitude}
                            longitude={p.longitude}
                            anchor="center"
                          >
                            <Box
                              onClick={(e) => {
                                e.stopPropagation();
                                setMapPopup(p);
                              }}
                              sx={{
                                width: markerSize,
                                height: markerSize,
                                borderRadius: '50%',
                                bgcolor: isDark ? 'rgba(201, 161, 74, 0.85)' : 'rgba(26, 54, 93, 0.85)',
                                border: '2px solid white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: `${Math.max(9, Math.min(13, Math.round(p.total / 500) + 9))}px`,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': {
                                  transform: 'scale(1.15)',
                                  bgcolor: '#c9a14a',
                                  zIndex: 10,
                                },
                                boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
                              }}
                            >
                              {p.total >= 1000 ? `${(p.total / 1000).toFixed(1)}k` : p.total}
                            </Box>
                          </Marker>
                        );
                      })}

                      {mapPopup && (
                        <Popup
                          latitude={mapPopup.latitude}
                          longitude={mapPopup.longitude}
                          onClose={() => setMapPopup(null)}
                          closeButton={true}
                          closeOnClick={false}
                          anchor="top"
                          maxWidth="280px"
                        >
                          <Box sx={{ p: 1, color: '#1a202c', fontFamily: 'Inter' }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                              {mapPopup.name}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 1, fontSize: '11px' }}>
                              {mapPopup.city}, {mapPopup.state}
                            </Typography>
                            <Divider sx={{ my: 0.5 }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1, fontSize: '11px' }}>
                              <div><strong>Total Registers:</strong> {mapPopup.total.toLocaleString()}</div>
                              <div><strong>Added (Period):</strong> {mapPopup.addedInPeriod}</div>
                              <div>
                                <strong>Growth:</strong>{' '}
                                <span style={{ color: mapPopup.changePercent >= 0 ? 'green' : 'red', fontWeight: 600 }}>
                                  {mapPopup.changePercent >= 0 ? '+' : ''}{mapPopup.changePercent}%
                                </span>
                              </div>
                            </Box>
                            <Button
                              size="small"
                              variant="contained"
                              fullWidth
                              onClick={() => {
                                const hit = parishes.find((parish) => parish.churchId === mapPopup.churchId);
                                if (hit) setSelectedParish(hit);
                                setMapPopup(null);
                              }}
                              sx={{ mt: 1.5, py: 0.5, fontSize: '10px', bgcolor: '#1a365d', '&:hover': { bgcolor: '#2c5282' } }}
                            >
                              Explore Parish Details
                            </Button>
                          </Box>
                        </Popup>
                      )}
                    </Map>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justify',
                      justifyContent: 'center',
                      height: 420,
                      borderRadius: '8px',
                      border: '1px dashed border.main',
                      bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                      p: 3,
                      textAlign: 'center',
                    }}
                  >
                    <IconMapPin size={36} color="#c9a14a" style={{ marginBottom: '12px' }} />
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Mapbox Access Token Required
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 300, mx: 'auto', mb: 2 }}>
                      Configure `VITE_APP_MAPBOX_ACCESS_TOKEN` in your environment files to display the interactive geographic map.
                    </Typography>
                  </Box>
                )}
              </ChartShell>

              {/* Additional useful statistics - Demographic Vitality Panel */}
              <ChartShell
                title="Sacramental & Vitality Benchmarks"
                subtitle="Demographic growth trends based on sacrament registries"
                className="lg:col-span-2"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
                  <div className={`rounded-xl border p-4 flex flex-col justify-between ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div>
                      <Typography variant="caption" sx={{ textTransform: 'uppercase', tracking: '0.1em', fontWeight: 600, color: 'text.secondary' }}>
                        Demographic Renewal Ratio
                      </Typography>
                      <Typography variant="h4" fontWeight={700} sx={{ color: DIOCESAN_PALETTE.gold, mt: 1, tabularNums: true }}>
                        {sacramentalRatioStats.avgRatio}x
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1, fontSize: '12px', leading: 1.3 }}>
                        Ratio of Baptisms to Funerals. A ratio &gt; 1.0x indicates generational renewal and growth.
                      </Typography>
                    </div>
                    {sacramentalRatioStats.highest && (
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 block uppercase">Highest Ratio</span>
                        <span className="text-xs font-semibold block truncate text-slate-700 dark:text-slate-300">{sacramentalRatioStats.highest.name}</span>
                        <span className="text-xs font-medium text-green-500">{sacramentalRatioStats.highest.ratio}x ratio</span>
                      </div>
                    )}
                  </div>

                  <div className={`rounded-xl border p-4 flex flex-col justify-between ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div>
                      <Typography variant="caption" sx={{ textTransform: 'uppercase', tracking: '0.1em', fontWeight: 600, color: 'text.secondary' }}>
                        Data Completion Health
                      </Typography>
                      <Typography variant="h4" fontWeight={700} sx={{ color: DIOCESAN_PALETTE.above, mt: 1, tabularNums: true }}>
                        {averages.completeness}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1, fontSize: '12px', leading: 1.3 }}>
                        Average completeness of required canonical fields across all reporting parishes.
                      </Typography>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 font-sans">
                      <span className="text-[10px] text-slate-400 block uppercase">Field Completeness Target</span>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${averages.completeness}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-xl border p-4 flex flex-col justify-between ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <div>
                      <Typography variant="caption" sx={{ textTransform: 'uppercase', tracking: '0.1em', fontWeight: 600, color: 'text.secondary' }}>
                        Operational Active Status
                      </Typography>
                      <Typography variant="h4" fontWeight={700} sx={{ color: DIOCESAN_PALETTE.navyMid, mt: 1, tabularNums: true }}>
                        {parishes.filter(p => p.records.dataStatus === 'live').length} / {parishes.length}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1, fontSize: '12px', leading: 1.3 }}>
                        Parishes with live, real-time sync connections compared to stale or offline databases.
                      </Typography>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                      <span className="text-slate-400">Sync Status rate:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {Math.round((parishes.filter(p => p.records.dataStatus === 'live').length / Math.max(1, parishes.length)) * 100)}% active
                      </span>
                    </div>
                  </div>
                </div>
              </ChartShell>
            </div>

            <p className={`text-xs text-center ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              Diocese mapping: {data.meta.source} · {data.meta.totalParishesInDiocese} reporting parishes · Updated {new Date(data.meta.computedAt).toLocaleString()}
            </p>
          </>
        )}
      </Box>

      {/* Drill-down drawer */}
      <Drawer
        anchor="right"
        open={!!selectedParish}
        onClose={() => setSelectedParish(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 400 }, p: 3 } }}
      >
        {selectedParish && data && (
          <div>
            <Typography variant="h6" fontWeight={700} gutterBottom>{selectedParish.name}</Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {selectedParish.city}, {selectedParish.state} · {selectedParish.region}
            </Typography>
            <Chip size="small" label={selectedParish.parishSize} sx={{ mr: 1, mb: 2 }} />
            <VsBadge status={selectedParish.vsDiocesanAverage} />

            <div className="grid grid-cols-2 gap-3 my-4">
              <SummaryCard label="Total records" value={selectedParish.records.total} />
              <SummaryCard label="Added (period)" value={selectedParish.records.addedInPeriod} changePercent={selectedParish.changePercent} />
              <SummaryCard label="Completeness" value={`${selectedParish.records.completeness}%`} />
              <SummaryCard label="Diocesan avg (total)" value={data.averages.totalRecords} />
            </div>

            <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 2, mb: 1 }}>Similar-sized parishes</Typography>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Avg among {selectedParish.parishSize} parishes:{' '}
              {Math.round(
                parishes.filter((p) => p.parishSize === selectedParish.parishSize).reduce((s, p) => s + p.records.total, 0)
                / Math.max(parishes.filter((p) => p.parishSize === selectedParish.parishSize).length, 1)
              ).toLocaleString()} records
            </p>

            <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 3, mb: 1 }}>Data quality</Typography>
            <ul className={`text-sm space-y-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <li>Baptism completeness: {selectedParish.records.completenessByType.baptism}%</li>
              <li>Marriage completeness: {selectedParish.records.completenessByType.marriage}%</li>
              <li>Funeral completeness: {selectedParish.records.completenessByType.funeral}%</li>
              <li>Status: {selectedParish.records.dataStatus}</li>
              {selectedParish.records.lastActivityAt && (
                <li>Last activity: {new Date(selectedParish.records.lastActivityAt).toLocaleDateString()}</li>
              )}
            </ul>

            <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 3, mb: 1 }}>Recommended follow-up</Typography>
            <ul className={`text-sm space-y-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {selectedParish.records.dataStatus === 'stale' && <li>Confirm whether recent sacraments need to be entered or imported.</li>}
              {selectedParish.records.completeness < 70 && <li>Review missing required fields before diocesan reporting deadlines.</li>}
              {selectedParish.vsDiocesanAverage === 'below' && <li>Compare digitization progress with similar-sized parishes in the diocese.</li>}
              {selectedParish.records.dataStatus === 'live' && selectedParish.vsDiocesanAverage === 'above' && (
                <li>Consider sharing digitization practices with parishes reporting lower activity.</li>
              )}
            </ul>

            <Button fullWidth variant="contained" sx={{ mt: 4, bgcolor: DIOCESAN_PALETTE.navy, '&:hover': { bgcolor: DIOCESAN_PALETTE.navyMid } }} onClick={() => setSelectedParish(null)}>
              Close
            </Button>
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default AnalyticsDashboard;
