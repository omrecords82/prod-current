/**
 * DatabaseSection — Database health panel with operational metrics,
 * informational metrics, and resource utilization bars.
 * Extracted from PlatformStatusPage.tsx
 */
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Grid,
  CircularProgress,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  IconDatabase,
  IconPlugConnected,
  IconDatabaseExport,
} from '@tabler/icons-react';
import type { DbHealth, Severity } from './platformStatusTypes';
import { metricSeverity, useSevColors, SystemBar } from './platformStatusTypes';

const DbMetricCell: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  severity?: Severity;
  mono?: boolean;
}> = ({ label, value, sub, severity = 'ok', mono }) => {
  const sev = useSevColors();
  const color = severity !== 'ok' ? sev.get(severity) : undefined;

  return (
    <Box sx={{ py: 0.8, px: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography
        variant="body1"
        fontWeight={700}
        fontFamily={mono ? 'monospace' : undefined}
        sx={{ lineHeight: 1.2, mt: 0.2, fontSize: '0.95rem', color }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', mt: 0.1, display: 'block' }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
};

const DatabaseSection: React.FC<{
  db: DbHealth;
  overallSeverity: Severity;
  onPing?: () => void;
  onBackup?: () => void;
  pingLoading?: boolean;
  backupLoading?: boolean;
}> = ({ db, overallSeverity, onPing, onBackup, pingLoading, backupLoading }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const sev = useSevColors();
  const connPct = Math.round((db.connections / db.max_connections) * 100);
  const borderColor = isDark ? '#2a2a2a' : '#e4e4e4';

  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mb: 1 }}>
        <IconDatabase size={16} color={theme.palette.text.secondary} />
        <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.8rem' }}>Database</Typography>
        <Typography variant="caption" fontFamily="monospace" color="text.disabled" sx={{ fontSize: '0.65rem' }}>192.168.1.241</Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Test DB connection">
          <IconButton size="small" onClick={onPing} disabled={pingLoading} sx={{ p: 0.4 }}>
            {pingLoading ? <CircularProgress size={13} /> : <IconPlugConnected size={14} />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Run backup now">
          <IconButton size="small" onClick={onBackup} disabled={backupLoading} sx={{ p: 0.4 }}>
            {backupLoading ? <CircularProgress size={13} /> : <IconDatabaseExport size={14} />}
          </IconButton>
        </Tooltip>
      </Stack>

      {/* A. Operational Metrics — prominent */}
      <Paper elevation={0} sx={{
        border: `1px solid ${borderColor}`, borderRadius: 1.5, mb: 1.5, overflow: 'hidden',
        borderLeft: overallSeverity !== 'ok' && (metricSeverity('latency', db) !== 'ok' || metricSeverity('connections', db) !== 'ok' || metricSeverity('backup', db) !== 'ok')
          ? `3px solid ${sev.get(overallSeverity)}` : undefined,
      }}>
        <Box sx={{ px: 1.5, py: 0.8, bgcolor: alpha(theme.palette.text.primary, 0.02), borderBottom: `1px solid ${borderColor}` }}>
          <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5, color: theme.palette.text.secondary }}>
            Operational
          </Typography>
        </Box>
        <Grid container>
          <Grid item xs={6} sm={3} sx={{ borderRight: { sm: `1px solid ${borderColor}` }, borderBottom: { xs: `1px solid ${borderColor}`, sm: 'none' } }}>
            <DbMetricCell label="Latency" value={`${db.latency_ms}ms`} sub="SELECT 1" severity={metricSeverity('latency', db)} mono />
          </Grid>
          <Grid item xs={6} sm={3} sx={{ borderRight: { sm: `1px solid ${borderColor}` }, borderBottom: { xs: `1px solid ${borderColor}`, sm: 'none' } }}>
            <DbMetricCell label="Connections" value={db.connections} sub={`/ ${db.max_connections} (${connPct}%)`} severity={metricSeverity('connections', db)} mono />
          </Grid>
          <Grid item xs={6} sm={3} sx={{ borderRight: { sm: `1px solid ${borderColor}` } }}>
            <DbMetricCell label="Slow Queries" value={db.slow_queries.toLocaleString()} sub="since restart" severity={db.slow_queries > 50 ? 'warn' : 'ok'} mono />
          </Grid>
          <Grid item xs={6} sm={3}>
            <DbMetricCell
              label="Backup Age"
              value={db.last_backup_age_hours >= 0 ? `${db.last_backup_age_hours}h` : 'None'}
              sub={db.last_backup !== 'none' ? db.last_backup : 'No backups'}
              severity={metricSeverity('backup', db)}
              mono
            />
          </Grid>
        </Grid>
      </Paper>

      {/* B. Informational Metrics + Resource Bars */}
      <Grid container spacing={1.5}>
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ border: `1px solid ${borderColor}`, borderRadius: 1.5, overflow: 'hidden' }}>
            <Box sx={{ px: 1.5, py: 0.8, bgcolor: alpha(theme.palette.text.primary, 0.02), borderBottom: `1px solid ${borderColor}` }}>
              <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5, color: theme.palette.text.secondary }}>
                Info
              </Typography>
            </Box>
            <Grid container>
              <Grid item xs={6} sx={{ borderRight: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}` }}>
                <DbMetricCell label="Version" value={db.version.split('-')[0]} sub={db.version.includes('-') ? db.version.split('-').slice(1).join('-') : undefined} />
              </Grid>
              <Grid item xs={6} sx={{ borderBottom: `1px solid ${borderColor}` }}>
                <DbMetricCell label="Uptime" value={db.uptime} />
              </Grid>
              <Grid item xs={6} sx={{ borderRight: `1px solid ${borderColor}` }}>
                <DbMetricCell label="Buffer Pool" value={`${db.buffer_pool_used_pct}%`} sub={`${db.buffer_pool_gb}G total`} severity={metricSeverity('buffer', db)} mono />
              </Grid>
              <Grid item xs={6}>
                <DbMetricCell label="Disk" value={`${db.disk_usage_pct}%`} sub={`${db.disk_used} / ${db.disk_total}`} severity={metricSeverity('disk', db)} mono />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ p: 2, border: `1px solid ${borderColor}`, borderRadius: 1.5, height: '100%' }}>
            <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.5, color: theme.palette.text.secondary, mb: 1.5, display: 'block' }}>
              Resource Utilization
            </Typography>
            <SystemBar label="Connections" value={connPct} detail={`${db.connections} / ${db.max_connections}`} thresholds={[75, 90]} severity={metricSeverity('connections', db)} />
            <SystemBar label="Buffer Pool" value={db.buffer_pool_used_pct} detail={`${db.buffer_pool_used_pct}% of ${db.buffer_pool_gb}G`} thresholds={[85, 95]} severity={metricSeverity('buffer', db)} />
            <SystemBar label="Disk" value={db.disk_usage_pct} detail={`${db.disk_used} / ${db.disk_total}`} thresholds={[80, 90]} severity={metricSeverity('disk', db)} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DatabaseSection;
