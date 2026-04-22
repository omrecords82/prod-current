/**
 * USChurchMapPage.tsx — Church Operations Hub
 *
 * Interactive choropleth map of Orthodox Churches in the United States.
 * Status-aware visualization with CRM pipeline + onboarding integration.
 * Located at /devel-tools/us-church-map
 *
 * Data:
 *   GET /api/analytics/us-church-counts        — choropleth base
 *   GET /api/analytics/us-church-status-counts  — per-state operational status
 *   GET /api/analytics/us-churches-enriched     — enriched church list (CRM + onboarding)
 *   GET /api/analytics/om-churches              — live platform church pins
 */

import { apiClient } from '@/api/utils/axiosInstance';

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
  ArrowBack as ArrowBackIcon,
  Business as ChurchIcon,
  CenterFocusStrong as ResetIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxBlankIcon,
  Download as DownloadIcon,
  IndeterminateCheckBox as IndeterminateCheckBoxIcon,
  Place as PlaceIcon,
  Refresh as RefreshIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from '@mui/icons-material';
import {
  Alert,
  alpha,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import ExportModal from './ExportModal';
import type { ExportFilters } from './ExportModal';
import ParishDetailMap, { AFFILIATION_COLORS, type ParishGeoJSON, type ParishProperties } from './ParishDetailMap';
import ChurchCard, { StatusBadge } from './ChurchCard';
import type { StateGeo, ChurchCountsResponse, StatusCountsResponse, EnrichedChurch, StateChurchesEnriched, OMChurch, OpStatus, ViewMode, MapMode } from './types';
import { REGIONS, COLOR_RAMP_LIGHT, COLOR_RAMP_DARK, NO_DATA_LIGHT, NO_DATA_DARK, STATUS_CONFIG, SVG_W, SVG_H, projectToAlbersUsa, LABEL_OFFSETS, getChurchDetailUrl } from './constants';
import { scaleQuantile } from 'd3-scale';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ═══════════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════════

const USChurchMapPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);

  // ─── State ─────────────────────────────────────────────
  const [geoData, setGeoData] = useState<Record<string, StateGeo> | null>(null);
  const [churchData, setChurchData] = useState<ChurchCountsResponse | null>(null);
  const [statusData, setStatusData] = useState<StatusCountsResponse | null>(null);
  const [omChurches, setOmChurches] = useState<OMChurch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interaction
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedChurch, setSelectedChurch] = useState<EnrichedChurch | null>(null);
  const [activeRegion, setActiveRegion] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // State drill-down
  const [stateChurches, setStateChurches] = useState<StateChurchesEnriched | null>(null);
  const [churchesLoading, setChurchesLoading] = useState(false);

  // Export & multi-select
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedChurchIds, setSelectedChurchIds] = useState<Set<number | string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // Parish detail mode
  const [mapMode, setMapMode] = useState<MapMode>('national');
  const [parishGeoData, setParishGeoData] = useState<ParishGeoJSON | null>(null);
  const [parishLoading, setParishLoading] = useState(false);
  const [affiliationFilter, setAffiliationFilter] = useState<Set<string>>(new Set());
  const [selectedParishId, setSelectedParishId] = useState<number | null>(null);
  const parishListRef = useRef<HTMLDivElement>(null);

  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/admin/control-panel', title: 'Control Panel' },
    { title: 'Church Map' },
  ];

  // ─── Data fetching ─────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [geoRes, countsRes, statusRes, omRes] = await Promise.all([
        fetch('/data/us-states-paths.json'),
        fetch('/api/analytics/us-church-counts', { credentials: 'include' }),
        fetch('/api/analytics/us-church-status-counts', { credentials: 'include' }),
        fetch('/api/analytics/om-churches', { credentials: 'include' }),
      ]);
      if (!geoRes.ok) throw new Error('Failed to load map geometry');
      if (!countsRes.ok) throw new Error('Failed to load church counts');

      setGeoData(await geoRes.json());
      setChurchData(await countsRes.json());
      setStatusData(statusRes.ok ? await statusRes.json() : null);
      setOmChurches(omRes.ok ? (await omRes.json()).churches || [] : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchStateChurches = useCallback(async (stateCode: string) => {
    setChurchesLoading(true);
    try {
      const data = await apiClient.get<any>(`/analytics/us-churches-enriched?state=${stateCode}`);
      setStateChurches(data);
      setJurisdictionFilter(null);
    } catch { /* non-critical */ }
    finally { setChurchesLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedState && mapMode === 'national') fetchStateChurches(selectedState);
  }, [selectedState, fetchStateChurches, mapMode]);

  // ─── Parish data fetching ──────────────────────────────
  const fetchParishGeoData = useCallback(async (stateCode: string) => {
    setParishLoading(true);
    try {
      const data: ParishGeoJSON = await apiClient.get<any>(`/analytics/church-map/parishes?state=${stateCode}`);
      setParishGeoData(data);
      setAffiliationFilter(new Set());
      setSelectedParishId(null);
    } catch (err: any) {
      console.error('Parish geo fetch failed:', err);
    } finally {
      setParishLoading(false);
    }
  }, []);

  const exitParishMode = useCallback(() => {
    setMapMode('national');
    setParishGeoData(null);
    setSelectedParishId(null);
    setAffiliationFilter(new Set());
    setSelectedState(null);
    setStateChurches(null);
  }, []);

  const toggleAffiliation = useCallback((aff: string) => {
    setAffiliationFilter(prev => {
      const next = new Set(prev);
      if (next.has(aff)) next.delete(aff); else next.add(aff);
      return next;
    });
  }, []);

  // Parish list items for sidebar
  const parishListItems = useMemo((): ParishProperties[] => {
    if (!parishGeoData) return [];
    let items = parishGeoData.features.map(f => f.properties);
    if (affiliationFilter.size > 0) {
      items = items.filter(p => affiliationFilter.has(p.affiliation_normalized));
    }
    if (viewMode === 'pipeline') items = items.filter(p => p.op_status === 'pipeline');
    else if (viewMode === 'onboarding') items = items.filter(p => p.op_status === 'onboarding');
    else if (viewMode === 'live') items = items.filter(p => p.op_status === 'live' || p.op_status === 'client');
    return items;
  }, [parishGeoData, affiliationFilter, viewMode]);

  // Scroll to selected parish in sidebar
  useEffect(() => {
    if (selectedParishId && parishListRef.current) {
      const el = parishListRef.current.querySelector(`[data-parish-id="${selectedParishId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedParishId]);

  // ─── Color scale ───────────────────────────────────────
  const colorScale = useMemo(() => {
    if (!churchData) return null;
    const values = Object.values(churchData.states);
    return scaleQuantile<string>().domain(values).range(isDark ? COLOR_RAMP_DARK : COLOR_RAMP_LIGHT);
  }, [churchData, isDark]);

  const getStateColor = useCallback((code: string) => {
    if (!churchData || !colorScale) return isDark ? NO_DATA_DARK : NO_DATA_LIGHT;
    const count = churchData.states[code];
    return count !== undefined ? colorScale(count) : (isDark ? NO_DATA_DARK : NO_DATA_LIGHT);
  }, [churchData, colorScale, isDark]);

  // State border highlight color based on highest non-directory status
  const getStateBorderColor = useCallback((code: string): string | null => {
    if (!statusData?.states[code]) return null;
    const s = statusData.states[code];
    if (s.live > 0) return STATUS_CONFIG.live.color;
    if (s.onboarding > 0) return STATUS_CONFIG.onboarding.color;
    if (s.pipeline > 0) return STATUS_CONFIG.pipeline.color;
    return null;
  }, [statusData]);

  // ─── Region filtering ─────────────────────────────────
  const regionStates = useMemo(() => {
    if (activeRegion === 'all') return null;
    return new Set(REGIONS[activeRegion]?.states || []);
  }, [activeRegion]);

  const isInRegion = useCallback((code: string) => !regionStates || regionStates.has(code), [regionStates]);

  // ─── Filtered churches ────────────────────────────────
  const filteredChurches = useMemo(() => {
    if (!stateChurches) return [];
    let list = stateChurches.churches;
    if (jurisdictionFilter) list = list.filter(c => c.jurisdiction === jurisdictionFilter);
    if (viewMode !== 'all') {
      if (viewMode === 'pipeline') list = list.filter(c => c.op_status === 'pipeline');
      else if (viewMode === 'onboarding') list = list.filter(c => c.op_status === 'onboarding');
      else if (viewMode === 'live') list = list.filter(c => c.op_status === 'live' || c.op_status === 'client');
    }
    return list;
  }, [stateChurches, jurisdictionFilter, viewMode]);

  // ─── Sorted states ────────────────────────────────────
  const sortedStates = useMemo(() => {
    if (!churchData) return [];
    return Object.entries(churchData.states).filter(([c]) => isInRegion(c)).sort((a, b) => b[1] - a[1]);
  }, [churchData, isInRegion]);

  // ─── Legend ────────────────────────────────────────────
  const legendItems = useMemo(() => {
    if (!colorScale || !churchData) return [];
    const q = colorScale.quantiles();
    const ramp = isDark ? COLOR_RAMP_DARK : COLOR_RAMP_LIGHT;
    const items: { color: string; label: string }[] = [
      { color: ramp[0], label: `${churchData.min}–${Math.floor(q[0]) - 1}` },
    ];
    for (let i = 0; i < q.length; i++) {
      const hi = i < q.length - 1 ? Math.floor(q[i + 1]) - 1 : churchData.max;
      items.push({ color: ramp[i + 1], label: `${Math.floor(q[i])}–${hi}` });
    }
    return items;
  }, [colorScale, churchData, isDark]);

  // ─── Region total ─────────────────────────────────────
  const regionTotal = useMemo(() => {
    if (!churchData) return 0;
    if (activeRegion === 'all') return churchData.total;
    return (REGIONS[activeRegion]?.states || []).reduce((s, c) => s + (churchData.states[c] || 0), 0);
  }, [churchData, activeRegion]);

  // ─── Global status totals ─────────────────────────────
  const globalTotals = statusData?.totals || { total: 0, directory: 0, pipeline: 0, onboarding: 0, live: 0 };

  // ─── Zoom/pan ─────────────────────────────────────────
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.3, 5));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.3, 0.5));
  const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); setSelectedState(null); setSelectedChurch(null); };

  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0 });
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
  }, [pan]);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.dragging) return;
    setPan({ x: dragRef.current.startPanX + (e.clientX - dragRef.current.startX) / zoom, y: dragRef.current.startPanY + (e.clientY - dragRef.current.startY) / zoom });
  }, [zoom]);
  const handleMouseUp = useCallback(() => { dragRef.current.dragging = false; }, []);

  // ─── Tooltip ──────────────────────────────────────────
  const handleStateHover = useCallback((e: React.MouseEvent, code: string) => {
    setHoveredState(code);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  // ─── State click ──────────────────────────────────────
  const handleStateClick = useCallback((code: string) => {
    setSelectedState(code);
    setSelectedChurch(null);
    setMapMode('parish');
    fetchParishGeoData(code);
    fetchStateChurches(code);
  }, [fetchParishGeoData, fetchStateChurches]);

  // ─── Church actions ───────────────────────────────────
  const handleChurchAction = useCallback((church: EnrichedChurch, action: string) => {
    if (action === 'view') {
      navigate(getChurchDetailUrl(church));
    } else if (action === 'onboard' || action === 'resume') {
      navigate(getChurchDetailUrl(church));
    }
  }, [navigate]);

  // ─── Church selection ────────────────────────────────
  const toggleChurchSelect = useCallback((id: number | string) => {
    setSelectedChurchIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!filteredChurches.length) return;
    const allSelected = filteredChurches.every(c => selectedChurchIds.has(c.id));
    if (allSelected) {
      setSelectedChurchIds(new Set());
    } else {
      setSelectedChurchIds(new Set(filteredChurches.map(c => c.id)));
    }
  }, [filteredChurches, selectedChurchIds]);

  // Clear selection when state/filters change
  useEffect(() => {
    setSelectedChurchIds(new Set());
  }, [selectedState, viewMode, jurisdictionFilter]);

  // Export filters object for the modal
  const exportFilters: ExportFilters = useMemo(() => ({
    viewMode,
    jurisdiction: jurisdictionFilter,
  }), [viewMode, jurisdictionFilter]);

  // ─── Selected state data ──────────────────────────────
  const selectedData = selectedState && churchData
    ? { code: selectedState, name: geoData?.[selectedState]?.name || selectedState, count: churchData.states[selectedState] || 0 }
    : null;

  const stateStatus = selectedState && statusData?.states[selectedState]
    ? statusData.states[selectedState]
    : null;

  // ─── Render ───────────────────────────────────────────

  if (loading) {
    return (
      <PageContainer title="Church Map" description="Church Operations Hub">
        <Breadcrumb title="Church Map" items={BCrumb} />
        <Box p={3}>
          <Paper sx={{ p: 3 }}>
            <Skeleton variant="text" width={300} height={40} />
            <Skeleton variant="rectangular" height={500} sx={{ mt: 2, borderRadius: 1 }} />
          </Paper>
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Church Map" description="Church Operations Hub">
        <Breadcrumb title="Church Map" items={BCrumb} />
        <Box p={3}>
          <Alert severity="error" action={<IconButton size="small" onClick={fetchData}><RefreshIcon /></IconButton>}>{error}</Alert>
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Church Map" description="Church Operations Hub">
      <Breadcrumb title="Church Operations Hub" items={BCrumb} />
      <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>

        {/* ══════════ HEADER BAR ══════════ */}
        <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <ChurchIcon sx={{ fontSize: 24, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Church Operations Hub
          </Typography>
          <Chip label={`${globalTotals.total.toLocaleString()} total`} variant="outlined" size="small" />
          {globalTotals.pipeline > 0 && (
            <Chip label={`${globalTotals.pipeline} pipeline`} size="small" sx={{ fontWeight: 600, bgcolor: alpha(STATUS_CONFIG.pipeline.color, 0.1), color: STATUS_CONFIG.pipeline.color }} />
          )}
          {globalTotals.onboarding > 0 && (
            <Chip label={`${globalTotals.onboarding} onboarding`} size="small" sx={{ fontWeight: 600, bgcolor: alpha(STATUS_CONFIG.onboarding.color, 0.1), color: STATUS_CONFIG.onboarding.color }} />
          )}
          {globalTotals.live > 0 && (
            <Chip label={`${globalTotals.live} live`} size="small" sx={{ fontWeight: 600, bgcolor: alpha(STATUS_CONFIG.live.color, 0.1), color: STATUS_CONFIG.live.color }} />
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => setExportOpen(true)}
            sx={{ textTransform: 'none', ml: 1 }}
          >
            Export
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => navigate('/admin/control-panel/onboarding-pipeline')}
            sx={{ textTransform: 'none' }}
          >
            Onboard Church
          </Button>
          <IconButton size="small" onClick={fetchData} title="Refresh"><RefreshIcon fontSize="small" /></IconButton>
        </Paper>

        {/* ══════════ VIEW MODE + REGION TABS ══════════ */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          {/* View mode */}
          <Paper sx={{ display: 'flex' }}>
            <Tabs value={viewMode} onChange={(_, v) => setViewMode(v)} sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0, textTransform: 'none', fontSize: '0.8rem' } }}>
              <Tab value="all" label="All Churches" />
              <Tab value="pipeline" label={`Pipeline${globalTotals.pipeline ? ` (${globalTotals.pipeline})` : ''}`} />
              <Tab value="onboarding" label={`Onboarding${globalTotals.onboarding ? ` (${globalTotals.onboarding})` : ''}`} />
              <Tab value="live" label={`Live${globalTotals.live ? ` (${globalTotals.live})` : ''}`} />
            </Tabs>
          </Paper>
          {/* Region */}
          <Paper sx={{ display: 'flex' }}>
            <Tabs value={activeRegion} onChange={(_, v) => setActiveRegion(v)} sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0, textTransform: 'none', fontSize: '0.8rem' } }}>
              {Object.entries(REGIONS).map(([k, r]) => <Tab key={k} value={k} label={r.label} />)}
            </Tabs>
          </Paper>
        </Box>

        {/* ══════════ MAP + SIDEBAR ══════════ */}
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', lg: 'row' } }}>

          {/* ──── MAP — Parish Detail (Mapbox GL) or National Overview (SVG) ──── */}
          {mapMode === 'parish' && parishGeoData ? (
            <Paper sx={{ flex: '1 1 auto', position: 'relative', overflow: 'hidden', minHeight: 500 }}>
              {parishLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 500 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : (
                <ParishDetailMap
                  geoData={parishGeoData}
                  selectedParishId={selectedParishId}
                  affiliationFilter={affiliationFilter}
                  statusFilter={viewMode}
                  onSelectParish={setSelectedParishId}
                  stateCode={selectedState || 'NY'}
                />
              )}
            </Paper>
          ) : (
            <Paper sx={{ flex: '1 1 auto', position: 'relative', overflow: 'hidden', cursor: dragRef.current.dragging ? 'grabbing' : 'grab', userSelect: 'none' }}>
              {/* Zoom controls */}
              <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <IconButton size="small" onClick={handleZoomIn} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.85) }}><ZoomInIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={handleZoomOut} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.85) }}><ZoomOutIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={handleReset} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.85) }}><ResetIcon fontSize="small" /></IconButton>
              </Box>

              <svg
                ref={svgRef}
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                style={{ width: '100%', height: 'auto', minHeight: 400 }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <g transform={`translate(${pan.x * zoom}, ${pan.y * zoom}) scale(${zoom})`}>
                  {/* State polygons */}
                  {geoData && Object.entries(geoData).map(([code, state]) => {
                    const inRegion = isInRegion(code);
                    const isHovered = hoveredState === code;
                    const isSelected = selectedState === code;
                    const borderColor = getStateBorderColor(code);

                    return (
                      <path
                        key={code}
                        d={state.path}
                        fill={getStateColor(code)}
                        stroke={isSelected ? (borderColor || (isDark ? '#fff' : '#333')) : borderColor || (isDark ? '#555' : '#fff')}
                        strokeWidth={(isHovered || isSelected ? 2.5 : borderColor ? 1.5 : 0.75) / zoom}
                        opacity={inRegion ? 1 : 0.2}
                        style={{
                          transition: 'fill 0.2s, opacity 0.3s, stroke-width 0.15s',
                          cursor: inRegion ? 'pointer' : 'default',
                          filter: isSelected ? `drop-shadow(0 0 ${3 / zoom}px ${isDark ? '#fff' : '#000'})` : undefined,
                        }}
                        onMouseMove={(e) => inRegion && handleStateHover(e, code)}
                        onMouseLeave={() => setHoveredState(null)}
                        onClick={() => inRegion && handleStateClick(code)}
                      />
                    );
                  })}

                  {/* State labels */}
                  {geoData && zoom >= 0.7 && Object.entries(geoData).map(([code, state]) => {
                    if (!isInRegion(code)) return null;
                    const off = LABEL_OFFSETS[code];
                    return (
                      <text
                        key={`lbl-${code}`}
                        x={off ? off.x : state.cx}
                        y={off ? off.y : state.cy}
                        textAnchor={off?.anchor || 'middle'}
                        dominantBaseline="central"
                        fontSize={10 / zoom}
                        fontWeight={selectedState === code ? 700 : 500}
                        fill={isDark ? '#ddd' : '#333'}
                        pointerEvents="none"
                        style={{ textShadow: isDark ? '0 0 3px #000' : '0 0 3px #fff' }}
                      >
                        {code}
                      </text>
                    );
                  })}

                  {/* OM Church pins */}
                  {omChurches.map(ch => {
                    const coords = projectToAlbersUsa(ch.longitude, ch.latitude);
                    if (!coords) return null;
                    const r = 6 / zoom;
                    return (
                      <Tooltip key={`pin-${ch.id}`} title={`${ch.church_name || ch.name} (Live Client)`} arrow>
                        <g style={{ cursor: 'pointer' }}>
                          <circle cx={coords[0]} cy={coords[1]} r={r} fill={STATUS_CONFIG.live.color} stroke="#fff" strokeWidth={1.5 / zoom}
                            style={{ filter: `drop-shadow(0 ${1 / zoom}px ${2 / zoom}px rgba(0,0,0,0.3))` }} />
                          <circle cx={coords[0]} cy={coords[1]} r={r * 0.4} fill="#fff" />
                        </g>
                      </Tooltip>
                    );
                  })}
                </g>
              </svg>

              {/* ── Legend ── */}
              <Box sx={{
                position: 'absolute', bottom: 12, left: 12,
                bgcolor: alpha(theme.palette.background.paper, 0.92), borderRadius: 1.5, p: 1.25,
                display: 'flex', flexDirection: 'column', gap: 0.3, minWidth: 140,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              }}>
                <Typography variant="caption" fontWeight={700} sx={{ mb: 0.25 }}>Churches per State</Typography>
                {legendItems.map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 14, height: 14, bgcolor: item.color, borderRadius: 0.5, border: `1px solid ${isDark ? '#555' : '#ccc'}` }} />
                    <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{item.label}</Typography>
                  </Box>
                ))}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                  <Box sx={{ width: 14, height: 14, bgcolor: isDark ? NO_DATA_DARK : NO_DATA_LIGHT, borderRadius: 0.5, border: `1px solid ${isDark ? '#555' : '#ccc'}` }} />
                  <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>No data</Typography>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <Typography variant="caption" fontWeight={700} sx={{ mb: 0.25 }}>Status</Typography>
                {(['live', 'onboarding', 'pipeline', 'directory'] as OpStatus[]).map(s => (
                  <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 14, height: 14, bgcolor: STATUS_CONFIG[s].color, borderRadius: s === 'live' || s === 'onboarding' ? '50%' : 0.5, border: `1px solid ${alpha(STATUS_CONFIG[s].color, 0.5)}` }} />
                    <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{STATUS_CONFIG[s].label}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {/* ──── SIDEBAR ──── */}
          <Paper sx={{
            width: { xs: '100%', lg: 400 }, flexShrink: 0,
            maxHeight: 700, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          }}>
            {selectedData ? (
              <>
                {/* ── State header ── */}
                <Box sx={{ p: 2, pb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <IconButton size="small" onClick={() => {
                      if (mapMode === 'parish') { exitParishMode(); }
                      else { setSelectedState(null); setStateChurches(null); setJurisdictionFilter(null); setSelectedChurch(null); }
                    }}>
                      <ArrowBackIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="h6" sx={{ flexGrow: 1, fontSize: '1.05rem' }}>
                      {selectedData.name}
                      {mapMode === 'parish' && (
                        <Typography component="span" variant="caption" sx={{ ml: 1, fontWeight: 600, color: 'primary.main' }}>Parish Map</Typography>
                      )}
                    </Typography>
                    <Chip label={selectedData.count.toLocaleString()} color="primary" size="small" />
                  </Box>

                  {/* ── State status summary ── */}
                  {stateStatus && (
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
                      {mapMode !== 'parish' && (
                        <Chip size="small" variant="outlined" label={`Rank #${sortedStates.findIndex(([c]) => c === selectedData.code) + 1}`} sx={{ height: 22, fontSize: '0.7rem' }} />
                      )}
                      {stateStatus.pipeline > 0 && (
                        <Chip size="small" label={`${stateStatus.pipeline} pipeline`} sx={{ height: 22, fontSize: '0.7rem', bgcolor: alpha(STATUS_CONFIG.pipeline.color, 0.1), color: STATUS_CONFIG.pipeline.color }} />
                      )}
                      {stateStatus.onboarding > 0 && (
                        <Chip size="small" label={`${stateStatus.onboarding} onboarding`} sx={{ height: 22, fontSize: '0.7rem', bgcolor: alpha(STATUS_CONFIG.onboarding.color, 0.1), color: STATUS_CONFIG.onboarding.color }} />
                      )}
                      {stateStatus.live > 0 && (
                        <Chip size="small" label={`${stateStatus.live} live`} sx={{ height: 22, fontSize: '0.7rem', bgcolor: alpha(STATUS_CONFIG.live.color, 0.1), color: STATUS_CONFIG.live.color }} />
                      )}
                    </Box>
                  )}

                  {/* ── Parish mode: affiliation multi-select chips ── */}
                  {mapMode === 'parish' && parishGeoData && parishGeoData.metadata.affiliations.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      <Chip
                        size="small"
                        label={`All (${parishGeoData.metadata.total})`}
                        color={affiliationFilter.size === 0 ? 'primary' : 'default'}
                        variant={affiliationFilter.size === 0 ? 'filled' : 'outlined'}
                        onClick={() => setAffiliationFilter(new Set())}
                        sx={{ fontSize: '0.68rem', height: 22 }}
                      />
                      {parishGeoData.metadata.affiliations.map((aff: { name: string; count: number }) => {
                        const isActive = affiliationFilter.has(aff.name);
                        const color = AFFILIATION_COLORS[aff.name] || '#757575';
                        return (
                          <Chip
                            key={aff.name}
                            size="small"
                            label={`${aff.name} (${aff.count})`}
                            variant={isActive ? 'filled' : 'outlined'}
                            onClick={() => toggleAffiliation(aff.name)}
                            sx={{
                              fontSize: '0.68rem', height: 22,
                              bgcolor: isActive ? alpha(color, 0.2) : 'transparent',
                              color: isActive ? color : 'text.secondary',
                              borderColor: isActive ? color : undefined,
                              fontWeight: isActive ? 700 : 500,
                              '&:hover': { bgcolor: alpha(color, 0.12) },
                            }}
                            icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, ml: '4px !important' }} />}
                          />
                        );
                      })}
                    </Box>
                  )}

                  {/* ── National mode: jurisdiction single-select chips ── */}
                  {mapMode !== 'parish' && stateChurches && stateChurches.jurisdictions.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      <Chip
                        size="small"
                        label={`All (${stateChurches.totalAll})`}
                        color={!jurisdictionFilter ? 'primary' : 'default'}
                        variant={!jurisdictionFilter ? 'filled' : 'outlined'}
                        onClick={() => setJurisdictionFilter(null)}
                        sx={{ fontSize: '0.68rem', height: 22 }}
                      />
                      {stateChurches.jurisdictions.map(j => (
                        <Chip
                          key={j.jurisdiction}
                          size="small"
                          label={`${j.jurisdiction} (${j.count})`}
                          color={jurisdictionFilter === j.jurisdiction ? 'primary' : 'default'}
                          variant={jurisdictionFilter === j.jurisdiction ? 'filled' : 'outlined'}
                          onClick={() => setJurisdictionFilter(jurisdictionFilter === j.jurisdiction ? null : j.jurisdiction)}
                          sx={{ fontSize: '0.68rem', height: 22 }}
                        />
                      ))}
                    </Box>
                  )}
                  <Divider sx={{ mt: 1.5 }} />
                </Box>

                {/* ── Parish list (parish mode) or Church list (national mode) ── */}
                {mapMode === 'parish' ? (
                  <Box ref={parishListRef} sx={{ flex: 1, overflow: 'auto', px: 1.5, pb: 1.5 }}>
                    {parishLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
                    ) : parishListItems.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No parishes match current filters</Typography>
                    ) : (
                      <>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, px: 0.5 }}>
                          Showing {parishListItems.length} of {parishGeoData?.metadata.total || 0}
                          {parishGeoData && parishGeoData.metadata.withoutCoordinates > 0 && (
                            <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 1 }}>
                              ({parishGeoData.metadata.withoutCoordinates} without map location)
                            </Typography>
                          )}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                          {parishListItems.map(parish => {
                            const isSelected = selectedParishId === parish.id;
                            const affColor = AFFILIATION_COLORS[parish.affiliation_normalized] || '#757575';
                            const statusCfg = STATUS_CONFIG[parish.op_status as OpStatus] || STATUS_CONFIG.directory;
                            return (
                              <Box key={parish.id} data-parish-id={parish.id}
                                onClick={() => setSelectedParishId(isSelected ? null : parish.id)}
                                sx={{
                                  p: 1.5, borderRadius: 1.5, cursor: 'pointer',
                                  border: isSelected ? `2px solid ${affColor}` : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                                  bgcolor: isSelected ? alpha(affColor, isDark ? 0.1 : 0.05) : 'transparent',
                                  '&:hover': { bgcolor: alpha(affColor, isDark ? 0.06 : 0.03) }, transition: 'all 0.15s',
                                }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: affColor, mt: 0.6, flexShrink: 0, border: `1.5px solid ${isDark ? '#333' : '#fff'}`, boxShadow: `0 0 0 1px ${alpha(affColor, 0.3)}` }} />
                                  <Typography variant="body2" fontWeight={600} sx={{ flex: 1, fontSize: '0.82rem', lineHeight: 1.35 }}>{parish.name}</Typography>
                                  <Chip
                                    label={statusCfg.label}
                                    size="small"
                                    sx={{ fontWeight: 600, fontSize: '0.65rem', height: 20, bgcolor: alpha(statusCfg.color, 0.12), color: statusCfg.color, border: `1px solid ${alpha(statusCfg.color, 0.3)}` }}
                                  />
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2.25, mb: 0.5 }}>
                                  <PlaceIcon sx={{ fontSize: 12 }} />
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                                    {parish.has_coordinates
                                      ? [parish.city, parish.state].filter(Boolean).join(', ') || '—'
                                      : <Typography component="span" variant="caption" color="warning.main" sx={{ fontStyle: 'italic' }}>Map location unavailable</Typography>
                                    }
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ml: 2.25, flexWrap: 'wrap' }}>
                                  <Chip label={parish.affiliation_normalized} size="small" sx={{
                                    fontSize: '0.6rem', height: 16, fontWeight: 600,
                                    bgcolor: alpha(affColor, 0.12), color: affColor,
                                    border: `1px solid ${alpha(affColor, 0.25)}`,
                                  }} />
                                  {parish.website && (
                                    <Link href={parish.website} target="_blank" rel="noopener" onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                      sx={{ display: 'flex', alignItems: 'center', gap: 0.25, textDecoration: 'none' }}>
                                      <WebIcon sx={{ fontSize: 11 }} />
                                      <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Web</Typography>
                                    </Link>
                                  )}
                                  {parish.phone && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                      <PhoneIcon sx={{ fontSize: 11, color: 'text.secondary' }} />
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{parish.phone}</Typography>
                                    </Box>
                                  )}
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      </>
                    )}
                  </Box>
                ) : (
                <Box sx={{ flex: 1, overflow: 'auto', px: 1.5, pb: 1.5 }}>
                  {churchesLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={28} />
                    </Box>
                  ) : filteredChurches.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                      No churches match current filters
                    </Typography>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, px: 0.5, gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                          Showing {filteredChurches.length} of {stateChurches?.totalAll || 0} churches
                        </Typography>
                        <Tooltip title={selectMode ? 'Exit selection' : 'Select churches for export'}>
                          <IconButton
                            size="small"
                            onClick={() => { setSelectMode(s => !s); if (selectMode) setSelectedChurchIds(new Set()); }}
                            sx={{ p: 0.25, color: selectMode ? 'primary.main' : 'text.secondary' }}
                          >
                            {selectMode ? <CheckBoxIcon sx={{ fontSize: 18 }} /> : <CheckBoxBlankIcon sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                      {selectMode && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, px: 0.5 }}>
                          <Checkbox
                            size="small"
                            checked={filteredChurches.length > 0 && filteredChurches.every(c => selectedChurchIds.has(c.id))}
                            indeterminate={selectedChurchIds.size > 0 && !filteredChurches.every(c => selectedChurchIds.has(c.id))}
                            onChange={toggleSelectAll}
                            sx={{ p: 0 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {selectedChurchIds.size > 0 ? `${selectedChurchIds.size} selected` : 'Select all'}
                          </Typography>
                          {selectedChurchIds.size > 0 && (
                            <Button
                              size="small"
                              startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                              onClick={() => setExportOpen(true)}
                              sx={{ ml: 'auto', textTransform: 'none', fontSize: '0.7rem', py: 0 }}
                            >
                              Export selected
                            </Button>
                          )}
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {filteredChurches.map((church, i) => (
                          <Box key={`${church.id}-${i}`} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                            {selectMode && (
                              <Checkbox
                                size="small"
                                checked={selectedChurchIds.has(church.id)}
                                onChange={() => toggleChurchSelect(church.id)}
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                sx={{ p: 0, mt: 0.75, flexShrink: 0 }}
                              />
                            )}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <ChurchCard
                                church={church}
                                isDark={isDark}
                                isSelected={selectedChurch?.id === church.id}
                                onClick={() => setSelectedChurch(prev => prev?.id === church.id ? null : church)}
                                onAction={(action) => handleChurchAction(church, action)}
                              />
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </>
                  )}
                </Box>
                )}
              </>
            ) : (
              /* ── No state selected: rankings ── */
              <Box sx={{ p: 2, overflow: 'auto', flex: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Click a state to explore its churches
                </Typography>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                  {REGIONS[activeRegion].label} Rankings
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {sortedStates.map(([code, count], i) => {
                    const st = statusData?.states[code];
                    const hasNonDir = st && (st.pipeline > 0 || st.onboarding > 0 || st.live > 0);
                    return (
                      <Box
                        key={code}
                        onClick={() => handleStateClick(code)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1, p: 0.75, borderRadius: 1,
                          cursor: 'pointer',
                          bgcolor: selectedState === code ? alpha(theme.palette.primary.main, 0.15) : 'transparent',
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ width: 22, textAlign: 'right' }}>{i + 1}.</Typography>
                        <Box sx={{ width: 12, height: 12, bgcolor: getStateColor(code), borderRadius: 0.3, border: `1px solid ${isDark ? '#555' : '#ccc'}`, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem' }}>
                          {geoData?.[code]?.name || code}
                        </Typography>
                        {hasNonDir && (
                          <Box sx={{ display: 'flex', gap: 0.25 }}>
                            {st!.live > 0 && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: STATUS_CONFIG.live.color }} />}
                            {st!.onboarding > 0 && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: STATUS_CONFIG.onboarding.color }} />}
                            {st!.pipeline > 0 && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: STATUS_CONFIG.pipeline.color }} />}
                          </Box>
                        )}
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>{count.toLocaleString()}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Paper>
        </Box>

        {/* ══════════ FLOATING TOOLTIP ══════════ */}
        {hoveredState && churchData && (
          <Box sx={{
            position: 'fixed', left: tooltipPos.x + 12, top: tooltipPos.y - 50,
            bgcolor: alpha(theme.palette.background.paper, 0.95),
            border: `1px solid ${isDark ? '#555' : '#ddd'}`, borderRadius: 1.5,
            px: 1.5, py: 1, pointerEvents: 'none', zIndex: 1500,
            boxShadow: theme.shadows[4], minWidth: 140,
          }}>
            <Typography variant="subtitle2">{geoData?.[hoveredState]?.name || hoveredState}</Typography>
            <Typography variant="h6" color="primary">{(churchData.states[hoveredState] || 0).toLocaleString()} churches</Typography>
            {statusData?.states[hoveredState] && (() => {
              const s = statusData.states[hoveredState];
              const items: string[] = [];
              if (s.live > 0) items.push(`${s.live} live`);
              if (s.onboarding > 0) items.push(`${s.onboarding} onboarding`);
              if (s.pipeline > 0) items.push(`${s.pipeline} pipeline`);
              return items.length > 0 ? (
                <Typography variant="caption" color="text.secondary">{items.join(' · ')}</Typography>
              ) : null;
            })()}
          </Box>
        )}
      </Box>

      {/* ══════════ EXPORT MODAL ══════════ */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        filters={exportFilters}
        selectedState={selectedState}
        activeRegion={activeRegion}
        selectedChurchIds={Array.from(selectedChurchIds)}
        filteredCount={filteredChurches.length}
      />
    </PageContainer>
  );
};

export default USChurchMapPage;
