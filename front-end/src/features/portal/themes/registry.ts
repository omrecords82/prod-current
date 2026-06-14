import ModernPortalLayout from './modern/ModernPortalLayout';
import { ModernHubLayout } from './hub/layouts/ModernHubLayout';
import { ArtDecoHubLayout } from './hub/layouts/ArtDecoHubLayout';
import { NeoGothicHubLayout } from './hub/layouts/NeoGothicHubLayout';
import { PaperHubLayout } from './hub/layouts/PaperHubLayout';
import { BentoHubLayout } from './hub/layouts/BentoHubLayout';
import { GlassHubLayout } from './hub/layouts/GlassHubLayout';
import type { LegacyPortalLayoutThemeId, PortalLayoutThemeId, PortalThemeBundle, PortalThemeMeta } from './types';

export const PORTAL_THEME_META: Record<PortalLayoutThemeId, PortalThemeMeta> = {
  modern: {
    id: 'modern',
    label: 'Modern Professional',
    description: 'Left stat stack, top tools strip, and a dominant recent-activity panel.',
    previewGradient: 'linear-gradient(135deg, #1e3a5f 0%, #334155 100%)',
    available: true,
  },
  'art-deco': {
    id: 'art-deco',
    label: 'Art Deco Elegance',
    description: 'Circular gauges, gold ornaments, and serif typography inspired by Byzantine luxury.',
    previewGradient: 'linear-gradient(135deg, #1a2744 0%, #c9a227 100%)',
    available: true,
  },
  'neo-gothic': {
    id: 'neo-gothic',
    label: 'Neo-Gothic Dark',
    description: 'Dark frame with neon glass record cards and a compact tools grid.',
    previewGradient: 'linear-gradient(135deg, #0a0a12 0%, #4c1d95 50%, #ec4899 100%)',
    available: true,
  },
  paper: {
    id: 'paper',
    label: 'Minimalist Paper',
    description: 'Editorial typography on a paper texture — stats without card chrome.',
    previewGradient: 'linear-gradient(135deg, #f5f0e6 0%, #e8e0d0 100%)',
    available: true,
  },
  bento: {
    id: 'bento',
    label: 'Flat Bento Grid',
    description: 'Playful pastel tiles in a bento layout with flat 2D styling.',
    previewGradient: 'linear-gradient(135deg, #dbeafe 0%, #ffedd5 50%, #ede9fe 100%)',
    available: true,
  },
  glass: {
    id: 'glass',
    label: 'Futuristic Glass',
    description: 'Frosted glass cards over a deep gradient with orbital quick actions.',
    previewGradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #6366f1 100%)',
    available: true,
  },
};

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

export const DEFAULT_PORTAL_LAYOUT_THEME: PortalLayoutThemeId = 'modern';

const LEGACY_MAP: Record<LegacyPortalLayoutThemeId, PortalLayoutThemeId> = {
  heritage: 'art-deco',
  cathedral: 'neo-gothic',
};

const ALL_IDS: PortalLayoutThemeId[] = ['modern', 'art-deco', 'neo-gothic', 'paper', 'bento', 'glass'];

export function isPortalLayoutThemeId(value: unknown): value is PortalLayoutThemeId {
  return typeof value === 'string' && ALL_IDS.includes(value as PortalLayoutThemeId);
}

export function resolvePortalLayoutTheme(value: unknown): PortalLayoutThemeId {
  if (isPortalLayoutThemeId(value)) return value;
  if (value === 'heritage' || value === 'cathedral') {
    return LEGACY_MAP[value as LegacyPortalLayoutThemeId];
  }
  return DEFAULT_PORTAL_LAYOUT_THEME;
}

export function getPortalThemeBundle(themeId: PortalLayoutThemeId): PortalThemeBundle {
  return BUNDLES[resolvePortalLayoutTheme(themeId)];
}

export { ModernPortalLayout };
