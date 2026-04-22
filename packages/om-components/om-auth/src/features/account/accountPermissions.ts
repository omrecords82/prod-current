/**
 * accountPermissions.ts — Shared permission utilities for Account Hub.
 *
 * Centralizes capability checks so individual pages don't scatter
 * role literals. All checks take the auth user object directly.
 *
 * Permission model:
 *   canEditChurchSettings  → branding (logos, colors, short_name)
 *                            Roles: super_admin, admin, church_admin
 *
 *   canEditBasicChurchInfo → church details (name, contact, address, calendar, etc.)
 *                            Roles: super_admin, admin, church_admin, priest
 */

/** Roles that can edit branding / identity assets. Includes 'manager' (DB enum equivalent of church_admin). */
const CHURCH_EDIT_ROLES = ['super_admin', 'admin', 'church_admin', 'manager'] as const;

/** Roles that can edit basic church info (contact, address, calendar, etc.). Includes 'manager' (DB enum equivalent of church_admin). */
const CHURCH_BASIC_EDIT_ROLES = ['super_admin', 'admin', 'church_admin', 'manager', 'priest'] as const;

interface MinimalUser {
  role?: string;
  church_id?: number | null;
}

/** Any authenticated user can access the Account Hub. */
export function canAccessAccountHub(user: MinimalUser | null | undefined): boolean {
  return !!user;
}

/** User has a church association. */
export function hasChurchContext(user: MinimalUser | null | undefined): boolean {
  return !!user?.church_id;
}

/** User can view church settings pages (has a church). */
export function canViewChurchSettings(user: MinimalUser | null | undefined): boolean {
  return hasChurchContext(user);
}

/** User can edit branding: logos, colors, short_name. church_admin+ only. */
export function canEditChurchSettings(user: MinimalUser | null | undefined): boolean {
  if (!user?.role || !hasChurchContext(user)) return false;
  return (CHURCH_EDIT_ROLES as readonly string[]).includes(user.role);
}

/** User can edit basic church info: name, contact, address, calendar, website. priest+ roles. */
export function canEditBasicChurchInfo(user: MinimalUser | null | undefined): boolean {
  if (!user?.role || !hasChurchContext(user)) return false;
  return (CHURCH_BASIC_EDIT_ROLES as readonly string[]).includes(user.role);
}

/** User can manage church-level OCR preferences. church_admin+ only. */
export function canManageOcrPreferences(user: MinimalUser | null | undefined): boolean {
  if (!user?.role || !hasChurchContext(user)) return false;
  return (CHURCH_EDIT_ROLES as readonly string[]).includes(user.role);
}
