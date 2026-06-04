/**
 * Canonical public route paths for the Orthodox Metrics public site.
 *
 * Every nav link, footer link, CTA button, and internal <Link> in public pages
 * should reference these constants instead of hardcoding paths.
 *
 * Navigation labels are resolved via LanguageProvider: t(link.tKey)
 */

export const PUBLIC_ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  PRICING: '/pricing',
  SAMPLES: '/samples',
  SAMPLES_EXPLORER: '/samples/explorer',
  TOUR: '/tour',
  BLOG: '/blog',
  CONTACT: '/contact',
  ENROLL: '/enroll',
  FAQ: '/faq',
  LOGIN: '/auth/login',
  PRIVACY: '/privacy',
  TERMS: '/terms',
  SECURITY: '/security',
} as const;

/** Pathname aliases that should highlight the same nav item as the canonical route. */
export const PUBLIC_ROUTE_ACTIVE_ALIASES: Partial<Record<string, readonly string[]>> = {
  [PUBLIC_ROUTES.HOME]: ['/', '/frontend-pages/homepage'],
  [PUBLIC_ROUTES.ABOUT]: ['/about', '/frontend-pages/about'],
  [PUBLIC_ROUTES.PRICING]: ['/pricing', '/frontend-pages/pricing'],
  [PUBLIC_ROUTES.CONTACT]: ['/contact', '/frontend-pages/contact'],
  [PUBLIC_ROUTES.SAMPLES]: ['/samples', '/frontend-pages/samples', '/sample-records'],
  [PUBLIC_ROUTES.TOUR]: ['/tour', '/platform-tour'],
  [PUBLIC_ROUTES.FAQ]: ['/faq', '/frontend-pages/faq', '/pages/faq'],
  [PUBLIC_ROUTES.ENROLL]: ['/enroll', '/frontend-pages/enroll'],
  [PUBLIC_ROUTES.BLOG]: ['/blog', '/frontend-pages/blog'],
};

/** Whether a nav link should show the active state for the current pathname. */
export function isPublicNavActive(pathname: string, to: string): boolean {
  const aliases = PUBLIC_ROUTE_ACTIVE_ALIASES[to as keyof typeof PUBLIC_ROUTE_ACTIVE_ALIASES];
  if (aliases) return aliases.includes(pathname);
  return pathname === to;
}

/** Navigation links shown in the public header and mobile sidebar. */
export const PUBLIC_NAV_LINKS = [
  { tKey: 'nav.home', to: PUBLIC_ROUTES.HOME },
  { tKey: 'nav.tour', to: PUBLIC_ROUTES.TOUR },
  { tKey: 'nav.samples', to: PUBLIC_ROUTES.SAMPLES },
  { tKey: 'nav.about', to: PUBLIC_ROUTES.ABOUT },
  { tKey: 'nav.pricing', to: PUBLIC_ROUTES.PRICING },
  { tKey: 'nav.contact', to: PUBLIC_ROUTES.CONTACT },
] as const;

/** Footer link groups — labels resolved via t(link.tKey). */
export const FOOTER_LINKS = {
  product: [
    { tKey: 'footer.platform_tour', to: PUBLIC_ROUTES.TOUR },
    { tKey: 'footer.sample_records', to: PUBLIC_ROUTES.SAMPLES },
    { tKey: 'footer.enroll_parish', to: PUBLIC_ROUTES.ENROLL },
    { tKey: 'footer.pricing', to: PUBLIC_ROUTES.PRICING },
  ],
  company: [
    { tKey: 'footer.about_us', to: PUBLIC_ROUTES.ABOUT },
    { tKey: 'footer.blog', to: PUBLIC_ROUTES.BLOG },
    { tKey: 'footer.contact', to: PUBLIC_ROUTES.CONTACT },
  ],
  legal: [
    { tKey: 'footer.privacy', to: PUBLIC_ROUTES.PRIVACY },
    { tKey: 'footer.terms', to: PUBLIC_ROUTES.TERMS },
    { tKey: 'footer.security', to: PUBLIC_ROUTES.SECURITY },
  ],
  support: [
    { tKey: 'footer.faq', to: PUBLIC_ROUTES.FAQ },
  ],
} as const;
