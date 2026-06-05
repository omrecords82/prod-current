/**
 * TourInteractiveDemo — 4-step interactive product walkthrough.
 *
 * Features:
 * - Manual step navigation (prev/next, clickable pills)
 * - Optional autoplay with pause/play toggle
 * - Animated step transitions via framer-motion
 * - Fully responsive (side-by-side on desktop, stacked on mobile)
 * - Dark mode aware
 * - Respects prefers-reduced-motion
 * - Keyboard accessible with ARIA labels
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Database, Search, BarChart3, ChevronLeft, ChevronRight, Play, Pause, type LucideIcon } from 'lucide-react';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import { useLanguage } from '@/context/LanguageContext';

/** Return translation if it exists in the translations map, otherwise the fallback. */
function tx(translations: Record<string, string>, key: string, fallback: string): string {
  return translations[key] ?? fallback;
}

import DemoStepDigitize from './DemoStepDigitize';
import DemoStepOrganize from './DemoStepOrganize';
import DemoStepSearch from './DemoStepSearch';
import DemoStepAnalytics from './DemoStepAnalytics';

// ── Step configuration ──

interface TourStep {
  id: string;
  icon: LucideIcon;
  titleKey: string;
  titleFallback: string;
  subtitleKey: string;
  subtitleFallback: string;
  descKey: string;
  descFallback: string;
  panel: React.ComponentType<{ isActive: boolean }>;
}

const STEPS: TourStep[] = [
  {
    id: 'digitize',
    icon: Upload,
    titleKey: 'tour.demo.step1_title',
    titleFallback: 'Digitize Your Records',
    subtitleKey: 'tour.demo.step1_subtitle',
    subtitleFallback: 'Step 1',
    descKey: 'tour.demo.step1_desc',
    descFallback: 'Upload scans, photos, or entire archives of your parish ledgers. Our OCR technology extracts text from handwritten records — transforming decades of history into searchable digital data.',
    panel: DemoStepDigitize,
  },
  {
    id: 'organize',
    icon: Database,
    titleKey: 'tour.demo.step2_title',
    titleFallback: 'Organize Parish Data',
    subtitleKey: 'tour.demo.step2_subtitle',
    subtitleFallback: 'Step 2',
    descKey: 'tour.demo.step2_desc',
    descFallback: 'Extracted information is automatically structured into clean, organized records — baptisms, marriages, and funerals — each with the fields that matter most to your parish.',
    panel: DemoStepOrganize,
  },
  {
    id: 'search',
    icon: Search,
    titleKey: 'tour.demo.step3_title',
    titleFallback: 'Search Everything Instantly',
    subtitleKey: 'tour.demo.step3_subtitle',
    subtitleFallback: 'Step 3',
    descKey: 'tour.demo.step3_desc',
    descFallback: 'Find any record in seconds. Search by name, date, sacrament type, or any field across your entire parish history — with support for multilingual names and fuzzy matching.',
    panel: DemoStepSearch,
  },
  {
    id: 'analytics',
    icon: BarChart3,
    titleKey: 'tour.demo.step4_title',
    titleFallback: 'Gain Parish Insights',
    subtitleKey: 'tour.demo.step4_subtitle',
    subtitleFallback: 'Step 4',
    descKey: 'tour.demo.step4_desc',
    descFallback: 'Track trends, generate reports, and gain meaningful insights about your parish community — from sacrament frequency to growth patterns across decades.',
    panel: DemoStepAnalytics,
  },
];

const AUTOPLAY_INTERVAL = 8000;

const TourInteractiveDemo = () => {
  const { translations } = useLanguage();
  const [activeStep, setActiveStep] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reduced motion check
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  const goTo = useCallback((step: number, dir?: number) => {
    setDirection(dir ?? (step > activeStep ? 1 : -1));
    setActiveStep(step);
  }, [activeStep]);

  const next = useCallback(() => {
    const nextStep = (activeStep + 1) % STEPS.length;
    goTo(nextStep, 1);
  }, [activeStep, goTo]);

  const prev = useCallback(() => {
    const prevStep = (activeStep - 1 + STEPS.length) % STEPS.length;
    goTo(prevStep, -1);
  }, [activeStep, goTo]);

  // Autoplay
  useEffect(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    if (autoplay) {
      autoplayRef.current = setInterval(next, AUTOPLAY_INTERVAL);
    }
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [autoplay, next]);

  // Pause autoplay on user interaction, resume after delay
  const handleUserNav = useCallback((action: () => void) => {
    setAutoplay(false);
    action();
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { handleUserNav(next); }
    else if (e.key === 'ArrowLeft') { handleUserNav(prev); }
    else if (e.key === ' ') { e.preventDefault(); setAutoplay(p => !p); }
  }, [next, prev, handleUserNav]);

  const step = STEPS[activeStep];
  const StepIcon = step.icon;
  const PanelComponent = step.panel;

  const variants = prefersReducedMotion.current
    ? { enter: {}, center: {}, exit: {} }
    : {
        enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
      };

  return (
    <section className="py-12 md:py-16 om-section-base" aria-label="Interactive product demo">
      <div className="max-w-7xl mx-auto px-6">
        <p className="sr-only">
          {tx(translations,'tour.demo_subheading', 'Experience the complete workflow — from paper records to parish insights — in four simple steps.')}
        </p>

        {/* Step indicator pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 md:mb-10 px-1" role="tablist" aria-label="Demo steps">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === activeStep;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tour-panel-${s.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => handleUserNav(() => goTo(i))}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-['Inter'] font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-[#2d1b4e] dark:bg-[#d4af37] text-white dark:text-[#2d1b4e] shadow-md'
                    : 'bg-[#f3f4f6] dark:bg-gray-800 text-[#6a7282] dark:text-gray-400 hover:bg-[#e5e7eb] dark:hover:bg-gray-700'
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{tx(translations,s.subtitleKey, s.subtitleFallback)}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
            );
          })}
        </div>

        {/* Main demo area */}
        <div
          className="bg-[#f9fafb] dark:bg-[#0d1117] rounded-2xl border border-[rgba(45,27,78,0.08)] dark:border-gray-800 shadow-lg overflow-hidden"
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="region"
          aria-label="Interactive demo viewer"
          aria-roledescription="carousel"
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: prefersReducedMotion.current ? 0 : 0.35, ease: 'easeInOut' }}
              className="grid md:grid-cols-2 gap-0 md:h-[480px]"
              id={`tour-panel-${step.id}`}
              role="tabpanel"
              aria-label={tx(translations,step.titleKey, step.titleFallback)}
            >
              {/* Left: description */}
              <div className="p-8 md:p-10 lg:p-12 flex flex-col justify-center overflow-hidden">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#2d1b4e] dark:bg-[#d4af37] flex items-center justify-center">
                    <StepIcon size={20} className="text-[#d4af37] dark:text-[#2d1b4e]" />
                  </div>
                  <span className="font-['Inter'] text-[12px] font-semibold tracking-wider uppercase text-[#6a7282] dark:text-gray-500">
                    {tx(translations,step.subtitleKey, step.subtitleFallback)}
                  </span>
                </div>
                <EditableText contentKey={step.titleKey} as="h3" className="font-['Georgia'] text-2xl md:text-3xl text-[#2d1b4e] dark:text-white mb-4 leading-tight">
                  {tx(translations,step.titleKey, step.titleFallback)}
                </EditableText>
                <EditableText contentKey={step.descKey} as="p" className="font-['Inter'] text-[15px] md:text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed" multiline>
                  {tx(translations,step.descKey, step.descFallback)}
                </EditableText>

                {/* Step counter */}
                <div className="mt-8 flex items-center gap-3">
                  <span className="font-['Inter'] text-[13px] font-medium text-[#2d1b4e] dark:text-gray-300">
                    {activeStep + 1} / {STEPS.length}
                  </span>
                  {/* Progress dots */}
                  <div className="flex gap-1.5">
                    {STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === activeStep
                            ? 'w-6 bg-[#d4af37]'
                            : i < activeStep
                            ? 'w-1.5 bg-[#2d1b4e] dark:bg-[#d4af37] opacity-40'
                            : 'w-1.5 bg-[#d1d5db] dark:bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: interactive panel */}
              <div className="bg-white dark:bg-gray-800 p-6 md:p-8 border-t md:border-t-0 md:border-l border-[rgba(45,27,78,0.08)] dark:border-gray-700 h-[420px] md:h-[480px] overflow-hidden">
                <PanelComponent isActive={activeStep === STEPS.indexOf(step)} />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation bar */}
          <div className="flex items-center justify-between px-6 md:px-10 py-4 bg-white dark:bg-gray-800 border-t border-[rgba(45,27,78,0.06)] dark:border-gray-700">
            <button
              onClick={() => handleUserNav(prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-['Inter'] font-medium text-[#4a5565] dark:text-gray-400 hover:bg-[#f3f4f6] dark:hover:bg-gray-700 transition-colors"
              aria-label="Previous step"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <button
              onClick={() => setAutoplay(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-['Inter'] font-medium text-[#6a7282] dark:text-gray-500 hover:bg-[#f3f4f6] dark:hover:bg-gray-700 transition-colors"
              aria-label={autoplay ? 'Pause autoplay' : 'Start autoplay'}
            >
              {autoplay ? <Pause size={14} /> : <Play size={14} />}
              <span className="hidden sm:inline">{autoplay ? 'Pause' : 'Autoplay'}</span>
            </button>

            <button
              onClick={() => handleUserNav(next)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-['Inter'] font-medium text-[#4a5565] dark:text-gray-400 hover:bg-[#f3f4f6] dark:hover:bg-gray-700 transition-colors"
              aria-label="Next step"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TourInteractiveDemo;
