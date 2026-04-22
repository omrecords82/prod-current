import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';

export interface Jurisdiction {
  id: number;
  name: string;
  abbreviation: string;
  calendar_type: 'Julian' | 'Revised Julian';
  parent_church: string | null;
  country: string | null;
  canonical_territory: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useJurisdictions(includeInactive = false) {
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = includeInactive ? '?include_inactive=true' : '';
      const res = await apiClient.get(`/jurisdictions${params}`);
      setJurisdictions(res.items || []);
    } catch (err) {
      console.error('Failed to load jurisdictions:', err);
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => { fetch(); }, [fetch]);

  const getById = useCallback(
    (id: number) => jurisdictions.find((j) => j.id === id) || null,
    [jurisdictions],
  );

  const getByAbbreviation = useCallback(
    (abbr: string) => jurisdictions.find((j) => j.abbreviation === abbr) || null,
    [jurisdictions],
  );

  return { jurisdictions, loading, getById, getByAbbreviation, refetch: fetch };
}
