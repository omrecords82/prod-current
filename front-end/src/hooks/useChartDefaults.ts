/**
 * useChartDefaults — Shared ApexCharts theme-aware configuration hook.
 *
 * Centralises the MUI-theme → ApexCharts wiring that was previously
 * duplicated across every dashboard widget (CompletenessGauge,
 * SacramentsByYearChart, TypeDistributionChart, etc.).
 *
 * Usage:
 *   const { buildOptions, themeTokens, OM_PALETTE } = useChartDefaults();
 *   const options = buildOptions('bar', { plotOptions: { bar: { borderRadius: 3 } } });
 */

import { useTheme } from '@mui/material/styles';
import { useMemo } from 'react';

// ── Standard OM colour palette used by sacrament / distribution charts ──────
export const OM_PALETTE = ['#1e88e5', '#e91e63', '#7b1fa2'] as const;

// ── Public types ────────────────────────────────────────────────────────────
export interface ChartThemeTokens {
  fontFamily: string;
  mode: 'light' | 'dark';
  textPrimary: string;
  textSecondary: string;
  divider: string;
}

export interface UseChartDefaultsReturn {
  /** Merge base theme defaults with chart-specific overrides. */
  buildOptions: (
    chartType: ApexChart['type'],
    overrides?: ApexCharts.ApexOptions,
  ) => ApexCharts.ApexOptions;
  /** Raw theme tokens for one-off colour references. */
  themeTokens: ChartThemeTokens;
  /** Standard 3-colour palette for OM charts. */
  OM_PALETTE: readonly string[];
}

// ── Deep-merge helper (2 levels, no external dep) ───────────────────────────
function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Record<string, unknown>,
): T {
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(override)) {
    const bVal = result[key];
    const oVal = override[key];
    if (
      bVal !== null &&
      oVal !== null &&
      typeof bVal === 'object' &&
      typeof oVal === 'object' &&
      !Array.isArray(bVal) &&
      !Array.isArray(oVal)
    ) {
      result[key] = deepMerge(
        bVal as Record<string, unknown>,
        oVal as Record<string, unknown>,
      );
    } else {
      result[key] = oVal;
    }
  }
  return result as T;
}

// ── Hook ────────────────────────────────────────────────────────────────────
const useChartDefaults = (): UseChartDefaultsReturn => {
  const theme = useTheme();

  const themeTokens: ChartThemeTokens = useMemo(
    () => ({
      fontFamily: theme.typography.fontFamily as string,
      mode: theme.palette.mode,
      textPrimary: theme.palette.text.primary,
      textSecondary: theme.palette.text.secondary,
      divider: theme.palette.divider,
    }),
    [
      theme.typography.fontFamily,
      theme.palette.mode,
      theme.palette.text.primary,
      theme.palette.text.secondary,
      theme.palette.divider,
    ],
  );

  const buildOptions = useMemo(() => {
    const base: ApexCharts.ApexOptions = {
      chart: {
        fontFamily: themeTokens.fontFamily,
        toolbar: { show: false },
      },
      tooltip: { theme: themeTokens.mode },
      dataLabels: { enabled: false },
      grid: {
        borderColor: themeTokens.divider,
        strokeDashArray: 4,
      },
    };

    return (
      chartType: ApexChart['type'],
      overrides: ApexCharts.ApexOptions = {},
    ): ApexCharts.ApexOptions => {
      const merged = deepMerge(
        base as unknown as Record<string, unknown>,
        overrides as unknown as Record<string, unknown>,
      ) as ApexCharts.ApexOptions;
      // Ensure the chart.type is always set from the caller
      merged.chart = { ...(merged.chart as Record<string, unknown>), type: chartType } as ApexCharts.ApexOptions['chart'];
      return merged;
    };
  }, [themeTokens]);

  return { buildOptions, themeTokens, OM_PALETTE };
};

export default useChartDefaults;
