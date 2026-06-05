import { ArrowRight, ChevronLeft } from '@/ui/icons';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import EditableText from '../EditableText';

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
        <EditableText contentKey={`${editKeyPrefix}.title`} as="h2" className="font-['Georgia'] text-4xl md:text-5xl mb-6">
          {title}
        </EditableText>
      ) : (
        <h2 className="font-['Georgia'] text-4xl md:text-5xl mb-6">{title}</h2>
      )}
      {subtitle && (
        editKeyPrefix ? (
          <EditableText contentKey={`${editKeyPrefix}.subtitle`} as="p" className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] mb-8">
            {subtitle}
          </EditableText>
        ) : (
          <p className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] mb-8">{subtitle}</p>
        )
      )}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">{children}</div>
    </div>
  </section>
);

// ── Parish Records Assessment (homepage) ─────────────────────────────────────

export type AssessmentAnswers = Record<string, string>;

type AssessmentOption = { value: string; label: string };
type AssessmentQuestion = {
  id: string;
  question: string;
  options: AssessmentOption[];
};

export const PARISH_ASSESSMENT_CONFIG = {
  intro: {
    title: 'How Ready Is Your Parish to Digitize Its Records?',
    subtitle:
      'Answer a few quick questions to identify your parish’s current record-management needs and recommended next steps.',
  },
  completion: {
    title: 'Your Parish Is Ready for the Next Step',
    subtitle:
      'Based on your answers, Orthodox Metrics can help your parish securely preserve, organize, and manage its records.',
    viewStepsLabel: 'View Recommended Next Steps',
    consultLabel: 'Schedule a Parish Consultation',
  },
  questions: [
    {
      id: 'storage',
      question: 'How are your parish records currently stored?',
      options: [
        { value: 'paper', label: 'Paper records only' },
        { value: 'spreadsheets', label: 'Spreadsheets or local files' },
        { value: 'cms', label: 'Existing church-management software' },
        { value: 'combination', label: 'A combination of methods' },
      ],
    },
    {
      id: 'volume',
      question: 'Approximately how many historical records does your parish maintain?',
      options: [
        { value: 'under_500', label: 'Fewer than 500' },
        { value: '500_2500', label: '500–2,500' },
        { value: '2500_10000', label: '2,500–10,000' },
        { value: 'over_10000', label: 'More than 10,000' },
        { value: 'unsure', label: 'Unsure' },
      ],
    },
    {
      id: 'challenge',
      question: 'What is your parish’s biggest record-management challenge?',
      options: [
        { value: 'preserving', label: 'Preserving aging records' },
        { value: 'finding', label: 'Finding records quickly' },
        { value: 'access', label: 'Controlling access and permissions' },
        { value: 'certificates', label: 'Producing certificates and reports' },
        { value: 'migrating', label: 'Migrating from another system' },
      ],
    },
    {
      id: 'records',
      question: 'Which records would you like to manage digitally?',
      options: [
        { value: 'baptism', label: 'Baptism' },
        { value: 'marriage', label: 'Marriage' },
        { value: 'funeral', label: 'Funeral' },
        { value: 'membership', label: 'Membership or parishioner records' },
        { value: 'all', label: 'All parish records' },
      ],
    },
    {
      id: 'timeline',
      question: 'When would your parish like to begin?',
      options: [
        { value: 'immediately', label: 'Immediately' },
        { value: 'within_3mo', label: 'Within 3 months' },
        { value: 'within_6_12mo', label: 'Within 6–12 months' },
        { value: 'researching', label: 'Just researching options' },
      ],
    },
  ] satisfies AssessmentQuestion[],
} as const;

const QUESTIONS = PARISH_ASSESSMENT_CONFIG.questions;

export type AssessmentRecommendation = {
  summaryLine: string;
  bullets: string[];
};

/** Rule-based summary from assessment answers — extend via PARISH_ASSESSMENT_CONFIG. */
export function buildAssessmentRecommendation(answers: AssessmentAnswers): AssessmentRecommendation {
  const bullets: string[] = [];

  switch (answers.storage) {
    case 'paper':
      bullets.push('Start with scanning paper registers and OCR so decades of history become searchable.');
      break;
    case 'spreadsheets':
      bullets.push('Import spreadsheets and local files into structured, parish-specific sacramental databases.');
      break;
    case 'cms':
      bullets.push('Plan a careful migration from your current church-management system with field mapping support.');
      break;
    case 'combination':
      bullets.push('Unify paper, files, and software into one secure Orthodox Metrics workspace.');
      break;
    default:
      break;
  }

  switch (answers.volume) {
    case 'under_500':
      bullets.push('A focused first phase can digitize your core registers without overwhelming staff.');
      break;
    case '500_2500':
      bullets.push('Batch digitization in phases keeps quality high for medium-sized archives.');
      break;
    case '2500_10000':
    case 'over_10000':
      bullets.push('Larger archives benefit from staged uploads, OCR review, and dedicated onboarding support.');
      break;
    case 'unsure':
      bullets.push('We can help estimate scope and timeline during your parish consultation.');
      break;
    default:
      break;
  }

  switch (answers.challenge) {
    case 'preserving':
      bullets.push('Priority: secure storage, backups, and long-term preservation of fragile ledgers.');
      break;
    case 'finding':
      bullets.push('Full-text search across names, dates, and sacrament types saves hours each week.');
      break;
    case 'access':
      bullets.push('Role-based access lets clergy and staff see only what their ministry requires.');
      break;
    case 'certificates':
      bullets.push('Generate baptism, marriage, and funeral certificates from verified digital records.');
      break;
    case 'migrating':
      bullets.push('Our team supports data cleanup and migration from legacy systems.');
      break;
    default:
      break;
  }

  switch (answers.records) {
    case 'baptism':
      bullets.push('Begin with baptism registers — often the highest-volume sacramental records.');
      break;
    case 'marriage':
      bullets.push('Marriage records with witnesses, dispensations, and clergy details fit our marriage module.');
      break;
    case 'funeral':
      bullets.push('Funeral and memorial registers can be organized with clergy and burial fields.');
      break;
    case 'membership':
      bullets.push('Membership and parishioner data can live alongside sacramental registers.');
      break;
    case 'all':
      bullets.push('Enable baptism, marriage, funeral, and custom modules for complete parish coverage.');
      break;
    default:
      break;
  }

  switch (answers.timeline) {
    case 'immediately':
      bullets.push('Enroll now to schedule onboarding within the next few weeks.');
      break;
    case 'within_3mo':
      bullets.push('A three-month runway allows pilot scanning and staff training before full rollout.');
      break;
    case 'within_6_12mo':
      bullets.push('Plan milestones now so your archive is ready when your parish begins.');
      break;
    case 'researching':
      bullets.push('Use enrollment to explore modules and pricing with no obligation to start immediately.');
      break;
    default:
      break;
  }

  const unique = [...new Set(bullets)].slice(0, 5);
  const summaryLine =
    answers.timeline === 'researching'
      ? 'You are exploring options — we recommend a short consultation to map your parish’s path forward.'
      : answers.timeline === 'immediately'
        ? 'Your parish is ready to begin digitization — enrollment is the fastest next step.'
        : 'Your answers point to a structured digitization plan tailored to your parish.';

  return { summaryLine, bullets: unique.length ? unique : ['Enroll your parish to begin a guided onboarding with Orthodox Metrics staff.'] };
}

function assessmentContactHref(answers: AssessmentAnswers): string {
  const rec = buildAssessmentRecommendation(answers);
  const summary = [rec.summaryLine, ...rec.bullets].join('\n');
  const params = new URLSearchParams({
    enquiry: 'parish_registration',
    message: `Parish Records Assessment summary:\n\n${summary}`,
  });
  return `${PUBLIC_ROUTES.CONTACT}?${params.toString()}`;
}

export function ParishRecordsAssessment() {
  const formId = useId();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<AssessmentAnswers>({});
  const [transitioning, setTransitioning] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isComplete = step >= QUESTIONS.length;
  const question = !isComplete ? QUESTIONS[step] : null;
  const selectedValue = question ? answers[question.id] : undefined;
  const progressPct = isComplete ? 100 : Math.round(((step + 1) / QUESTIONS.length) * 100);
  const recommendation = isComplete ? buildAssessmentRecommendation(answers) : null;

  const bumpTransition = useCallback(() => {
    setTransitioning(true);
    const t = window.setTimeout(() => setTransitioning(false), 220);
    return () => window.clearTimeout(t);
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
    <section className="py-16 md:py-20 om-hero-gradient text-white" aria-labelledby={`${formId}-heading`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 md:mb-10">
          <h2
            id={`${formId}-heading`}
            className="font-['Georgia'] text-3xl sm:text-4xl md:text-5xl text-white mb-4 leading-tight"
          >
            {PARISH_ASSESSMENT_CONFIG.intro.title}
          </h2>
          <p className="font-['Inter'] text-base sm:text-lg text-[rgba(255,255,255,0.88)] max-w-2xl mx-auto leading-relaxed">
            {PARISH_ASSESSMENT_CONFIG.intro.subtitle}
          </p>
        </div>

        <div
          ref={cardRef}
          tabIndex={-1}
          className="bg-white dark:bg-[#161b22] rounded-2xl shadow-2xl border border-[rgba(255,255,255,0.12)] text-[#2d1b4e] dark:text-[#e8e6e1] p-6 sm:p-8 md:p-10 outline-none"
        >
          {!isComplete && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2 font-['Inter'] text-sm text-[#6a7282] dark:text-gray-400">
                <span>
                  Question {step + 1} of {QUESTIONS.length}
                </span>
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
                  <h3 className="font-['Georgia'] text-2xl sm:text-3xl text-[#2d1b4e] dark:text-white mb-3">
                    {PARISH_ASSESSMENT_CONFIG.completion.title}
                  </h3>
                  <p className="font-['Inter'] text-[15px] sm:text-base text-[#4a5565] dark:text-gray-400 leading-relaxed">
                    {PARISH_ASSESSMENT_CONFIG.completion.subtitle}
                  </p>
                </div>
                <div
                  className="rounded-xl border border-[rgba(45,27,78,0.12)] dark:border-white/10 bg-[#f9fafb] dark:bg-[#0d1117] p-5 sm:p-6"
                  id={`${formId}-recommendation`}
                >
                  <p className="font-['Inter'] font-medium text-[#2d1b4e] dark:text-[#d4af37] mb-4">
                    {recommendation.summaryLine}
                  </p>
                  <ul className="space-y-3 list-none p-0 m-0">
                    {recommendation.bullets.map((line) => (
                      <li key={line} className="flex gap-3 font-['Inter'] text-[14px] sm:text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
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
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#d4af37] hover:bg-[#c29d2f] text-[#2d1b4e] font-['Inter'] font-medium text-[15px] transition-colors border-0 cursor-pointer"
                  >
                    {PARISH_ASSESSMENT_CONFIG.completion.viewStepsLabel}
                    <ArrowRight size={18} />
                  </button>
                  <Link
                    to={assessmentContactHref(answers)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg border-2 border-[#2d1b4e] dark:border-[#d4af37] text-[#2d1b4e] dark:text-[#d4af37] hover:bg-[rgba(45,27,78,0.05)] dark:hover:bg-white/5 font-['Inter'] font-medium text-[15px] no-underline transition-colors"
                  >
                    {PARISH_ASSESSMENT_CONFIG.completion.consultLabel}
                  </Link>
                </div>
                <p className="font-['Inter'] text-center sm:text-left text-sm text-[#6a7282] dark:text-gray-500 pt-2">
                  Ready to begin?{' '}
                  <Link to={PUBLIC_ROUTES.ENROLL} className="text-[#2d1b4e] dark:text-[#d4af37] font-medium no-underline hover:underline">
                    Enroll your parish
                  </Link>{' '}
                  to start onboarding online.
                </p>
              </div>
            ) : question ? (
              <fieldset className="border-0 p-0 m-0 min-w-0">
                <legend className="font-['Georgia'] text-xl sm:text-2xl text-[#2d1b4e] dark:text-white mb-6 block w-full">
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
                        className={`w-full text-left rounded-xl border-2 px-5 py-4 font-['Inter'] text-[15px] sm:text-[16px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] focus-visible:ring-offset-2 ${
                          selected
                            ? 'border-[#d4af37] bg-[rgba(212,175,55,0.14)] text-[#2d1b4e] dark:text-white shadow-sm ring-1 ring-[#d4af37]/25'
                            : 'border-[rgba(45,27,78,0.12)] dark:border-white/12 bg-white dark:bg-[#161b22] text-[#4a5565] dark:text-gray-300 hover:border-[#2d1b4e]/35 hover:bg-[#f9fafb] dark:hover:bg-[#1e2a3a]'
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
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-['Inter'] text-sm font-medium text-[#4a5565] dark:text-gray-400 hover:bg-[#f3f4f6] dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft size={18} />
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!selectedValue}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#d4af37] hover:bg-[#c29d2f] disabled:opacity-50 disabled:pointer-events-none text-[#2d1b4e] font-['Inter'] font-medium text-[15px] transition-colors"
              >
                {step === QUESTIONS.length - 1 ? 'See results' : 'Continue'}
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
