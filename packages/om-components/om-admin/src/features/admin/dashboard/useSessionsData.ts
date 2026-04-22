/**
 * useSessionsData — fetches and manages the sessions list, stats, and
 * filter/pagination state for SessionsTab.
 *
 * Owns 7 of the 16 useStates that previously lived in SessionsTab.tsx
 * (STATE_EXPLOSION refactor — OMD-838).
 */
import { useCallback, useEffect, useState } from 'react';
import { adminAPI } from '@/api/admin.api';
import type { SessionData, SessionStats } from './logSearchTypes';

const SESSION_PER_PAGE = 20;

export type SessionStatusFilter = 'all' | 'active' | 'expired';

export interface UseSessionsDataResult {
  sessions: SessionData[];
  stats: SessionStats | null;
  loading: boolean;
  search: string;
  setSearch: (s: string) => void;
  statusFilter: SessionStatusFilter;
  setStatusFilter: (s: SessionStatusFilter) => void;
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  refresh: () => Promise<void>;
}

interface UseSessionsDataOptions {
  active: boolean;
  onError?: (msg: string) => void;
}

export function useSessionsData({ active, onError }: UseSessionsDataOptions): UseSessionsDataResult {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SessionStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: SESSION_PER_PAGE,
        offset: (page - 1) * SESSION_PER_PAGE,
      };
      const response = await adminAPI.sessions.getAll(filters);
      const transformed = (response.sessions || []).map((s: any) => {
        const u = s.user || {};
        return {
          session_id: s.session_id,
          user_id: u.id || u.user_id || 0,
          email: u.email || 'Unknown',
          first_name: u.first_name || u.firstName || '',
          last_name: u.last_name || u.lastName || '',
          role: u.role || 'unknown',
          church_name: u.church_name || u.churchName || '',
          ip_address: s.ip_address || 'N/A',
          user_agent: s.user_agent || 'Unknown',
          login_time: s.login_time || s.created_at || new Date().toISOString(),
          expires: s.expires || s.expires_readable,
          is_active: s.is_active === 1 || s.is_active === true,
          minutes_until_expiry: s.minutes_until_expiry || 0,
        };
      });
      setSessions(transformed);
      setTotalPages(Math.ceil((response.total || transformed.length) / SESSION_PER_PAGE));
    } catch (err) {
      onError?.('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, onError]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await adminAPI.sessions.getStats();
      const bs = response.stats || response.statistics || response;
      if (bs) {
        setStats({
          total_sessions: bs.total_sessions || 0,
          active_sessions: bs.active_sessions || 0,
          expired_sessions: bs.expired_sessions || 0,
          unique_users: bs.unique_users || 0,
          unique_ips: bs.unique_ips || 0,
          latest_login: bs.newest_session || bs.latest_login || '',
          earliest_login: bs.oldest_session || bs.earliest_login || '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch session stats:', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([fetchSessions(), fetchStats()]);
  }, [fetchSessions, fetchStats]);

  useEffect(() => {
    if (active) {
      fetchSessions();
      fetchStats();
    }
  }, [active, search, statusFilter, page]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    sessions,
    stats,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    totalPages,
    refresh,
  };
}
