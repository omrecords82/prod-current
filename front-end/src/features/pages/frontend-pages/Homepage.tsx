import { WhatWeDoPanel } from '@/components/frontend-pages/homepage/HomepageIntro';
import HomepageHero from '@/components/frontend-pages/homepage/HomepageHero';
import HomepageRecordsTransformSection from '@/components/frontend-pages/homepage/records-transform/HomepageRecordsTransformSection';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import RichEditableText from '@/components/frontend-pages/shared/RichEditableText';
import PublicSeo from '@/components/seo/PublicSeo';
import { useLanguage } from '@/context/LanguageContext';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  FileBarChart,
  MapPin,
  Search,
  Shield,
  Church,
  TrendingUp,
  type LucideIcon,
} from '@/ui/icons';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { ParishRecordsAssessment } from '@/components/frontend-pages/shared/sections';
import { Link } from 'react-router-dom';

const HIGHLIGHT_SLIDE_COUNT = 3;
const HIGHLIGHT_AUTO_MS = 8000;

/** Fixed viewport — tallest slide (features grid) sets height; inner slides scroll if needed. */
const HIGHLIGHT_VIEWPORT_CLASS =
  'relative h-[min(78vh,920px)] sm:h-[min(72vh,840px)] md:h-[620px] lg:h-[580px] overflow-hidden';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

const Homepage = () => {
  const { t } = useLanguage();

  return (
    <>
      <PublicSeo
        title="Sacramental records, modernized for every parish"
        description="Orthodox Metrics is the records platform for Orthodox parishes — secure baptism, marriage, and funeral registers, OCR digitization of historic ledgers, and multi-tenant parish administration."
        path="/"
        bare
      />
      <HomepageHero />
      <HomepageDiocesanAnalyticsSection />
      <HomepageProofStrip />
      <HomepageHighlightCarousel />

      <HomepageRecordsTransformSection />

      {/* Why Choose Us */}
      <section className="py-20 bg-white dark:bg-[#0d1117]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[rgba(45,27,78,0.05)] dark:bg-gray-800 px-4 py-2 rounded-full mb-6">
                <EditableText contentKey="why.badge" as="span" className="font-['Inter'] text-[14px] text-[#2d1b4e] dark:text-white">
                  {t('home.why_badge')}
                </EditableText>
              </div>
              <RichEditableText contentKey="why.title" as="h2" className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] dark:text-white mb-6">
                {t('home.why_title')}
              </RichEditableText>
              <RichEditableText contentKey="why.description" as="p" className="font-['Inter'] text-lg text-[#4a5565] dark:text-gray-400 leading-relaxed mb-8">
                {t('home.why_desc')}
              </RichEditableText>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="text-[#d4af37] flex-shrink-0 mt-1" size={20} />
                    <EditableText contentKey={`why.item${i}`} as="span" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">
                      {t(`home.why_item${i}`)}
                    </EditableText>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] dark:from-gray-800 dark:to-gray-700 rounded-2xl p-12 border border-[rgba(45,27,78,0.1)] dark:border-gray-600">
              <div className="space-y-8">
                <div className="bg-white dark:bg-[#0d1117] rounded-xl p-6 shadow-sm">
                  <EditableText contentKey="why.stat1.number" as="div" className="text-[#d4af37] font-['Georgia'] text-5xl mb-2">
                    {t('home.why_stat1_number')}
                  </EditableText>
                  <EditableText contentKey="why.stat1.label" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">
                    {t('home.why_stat1_label')}
                  </EditableText>
                </div>
                <div className="bg-white dark:bg-[#0d1117] rounded-xl p-6 shadow-sm">
                  <EditableText contentKey="why.stat2.number" as="div" className="text-[#2d1b4e] dark:text-[#d4af37] font-['Georgia'] text-5xl mb-2">
                    {t('home.why_stat2_number')}
                  </EditableText>
                  <EditableText contentKey="why.stat2.label" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">
                    {t('home.why_stat2_label')}
                  </EditableText>
                </div>
                <div className="bg-white dark:bg-[#0d1117] rounded-xl p-6 shadow-sm">
                  <EditableText contentKey="why.stat3.number" as="div" className="text-[#d4af37] font-['Georgia'] text-5xl mb-2">
                    {t('home.why_stat3_number')}
                  </EditableText>
                  <EditableText contentKey="why.stat3.label" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">
                    {t('home.why_stat3_label')}
                  </EditableText>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ParishRecordsAssessment />
    </>
  );
};

export default Homepage;

/** Illustrative NY/NJ diocese sample — mirrors onboarded parish data in production */
const DIOCESAN_SAMPLE_STATS = {
  diocese: 'Diocese of New York and New Jersey',
  parishesReporting: 73,
  totalRecords: 63897,
  growthPercent: 14,
  participationRate: 99,
  topParishes: [
    { name: 'Saint Vladimir Church', city: 'Trenton, NJ', total: 3552 },
    { name: 'Saint John the Baptist Church', city: 'Passaic, NJ', total: 2016 },
    { name: 'Church of the Holy Trinity', city: 'Brooklyn, NY', total: 1924 },
    { name: 'SS. Cosmas and Damian Chapel', city: 'Staten Island, NY', total: 1750 },
    { name: 'Holy Apostles Mission', city: 'Lansing, NY', total: 1793 },
  ],
};

const DIOCESAN_ANALYTICS_LINKS: {
  titleKey: string;
  descKey: string;
  to: string;
  icon: LucideIcon;
  external?: boolean;
}[] = [
  {
    titleKey: 'home.diocesan_link_diocesan_title',
    descKey: 'home.diocesan_link_diocesan_desc',
    to: '/dashboards/analytics',
    icon: BarChart3,
  },
  {
    titleKey: 'home.diocesan_link_parish_title',
    descKey: 'home.diocesan_link_parish_desc',
    to: '/portal/charts',
    icon: FileBarChart,
  },
  {
    titleKey: 'home.diocesan_link_explorer_title',
    descKey: 'home.diocesan_link_explorer_desc',
    to: PUBLIC_ROUTES.SAMPLES_EXPLORER,
    icon: Search,
  },
  {
    titleKey: 'home.diocesan_link_tour_title',
    descKey: 'home.diocesan_link_tour_desc',
    to: PUBLIC_ROUTES.TOUR,
    icon: MapPin,
  },
];

function HomepageDiocesanMapPanel() {
  const [activeParish, setActiveParish] = useState<any>(DIOCESAN_SAMPLE_STATS.topParishes[0]);

  // Coordinates for abstract NJ/NY region relative positions on a 500x300 box
  const mapParishes = [
    { name: 'Saint Vladimir Church', city: 'Trenton, NJ', total: 3552, x: 260, y: 220 },
    { name: 'Saint John the Baptist Church', city: 'Passaic, NJ', total: 2016, x: 320, y: 150 },
    { name: 'Church of the Holy Trinity', city: 'Brooklyn, NY', total: 1924, x: 390, y: 170 },
    { name: 'SS. Cosmas and Damian Chapel', city: 'Staten Island, NY', total: 1750, x: 310, y: 200 },
    { name: 'Holy Apostles Mission', city: 'Lansing, NY', total: 1793, x: 130, y: 80 },
  ];

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Map visualization */}
      <div className="lg:col-span-3 rounded-xl border border-[rgba(26,54,93,0.12)] dark:border-white/10 bg-white dark:bg-[#161b22] p-5 shadow-sm flex flex-col justify-between min-h-[420px]">
        <div>
          <h3 className="font-['Inter'] font-semibold text-[#1a365d] dark:text-white">
            Interactive Diocesan Parish Map
          </h3>
          <p className="font-['Inter'] text-xs text-[#64748b] dark:text-gray-500 mb-4">
            Click parish nodes to inspect localized registry volume and metrics.
          </p>
        </div>

        <div className="relative w-full h-[260px] bg-slate-50 dark:bg-slate-900/50 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 flex items-center justify-center">
          {/* Grid lines and background vector detail to make it look hyper-professional */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="diocesanGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#diocesanGrid)" />
            </svg>
          </div>

          <svg viewBox="0 0 500 300" className="w-full h-full p-4">
            {/* Draw abstract connection pathways/network lines */}
            {mapParishes.map((p, idx) => (
              idx > 0 ? (
                <line
                  key={`l-${idx}`}
                  x1={mapParishes[0].x}
                  y1={mapParishes[0].y}
                  x2={p.x}
                  y2={p.y}
                  stroke="rgba(201, 161, 74, 0.2)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              ) : null
            ))}

            {/* Draw abstract State contours */}
            <path
              d="M 100 20 Q 200 40 380 40 T 450 120 T 400 220 T 260 260 T 100 200 Z"
              fill="rgba(26, 54, 93, 0.02)"
              stroke="rgba(26, 54, 93, 0.05)"
              strokeWidth="2"
              className="dark:fill-white/[0.01] dark:stroke-white/[0.05]"
            />

            {/* Pulsing nodes */}
            {mapParishes.map((p) => {
              const isActive = activeParish.name === p.name;
              return (
                <g
                  key={p.name}
                  className="cursor-pointer group"
                  onClick={() => setActiveParish(p)}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isActive ? 12 : 8}
                    fill={isActive ? '#c9a14a' : '#1a365d'}
                    className="transition-all duration-300 group-hover:scale-125 dark:fill-[#e8d5a3]"
                  />
                  {isActive && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="20"
                      fill="none"
                      stroke="#c9a14a"
                      strokeWidth="1.5"
                      className="animate-ping"
                      style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                    />
                  )}
                  <text
                    x={p.x}
                    y={p.y - (isActive ? 18 : 12)}
                    textAnchor="middle"
                    className="font-['Inter'] text-[9px] font-medium fill-[#334155] dark:fill-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {p.city}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Map Overlay tooltip */}
          {activeParish && (
            <div className="absolute bottom-3 right-3 p-3 bg-white/95 dark:bg-[#161b22]/95 border border-[rgba(26,54,93,0.15)] dark:border-white/10 rounded-lg shadow-lg max-w-[200px] backdrop-blur font-['Inter']">
              <h4 className="text-xs font-semibold text-[#1a365d] dark:text-white truncate">
                {activeParish.name}
              </h4>
              <p className="text-[10px] text-slate-400 mb-1">{activeParish.city}</p>
              <div className="text-[11px] text-[#4a5565] dark:text-gray-300 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="font-semibold">{activeParish.total.toLocaleString()}</span> registers on file
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map sidebar panel - detailed stats */}
      <div className="lg:col-span-2 flex flex-col gap-3 justify-between">
        <div className="rounded-xl border border-[rgba(26,54,93,0.12)] dark:border-white/10 bg-white dark:bg-[#161b22] p-5 shadow-sm h-full flex flex-col justify-between">
          <div>
            <h3 className="font-['Inter'] font-semibold text-[#1a365d] dark:text-white mb-2">
              Geographic Registry Insights
            </h3>
            <p className="font-['Inter'] text-sm text-[#4a5565] dark:text-gray-400 leading-relaxed mb-4">
              Our central ledger monitors registration density across 5 diocesan deaneries. Real-time geocoding enables local parish benchmarking.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-gray-400">Total Geocoded Parishes:</span>
              <span className="font-semibold text-[#1a365d] dark:text-[#e8d5a3]">73 Parishes</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-gray-400">Largest Registry Node:</span>
              <span className="font-semibold text-[#1a365d] dark:text-[#e8d5a3]">Trenton, NJ (3,552)</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-gray-400">Coordinate Sync Health:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                100% Resolved
              </span>
            </div>
          </div>
          
          <Link
            to="/dashboards/analytics"
            className="mt-6 w-full text-center py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#1a365d] dark:text-[#e8d5a3] rounded-lg transition-colors inline-block"
          >
            Open Live Interactive Map
          </Link>
        </div>
      </div>
    </div>
  );
}

function HomepageDiocesanStatsPanel() {
  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Sacramental Mix & Trends */}
      <div className="lg:col-span-3 rounded-xl border border-[rgba(26,54,93,0.12)] dark:border-white/10 bg-white dark:bg-[#161b22] p-5 shadow-sm flex flex-col justify-between min-h-[420px]">
        <div>
          <h3 className="font-['Inter'] font-semibold text-[#1a365d] dark:text-white">
            Sacramental Registrations Mix & Growth
          </h3>
          <p className="font-['Inter'] text-xs text-[#64748b] dark:text-gray-500 mb-4">
            Demographic trends across the diocese. Baptisms indicate replenishment; Funerals reflect mortality.
          </p>
        </div>

        {/* Custom SVG Line Chart for Digitization Progress */}
        <div className="my-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Digitization Milestones</span>
            <span className="text-xs font-bold text-green-500">+42% Growth (YTD)</span>
          </div>
          <div className="h-[140px] w-full relative">
            <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="homepageChartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c9a14a" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#c9a14a" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Gridlines */}
              <line x1="0" y1="20" x2="400" y2="20" stroke="rgba(201, 161, 74, 0.08)" strokeWidth="1" />
              <line x1="0" y1="60" x2="400" y2="60" stroke="rgba(201, 161, 74, 0.08)" strokeWidth="1" />
              <line x1="0" y1="100" x2="400" y2="100" stroke="rgba(201, 161, 74, 0.08)" strokeWidth="1" />
              
              {/* Chart Path Area */}
              <path
                d="M 0 110 L 80 95 L 160 80 L 240 50 L 320 35 L 400 15 L 400 120 L 0 120 Z"
                fill="url(#homepageChartGrad)"
              />
              {/* Chart Line */}
              <path
                d="M 0 110 L 80 95 L 160 80 L 240 50 L 320 35 L 400 15"
                fill="none"
                stroke="#c9a14a"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Dots */}
              <circle cx="80" cy="95" r="4" fill="#1a365d" stroke="#c9a14a" strokeWidth="2" />
              <circle cx="160" cy="80" r="4" fill="#1a365d" stroke="#c9a14a" strokeWidth="2" />
              <circle cx="240" cy="50" r="4" fill="#1a365d" stroke="#c9a14a" strokeWidth="2" />
              <circle cx="320" cy="35" r="4" fill="#1a365d" stroke="#c9a14a" strokeWidth="2" />
              <circle cx="400" cy="15" r="5" fill="#c9a14a" />
            </svg>
            <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono">
              <span>Q1 2025</span>
              <span>Q2 2025</span>
              <span>Q3 2025</span>
              <span>Q4 2025</span>
              <span>Q1 2026</span>
              <span>Q2 2026 (Live)</span>
            </div>
          </div>
        </div>

        {/* Dynamic mix indicator */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-500 dark:text-gray-400">Total Sacramental Mix:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">63,897 records</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            <div className="bg-[#6366F1] h-full" style={{ width: '42%' }} title="Baptism: 42%" />
            <div className="bg-[#22C55E] h-full" style={{ width: '31%' }} title="Marriage: 31%" />
            <div className="bg-[#F59E0B] h-full" style={{ width: '27%' }} title="Funeral: 27%" />
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#6366F1]" />
              Baptism (42%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
              Marriage (31%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              Funeral (27%)
            </span>
          </div>
        </div>
      </div>

      {/* Stats sidebar - demographic indices */}
      <div className="lg:col-span-2 flex flex-col gap-3">
        {/* Metric 1 */}
        <div className="rounded-xl border border-[rgba(26,54,93,0.12)] dark:border-white/10 bg-white dark:bg-[#161b22] p-5 shadow-sm flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Demographic Renewal Ratio
              </span>
              <span className="text-[10px] bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">
                Replenishing
              </span>
            </div>
            <div className="text-3xl font-['Georgia'] text-[#1a365d] dark:text-[#e8d5a3] my-1 font-bold">
              1.42x
            </div>
            <p className="text-xs text-slate-500 leading-snug">
              Ratio of Baptisms to Funerals. A ratio greater than 1.0x indicates diocesan expansion and vitality.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            Diocesan average · 14% record growth (12M)
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-[rgba(26,54,93,0.12)] dark:border-white/10 bg-white dark:bg-[#161b22] p-5 shadow-sm flex-1 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Data Completion Health
            </span>
            <div className="text-3xl font-['Georgia'] text-[#1a365d] dark:text-[#e8d5a3] my-1 font-bold">
              84.3%
            </div>
            <p className="text-xs text-slate-500 leading-snug">
              Average completeness of required canonical fields (sponsors, dates, locations) across all reporting registries.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Target: 90% completeness</span>
            <span className="font-semibold text-green-500">On Track</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomepageDiocesanAnalyticsSection() {
  const { t } = useLanguage();
  const maxBar = Math.max(...DIOCESAN_SAMPLE_STATS.topParishes.map((p) => p.total));
  const [slide, setSlide] = useState(0);

  const SLIDE_COUNT = 3;
  const goTo = (index: number) => {
    setSlide(index);
  };
  const goRelative = (delta: number) => {
    setSlide((s) => (s + delta + SLIDE_COUNT) % SLIDE_COUNT);
  };

  return (
    <section
      className="py-16 md:py-20 border-b border-[rgba(26,54,93,0.1)] dark:border-white/10 bg-gradient-to-b from-[#f5f0e6] to-[#f9fafb] dark:from-[#0d1117] dark:to-[#161b22]"
      aria-label="Diocesan analytics preview"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-[#1a365d]/10 dark:bg-[#c9a14a]/15 px-4 py-2 rounded-full mb-4">
              <TrendingUp className="text-[#c9a14a]" size={16} aria-hidden />
              <EditableText contentKey="diocesan.badge" as="span" className="font-['Inter'] text-[13px] font-medium text-[#1a365d] dark:text-[#e8d5a3] tracking-wide uppercase">
                {t('home.diocesan_badge')}
              </EditableText>
            </div>
            <RichEditableText contentKey="diocesan.title" as="h2" className="font-['Georgia'] text-3xl md:text-4xl text-[#1a365d] dark:text-white mb-3 leading-tight">
              {t('home.diocesan_title')}
            </RichEditableText>
            <RichEditableText contentKey="diocesan.subtitle" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
              {t('home.diocesan_subtitle')}
            </RichEditableText>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboards/analytics"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1a365d] hover:bg-[#2c5282] text-white font-['Inter'] text-sm font-medium transition-colors"
            >
              {t('home.diocesan_cta_dashboard')}
              <ArrowRight size={16} />
            </Link>
            <Link
              to={PUBLIC_ROUTES.SAMPLES_EXPLORER}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#c9a14a] text-[#1a365d] dark:text-[#e8d5a3] hover:bg-[#c9a14a]/10 font-['Inter'] text-sm font-medium transition-colors"
            >
              {t('home.diocesan_cta_explore')}
            </Link>
          </div>
        </div>

        <div className="relative px-0 md:px-12">
          {/* Desktop Left Arrow */}
          <button
            type="button"
            onClick={() => goRelative(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-[#e8d5a3] shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Desktop Right Arrow */}
          <button
            type="button"
            onClick={() => goRelative(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-[#e8d5a3] shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight size={20} />
          </button>

          {/* Carousel Slide Container */}
          <div className="relative min-h-[460px] md:min-h-[420px] transition-all duration-300">
            <div className={`${slide === 0 ? 'block opacity-100' : 'hidden opacity-0'} transition-all duration-500`}>
              <div className="grid lg:grid-cols-5 gap-6">
                {/* Sample metrics + chart */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#64748b] dark:text-gray-500 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-[#c9a14a]" aria-hidden />
                    {t('home.diocesan_sample_label')}: {DIOCESAN_SAMPLE_STATS.diocese}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { labelKey: 'home.diocesan_stat_parishes', value: DIOCESAN_SAMPLE_STATS.parishesReporting },
                      { labelKey: 'home.diocesan_stat_records', value: DIOCESAN_SAMPLE_STATS.totalRecords.toLocaleString() },
                      { labelKey: 'home.diocesan_stat_growth', value: `+${DIOCESAN_SAMPLE_STATS.growthPercent}%` },
                      { labelKey: 'home.diocesan_stat_participation', value: `${DIOCESAN_SAMPLE_STATS.participationRate}%` },
                    ].map((stat) => (
                      <div
                        key={stat.labelKey}
                        className="rounded-xl border border-[rgba(26,54,93,0.12)] dark:border-white/10 bg-white dark:bg-[#161b22] p-4 shadow-sm"
                      >
                        <p className="font-['Inter'] text-[11px] uppercase tracking-wide text-[#64748b] dark:text-gray-500 mb-1">
                          {t(stat.labelKey)}
                        </p>
                        <p className="font-['Georgia'] text-2xl text-[#1a365d] dark:text-[#e8d5a3] tabular-nums">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-[rgba(26,54,93,0.12)] dark:border-white/10 bg-white dark:bg-[#161b22] p-5 shadow-sm">
                    <h3 className="font-['Inter'] font-medium text-[#1a365d] dark:text-white mb-1">
                      {t('home.diocesan_chart_title')}
                    </h3>
                    <p className="font-['Inter'] text-xs text-[#64748b] dark:text-gray-500 mb-4">{t('home.diocesan_chart_note')}</p>
                    <ul className="space-y-3" aria-label="Sample parish record volumes">
                      {DIOCESAN_SAMPLE_STATS.topParishes.map((parish) => (
                        <li key={parish.name}>
                          <div className="flex justify-between gap-2 mb-1">
                            <span className="font-['Inter'] text-sm text-[#334155] dark:text-gray-300 truncate">{parish.name}</span>
                            <span className="font-['Inter'] text-xs text-[#64748b] dark:text-gray-500 tabular-nums flex-shrink-0">
                              {parish.total.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-[#f1f5f9] dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#1a365d] to-[#c9a14a]"
                              style={{ width: `${Math.round((parish.total / maxBar) * 100)}%` }}
                            />
                          </div>
                          <span className="font-['Inter'] text-[11px] text-[#94a3b8] dark:text-gray-600">{parish.city}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Analytics destinations */}
                <div className="lg:col-span-2 grid sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  {DIOCESAN_ANALYTICS_LINKS.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="group rounded-xl border border-[rgba(26,54,93,0.12)] dark:border-white/10 bg-white dark:bg-[#161b22] p-4 hover:border-[#c9a14a]/50 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#1a365d]/10 dark:bg-[#c9a14a]/15 flex items-center justify-center flex-shrink-0 group-hover:bg-[#c9a14a]/20 transition-colors">
                            <Icon className="text-[#1a365d] dark:text-[#c9a14a]" size={20} />
                          </div>
                          <div className="min-w-0">
                            <EditableText contentKey={`diocesan.link.${link.to}.title`} as="h3" className="font-['Inter'] font-medium text-[15px] text-[#1a365d] dark:text-white mb-1 group-hover:text-[#2c5282] dark:group-hover:text-[#e8d5a3]">
                              {t(link.titleKey)}
                            </EditableText>
                            <RichEditableText contentKey={`diocesan.link.${link.to}.desc`} as="p" className="font-['Inter'] text-[13px] text-[#64748b] dark:text-gray-500 leading-snug">
                              {t(link.descKey)}
                            </RichEditableText>
                          </div>
                          <ArrowRight className="text-[#c9a14a] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" size={16} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={`${slide === 1 ? 'block opacity-100' : 'hidden opacity-0'} transition-all duration-500`}>
              <HomepageDiocesanMapPanel />
            </div>

            <div className={`${slide === 2 ? 'block opacity-100' : 'hidden opacity-0'} transition-all duration-500`}>
              <HomepageDiocesanStatsPanel />
            </div>
          </div>
        </div>

        {/* Mobile controls & Dots indicators */}
        <div className="flex justify-between items-center mt-8 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => goRelative(-1)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-[#e8d5a3] shadow"
            aria-label="Previous slide"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex gap-2.5" role="tablist" aria-label="Diocesan analytics slides">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={slide === i}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all ${
                  slide === i
                    ? 'w-7 bg-[#1a365d] dark:bg-[#c9a14a]'
                    : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => goRelative(1)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-[#e8d5a3] shadow"
            aria-label="Next slide"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

const PROOF_STRIP_ITEMS: { tKey: string; icon: LucideIcon }[] = [
  { tKey: 'home.proof_records', icon: BookOpen },
  { tKey: 'home.proof_certificates', icon: FileText },
  { tKey: 'home.proof_secure', icon: Shield },
  { tKey: 'home.proof_orthodox', icon: Church },
];

function HomepageProofStrip() {
  const { t } = useLanguage();

  return (
    <section className="py-8 om-section-base border-b border-[rgba(45,27,78,0.08)] dark:border-white/10" aria-label="Product proof">
      <div className="max-w-7xl mx-auto px-6">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 list-none p-0 m-0">
          {PROOF_STRIP_ITEMS.map(({ tKey, icon: Icon }) => (
            <li key={tKey} className="flex items-start gap-3">
              <Icon className="text-[#d4af37] flex-shrink-0 mt-0.5" size={22} aria-hidden />
              <span className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-snug">
                {t(tKey)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HomepageHighlightCarousel() {
  const { t } = useLanguage();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [slide, setSlide] = useState(0);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slideLabels = [
    t('home.intro_badge'),
    t('home.steps_badge'),
    t('home.features_badge'),
  ];

  const goTo = useCallback((index: number) => {
    setSlide(((index % HIGHLIGHT_SLIDE_COUNT) + HIGHLIGHT_SLIDE_COUNT) % HIGHLIGHT_SLIDE_COUNT);
  }, []);

  const goRelative = useCallback((delta: number) => {
    setSlide((s) => (s + delta + HIGHLIGHT_SLIDE_COUNT) % HIGHLIGHT_SLIDE_COUNT);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!hovered || prefersReducedMotion) return;
    timerRef.current = setInterval(() => {
      setSlide((s) => (s + 1) % HIGHLIGHT_SLIDE_COUNT);
    }, HIGHLIGHT_AUTO_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hovered, prefersReducedMotion]);

  const handleManual = (delta: number) => {
    goRelative(delta);
  };

  const slideLayerClass = (active: boolean) =>
    `absolute inset-0 overflow-y-auto overscroll-contain px-2 md:px-8 transition-opacity duration-500 ease-in-out ${
      active ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
    }`;

  const arrowClass =
    'absolute top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(45,27,78,0.15)] dark:border-white/15 bg-white dark:bg-[#161b22] text-[#2d1b4e] dark:text-[#d4af37] shadow-md hover:bg-[#f9fafb] dark:hover:bg-[#1e2a3a] transition-colors';

  return (
    <section
      className="py-20 bg-[#f9fafb] dark:bg-[#0d1117] relative"
      aria-roledescription="carousel"
      aria-label="What we do, process, and features"
    >
      <div
        className="max-w-7xl mx-auto px-6 md:px-14 relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setHovered(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovered(false);
        }}
      >
        <button
          type="button"
          className={`${arrowClass} left-0 md:-left-2`}
          onClick={() => handleManual(-1)}
          aria-label={`Previous: ${slideLabels[(slide + HIGHLIGHT_SLIDE_COUNT - 1) % HIGHLIGHT_SLIDE_COUNT]}`}
        >
          <ChevronLeft size={24} />
        </button>
        <button
          type="button"
          className={`${arrowClass} right-0 md:-right-2`}
          onClick={() => handleManual(1)}
          aria-label={`Next: ${slideLabels[(slide + 1) % HIGHLIGHT_SLIDE_COUNT]}`}
        >
          <ChevronRight size={24} />
        </button>

        <div className={HIGHLIGHT_VIEWPORT_CLASS}>
          <div className={slideLayerClass(slide === 0)} aria-hidden={slide !== 0}>
            <WhatWeDoPanel />
          </div>
          <div className={slideLayerClass(slide === 1)} aria-hidden={slide !== 1}>
            <SimpleProcessPanel />
          </div>
          <div className={slideLayerClass(slide === 2)} aria-hidden={slide !== 2}>
            <FeaturesPanel />
          </div>
        </div>

        <div className="flex justify-center gap-2 mt-8" role="tablist" aria-label="Section slides">
          {slideLabels.map((label, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={slide === i}
              aria-label={label}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${
                slide === i
                  ? 'w-8 bg-[#2d1b4e] dark:bg-[#d4af37]'
                  : 'w-2 bg-[rgba(45,27,78,0.2)] dark:bg-white/25 hover:bg-[rgba(45,27,78,0.35)]'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function SimpleProcessPanel() {
  const { t } = useLanguage();

  return (
    <>
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-full mb-4 shadow-sm">
          <EditableText contentKey="steps.badge" as="span" className="font-['Inter'] text-[14px] text-[#2d1b4e] dark:text-white">
            {t('home.steps_badge')}
          </EditableText>
        </div>
        <RichEditableText contentKey="steps.title" as="h2" className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] dark:text-white mb-4">
          {t('home.steps_title')}
        </RichEditableText>
      </div>

      <div className="grid md:grid-cols-3 gap-12">
        <StepItem number={1} titleKey="steps.step1.title" descKey="steps.step1.desc" title={t('home.steps_step1_title')} description={t('home.steps_step1_desc')} variant="purple" />
        <StepItem number={2} titleKey="steps.step2.title" descKey="steps.step2.desc" title={t('home.steps_step2_title')} description={t('home.steps_step2_desc')} variant="purple" />
        <StepItem number={3} titleKey="steps.step3.title" descKey="steps.step3.desc" title={t('home.steps_step3_title')} description={t('home.steps_step3_desc')} variant="gold" />
      </div>
    </>
  );
}

function FeaturesPanel() {
  const { t } = useLanguage();

  return (
    <>
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 bg-[rgba(45,27,78,0.05)] dark:bg-gray-800 px-4 py-2 rounded-full mb-4">
          <EditableText contentKey="features.badge" as="span" className="font-['Inter'] text-[14px] text-[#2d1b4e] dark:text-white">
            {t('home.features_badge')}
          </EditableText>
        </div>
        <RichEditableText contentKey="features.title" as="h2" className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] dark:text-white mb-4">
          {t('home.features_title')}
        </RichEditableText>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {KEY_FEATURES.map((f, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 border border-[#f3f4f6] dark:border-gray-700 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-[#2d1b4e] dark:bg-[#d4af37] rounded-lg flex items-center justify-center mb-4">
              <f.icon className="text-[#d4af37] dark:text-[#2d1b4e]" size={28} />
            </div>
            <EditableText contentKey={`features.card${i + 1}.title`} as="h3" className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-2">
              {t(`home.features_feat${i + 1}_title`)}
            </EditableText>
            <RichEditableText contentKey={`features.card${i + 1}.desc`} as="p" className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
              {t(`home.features_feat${i + 1}_desc`)}
            </RichEditableText>
          </div>
        ))}
      </div>
    </>
  );
}

function StepItem({ number, titleKey, descKey, title, description, variant }: { number: number; titleKey: string; descKey: string; title: string; description: string; variant: 'purple' | 'gold' }) {
  return (
    <div className="relative">
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-12 h-12 ${
          variant === 'gold'
            ? 'bg-[#d4af37] text-[#2d1b4e]'
            : 'bg-[#2d1b4e] dark:bg-[#d4af37] text-[#d4af37] dark:text-[#2d1b4e]'
        } rounded-full flex items-center justify-center font-['Georgia'] text-xl`}>
          {number}
        </div>
        <div>
          <EditableText contentKey={titleKey} as="h3" className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-2">
            {title}
          </EditableText>
          <RichEditableText contentKey={descKey} as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
            {description}
          </RichEditableText>
        </div>
      </div>
    </div>
  );
}

const KEY_FEATURES: { icon: LucideIcon }[] = [
  { icon: Globe },
  { icon: Calendar },
  { icon: BarChart3 },
  { icon: Shield },
  { icon: BookOpen },
  { icon: Search },
];
