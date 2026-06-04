import FAQ from '@/components/frontend-pages/homepage/faq';
import { HeroSection, CTASection } from '@/components/frontend-pages/shared/sections';
import ScrollToTop from '@/components/frontend-pages/shared/scroll-to-top';
import PublicSeo from '@/components/seo/PublicSeo';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { useLanguage } from '@/context/LanguageContext';
import { Link } from 'react-router-dom';

const Faq = () => {
  const { t } = useLanguage();

  return (
    <>
      <PublicSeo
        title="Frequently Asked Questions"
        description="Answers to common questions about Orthodox Metrics — onboarding, sacramental records, OCR digitization, security, pricing, and more."
        path="/faq"
      />

      <HeroSection
        badge={t('faq.hero_badge')}
        title={t('faq.page_title')}
        subtitle={t('faq.page_subtitle')}
        editKeyPrefix="faq.hero"
      />

      <section className="py-12 om-section-base">
        <FAQ />
      </section>

      <CTASection title={t('faq.cta_title')} subtitle={t('faq.cta_subtitle')}>
        <Link to={PUBLIC_ROUTES.ENROLL} className="om-btn-accent">
          {t('common.enroll_parish')}
        </Link>
        <Link to={PUBLIC_ROUTES.CONTACT} className="om-btn-secondary">
          {t('common.contact_us')}
        </Link>
      </CTASection>

      <ScrollToTop />
    </>
  );
};

export default Faq;
