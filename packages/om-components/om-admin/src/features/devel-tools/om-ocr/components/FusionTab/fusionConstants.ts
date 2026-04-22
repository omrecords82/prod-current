/**
 * fusionConstants — Shared constants and helper functions for FusionTab.
 * Extracted from FusionTab.tsx
 */

// Required fields for completion check per record type
export const REQUIRED_FIELDS: Record<string, string[]> = {
  baptism: ['child_name', 'date_of_baptism'],
  marriage: ['groom_name', 'bride_name'],
  funeral: ['deceased_name'],
};

// Consistent color mapping for entries (matches overlay colors)
export const ENTRY_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0'];

export const getEntryColor = (index: number) => ENTRY_COLORS[index % ENTRY_COLORS.length];

export const getConfidenceColor = (confidence: number): 'success' | 'warning' | 'error' => {
  if (confidence >= 0.8) return 'success';
  if (confidence >= 0.5) return 'warning';
  return 'error';
};
