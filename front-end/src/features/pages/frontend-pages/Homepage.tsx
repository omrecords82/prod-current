import { WhatWeDoPanel } from '@/components/frontend-pages/homepage/HomepageIntro';
import HomepageHero from '@/components/frontend-pages/homepage/HomepageHero';
import HomepageRecordsTransformSection from '@/components/frontend-pages/homepage/records-transform/HomepageRecordsTransformSection';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import RichEditableText from '@/components/frontend-pages/shared/RichEditableText';
import PublicSeo from '@/components/seo/PublicSeo';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { useLanguage } from '@/context/LanguageContext';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Search,
  Shield,
  type LucideIcon,
} from '@/ui/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const HIGHLIGHT_SLIDE_COUNT = 3;
const HIGHLIGHT_AUTO_MS = 8000;

const Homepage = () => {
  const { t } = useLanguage();

  return (
    <>
      <PublicSeo
        title="Sacramental records, modernized for every parish"
        description="Orthodox Metrics is the records platform for Orthodox parishes — secure baptism, marriage, and funeral registers, OCR digitization of historic ledgers, and multi-tenant parish administration."
        path="/frontend-pages/homepage"
        bare
      />
      <HomepageHero />
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

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-[#2d1b4e] via-[#3a2461] to-[#4a2f74] dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <RichEditableText contentKey="cta.title" as="h2" className="font-['Georgia'] text-4xl md:text-5xl mb-6">
            {t('home.cta_title')}
          </RichEditableText>
          <RichEditableText contentKey="cta.subtitle" as="p" className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] mb-8">
            {t('home.cta_subtitle')}
          </RichEditableText>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={PUBLIC_ROUTES.CONTACT}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#d4af37] text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-[#c29d2f] transition-colors no-underline"
            >
              {t('home.cta_get_started')}
              <ArrowRight size={20} />
            </Link>
            <Link
              to={PUBLIC_ROUTES.PRICING}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-white/20 transition-colors no-underline"
            >
              {t('home.cta_view_pricing')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default Homepage;

function HomepageHighlightCarousel() {
  const { t } = useLanguage();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
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

  const startAuto = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSlide((s) => (s + 1) % HIGHLIGHT_SLIDE_COUNT);
    }, HIGHLIGHT_AUTO_MS);
  }, []);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    startAuto();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, startAuto]);

  const handleManual = (delta: number) => {
    goRelative(delta);
    startAuto();
  };

  const arrowClass =
    'absolute top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(45,27,78,0.15)] dark:border-white/15 bg-white dark:bg-[#161b22] text-[#2d1b4e] dark:text-[#d4af37] shadow-md hover:bg-[#f9fafb] dark:hover:bg-[#1e2a3a] transition-colors';

  return (
    <section
      className="py-20 bg-[#f9fafb] dark:bg-[#0d1117] relative"
      aria-roledescription="carousel"
      aria-label="What we do, process, and features"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-14 relative">
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

        <div className="relative min-h-[420px] md:min-h-[480px] px-2 md:px-8">
          <div
            className={`transition-opacity duration-500 ease-in-out ${
              slide === 0 ? 'opacity-100 relative z-10' : 'opacity-0 absolute inset-0 pointer-events-none z-0'
            }`}
            aria-hidden={slide !== 0}
          >
            <WhatWeDoPanel />
          </div>
          <div
            className={`transition-opacity duration-500 ease-in-out ${
              slide === 1 ? 'opacity-100 relative z-10' : 'opacity-0 absolute inset-0 pointer-events-none z-0'
            }`}
            aria-hidden={slide !== 1}
          >
            <SimpleProcessPanel />
          </div>
          <div
            className={`transition-opacity duration-500 ease-in-out ${
              slide === 2 ? 'opacity-100 relative z-10' : 'opacity-0 absolute inset-0 pointer-events-none z-0'
            }`}
            aria-hidden={slide !== 2}
          >
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
              onClick={() => {
                goTo(i);
                startAuto();
              }}
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
