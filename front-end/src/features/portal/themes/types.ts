import type { ComponentType, ReactNode } from 'react';
import type { PortalHubLayoutProps } from './hub/portalHubTypes';

/** Parish portal layout themes — each maps to a distinct hub structure + component family. */
export type PortalLayoutThemeId =
  | 'modern'
  | 'art-deco'
  | 'neo-gothic'
  | 'paper'
  | 'bento'
  | 'glass';

/** Legacy ids persisted before the 6-theme expansion */
export type LegacyPortalLayoutThemeId = 'heritage' | 'cathedral';

export interface PortalThemeMeta {
  id: PortalLayoutThemeId;
  label: string;
  description: string;
  previewGradient: string;
  available: boolean;
}

export interface PortalThemeBundle {
  meta: PortalThemeMeta;
  Layout: ComponentType;
  HubLayout: ComponentType<PortalHubLayoutProps>;
  scopeClass: string;
}

export interface PortalThemeContextValue {
  layoutTheme: PortalLayoutThemeId;
  bundle: PortalThemeBundle;
  loading: boolean;
}

export interface PortalPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}
