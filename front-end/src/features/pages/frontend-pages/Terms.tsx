import { HeroSection } from '@/components/frontend-pages/shared/sections';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import PageContainer from '@/shared/ui/PageContainer';
import PublicSeo from '@/components/seo/PublicSeo';
import { useLanguage } from '@/context/LanguageContext';

const Terms = () => {
  const { t } = useLanguage();

  return (
    <PageContainer title="Terms of Service" description="Orthodox Metrics terms of service">
      <PublicSeo
        title="Terms of Service"
        description="Terms of use for Orthodox Metrics — parish accounts, records storage, and platform responsibilities."
        path="/terms"
      />
      <HeroSection
        badge={t('terms.hero_badge')}
        title={t('terms.hero_title')}
        subtitle={t('terms.hero_subtitle')}
        editKeyPrefix="terms.hero"
      />

      <section className="py-20 om-section-base">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-8">
            <EditableText contentKey="terms.draft_notice" as="p" className="font-['Inter'] text-[15px] text-amber-900 dark:text-amber-200 leading-relaxed" multiline>
              {t('terms.draft_notice')}
            </EditableText>
          </div>

          <EditableText contentKey="terms.body_p1" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed mb-4" multiline>
            {t('terms.body_p1')}
          </EditableText>
          <EditableText contentKey="terms.body_p2" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed mb-4" multiline>
            {t('terms.body_p2')}
          </EditableText>

          <p className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed mt-8">
            {t('terms.contact_prefix')}{' '}
            <a href="mailto:legal@orthodoxmetrics.com" className="text-[#2d1b4e] dark:text-[#d4af37] font-medium no-underline hover:underline">
              legal@orthodoxmetrics.com
            </a>
            .
          </p>
        </div>
      </section>
    </PageContainer>
  );
};

export default Terms;
