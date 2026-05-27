import {
    getAllSampleRecords,
    getClergyCounts,
    getDecadeCounts,
    getLanguageCounts,
    getRecordTypeCounts,
    type UnifiedSampleRecord,
} from '@/components/frontend-pages/shared/sampleExplorerAdapter';
import { HeroSection } from '@/components/frontend-pages/shared/sections';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { CustomizerContext } from '@/context/CustomizerContext';
import { useLanguage } from '@/context/LanguageContext';
import { agGridIconMap } from '@/ui/agGridIcons';
import {
    ArrowLeft,
    BarChart3,
    BookOpen,
    Calendar,
    Check,
    ChevronDown,
    Church,
    Clock,
    Cross,
    Filter,
    Globe,
    Heart,
    LayoutGrid,
    MapPin,
    Search,
    Table2,
    User,
} from '@/ui/icons';
import { useTheme } from '@mui/material/styles';
import { ColDef, themeQuartz } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// ── Types & Constants ──
type ViewMode = 'table' | 'cards' | 'timeline' | 'analytics';
type TFn = (key: string) => string;

const VIEW_KEYS: { key: ViewMode; tKey: string; icon: React.ReactNode }[] = [
  { key: 'table', tKey: 'explorer.view_table', icon: <Table2 size={15} /> },
  { key: 'cards', tKey: 'explorer.view_cards', icon: <LayoutGrid size={15} /> },
  { key: 'timeline', tKey: 'explorer.view_timeline', icon: <Clock size={15} /> },
  { key: 'analytics', tKey: 'explorer.view_analytics', icon: <BarChart3 size={15} /> },
];

// Internal value → translation key for data language filter options
const DATA_LANG_OPTIONS: { value: string; tKey: string }[] = [
  { value: '', tKey: 'explorer.all_languages' },
  { value: 'en', tKey: 'common.lang_english' },
  { value: 'gr', tKey: 'common.lang_greek' },
  { value: 'ru', tKey: 'common.lang_russian' },
  { value: 'ro', tKey: 'common.lang_romanian' },
  { value: 'ge', tKey: 'common.lang_georgian' },
];

// Internal value → translation key for record type filter
const TYPE_OPTIONS: { value: string; tKey: string }[] = [
  { value: '', tKey: 'explorer.all_types' },
  { value: 'Baptism', tKey: 'common.record_baptism' },
  { value: 'Marriage', tKey: 'common.record_marriage' },
  { value: 'Funeral', tKey: 'common.record_funeral' },
];

// UI language picker — native labels always shown
const UI_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'el', label: 'Ελληνικά' },
  { value: 'ru', label: 'Русский' },
  { value: 'ro', label: 'Română' },
  { value: 'ka', label: 'ქართული' },
];

const TYPE_COLORS: Record<string, string> = {
  Baptism: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Marriage: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  Funeral: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};
const TYPE_COLORS_LIGHT: Record<string, string> = {
  Baptism: 'bg-blue-50 text-blue-700 border-blue-200',
  Marriage: 'bg-rose-50 text-rose-700 border-rose-200',
  Funeral: 'bg-amber-50 text-amber-700 border-amber-200',
};
const TYPE_ICONS: Record<string, React.ReactNode> = {
  Baptism: <Cross size={14} />,
  Marriage: <Heart size={14} />,
  Funeral: <Church size={14} />,
};
const TYPE_KEYS: Record<string, string> = {
  Baptism: 'common.record_baptism',
  Marriage: 'common.record_marriage',
  Funeral: 'common.record_funeral',
};

// ── Custom Dropdown ──
// Replaces native <select> with a styled button + floating menu

function ToolbarDropdown({
  value,
  options,
  onChange,
  icon,
  t,
  isDark,
  accent,
  minWidth = 150,
}: {
  value: string;
  options: { value: string; tKey: string }[];
  onChange: (val: string) => void;
  icon: React.ReactNode;
  t: TFn;
  isDark: boolean;
  accent?: boolean;
  minWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const label = selected ? t(selected.tKey) : '';

  const borderClass = accent
    ? 'border-[#d4af37]/40 hover:border-[#d4af37]/70'
    : isDark
      ? 'border-gray-600 hover:border-gray-500'
      : 'border-gray-300 hover:border-gray-400';

  const bgClass = accent
    ? 'bg-[#d4af37]/5'
    : isDark ? 'bg-gray-800' : 'bg-white';

  const iconColor = accent ? 'text-[#d4af37]' : isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div ref={ref} className="relative" style={{ minWidth }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`
          h-[38px] w-full flex items-center gap-2 px-3 rounded-lg border text-[13px] font-medium
          font-['Inter'] transition-all cursor-pointer select-none
          ${borderClass} ${bgClass}
          ${isDark ? 'text-gray-200' : 'text-gray-700'}
          focus:outline-none focus:ring-2 ${accent ? 'focus:ring-[#d4af37]/40' : isDark ? 'focus:ring-gray-500' : 'focus:ring-[#2d1b4e]/30'}
        `}
      >
        <span className={`shrink-0 ${iconColor}`}>{icon}</span>
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform ${iconColor} ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className={`
            absolute z-50 mt-1 left-0 w-full min-w-[160px] rounded-lg border shadow-lg
            py-1 overflow-hidden
            ${isDark
              ? 'bg-gray-800 border-gray-600 shadow-black/40'
              : 'bg-white border-gray-200 shadow-gray-200/60'}
          `}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-[13px] font-['Inter'] text-left transition-colors cursor-pointer
                  ${isSelected
                    ? isDark
                      ? 'bg-[#2d1b4e]/60 text-[#d4af37] font-medium'
                      : 'bg-[#2d1b4e]/5 text-[#2d1b4e] font-medium'
                    : isDark
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {isSelected && <Check size={14} className="shrink-0 text-[#d4af37]" />}
                {!isSelected && <span className="w-[14px] shrink-0" />}
                <span className="truncate">{t(opt.tKey)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// UI language dropdown — always shows native script labels
function UILanguageDropdown({
  value,
  onChange,
  isDark,
}: {
  value: string;
  onChange: (val: string) => void;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = UI_LANGUAGES.find((l) => l.value === value);

  return (
    <div ref={ref} className="relative" style={{ minWidth: 140 }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`
          h-[38px] w-full flex items-center gap-2 px-3 rounded-lg border text-[13px] font-medium
          font-['Inter'] transition-all cursor-pointer select-none
          border-[#d4af37]/40 hover:border-[#d4af37]/70 bg-[#d4af37]/5
          ${isDark ? 'text-gray-200' : 'text-gray-700'}
          focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40
        `}
      >
        <Globe size={14} className="shrink-0 text-[#d4af37]" />
        <span className="flex-1 text-left truncate">{selected?.label ?? 'English'}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform text-[#d4af37] ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className={`
            absolute z-50 mt-1 right-0 min-w-[160px] rounded-lg border shadow-lg py-1
            ${isDark
              ? 'bg-gray-800 border-gray-600 shadow-black/40'
              : 'bg-white border-gray-200 shadow-gray-200/60'}
          `}
        >
          {UI_LANGUAGES.map((lang) => {
            const isSelected = lang.value === value;
            return (
              <button
                key={lang.value}
                type="button"
                onClick={() => { onChange(lang.value); setOpen(false); }}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-[13px] font-['Inter'] text-left transition-colors cursor-pointer
                  ${isSelected
                    ? isDark
                      ? 'bg-[#2d1b4e]/60 text-[#d4af37] font-medium'
                      : 'bg-[#2d1b4e]/5 text-[#2d1b4e] font-medium'
                    : isDark
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {isSelected && <Check size={14} className="shrink-0 text-[#d4af37]" />}
                {!isSelected && <span className="w-[14px] shrink-0" />}
                <span>{lang.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

// Map UI language codes → data language codes (they differ for Greek and Georgian)
const UI_TO_DATA_LANG: Record<string, string> = {
  en: 'en',
  el: 'gr',
  ru: 'ru',
  ro: 'ro',
  ka: 'ge',
};

const SampleRecordsExplorer = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { isLayout } = useContext(CustomizerContext);
  const containerClass = isLayout === 'boxed' ? 'max-w-7xl mx-auto px-6' : 'mx-auto px-6';
  const { t, lang: uiLang, setLang: setUILang } = useLanguage();

  const allRecords = useMemo(() => getAllSampleRecords(), []);

  const [view, setView] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // When UI language changes, sync the data language filter to match
  useEffect(() => {
    const dataLang = UI_TO_DATA_LANG[uiLang] || '';
    setLangFilter(dataLang);
  }, [uiLang]);

  const filtered = useMemo(() => {
    let recs = allRecords;
    if (langFilter) recs = recs.filter((r) => r.language === langFilter);
    if (typeFilter) recs = recs.filter((r) => r.recordType === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      recs = recs.filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          r.clergy.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.details.toLowerCase().includes(q) ||
          r.parents.toLowerCase().includes(q),
      );
    }
    return recs;
  }, [allRecords, langFilter, typeFilter, search]);

  const tType = useCallback((type: string) => t(TYPE_KEYS[type] || type), [t]);

  // AG Grid theme
  const agGridTheme = useMemo(
    () =>
      themeQuartz.withParams(
        isDark
          ? {
              backgroundColor: '#0a0a0a',
              headerBackgroundColor: '#2d1b4e',
              headerTextColor: '#e0e0e0',
              foregroundColor: '#e0e0e0',
              oddRowBackgroundColor: '#111111',
              rowHoverColor: '#1a1a2e',
              selectedRowBackgroundColor: '#2d1b4e33',
              borderColor: '#333333',
            }
          : {
              headerBackgroundColor: '#2d1b4e',
              headerTextColor: '#ffffff',
              foregroundColor: '#1a1a1a',
              oddRowBackgroundColor: '#fafafa',
              rowHoverColor: '#f0edf5',
              selectedRowBackgroundColor: '#e8e0f0',
              borderColor: '#e0e0e0',
            },
      ),
    [isDark],
  );

  const typeBadge = useCallback(
    (type: string) => {
      const colors = isDark ? TYPE_COLORS[type] : TYPE_COLORS_LIGHT[type];
      return `inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-medium border ${colors || ''}`;
    },
    [isDark],
  );

  return (
    <>
      <HeroSection
        badge={t('explorer.hero_badge')}
        title={t('explorer.hero_title')}
        subtitle={t('explorer.hero_subtitle')}
        editKeyPrefix="explorer.hero"
      />

      {/* ─── Toolbar ─── */}
      <section className="py-5 om-section-base sticky top-0 z-30 border-b border-gray-200 dark:border-gray-800">
        <div className={`${containerClass} space-y-3`}>
          {/* Row 1: Back link + view tabs + UI language */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to={PUBLIC_ROUTES.SAMPLES}
              className="inline-flex items-center gap-2 text-[13px] font-['Inter'] font-medium om-text-secondary hover:text-[#2d1b4e] dark:hover:text-[#d4af37] transition-colors"
            >
              <ArrowLeft size={15} /> {t('explorer.back_to_samples')}
            </Link>

            <div className="flex items-center gap-3">
              {/* View mode tabs */}
              <div className={`flex gap-0.5 rounded-lg p-0.5 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                {VIEW_KEYS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setView(tab.key)}
                    className={`
                      flex items-center gap-1.5 px-3 py-[7px] rounded-md text-[13px] font-['Inter'] font-medium transition-all
                      ${view === tab.key
                        ? 'bg-[#2d1b4e] text-white shadow-sm'
                        : isDark
                          ? 'text-gray-400 hover:text-gray-200'
                          : 'text-gray-500 hover:text-gray-800'
                      }
                    `}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{t(tab.tKey)}</span>
                  </button>
                ))}
              </div>

              {/* UI language selector */}
              <UILanguageDropdown value={uiLang} onChange={setUILang} isDark={isDark} />
            </div>
          </div>

          {/* Row 2: Search + filters + record count */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[360px]">
              <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'} pointer-events-none`} />
              <input
                type="text"
                placeholder={t('explorer.search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`
                  h-[38px] w-full pl-9 pr-3 rounded-lg border text-[13px] font-['Inter']
                  transition-all
                  ${isDark
                    ? 'bg-gray-800 border-gray-600 text-gray-200 placeholder:text-gray-500 hover:border-gray-500 focus:ring-gray-500'
                    : 'bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 hover:border-gray-400 focus:ring-[#2d1b4e]/30'
                  }
                  focus:outline-none focus:ring-2 focus:border-transparent
                `}
              />
            </div>

            {/* Language filter */}
            <ToolbarDropdown
              value={langFilter}
              options={DATA_LANG_OPTIONS}
              onChange={setLangFilter}
              icon={<Filter size={14} />}
              t={t}
              isDark={isDark}
              minWidth={160}
            />

            {/* Record type filter */}
            <ToolbarDropdown
              value={typeFilter}
              options={TYPE_OPTIONS}
              onChange={setTypeFilter}
              icon={<BookOpen size={14} />}
              t={t}
              isDark={isDark}
              minWidth={150}
            />

            {/* Record count */}
            <span className={`text-[13px] font-['Inter'] ml-auto whitespace-nowrap ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {filtered.length} {t('explorer.records_label')}
            </span>
          </div>
        </div>
      </section>

      {/* ─── Content Area ─── */}
      <section className="py-8 om-section-base min-h-[600px]">
        <div className={containerClass}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Search size={40} className={isDark ? 'text-gray-600' : 'text-gray-300'} />
              <p className={`text-[15px] font-['Inter'] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('explorer.no_records')}</p>
            </div>
          ) : (
            <>
              {view === 'table' && (
                <TableView records={filtered} agGridTheme={agGridTheme} isDark={isDark} typeBadge={typeBadge} t={t} tType={tType} />
              )}
              {view === 'cards' && <CardsView records={filtered} isDark={isDark} typeBadge={typeBadge} t={t} tType={tType} />}
              {view === 'timeline' && <TimelineView records={filtered} isDark={isDark} typeBadge={typeBadge} t={t} tType={tType} />}
              {view === 'analytics' && <AnalyticsView records={filtered} isDark={isDark} t={t} tType={tType} />}
            </>
          )}
        </div>
      </section>
    </>
  );
};

export default SampleRecordsExplorer;

// ════════════════════════════════════════════════════════════
// TABLE VIEW
// ════════════════════════════════════════════════════════════

function TableView({
  records,
  agGridTheme,
  isDark,
  typeBadge,
  t,
  tType,
}: {
  records: UnifiedSampleRecord[];
  agGridTheme: any;
  isDark: boolean;
  typeBadge: (t: string) => string;
  t: TFn;
  tType: TFn;
}) {
  const columnDefs = useMemo<ColDef<UnifiedSampleRecord>[]>(
    () => [
      {
        headerName: t('explorer.col_type'),
        field: 'recordType',
        width: 130,
        cellRenderer: (params: any) => {
          if (!params.value) return null;
          const colors = isDark ? TYPE_COLORS[params.value] : TYPE_COLORS_LIGHT[params.value];
          return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-medium border ${colors || ''}`}>
              {tType(params.value)}
            </span>
          );
        },
      },
      { headerName: t('explorer.col_name'), field: 'fullName', flex: 2, minWidth: 180 },
      { headerName: t('explorer.col_date'), field: 'date', width: 140 },
      { headerName: t('explorer.col_location'), field: 'location', flex: 1, minWidth: 120 },
      { headerName: t('explorer.col_clergy'), field: 'clergy', flex: 1, minWidth: 150 },
      { headerName: t('explorer.col_details'), field: 'details', flex: 1, minWidth: 150 },
    ],
    [isDark, t, tType],
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({ resizable: true, sortable: true, filter: true }),
    [],
  );

  const localeText = useMemo(
    () => ({
      page: t('explorer.grid_page'),
      of: t('explorer.grid_of'),
      to: t('explorer.grid_to'),
      firstPage: t('explorer.grid_first_page'),
      previousPage: t('explorer.grid_previous_page'),
      nextPage: t('explorer.grid_next_page'),
      lastPage: t('explorer.grid_last_page'),
      pageSizeSelectorLabel: t('explorer.grid_page_size'),
      noRowsToShow: t('explorer.grid_no_rows'),
      filterOoo: t('explorer.grid_filter_placeholder'),
    }),
    [t],
  );

  return (
    <div style={{ height: 600, width: '100%' }}>
      <AgGridReact
        key={t('explorer.grid_page')}
        theme={agGridTheme}
        rowData={records}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        icons={agGridIconMap}
        localeText={localeText}
        pagination={true}
        paginationAutoPageSize={false}
        paginationPageSize={25}
        animateRows={true}
        getRowId={(params) => params.data.id}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CARDS VIEW
// ════════════════════════════════════════════════════════════

function CardsView({
  records,
  isDark,
  typeBadge,
  t,
  tType,
}: {
  records: UnifiedSampleRecord[];
  isDark: boolean;
  typeBadge: (t: string) => string;
  t: TFn;
  tType: TFn;
}) {
  const [page, setPage] = useState(0);
  const perPage = 24;
  const totalPages = Math.ceil(records.length / perPage);
  const paged = records.slice(page * perPage, (page + 1) * perPage);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paged.map((r) => (
          <div key={r.id} className="om-card p-5 hover:shadow-lg transition-shadow group">
            <div className="flex items-center justify-between mb-3">
              <span className={typeBadge(r.recordType)}>
                {TYPE_ICONS[r.recordType]} {tType(r.recordType)}
              </span>
              <span className="text-[11px] om-text-tertiary">{r.languageLabel}</span>
            </div>
            <h3 className="font-['Inter'] font-semibold text-[15px] om-text-primary mb-2 truncate group-hover:text-[#d4af37] transition-colors">
              {r.fullName}
            </h3>
            <div className="space-y-1.5 text-[13px]">
              {r.date && (
                <div className="flex items-center gap-2 om-text-secondary">
                  <Calendar size={13} className="shrink-0 opacity-60" />
                  <span>{r.date}</span>
                </div>
              )}
              {r.location && (
                <div className="flex items-center gap-2 om-text-secondary">
                  <MapPin size={13} className="shrink-0 opacity-60" />
                  <span className="truncate">{r.location}</span>
                </div>
              )}
              {r.clergy && (
                <div className="flex items-center gap-2 om-text-secondary">
                  <User size={13} className="shrink-0 opacity-60" />
                  <span className="truncate">{r.clergy}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="om-btn-outline text-[13px] px-3 py-1.5 disabled:opacity-40"
          >
            &larr;
          </button>
          <span className="text-[13px] om-text-secondary mx-4">
            {t('explorer.page_label')} {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="om-btn-outline text-[13px] px-3 py-1.5 disabled:opacity-40"
          >
            &rarr;
          </button>
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// TIMELINE VIEW
// ════════════════════════════════════════════════════════════

function TimelineView({
  records,
  isDark,
  typeBadge,
  t,
  tType,
}: {
  records: UnifiedSampleRecord[];
  isDark: boolean;
  typeBadge: (t: string) => string;
  t: TFn;
  tType: TFn;
}) {
  const grouped = useMemo(() => {
    const map: Record<string, UnifiedSampleRecord[]> = {};
    records.forEach((r) => {
      const key = r.decade;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    const sorted = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    sorted.forEach(([, recs]) => recs.sort((a, b) => a.year - b.year));
    return sorted;
  }, [records]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (decade: string) =>
    setExpanded((prev) => ({ ...prev, [decade]: !prev[decade] }));

  return (
    <div className="max-w-4xl mx-auto">
      {grouped.map(([decade, recs]) => {
        const isOpen = expanded[decade] ?? true;
        const typeCounts = {
          Baptism: recs.filter((r) => r.recordType === 'Baptism').length,
          Marriage: recs.filter((r) => r.recordType === 'Marriage').length,
          Funeral: recs.filter((r) => r.recordType === 'Funeral').length,
        };

        return (
          <div key={decade} className="mb-6">
            <button
              onClick={() => toggle(decade)}
              className="w-full flex items-center gap-4 py-3 px-4 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-['Georgia'] text-xl om-text-primary font-bold min-w-[60px]">
                {decade}
              </span>
              <div className="flex gap-2">
                {typeCounts.Baptism > 0 && (
                  <span className={typeBadge('Baptism')}>{TYPE_ICONS.Baptism} {typeCounts.Baptism}</span>
                )}
                {typeCounts.Marriage > 0 && (
                  <span className={typeBadge('Marriage')}>{TYPE_ICONS.Marriage} {typeCounts.Marriage}</span>
                )}
                {typeCounts.Funeral > 0 && (
                  <span className={typeBadge('Funeral')}>{TYPE_ICONS.Funeral} {typeCounts.Funeral}</span>
                )}
              </div>
              <span className="text-[13px] om-text-tertiary ml-auto">{recs.length} {t('explorer.records_label')}</span>
              <ChevronDown
                size={16}
                className={`om-text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isOpen && (
              <div className="relative ml-8 mt-2 border-l-2 border-gray-200 dark:border-gray-700 pl-6 space-y-3">
                {recs.slice(0, 50).map((r) => (
                  <div key={r.id} className="relative">
                    <div
                      className={`absolute -left-[31px] top-3 w-3 h-3 rounded-full border-2 ${
                        r.recordType === 'Baptism'
                          ? 'bg-blue-500 border-blue-300'
                          : r.recordType === 'Marriage'
                            ? 'bg-rose-500 border-rose-300'
                            : 'bg-amber-500 border-amber-300'
                      }`}
                    />
                    <div className="om-card-compact p-4">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <span className="font-['Inter'] font-medium text-[14px] om-text-primary">
                          {r.fullName}
                        </span>
                        <span className={typeBadge(r.recordType)}>
                          {TYPE_ICONS[r.recordType]} {tType(r.recordType)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] om-text-secondary">
                        {r.date && <span>{r.date}</span>}
                        {r.languageLabel !== 'English' && <span>{r.languageLabel}</span>}
                        {r.clergy && <span>{r.clergy}</span>}
                        {r.location && <span>{r.location}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {recs.length > 50 && (
                  <p className="text-[13px] om-text-tertiary py-2">
                    +{recs.length - 50} {t('explorer.more_label')} {t('explorer.records_label')}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ANALYTICS VIEW
// ════════════════════════════════════════════════════════════

function AnalyticsView({
  records,
  isDark,
  t,
  tType,
}: {
  records: UnifiedSampleRecord[];
  isDark: boolean;
  t: TFn;
  tType: TFn;
}) {
  const typeCounts = useMemo(() => getRecordTypeCounts(records), [records]);
  const langCounts = useMemo(() => getLanguageCounts(records), [records]);
  const decadeCounts = useMemo(() => getDecadeCounts(records), [records]);
  const clergyCounts = useMemo(() => getClergyCounts(records), [records]);
  const total = records.length;

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t('explorer.analytics_total_records')} value={total} />
        <StatCard label={tType('Baptism')} value={typeCounts.find((tc) => tc.label === 'Baptism')?.value || 0} accent="blue" />
        <StatCard label={tType('Marriage')} value={typeCounts.find((tc) => tc.label === 'Marriage')?.value || 0} accent="rose" />
        <StatCard label={tType('Funeral')} value={typeCounts.find((tc) => tc.label === 'Funeral')?.value || 0} accent="amber" />
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="om-card p-6">
          <h3 className="om-heading-tertiary mb-4">{t('explorer.analytics_by_record_type')}</h3>
          <div className="space-y-3">
            {typeCounts.map((s) => (
              <BarRow key={s.label} label={tType(s.label)} value={s.value} max={total} color={barColor(s.label)} />
            ))}
          </div>
        </div>

        <div className="om-card p-6">
          <h3 className="om-heading-tertiary mb-4">{t('explorer.analytics_by_language')}</h3>
          <div className="space-y-3">
            {langCounts.map((s) => (
              <BarRow key={s.label} label={s.label} value={s.value} max={total} color="bg-[#2d1b4e]" />
            ))}
          </div>
        </div>
      </div>

      {/* Decade distribution */}
      <div className="om-card p-6">
        <h3 className="om-heading-tertiary mb-4">{t('explorer.analytics_records_by_decade')}</h3>
        <div className="flex items-end gap-1 h-48">
          {decadeCounts.map((s) => {
            const maxVal = Math.max(...decadeCounts.map((d) => d.value));
            const pct = maxVal > 0 ? (s.value / maxVal) * 100 : 0;
            return (
              <div key={s.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[11px] om-text-tertiary">{s.value}</span>
                <div
                  className="w-full bg-[#d4af37] rounded-t-sm transition-all"
                  style={{ height: `${Math.max(pct, 4)}%` }}
                />
                <span className="text-[10px] om-text-tertiary -rotate-45 origin-top-left mt-1 whitespace-nowrap">
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Clergy */}
      <div className="om-card p-6">
        <h3 className="om-heading-tertiary mb-4">{t('explorer.analytics_top_clergy')}</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {clergyCounts.map((s, i) => (
            <div
              key={s.label}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <span className="text-[13px] om-text-primary truncate mr-2">
                <span className="om-text-tertiary mr-2">#{i + 1}</span>
                {s.label}
              </span>
              <span className="text-[12px] font-medium text-[#d4af37]">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ──

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const borderClass = accent
    ? `border-l-4 ${accent === 'blue' ? 'border-blue-500' : accent === 'rose' ? 'border-rose-500' : 'border-amber-500'}`
    : 'border-l-4 border-[#d4af37]';
  return (
    <div className={`om-card p-5 ${borderClass}`}>
      <p className="text-[13px] om-text-tertiary mb-1">{label}</p>
      <p className="font-['Georgia'] text-3xl om-text-primary">{value.toLocaleString()}</p>
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-[13px] mb-1">
        <span className="om-text-primary">{label}</span>
        <span className="om-text-secondary">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function barColor(type: string): string {
  if (type === 'Baptism') return 'bg-blue-500';
  if (type === 'Marriage') return 'bg-rose-500';
  if (type === 'Funeral') return 'bg-amber-500';
  return 'bg-[#d4af37]';
}
