import { useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export type AssessmentAnswers = Record<string, string>;

export type AssessmentRecommendation = {
  summaryLine: string;
  bullets: string[];
};

type TFn = (key: string) => string;

export function useParishAssessmentConfig() {
  const { t } = useLanguage();
  return useMemo(() => buildParishAssessmentConfig(t), [t]);
}

export function buildParishAssessmentConfig(t: TFn) {
  return {
    intro: {
      title: t('home.assessment.intro_title'),
      subtitle: t('home.assessment.intro_subtitle'),
    },
    completion: {
      title: t('home.assessment.complete_title'),
      subtitle: t('home.assessment.complete_subtitle'),
      viewStepsLabel: t('home.assessment.view_steps'),
      consultLabel: t('home.assessment.schedule_consult'),
    },
    questions: [
      {
        id: 'storage',
        question: t('home.assessment.q.storage.text'),
        options: [
          { value: 'paper', label: t('home.assessment.q.storage.paper') },
          { value: 'spreadsheets', label: t('home.assessment.q.storage.spreadsheets') },
          { value: 'cms', label: t('home.assessment.q.storage.cms') },
          { value: 'combination', label: t('home.assessment.q.storage.combination') },
        ],
      },
      {
        id: 'volume',
        question: t('home.assessment.q.volume.text'),
        options: [
          { value: 'under_500', label: t('home.assessment.q.volume.under_500') },
          { value: '500_2500', label: t('home.assessment.q.volume.500_2500') },
          { value: '2500_10000', label: t('home.assessment.q.volume.2500_10000') },
          { value: 'over_10000', label: t('home.assessment.q.volume.over_10000') },
          { value: 'unsure', label: t('home.assessment.q.volume.unsure') },
        ],
      },
      {
        id: 'challenge',
        question: t('home.assessment.q.challenge.text'),
        options: [
          { value: 'preserving', label: t('home.assessment.q.challenge.preserving') },
          { value: 'finding', label: t('home.assessment.q.challenge.finding') },
          { value: 'access', label: t('home.assessment.q.challenge.access') },
          { value: 'certificates', label: t('home.assessment.q.challenge.certificates') },
          { value: 'migrating', label: t('home.assessment.q.challenge.migrating') },
        ],
      },
      {
        id: 'records',
        question: t('home.assessment.q.records.text'),
        options: [
          { value: 'baptism', label: t('home.assessment.q.records.baptism') },
          { value: 'marriage', label: t('home.assessment.q.records.marriage') },
          { value: 'funeral', label: t('home.assessment.q.records.funeral') },
          { value: 'membership', label: t('home.assessment.q.records.membership') },
          { value: 'all', label: t('home.assessment.q.records.all') },
        ],
      },
      {
        id: 'timeline',
        question: t('home.assessment.q.timeline.text'),
        options: [
          { value: 'immediately', label: t('home.assessment.q.timeline.immediately') },
          { value: 'within_3mo', label: t('home.assessment.q.timeline.within_3mo') },
          { value: 'within_6_12mo', label: t('home.assessment.q.timeline.within_6_12mo') },
          { value: 'researching', label: t('home.assessment.q.timeline.researching') },
        ],
      },
    ],
    nav: {
      back: t('home.assessment.back'),
      continue: t('home.assessment.continue'),
      seeResults: t('home.assessment.see_results'),
    },
    progressLabel: (current: number, total: number) =>
      t('home.assessment.progress')
        .replace('{current}', String(current))
        .replace('{total}', String(total)),
    readyPrefix: t('home.assessment.ready_prefix'),
    enrollLink: t('home.assessment.enroll_link'),
    readySuffix: t('home.assessment.ready_suffix'),
  };
}

export function buildLocalizedAssessmentRecommendation(
  answers: AssessmentAnswers,
  t: TFn,
): AssessmentRecommendation {
  const bullets: string[] = [];

  const recKey = (group: string, value: string | undefined) =>
    value ? t(`home.assessment.rec.${group}.${value}`) : '';

  [
    recKey('storage', answers.storage),
    recKey('volume', answers.volume),
    recKey('challenge', answers.challenge),
    recKey('records', answers.records),
    recKey('timeline', answers.timeline),
  ].forEach((line) => {
    if (line && !line.startsWith('home.assessment.')) bullets.push(line);
  });

  const unique = [...new Set(bullets)].slice(0, 5);
  const summaryLine =
    answers.timeline === 'researching'
      ? t('home.assessment.summary.researching')
      : answers.timeline === 'immediately'
        ? t('home.assessment.summary.immediately')
        : t('home.assessment.summary.default');

  return {
    summaryLine,
    bullets: unique.length ? unique : [t('home.assessment.rec.fallback')],
  };
}
