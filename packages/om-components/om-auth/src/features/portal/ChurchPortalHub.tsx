/**
 * ChurchPortalHub — Parish Data Ingestion & Analytics Control Center
 *
 * Enterprise SaaS dashboard with 3 dynamic states:
 *   1. Onboarding — no records uploaded
 *   2. Pipeline — records uploaded but not yet published
 *   3. Parish Dashboard — records published, full operational view
 *
 * Role-based visibility:
 *   - Users see simplified pipeline (no OCR internals)
 *   - Admins see full pipeline with review stage
 *   - Super admins see diagnostics links
 */

import { metricsAPI } from '@/api/metrics.api';
import { apiClient } from '@/api/utils/axiosInstance';
import { useAuth } from '@/context/AuthContext';
import { useChurch } from '@/context/ChurchContext';
import RecordPipelineStatus, { type PipelineStageCounts } from './RecordPipelineStatus';
import { Skeleton } from '@mui/material';
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Cross,
  Eye,
  Heart,
  Plus,
  Search,
  Settings,
  Upload,
  Users,
  X,
} from '@/ui/icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';

/* ─── Types ─── */

interface RecentRecord {
  id: number;
  label: string;
  date: string;
  sub?: string;
  type: 'baptism' | 'marriage' | 'funeral';
}

interface RecordCounts {
  baptism: number;
  marriage: number;
  funeral: number;
}

interface SearchResult {
  id: number;
  label: string;
  date: string;
  sub?: string;
  type: 'baptism' | 'marriage' | 'funeral';
}

type DashboardState = 'onboarding' | 'pipeline' | 'dashboard';

/* ─── Helpers ─── */

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

function formatDate(dateStr: string): string {
  if (!dateStr) return '\u2014';
  try {
    // For YYYY-MM-DD strings, append T12:00 to avoid UTC midnight → local timezone shift
    const safeStr = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr}T12:00:00` : dateStr;
    return new Date(safeStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  } catch {
    return formatDate(dateStr);
  }
}

function getTodayFormatted(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-700 font-semibold rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   Sub-Components — Enterprise SaaS style
   ══════════════════════════════════════════════════════════ */

/* ── RecordCard (Parish Records section) ── */

function RecordCard({ title, count, icon: Icon, iconColor, records, loading, onViewAll, onAddNew }: {
  title: string; count: number; icon: React.ElementType;
  iconColor: string; records: RecentRecord[]; loading: boolean;
  onViewAll: () => void; onAddNew: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconColor}`}>
              <Icon size={18} />
            </div>
            <h3 className="font-['Inter'] font-semibold text-[15px] text-gray-900 dark:text-white">{title}</h3>
          </div>
          <span className="font-['Inter'] text-2xl font-semibold text-gray-900 dark:text-white">
            {count.toLocaleString()}
          </span>
        </div>

        {/* Recent records */}
        {loading ? (
          <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} height={20} />)}</div>
        ) : records.length === 0 ? (
          <p className="font-['Inter'] text-[13px] text-gray-400 dark:text-gray-500 text-center py-3">
            {t('common.no_records_yet')}
          </p>
        ) : (
          <div className="space-y-2">
            {records.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between py-1">
                <span className="font-['Inter'] text-[13px] text-gray-700 dark:text-gray-300 truncate">
                  {rec.label}
                </span>
                <span className="font-['Inter'] text-[12px] text-gray-400 dark:text-gray-500 ml-3 whitespace-nowrap">
                  {formatDate(rec.date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-3 flex items-center gap-2">
        <button
          onClick={onViewAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-['Inter'] font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <Eye size={14} /> {t('common.view_all')}
        </button>
        <button
          onClick={onAddNew}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-['Inter'] font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ml-auto"
        >
          <Plus size={14} /> {t('common.add_new')}
        </button>
      </div>
    </div>
  );
}

/* ── ToolItem (Bottom tools grid) ── */

function ToolItem({ icon: Icon, label, description, onClick }: {
  icon: React.ElementType; label: string; description: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all group"
    >
      <div className="w-9 h-9 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-3 group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
        <Icon className="text-gray-600 dark:text-gray-300" size={18} />
      </div>
      <p className="font-['Inter'] font-medium text-[14px] text-gray-900 dark:text-white mb-0.5">{label}</p>
      <p className="font-['Inter'] text-[12px] text-gray-500 dark:text-gray-400">{description}</p>
    </button>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Dashboard Component
   ══════════════════════════════════════════════════════════ */

const ChurchPortalHub: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeChurchId, churchMetadata } = useChurch();
  const { t } = useLanguage();
  const role = user?.role || '';
  const isAdmin = ADMIN_ROLES.has(role);

  const greeting = user?.first_name ? `${t('portal.welcome_back').replace('{name}', user.first_name)}` : t('portal.welcome');
  const roleLabel = ROLE_LABELS[role] || role;
  const todayFormatted = getTodayFormatted();

  /* ── Church name resolution ── */
  const metaChurchName = (churchMetadata as any)?.church_name_display || (churchMetadata as any)?.church_name;
  const [resolvedChurchName, setResolvedChurchName] = useState<string | null>(null);

  useEffect(() => {
    if (metaChurchName && metaChurchName !== 'System Admin') {
      setResolvedChurchName(metaChurchName);
      return;
    }
    if (!activeChurchId) return;
    let cancelled = false;
    const fetchName = async () => {
      try {
        const res: any = await apiClient.get('/my/churches');
        const raw = res.data?.churches || res.churches || [];
        const match = (Array.isArray(raw) ? raw : []).find((c: any) => c.id === activeChurchId);
        if (!cancelled && match) setResolvedChurchName(match.name || match.church_name || null);
      } catch { /* non-critical */ }
    };
    fetchName();
    return () => { cancelled = true; };
  }, [activeChurchId, metaChurchName]);

  const churchName = resolvedChurchName;

  /* ── Records data ── */
  const [recentBaptism, setRecentBaptism] = useState<RecentRecord[]>([]);
  const [recentMarriage, setRecentMarriage] = useState<RecentRecord[]>([]);
  const [recentFuneral, setRecentFuneral] = useState<RecentRecord[]>([]);
  const [counts, setCounts] = useState<RecordCounts>({ baptism: 0, marriage: 0, funeral: 0 });
  const [recordsLoading, setRecordsLoading] = useState(true);

  /* ── Pipeline data ── */
  const [pipelineCounts, setPipelineCounts] = useState<PipelineStageCounts>({
    uploaded: 0, processing: 0, admin_review: 0, approved: 0, published: 0,
  });
  const [pipelineLoading, setPipelineLoading] = useState(true);

  /* ── Search state ── */
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [addRecordOpen, setAddRecordOpen] = useState(false);
  const addRecordRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!addRecordOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (addRecordRef.current && !addRecordRef.current.contains(e.target as Node)) {
        setAddRecordOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [addRecordOpen]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Execute search
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

        if (baptismRes.status === 'fulfilled') {
          const val = baptismRes.value as any;
          const rows = val?.records ?? val?.data ?? [];
          rows.slice(0, 5).forEach((r: any) => {
            results.push({
              id: r.id,
              label: r.child_name || r.first_name || [r.first_name, r.last_name].filter(Boolean).join(' ') || '\u2014',
              date: r.reception_date || r.baptism_date || r.date_entered || '',
              sub: r.clergy ? `Fr. ${r.clergy}` : r.priest_name ? `Fr. ${r.priest_name}` : undefined,
              type: 'baptism',
            });
          });
        }
        if (marriageRes.status === 'fulfilled') {
          const val = marriageRes.value as any;
          const rows = val?.records ?? val?.data ?? [];
          rows.slice(0, 5).forEach((r: any) => {
            results.push({
              id: r.id,
              label: [
                [r.groomFirstName || r.fname_groom, r.groomLastName || r.lname_groom].filter(Boolean).join(' '),
                [r.brideFirstName || r.fname_bride, r.brideLastName || r.lname_bride].filter(Boolean).join(' '),
              ].filter(Boolean).join(' & ') || '\u2014',
              date: r.mdate || r.marriage_date || r.date_entered || '',
              sub: r.clergy ? `Fr. ${r.clergy}` : r.priest_name ? `Fr. ${r.priest_name}` : undefined,
              type: 'marriage',
            });
          });
        }
        if (funeralRes.status === 'fulfilled') {
          const val = funeralRes.value as any;
          const rows = val?.records ?? val?.data ?? [];
          rows.slice(0, 5).forEach((r: any) => {
            results.push({
              id: r.id,
              label: r.name || r.deceased_name || [r.name, r.lastname].filter(Boolean).join(' ') || '\u2014',
              date: r.burial_date || r.funeral_date || r.deceased_date || '',
              sub: r.clergy ? `Fr. ${r.clergy}` : r.priest_name ? `Fr. ${r.priest_name}` : undefined,
              type: 'funeral',
            });
          });
        }

        // Sort by date descending
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
      const res: any = await apiClient.get('/record-batches/summary');
      const data = res.data || res;
      setPipelineCounts({
        uploaded: data.uploaded || 0,
        processing: data.processing || 0,
        admin_review: data.admin_review || 0,
        approved: data.approved || 0,
        published: data.published || 0,
      });
    } catch {
      // API may not exist yet — pipeline counts stay at 0
    } finally {
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
        const val = baptismRes.value as any;
        const rows = val?.records ?? val?.data ?? [];
        const total = val?.totalRecords ?? val?.total ?? val?.pagination?.total ?? rows.length;
        setCounts((prev) => ({ ...prev, baptism: total }));
        setRecentBaptism(
          rows.slice(0, 5).map((r: any) => ({
            id: r.id,
            label: r.child_name || r.first_name || [r.first_name, r.last_name].filter(Boolean).join(' ') || '\u2014',
            date: r.reception_date || r.baptism_date || r.date_entered || '',
            sub: r.clergy ? `Fr. ${r.clergy}` : r.priest_name ? `Fr. ${r.priest_name}` : undefined,
            type: 'baptism' as const,
          })),
        );
      }
      if (marriageRes.status === 'fulfilled') {
        const val = marriageRes.value as any;
        const rows = val?.records ?? val?.data ?? [];
        const total = val?.totalRecords ?? val?.total ?? val?.pagination?.total ?? rows.length;
        setCounts((prev) => ({ ...prev, marriage: total }));
        setRecentMarriage(
          rows.slice(0, 5).map((r: any) => ({
            id: r.id,
            label: [
              [r.groomFirstName || r.fname_groom, r.groomLastName || r.lname_groom].filter(Boolean).join(' '),
              [r.brideFirstName || r.fname_bride, r.brideLastName || r.lname_bride].filter(Boolean).join(' '),
            ].filter(Boolean).join(' & ') || '\u2014',
            date: r.mdate || r.marriage_date || r.date_entered || '',
            sub: r.clergy ? `Fr. ${r.clergy}` : r.priest_name ? `Fr. ${r.priest_name}` : undefined,
            type: 'marriage' as const,
          })),
        );
      }
      if (funeralRes.status === 'fulfilled') {
        const val = funeralRes.value as any;
        const rows = val?.records ?? val?.data ?? [];
        const total = val?.totalRecords ?? val?.total ?? val?.pagination?.total ?? rows.length;
        setCounts((prev) => ({ ...prev, funeral: total }));
        setRecentFuneral(
          rows.slice(0, 5).map((r: any) => ({
            id: r.id,
            label: r.name || r.deceased_name || [r.name, r.lastname].filter(Boolean).join(' ') || '\u2014',
            date: r.burial_date || r.funeral_date || r.deceased_date || '',
            sub: r.clergy ? `Fr. ${r.clergy}` : r.priest_name ? `Fr. ${r.priest_name}` : undefined,
            type: 'funeral' as const,
          })),
        );
      }
    } catch { /* Non-critical */ } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecentRecords();
    loadPipelineData();
  }, [loadRecentRecords, loadPipelineData]);

  /* ── Activity feed (combined + sorted) ── */
  const [activityFilter, setActivityFilter] = useState<'all' | 'baptism' | 'marriage' | 'funeral'>('all');

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
  const pipelineTotal = pipelineCounts.uploaded + pipelineCounts.processing +
    pipelineCounts.admin_review + pipelineCounts.approved;
  const hasUnpublishedBatches = pipelineTotal > 0;

  /* ── Determine dashboard state ── */
  const dashboardState: DashboardState = recordsLoading
    ? 'dashboard' // show skeleton-friendly layout while loading
    : totalRecords === 0 && !hasUnpublishedBatches
      ? 'onboarding'
      : totalRecords === 0 && hasUnpublishedBatches
        ? 'pipeline'
        : 'dashboard';

  /* ── Search result navigation ── */
  const handleResultClick = (result: SearchResult) => {
    navigate(`/portal/records/${result.type}`);
  };

  const typeLabels: Record<string, string> = {
    baptism: 'Baptism', marriage: 'Marriage', funeral: 'Funeral',
  };
  const typeColors: Record<string, string> = {
    baptism: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    marriage: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
    funeral: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
  };
  const typeIcons: Record<string, React.ElementType> = {
    baptism: Users, marriage: Heart, funeral: Cross,
  };

  /* ══════════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-[60vh] max-w-[1200px] mx-auto">

      {/* ═══ Section 1: Welcome Bar ═══ */}
      <section className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-['Inter'] text-[17px] font-semibold text-gray-900 dark:text-white mb-0.5">
              {greeting}
            </h1>
            {churchName && (
              <p className="font-['Inter'] text-[14px] font-medium text-gray-700 dark:text-gray-200 mb-0.5">
                {churchName}
              </p>
            )}
            <div className="flex items-center gap-2 text-[12px] font-['Inter'] text-gray-400 dark:text-gray-500">
              <span>{todayFormatted}</span>
              <span>&middot;</span>
              <span>{roleLabel}</span>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate('/portal/upload')}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-['Inter'] text-[13px] font-medium text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-sm"
            >
              <Upload size={15} /> {t('portal.upload_records')}
            </button>
            <div ref={addRecordRef} className="relative">
              <button
                onClick={() => setAddRecordOpen((p) => !p)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-['Inter'] text-[13px] font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm"
              >
                <Plus size={15} /> {t('portal.add_record')} <ChevronDown size={14} className={`transition-transform ${addRecordOpen ? 'rotate-180' : ''}`} />
              </button>
              {addRecordOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={() => { navigate('/portal/records/baptism/new'); setAddRecordOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-left font-['Inter'] text-[13px] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Users size={15} className="text-blue-600 dark:text-blue-400" /> {t('portal.baptism_record')}
                  </button>
                  <button
                    onClick={() => { navigate('/portal/records/marriage/new'); setAddRecordOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-left font-['Inter'] text-[13px] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Heart size={15} className="text-rose-600 dark:text-rose-400" /> {t('portal.marriage_record')}
                  </button>
                  <button
                    onClick={() => { navigate('/portal/records/funeral/new'); setAddRecordOpen(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-left font-['Inter'] text-[13px] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Cross size={15} className="text-violet-600 dark:text-violet-400" /> {t('portal.funeral_record')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Section 2: Search ═══ */}
      <section className="mb-8">
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('portal.search_placeholder')}
              className="w-full pl-11 pr-10 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-['Inter'] text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500 shadow-sm transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          {debouncedSearch.trim() && (
            <div className="mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
              {searchLoading ? (
                <div className="p-5 space-y-3">
                  {[0, 1, 2].map((i) => <Skeleton key={i} height={36} />)}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <p className="font-['Inter'] text-[13px] text-gray-400 dark:text-gray-500">
                    No records found for &ldquo;{debouncedSearch}&rdquo;
                  </p>
                </div>
              ) : (
                <>
                  <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
                    <p className="font-['Inter'] text-[12px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[360px] overflow-y-auto">
                    {searchResults.map((result) => {
                      const Icon = typeIcons[result.type];
                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleResultClick(result)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColors[result.type]}`}>
                            <Icon size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-['Inter'] text-[13px] font-medium text-gray-900 dark:text-white truncate">
                              {highlightMatch(result.label, debouncedSearch)}
                            </p>
                            <p className="font-['Inter'] text-[12px] text-gray-500 dark:text-gray-400">
                              {typeLabels[result.type]} {result.sub && `\u00b7 ${result.sub}`}
                            </p>
                          </div>
                          <span className="font-['Inter'] text-[12px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                            {formatDate(result.date)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ═══ CASE 1: Onboarding ═══ */}
      {dashboardState === 'onboarding' && (
        <section className="mb-8">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center shadow-sm">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Upload className="text-gray-500 dark:text-gray-400" size={28} />
            </div>
            <h2 className="font-['Inter'] text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('portal.upload_historical')}
            </h2>
            <p className="font-['Inter'] text-[14px] text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
              {t('portal.upload_historical_desc')}
            </p>
            <button
              onClick={() => navigate('/portal/upload')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-['Inter'] text-[14px] font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm"
            >
              <Upload size={18} /> {t('portal.upload_records')}
            </button>
          </div>
        </section>
      )}

      {/* ═══ CASE 2: Pipeline (records uploaded but not published) ═══ */}
      {dashboardState === 'pipeline' && !pipelineLoading && (
        <section className="mb-8">
          <RecordPipelineStatus counts={pipelineCounts} isAdmin={isAdmin} />
        </section>
      )}

      {/* ═══ Pipeline shown on full dashboard too if there are pending batches ═══ */}
      {dashboardState === 'dashboard' && hasUnpublishedBatches && !pipelineLoading && (
        <section className="mb-8">
          <RecordPipelineStatus counts={pipelineCounts} isAdmin={isAdmin} />
        </section>
      )}

      {/* ═══ CASE 3: Full Parish Dashboard ═══ */}
      {(dashboardState === 'dashboard' || dashboardState === 'pipeline') && (
        <>
          {/* ── Section 3: Parish Records ── */}
          {totalRecords > 0 && (
            <section className="mb-8">
              <h2 className="font-['Inter'] font-semibold text-[17px] text-gray-900 dark:text-white mb-4">
                {t('portal.parish_records')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <RecordCard
                  title={t('portal.baptisms')}
                  count={counts.baptism}
                  icon={Users}
                  iconColor="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  records={recentBaptism.slice(0, 3)}
                  loading={recordsLoading}
                  onViewAll={() => navigate('/portal/records/baptism')}
                  onAddNew={() => navigate('/portal/records/baptism/new')}
                />
                <RecordCard
                  title={t('portal.marriages')}
                  count={counts.marriage}
                  icon={Heart}
                  iconColor="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                  records={recentMarriage.slice(0, 3)}
                  loading={recordsLoading}
                  onViewAll={() => navigate('/portal/records/marriage')}
                  onAddNew={() => navigate('/portal/records/marriage/new')}
                />
                <RecordCard
                  title={t('portal.funerals')}
                  count={counts.funeral}
                  icon={Cross}
                  iconColor="bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400"
                  records={recentFuneral.slice(0, 3)}
                  loading={recordsLoading}
                  onViewAll={() => navigate('/portal/records/funeral')}
                  onAddNew={() => navigate('/portal/records/funeral/new')}
                />
              </div>
            </section>
          )}

          {/* ── Section 4: Recent Activity ── */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-['Inter'] font-semibold text-[17px] text-gray-900 dark:text-white">
                {t('portal.recent_activity')}
              </h2>
              <div className="flex items-center gap-1">
                {(['all', 'baptism', 'marriage', 'funeral'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setActivityFilter(f)}
                    className={`px-2.5 py-1 rounded-md font-['Inter'] text-[12px] font-medium transition-colors ${
                      activityFilter === f
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {f === 'all' ? t('portal.all') : f === 'baptism' ? t('portal.baptisms') : f === 'marriage' ? t('portal.marriages') : t('portal.funerals')}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
              {recordsLoading ? (
                <div className="p-5 space-y-3">
                  {[0, 1, 2].map((i) => <Skeleton key={i} height={40} />)}
                </div>
              ) : allActivity.length === 0 ? (
                <div className="text-center py-10">
                  <p className="font-['Inter'] text-[13px] text-gray-400 dark:text-gray-500">
                    {t('portal.no_recent_activity')}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {allActivity.map((rec) => {
                    const Icon = typeIcons[rec.type];
                    return (
                      <div key={`${rec.type}-${rec.id}`} className="flex items-center gap-4 px-5 py-3.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColors[rec.type]}`}>
                          <Icon size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-['Inter'] text-[13px] font-medium text-gray-900 dark:text-white truncate">
                            {rec.label}
                          </p>
                          <p className="font-['Inter'] text-[12px] text-gray-500 dark:text-gray-400">
                            {typeLabels[rec.type]} {rec.sub && `\u00b7 ${rec.sub}`}
                          </p>
                        </div>
                        <span className="font-['Inter'] text-[12px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                          {formatRelativeTime(rec.date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ── Section 5: Tools ── */}
          <section className="mb-8">
            <h2 className="font-['Inter'] font-semibold text-[17px] text-gray-900 dark:text-white mb-4">
              {t('portal.tools')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <ToolItem
                icon={BookOpen}
                label={t('portal.certificates')}
                description={t('portal.generate_documents')}
                onClick={() => navigate('/portal/certificates')}
              />
              <ToolItem
                icon={Calendar}
                label={t('portal.sacramental_calendar')}
                description={t('portal.restriction_dates')}
                onClick={() => navigate('/portal/sacramental-restrictions')}
              />
              <ToolItem
                icon={ClipboardList}
                label={t('portal.interactive_reports')}
                description={t('portal.delegate_record_collection')}
                onClick={() => navigate('/apps/records/interactive-reports')}
              />
              <ToolItem
                icon={Settings}
                label={t('portal.parish_settings')}
                description={t('portal.church_configuration')}
                onClick={() => navigate('/account/church-details')}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default ChurchPortalHub;
