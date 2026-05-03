import { Link } from 'react-router-dom';
import { Globe, Calendar, BarChart3, Shield, BookOpen, Search, ArrowRight, CheckCircle2, type LucideIcon } from '@/ui/icons';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import HomepageHero from '@/components/frontend-pages/homepage/HomepageHero';
import HomepageIntro from '@/components/frontend-pages/homepage/HomepageIntro';
import HomepageRecordsTransformSection from '@/components/frontend-pages/homepage/records-transform/HomepageRecordsTransformSection';
import PublicSeo from '@/components/seo/PublicSeo';
import { useLanguage } from '@/context/LanguageContext';

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
      <HomepageIntro />

      {/* How It Works */}
      <section className="py-20 bg-[#f9fafb] dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-700 px-4 py-2 rounded-full mb-4 shadow-sm">
              <EditableText contentKey="steps.badge" as="span" className="font-['Inter'] text-[14px] text-[#2d1b4e] dark:text-white">
                {t('home.steps_badge')}
              </EditableText>
            </div>
            <EditableText contentKey="steps.title" as="h2" className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] dark:text-white mb-4">
              {t('home.steps_title')}
            </EditableText>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <StepItem number={1} titleKey="steps.step1.title" descKey="steps.step1.desc" title={t('home.steps_step1_title')} description={t('home.steps_step1_desc')} variant="purple" />
            <StepItem number={2} titleKey="steps.step2.title" descKey="steps.step2.desc" title={t('home.steps_step2_title')} description={t('home.steps_step2_desc')} variant="purple" />
            <StepItem number={3} titleKey="steps.step3.title" descKey="steps.step3.desc" title={t('home.steps_step3_title')} description={t('home.steps_step3_desc')} variant="gold" />
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[rgba(45,27,78,0.05)] dark:bg-gray-800 px-4 py-2 rounded-full mb-4">
              <EditableText contentKey="features.badge" as="span" className="font-['Inter'] text-[14px] text-[#2d1b4e] dark:text-white">
                {t('home.features_badge')}
              </EditableText>
            </div>
            <EditableText contentKey="features.title" as="h2" className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] dark:text-white mb-4">
              {t('home.features_title')}
            </EditableText>
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
                <EditableText contentKey={`features.card${i + 1}.desc`} as="p" className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed" multiline>
                  {t(`home.features_feat${i + 1}_desc`)}
                </EditableText>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Records Transform Showcase */}
      <HomepageRecordsTransformSection />

      {/* Why Choose Us */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[rgba(45,27,78,0.05)] dark:bg-gray-800 px-4 py-2 rounded-full mb-6">
                <EditableText contentKey="why.badge" as="span" className="font-['Inter'] text-[14px] text-[#2d1b4e] dark:text-white">
                  {t('home.why_badge')}
                </EditableText>
              </div>
              <EditableText contentKey="why.title" as="h2" className="font-['Georgia'] text-4xl md:text-5xl text-[#2d1b4e] dark:text-white mb-6">
                {t('home.why_title')}
              </EditableText>
              <EditableText contentKey="why.description" as="p" className="font-['Inter'] text-lg text-[#4a5565] dark:text-gray-400 leading-relaxed mb-8" multiline>
                {t('home.why_desc')}
              </EditableText>
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
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
                  <EditableText contentKey="why.stat1.number" as="div" className="text-[#d4af37] font-['Georgia'] text-5xl mb-2">
                    {t('home.why_stat1_number')}
                  </EditableText>
                  <EditableText contentKey="why.stat1.label" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">
                    {t('home.why_stat1_label')}
                  </EditableText>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
                  <EditableText contentKey="why.stat2.number" as="div" className="text-[#2d1b4e] dark:text-[#d4af37] font-['Georgia'] text-5xl mb-2">
                    {t('home.why_stat2_number')}
                  </EditableText>
                  <EditableText contentKey="why.stat2.label" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">
                    {t('home.why_stat2_label')}
                  </EditableText>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
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
          <EditableText contentKey="cta.title" as="h2" className="font-['Georgia'] text-4xl md:text-5xl mb-6">
            {t('home.cta_title')}
          </EditableText>
          <EditableText contentKey="cta.subtitle" as="p" className="font-['Inter'] text-xl text-[rgba(255,255,255,0.9)] mb-8" multiline>
            {t('home.cta_subtitle')}
          </EditableText>
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

// ── Local sub-components ──

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
          <EditableText contentKey={descKey} as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed" multiline>
            {description}
          </EditableText>
        </div>
      </div>
    </div>
  );
}

// ── Static data (icons only — text comes from translations) ──

const KEY_FEATURES: { icon: LucideIcon }[] = [
  { icon: Globe },
  { icon: Calendar },
  { icon: BarChart3 },
  { icon: Shield },
  { icon: BookOpen },
  { icon: Search },
];
