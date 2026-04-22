/**
 * accountConstants.ts — Shared types, constants, and helpers for Account Hub pages.
 *
 * Centralizes duplicated definitions to keep pages consistent and reduce drift.
 */

// ── Shared Types ─────────────────────────────────────────────────────────────

/** Common snackbar state used by all Account Hub settings pages. */
export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info';
}

export const SNACKBAR_CLOSED: SnackbarState = { open: false, message: '', severity: 'success' };

/** Standard snackbar auto-hide duration (ms). */
export const SNACKBAR_DURATION = 4000;

/** Extended snackbar duration for critical actions (password change, etc.). */
export const SNACKBAR_DURATION_LONG = 6000;

// ── Church Field Constants ───────────────────────────────────────────────────

/** Canonical language options for church settings. ISO 639-1 codes. */
export const LANGUAGE_OPTIONS = [
  { value: 'en', labelKey: 'account.lang_english' },
  { value: 'gr', labelKey: 'account.lang_greek' },
  { value: 'ru', labelKey: 'account.lang_russian' },
  { value: 'ro', labelKey: 'account.lang_romanian' },
  { value: 'ka', labelKey: 'account.lang_georgian' },
] as const;

/** ISO 639-1 code to translation key mapping. Use with t() for display. */
export const LANGUAGE_LABEL_KEYS: Record<string, string> = Object.fromEntries(
  LANGUAGE_OPTIONS.map((o) => [o.value, o.labelKey]),
);

/** Calendar type options. Empty string = not set, mapped to null on save. */
export const CALENDAR_OPTIONS = [
  { value: '', labelKey: 'account.calendar_not_set' },
  { value: 'Julian', labelKey: 'account.calendar_julian' },
  { value: 'Revised Julian', labelKey: 'account.calendar_revised_julian' },
] as const;

// ── Church Settings Response Helper ──────────────────────────────────────────

/**
 * Extract church settings from the /api/my/church-settings response.
 *
 * The API wraps settings in `data.data.settings` but some consumers historically
 * expected `data.settings`. This helper normalizes access so all pages behave the same.
 */
export function extractChurchSettings<T = Record<string, unknown>>(responseData: any): T | null {
  if (!responseData?.success) return null;
  return responseData.data?.settings || responseData.settings || null;
}

/**
 * Resolve the canonical display name for a church.
 * The DB has both `name` and `church_name` columns; prefer `name`.
 */
export function getChurchDisplayName(settings: Record<string, any>): string {
  return settings?.name || settings?.church_name || '';
}

// ── Role Metadata ────────────────────────────────────────────────────────────

/** Translation keys for role descriptions. Use with t() for display. */
export const ROLE_DESCRIPTION_KEYS: Record<string, string> = {
  super_admin: 'account.role_super_admin',
  admin: 'account.role_admin',
  church_admin: 'account.role_church_admin',
  priest: 'account.role_priest',
  deacon: 'account.role_deacon',
  editor: 'account.role_editor',
  viewer: 'account.role_viewer',
  guest: 'account.role_guest',
};
