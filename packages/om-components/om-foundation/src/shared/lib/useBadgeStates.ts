/**
 * useBadgeStates — fetches badge state data from the server
 *
 * Returns a Map<itemKey, BadgeData> for O(1) lookups during menu rendering.
 * Fetches once on mount and caches in state. Provides a refresh function.
 */

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import { BadgeData, buildBadgeMap } from '@/utils/badgeResolver';

export function useBadgeStates() {
  const [badgeMap, setBadgeMap] = useState<Map<string, BadgeData>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchBadges = useCallback(async () => {
    try {
      const res: any = await apiClient.get('/badges');
      const badges: BadgeData[] = res?.badges || [];
      setBadgeMap(buildBadgeMap(badges));
    } catch {
      // Non-critical — sidebar still works without badges
      console.warn('[useBadgeStates] Failed to fetch badge states');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  return { badgeMap, loading, refresh: fetchBadges };
}
