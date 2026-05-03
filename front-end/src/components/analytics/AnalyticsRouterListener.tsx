import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { initAnalytics, trackPageview } from '@/lib/analytics';

/**
 * Mounts once near the root of the app. Initializes the configured
 * analytics provider on first render, then fires a pageview on every
 * client-side route change. Safe no-op when no provider is configured
 * or DNT is set (see lib/analytics.ts).
 */
export default function AnalyticsRouterListener() {
  const location = useLocation();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    const path = location.pathname + location.search;
    if (lastPathRef.current === path) return;
    lastPathRef.current = path;
    trackPageview(path);
  }, [location.pathname, location.search]);

  return null;
}
