/**
 * constants.ts — Constants and helpers for USChurchMapPage.
 */

import type { OpStatus } from './types';

export const REGIONS: Record<string, { label: string; states: string[] }> = {
  all: { label: 'All States', states: [] },
  northeast: { label: 'Northeast', states: ['CT', 'DE', 'ME', 'MD', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT', 'DC'] },
  midwest: { label: 'Midwest', states: ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'] },
  south: { label: 'South', states: ['AL', 'AR', 'FL', 'GA', 'KY', 'LA', 'MS', 'NC', 'OK', 'SC', 'TN', 'TX', 'VA', 'WV'] },
  west: { label: 'West', states: ['AK', 'AZ', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'NM', 'OR', 'UT', 'WA', 'WY'] },
};

export const COLOR_RAMP_LIGHT = ['#eff3ff', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594'];
export const COLOR_RAMP_DARK = ['#1a2332', '#1e3a5f', '#22528c', '#2d6db5', '#4a90d9', '#7ab8f5', '#b0d9ff'];
export const NO_DATA_LIGHT = '#f0f0f0';
export const NO_DATA_DARK = '#2a2a2a';

export const STATUS_CONFIG: Record<OpStatus, { label: string; color: string; short: string }> = {
  directory: { label: 'Directory Only', color: '#9e9e9e', short: 'Dir' },
  pipeline: { label: 'CRM Pipeline', color: '#2196f3', short: 'CRM' },
  onboarding: { label: 'Onboarding', color: '#ff9800', short: 'Onb' },
  live: { label: 'Live Client', color: '#4caf50', short: 'Live' },
  client: { label: 'Client', color: '#4caf50', short: 'Client' },
};

export const SVG_W = 975;
export const SVG_H = 610;

export function projectToAlbersUsa(lngRaw: number | string, latRaw: number | string): [number, number] | null {
  const lng = Number(lngRaw);
  const lat = Number(latRaw);
  if (lat >= 24 && lat <= 50 && lng >= -125 && lng <= -66) {
    return [Math.max(0, Math.min(SVG_W, 960 + (lng + 96) * 11.5)), Math.max(0, Math.min(SVG_H, 620 + (lat - 38) * -14))];
  }
  if (lat >= 51 && lat <= 72 && lng >= -180 && lng <= -129) {
    return [150 + (lng + 180) * 2.5, 490 + (72 - lat) * 4];
  }
  if (lat >= 18 && lat <= 23 && lng >= -161 && lng <= -154) {
    return [250 + (lng + 161) * 15, 520 + (23 - lat) * 12];
  }
  return null;
}

export const LABEL_OFFSETS: Record<string, { x: number; y: number; anchor?: 'start' | 'middle' | 'end' }> = {
  CT: { x: 893, y: 218, anchor: 'start' },
  DC: { x: 851, y: 295, anchor: 'start' },
  DE: { x: 851, y: 275, anchor: 'start' },
  MA: { x: 893, y: 203, anchor: 'start' },
  MD: { x: 851, y: 285, anchor: 'start' },
  NH: { x: 893, y: 163, anchor: 'start' },
  NJ: { x: 851, y: 260, anchor: 'start' },
  RI: { x: 893, y: 210, anchor: 'start' },
  VT: { x: 843, y: 163, anchor: 'end' },
};

export function getChurchDetailUrl(church: { id: number | string }): string {
  return `/admin/control-panel/onboarding-pipeline/${church.id}`;
}
