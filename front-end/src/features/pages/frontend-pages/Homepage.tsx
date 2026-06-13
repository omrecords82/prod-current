import { HeroCarousel } from '@/components/frontend-pages/homepage/figma';
import { WhatWeDoPanel } from '@/components/frontend-pages/homepage/HomepageIntro';
import HomepageRecordsTransformSection from '@/components/frontend-pages/homepage/records-transform/HomepageRecordsTransformSection';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import RichEditableText from '@/components/frontend-pages/shared/RichEditableText';
import PublicSeo from '@/components/seo/PublicSeo';
import { useLanguage } from '@/context/LanguageContext';
import {
  BarChart3,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  Search,
  Shield,
  Church,
  type LucideIcon,
} from '@/ui/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ParishRecordsAssessment } from '@/components/frontend-pages/shared/sections';

const HIGHLIGHT_SLIDE_COUNT = 3;
const HIGHLIGHT_AUTO_MS = 8000;

/** Fixed viewport — tallest slide (features grid) sets height; inner slides scroll if needed. */
const HIGHLIGHT_VIEWPORT_CLASS =
  'relative min-h-[520px] md:min-h-[560px] lg:min-h-[540px] overflow-hidden';

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
  return (
    <>
      <PublicSeo
        title="Sacramental records, modernized for every parish"
        description="Orthodox Metrics is the records platform for Orthodox parishes — secure baptism, marriage, and funeral registers, OCR digitization of historic ledgers, and multi-tenant parish administration."
        path="/"
        bare
      />
      <HeroCarousel embedded />
      <HomepageProofStrip />
      <HomepageHighlightCarousel />

      <HomepageRecordsTransformSection />

      <ParishRecordsAssessment />
    </>
  );
};

export default Homepage;

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
              <span className="font-om-body text-[15px] text-[#4a5565] dark:text-gray-400 leading-snug">
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
    `absolute inset-0 overflow-hidden px-2 md:px-8 transition-opacity duration-500 ease-in-out ${
      active ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
    }`;

  const arrowClass =
    'absolute top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full om-public-panel text-[#2d1b4e] dark:text-[#d4af37] shadow-md hover:opacity-90 transition-opacity';

  return (
    <section
      className="py-20 om-section-elevated relative"
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
                  ? 'w-8 bg-[var(--om-gold)]'
                  : 'w-2 bg-[var(--om-border)] hover:opacity-80'
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
      <div className="text-center mb-10 md:mb-12">
        <div className="inline-flex items-center gap-2 om-badge-primary mb-4">
          <EditableText contentKey="steps.badge" as="span" className="font-om-body om-text-small text-[var(--om-text-primary)]">
            {t('home.steps_badge')}
          </EditableText>
        </div>
        <RichEditableText contentKey="steps.title" as="h2" className="font-om-display om-text-h2 text-[var(--om-text-primary)] mb-2">
          {t('home.steps_title')}
        </RichEditableText>
      </div>

      <div className="grid md:grid-cols-3 gap-6 md:gap-8">
        <StepItem number={1} titleKey="steps.step1.title" descKey="steps.step1.desc" title={t('home.steps_step1_title')} description={t('home.steps_step1_desc')} variant="gold" />
        <StepItem number={2} titleKey="steps.step2.title" descKey="steps.step2.desc" title={t('home.steps_step2_title')} description={t('home.steps_step2_desc')} variant="surface" />
        <StepItem number={3} titleKey="steps.step3.title" descKey="steps.step3.desc" title={t('home.steps_step3_title')} description={t('home.steps_step3_desc')} variant="gold" />
      </div>
    </>
  );
}

function FeaturesPanel() {
  const { t } = useLanguage();
  const [altSet, setAltSet] = useState(false);
  const [pinned, setPinned] = useState(false);

  const visibleIndices = altSet ? [3, 4, 5] : [0, 1, 2];

  const showAlt = () => {
    if (!pinned) setAltSet(true);
  };
  const hideAlt = () => {
    if (!pinned) setAltSet(false);
  };
  const togglePin = () => {
    setPinned((p) => {
      const next = !p;
      if (!next) setAltSet(false);
      else setAltSet(true);
      return next;
    });
  };

  return (
    <>
      <div className="text-center mb-10 md:mb-12">
        <div className="inline-flex items-center gap-2 om-badge-primary mb-4">
          <EditableText contentKey="features.badge" as="span" className="font-om-body om-text-small text-[var(--om-text-primary)]">
            {t('home.features_badge')}
          </EditableText>
        </div>
        <RichEditableText contentKey="features.title" as="h2" className="font-om-display om-text-h2 text-[var(--om-text-primary)] mb-2">
          {t('home.features_title')}
        </RichEditableText>
        <p className="font-om-body om-text-small text-[var(--om-text-secondary)] mt-2">
          {t('home.features_hover_hint')}
        </p>
      </div>

      <div
        className="grid md:grid-cols-3 gap-6"
        onMouseEnter={showAlt}
        onMouseLeave={hideAlt}
      >
        {visibleIndices.map((i) => {
          const f = KEY_FEATURES[i];
          return (
            <button
              key={i}
              type="button"
              onClick={togglePin}
              className="om-ds-card text-left cursor-pointer transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--om-gold)]"
            >
              <div className="w-12 h-12 rounded-lg border border-[var(--om-border)] bg-[var(--om-input-bg)] flex items-center justify-center mb-4 text-[var(--om-gold)]">
                <f.icon size={24} aria-hidden />
              </div>
              <EditableText contentKey={`features.card${i + 1}.title`} as="h3" className="font-om-display om-text-h4 mb-2 text-[var(--om-text-primary)]">
                {t(`home.features_feat${i + 1}_title`)}
              </EditableText>
              <RichEditableText contentKey={`features.card${i + 1}.desc`} as="p" className="font-om-body om-text-small text-[var(--om-text-secondary)] leading-relaxed">
                {t(`home.features_feat${i + 1}_desc`)}
              </RichEditableText>
            </button>
          );
        })}
      </div>
    </>
  );
}

function StepItem({ number, titleKey, descKey, title, description, variant }: { number: number; titleKey: string; descKey: string; title: string; description: string; variant: 'gold' | 'surface' }) {
  const badgeClass =
    variant === 'gold'
      ? 'bg-[var(--om-gold)] text-[var(--om-text-primary)] border-[var(--om-gold)]'
      : 'bg-[var(--om-surface-elevated)] text-[var(--om-gold)] border-[var(--om-border)]';

  return (
    <div className="om-ds-card !p-6">
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-full border flex items-center justify-center font-om-display text-xl ${badgeClass}`}>
          {number}
        </div>
        <div>
          <EditableText contentKey={titleKey} as="h3" className="font-om-display om-text-h4 text-[var(--om-text-primary)] mb-2">
            {title}
          </EditableText>
          <RichEditableText contentKey={descKey} as="p" className="font-om-body om-text-body text-[var(--om-text-secondary)] leading-relaxed">
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
