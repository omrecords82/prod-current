import { apiClient } from '@/api/utils/axiosInstance';
import { CustomizerContext } from '@/context/CustomizerContext';
import {
    Alert, alpha, Autocomplete,
    Badge,
    Box,
    Button, ButtonGroup,
    Card, CardContent,
    Chip,
    CircularProgress,
    Collapse, Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Grid,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Pagination,
    Paper,
    Select,
    Snackbar,
    Stack,
    Tab,
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TableSortLabel,
    Tabs,
    TextField,
    Tooltip,
    Typography,
    useTheme
} from '@mui/material';
import {
    IconActivity,
    IconAlertCircle,
    IconAlertTriangle,
    IconChevronDown, IconChevronUp,
    IconDatabase,
    IconEye,
    IconFile,
    IconPlayerPause, IconPlayerPlay,
    IconRefresh,
    IconSearch,
    IconServer,
    IconTerminal2,
    IconUsers,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { LogEntry, LogStats, SearchResult, FilterOptions, ServerLogFile } from './logSearchTypes';
import { levelColors, levelIcons, ALL_LEVELS, STAT_CARD, SERVER_LOG_LABELS } from './logSearchTypes';
import ActivityLogsTab from './ActivityLogsTab';
import SessionsTab from './SessionsTab';

dayjs.extend(relativeTime);

// ─── Component ──────────────────────────────────────────────────────────────
const LogSearch: React.FC = () => {
  const theme = useTheme();
  const { isLayout } = useContext(CustomizerContext);
  const [activeTab, setActiveTab] = useState(0);
  const refreshInterval = 10;
  const logLimit = 50;
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // ── Snackbar ──────────────────────────────────────────────────────────────
  type SnackbarState = { open: boolean; message: string; severity: 'success' | 'error' };
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });

  // ── Log search bucket ─────────────────────────────────────────────────────
  type ContextDialogState = { open: boolean; rows: LogEntry[]; targetId: number | null };
  const [logSearch, setLogSearch] = useState<{
    logStats: LogStats | null;
    logResults: SearchResult | null;
    logLoading: boolean;
    logStatsLoading: boolean;
    expandedRow: number | null;
    contextDialog: ContextDialogState;
    contextLoading: boolean;
    logQuery: string;
    logLevel: string;
    logSource: string;
    logService: string;
    logUserEmail: string;
    logDateFrom: string;
    logDateTo: string;
    logPage: number;
    filterOptions: FilterOptions;
  }>({
    logStats: null,
    logResults: null,
    logLoading: false,
    logStatsLoading: true,
    expandedRow: null,
    contextDialog: { open: false, rows: [], targetId: null },
    contextLoading: false,
    logQuery: '',
    logLevel: '',
    logSource: '',
    logService: '',
    logUserEmail: '',
    logDateFrom: '',
    logDateTo: '',
    logPage: 1,
    filterOptions: { sources: [], services: [], recentUsers: [] },
  });
  const setLogSearchField = useCallback(<K extends keyof typeof logSearch>(key: K, value: typeof logSearch[K]) => {
    setLogSearch(prev => ({ ...prev, [key]: value }));
  }, []);
  const setLogStats = useCallback((v: LogStats | null) => setLogSearchField('logStats', v), [setLogSearchField]);
  const setLogResults = useCallback((v: SearchResult | null) => setLogSearchField('logResults', v), [setLogSearchField]);
  const setLogLoading = useCallback((v: boolean) => setLogSearchField('logLoading', v), [setLogSearchField]);
  const setLogStatsLoading = useCallback((v: boolean) => setLogSearchField('logStatsLoading', v), [setLogSearchField]);
  const setExpandedRow = useCallback((v: number | null) => setLogSearchField('expandedRow', v), [setLogSearchField]);
  const setContextDialog = useCallback((v: ContextDialogState) => setLogSearchField('contextDialog', v), [setLogSearchField]);
  const setContextLoading = useCallback((v: boolean) => setLogSearchField('contextLoading', v), [setLogSearchField]);
  const setLogQuery = useCallback((v: string) => setLogSearchField('logQuery', v), [setLogSearchField]);
  const setLogLevel = useCallback((v: string) => setLogSearchField('logLevel', v), [setLogSearchField]);
  const setLogSource = useCallback((v: string) => setLogSearchField('logSource', v), [setLogSearchField]);
  const setLogService = useCallback((v: string) => setLogSearchField('logService', v), [setLogSearchField]);
  const setLogUserEmail = useCallback((v: string) => setLogSearchField('logUserEmail', v), [setLogSearchField]);
  const setLogDateFrom = useCallback((v: string) => setLogSearchField('logDateFrom', v), [setLogSearchField]);
  const setLogDateTo = useCallback((v: string) => setLogSearchField('logDateTo', v), [setLogSearchField]);
  const setLogPage = useCallback((v: number) => setLogSearchField('logPage', v), [setLogSearchField]);
  const setFilterOptions = useCallback((v: FilterOptions) => setLogSearchField('filterOptions', v), [setLogSearchField]);
  const { logStats, logResults, logLoading, logStatsLoading, expandedRow, contextDialog, contextLoading, logQuery, logLevel, logSource, logService, logUserEmail, logDateFrom, logDateTo, logPage, filterOptions } = logSearch;

  // ── Server logs bucket ────────────────────────────────────────────────────
  const [serverLog, setServerLog] = useState<{
    serverLogFiles: ServerLogFile[];
    activeLogSource: string;
    serverLogLines: string[];
    serverLogLoading: boolean;
    serverLogSearch: string;
    serverLogLineCount: number;
  }>({
    serverLogFiles: [],
    activeLogSource: 'system',
    serverLogLines: [],
    serverLogLoading: false,
    serverLogSearch: '',
    serverLogLineCount: 200,
  });
  const setServerLogField = useCallback(<K extends keyof typeof serverLog>(key: K, value: typeof serverLog[K]) => {
    setServerLog(prev => ({ ...prev, [key]: value }));
  }, []);
  const setServerLogFiles = useCallback((v: ServerLogFile[]) => setServerLogField('serverLogFiles', v), [setServerLogField]);
  const setActiveLogSource = useCallback((v: string) => setServerLogField('activeLogSource', v), [setServerLogField]);
  const setServerLogLines = useCallback((v: string[]) => setServerLogField('serverLogLines', v), [setServerLogField]);
  const setServerLogLoading = useCallback((v: boolean) => setServerLogField('serverLogLoading', v), [setServerLogField]);
  const setServerLogSearch = useCallback((v: string) => setServerLogField('serverLogSearch', v), [setServerLogField]);
  const setServerLogLineCount = useCallback((v: number) => setServerLogField('serverLogLineCount', v), [setServerLogField]);
  const { serverLogFiles, activeLogSource, serverLogLines, serverLogLoading, serverLogSearch, serverLogLineCount } = serverLog;

  // ── Auto-refresh + sorting bucket ─────────────────────────────────────────
  const [refreshSort, setRefreshSort] = useState<{
    autoRefresh: boolean;
    countdown: number;
    excludedLevels: string[];
    sortField: string;
    sortDir: 'ASC' | 'DESC';
  }>({
    autoRefresh: false,
    countdown: 10,
    excludedLevels: [],
    sortField: 'timestamp',
    sortDir: 'DESC',
  });
  const setAutoRefresh: React.Dispatch<React.SetStateAction<boolean>> = useCallback((action) => {
    setRefreshSort(prev => ({ ...prev, autoRefresh: typeof action === 'function' ? (action as (p: boolean) => boolean)(prev.autoRefresh) : action }));
  }, []);
  const setCountdown: React.Dispatch<React.SetStateAction<number>> = useCallback((action) => {
    setRefreshSort(prev => ({ ...prev, countdown: typeof action === 'function' ? (action as (p: number) => number)(prev.countdown) : action }));
  }, []);
  const setExcludedLevels: React.Dispatch<React.SetStateAction<string[]>> = useCallback((action) => {
    setRefreshSort(prev => ({ ...prev, excludedLevels: typeof action === 'function' ? (action as (p: string[]) => string[])(prev.excludedLevels) : action }));
  }, []);
  const setSortField = useCallback((v: string) => setRefreshSort(prev => ({ ...prev, sortField: v })), []);
  const setSortDir: React.Dispatch<React.SetStateAction<'ASC' | 'DESC'>> = useCallback((action) => {
    setRefreshSort(prev => ({ ...prev, sortDir: typeof action === 'function' ? (action as (p: 'ASC' | 'DESC') => 'ASC' | 'DESC')(prev.sortDir) : action }));
  }, []);
  const { autoRefresh, countdown, excludedLevels, sortField, sortDir } = refreshSort;

  // ═══════════════════════════════════════════════════════════════════════════
  // LOG SEARCH HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const fetchLogStats = useCallback(async () => {
    setLogStatsLoading(true);
    try {
      const res: any = await apiClient.get('/admin/log-search/stats');
      setLogStats(res);
    } catch (err) { console.error('Failed to load log stats:', err); }
    finally { setLogStatsLoading(false); }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const res: any = await apiClient.get('/admin/log-search/filters');
      setFilterOptions(res);
    } catch (err) { console.error('Failed to load filter options:', err); }
  }, []);

  const fetchServerLogFiles = useCallback(async () => {
    try {
      const res: any = await apiClient.get('/admin/log-search/server-logs');
      setServerLogFiles(res.files || []);
    } catch (err) { console.error('Failed to load server log files:', err); }
  }, []);

  const fetchServerLog = useCallback(async (name: string, lines = 200, search = '') => {
    setServerLogLoading(true);
    try {
      const params: Record<string, string | number> = { lines };
      if (search) params.search = search;
      const res: any = await apiClient.get(`/admin/log-search/server-logs/${name}`, { params });
      setServerLogLines(res.lines || []);
    } catch (err) {
      console.error('Failed to load server log:', err);
      setServerLogLines(['Error loading log file']);
    }
    finally { setServerLogLoading(false); }
  }, []);

  const fetchLogs = useCallback(async (p = logPage) => {
    setLogLoading(true);
    try {
      const params: Record<string, string | number> = { page: p, limit: logLimit, sort: sortField, sort_dir: sortDir };
      if (logQuery) params.q = logQuery;
      if (logLevel) params.level = logLevel;
      if (logSource) params.source = logSource;
      if (logService) params.service = logService;
      if (logUserEmail) params.user_email = logUserEmail;
      if (logDateFrom) params.from = logDateFrom;
      if (logDateTo) params.to = logDateTo;
      if (excludedLevels.length > 0) params.exclude_levels = excludedLevels.join(',');
      const res: any = await apiClient.get('/admin/log-search', { params });
      setLogResults(res);
    } catch (err) { console.error('Failed to search logs:', err); }
    finally { setLogLoading(false); }
  }, [logQuery, logLevel, logSource, logService, logUserEmail, logDateFrom, logDateTo, logPage, logLimit, sortField, sortDir, excludedLevels]);

  const fetchContext = async (logId: number) => {
    setContextLoading(true);
    try {
      const res: any = await apiClient.get(`/admin/log-search/context/${logId}`);
      setContextDialog({ open: true, rows: res.rows, targetId: res.targetId });
    } catch (err) { console.error('Failed to load context:', err); }
    finally { setContextLoading(false); }
  };

  // ── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortDir('DESC');
    }
  };

  // ── Auto-refresh ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoRefresh && activeTab === 0) {
      setCountdown(refreshInterval);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) return refreshInterval;
          return prev - 1;
        });
      }, 1000);
      autoRefreshRef.current = setInterval(() => {
        if (activeLogSource === 'system') {
          fetchLogs();
          fetchLogStats();
        } else {
          fetchServerLog(activeLogSource, serverLogLineCount, serverLogSearch);
        }
      }, refreshInterval * 1000);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoRefresh, activeTab, refreshInterval, activeLogSource]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-fetch when sort changes ────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 0 && activeLogSource === 'system') {
      fetchLogs(1);
      setLogPage(1);
    }
  }, [sortField, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-fetch when excluded levels change ──────────────────────────────────
  useEffect(() => {
    if (activeTab === 0 && activeLogSource === 'system') {
      fetchLogs(1);
      setLogPage(1);
    }
  }, [excludedLevels]); // eslint-disable-line react-hooks/exhaustive-deps



  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS — load data on mount / tab change
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    fetchLogStats();
    fetchLogs(1);
    fetchFilterOptions();
    fetchServerLogFiles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchLogs(); }, [logPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load server log when source changes
  useEffect(() => {
    if (activeLogSource !== 'system') {
      fetchServerLog(activeLogSource, serverLogLineCount, serverLogSearch);
    }
  }, [activeLogSource]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogSearch = () => { setLogPage(1); fetchLogs(1); };
  const handleLogKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleLogSearch(); };

  const errorRateTrend = logStats ? logStats.errorRate.lastHour - logStats.errorRate.prevHour : 0;

  // Toggle level exclusion
  const toggleLevelExclusion = (level: string) => {
    setExcludedLevels(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  // ── Server log search handler ─────────────────────────────────────────────
  const handleServerLogRefresh = () => {
    if (activeLogSource !== 'system') {
      fetchServerLog(activeLogSource, serverLogLineCount, serverLogSearch);
    }
  };

  // Filter server log lines client-side for the search highlight
  const filteredServerLogLines = serverLogSearch
    ? serverLogLines.filter(line => line.toLowerCase().includes(serverLogSearch.toLowerCase()))
    : serverLogLines;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <Box sx={{ maxWidth: isLayout === 'full' ? '100%' : 1400, mx: 'auto', px: { xs: 1, md: 3 }, py: 3 }}>
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <Box sx={{
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        borderRadius: 3, p: 3, mb: 3, color: 'white',
      }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconTerminal2 size={36} />
          <Box>
            <Typography variant="h4" fontWeight={700}>System Logs & Monitoring</Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Search logs, audit user activity, and manage active sessions
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': { py: 2, fontWeight: 600, fontSize: '0.9rem' },
            '& .MuiTabs-indicator': { height: 3, borderRadius: 2 },
          }}
        >
          <Tab
            icon={<IconSearch size={20} />}
            iconPosition="start"
            label={
              <Badge badgeContent={logStats?.errors24h || 0} color="error" max={999} sx={{ '& .MuiBadge-badge': { right: -12, top: 2 } }}>
                Log Search
              </Badge>
            }
          />
          <Tab icon={<IconActivity size={20} />} iconPosition="start" label="Activity Logs" />
          <Tab icon={<IconUsers size={20} />} iconPosition="start" label="Sessions" />
        </Tabs>
      </Paper>

      {/* ═══════════════════════════════════════════════════════════════
           TAB 0 — LOG SEARCH
         ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 0 && (
        <>
          {/* Log Source Selector */}
          <Card sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: 80 }}>
                  <IconServer size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Log Source:
                </Typography>
                <Chip
                  label="System Logs"
                  icon={<IconDatabase size={16} />}
                  color={activeLogSource === 'system' ? 'primary' : 'default'}
                  variant={activeLogSource === 'system' ? 'filled' : 'outlined'}
                  onClick={() => setActiveLogSource('system')}
                  clickable
                />
                {serverLogFiles.map(f => (
                  <Chip
                    key={f.name}
                    label={SERVER_LOG_LABELS[f.name] || f.name}
                    icon={<IconFile size={16} />}
                    color={activeLogSource === f.name ? 'primary' : 'default'}
                    variant={activeLogSource === f.name ? 'filled' : 'outlined'}
                    onClick={() => setActiveLogSource(f.name)}
                    clickable
                    sx={{ fontSize: '0.8rem' }}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>

          {activeLogSource === 'system' ? (
            <>
              {/* Stats Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  { label: 'Total Logs', value: logStats?.total ?? 0, color: theme.palette.primary.main, icon: <IconDatabase size={28} /> },
                  { label: 'Errors (24h)', value: logStats?.errors24h ?? 0, color: theme.palette.error.main, icon: <IconAlertCircle size={28} /> },
                  { label: 'Warnings (24h)', value: logStats?.warnings24h ?? 0, color: theme.palette.warning.main, icon: <IconAlertTriangle size={28} /> },
                  { label: 'Error Rate (1h)', value: logStats?.errorRate.lastHour ?? 0, color: errorRateTrend > 0 ? theme.palette.error.main : theme.palette.success.main, icon: <IconActivity size={28} />, suffix: errorRateTrend !== 0 ? ` (${errorRateTrend > 0 ? '+' : ''}${errorRateTrend})` : '' },
                ].map((s, i) => (
                  <Grid size={{ xs: 6, md: 3 }} key={i}>
                    <Card sx={STAT_CARD(s.color)}>
                      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Box sx={{ color: s.color }}>{s.icon}</Box>
                          <Box>
                            <Typography variant="h5" fontWeight={700}>
                              {logStatsLoading ? <CircularProgress size={20} /> : s.value.toLocaleString()}{(s as any).suffix || ''}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Filter Bar */}
              <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent sx={{ pb: '16px !important' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        fullWidth size="small" label="Search logs"
                        value={logQuery} onChange={e => setLogQuery(e.target.value)} onKeyDown={handleLogKeyDown}
                        InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={18} /></InputAdornment> }}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Level</InputLabel>
                        <Select value={logLevel} label="Level" onChange={e => setLogLevel(e.target.value)}>
                          <MenuItem value="">All</MenuItem>
                          <MenuItem value="ERROR">Error</MenuItem>
                          <MenuItem value="WARN">Warning</MenuItem>
                          <MenuItem value="INFO">Info</MenuItem>
                          <MenuItem value="DEBUG">Debug</MenuItem>
                          <MenuItem value="SUCCESS">Success</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={filterOptions.sources}
                        value={logSource}
                        onInputChange={(_, val) => setLogSource(val)}
                        renderInput={(params) => <TextField {...params} label="Source" onKeyDown={handleLogKeyDown} />}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={filterOptions.services}
                        value={logService}
                        onInputChange={(_, val) => setLogService(val)}
                        renderInput={(params) => <TextField {...params} label="Service" onKeyDown={handleLogKeyDown} />}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <Autocomplete
                        freeSolo
                        size="small"
                        options={filterOptions.recentUsers}
                        getOptionLabel={(option) => {
                          if (typeof option === 'string') return option;
                          const name = option.name ? `${option.name} ` : '';
                          const ago = option.last_login ? ` - ${dayjs(option.last_login).fromNow()}` : '';
                          return `${name}(${option.email})${ago}`;
                        }}
                        value={logUserEmail}
                        onInputChange={(_, val) => {
                          // Extract email from the display format
                          const emailMatch = val.match(/\(([^)]+)\)/);
                          setLogUserEmail(emailMatch ? emailMatch[1] : val);
                        }}
                        renderOption={(props, option) => {
                          if (typeof option === 'string') return <li {...props}>{option}</li>;
                          return (
                            <li {...props}>
                              <Box>
                                <Typography variant="body2">{option.name || option.email}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {option.email}{option.last_login ? ` - last login ${dayjs(option.last_login).fromNow()}` : ''}
                                </Typography>
                              </Box>
                            </li>
                          );
                        }}
                        renderInput={(params) => <TextField {...params} label="User email" onKeyDown={handleLogKeyDown} />}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField fullWidth size="small" label="From" type="datetime-local" value={logDateFrom} onChange={e => setLogDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField fullWidth size="small" label="To" type="datetime-local" value={logDateTo} onChange={e => setLogDateTo(e.target.value)} InputLabelProps={{ shrink: true }} />
                    </Grid>

                    {/* Level Exclude Toggles */}
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Exclude:</Typography>
                        {ALL_LEVELS.map(level => (
                          <Chip
                            key={level}
                            label={level}
                            size="small"
                            icon={levelIcons[level] as React.ReactElement}
                            color={excludedLevels.includes(level) ? 'default' : (levelColors[level] || 'default')}
                            variant={excludedLevels.includes(level) ? 'filled' : 'outlined'}
                            onClick={() => toggleLevelExclusion(level)}
                            clickable
                            sx={{
                              fontSize: '0.7rem',
                              opacity: excludedLevels.includes(level) ? 0.5 : 1,
                              textDecoration: excludedLevels.includes(level) ? 'line-through' : 'none',
                            }}
                          />
                        ))}
                      </Stack>
                    </Grid>

                    <Grid size={12} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Button variant="contained" onClick={handleLogSearch} startIcon={<IconSearch size={18} />}>Search</Button>
                      <Button variant="outlined" onClick={() => { setLogQuery(''); setLogLevel(''); setLogSource(''); setLogService(''); setLogUserEmail(''); setLogDateFrom(''); setLogDateTo(''); setExcludedLevels([]); setLogPage(1); setSortField('timestamp'); setSortDir('DESC'); setTimeout(() => fetchLogs(1), 0); }}>Clear</Button>

                      {/* Auto-Refresh Toggle */}
                      <ButtonGroup variant="outlined" size="small">
                        <Button
                          onClick={() => { fetchLogStats(); fetchLogs(); }}
                          startIcon={<IconRefresh size={18} />}
                        >
                          Refresh
                        </Button>
                        <Tooltip title={autoRefresh ? `Auto-refresh ON (${countdown}s)` : 'Enable auto-refresh'}>
                          <Button
                            onClick={() => setAutoRefresh(prev => !prev)}
                            color={autoRefresh ? 'success' : 'inherit'}
                            sx={{
                              bgcolor: autoRefresh ? alpha(theme.palette.success.main, 0.1) : undefined,
                              minWidth: 40,
                            }}
                          >
                            {autoRefresh ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}
                            {autoRefresh && (
                              <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 700, minWidth: 16 }}>
                                {countdown}
                              </Typography>
                            )}
                          </Button>
                        </Tooltip>
                      </ButtonGroup>

                      <Typography variant="caption" color="text.secondary" sx={{ mx: 1 }}>Quick:</Typography>
                      {[
                        { label: 'Errors', preset: () => { setLogLevel('ERROR'); setLogQuery(''); setLogPage(1); setTimeout(() => fetchLogs(1), 0); } },
                        { label: 'Warnings', preset: () => { setLogLevel('WARN'); setLogQuery(''); setLogPage(1); setTimeout(() => fetchLogs(1), 0); } },
                        { label: 'Auth', preset: () => { setLogQuery('auth'); setLogLevel(''); setLogPage(1); setTimeout(() => fetchLogs(1), 0); } },
                        { label: 'OCR', preset: () => { setLogQuery('ocr'); setLogLevel(''); setLogPage(1); setTimeout(() => fetchLogs(1), 0); } },
                        { label: 'DB', preset: () => { setLogQuery('database'); setLogLevel(''); setLogPage(1); setTimeout(() => fetchLogs(1), 0); } },
                        { label: 'Crash', preset: () => { setLogQuery('crash'); setLogLevel('ERROR'); setLogPage(1); setTimeout(() => fetchLogs(1), 0); } },
                      ].map(q => (
                        <Chip key={q.label} label={q.label} size="small" variant="outlined" clickable onClick={q.preset} sx={{ fontSize: '0.72rem' }} />
                      ))}
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Results Table */}
              <Card sx={{ borderRadius: 2 }}>
                <TableContainer sx={{ maxHeight: 'calc(100vh - 520px)', overflow: 'auto' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.06) } }}>
                        <TableCell width={40} />
                        <TableCell sortDirection={sortField === 'timestamp' ? (sortDir.toLowerCase() as 'asc' | 'desc') : false}>
                          <TableSortLabel active={sortField === 'timestamp'} direction={sortField === 'timestamp' ? (sortDir.toLowerCase() as 'asc' | 'desc') : 'desc'} onClick={() => handleSort('timestamp')}>
                            Timestamp
                          </TableSortLabel>
                        </TableCell>
                        <TableCell width={100} sortDirection={sortField === 'level' ? (sortDir.toLowerCase() as 'asc' | 'desc') : false}>
                          <TableSortLabel active={sortField === 'level'} direction={sortField === 'level' ? (sortDir.toLowerCase() as 'asc' | 'desc') : 'desc'} onClick={() => handleSort('level')}>
                            Level
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={sortField === 'source' ? (sortDir.toLowerCase() as 'asc' | 'desc') : false}>
                          <TableSortLabel active={sortField === 'source'} direction={sortField === 'source' ? (sortDir.toLowerCase() as 'asc' | 'desc') : 'desc'} onClick={() => handleSort('source')}>
                            Source
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 400 }} sortDirection={sortField === 'message' ? (sortDir.toLowerCase() as 'asc' | 'desc') : false}>
                          <TableSortLabel active={sortField === 'message'} direction={sortField === 'message' ? (sortDir.toLowerCase() as 'asc' | 'desc') : 'desc'} onClick={() => handleSort('message')}>
                            Message
                          </TableSortLabel>
                        </TableCell>
                        <TableCell width={60} align="center" sortDirection={sortField === 'occurrences' ? (sortDir.toLowerCase() as 'asc' | 'desc') : false}>
                          <TableSortLabel active={sortField === 'occurrences'} direction={sortField === 'occurrences' ? (sortDir.toLowerCase() as 'asc' | 'desc') : 'desc'} onClick={() => handleSort('occurrences')}>
                            Occ.
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sortDirection={sortField === 'user_email' ? (sortDir.toLowerCase() as 'asc' | 'desc') : false}>
                          <TableSortLabel active={sortField === 'user_email'} direction={sortField === 'user_email' ? (sortDir.toLowerCase() as 'asc' | 'desc') : 'desc'} onClick={() => handleSort('user_email')}>
                            User
                          </TableSortLabel>
                        </TableCell>
                        <TableCell width={60} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logLoading ? (
                        <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress /><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Loading logs...</Typography></TableCell></TableRow>
                      ) : !logResults?.rows.length ? (
                        <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><IconSearch size={40} style={{ opacity: 0.2 }} /><Typography color="text.secondary" sx={{ mt: 1 }}>No logs found. Try adjusting your filters.</Typography></TableCell></TableRow>
                      ) : (
                        logResults.rows.map(row => (
                          <React.Fragment key={row.id}>
                            <TableRow hover sx={{ cursor: 'pointer', '& td': { borderBottom: expandedRow === row.id ? 'none' : undefined } }} onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}>
                              <TableCell>{expandedRow === row.id ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}</TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                <Tooltip title={dayjs(row.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')}><span>{dayjs(row.timestamp).fromNow()}</span></Tooltip>
                              </TableCell>
                              <TableCell>
                                <Chip size="small" label={row.level} color={levelColors[row.level] || 'default'} icon={levelIcons[row.level] as React.ReactElement || undefined} sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.source}</TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.message}</TableCell>
                              <TableCell align="center">{row.occurrences > 1 && <Chip size="small" label={row.occurrences} variant="outlined" sx={{ fontSize: '0.7rem' }} />}</TableCell>
                              <TableCell sx={{ fontSize: '0.8rem' }}>{row.user_email || '-'}</TableCell>
                              <TableCell>
                                <Tooltip title="View surrounding context">
                                  <IconButton size="small" onClick={e => { e.stopPropagation(); fetchContext(row.id); }} disabled={contextLoading}><IconEye size={16} /></IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell colSpan={8} sx={{ py: 0, px: 0 }}>
                                <Collapse in={expandedRow === row.id} timeout="auto" unmountOnExit>
                                  <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                                    <Grid container spacing={2}>
                                      <Grid size={12}>
                                        <Typography variant="subtitle2" gutterBottom>Full Message</Typography>
                                        <Paper sx={{ p: 1.5, bgcolor: 'background.default', fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 200, overflow: 'auto' }}>{row.message}</Paper>
                                      </Grid>
                                      {row.meta && Object.keys(row.meta).length > 0 && (
                                        <Grid size={{ xs: 12, md: 6 }}>
                                          <Typography variant="subtitle2" gutterBottom>Meta</Typography>
                                          <Paper sx={{ p: 1.5, bgcolor: 'background.default', fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(row.meta, null, 2)}</Paper>
                                        </Grid>
                                      )}
                                      <Grid size={{ xs: 12, md: 6 }}>
                                        <Typography variant="subtitle2" gutterBottom>Details</Typography>
                                        <Box sx={{ fontSize: '0.8rem', '& > div': { mb: 0.5 } }}>
                                          <div><strong>ID:</strong> {row.id}</div>
                                          <div><strong>Hash:</strong> {row.hash}</div>
                                          <div><strong>Timestamp:</strong> {dayjs(row.timestamp).format('YYYY-MM-DD HH:mm:ss')}</div>
                                          {row.first_seen && <div><strong>First seen:</strong> {dayjs(row.first_seen).format('YYYY-MM-DD HH:mm:ss')}</div>}
                                          {row.session_id && <div><strong>Session ID:</strong> {row.session_id}</div>}
                                          {row.request_id && <div><strong>Request ID:</strong> {row.request_id}</div>}
                                          {row.ip_address && <div><strong>IP:</strong> {row.ip_address}</div>}
                                          {row.user_agent && <div><strong>User Agent:</strong> {row.user_agent}</div>}
                                          {row.service && <div><strong>Service:</strong> {row.service}</div>}
                                          {row.source_component && <div><strong>Component:</strong> {row.source_component}</div>}
                                        </Box>
                                      </Grid>
                                    </Grid>
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                {logResults && logResults.pages > 1 && (
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">{logResults.total.toLocaleString()} results — page {logResults.page} of {logResults.pages}</Typography>
                    <Pagination count={logResults.pages} page={logResults.page} onChange={(_, p) => setLogPage(p)} color="primary" size="small" />
                  </Stack>
                )}
              </Card>
            </>
          ) : (
            /* ── Server Log File Viewer ────────────────────────────────── */
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight={600}>
                    {SERVER_LOG_LABELS[activeLogSource] || activeLogSource}
                  </Typography>
                  <TextField
                    size="small"
                    label="Search in log"
                    value={serverLogSearch}
                    onChange={e => setServerLogSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleServerLogRefresh(); }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><IconSearch size={16} /></InputAdornment> }}
                    sx={{ width: 250 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>Lines</InputLabel>
                    <Select value={serverLogLineCount} label="Lines" onChange={e => setServerLogLineCount(Number(e.target.value))}>
                      <MenuItem value={100}>100</MenuItem>
                      <MenuItem value={200}>200</MenuItem>
                      <MenuItem value={500}>500</MenuItem>
                      <MenuItem value={1000}>1000</MenuItem>
                    </Select>
                  </FormControl>
                  <Button variant="outlined" startIcon={<IconRefresh size={18} />} onClick={handleServerLogRefresh} disabled={serverLogLoading}>
                    Refresh
                  </Button>
                  {serverLogLoading && <CircularProgress size={20} />}
                </Stack>

                <Paper
                  sx={{
                    p: 2,
                    bgcolor: '#1e1e1e',
                    color: '#d4d4d4',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    lineHeight: 1.6,
                    maxHeight: 'calc(100vh - 400px)',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    borderRadius: 1,
                  }}
                >
                  {serverLogLoading ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress size={24} sx={{ color: '#d4d4d4' }} />
                      <Typography variant="body2" sx={{ color: '#888', mt: 1 }}>Loading log...</Typography>
                    </Box>
                  ) : filteredServerLogLines.length === 0 ? (
                    <Typography sx={{ color: '#888', textAlign: 'center', py: 4 }}>No log lines found</Typography>
                  ) : (
                    filteredServerLogLines.map((line, i) => (
                      <Box
                        key={i}
                        sx={{
                          py: 0.15,
                          px: 1,
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          color: line.toLowerCase().includes('error') ? '#f48771'
                            : line.toLowerCase().includes('warn') ? '#cca700'
                            : '#d4d4d4',
                        }}
                      >
                        <Typography component="span" sx={{ color: '#666', mr: 1, fontSize: '0.7rem', userSelect: 'none' }}>
                          {i + 1}
                        </Typography>
                        {line}
                      </Box>
                    ))
                  )}
                </Paper>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Showing {filteredServerLogLines.length} line{filteredServerLogLines.length !== 1 ? 's' : ''}
                  {serverLogSearch && ` (filtered from ${serverLogLines.length})`}
                </Typography>
              </CardContent>
            </Card>
          )}
        </>
      )}



      {/* ═══════════════════════════════════════════════════════════════
           DIALOGS
         ═══════════════════════════════════════════════════════════════ */}

      {/* Log Context Dialog */}
      <Dialog open={contextDialog.open} onClose={() => setContextDialog({ open: false, rows: [], targetId: null })} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Log Context</DialogTitle>
        <DialogContent>
          <TableContainer sx={{ maxHeight: 500 }}>
            <Table size="small">
              <TableHead>
                <TableRow><TableCell>Timestamp</TableCell><TableCell>Level</TableCell><TableCell>Source</TableCell><TableCell>Message</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {contextDialog.rows.map(row => (
                  <TableRow key={row.id} sx={{ bgcolor: row.isFocused ? 'action.selected' : undefined, fontWeight: row.isFocused ? 700 : 400 }}>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{dayjs(row.timestamp).format('HH:mm:ss.SSS')}</TableCell>
                    <TableCell><Chip size="small" label={row.level} color={levelColors[row.level] || 'default'} sx={{ fontSize: '0.7rem' }} /></TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{row.source}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions><Button onClick={() => setContextDialog({ open: false, rows: [], targetId: null })}>Close</Button></DialogActions>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
           TAB 1 — ACTIVITY LOGS
         ═══════════════════════════════════════════════════════════════ */}
      <ActivityLogsTab active={activeTab === 1} />

      {/* ═══════════════════════════════════════════════════════════════
           TAB 2 — SESSIONS
         ═══════════════════════════════════════════════════════════════ */}
      <SessionsTab active={activeTab === 2} />

      {/* Global Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default LogSearch;
