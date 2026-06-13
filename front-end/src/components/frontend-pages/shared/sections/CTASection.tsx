import { ArrowRight, ChevronLeft } from '@/ui/icons';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import EditableText from '../EditableText';
import {
  buildLocalizedAssessmentRecommendation,
  useParishAssessmentConfig,
  type AssessmentAnswers,
} from './parishAssessmentConfig';

export type { AssessmentAnswers, AssessmentRecommendation } from './parishAssessmentConfig';

type AssessmentOption = { value: string; label: string };
type AssessmentQuestion = {
  id: string;
  question: string;
  options: AssessmentOption[];
};

interface CTASectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  editKeyPrefix?: string;
}

/**
 * Purple-gradient call-to-action banner used at the bottom of public pages.
 * Pass CTA buttons / links as children.
 */
const CTASection = ({ title, subtitle, children, editKeyPrefix }: CTASectionProps) => (
  <section className="py-20 om-hero-gradient">
    <div className="max-w-4xl mx-auto px-6 text-center">
      {editKeyPrefix ? (
        <EditableText contentKey={`${editKeyPrefix}.title`} as="h2" className="font-om-display text-4xl md:text-5xl mb-6">
          {title}
        </EditableText>
      ) : (
        <h2 className="font-om-display text-4xl md:text-5xl mb-6">{title}</h2>
      )}
      {subtitle && (
        editKeyPrefix ? (
          <EditableText contentKey={`${editKeyPrefix}.subtitle`} as="p" className="font-om-body text-xl om-hero-subtitle mb-8">
            {subtitle}
          </EditableText>
        ) : (
          <p className="font-om-body text-xl om-hero-subtitle mb-8">{subtitle}</p>
        )
      )}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">{children}</div>
    </div>
  </section>
);

// ── Parish Records Assessment (homepage) ─────────────────────────────────────

function assessmentContactHref(answers: AssessmentAnswers, t: (key: string) => string): string {
  const rec = buildLocalizedAssessmentRecommendation(answers, t);
  const summary = [rec.summaryLine, ...rec.bullets].join('\n');
  const params = new URLSearchParams({
    enquiry: 'parish_registration',
    message: `Parish Records Assessment summary:\n\n${summary}`,
  });
  return `${PUBLIC_ROUTES.CONTACT}?${params.toString()}`;
}

export function ParishRecordsAssessment() {
  const { t } = useLanguage();
  const config = useParishAssessmentConfig();
  const questions = config.questions as AssessmentQuestion[];
  const formId = useId();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AssessmentAnswers>({});
  const [transitioning, setTransitioning] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isComplete = step >= questions.length;
  const question = !isComplete ? questions[step] : null;
  const selectedValue = question ? answers[question.id] : undefined;
  const progressPct = isComplete ? 100 : Math.round(((step + 1) / questions.length) * 100);
  const recommendation = isComplete ? buildLocalizedAssessmentRecommendation(answers, t) : null;

  const bumpTransition = useCallback(() => {
    setTransitioning(true);
    const timer = window.setTimeout(() => setTransitioning(false), 220);
    return () => window.clearTimeout(timer);
  }, []);

  const goNext = useCallback(() => {
    if (!question || !selectedValue) return;
    bumpTransition();
    setStep((s) => s + 1);
    cardRef.current?.focus();
  }, [question, selectedValue, bumpTransition]);

  const goBack = useCallback(() => {
    if (step === 0) return;
    bumpTransition();
    setStep((s) => s - 1);
    cardRef.current?.focus();
  }, [step, bumpTransition]);

  useEffect(() => {
    if (!question) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selectedValue && !transitioning) {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [question, selectedValue, transitioning, goNext]);

  return (
    <section className="py-16 md:py-20 om-section-base" aria-labelledby={`${formId}-heading`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 md:mb-10">
          <h2
            id={`${formId}-heading`}
            className="font-om-display text-3xl sm:text-4xl md:text-5xl text-[var(--om-text-primary)] mb-4 leading-tight"
          >
            {config.intro.title}
          </h2>
          <p className="font-om-body text-base sm:text-lg text-[var(--om-text-secondary)] max-w-2xl mx-auto leading-relaxed">
            {config.intro.subtitle}
          </p>
        </div>

        <div
          ref={cardRef}
          tabIndex={-1}
          className="om-public-panel rounded-2xl shadow-2xl p-6 sm:p-8 md:p-10 outline-none"
        >
          {!isComplete && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2 font-om-body text-sm text-[#6a7282] dark:text-gray-400">
                <span>{config.progressLabel(step + 1, questions.length)}</span>
                <span>{progressPct}%</span>
              </div>
              <div
                className="h-2 rounded-full bg-[rgba(45,27,78,0.08)] dark:bg-white/10 overflow-hidden"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-[#d4af37] rounded-full transition-[width] duration-300 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          <div
            className={`transition-opacity duration-200 ease-out ${transitioning ? 'opacity-0' : 'opacity-100'}`}
          >
            {isComplete && recommendation ? (
              <div className="space-y-6">
                <div className="text-center sm:text-left">
                  <h3 className="font-om-display text-2xl sm:text-3xl text-[#2d1b4e] dark:text-white mb-3">
                    {config.completion.title}
                  </h3>
                  <p className="font-om-body text-[15px] sm:text-base text-[#4a5565] dark:text-gray-400 leading-relaxed">
                    {config.completion.subtitle}
                  </p>
                </div>
                <div
                  className="rounded-xl om-public-panel p-5 sm:p-6"
                  id={`${formId}-recommendation`}
                >
                  <p className="font-om-body font-medium text-[#2d1b4e] dark:text-[#d4af37] mb-4">
                    {recommendation.summaryLine}
                  </p>
                  <ul className="space-y-3 list-none p-0 m-0">
                    {recommendation.bullets.map((line) => (
                      <li key={line} className="flex gap-3 font-om-body text-[14px] sm:text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d4af37]" aria-hidden />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById(`${formId}-recommendation`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#d4af37] hover:bg-[#c29d2f] text-[#2d1b4e] font-om-body font-medium text-[15px] transition-colors border-0 cursor-pointer"
                  >
                    {config.completion.viewStepsLabel}
                    <ArrowRight size={18} />
                  </button>
                  <Link
                    to={assessmentContactHref(answers, t)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border-2 border-[#2d1b4e] dark:border-[#d4af37] text-[#2d1b4e] dark:text-[#d4af37] hover:bg-[rgba(45,27,78,0.05)] dark:hover:bg-white/5 font-om-body font-medium text-[15px] no-underline transition-colors"
                  >
                    {config.completion.consultLabel}
                  </Link>
                </div>
                <p className="font-om-body text-center sm:text-left text-sm text-[#6a7282] dark:text-gray-500 pt-2">
                  {config.readyPrefix}{' '}
                  <Link to={PUBLIC_ROUTES.ENROLL} className="text-[#2d1b4e] dark:text-[#d4af37] font-medium no-underline hover:underline">
                    {config.enrollLink}
                  </Link>{' '}
                  {config.readySuffix}
                </p>
              </div>
            ) : question ? (
              <fieldset className="border-0 p-0 m-0 min-w-0">
                <legend className="font-om-display text-xl sm:text-2xl text-[#2d1b4e] dark:text-white mb-6 block w-full">
                  {question.question}
                </legend>
                <div
                  className="grid gap-3"
                  role="radiogroup"
                  aria-label={question.question}
                >
                  {question.options.map((opt) => {
                    const selected = selectedValue === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setAnswers((a) => ({ ...a, [question.id]: opt.value }))}
                        className={`w-full text-left rounded-xl border-2 px-5 py-4 font-om-body text-[15px] sm:text-[16px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] focus-visible:ring-offset-2 ${
                          selected
                            ? 'border-[#d4af37] bg-[rgba(212,175,55,0.14)] text-[#2d1b4e] dark:text-white shadow-sm ring-1 ring-[#d4af37]/25'
                            : 'om-public-panel text-[#4a5565] dark:text-gray-300 hover:border-[#2d1b4e]/35 hover:opacity-90'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}
          </div>

          {!isComplete && (
            <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-[rgba(45,27,78,0.08)] dark:border-white/10">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-om-body text-sm font-medium text-[#4a5565] dark:text-gray-400 hover:bg-[#f3f4f6] dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft size={18} />
                {config.nav.back}
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!selectedValue}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#d4af37] hover:bg-[#c29d2f] disabled:opacity-50 disabled:pointer-events-none text-[#2d1b4e] font-om-body font-medium text-[15px] transition-colors"
              >
                {step === questions.length - 1 ? config.nav.seeResults : config.nav.continue}
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default CTASection;
