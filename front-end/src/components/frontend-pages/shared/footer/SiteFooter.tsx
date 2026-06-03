import { FOOTER_LINKS } from '@/config/publicRoutes';
import { useLanguage } from '@/context/LanguageContext';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const FOOTER_SACRAMENT_IMAGES = [
  { src: '/images/home/baptism-small-footer.png', delay: 3000 },
  { src: '/images/home/wedding-small-footer.png', delay: 4000 },
  { src: '/images/home/funeral-small-footer.png', delay: 5000 },
];

const SiteFooter = () => {
  const { t } = useLanguage();
  const copyrightText = t('footer.copyright').replace('{year}', String(new Date().getFullYear()));

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % FOOTER_SACRAMENT_IMAGES.length);
    }, FOOTER_SACRAMENT_IMAGES[activeIndex].delay);
    return () => clearTimeout(timer);
  }, [activeIndex]);

  return (
    <footer className="bg-[#2d1b4e] dark:bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Brand — SVG logo with sacrament images */}
          <div className="col-span-1">
            <div className="inline-flex items-center gap-3 mb-4">
              <img
                src="/images/logos/logo-top-dark.svg"
                alt="Orthodox Metrics"
                className="h-10 w-auto object-contain"
              />
              <img
                src={FOOTER_SACRAMENT_IMAGES[activeIndex].src}
                alt="Sacrament"
                className="h-16 w-auto object-contain transition-opacity duration-500"
              />
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
