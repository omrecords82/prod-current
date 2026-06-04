import { FOOTER_LINKS, PUBLIC_ROUTES } from '@/config/publicRoutes';
import { useLanguage } from '@/context/LanguageContext';
import { Link } from 'react-router-dom';

const SiteFooter = () => {
  const { t } = useLanguage();
  const copyrightText = t('footer.copyright').replace('{year}', String(new Date().getFullYear()));

  return (
    <footer className="bg-[#2d1b4e] dark:bg-[#0d1117] text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Brand */}
          <div className="col-span-1">
            <a
              href={PUBLIC_ROUTES.HOME}
              className="no-underline inline-block mb-4"
              aria-label="Orthodox Metrics LLC"
            >
              <span
                className="font-['Georgia'] text-[1.35rem] leading-tight tracking-[0.02em] text-white block"
                style={{ fontWeight: 400 }}
              >
                Orthodox Metrics
                <span className="text-[#d4af37] font-['Inter'] text-[0.7rem] uppercase tracking-[0.22em] ml-1.5 align-middle">
                  LLC
                </span>
              </span>
            </a>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-['Inter'] font-medium text-[16px] mb-4">{t('footer.heading_product')}</h3>
            <ul className="space-y-3 list-none p-0 m-0">
              {FOOTER_LINKS.product.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)] hover:text-white transition-colors no-underline"
                  >
                    {t(link.tKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-['Inter'] font-medium text-[16px] mb-4">{t('footer.heading_company')}</h3>
            <ul className="space-y-3 list-none p-0 m-0">
              {FOOTER_LINKS.company.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)] hover:text-white transition-colors no-underline"
                  >
                    {t(link.tKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-['Inter'] font-medium text-[16px] mb-4">{t('footer.heading_legal')}</h3>
            <ul className="space-y-3 list-none p-0 m-0">
              {FOOTER_LINKS.legal.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)] hover:text-white transition-colors no-underline"
                  >
                    {t(link.tKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-['Inter'] font-medium text-[16px] mb-4">{t('footer.heading_support')}</h3>
            <ul className="space-y-3 list-none p-0 m-0">
              {FOOTER_LINKS.support.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)] hover:text-white transition-colors no-underline"
                  >
                    {t(link.tKey)}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="mailto:support@orthodoxmetrics.com"
                  className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)] hover:text-white transition-colors no-underline"
                >
                  support@orthodoxmetrics.com
                </a>
              </li>
              <li>
                <span className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)]">
                  {t('footer.hours')}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[rgba(255,255,255,0.1)] mt-6 pt-4">
          <p className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.5)] text-center">
            {copyrightText}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
