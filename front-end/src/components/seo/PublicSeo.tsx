import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Orthodox Metrics';
const SITE_ORIGIN = 'https://orthodoxmetrics.com';
const DEFAULT_OG = `${SITE_ORIGIN}/og/orthodoxmetrics-og-cover.png`;

type Props = {
  /** Page-specific title — wrapped as "<title> · Orthodox Metrics" unless `bare` is set. */
  title: string;
  /** Meta description for SERP + social cards. Keep ≤ 160 chars. */
  description: string;
  /** Path on the site (e.g. "/frontend-pages/pricing"). Built into canonical + og:url. */
  path: string;
  /** Custom OG/Twitter image. Defaults to the site-wide cover. */
  image?: string;
  /** Override og:type (default: "website"). Use "article" for blog posts. */
  type?: 'website' | 'article';
  /** When true, mark the page noindex (auth flows, debug pages, etc.). */
  noindex?: boolean;
  /** When true, render the title verbatim (no " · Orthodox Metrics" suffix). */
  bare?: boolean;
};

/**
 * Per-page SEO + social metadata. Drop into any public marketing page:
 *
 *   <PublicSeo
 *     title="Pricing"
 *     description="Plan tiers for parishes of every size."
 *     path="/frontend-pages/pricing"
 *   />
 *
 * Index.html ships sensible site-wide defaults; this overrides only what the
 * page cares about. We rely on react-helmet-async (already a dep) which
 * dedupes tags — last one wins, so per-page tags beat the static defaults.
 */
export default function PublicSeo({
  title,
  description,
  path,
  image = DEFAULT_OG,
  type = 'website',
  noindex = false,
  bare = false,
}: Props) {
  const fullTitle = bare ? title : `${title} · ${SITE_NAME}`;
  const url = `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
  return (
    <Helmet prioritizeSeoTags>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
