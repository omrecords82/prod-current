import type { PortalLayoutThemeId } from './types';
import { PORTAL_THEME_META } from './themeMeta';

export interface PortalLayoutSlot {
  slot: number;
  id: PortalLayoutThemeId;
  label: string;
  shortLabel: string;
  previewGradient: string;
}

/** Fixed slot order matching the Customizer 6-spot grid (1–6). */
export const PORTAL_LAYOUT_SLOTS: PortalLayoutSlot[] = [
  { slot: 1, id: 'modern', label: PORTAL_THEME_META.modern.label, shortLabel: 'Modern', previewGradient: PORTAL_THEME_META.modern.previewGradient },
  { slot: 2, id: 'art-deco', label: PORTAL_THEME_META['art-deco'].label, shortLabel: 'Art Deco', previewGradient: PORTAL_THEME_META['art-deco'].previewGradient },
  { slot: 3, id: 'neo-gothic', label: PORTAL_THEME_META['neo-gothic'].label, shortLabel: 'Gothic', previewGradient: PORTAL_THEME_META['neo-gothic'].previewGradient },
  { slot: 4, id: 'paper', label: PORTAL_THEME_META.paper.label, shortLabel: 'Paper', previewGradient: PORTAL_THEME_META.paper.previewGradient },
  { slot: 5, id: 'bento', label: PORTAL_THEME_META.bento.label, shortLabel: 'Bento', previewGradient: PORTAL_THEME_META.bento.previewGradient },
  { slot: 6, id: 'glass', label: PORTAL_THEME_META.glass.label, shortLabel: 'Glass', previewGradient: PORTAL_THEME_META.glass.previewGradient },
];

const SLOT_BY_ID = new Map(PORTAL_LAYOUT_SLOTS.map((s) => [s.id, s.slot]));
const ID_BY_SLOT = new Map(PORTAL_LAYOUT_SLOTS.map((s) => [s.slot, s.id]));

export function themeIdToSlot(themeId: PortalLayoutThemeId): number {
  return SLOT_BY_ID.get(themeId) ?? 1;
}

export function slotToThemeId(slot: number): PortalLayoutThemeId {
  return ID_BY_SLOT.get(slot) ?? 'modern';
}

export function getSlotForTheme(themeId: PortalLayoutThemeId | unknown): number {
  const resolved = typeof themeId === 'string' ? themeId : 'modern';
  if (resolved === 'heritage') return themeIdToSlot('art-deco');
  if (resolved === 'cathedral') return themeIdToSlot('neo-gothic');
  return themeIdToSlot(resolved as PortalLayoutThemeId);
}
