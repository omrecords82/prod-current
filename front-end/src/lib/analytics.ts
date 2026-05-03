/**
 * Public-website analytics — provider abstraction.
 *
 * Provider is selected via `VITE_ANALYTICS_PROVIDER`:
 *
 *   none      → no-op (default; safe when no provider is configured)
 *   plausible → loads plausible.io tracker. Required: VITE_PLAUSIBLE_DOMAIN
 *               Optional: VITE_PLAUSIBLE_SCRIPT_URL (self-hosted)
 *   umami     → loads Umami tracker. Required: VITE_UMAMI_WEBSITE_ID,
 *               VITE_UMAMI_SCRIPT_URL
 *   ga4       → loads Google Analytics gtag.js. Required: VITE_GA4_MEASUREMENT_ID
 *
 * No analytics secrets are stored in this file. All identifiers come
 * from the build-time `import.meta.env`. If a provider is selected
 * but its required env var(s) are missing, we log a console warning in
 * dev and fall through to no-op.
 *
 * Pageview tracking is wired in via `useAnalyticsPageviews()` (a small
 * react-router hook) so client-side navigations register correctly on
 * SPAs.
 */

type ProviderId = 'none' | 'plausible' | 'umami' | 'ga4';

const PROVIDER: ProviderId =
  (import.meta.env.VITE_ANALYTICS_PROVIDER as ProviderId | undefined) || 'none';

const SCRIPT_ID = 'om-public-analytics';
let initialized = false;

/** True when an analytics provider is configured AND its required env vars are present. */
export function analyticsEnabled(): boolean {
  switch (PROVIDER) {
    case 'plausible':
      return Boolean(import.meta.env.VITE_PLAUSIBLE_DOMAIN);
    case 'umami':
      return Boolean(
        import.meta.env.VITE_UMAMI_WEBSITE_ID && import.meta.env.VITE_UMAMI_SCRIPT_URL,
      );
    case 'ga4':
      return Boolean(import.meta.env.VITE_GA4_MEASUREMENT_ID);
    default:
      return false;
  }
}

/** Inject the provider script tag once. Subsequent calls are no-ops. */
export function initAnalytics(): void {
  if (initialized || typeof document === 'undefined') return;
  if (!analyticsEnabled()) return;

  // Respect Do-Not-Track when set by the browser. Privacy-first defaults
  // matter for a public-records platform; if a visitor has DNT, we skip
  // attaching any provider script entirely.
  if (typeof navigator !== 'undefined' && (navigator as any).doNotTrack === '1') return;

  const head = document.head;
  if (!head) return;

  if (PROVIDER === 'plausible') {
    const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string;
    const src =
      (import.meta.env.VITE_PLAUSIBLE_SCRIPT_URL as string | undefined) ||
      'https://plausible.io/js/script.js';
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.defer = true;
    s.src = src;
    s.dataset.domain = domain;
    head.appendChild(s);
  } else if (PROVIDER === 'umami') {
    const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID as string;
    const src = import.meta.env.VITE_UMAMI_SCRIPT_URL as string;
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.defer = true;
    s.src = src;
    s.dataset.websiteId = websiteId;
    head.appendChild(s);
  } else if (PROVIDER === 'ga4') {
    const id = import.meta.env.VITE_GA4_MEASUREMENT_ID as string;
    const tag = document.createElement('script');
    tag.id = SCRIPT_ID;
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    head.appendChild(tag);
    const init = document.createElement('script');
    init.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}',{send_page_view:false});`;
    head.appendChild(init);
  }

  initialized = true;
}

/**
 * Record a pageview. Called on each route change. SPA navigation
 * doesn't trigger the provider script's automatic page-load tracker,
 * so we explicitly tell each provider when the URL changed.
 */
export function trackPageview(path: string): void {
  if (!analyticsEnabled() || !initialized) return;
  if (typeof window === 'undefined') return;

  if (PROVIDER === 'plausible') {
    const fn = (window as any).plausible as ((event: string, opts?: { u?: string }) => void) | undefined;
    if (typeof fn === 'function') fn('pageview', { u: window.location.origin + path });
  } else if (PROVIDER === 'umami') {
    const umami = (window as any).umami as { track?: (path?: string) => void } | undefined;
    if (umami && typeof umami.track === 'function') umami.track(path);
  } else if (PROVIDER === 'ga4') {
    const id = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;
    const gtag = (window as any).gtag as ((...args: unknown[]) => void) | undefined;
    if (typeof gtag === 'function' && id) {
      gtag('event', 'page_view', {
        page_path: path,
        page_location: window.location.origin + path,
      });
    }
  }
}

/** Used by the stats page to display the active configuration without exposing secrets. */
export function activeProvider(): ProviderId {
  return PROVIDER;
}
