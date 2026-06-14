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
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Skeleton,
} from '@/components/portal/ui';
import { useAuth } from '@/context/AuthContext';
import { useChurch } from '@/context/ChurchContext';
import RecordPipelineStatus, { type PipelineStageCounts } from './RecordPipelineStatus';
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ClipboardList,
  Cross,
  Droplets,
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
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex size-9 items-center justify-center rounded-lg ${iconColor}`}>
              <Icon size={18} />
            </div>
            <CardTitle className="text-[15px]">{title}</CardTitle>
          </div>
          <span className="text-2xl font-semibold text-foreground">
            {count.toLocaleString()}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
          </div>
        ) : records.length === 0 ? (
          <p className="py-3 text-center text-[13px] text-muted-foreground">
            {t('common.no_records_yet')}
          </p>
        ) : (
          <div className="space-y-2">
            {records.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between py-1">
                <span className="truncate text-[13px] text-foreground">{rec.label}</span>
                <span className="ml-3 whitespace-nowrap text-[12px] text-muted-foreground">
                  {formatDate(rec.date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      <CardFooter className="gap-2 border-t border-border py-3">
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          <Eye size={14} /> {t('common.view_all')}
        </Button>
        <Button variant="secondary" size="sm" className="ml-auto" onClick={onAddNew}>
          <Plus size={14} /> {t('common.add_new')}
        </Button>
      </CardFooter>
    </Card>
  );
}

/* ── ToolItem (Bottom tools grid) ── */

function ToolItem({ icon: Icon, label, description, onClick }: {
  icon: React.ElementType; label: string; description: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-accent">
        <Icon className="text-muted-foreground group-hover:text-accent-foreground" size={18} />
      </div>
      <p className="mb-0.5 text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

/**
 * Format a clergy name for display in Recent Activity / search results.
 * Adds the "Fr." honorific only when the value doesn't already start
 * with one — otherwise we end up with double-prefixed entries like
 * "Fr. Rev. James Parsells".
 *
 * Honorifics matched (case-insensitive, leading whitespace tolerated):
 *   Fr / Father / Rev / Reverend / V.Rev / Very Reverend / Archpriest /
 *   Hieromonk / Hierodeacon / Deacon / Bishop / Metropolitan
 */
const HONORIFIC_RE = /^(?:fr|father|rev|reverend|v\.?\s*rev|very\s+reverend|archpriest|protopresbyter|hieromonk|hierodeacon|deacon|protodeacon|bishop|archbishop|metropolitan)\b\.?/i;
function formatClergy(name?: string | null): string | undefined {
  if (!name) return undefined;
  const trimmed = String(name).trim();
  if (!trimmed) return undefined;
  return HONORIFIC_RE.test(trimmed) ? trimmed : `Fr. ${trimmed}`;
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

  /* ── Rector tenure resolution ──
     Computes "Rector at <church> for N years" by asking the server
     for the earliest year the current user's last name appears as
     clergy in any sacrament record. Returns null when the user
     isn't a clergy member of this parish. */
  const [rectorYears, setRectorYears] = useState<number | null>(null);
  useEffect(() => {
    if (!activeChurchId) { setRectorYears(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res: any = await apiClient.get(`/churches/${activeChurchId}/clergy-tenure`);
        const data = res?.data ?? res;
        const years = data?.years;
        if (!cancelled) setRectorYears(typeof years === 'number' && years >= 0 ? years : null);
      } catch {
        if (!cancelled) setRectorYears(null);
      }
    })();
    return () => { cancelled = true; };
  }, [activeChurchId]);

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
              sub: formatClergy(r.clergy) ?? formatClergy(r.priest_name),
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
              sub: formatClergy(r.clergy) ?? formatClergy(r.priest_name),
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
              sub: formatClergy(r.clergy) ?? formatClergy(r.priest_name),
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
            sub: formatClergy(r.clergy) ?? formatClergy(r.priest_name),
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
            sub: formatClergy(r.clergy) ?? formatClergy(r.priest_name),
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
            sub: formatClergy(r.clergy) ?? formatClergy(r.priest_name),
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
    <div className="mx-auto min-h-[60vh] max-w-[1200px]">

      {/* ═══ Section 1: Welcome Bar ═══ */}
      <section className="mb-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="mb-0.5 text-sm font-medium text-foreground">{greeting}</h1>
            {churchName && (
              <p className="mb-0.5 text-sm font-medium text-foreground">
                {rectorYears != null
                  ? `Rector at ${churchName} for ${rectorYears} ${rectorYears === 1 ? 'year' : 'years'}`
                  : churchName}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{todayFormatted}</span>
              <span>&middot;</span>
              <span>{roleLabel}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/portal/upload')}>
              <Upload size={15} /> {t('portal.upload_records')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus size={15} /> {t('portal.add_record')} <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => navigate('/portal/records/baptism/new')}>
                  <Users size={15} className="text-blue-600 dark:text-blue-400" /> {t('portal.baptism_record')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/portal/records/marriage/new')}>
                  <Heart size={15} className="text-rose-600 dark:text-rose-400" /> {t('portal.marriage_record')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/portal/records/funeral/new')}>
                  <Cross size={15} className="text-violet-600 dark:text-violet-400" /> {t('portal.funeral_record')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </section>

      {/* ═══ Section 2: Search ═══ */}
      <section className="mb-8">
        <div className="relative">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('portal.search_placeholder')}
              className="h-11 rounded-xl pl-11 pr-10"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {debouncedSearch.trim() && (
            <Card className="mt-2 gap-0 overflow-hidden py-0 shadow-lg">
              {searchLoading ? (
                <CardContent className="space-y-3 py-5">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
                </CardContent>
              ) : searchResults.length === 0 ? (
                <CardContent className="py-8 text-center">
                  <p className="text-[13px] text-muted-foreground">
                    No records found for &ldquo;{debouncedSearch}&rdquo;
                  </p>
                </CardContent>
              ) : (
                <>
                  <div className="border-b border-border px-4 py-2.5">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                  <div className="max-h-[360px] divide-y divide-border overflow-y-auto">
                    {searchResults.map((result) => {
                      const Icon = typeIcons[result.type];
                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          type="button"
                          onClick={() => handleResultClick(result)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                        >
                          <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${typeColors[result.type]}`}>
                            <Icon size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-foreground">
                              {highlightMatch(result.label, debouncedSearch)}
                            </p>
                            <p className="text-[12px] text-muted-foreground">
                              {typeLabels[result.type]} {result.sub && `\u00b7 ${result.sub}`}
                            </p>
                          </div>
                          <span className="whitespace-nowrap text-[12px] text-muted-foreground">
                            {formatDate(result.date)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </section>

      {/* ═══ CASE 1: Onboarding ═══ */}
      {dashboardState === 'onboarding' && (
        <section className="mb-8">
          <Card className="py-10 text-center">
            <CardContent className="flex flex-col items-center">
              <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-muted">
                <Upload className="text-muted-foreground" size={28} />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-foreground">
                {t('portal.upload_historical')}
              </h2>
              <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
                {t('portal.upload_historical_desc')}
              </p>
              <Button onClick={() => navigate('/portal/upload')}>
                <Upload size={18} /> {t('portal.upload_records')}
              </Button>
            </CardContent>
          </Card>
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
              <h2 className="mb-4 text-[17px] font-semibold text-foreground">
                {t('portal.parish_records')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <RecordCard
                  title={t('portal.baptisms')}
                  count={counts.baptism}
                  icon={Droplets}
                  iconColor="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  records={recentBaptism.slice(0, 3)}
                  loading={recordsLoading}
                  onViewAll={() => navigate('/portal/records?type=baptism')}
                  onAddNew={() => navigate('/portal/records/baptism/new')}
                />
                <RecordCard
                  title={t('portal.marriages')}
                  count={counts.marriage}
                  icon={Heart}
                  iconColor="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                  records={recentMarriage.slice(0, 3)}
                  loading={recordsLoading}
                  onViewAll={() => navigate('/portal/records?type=marriage')}
                  onAddNew={() => navigate('/portal/records/marriage/new')}
                />
                <RecordCard
                  title={t('portal.funerals')}
                  count={counts.funeral}
                  icon={Cross}
                  iconColor="bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400"
                  records={recentFuneral.slice(0, 3)}
                  loading={recordsLoading}
                  onViewAll={() => navigate('/portal/records?type=funeral')}
                  onAddNew={() => navigate('/portal/records/funeral/new')}
                />
              </div>
            </section>
          )}

          {/* ── Section 4: Recent Activity ── */}
          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-foreground">
                {t('portal.recent_activity')}
              </h2>
              <div className="flex items-center gap-1">
                {(['all', 'baptism', 'marriage', 'funeral'] as const).map((f) => (
                  <Button
                    key={f}
                    variant={activityFilter === f ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setActivityFilter(f)}
                  >
                    {f === 'all' ? t('portal.all') : f === 'baptism' ? t('portal.baptisms') : f === 'marriage' ? t('portal.marriages') : t('portal.funerals')}
                  </Button>
                ))}
              </div>
            </div>
            <Card className="gap-0 overflow-hidden py-0">
              {recordsLoading ? (
                <CardContent className="space-y-3 py-5">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </CardContent>
              ) : allActivity.length === 0 ? (
                <CardContent className="py-10 text-center">
                  <p className="text-[13px] text-muted-foreground">
                    {t('portal.no_recent_activity')}
                  </p>
                </CardContent>
              ) : (
                <div className="divide-y divide-border">
                  {allActivity.map((rec) => {
                    const Icon = typeIcons[rec.type];
                    return (
                      <div key={`${rec.type}-${rec.id}`} className="flex items-center gap-4 px-5 py-3.5">
                        <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${typeColors[rec.type]}`}>
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-foreground">{rec.label}</p>
                          <p className="text-[12px] text-muted-foreground">
                            {typeLabels[rec.type]} {rec.sub && `\u00b7 ${rec.sub}`}
                          </p>
                        </div>
                        <span className="whitespace-nowrap text-[12px] text-muted-foreground">
                          {formatRelativeTime(rec.date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </section>

          {/* ── Section 5: Tools ── */}
          <section className="mb-8">
            <h2 className="mb-4 text-[17px] font-semibold text-foreground">
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
