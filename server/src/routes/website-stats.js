/**
 * /api/admin/website-stats — backend proxy for the admin stats page.
 *
 * Reads provider credentials from process.env at request time and
 * forwards to either Plausible or Umami's HTTP API. If credentials
 * aren't configured, returns 503 with a structured payload telling
 * the frontend to render its "configuration needed" empty state.
 *
 * Provider selection is driven by env:
 *
 *   ANALYTICS_PROVIDER       = "plausible" | "umami" | "none" (default)
 *   PLAUSIBLE_SITE_ID        = "orthodoxmetrics.com"   (the site, not a key)
 *   PLAUSIBLE_API_KEY        = "<token from plausible.io/settings>"
 *   PLAUSIBLE_API_URL        = "https://plausible.io/api/v1"  (default)
 *   UMAMI_API_URL            = "https://your-umami.example/api"
 *   UMAMI_API_TOKEN          = "<umami API token>"
 *   UMAMI_WEBSITE_ID         = "<umami website uuid>"
 *
 * No fake data is returned. If the upstream provider errors, we forward
 * the failure with a redacted message so the admin page can show the
 * issue without leaking provider internals.
 */

const express = require('express');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Period mapping → provider-specific period strings.
const PLAUSIBLE_PERIODS = {
  '24h': 'day',
  '7d': '7d',
  '30d': '30d',
  '12mo': '12mo',
};

const UMAMI_PERIOD_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '12mo': 365 * 24 * 60 * 60 * 1000,
};

function pickProvider() {
  const p = (process.env.ANALYTICS_PROVIDER || 'none').toLowerCase();
  return ['plausible', 'umami'].includes(p) ? p : 'none';
}

function configMissing(provider) {
  if (provider === 'plausible') {
    return !process.env.PLAUSIBLE_SITE_ID || !process.env.PLAUSIBLE_API_KEY;
  }
  if (provider === 'umami') {
    return (
      !process.env.UMAMI_API_URL ||
      !process.env.UMAMI_API_TOKEN ||
      !process.env.UMAMI_WEBSITE_ID
    );
  }
  return true;
}

async function fetchPlausible(period) {
  const base = process.env.PLAUSIBLE_API_URL || 'https://plausible.io/api/v1';
  const site = encodeURIComponent(process.env.PLAUSIBLE_SITE_ID);
  const key = process.env.PLAUSIBLE_API_KEY;
  const headers = { Authorization: `Bearer ${key}` };

  const aggUrl = `${base}/stats/aggregate?site_id=${site}&period=${period}&metrics=visitors,pageviews,bounce_rate,visit_duration`;
  const topPagesUrl = `${base}/stats/breakdown?site_id=${site}&period=${period}&property=event:page&limit=10`;
  const topRefsUrl = `${base}/stats/breakdown?site_id=${site}&period=${period}&property=visit:source&limit=10`;

  const [aggRes, pagesRes, refsRes] = await Promise.all([
    fetch(aggUrl, { headers }),
    fetch(topPagesUrl, { headers }),
    fetch(topRefsUrl, { headers }),
  ]);

  if (!aggRes.ok) throw new Error(`plausible aggregate ${aggRes.status}`);
  if (!pagesRes.ok) throw new Error(`plausible top-pages ${pagesRes.status}`);
  if (!refsRes.ok) throw new Error(`plausible top-refs ${refsRes.status}`);

  const agg = await aggRes.json();
  const pages = await pagesRes.json();
  const refs = await refsRes.json();

  return {
    provider: 'plausible',
    period,
    totals: {
      visitors: agg?.results?.visitors?.value ?? 0,
      pageviews: agg?.results?.pageviews?.value ?? 0,
      bounce_rate: agg?.results?.bounce_rate?.value ?? 0,
      visit_duration: agg?.results?.visit_duration?.value ?? 0,
    },
    top_pages: (pages?.results || []).map((r) => ({
      page: r.page,
      visitors: r.visitors,
    })),
    top_referrers: (refs?.results || []).map((r) => ({
      source: r.source || '(direct)',
      visitors: r.visitors,
    })),
  };
}

async function fetchUmami(period) {
  const base = process.env.UMAMI_API_URL.replace(/\/$/, '');
  const websiteId = encodeURIComponent(process.env.UMAMI_WEBSITE_ID);
  const token = process.env.UMAMI_API_TOKEN;
  const headers = { Authorization: `Bearer ${token}` };

  const endAt = Date.now();
  const startAt = endAt - (UMAMI_PERIOD_MS[period] || UMAMI_PERIOD_MS['7d']);
  const range = `startAt=${startAt}&endAt=${endAt}`;

  const statsUrl = `${base}/websites/${websiteId}/stats?${range}`;
  const topPagesUrl = `${base}/websites/${websiteId}/metrics?${range}&type=url&limit=10`;
  const topRefsUrl = `${base}/websites/${websiteId}/metrics?${range}&type=referrer&limit=10`;

  const [statsRes, pagesRes, refsRes] = await Promise.all([
    fetch(statsUrl, { headers }),
    fetch(topPagesUrl, { headers }),
    fetch(topRefsUrl, { headers }),
  ]);

  if (!statsRes.ok) throw new Error(`umami stats ${statsRes.status}`);
  if (!pagesRes.ok) throw new Error(`umami top-pages ${pagesRes.status}`);
  if (!refsRes.ok) throw new Error(`umami top-refs ${refsRes.status}`);

  const stats = await statsRes.json();
  const pages = await pagesRes.json();
  const refs = await refsRes.json();

  return {
    provider: 'umami',
    period,
    totals: {
      visitors: stats?.visitors?.value ?? 0,
      pageviews: stats?.pageviews?.value ?? 0,
      bounce_rate: stats?.bounces?.value ?? 0,
      visit_duration: stats?.totaltime?.value ?? 0,
    },
    top_pages: (Array.isArray(pages) ? pages : []).map((r) => ({
      page: r.x,
      visitors: r.y,
    })),
    top_referrers: (Array.isArray(refs) ? refs : []).map((r) => ({
      source: r.x || '(direct)',
      visitors: r.y,
    })),
  };
}

router.get(
  '/website-stats',
  requireRole(['super_admin', 'admin']),
  async (req, res) => {
    const provider = pickProvider();
    const period = String(req.query.period || '7d');

    if (provider === 'none' || configMissing(provider)) {
      return res.status(503).json({
        configured: false,
        provider,
        message:
          'No analytics provider is configured. Set ANALYTICS_PROVIDER and the matching credentials in the server environment to enable this page.',
        env_hint: [
          'ANALYTICS_PROVIDER=plausible|umami',
          'PLAUSIBLE_SITE_ID, PLAUSIBLE_API_KEY (for plausible)',
          'UMAMI_API_URL, UMAMI_API_TOKEN, UMAMI_WEBSITE_ID (for umami)',
        ],
      });
    }

    try {
      const period_for_provider =
        provider === 'plausible' ? PLAUSIBLE_PERIODS[period] || '7d' : period;
      const data =
        provider === 'plausible'
          ? await fetchPlausible(period_for_provider)
          : await fetchUmami(period);
      res.json({ configured: true, ...data });
    } catch (err) {
      // Don't leak provider tokens / internal URLs in the error path.
      console.error('[website-stats] provider error:', err);
      res.status(502).json({
        configured: true,
        provider,
        error: 'analytics provider request failed',
        detail: String(err?.message || err).replace(/Bearer\s+\S+/g, 'Bearer <redacted>'),
      });
    }
  },
);

module.exports = router;
