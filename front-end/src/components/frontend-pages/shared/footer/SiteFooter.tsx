import { FOOTER_LINKS } from '@/config/publicRoutes';
import { useLanguage } from '@/context/LanguageContext';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const SACRAMENT_IMAGES = [
  '/images/logos/bap-small-bottom.png',
  '/images/logos/wedding-small-bottom.png',
  '/images/logos/funeral-small-bottom.png',
];

const SiteFooter = () => {
  const { t } = useLanguage();
  const copyrightText = t('footer.copyright').replace('{year}', String(new Date().getFullYear()));
  const [sacramentIdx, setSacramentIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSacramentIdx((i) => (i + 1) % SACRAMENT_IMAGES.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="bg-[#2d1b4e] dark:bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand — bottom logo with rotating sacrament image */}
          <div className="col-span-1">
            <div className="relative inline-flex items-center mb-4">
              <img
                src="/images/logos/bottom-logo.png"
                alt="Orthodox Metrics"
                className="h-20 w-auto object-contain"
              />
              <div className="relative -ml-2 h-[72px] w-[60px] flex-shrink-0">
                {SACRAMENT_IMAGES.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt="Sacrament"
                    className="absolute inset-0 h-full w-full object-contain transition-opacity duration-700"
                    style={{ opacity: i === sacramentIdx ? 1 : 0 }}
                  />
                ))}
              </div>
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
