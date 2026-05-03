import { Link } from 'react-router-dom';
import { Check, HelpCircle } from '@/ui/icons';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { HeroSection, CTASection } from '@/components/frontend-pages/shared/sections';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import { useLanguage } from '@/context/LanguageContext';

// Pricing temporarily hidden by request (2026-05-03). The plan tier
// + features still ship; just the dollar amounts and billing notes
// are masked so visitors are routed to Contact for a quote. Flip
// back to false to restore the published prices in one place.
const HIDE_PRICES = true;

const PagePricing = () => {
  const { t } = useLanguage();

  // Feature key arrays — stable identifiers, only display labels translate
  const SMALL_FEAT_KEYS = [1, 2, 3, 4, 5, 6] as const;
  const MEDIUM_FEAT_KEYS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
  const LARGE_FEAT_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

  // Comparison rows: feature key index, plus cell keys (null = use English default from key)
  const COMPARISON_ROWS = [
    { idx: 1, small: t('pricing.compare_row1_small'), medium: t('pricing.compare_row1_medium'), large: t('pricing.compare_row1_large') },
    { idx: 2, small: '2', medium: '5', large: t('pricing.compare_row2_large') },
    { idx: 3, small: '5 GB', medium: '25 GB', large: '100 GB' },
    { idx: 4, small: t('pricing.compare_row4_small'), medium: t('pricing.compare_row4_medium'), large: t('pricing.compare_row4_large') },
    { idx: 5, small: '—', medium: '—', large: '✓' },
    { idx: 6, small: '—', medium: '—', large: '✓' },
    { idx: 7, small: '—', medium: '—', large: '✓' },
  ];

  return (
    <>
      {/* Hero */}
      <HeroSection
        badge={t('pricing.hero_badge')}
        title={t('pricing.hero_title')}
        subtitle={t('pricing.hero_subtitle')}
        editKeyPrefix="pricing.hero"
      />

      {/* Pricing Cards */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* Small Parish */}
            <PricingCard
              name={t('pricing.plan_small_name')}
              description={t('pricing.plan_small_desc')}
              price={t('pricing.plan_small_price')}
              perMonth={t('pricing.per_month')}
              billingNote={t('pricing.plan_small_billing')}
              features={SMALL_FEAT_KEYS.map((i) => t(`pricing.plan_small_feat${i}`))}
              btnLabel={t('pricing.btn_get_started')}
            />

            {/* Medium Parish — Featured */}
            <div className="bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] dark:from-[#d4af37] dark:to-[#c29d2f] text-white dark:text-[#2d1b4e] rounded-2xl p-8 relative shadow-xl transform md:scale-105">
              <div className="absolute top-0 right-8 -translate-y-1/2">
                <span className="bg-[#d4af37] dark:bg-[#2d1b4e] text-[#2d1b4e] dark:text-[#d4af37] px-4 py-1.5 rounded-full font-['Inter'] text-[13px] font-medium whitespace-nowrap">
                  {t('pricing.badge_popular')}
                </span>
              </div>
              <div className="mb-6">
                <h3 className="font-['Inter'] font-medium text-2xl mb-2">{t('pricing.plan_medium_name')}</h3>
                <p className="font-['Inter'] text-[15px] text-[rgba(255,255,255,0.8)] dark:text-[rgba(45,27,78,0.8)]">
                  {t('pricing.plan_medium_desc')}
                </p>
              </div>
              <div className="mb-6">
                {HIDE_PRICES ? (
                  <p className="font-['Georgia'] text-3xl">Contact for Pricing</p>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="font-['Georgia'] text-5xl">{t('pricing.plan_medium_price')}</span>
                      <span className="font-['Inter'] text-[16px] text-[rgba(255,255,255,0.8)] dark:text-[rgba(45,27,78,0.8)]">{t('pricing.per_month')}</span>
                    </div>
                    <p className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.8)] dark:text-[rgba(45,27,78,0.8)] mt-2">
                      {t('pricing.plan_medium_billing')}
                    </p>
                  </>
                )}
              </div>
              <ul className="space-y-4 mb-8">
                {MEDIUM_FEAT_KEYS.map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="text-[#d4af37] dark:text-[#2d1b4e] flex-shrink-0 mt-0.5" size={20} />
                    <span className="font-['Inter'] text-[15px]">{t(`pricing.plan_medium_feat${i}`)}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={PUBLIC_ROUTES.CONTACT}
                className="block w-full text-center px-6 py-3 bg-[#d4af37] dark:bg-[#2d1b4e] text-[#2d1b4e] dark:text-white rounded-lg font-['Inter'] font-medium hover:bg-[#c29d2f] dark:hover:bg-[#1f1236] transition-colors"
              >
                {t('pricing.btn_get_started')}
              </Link>
            </div>

            {/* Large Parish */}
            <PricingCard
              name={t('pricing.plan_large_name')}
              description={t('pricing.plan_large_desc')}
              price={t('pricing.plan_large_price')}
              perMonth={t('pricing.per_month')}
              billingNote={t('pricing.plan_large_billing')}
              features={LARGE_FEAT_KEYS.map((i) => t(`pricing.plan_large_feat${i}`))}
              btnLabel={t('pricing.btn_get_started')}
            />
          </div>

          {/* Enterprise */}
          <div className="bg-[#f9fafb] dark:bg-gray-800 border border-[#e5e7eb] dark:border-gray-700 rounded-2xl p-12 text-center">
            <EditableText contentKey="pricing.enterprise.title" as="h3" className="font-['Georgia'] text-3xl text-[#2d1b4e] dark:text-white mb-4">
              {t('pricing.enterprise_title')}
            </EditableText>
            <EditableText contentKey="pricing.enterprise.desc" as="p" className="font-['Inter'] text-lg text-[#4a5565] dark:text-gray-400 mb-6 max-w-2xl mx-auto" multiline>
              {t('pricing.enterprise_desc')}
            </EditableText>
            <Link to={PUBLIC_ROUTES.CONTACT} className="om-btn-primary">{t('pricing.btn_contact_sales')}</Link>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20 om-section-elevated">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <EditableText contentKey="pricing.compare.title" as="h2" className="font-['Georgia'] text-4xl text-[#2d1b4e] dark:text-white mb-4">{t('pricing.compare_title')}</EditableText>
            <EditableText contentKey="pricing.compare.subtitle" as="p" className="font-['Inter'] text-lg text-[#4a5565] dark:text-gray-400">{t('pricing.compare_subtitle')}</EditableText>
          </div>
          <div className="om-table-container">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="om-table-header">
                    <th className="text-left om-table-cell-header">{t('pricing.compare_header_feature')}</th>
                    <th className="om-table-cell-header">{t('pricing.compare_header_small')}</th>
                    <th className="om-table-cell-header">{t('pricing.compare_header_medium')}</th>
                    <th className="om-table-cell-header">{t('pricing.compare_header_large')}</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.idx} className="om-table-row">
                      <td className="p-6 font-['Inter'] text-[15px] text-[#2d1b4e] dark:text-white">{t(`pricing.compare_row${row.idx}_feature`)}</td>
                      <td className="om-table-cell text-center">{row.small}</td>
                      <td className="om-table-cell text-center">{row.medium}</td>
                      <td className="om-table-cell text-center">{row.large}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 om-section-base">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <EditableText contentKey="pricing.faq.title" as="h2" className="font-['Georgia'] text-4xl text-[#2d1b4e] dark:text-white mb-4">{t('pricing.faq_title')}</EditableText>
          </div>
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="bg-[#f9fafb] dark:bg-gray-800 rounded-xl p-6 border border-[#f3f4f6] dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <HelpCircle className="text-[#d4af37] flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-['Inter'] font-medium text-lg text-[#2d1b4e] dark:text-white mb-2">{t(`pricing.faq${idx}_q`)}</h3>
                    <p className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">{t(`pricing.faq${idx}_a`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection title={t('pricing.cta_title')} subtitle={t('pricing.cta_subtitle')} editKeyPrefix="pricing.cta">
        <Link to={PUBLIC_ROUTES.CONTACT} className="om-btn-accent">{t('pricing.btn_start_trial')}</Link>
      </CTASection>
    </>
  );
};

export default PagePricing;

// ── Local sub-components ──

function PricingCard({ name, description, price, perMonth, billingNote, features, btnLabel }: {
  name: string; description: string; price: string; perMonth: string; billingNote: string; features: string[]; btnLabel: string;
}) {
  return (
    <div className="om-card p-8 hover:shadow-lg">
      <div className="mb-6">
        <h3 className="font-['Inter'] font-medium text-2xl text-[#2d1b4e] dark:text-white mb-2">{name}</h3>
        <p className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400">{description}</p>
      </div>
      <div className="mb-6">
        {HIDE_PRICES ? (
          <p className="font-['Georgia'] text-3xl text-[#2d1b4e] dark:text-white">Contact for Pricing</p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="font-['Georgia'] text-5xl text-[#2d1b4e] dark:text-white">{price}</span>
              <span className="font-['Inter'] text-[16px] text-[#4a5565] dark:text-gray-400">{perMonth}</span>
            </div>
            <p className="font-['Inter'] text-[14px] text-[#4a5565] dark:text-gray-400 mt-2">{billingNote}</p>
          </>
        )}
      </div>
      <ul className="space-y-4 mb-8">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check className="text-[#d4af37] flex-shrink-0 mt-0.5" size={20} />
            <span className="font-['Inter'] text-[15px] text-[#4a5565] dark:text-gray-400">{f}</span>
          </li>
        ))}
      </ul>
      <Link
        to={PUBLIC_ROUTES.CONTACT}
        className="block w-full text-center px-6 py-3 om-btn-outline"
      >
        {btnLabel}
      </Link>
    </div>
  );
}
