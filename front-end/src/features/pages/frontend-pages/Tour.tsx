import { Link } from 'react-router-dom';
import { Shield, Users, FileText, Calendar } from '@/ui/icons';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { CTASection } from '@/components/frontend-pages/shared/sections';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import { TourInteractiveDemo } from '@/components/frontend-pages/tour';
import PublicSeo from '@/components/seo/PublicSeo';
import { useLanguage } from '@/context/LanguageContext';

const Tour = () => {
  const { t } = useLanguage();

  return (
    <>
      <PublicSeo
        title="Platform Tour"
        description="Walk through Orthodox Metrics: parish dashboards, sacramental records, OCR digitization, and church administration in one secure platform."
        path="/tour"
      />
      {/* Interactive Demo */}
      <TourInteractiveDemo />

      {/* Additional Features */}
      <section className="py-24 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <EditableText contentKey="tour.extras.title" as="h2" className="om-heading-primary mb-4">{t('tour.extras_title')}</EditableText>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {EXTRA_FEATURES.map((f, i) => {
              const idx = i + 1;
              return (
                <div key={idx} className="text-center">
                  <div className="w-16 h-16 bg-[#2d1b4e] dark:bg-[#d4af37] rounded-xl flex items-center justify-center mx-auto mb-4">
                    {f.icon}
                  </div>
                  <h3 className="font-['Inter'] font-medium text-lg text-[#2d1b4e] dark:text-white mb-2">{t(`tour.extra${idx}_title`)}</h3>
                  <p className="font-['Inter'] text-[14px] text-[#4a5565] dark:text-gray-400 leading-relaxed">{t(`tour.extra${idx}_desc`)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection title={t('tour.cta_title')} subtitle={t('tour.cta_subtitle')} editKeyPrefix="tour.cta">
        <Link to={PUBLIC_ROUTES.CONTACT} className="om-btn-accent">{t('tour.cta_button')}</Link>
      </CTASection>
    </>
  );
};

export default Tour;

// ── Static data (icons only — text comes from translations) ──

const EXTRA_FEATURES: { icon: React.ReactNode }[] = [
  { icon: <Shield className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} /> },
  { icon: <Users className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} /> },
  { icon: <FileText className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} /> },
  { icon: <Calendar className="text-[#d4af37] dark:text-[#2d1b4e]" size={32} /> },
];
