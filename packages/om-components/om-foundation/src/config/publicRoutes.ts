/**
 * Canonical public route paths for the Orthodox Metrics public site.
 *
 * Every nav link, footer link, CTA button, and internal <Link> in public pages
 * should reference these constants instead of hardcoding paths.
 *
 * Navigation labels are resolved via LanguageProvider: t(link.tKey)
 */

export const PUBLIC_ROUTES = {
  HOME: '/frontend-pages/homepage',
  ABOUT: '/frontend-pages/about',
  PRICING: '/frontend-pages/pricing',
  SAMPLES: '/samples',
  SAMPLES_EXPLORER: '/samples/explorer',
  TOUR: '/tour',
  BLOG: '/frontend-pages/blog',
  CONTACT: '/frontend-pages/contact',
  FAQ: '/frontend-pages/faq',
  LOGIN: '/auth/login',
} as const;

/** Navigation links shown in the public header and mobile sidebar. */
export const PUBLIC_NAV_LINKS = [
  { tKey: 'nav.home', to: PUBLIC_ROUTES.HOME },
  { tKey: 'nav.about', to: PUBLIC_ROUTES.ABOUT },
  { tKey: 'nav.tour', to: PUBLIC_ROUTES.TOUR },
  { tKey: 'nav.samples', to: PUBLIC_ROUTES.SAMPLES },
  { tKey: 'nav.pricing', to: PUBLIC_ROUTES.PRICING },
  { tKey: 'nav.blog', to: PUBLIC_ROUTES.BLOG },
  { tKey: 'nav.contact', to: PUBLIC_ROUTES.CONTACT },
] as const;

/** Footer link groups — labels resolved via t(link.tKey). */
export const FOOTER_LINKS = {
  product: [
    { tKey: 'footer.platform_tour', to: PUBLIC_ROUTES.TOUR },
    { tKey: 'footer.sample_records', to: PUBLIC_ROUTES.SAMPLES },
    { tKey: 'footer.pricing', to: PUBLIC_ROUTES.PRICING },
  ],
  company: [
    { tKey: 'footer.about_us', to: PUBLIC_ROUTES.ABOUT },
    { tKey: 'footer.blog', to: PUBLIC_ROUTES.BLOG },
    { tKey: 'footer.contact', to: PUBLIC_ROUTES.CONTACT },
  ],
} as const;
