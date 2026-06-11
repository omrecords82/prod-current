import { FOOTER_LINKS, PUBLIC_ROUTES } from '@/config/publicRoutes';
import { useLanguage } from '@/context/LanguageContext';
import { Link } from 'react-router-dom';

const SiteFooter = () => {
  const { t } = useLanguage();
  const copyrightText = t('footer.copyright').replace('{year}', String(new Date().getFullYear()));

  return (
    <footer className="om-public-footer relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-center bg-no-repeat bg-cover opacity-[0.06] dark:opacity-[0.08]"
        style={{ backgroundImage: "url('/images/footer/om-brand-watermark.png')" }}
        aria-hidden
      />
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-8">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Link
              to={PUBLIC_ROUTES.HOME}
              className="no-underline inline-block mb-4"
              aria-label="Orthodox Metrics LLC"
            >
              <span
                className="font-om-display text-[1.35rem] leading-tight tracking-[0.02em] block"
                style={{ fontWeight: 400 }}
              >
                Orthodox Metrics
                <span className="text-[#d4af37] font-om-body text-[0.7rem] uppercase tracking-[0.22em] ml-1.5 align-middle">
                  LLC
                </span>
              </span>
            </Link>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-om-body font-medium text-[16px] mb-4">{t('footer.heading_product')}</h3>
            <ul className="space-y-3 list-none p-0 m-0">
              {FOOTER_LINKS.product.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="font-om-body text-[14px] om-public-text-muted hover:opacity-100 transition-colors no-underline"
                  >
                    {t(link.tKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-om-body font-medium text-[16px] mb-4">{t('footer.heading_company')}</h3>
            <ul className="space-y-3 list-none p-0 m-0">
              {FOOTER_LINKS.company.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="font-om-body text-[14px] om-public-text-muted hover:opacity-100 transition-colors no-underline"
                  >
                    {t(link.tKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-om-body font-medium text-[16px] mb-4">{t('footer.heading_legal')}</h3>
            <ul className="space-y-3 list-none p-0 m-0">
              {FOOTER_LINKS.legal.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="font-om-body text-[14px] om-public-text-muted hover:opacity-100 transition-colors no-underline"
                  >
                    {t(link.tKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-om-body font-medium text-[16px] mb-4">{t('footer.heading_support')}</h3>
            <ul className="space-y-3 list-none p-0 m-0">
              {FOOTER_LINKS.support.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="font-om-body text-[14px] om-public-text-muted hover:opacity-100 transition-colors no-underline"
                  >
                    {t(link.tKey)}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="mailto:support@orthodoxmetrics.com"
                  className="font-om-body text-[14px] om-public-text-muted hover:opacity-100 transition-colors no-underline"
                >
                  support@orthodoxmetrics.com
                </a>
              </li>
              <li>
                <span className="font-om-body text-[14px] om-public-text-muted">
                  {t('footer.hours')}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--om-public-panel-border)] mt-6 pt-4">
          <p className="font-om-body text-[14px] om-public-text-muted text-center">
            {copyrightText}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
