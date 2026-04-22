/**
 * logSearchTypes — Shared interfaces, types, and constants for the
 * System Logs & Monitoring page (LogSearch).
 * Extracted from LogSearch.tsx
 */
import React from 'react';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconInfoCircle,
  IconBug,
  IconCheck,
} from '@tabler/icons-react';

// ─── Interfaces ─────────────────────────────────────────────────────────────
export interface LogEntry {
  id: number;
  hash: string;
  timestamp: string;
  level: string;
  source: string;
  message: string;
  meta: Record<string, any>;
  user_email: string | null;
  service: string | null;
  source_component: string | null;
  session_id: string | null;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  first_seen: string | null;
  occurrences: number;
  isFocused?: boolean;
}

export interface LogStats {
  total: number;
  levels: Record<string, number>;
  errors24h: number;
  warnings24h: number;
  topSources: { source: string; count: number }[];
  errorRate: { lastHour: number; prevHour: number };
}

export interface SearchResult {
  rows: LogEntry[];
  total: number;
  page: number;
  pages: number;
}

export interface ActivityLogData {
  id: number;
  user_id: number;
  action: string;
  changes: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user_email?: string;
  first_name?: string;
  last_name?: string;
  user_role?: string;
}

export interface ActivityLogStats {
  total_activities: number;
  unique_users: number;
  active_days: number;
  unique_actions: number;
}

export interface SessionData {
  session_id: string;
  user_id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  church_name?: string;
  ip_address?: string;
  user_agent?: string;
  login_time: string;
  expires?: string;
  is_active: boolean;
  minutes_until_expiry: number;
}

export interface SessionStats {
  total_sessions: number;
  active_sessions: number;
  expired_sessions: number;
  unique_users: number;
  unique_ips: number;
  latest_login: string;
  earliest_login: string;
}

export interface FilterOptions {
  sources: string[];
  services: string[];
  recentUsers: Array<{ email: string; name: string; last_login: string }>;
}

export interface ServerLogFile {
  name: string;
  path?: string;
  type?: string;
  unit?: string;
  size?: number;
  modified?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────
export const levelColors: Record<string, 'error' | 'warning' | 'info' | 'success' | 'default'> = {
  ERROR: 'error', WARN: 'warning', INFO: 'info', SUCCESS: 'success', DEBUG: 'default'
};
export const levelIcons: Record<string, React.ReactNode> = {
  ERROR: React.createElement(IconAlertCircle, { size: 14 }),
  WARN: React.createElement(IconAlertTriangle, { size: 14 }),
  INFO: React.createElement(IconInfoCircle, { size: 14 }),
  DEBUG: React.createElement(IconBug, { size: 14 }),
  SUCCESS: React.createElement(IconCheck, { size: 14 }),
};

export const ALL_LEVELS = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'SUCCESS'];

export const STAT_CARD = (color: string) => ({
  borderLeft: `4px solid ${color}`,
  transition: 'box-shadow 0.2s',
  '&:hover': { boxShadow: 4 },
});

export const SERVER_LOG_LABELS: Record<string, string> = {
  'nginx-access': 'Nginx Access',
  'nginx-error': 'Nginx Error',
  'mariadb-error': 'MariaDB Error',
  'journal-backend': 'Backend Journal',
  'journal-omai': 'OMAI Journal',
};
