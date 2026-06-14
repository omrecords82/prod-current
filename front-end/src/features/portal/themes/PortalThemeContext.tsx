import React, { createContext, useContext, useMemo } from 'react';
import { useParishSettings } from '@/features/account/parish-management/useParishSettings';
import {
  DEFAULT_PORTAL_LAYOUT_THEME,
  getPortalThemeBundle,
  resolvePortalLayoutTheme,
} from './registry';
import type { PortalLayoutThemeId, PortalThemeContextValue } from './types';
import './portal-themes.css';

interface ThemeSettings {
  portalLayoutTheme?: PortalLayoutThemeId | 'heritage' | 'cathedral';
}

const PortalThemeContext = createContext<PortalThemeContextValue | null>(null);

export function PortalThemeProvider({ children }: { children: React.ReactNode }) {
  const { data, loading } = useParishSettings<ThemeSettings>('theme');

  const layoutTheme = resolvePortalLayoutTheme(
    data?.portalLayoutTheme ?? DEFAULT_PORTAL_LAYOUT_THEME,
  );
  const bundle = getPortalThemeBundle(layoutTheme);

  const value = useMemo<PortalThemeContextValue>(
    () => ({ layoutTheme, bundle, loading }),
    [layoutTheme, bundle, loading],
  );

  return (
    <PortalThemeContext.Provider value={value}>
      {children}
    </PortalThemeContext.Provider>
  );
}

export function usePortalTheme(): PortalThemeContextValue {
  const ctx = useContext(PortalThemeContext);
  if (!ctx) {
    return {
      layoutTheme: DEFAULT_PORTAL_LAYOUT_THEME,
      bundle: getPortalThemeBundle(DEFAULT_PORTAL_LAYOUT_THEME),
      loading: false,
    };
  }
  return ctx;
}
