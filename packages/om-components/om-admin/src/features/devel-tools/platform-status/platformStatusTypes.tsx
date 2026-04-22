/**
 * platformStatusTypes — Shared types, utilities, constants, and reusable
 * components for PlatformStatusPage.
 * Extracted from PlatformStatusPage.tsx
 */
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';

// ─── Types ───────────────────────────────────────────────────────

export interface DbHealth {
  status: string;
  version: string;
  uptime: string;
  uptime_seconds: number;
  connections: number;
  max_connections: number;
  latency_ms: number;
  buffer_pool_gb: number;
  buffer_pool_used_pct: number;
  slow_queries: number;
  disk_used: string;
  disk_total: string;
  disk_usage_pct: number;
  last_backup: string;
  last_backup_age_hours: number;
}

export interface ServiceHealth {
  status: string;
  active_state: string;
  sub_state: string;
  uptime: string | null;
  since: string | null;
  service_name: string;
  label: string;
  health_source?: string;
}

export interface SystemHealth {
  cpu_usage_pct: number;
  load_average: number[];
  cpu_count: number;
  memory_used_pct: number;
  memory_used_gb: number;
  memory_total_gb: number;
  disk_usage_pct: number;
  disk_used: string;
  disk_total: string;
}

export interface BackendAlert {
  metric: string;
  severity: 'warn' | 'error';
  message: string;
  observed_value: number | string | null;
  threshold: number | string | null;
}

export interface PlatformStatus {
  status: string;
  overall_status?: Severity;
  alerts?: BackendAlert[];
  timestamp: string;
  response_time_ms: number;
  database: DbHealth | null;
  services?: Record<string, ServiceHealth>;
  system?: SystemHealth | null;
  error?: string;
}

export type Severity = 'ok' | 'warn' | 'error';

// ─── Threshold Logic ─────────────────────────────────────────────

export function metricSeverity(metric: string, db: DbHealth): Severity {
  switch (metric) {
    case 'disk':
      return db.disk_usage_pct > 90 ? 'error' : db.disk_usage_pct > 80 ? 'warn' : 'ok';
    case 'backup':
      return (db.last_backup_age_hours < 0 || db.last_backup_age_hours > 24) ? 'error' : db.last_backup_age_hours > 12 ? 'warn' : 'ok';
    case 'connections':
      return db.connections > 180 ? 'error' : db.connections > 150 ? 'warn' : 'ok';
    case 'latency':
      return db.latency_ms > 100 ? 'error' : db.latency_ms > 50 ? 'warn' : 'ok';
    case 'buffer':
      return db.buffer_pool_used_pct > 85 ? 'warn' : 'ok';
    default:
      return 'ok';
  }
}

// ─── Time-Ago Helper ─────────────────────────────────────────────

export function useTimeAgo(timestamp: string | null): string {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);
  if (!timestamp) return '';
  const diff = Math.max(0, Math.floor((now - new Date(timestamp).getTime()) / 1000));
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ${diff % 60}s ago`;
}

// ─── Constants ───────────────────────────────────────────────────

export const POLL_INTERVAL_MS = 60_000;

export const BCrumb = [
  { to: '/', title: 'Home' },
  { to: '/admin/control-panel', title: 'Control Panel' },
  { to: '/admin/control-panel/system-server', title: 'System & Server' },
  { to: '/admin/control-panel/system-server/server-devops', title: 'Server & DevOps' },
  { title: 'Platform Status' },
];

// ─── Severity Colors Helper ─────────────────────────────────────

export function useSevColors() {
  const theme = useTheme();
  return {
    ok: theme.palette.success.main,
    warn: theme.palette.warning.main,
    error: theme.palette.error.main,
    get: (s: Severity) =>
      s === 'error' ? theme.palette.error.main :
      s === 'warn' ? theme.palette.warning.main :
      theme.palette.success.main,
  };
}

// ─── SystemBar (shared by SystemHealthPanel and DatabaseSection) ─

export const SystemBar: React.FC<{
  label: string;
  value: number;
  detail: string;
  thresholds: [number, number];
  severity: Severity;
}> = ({ label, value, detail, thresholds, severity }) => {
  const theme = useTheme();
  const sev = useSevColors();
  const color = sev.get(severity);

  return (
    <Box sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.3 }}>
        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.78rem', color: severity !== 'ok' ? color : undefined }}>
          {label}
        </Typography>
        <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
          {detail}
        </Typography>
      </Stack>
      <Box sx={{ position: 'relative' }}>
        <LinearProgress
          variant="determinate"
          value={Math.min(value, 100)}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: alpha(color, 0.1),
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
          }}
        />
        {/* Threshold markers */}
        {thresholds.map((t, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute', top: -1, width: '1px', height: 8,
              bgcolor: alpha(i === 0 ? sev.warn : sev.error, 0.4),
              left: `${t}%`,
            }}
          />
        ))}
      </Box>
    </Box>
  );
};
