import { Link } from 'react-router-dom';
import { ArrowRight, Globe, BookOpen, Shield, Users, Church, Calendar, CheckCircle2 } from '@/ui/icons';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { HeroSection, SectionHeader, CTASection } from '@/components/frontend-pages/shared/sections';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';
import PageContainer from '@/shared/ui/PageContainer';
import PublicSeo from '@/components/seo/PublicSeo';
import { useLanguage } from '@/context/LanguageContext';
import leadershipBanner from '@/assets/images/frontend-pages/about/Orthodox-Leadership-banner.png';
import EditableText from '@/components/frontend-pages/shared/EditableText';

const About = () => {
  const { t } = useLanguage();

  const missionPoints = [
    'about.mission_point1',
    'about.mission_point2',
    'about.mission_point3',
    'about.mission_point4',
  ];

  const stats = [
    { valueKey: 'about.stat1_value', labelKey: 'about.stat1_label' },
    { valueKey: 'about.stat2_value', labelKey: 'about.stat2_label' },
    { valueKey: 'about.stat3_value', labelKey: 'about.stat3_label' },
  ];

  const features = [
    { icon: BookOpen, titleKey: 'about.feature1_title', descriptionKey: 'about.feature1_desc' },
    { icon: Globe, titleKey: 'about.feature2_title', descriptionKey: 'about.feature2_desc' },
    { icon: Calendar, titleKey: 'about.feature3_title', descriptionKey: 'about.feature3_desc' },
    { icon: Shield, titleKey: 'about.feature4_title', descriptionKey: 'about.feature4_desc' },
    { icon: Church, titleKey: 'about.feature5_title', descriptionKey: 'about.feature5_desc' },
    { icon: Users, titleKey: 'about.feature6_title', descriptionKey: 'about.feature6_desc' },
  ];

  const steps = [
    { number: 1, titleKey: 'about.step1_title', descriptionKey: 'about.step1_desc' },
    { number: 2, titleKey: 'about.step2_title', descriptionKey: 'about.step2_desc' },
    { number: 3, titleKey: 'about.step3_title', descriptionKey: 'about.step3_desc' },
  ];

  return (
    <PageContainer title="About Us" description="About Orthodox Metrics">
      <PublicSeo
        title="About"
        description="Why we built Orthodox Metrics: a records platform for Orthodox parishes that respects canonical custody, supports multiple jurisdictions, and modernizes the work of preserving sacramental life."
        path="/frontend-pages/about"
      />
      {/* Hero */}
      <HeroSection
        badge={t('about.hero_badge')}
        title={t('about.hero_title')}
        subtitle={t('about.hero_subtitle')}
        editKeyPrefix="about.hero"
      />

      {/* Mission Statement */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="om-badge-primary mb-6 inline-flex">
                <EditableText contentKey="about.mission_badge" as="span" className="om-text-primary text-[14px]">{t('about.mission_badge')}</EditableText>
              </div>
              <EditableText contentKey="about.mission_title" as="h2" className="om-heading-primary mb-6">
                {t('about.mission_title')}
              </EditableText>
              <EditableText contentKey="about.mission_p1" as="p" className="font-['Inter'] text-lg text-[#4a5565] dark:text-gray-400 leading-relaxed mb-8">
                {t('about.mission_p1')}
              </EditableText>
              <EditableText contentKey="about.mission_p2" as="p" className="font-['Inter'] text-lg text-[#4a5565] dark:text-gray-400 leading-relaxed mb-8">
                {t('about.mission_p2')}
              </EditableText>
              <div className="space-y-4">
                {missionPoints.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="text-[#d4af37] flex-shrink-0 mt-1" size={20} />
                    <EditableText contentKey={item} as="span" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">{t(item)}</EditableText>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] dark:from-gray-800 dark:to-gray-700 rounded-2xl p-12 border border-[rgba(45,27,78,0.1)] dark:border-gray-600">
              <div className="space-y-8">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
                    <div className={`${i % 2 === 0 ? 'text-[#d4af37]' : 'text-[#2d1b4e] dark:text-[#d4af37]'} font-['Georgia'] text-5xl mb-2`}>
                      <EditableText contentKey={stat.valueKey} as="span">{t(stat.valueKey)}</EditableText>
                    </div>
                    <EditableText contentKey={stat.labelKey} as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">{t(stat.labelKey)}</EditableText>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-20 om-section-elevated">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader
            badge={t('about.features_badge')}
            title={t('about.features_title')}
            subtitle={t('about.features_subtitle')}
            editKeyPrefix="about.features"
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="om-card-compact p-6 hover:shadow-md transition-shadow">
                <div className="om-icon-container-small mb-4">
                  <f.icon className="text-[#d4af37] dark:text-[#2d1b4e]" size={28} />
                </div>
                <EditableText contentKey={f.titleKey} as="h3" className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-2">{t(f.titleKey)}</EditableText>
                <EditableText contentKey={f.descriptionKey} as="p" className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">{t(f.descriptionKey)}</EditableText>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader
            badge={t('about.steps_badge')}
            title={t('about.steps_title')}
            subtitle={t('about.steps_subtitle')}
            editKeyPrefix="about.steps"
          />

          <div className="grid md:grid-cols-3 gap-12">
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 ${
                    step.number === 3
                      ? 'bg-[#d4af37] text-[#2d1b4e]'
                      : 'bg-[#2d1b4e] dark:bg-[#d4af37] text-[#d4af37] dark:text-[#2d1b4e]'
                  } rounded-full flex items-center justify-center font-['Georgia'] text-xl`}>
                    {step.number}
                  </div>
                  <div>
                    <EditableText contentKey={step.titleKey} as="h3" className="font-['Inter'] font-medium text-xl text-[#2d1b4e] dark:text-white mb-2">{t(step.titleKey)}</EditableText>
                    <EditableText contentKey={step.descriptionKey} as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed">{t(step.descriptionKey)}</EditableText>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="py-20 om-section-elevated">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="flex justify-center">
              <div className="relative">
                <img
                  src={leadershipBanner}
                  alt={t('about.founder_name')}
                  className="w-full max-w-md object-cover rounded-2xl shadow-lg"
                />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-md px-6 py-3 text-center min-w-[200px]">
                  <EditableText contentKey="about.founder_name" as="h4" className="font-['Inter'] font-semibold text-lg text-[#2d1b4e] dark:text-white">{t('about.founder_name')}</EditableText>
                  <EditableText contentKey="about.founder_role" as="p" className="font-['Inter'] text-sm text-[#d4af37]">{t('about.founder_role')}</EditableText>
                </div>
              </div>
            </div>

            <div>
              <div className="om-badge-primary mb-6 inline-flex">
                <EditableText contentKey="about.founder_badge" as="span" className="om-text-primary text-[14px]">{t('about.founder_badge')}</EditableText>
              </div>
              <EditableText contentKey="about.founder_title" as="h2" className="om-heading-primary mb-6">
                {t('about.founder_title')}
              </EditableText>
              <EditableText contentKey="about.founder_p1" as="p" className="font-['Inter'] text-lg text-[#4a5565] dark:text-gray-400 leading-relaxed mb-6">
                {t('about.founder_p1')}
              </EditableText>
              <EditableText contentKey="about.founder_p2" as="p" className="font-['Inter'] text-lg text-[#4a5565] dark:text-gray-400 leading-relaxed">
                {t('about.founder_p2')}
              </EditableText>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        title={t('about.cta_title')}
        subtitle={t('about.cta_subtitle')}
        editKeyPrefix="about.cta"
      >
        <Link
          to={PUBLIC_ROUTES.CONTACT}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#d4af37] text-[#2d1b4e] rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-[#c29d2f] transition-colors no-underline"
        >
          <EditableText contentKey="about.cta_button" as="span">{t('about.cta_button')}</EditableText>
          <ArrowRight size={20} />
        </Link>
        <Link
          to={PUBLIC_ROUTES.TOUR}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg font-['Inter'] font-medium text-[16px] hover:bg-white/20 transition-colors no-underline"
        >
          <EditableText contentKey="about.cta_tour" as="span">{t('about.cta_tour')}</EditableText>
        </Link>
      </CTASection>

      <ScrollToTop />
    </PageContainer>
  );
};

export default About;
