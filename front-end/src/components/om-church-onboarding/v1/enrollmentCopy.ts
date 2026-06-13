import { useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export type TFn = (key: string) => string;

const JURISDICTION_SLUGS = ['goa', 'oca', 'antiochian', 'serbian', 'rocor', 'romanian', 'other'] as const;
const SIZE_SLUGS = ['under_100', '100_200', '200_500', '500_1000', '1000_plus'] as const;

export function useEnrollmentCopy() {
  const { t } = useLanguage();
  return useMemo(() => buildEnrollmentCopy(t), [t]);
}

export function buildEnrollmentCopy(t: TFn) {
  const stepWord = t('enroll.common.step');
  const stepLabel = (n: number) => `${stepWord} ${n}`;

  const wizardSteps = [
    { key: 'find-parish' as const, label: t('enroll.step.find_parish'), n: 1 },
    { key: 'contact' as const, label: t('enroll.step.contact'), n: 2 },
    { key: 'parish' as const, label: t('enroll.step.parish'), n: 3 },
    { key: 'location' as const, label: t('enroll.step.location'), n: 4 },
    { key: 'modules' as const, label: t('enroll.step.modules'), n: 5 },
  ];

  const importMethods = [
    {
      value: 'om_full_service' as const,
      label: t('enroll.import.om_full_service.label'),
      description: t('enroll.import.om_full_service.desc'),
    },
    {
      value: 'self_service' as const,
      label: t('enroll.import.self_service.label'),
      description: t('enroll.import.self_service.desc'),
    },
  ];

  const startTimelines = [
    { value: 'asap' as const, label: t('enroll.timeline.asap') },
    { value: 'few_weeks' as const, label: t('enroll.timeline.few_weeks') },
    { value: 'month_plus' as const, label: t('enroll.timeline.month_plus') },
  ];

  const moduleSubStages = [
    { n: 1, label: t('enroll.modules.sub.record_types') },
    { n: 2, label: t('enroll.modules.sub.import_method') },
    { n: 3, label: t('enroll.modules.sub.start_timeline') },
  ];

  const moduleCards = [
    {
      key: 'baptism',
      title: t('enroll.module.baptism.title'),
      desc: t('enroll.module.baptism.desc'),
      recommended: true,
    },
    {
      key: 'marriage',
      title: t('enroll.module.marriage.title'),
      desc: t('enroll.module.marriage.desc'),
      recommended: true,
    },
    {
      key: 'funeral',
      title: t('enroll.module.funeral.title'),
      desc: t('enroll.module.funeral.desc'),
      recommended: false,
    },
    {
      key: 'custom',
      title: t('enroll.module.custom.title'),
      desc: t('enroll.module.custom.desc'),
      recommended: false,
    },
  ];

  const moduleLabels: Record<string, string> = {
    baptism: t('enroll.module.baptism.short'),
    marriage: t('enroll.module.marriage.short'),
    funeral: t('enroll.module.funeral.short'),
    custom: t('enroll.module.custom.short'),
  };

  const jurisdictions = JURISDICTION_SLUGS.map((slug) => ({
    value: t(`enroll.jurisdiction.${slug}`),
    slug,
  }));

  const churchSizes = SIZE_SLUGS.map((slug) => ({
    value: t(`enroll.size.${slug}`),
    slug,
  }));

  const sacraments = [
    { key: 'baptism', label: t('enroll.landing.sacrament.baptism.label'), desc: t('enroll.landing.sacrament.baptism.desc') },
    { key: 'marriage', label: t('enroll.landing.sacrament.marriage.label'), desc: t('enroll.landing.sacrament.marriage.desc') },
    { key: 'funeral', label: t('enroll.landing.sacrament.funeral.label'), desc: t('enroll.landing.sacrament.funeral.desc') },
  ];

  const confirmNextSteps = [
    { title: t('enroll.confirm.next1.title'), description: t('enroll.confirm.next1.desc') },
    { title: t('enroll.confirm.next2.title'), description: t('enroll.confirm.next2.desc') },
    { title: t('enroll.confirm.next3.title'), description: t('enroll.confirm.next3.desc') },
    { title: t('enroll.confirm.next4.title'), description: t('enroll.confirm.next4.desc') },
  ];

  return {
    t,
    stepLabel,
    wizardSteps,
    importMethods,
    startTimelines,
    moduleSubStages,
    moduleCards,
    moduleLabels,
    jurisdictions,
    churchSizes,
    sacraments,
    confirmNextSteps,
    formatImportMethod: (value: string) =>
      importMethods.find((o) => o.value === value)?.label ?? value,
    formatStartTimeline: (value: string) =>
      startTimelines.find((o) => o.value === value)?.label ?? value,
    wizardProgress: (current: number, total: number) =>
      t('enroll.wizard.progress').replace('{current}', String(current)).replace('{total}', String(total)),
    moduleStageProgress: (current: number, total: number, label: string) =>
      t('enroll.modules.stage_progress')
        .replace('{current}', String(current))
        .replace('{total}', String(total))
        .replace('{label}', label),
    confirmReceivedBody: (firstName: string, churchName: string) =>
      t('enroll.confirm.received_body')
        .replace('{firstName}', firstName ? `, ${firstName}` : '')
        .replace('{churchName}', churchName),
    landing: {
      badge: t('enroll.landing.badge'),
      headlinePrefix: t('enroll.landing.headline_prefix'),
      headlineAccent: t('enroll.landing.headline_accent'),
      body: t('enroll.landing.body'),
      ctaStart: t('enroll.landing.cta_start'),
      ctaContact: t('enroll.landing.cta_contact'),
      trustReviewed: t('enroll.landing.trust_reviewed'),
      trustEncrypted: t('enroll.landing.trust_encrypted'),
      onboardingTitle: t('enroll.landing.onboarding_title'),
      landingSteps: [
        { n: 1, title: t('enroll.landing.flow1.title'), desc: t('enroll.landing.flow1.desc') },
        { n: 2, title: t('enroll.landing.flow2.title'), desc: t('enroll.landing.flow2.desc') },
        { n: 3, title: t('enroll.landing.flow3.title'), desc: t('enroll.landing.flow3.desc') },
        { n: 4, title: t('enroll.landing.flow4.title'), desc: t('enroll.landing.flow4.desc') },
      ],
      carouselLabel: t('enroll.landing.carousel_label'),
      carouselSlidesLabel: t('enroll.landing.carousel_slides_label'),
      carouselShowing: (label: string) => t('enroll.landing.carousel_showing').replace('{label}', label),
    },
    complete: {
      title: t('enroll.complete.title'),
      body: t('enroll.complete.body'),
      backHome: t('enroll.complete.back_home'),
      contact: t('enroll.complete.contact'),
    },
    nav: {
      cancel: t('enroll.nav.cancel'),
      back: t('enroll.nav.back'),
      continue: t('enroll.nav.continue'),
      next: t('enroll.nav.next'),
      skip: t('enroll.nav.skip'),
      submit: t('enroll.nav.submit'),
      submitting: t('enroll.nav.submitting'),
    },
    wizard: {
      title: t('enroll.wizard.title'),
      duration: t('enroll.wizard.duration'),
      progressAria: t('enroll.wizard.progress_aria'),
      completeRequired: t('enroll.wizard.complete_required'),
    },
    findParish: {
      title: t('enroll.find_parish.title'),
      description: t('enroll.find_parish.description'),
      statePlaceholder: t('enroll.find_parish.state_placeholder'),
      mapLabel: t('enroll.find_parish.map_label'),
      mapHint: t('enroll.find_parish.map_hint'),
      loadingMap: t('enroll.find_parish.loading_map'),
      mapUnavailable: t('enroll.find_parish.map_unavailable'),
      parishName: t('enroll.find_parish.parish_name'),
      parishHint: t('enroll.find_parish.parish_hint'),
      parishPlaceholder: t('enroll.find_parish.parish_placeholder'),
      searching: t('enroll.find_parish.searching'),
      noResults: t('enroll.find_parish.no_results'),
      selected: t('enroll.find_parish.selected'),
      notListed: t('enroll.find_parish.not_listed'),
      cancelSearch: t('enroll.find_parish.cancel_search'),
      manualLabel: t('enroll.find_parish.manual_label'),
      manualHint: t('enroll.find_parish.manual_hint'),
      manualPlaceholder: t('enroll.find_parish.manual_placeholder'),
      crmTip: t('enroll.find_parish.crm_tip'),
    },
    contact: {
      title: t('enroll.contact.title'),
      description: t('enroll.contact.description'),
      firstName: t('enroll.contact.first_name'),
      lastName: t('enroll.contact.last_name'),
      email: t('enroll.contact.email'),
      emailHint: t('enroll.contact.email_hint'),
    },
    parishInfo: {
      title: t('enroll.parish_info.title'),
      description: t('enroll.parish_info.description'),
      churchName: t('enroll.parish_info.church_name'),
      jurisdiction: t('enroll.parish_info.jurisdiction'),
      jurisdictionHint: t('enroll.parish_info.jurisdiction_hint'),
      jurisdictionPlaceholder: t('enroll.parish_info.jurisdiction_placeholder'),
      phone: t('enroll.parish_info.phone'),
      website: t('enroll.parish_info.website'),
      size: t('enroll.parish_info.size'),
      sizePlaceholder: t('enroll.parish_info.size_placeholder'),
      referral: t('enroll.parish_info.referral'),
      optional: t('enroll.common.optional'),
    },
    location: {
      title: t('enroll.location.title'),
      description: t('enroll.location.description'),
      street: t('enroll.location.street'),
      city: t('enroll.location.city'),
      state: t('enroll.location.state'),
      zip: t('enroll.location.zip'),
      zipSuggested: t('enroll.location.zip_suggested'),
      country: t('enroll.location.country'),
      timezone: t('enroll.location.timezone'),
      timezonePlaceholder: t('enroll.location.timezone_placeholder'),
    },
    modules: {
      title: t('enroll.modules.title'),
      description: t('enroll.modules.description'),
      selectPrompt: t('enroll.modules.select_prompt'),
      recommended: t('enroll.modules.recommended'),
      selected: t('enroll.modules.selected'),
      tapToSelect: t('enroll.modules.tap_to_select'),
      selectedCount: t('enroll.modules.selected_count'),
      selectedModules: t('enroll.modules.selected_modules'),
      importLabel: t('enroll.modules.import_label'),
      importQuestion: t('enroll.modules.import_question'),
      importAria: t('enroll.modules.import_aria'),
      timelineQuestion: t('enroll.modules.timeline_question'),
      timelineAria: t('enroll.modules.timeline_aria'),
      submitTip: t('enroll.modules.submit_tip'),
    },
    confirm: {
      brand: t('enroll.confirm.brand'),
      receivedTitle: t('enroll.confirm.received_title'),
      reference: t('enroll.confirm.reference'),
      copyReference: t('enroll.confirm.copy_reference'),
      copied: t('enroll.confirm.copied'),
      whatNext: t('enroll.confirm.what_next'),
      submissionTitle: t('enroll.confirm.submission_title'),
      detailChurch: t('enroll.confirm.detail_church'),
      detailEmail: t('enroll.confirm.detail_email'),
      detailModules: t('enroll.confirm.detail_modules'),
      detailImport: t('enroll.confirm.detail_import'),
      detailTimeline: t('enroll.confirm.detail_timeline'),
      none: t('enroll.confirm.none'),
      helpTitle: t('enroll.confirm.help_title'),
      helpBody: t('enroll.confirm.help_body'),
      returnHome: t('enroll.confirm.return_home'),
      contactUs: t('enroll.confirm.contact_us'),
      showDetails: t('enroll.confirm.show_details'),
      hideDetails: t('enroll.confirm.hide_details'),
      footer: t('enroll.confirm.footer').replace('{year}', String(new Date().getFullYear())),
    },
    errors: {
      submitFailed: t('enroll.errors.submit_failed'),
      network: t('enroll.errors.network'),
      firstName: t('enroll.errors.first_name'),
      lastName: t('enroll.errors.last_name'),
      emailRequired: t('enroll.errors.email_required'),
      emailInvalid: t('enroll.errors.email_invalid'),
      churchName: t('enroll.errors.church_name'),
      modules: t('enroll.errors.modules'),
      importMethod: t('enroll.errors.import_method'),
      startTimeline: t('enroll.errors.start_timeline'),
    },
  };
}

export function validateContactFields(p: Record<string, unknown>, t: TFn): Record<string, string> {
  const e: Record<string, string> = {};
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!String(p.firstName ?? '').trim()) e.firstName = t('enroll.errors.first_name');
  if (!String(p.lastName ?? '').trim()) e.lastName = t('enroll.errors.last_name');
  if (!String(p.email ?? '').trim()) e.email = t('enroll.errors.email_required');
  else if (!EMAIL_RE.test(String(p.email).trim())) e.email = t('enroll.errors.email_invalid');
  return e;
}

export function validateParishFields(p: Record<string, unknown>, t: TFn): Record<string, string> {
  const e: Record<string, string> = {};
  if (!String(p.churchName ?? '').trim()) e.churchName = t('enroll.errors.church_name');
  return e;
}

export function validateModulesFields(
  modules: Record<string, boolean>,
  importMethod: string,
  startTimeline: string,
  t: TFn,
): Record<string, string> {
  const e: Record<string, string> = {};
  if (!Object.values(modules).some(Boolean)) e.modules = t('enroll.errors.modules');
  if (!importMethod) e.importMethod = t('enroll.errors.import_method');
  if (!startTimeline) e.startTimeline = t('enroll.errors.start_timeline');
  return e;
}
