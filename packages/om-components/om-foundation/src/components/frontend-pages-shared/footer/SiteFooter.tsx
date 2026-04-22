import { Link } from 'react-router-dom';
import { FOOTER_LINKS, PUBLIC_ROUTES } from '@/config/publicRoutes';
import { useLanguage } from '@/context/LanguageContext';

const SiteFooter = () => {
  const { t } = useLanguage();
  const copyrightText = t('footer.copyright').replace('{year}', String(new Date().getFullYear()));

  return (
    <footer className="bg-[#2d1b4e] dark:bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <svg viewBox="0 0 40 40" fill="currentColor" className="w-10 h-10 text-[#d4af37]">
                <rect x="18.75" y="0" width="2.5" height="40" rx="0.5" />
                <rect x="13" y="5" width="14" height="2.2" rx="0.5" />
                <rect x="8" y="14" width="24" height="2.5" rx="0.5" />
                <rect x="12" y="30" width="16" height="2.2" rx="0.5" transform="rotate(-20 20 31)" />
              </svg>
              <div className="w-10 h-10 bg-[#d4af37] rounded-lg flex items-center justify-center">
                <span className="text-[#2d1b4e] font-['Georgia'] text-xl">OM</span>
              </div>
              <span className="font-['Georgia'] text-lg">{t('common.brand_name')}</span>
            </div>
            <p className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.7)] leading-relaxed">
              {t('footer.tagline')}
            </p>
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

          {/* Support */}
          <div>
            <h3 className="font-['Inter'] font-medium text-[16px] mb-4">{t('footer.heading_support')}</h3>
            <ul className="space-y-3 list-none p-0 m-0">
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

        <div className="border-t border-[rgba(255,255,255,0.1)] mt-12 pt-8">
          <p className="font-['Inter'] text-[14px] text-[rgba(255,255,255,0.5)] text-center">
            {copyrightText}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
