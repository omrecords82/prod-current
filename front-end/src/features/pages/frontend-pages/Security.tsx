import { HeroSection } from '@/components/frontend-pages/shared/sections';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import PageContainer from '@/shared/ui/PageContainer';
import PublicSeo from '@/components/seo/PublicSeo';
import { useLanguage } from '@/context/LanguageContext';

const Security = () => {
  const { t } = useLanguage();

  return (
    <PageContainer title="Security" description="Orthodox Metrics security and trust">
      <PublicSeo
        title="Security"
        description="How Orthodox Metrics secures parish data — encrypted storage, role-based access, multi-tenant isolation, and operational practices."
        path="/security"
      />
      <HeroSection
        badge={t('security.hero_badge')}
        title={t('security.hero_title')}
        subtitle={t('security.hero_subtitle')}
        editKeyPrefix="security.hero"
      />

      <section className="py-20 om-section-base">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-8">
            <EditableText contentKey="security.draft_notice" as="p" className="font-['Inter'] text-[15px] text-amber-900 dark:text-amber-200 leading-relaxed" multiline>
              {t('security.draft_notice')}
            </EditableText>
          </div>

          <EditableText contentKey="security.body_p1" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed mb-4" multiline>
            {t('security.body_p1')}
          </EditableText>
          <EditableText contentKey="security.body_p2" as="p" className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed mb-4" multiline>
            {t('security.body_p2')}
          </EditableText>

          <p className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400 leading-relaxed mt-8">
            {t('security.contact_prefix')}{' '}
            <a href="mailto:security@orthodoxmetrics.com" className="text-[#2d1b4e] dark:text-[#d4af37] font-medium no-underline hover:underline">
              security@orthodoxmetrics.com
            </a>
            .
          </p>
        </div>
      </section>
    </PageContainer>
  );
};

export default Security;
