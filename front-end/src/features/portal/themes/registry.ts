import ModernPortalLayout from './modern/ModernPortalLayout';
import { ModernHubLayout } from './hub/layouts/ModernHubLayout';
import { ArtDecoHubLayout } from './hub/layouts/ArtDecoHubLayout';
import { NeoGothicHubLayout } from './hub/layouts/NeoGothicHubLayout';
import { PaperHubLayout } from './hub/layouts/PaperHubLayout';
import { BentoHubLayout } from './hub/layouts/BentoHubLayout';
import { GlassHubLayout } from './hub/layouts/GlassHubLayout';
import {
  DEFAULT_PORTAL_LAYOUT_THEME,
  PORTAL_THEME_META,
  isPortalLayoutThemeId,
  resolvePortalLayoutTheme,
} from './themeMeta';
import type { PortalLayoutThemeId, PortalThemeBundle } from './types';

export {
  DEFAULT_PORTAL_LAYOUT_THEME,
  PORTAL_THEME_META,
  isPortalLayoutThemeId,
  resolvePortalLayoutTheme,
} from './themeMeta';

const BUNDLES: Record<PortalLayoutThemeId, PortalThemeBundle> = {
  modern: {
    meta: PORTAL_THEME_META.modern,
    Layout: ModernPortalLayout,
    HubLayout: ModernHubLayout,
    scopeClass: 'portal-modern',
  },
  'art-deco': {
    meta: PORTAL_THEME_META['art-deco'],
    Layout: ModernPortalLayout,
    HubLayout: ArtDecoHubLayout,
    scopeClass: 'portal-art-deco',
  },
  'neo-gothic': {
    meta: PORTAL_THEME_META['neo-gothic'],
    Layout: ModernPortalLayout,
    HubLayout: NeoGothicHubLayout,
    scopeClass: 'portal-neo-gothic',
  },
  paper: {
    meta: PORTAL_THEME_META.paper,
    Layout: ModernPortalLayout,
    HubLayout: PaperHubLayout,
    scopeClass: 'portal-paper',
  },
  bento: {
    meta: PORTAL_THEME_META.bento,
    Layout: ModernPortalLayout,
    HubLayout: BentoHubLayout,
    scopeClass: 'portal-bento',
  },
  glass: {
    meta: PORTAL_THEME_META.glass,
    Layout: ModernPortalLayout,
    HubLayout: GlassHubLayout,
    scopeClass: 'portal-glass',
  },
};

export function getPortalThemeBundle(themeId: PortalLayoutThemeId): PortalThemeBundle {
  return BUNDLES[resolvePortalLayoutTheme(themeId)];
}

export { ModernPortalLayout };
