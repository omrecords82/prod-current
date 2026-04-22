/**
 * useBuildActivity Hook
 * Fetches build activity summary from the backend
 * Shows frontend and server build counts for the last N hours
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';

export interface BuildRun {
  runId: string;
  env: 'prod' | 'staging' | 'dev';
  origin: 'server' | 'frontend' | 'root-harness';
  status: 'running' | 'success' | 'failed';
  startedAt: string;
  endedAt: string | null;
  builtFrontend: boolean;
  builtServer: boolean;
  durationSeconds: number;
}

export interface BuildActivitySummary {
  hours: number;
  frontendBuilds: number;
  serverBuilds: number;
  last10: BuildRun[];
}

interface UseBuildActivityReturn {
  summary: BuildActivitySummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: (hours?: number) => Promise<void>;
}

export const useBuildActivity = (initialHours: number = 24): UseBuildActivityReturn => {
  const [summary, setSummary] = useState<BuildActivitySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBuildActivity = useCallback(async (hours: number = initialHours) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<any>(`/admin/build-runs/summary?hours=${hours}`);
      
      if (data.success) {
        setSummary({
          hours: data.hours,
          frontendBuilds: data.frontendBuilds || 0,
          serverBuilds: data.serverBuilds || 0,
          last10: data.last10 || [],
        });
      } else {
        throw new Error('Invalid build activity response');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch build activity';
      setError(errorMessage);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [initialHours]);

  useEffect(() => {
    fetchBuildActivity();
  }, [fetchBuildActivity]);

  return {
    summary,
    isLoading,
    error,
    refetch: fetchBuildActivity,
  };
};

export default useBuildActivity;
