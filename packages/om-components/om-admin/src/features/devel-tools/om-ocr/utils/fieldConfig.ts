/**
 * Field Configuration — localStorage-based field label/visibility overrides.
 * Merges user overrides onto default fields from recordFields.ts.
 */

import { getFieldsForType, type RecordField } from './recordFields';

export interface FieldOverride {
  label?: string;
  hidden?: boolean;
}

const STORAGE_PREFIX = 'om.ocr.fieldConfig.';

function storageKey(recordType: string): string {
  return `${STORAGE_PREFIX}${recordType}`;
}

/**
 * Get user overrides for a record type from localStorage.
 */
export function getFieldOverrides(recordType: string): Record<string, FieldOverride> {
  try {
    const raw = localStorage.getItem(storageKey(recordType));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

/**
 * Save field overrides to localStorage.
 */
export function saveFieldOverrides(recordType: string, overrides: Record<string, FieldOverride>): void {
  localStorage.setItem(storageKey(recordType), JSON.stringify(overrides));
}

/**
 * Reset overrides back to defaults (clears localStorage key).
 */
export function resetFieldOverrides(recordType: string): void {
  localStorage.removeItem(storageKey(recordType));
}

/**
 * Get customized fields for a record type — merges overrides onto defaults,
 * filters out hidden fields.
 */
export function getCustomFieldsForType(recordType: string): RecordField[] {
  const defaults = getFieldsForType(recordType);
  const overrides = getFieldOverrides(recordType);

  return defaults
    .filter(f => !overrides[f.key]?.hidden)
    .map(f => {
      const ovr = overrides[f.key];
      if (!ovr?.label) return f;
      return { ...f, label: ovr.label };
    });
}
