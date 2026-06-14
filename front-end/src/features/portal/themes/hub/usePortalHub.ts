import { metricsAPI } from '@/api/metrics.api';
import { apiClient } from '@/api/utils/axiosInstance';
import { useAuth } from '@/context/AuthContext';
import { useChurch } from '@/context/ChurchContext';
import { useLanguage } from '@/context/LanguageContext';
import { getPortalUserDisplayName } from '@/features/portal/themes/portalUserDisplay';
import type { PipelineStageCounts } from '@/features/portal/RecordPipelineStatus';
import {
  BookOpen,
  Calendar,
  ClipboardList,
  Cross,
  Heart,
  Settings,
  Upload,
  Users,
} from '@/ui/icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  ActivityFilter,
  DashboardState,
  PortalHubViewModel,
  RecentRecord,
  RecordCounts,
  SearchResult,
} from './portalHubTypes';
import { formatClergy, formatDate, formatRelativeTime, getTodayFormatted } from './portalHubUtils';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  church_admin: 'Church Admin',
  priest: 'Priest',
  deacon: 'Deacon',
  editor: 'Editor',
  viewer: 'Viewer',
  guest: 'Guest',
};

const ADMIN_ROLES = new Set(['super_admin', 'admin']);

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 font-semibold rounded-sm px-0.5 dark:bg-yellow-700">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function usePortalHub(): PortalHubViewModel {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeChurchId, churchMetadata } = useChurch();
  const { t } = useLanguage();
  const role = user?.role || '';
  const isAdmin = ADMIN_ROLES.has(role);

  const greeting = (() => {
    const name = getPortalUserDisplayName(user);
    if (name !== 'User') {
      return t('portal.welcome_back').replace('{name}', name.split(' ')[0]);
    }
    return t('portal.welcome');
  })();
  const roleLabel = ROLE_LABELS[role] || role;
  const todayFormatted = getTodayFormatted();

  const metaChurchName = (churchMetadata as { church_name_display?: string; church_name?: string })?.church_name_display
    || (churchMetadata as { church_name?: string })?.church_name;
  const [resolvedChurchName, setResolvedChurchName] = useState<string | null>(null);

  useEffect(() => {
    if (metaChurchName && metaChurchName !== 'System Admin') {
      setResolvedChurchName(metaChurchName);
      return;
    }
    if (!activeChurchId) return;
    let cancelled = false;
    churchApi.getChurchesFallback(activeChurchId).then((name) => {
      if (!cancelled) setResolvedChurchName(name);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeChurchId, metaChurchName]);

  const churchName = resolvedChurchName;
  const [rectorYears, setRectorYears] = useState<number | null>(null);

  useEffect(() => {
    if (!activeChurchId) { setRectorYears(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res: { data?: { years?: number }; years?: number } = await apiClient.get(`/churches/${activeChurchId}/clergy-tenure`);
        const data = res?.data ?? res;
        const years = data?.years;
        if (!cancelled) setRectorYears(typeof years === 'number' && years >= 0 ? years : null);
      } catch {
        if (!cancelled) setRectorYears(null);
      }
    })();
    return () => { cancelled = true; };
  }, [activeChurchId]);

  const [recentBaptism, setRecentBaptism] = useState<RecentRecord[]>([]);
  const [recentMarriage, setRecentMarriage] = useState<RecentRecord[]>([]);
  const [recentFuneral, setRecentFuneral] = useState<RecentRecord[]>([]);
  const [counts, setCounts] = useState<RecordCounts>({ baptism: 0, marriage: 0, funeral: 0 });
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [pipelineCounts, setPipelineCounts] = useState<PipelineStageCounts>({
    uploaded: 0, processing: 0, admin_review: 0, approved: 0, published: 0,
  });
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const controller = new AbortController();
    const runSearch = async () => {
      setSearchLoading(true);
      try {
        const [baptismRes, marriageRes, funeralRes] = await Promise.allSettled([
          metricsAPI.records.getBaptismRecords({ limit: 10, search: debouncedSearch, sortField: 'reception_date', sortDirection: 'desc' }),
          metricsAPI.records.getMarriageRecords({ limit: 10, search: debouncedSearch, sortField: 'mdate', sortDirection: 'desc' }),
          metricsAPI.records.getFuneralRecords({ limit: 10, search: debouncedSearch, sortField: 'burial_date', sortDirection: 'desc' }),
        ]);
        if (controller.signal.aborted) return;
        const results: SearchResult[] = [];
        const pushBaptism = (rows: Record<string, unknown>[]) => rows.slice(0, 5).forEach((r) => {
          results.push({
            id: r.id as number,
            label: (r.child_name || r.first_name || [r.first_name, r.last_name].filter(Boolean).join(' ') || '\u2014') as string,
            date: (r.reception_date || r.baptism_date || r.date_entered || '') as string,
            sub: formatClergy(r.clergy as string) ?? formatClergy(r.priest_name as string),
            type: 'baptism',
          });
        });
        if (baptismRes.status === 'fulfilled') {
          const val = baptismRes.value as { records?: unknown[]; data?: unknown[] };
          pushBaptism((val?.records ?? val?.data ?? []) as Record<string, unknown>[]);
        }
        if (marriageRes.status === 'fulfilled') {
          const val = marriageRes.value as { records?: unknown[]; data?: unknown[] };
          (val?.records ?? val?.data ?? []).slice(0, 5).forEach((row) => {
            const r = row as Record<string, unknown>;
            results.push({
              id: r.id as number,
              label: [
                [r.groomFirstName || r.fname_groom, r.groomLastName || r.lname_groom].filter(Boolean).join(' '),
                [r.brideFirstName || r.fname_bride, r.brideLastName || r.lname_bride].filter(Boolean).join(' '),
              ].filter(Boolean).join(' & ') || '\u2014',
              date: (r.mdate || r.marriage_date || r.date_entered || '') as string,
              sub: formatClergy(r.clergy as string) ?? formatClergy(r.priest_name as string),
              type: 'marriage',
            });
          });
        }
        if (funeralRes.status === 'fulfilled') {
          const val = funeralRes.value as { records?: unknown[]; data?: unknown[] };
          (val?.records ?? val?.data ?? []).slice(0, 5).forEach((row) => {
            const r = row as Record<string, unknown>;
            results.push({
              id: r.id as number,
              label: (r.name || r.deceased_name || [r.name, r.lastname].filter(Boolean).join(' ') || '\u2014') as string,
              date: (r.burial_date || r.funeral_date || r.deceased_date || '') as string,
              sub: formatClergy(r.clergy as string) ?? formatClergy(r.priest_name as string),
              type: 'funeral',
            });
          });
        }
        results.sort((a, b) => {
          const da = a.date ? new Date(a.date).getTime() : 0;
          const db = b.date ? new Date(b.date).getTime() : 0;
          return db - da;
        });
        setSearchResults(results);
      } catch { /* non-critical */ } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    };
    runSearch();
    return () => controller.abort();
  }, [debouncedSearch]);

  const loadPipelineData = useCallback(async () => {
    setPipelineLoading(true);
    try {
      const res: { data?: PipelineStageCounts } & PipelineStageCounts = await apiClient.get('/record-batches/summary');
      const data = res.data || res;
      setPipelineCounts({
        uploaded: data.uploaded || 0,
        processing: data.processing || 0,
        admin_review: data.admin_review || 0,
        approved: data.approved || 0,
        published: data.published || 0,
      });
    } catch { /* optional */ } finally {
      setPipelineLoading(false);
    }
  }, []);

  const loadRecentRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const [baptismRes, marriageRes, funeralRes] = await Promise.allSettled([
        metricsAPI.records.getBaptismRecords({ limit: 5, sortField: 'reception_date', sortDirection: 'desc' }),
        metricsAPI.records.getMarriageRecords({ limit: 5, sortField: 'mdate', sortDirection: 'desc' }),
        metricsAPI.records.getFuneralRecords({ limit: 5, sortField: 'burial_date', sortDirection: 'desc' }),
      ]);
      if (baptismRes.status === 'fulfilled') {
        const val = baptismRes.value as { records?: unknown[]; data?: unknown[]; totalRecords?: number; total?: number; pagination?: { total?: number } };
        const rows = (val?.records ?? val?.data ?? []) as Record<string, unknown>[];
        const total = val?.totalRecords ?? val?.total ?? val?.pagination?.total ?? rows.length;
        setCounts((prev) => ({ ...prev, baptism: total }));
        setRecentBaptism(rows.slice(0, 5).map((r) => ({
          id: r.id as number,
          label: (r.child_name || r.first_name || [r.first_name, r.last_name].filter(Boolean).join(' ') || '\u2014') as string,
          date: (r.reception_date || r.baptism_date || r.date_entered || '') as string,
          sub: formatClergy(r.clergy as string) ?? formatClergy(r.priest_name as string),
          type: 'baptism' as const,
        })));
      }
      if (marriageRes.status === 'fulfilled') {
        const val = marriageRes.value as { records?: unknown[]; data?: unknown[]; totalRecords?: number; total?: number; pagination?: { total?: number } };
        const rows = (val?.records ?? val?.data ?? []) as Record<string, unknown>[];
        const total = val?.totalRecords ?? val?.total ?? val?.pagination?.total ?? rows.length;
        setCounts((prev) => ({ ...prev, marriage: total }));
        setRecentMarriage(rows.slice(0, 5).map((r) => ({
          id: r.id as number,
          label: [
            [r.groomFirstName || r.fname_groom, r.groomLastName || r.lname_groom].filter(Boolean).join(' '),
            [r.brideFirstName || r.fname_bride, r.brideLastName || r.lname_bride].filter(Boolean).join(' '),
          ].filter(Boolean).join(' & ') || '\u2014',
          date: (r.mdate || r.marriage_date || r.date_entered || '') as string,
          sub: formatClergy(r.clergy as string) ?? formatClergy(r.priest_name as string),
          type: 'marriage' as const,
        })));
      }
      if (funeralRes.status === 'fulfilled') {
        const val = funeralRes.value as { records?: unknown[]; data?: unknown[]; totalRecords?: number; total?: number; pagination?: { total?: number } };
        const rows = (val?.records ?? val?.data ?? []) as Record<string, unknown>[];
        const total = val?.totalRecords ?? val?.total ?? val?.pagination?.total ?? rows.length;
        setCounts((prev) => ({ ...prev, funeral: total }));
        setRecentFuneral(rows.slice(0, 5).map((r) => ({
          id: r.id as number,
          label: (r.name || r.deceased_name || [r.name, r.lastname].filter(Boolean).join(' ') || '\u2014') as string,
          date: (r.burial_date || r.funeral_date || r.deceased_date || '') as string,
          sub: formatClergy(r.clergy as string) ?? formatClergy(r.priest_name as string),
          type: 'funeral' as const,
        })));
      }
    } catch { /* non-critical */ } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecentRecords();
    loadPipelineData();
  }, [loadRecentRecords, loadPipelineData]);

  const allActivity = useMemo(() => {
    const combined = [...recentBaptism, ...recentMarriage, ...recentFuneral];
    return combined
      .filter((r) => activityFilter === 'all' || r.type === activityFilter)
      .sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      })
      .slice(0, 8);
  }, [recentBaptism, recentMarriage, recentFuneral, activityFilter]);

  const totalRecords = counts.baptism + counts.marriage + counts.funeral;
  const pipelineTotal = pipelineCounts.uploaded + pipelineCounts.processing
    + pipelineCounts.admin_review + pipelineCounts.approved;
  const hasUnpublishedBatches = pipelineTotal > 0;

  const dashboardState: DashboardState = recordsLoading
    ? 'dashboard'
    : totalRecords === 0 && !hasUnpublishedBatches
      ? 'onboarding'
      : totalRecords === 0 && hasUnpublishedBatches
        ? 'pipeline'
        : 'dashboard';

  const pageSubtitle = [
    churchName,
    rectorYears != null ? `${rectorYears} ${rectorYears === 1 ? 'year' : 'years'} as rector` : null,
    todayFormatted,
    roleLabel,
  ].filter(Boolean).join(' · ');

  const quickActions = useMemo(() => [
    { icon: Upload, label: t('portal.upload_records'), description: 'Import historical sacrament books', onClick: () => navigate('/portal/ocr') },
    { icon: BookOpen, label: t('portal.certificates'), description: t('portal.generate_documents'), onClick: () => navigate('/portal/certificates') },
    { icon: Calendar, label: t('portal.sacramental_calendar'), description: t('portal.restriction_dates'), onClick: () => navigate('/portal/sacramental-restrictions') },
    { icon: ClipboardList, label: t('portal.interactive_reports'), description: t('portal.delegate_record_collection'), onClick: () => navigate('/apps/records/interactive-reports') },
    { icon: Settings, label: t('portal.parish_settings'), description: t('portal.church_configuration'), onClick: () => navigate('/account/church-details') },
  ], [navigate, t]);

  return {
    greeting,
    pageSubtitle,
    dashboardState,
    isAdmin,
    recordsLoading,
    pipelineLoading,
    showPipeline: (dashboardState === 'pipeline' || (dashboardState === 'dashboard' && hasUnpublishedBatches)) && !pipelineLoading,
    counts,
    totalRecords,
    recentBaptism,
    recentMarriage,
    recentFuneral,
    pipelineCounts,
    allActivity,
    activityFilter,
    setActivityFilter,
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    searchResults,
    searchLoading,
    searchInputRef,
    quickActions,
    typeLabels: { baptism: 'Baptism', marriage: 'Marriage', funeral: 'Funeral' },
    typeColors: {
      baptism: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      marriage: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
      funeral: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
    },
    typeIcons: { baptism: Users, marriage: Heart, funeral: Cross },
    t,
    formatDate,
    formatRelativeTime,
    highlightMatch,
    navigate,
    onSearchResultClick: (result) => navigate(`/portal/records/${result.type}`),
    onUpload: () => navigate('/portal/ocr'),
    onAddBaptism: () => navigate('/portal/records/baptism/new'),
    onAddMarriage: () => navigate('/portal/records/marriage/new'),
    onAddFuneral: () => navigate('/portal/records/funeral/new'),
    onRecordsType: (type) => navigate(type === 'all' ? '/portal/records' : `/portal/records?type=${type}`),
  };
}

// Small helper to avoid duplicating church fetch in hook
const churchApi = {
  async getChurchesFallback(activeChurchId: number): Promise<string | null> {
    const res: { data?: { churches?: { id: number; name?: string; church_name?: string }[] }; churches?: { id: number; name?: string; church_name?: string }[] } = await apiClient.get('/my/churches');
    const raw = res.data?.churches || res.churches || [];
    const match = (Array.isArray(raw) ? raw : []).find((c) => c.id === activeChurchId);
    return match ? (match.name || match.church_name || null) : null;
  },
};
