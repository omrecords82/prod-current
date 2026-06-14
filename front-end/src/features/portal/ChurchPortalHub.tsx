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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Skeleton,
} from '@/components/portal/ui';
import { PortalPageHeader } from '@/features/portal/themes/components/PortalPageHeader';
import { PortalQuickActionList } from '@/features/portal/themes/modern/components/PortalQuickActionList';
import { PortalSection } from '@/features/portal/themes/modern/components/PortalSection';
import { PortalStatTile } from '@/features/portal/themes/modern/components/PortalStatTile';
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
   Main Dashboard Component
   ══════════════════════════════════════════════════════════ */

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

  const pageSubtitle = [
    churchName,
    rectorYears != null ? `${rectorYears} ${rectorYears === 1 ? 'year' : 'years'} as rector` : null,
    todayFormatted,
    roleLabel,
  ].filter(Boolean).join(' · ');

  const quickActions = [
    {
      icon: Upload,
      label: t('portal.upload_records'),
      description: 'Import historical sacrament books',
      onClick: () => navigate('/portal/upload'),
    },
    {
      icon: BookOpen,
      label: t('portal.certificates'),
      description: t('portal.generate_documents'),
      onClick: () => navigate('/portal/certificates'),
    },
    {
      icon: Calendar,
      label: t('portal.sacramental_calendar'),
      description: t('portal.restriction_dates'),
      onClick: () => navigate('/portal/sacramental-restrictions'),
    },
    {
      icon: ClipboardList,
      label: t('portal.interactive_reports'),
      description: t('portal.delegate_record_collection'),
      onClick: () => navigate('/apps/records/interactive-reports'),
    },
    {
      icon: Settings,
      label: t('portal.parish_settings'),
      description: t('portal.church_configuration'),
      onClick: () => navigate('/account/church-details'),
    },
  ];

  const showPipeline = (dashboardState === 'pipeline' || (dashboardState === 'dashboard' && hasUnpublishedBatches))
    && !pipelineLoading;

  const activityFilterAction = (
    <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
      {(['all', 'baptism', 'marriage', 'funeral'] as const).map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => setActivityFilter(f)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            activityFilter === f
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {f === 'all' ? t('portal.all') : f === 'baptism' ? t('portal.baptisms') : f === 'marriage' ? t('portal.marriages') : t('portal.funerals')}
        </button>
      ))}
    </div>
  );

  /* ══════════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={greeting}
        description={pageSubtitle || undefined}
        actions={(
          <>
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
          </>
        )}
      />

      {dashboardState === 'onboarding' ? (
        <Card className="py-16 text-center">
          <CardContent className="mx-auto flex max-w-lg flex-col items-center">
            <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-muted">
              <Upload className="text-muted-foreground" size={32} />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">{t('portal.upload_historical')}</h2>
            <p className="mb-6 text-sm text-muted-foreground">{t('portal.upload_historical_desc')}</p>
            <Button onClick={() => navigate('/portal/upload')}>
              <Upload size={18} /> {t('portal.upload_records')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PortalStatTile
              label={t('portal.baptisms')}
              value={counts.baptism}
              icon={Droplets}
              accentClass="bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
              loading={recordsLoading}
              onClick={() => navigate('/portal/records?type=baptism')}
            />
            <PortalStatTile
              label={t('portal.marriages')}
              value={counts.marriage}
              icon={Heart}
              accentClass="bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
              loading={recordsLoading}
              onClick={() => navigate('/portal/records?type=marriage')}
            />
            <PortalStatTile
              label={t('portal.funerals')}
              value={counts.funeral}
              icon={Cross}
              accentClass="bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
              loading={recordsLoading}
              onClick={() => navigate('/portal/records?type=funeral')}
            />
            <PortalStatTile
              label="Total records"
              value={totalRecords}
              icon={Users}
              accentClass="bg-accent text-accent-foreground"
              loading={recordsLoading}
              onClick={() => navigate('/portal/records')}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="space-y-6 xl:col-span-8">
              <PortalSection
                title={t('portal.recent_activity')}
                description="Latest sacrament entries across your parish"
                action={activityFilterAction}
                className="overflow-hidden"
              >
                <div className="relative mb-4">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('portal.search_placeholder')}
                    className="h-10 pl-9 pr-9"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {debouncedSearch.trim() ? (
                  <div className="-mx-5 -mb-5 border-t border-border">
                    {searchLoading ? (
                      <div className="space-y-3 p-5">
                        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                      </div>
                    ) : searchResults.length === 0 ? (
                      <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                        No records found for &ldquo;{debouncedSearch}&rdquo;
                      </p>
                    ) : (
                      <div className="divide-y divide-border">
                        {searchResults.map((result) => {
                          const Icon = typeIcons[result.type];
                          return (
                            <button
                              key={`${result.type}-${result.id}`}
                              type="button"
                              onClick={() => handleResultClick(result)}
                              className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-accent/50"
                            >
                              <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${typeColors[result.type]}`}>
                                <Icon size={15} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {highlightMatch(result.label, debouncedSearch)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {typeLabels[result.type]} {result.sub && `· ${result.sub}`}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground">{formatDate(result.date)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : recordsLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : allActivity.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{t('portal.no_recent_activity')}</p>
                ) : (
                  <div className="-mx-5 -mb-5 divide-y divide-border border-t border-border">
                    {allActivity.map((rec) => {
                      const Icon = typeIcons[rec.type];
                      return (
                        <button
                          key={`${rec.type}-${rec.id}`}
                          type="button"
                          onClick={() => navigate(`/portal/records?type=${rec.type}`)}
                          className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-accent/50"
                        >
                          <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${typeColors[rec.type]}`}>
                            <Icon size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{rec.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {typeLabels[rec.type]} {rec.sub && `· ${rec.sub}`}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatRelativeTime(rec.date)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </PortalSection>
            </div>

            <div className="space-y-6 xl:col-span-4">
              {showPipeline && (
                <RecordPipelineStatus counts={pipelineCounts} isAdmin={isAdmin} />
              )}

              <PortalSection title="Quick actions" description="Common parish workflows">
                <PortalQuickActionList actions={quickActions} />
              </PortalSection>

              {totalRecords > 0 && (
                <PortalSection title={t('portal.parish_records')} description="Jump directly into a sacrament book">
                  <div className="grid grid-cols-1 gap-2">
                    <Button variant="outline" className="justify-start" onClick={() => navigate('/portal/records?type=baptism')}>
                      <Droplets size={16} className="text-blue-600" /> {t('portal.baptisms')}
                      <span className="ml-auto text-muted-foreground">{counts.baptism.toLocaleString()}</span>
                    </Button>
                    <Button variant="outline" className="justify-start" onClick={() => navigate('/portal/records?type=marriage')}>
                      <Heart size={16} className="text-rose-600" /> {t('portal.marriages')}
                      <span className="ml-auto text-muted-foreground">{counts.marriage.toLocaleString()}</span>
                    </Button>
                    <Button variant="outline" className="justify-start" onClick={() => navigate('/portal/records?type=funeral')}>
                      <Cross size={16} className="text-violet-600" /> {t('portal.funerals')}
                      <span className="ml-auto text-muted-foreground">{counts.funeral.toLocaleString()}</span>
                    </Button>
                    <Button variant="ghost" className="justify-start" onClick={() => navigate('/portal/records')}>
                      <Eye size={16} /> {t('common.view_all')}
                    </Button>
                  </div>
                </PortalSection>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChurchPortalHub;
