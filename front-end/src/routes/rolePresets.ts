/**
 * Role presets — named constants for exactly-repeated role arrays.
 * Only includes arrays that appear 3+ times across route files.
 * Array order is preserved exactly as used in the majority of occurrences.
 *
 * Do NOT reorder arrays to "normalize" them — the original order is intentional
 * and changing it could affect comparison logic in ProtectedRoute.
 */
import type { UserRole } from '../types/orthodox-metrics.types.ts';

/** super_admin only (34 uses) */
export const ROLE_SUPER: UserRole[] = ['super_admin'];

/** ['super_admin', 'admin'] — used in adminRoutes menu/control-panel, develRoutes tools (17 uses) */
export const ROLE_SUPER_ADMIN: UserRole[] = ['super_admin', 'admin'];

/** ['admin', 'super_admin'] — used in adminRoutes settings/logs/sessions (15 uses) */
export const ROLE_ADMIN_SUPER: UserRole[] = ['admin', 'super_admin'];

/** ['super_admin', 'admin', 'church_admin', 'priest'] — staff-level access (15 uses) */
export const ROLE_STAFF: UserRole[] = ['super_admin', 'admin', 'church_admin', 'priest'];

/** ['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor'] — all church roles (10 uses) */
export const ROLE_ALL_CHURCH: UserRole[] = ['super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor'];
