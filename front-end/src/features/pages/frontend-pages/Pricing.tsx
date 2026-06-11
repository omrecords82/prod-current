import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, HelpCircle } from '@/ui/icons';
import { PUBLIC_ROUTES } from '@/config/publicRoutes';
import { HeroSection, CTASection } from '@/components/frontend-pages/shared/sections';
import EditableText from '@/components/frontend-pages/shared/EditableText';
import PublicSeo from '@/components/seo/PublicSeo';
import JsonLd from '@/components/seo/JsonLd';
import { useLanguage } from '@/context/LanguageContext';

type PricingTier = 'small' | 'medium' | 'large';

// Pricing temporarily hidden by request (2026-05-03). The plan tier
// + features still ship; just the dollar amounts and billing notes
// are masked so visitors are routed to Contact for a quote. Flip
// back to false to restore the published prices in one place.
const HIDE_PRICES = true;

const PagePricing = () => {
  const { t } = useLanguage();
  const [focusedTier, setFocusedTier] = useState<PricingTier>('medium');

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

  const quoteOffer = (name: string, category: string) => ({
    '@type': 'Offer' as const,
    name,
    category,
    availability: 'https://schema.org/OnlineOnly',
    description: t('pricing.schema_quote_description'),
  });

  const pricedOffer = (name: string, category: string, price: string) => ({
    '@type': 'Offer' as const,
    name,
    category,
    priceCurrency: 'USD',
    price,
    priceSpecification: {
      '@type': 'PriceSpecification' as const,
      priceCurrency: 'USD',
      valueAddedTaxIncluded: false,
    },
  });

  return (
    <>
      <PublicSeo
        title="Pricing"
        description="Plan tiers for parishes of every size — small, medium, large, and enterprise. Contact us for a quote tailored to your parish."
        path="/pricing"
      />
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://orthodoxmetrics.com/' },
              { '@type': 'ListItem', position: 2, name: 'Pricing', item: 'https://orthodoxmetrics.com/pricing' },
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Orthodox Metrics',
            applicationCategory: 'BusinessApplication',
            applicationSubCategory: 'Church management / sacramental records',
            operatingSystem: 'Web (any modern browser)',
            url: 'https://orthodoxmetrics.com/pricing',
            offers: HIDE_PRICES
              ? [
                  quoteOffer(t('pricing.plan_small_name'), 'Small Parish'),
                  quoteOffer(t('pricing.plan_medium_name'), 'Medium Parish'),
                  quoteOffer(t('pricing.plan_large_name'), 'Large Parish'),
                ]
              : [
                  pricedOffer(t('pricing.plan_small_name'), 'Small Parish', t('pricing.plan_small_price').replace(/[^\d.]/g, '') || '49'),
                  pricedOffer(t('pricing.plan_medium_name'), 'Medium Parish', t('pricing.plan_medium_price').replace(/[^\d.]/g, '') || '99'),
                  pricedOffer(t('pricing.plan_large_name'), 'Large Parish', t('pricing.plan_large_price').replace(/[^\d.]/g, '') || '199'),
                ],
          },
        ]}
      />
      {/* Hero */}
      <HeroSection
        badge={t('pricing.hero_badge')}
        title={t('pricing.hero_title')}
        subtitle={t('pricing.hero_subtitle')}
        editKeyPrefix="pricing.hero"
      />

      {HIDE_PRICES && (
        <section className="py-6 om-section-base border-b border-[rgba(45,27,78,0.08)] dark:border-white/10">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="font-om-body text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">
              {t('pricing.quote_only_notice')}
            </p>
          </div>
        </section>
      )}

      {/* Pricing Cards */}
      <section className="py-20 om-section-base">
        <div className="max-w-7xl mx-auto px-6">
          <div
            className="grid md:grid-cols-3 gap-8 mb-16 items-stretch"
            onMouseLeave={() => setFocusedTier('medium')}
          >
            <PricingCard
              tier="small"
              featured={focusedTier === 'small'}
              onFocus={() => setFocusedTier('small')}
              name={t('pricing.plan_small_name')}
              description={t('pricing.plan_small_desc')}
              price={t('pricing.plan_small_price')}
              perMonth={t('pricing.per_month')}
              billingNote={t('pricing.plan_small_billing')}
              features={SMALL_FEAT_KEYS.map((i) => t(`pricing.plan_small_feat${i}`))}
              btnLabel={HIDE_PRICES ? t('pricing.btn_request_quote') : t('pricing.btn_get_started')}
            />
            <PricingCard
              tier="medium"
              featured={focusedTier === 'medium'}
              showPopularBadge
              onFocus={() => setFocusedTier('medium')}
              name={t('pricing.plan_medium_name')}
              description={t('pricing.plan_medium_desc')}
              price={t('pricing.plan_medium_price')}
              perMonth={t('pricing.per_month')}
              billingNote={t('pricing.plan_medium_billing')}
              features={MEDIUM_FEAT_KEYS.map((i) => t(`pricing.plan_medium_feat${i}`))}
              btnLabel={HIDE_PRICES ? t('pricing.btn_request_quote') : t('pricing.btn_get_started')}
            />
            <PricingCard
              tier="large"
              featured={focusedTier === 'large'}
              onFocus={() => setFocusedTier('large')}
              name={t('pricing.plan_large_name')}
              description={t('pricing.plan_large_desc')}
              price={t('pricing.plan_large_price')}
              perMonth={t('pricing.per_month')}
              billingNote={t('pricing.plan_large_billing')}
              features={LARGE_FEAT_KEYS.map((i) => t(`pricing.plan_large_feat${i}`))}
              btnLabel={HIDE_PRICES ? t('pricing.btn_request_quote') : t('pricing.btn_get_started')}
            />
          </div>

          {/* Enterprise */}
          <div className="om-public-panel rounded-2xl p-12 text-center">
            <EditableText contentKey="pricing.enterprise.title" as="h3" className="font-om-display text-3xl text-[#2d1b4e] dark:text-white mb-4">
              {t('pricing.enterprise_title')}
            </EditableText>
            <EditableText contentKey="pricing.enterprise.desc" as="p" className="font-om-body text-lg text-[#4a5565] dark:text-gray-400 mb-6 max-w-2xl mx-auto" multiline>
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
            <EditableText contentKey="pricing.compare.title" as="h2" className="font-om-display text-4xl text-[#2d1b4e] dark:text-white mb-4">{t('pricing.compare_title')}</EditableText>
            <EditableText contentKey="pricing.compare.subtitle" as="p" className="font-om-body text-lg text-[#4a5565] dark:text-gray-400">{t('pricing.compare_subtitle')}</EditableText>
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
                      <td className="p-6 font-om-body text-[15px] text-[#2d1b4e] dark:text-white">{t(`pricing.compare_row${row.idx}_feature`)}</td>
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
            <EditableText contentKey="pricing.faq.title" as="h2" className="font-om-display text-4xl text-[#2d1b4e] dark:text-white mb-4">{t('pricing.faq_title')}</EditableText>
          </div>
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="om-public-panel rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <HelpCircle className="text-[#d4af37] flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-om-body font-medium text-lg text-[#2d1b4e] dark:text-white mb-2">{t(`pricing.faq${idx}_q`)}</h3>
                    <p className="font-om-body text-[15px] text-[#4a5565] dark:text-gray-400 leading-relaxed">{t(`pricing.faq${idx}_a`)}</p>
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

function PricingCard({
  tier,
  featured,
  showPopularBadge,
  onFocus,
  name,
  description,
  price,
  perMonth,
  billingNote,
  features,
  btnLabel,
}: {
  tier: PricingTier;
  featured: boolean;
  showPopularBadge?: boolean;
  onFocus: () => void;
  name: string;
  description: string;
  price: string;
  perMonth: string;
  billingNote: string;
  features: string[];
  btnLabel: string;
}) {
  const { t } = useLanguage();

  return (
    <div
      className={`
        relative rounded-2xl p-8 flex flex-col transition-all duration-300 ease-out
        ${featured
          ? 'bg-gradient-to-br from-[#2d1b4e] to-[#4a2f74] dark:from-[#24154a] dark:to-[#1a1038] shadow-xl md:scale-[1.03] z-10'
          : 'om-card hover:shadow-lg md:scale-100 z-0'}
      `}
      onMouseEnter={onFocus}
      onFocus={onFocus}
      tabIndex={0}
      role="article"
      aria-label={name}
      data-tier={tier}
    >
      {showPopularBadge && featured && (
        <div className="absolute top-0 right-8 -translate-y-1/2">
          <span className="bg-[var(--om-gold)] text-[var(--om-text-primary)] px-4 py-1.5 rounded-full font-om-body text-[13px] font-semibold whitespace-nowrap shadow-sm">
            {t('pricing.badge_popular')}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3
          className={`font-om-display font-semibold text-2xl mb-2 ${
            featured ? '!text-white' : 'text-[var(--om-text-primary)]'
          }`}
        >
          {name}
        </h3>
        <p
          className={`font-om-body text-[15px] leading-relaxed ${
            featured ? 'text-white/80' : 'text-[var(--om-text-secondary)]'
          }`}
        >
          {description}
        </p>
      </div>

      <div className="mb-6">
        {HIDE_PRICES ? (
          <p className={`font-om-display text-3xl ${featured ? '!text-white' : 'text-[var(--om-text-primary)]'}`}>
            {btnLabel}
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className={`font-om-display text-5xl ${featured ? '!text-white' : 'text-[var(--om-text-primary)]'}`}>
                {price}
              </span>
              <span className={`font-om-body text-[16px] ${featured ? 'text-white/80' : 'text-[var(--om-text-secondary)]'}`}>
                {perMonth}
              </span>
            </div>
            <p className={`font-om-body text-[14px] mt-2 ${featured ? 'text-white/80' : 'text-[var(--om-text-secondary)]'}`}>
              {billingNote}
            </p>
          </>
        )}
      </div>

      <ul className="space-y-4 mb-8 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-3">
            <Check
              className={`flex-shrink-0 mt-0.5 ${featured ? 'text-[var(--om-gold)]' : 'text-[var(--om-gold)]'}`}
              size={20}
            />
            <span className={`font-om-body text-[15px] ${featured ? 'text-white/90' : 'text-[var(--om-text-secondary)]'}`}>
              {f}
            </span>
          </li>
        ))}
      </ul>

      <Link
        to={PUBLIC_ROUTES.CONTACT}
        className={
          featured
            ? 'block w-full text-center om-ds-btn om-ds-btn-primary'
            : 'block w-full text-center om-ds-btn om-ds-btn-secondary'
        }
      >
        {btnLabel}
      </Link>
    </div>
  );
}
