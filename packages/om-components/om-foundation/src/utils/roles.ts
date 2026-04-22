/**
 * 🔄 Simplified Unified Role System for OrthodMetrics
 * 
 * This file establishes the canonical role hierarchy and utility functions
 * for consistent role-based access control across the entire application.
 * 
 * Canonical role hierarchy with inheritance:
 * super_admin > admin > church_admin > priest > deacon > editor > viewer > guest
 */

export type UserRole =
  | 'super_admin'      // Level 7 - Global system owner
  | 'admin'            // Level 6 - Platform admin
  | 'church_admin'     // Level 5 - Church-specific admin
  | 'priest'           // Level 4 - Full clergy privileges
  | 'deacon'           // Level 3 - Partial clergy privileges
  | 'editor'           // Level 2 - Can edit records/content
  | 'viewer'           // Level 1 - Read-only access
  | 'guest';           // Level 0 - Unauthenticated access

// Simplified role hierarchy with numeric privilege levels
const roleHierarchy: Record<UserRole, number> = {
  super_admin: 7,
  admin: 6,
  church_admin: 5,
  priest: 4,
  deacon: 3,
  editor: 2,
  viewer: 1,
  guest: 0,
};

// User interface for role checking
export interface User {
  id?: string | number;
  email?: string;
  role: UserRole;
  profile_attributes?: {
    titles?: string[];
    ministries?: string[];
    isParishCouncilMember?: boolean;
    specializations?: string[];
    certifications?: string[];
  };
  [key: string]: any; // Allow additional properties
}

// Legacy role mapping for migration compatibility
const legacyRoleMap: Record<string, UserRole> = {
  // Administrative roles
  'super_admin': 'super_admin',
  'admin': 'admin',
  'dev_admin': 'admin',
  'manager': 'church_admin',
  'church_admin': 'church_admin',
  'owner': 'church_admin',
  'administrator': 'church_admin',
  
  // Clergy roles
  'priest': 'priest',
  'deacon': 'deacon',
  
  // Editor roles (consolidated)
  'user': 'editor',
  'secretary': 'editor',
  'treasurer': 'editor',
  'volunteer': 'editor',
  'member': 'editor',
  'moderator': 'editor',
  'assistant': 'editor',
  'editor': 'editor',
  
  // System/AI roles -> admin
  'system': 'admin',
  'ai_agent': 'admin',
  'omai': 'admin',
  
  // View-only roles
  'viewer': 'viewer',
  'guest': 'guest',
};

/**
 * Normalize legacy role to canonical role
 * @param legacyRole - The legacy role string
 * @returns The canonical role
 */
export const normalizeLegacyRole = (legacyRole: string): UserRole => {
  return legacyRoleMap[legacyRole] || 'viewer';
};

/**
 * Check if user has the required role or higher privilege level
 * @param user - User object with role property
 * @param requiredRole - The minimum required role
 * @returns boolean - Whether user has sufficient privileges
 * 
 * @example
 * hasRole(user, 'editor') // Returns true if user is editor or higher
 * hasRole(user, 'admin')  // Returns true only if user is admin or super_admin
 */
export const hasRole = (user: User | null | undefined, requiredRole: UserRole): boolean => {
  if (!user?.role) return requiredRole === 'guest';
  
  const normalizedUserRole = normalizeLegacyRole(user.role as string);
  const userLevel = roleHierarchy[normalizedUserRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
};

/**
 * Check if user has any of the specified roles
 * @param user - User object with role property
 * @param roles - Array of roles to check against
 * @returns boolean - Whether user has any of the specified roles
 */
export const hasAnyRole = (user: User | null | undefined, roles: UserRole[]): boolean => {
  return roles.some(role => hasRole(user, role));
};

/**
 * Check if user has exact role (no inheritance)
 * @param user - User object with role property
 * @param exactRole - The exact role to match
 * @returns boolean - Whether user has the exact role
 */
export const hasExactRole = (user: User | null | undefined, exactRole: UserRole): boolean => {
  if (!user?.role) return exactRole === 'guest';
  const normalizedUserRole = normalizeLegacyRole(user.role as string);
  return normalizedUserRole === exactRole;
};

/**
 * Get all roles that can be assigned by current user
 * @param currentUserRole - The current user's role
 * @returns Array of assignable roles
 */
export const getAssignableRoles = (currentUserRole: UserRole): UserRole[] => {
  const currentLevel = roleHierarchy[currentUserRole] || 0;
  
  return Object.entries(roleHierarchy)
    .filter(([_, level]) => level < currentLevel)
    .map(([role, _]) => role as UserRole)
    .sort((a, b) => roleHierarchy[b] - roleHierarchy[a]);
};

/**
 * Check if user can assign a specific role
 * @param currentUserRole - The current user's role
 * @param targetRole - The role to be assigned
 * @returns boolean - Whether the current user can assign the target role
 */
export const canAssignRole = (currentUserRole: UserRole, targetRole: UserRole): boolean => {
  const currentLevel = roleHierarchy[currentUserRole] || 0;
  const targetLevel = roleHierarchy[targetRole] || 0;
  
  return currentLevel > targetLevel;
};

/**
 * Get all subordinate roles for a given role
 * @param role - The role to get subordinates for
 * @returns Array of subordinate roles
 */
export const getSubordinateRoles = (role: UserRole): UserRole[] => {
  const currentLevel = roleHierarchy[role] || 0;
  
  return Object.entries(roleHierarchy)
    .filter(([_, level]) => level < currentLevel)
    .map(([role, _]) => role as UserRole);
};

/**
 * Get role display information
 * @param role - The role to get info for
 * @returns Object with label, description, and scope
 */
export const getRoleInfo = (role: UserRole) => {
  const roleInfo = {
    super_admin: { 
      label: 'Super Administrator', 
      description: 'Global system owner with unrestricted access',
      scope: 'Global',
      color: '#dc2626'
    },
    admin: { 
      label: 'Administrator', 
      description: 'Platform admin for global configuration and backups',
      scope: 'Global',
      color: '#ea580c'
    },
    church_admin: { 
      label: 'Church Administrator', 
      description: 'Controls all records and users for a church',
      scope: 'Per-church',
      color: '#d97706'
    },
    priest: { 
      label: 'Priest', 
      description: 'Full record lifecycle authority',
      scope: 'Per-church',
      color: '#059669'
    },
    deacon: { 
      label: 'Deacon', 
      description: 'Limited sacrament authority',
      scope: 'Per-church',
      color: '#0891b2'
    },
    editor: { 
      label: 'Editor', 
      description: 'Can edit content and records, no admin authority',
      scope: 'Per-church',
      color: '#7c3aed'
    },
    viewer: { 
      label: 'Viewer', 
      description: 'Read-only access to records and views',
      scope: 'Per-church',
      color: '#64748b'
    },
    guest: { 
      label: 'Guest', 
      description: 'Unauthenticated access to public content only',
      scope: 'Public',
      color: '#9ca3af'
    }
  };
  
  return roleInfo[role] || roleInfo.guest;
};

/**
 * Check if role is a clergy role
 * @param role - The role to check
 * @returns boolean - Whether the role is clergy
 */
export const isClergyRole = (role: UserRole): boolean => {
  return ['priest', 'deacon'].includes(role);
};

/**
 * Check if role is an administrative role
 * @param role - The role to check
 * @returns boolean - Whether the role is administrative
 */
export const isAdminRole = (role: UserRole): boolean => {
  return ['super_admin', 'admin', 'church_admin'].includes(role);
};

/**
 * Get canonical roles array
 * @returns Array of all canonical roles
 */
export const getCanonicalRoles = (): UserRole[] => {
  return Object.keys(roleHierarchy) as UserRole[];
};

/**
 * Debug user role information
 * @param user - User object to debug
 */
export const debugUserRole = (user: User | null | undefined): void => {
  if (!user) {
    console.log('🔍 Role Debug: No user provided');
    return;
  }
  
  const originalRole = user.role;
  const normalizedRole = normalizeLegacyRole(originalRole as string);
  const roleInfo = getRoleInfo(normalizedRole);
  const level = roleHierarchy[normalizedRole];
  
  console.log('🔍 Role Debug:', {
    originalRole,
    normalizedRole,
    level,
    info: roleInfo,
    isLegacy: originalRole !== normalizedRole,
    subordinateRoles: getSubordinateRoles(normalizedRole),
    assignableRoles: getAssignableRoles(normalizedRole)
  });
};

/**
 * Validate if a role string is canonical
 * @param role - Role string to validate
 * @returns boolean - Whether the role is canonical
 */
export const isCanonicalRole = (role: string): role is UserRole => {
  return getCanonicalRoles().includes(role as UserRole);
};

/**
 * Get role migration mapping
 * @returns Object mapping legacy roles to canonical roles
 */
export const getRoleMigrationMap = (): Record<string, UserRole> => {
  return { ...legacyRoleMap };
};

// Legacy compatibility functions for AuthContext
/**
 * Get user privilege level (0-7)
 * @param user - User object
 * @returns number - Privilege level
 */
export const getUserLevel = (user: User | null | undefined): number => {
  if (!user?.role) return 0;
  const normalizedRole = normalizeLegacyRole(user.role as string);
  return roleHierarchy[normalizedRole] || 0;
};

/**
 * Check if user is super admin
 * @param user - User object
 * @returns boolean
 */
export const isSuperAdmin = (user: User | null | undefined): boolean => {
  return hasExactRole(user, 'super_admin');
};

/**
 * Check if user is admin (admin or super_admin)
 * @param user - User object
 * @returns boolean
 */
export const isAdmin = (user: User | null | undefined): boolean => {
  return hasRole(user, 'admin');
};

/**
 * Check if user can manage churches
 * @param user - User object
 * @returns boolean
 */
export const canManageChurches = (user: User | null | undefined): boolean => {
  return hasRole(user, 'admin'); // Admin and super_admin can manage churches
};

/**
 * Check if user can view dashboard
 * @param user - User object
 * @returns boolean
 */
export const canViewDashboard = (user: User | null | undefined): boolean => {
  return hasRole(user, 'viewer'); // All authenticated users can view dashboard
};

/**
 * Check if user can access OCR features
 * @param user - User object
 * @returns boolean
 */
export const canAccessOCR = (user: User | null | undefined): boolean => {
  return hasRole(user, 'editor'); // Editors and above can access OCR
};

/**
 * Check if user can manage provisioning
 * @param user - User object
 * @returns boolean
 */
export const canManageProvisioning = (user: User | null | undefined): boolean => {
  return hasRole(user, 'admin'); // Only admins can manage provisioning
};

/**
 * Check if user can manage another user
 * @param currentUser - The current user
 * @param targetUser - The user to be managed
 * @returns boolean
 */
export const canManageUser = (
  currentUser: User | null | undefined, 
  targetUser: User | null | undefined
): boolean => {
  if (!currentUser?.role || !targetUser?.role) return false;
  
  const currentLevel = getUserLevel(currentUser);
  const targetLevel = getUserLevel(targetUser);
  
  // Can only manage users with lower privilege level
  return currentLevel > targetLevel;
};

// Export role hierarchy for external use
export { roleHierarchy };
// === Auto-added to satisfy ChurchRecordsProvider import ===
// Grants record-management to common privileged roles.
// Accepts either a context object with roles, or an array/set of role strings.
export function canManageRecords(ctx: { roles?: string[] | Set<string> } | string[] | Set<string>): boolean {
  const toSet = (v: any): Set<string> =>
    v instanceof Set ? new Set([...v].map(x => String(x).toLowerCase()))
    : Array.isArray(v) ? new Set(v.map(x => String(x).toLowerCase()))
    : v && Array.isArray((v as any).roles) ? new Set((v as any).roles.map((x: any) => String(x).toLowerCase()))
    : v && (v as any).roles instanceof Set ? new Set([...(v as any).roles].map((x: any) => String(x).toLowerCase()))
    : new Set<string>();

  const roles = toSet(ctx);
  const allowed = new Set(['admin','records_admin','records_manager','records','priest','clerk']);
  for (const r of roles) if (allowed.has(r)) return true;
  return false;
}


const __toRoleSet = (v: any): Set<string> =>
  v instanceof Set ? new Set([...v].map(x => String(x).toLowerCase())) :
  Array.isArray(v) ? new Set(v.map(x => String(x).toLowerCase())) :
  v && Array.isArray((v as any).roles) ? new Set((v as any).roles.map((x: any) => String(x).toLowerCase())) :
  v && (v as any).roles instanceof Set ? new Set([...(v as any).roles].map((x: any) => String(x).toLowerCase())) :
  new Set<string>();


/** Conservative: who can create/disable users, change roles */
export function canManageUsers(ctx: { roles?: string[] | Set<string> } | string[] | Set<string>): boolean {
  const roles = __toRoleSet(ctx);
  const allowed = new Set(['admin','owner','it_admin','security_admin','user_admin']);
  for (const r of roles) if (allowed.has(r)) return true;
  return false;
}

/** Conservative: who can generate official certificates */
export function canGenerateCertificates(ctx: { roles?: string[] | Set<string> } | string[] | Set<string>): boolean {
  const roles = __toRoleSet(ctx);
  const allowed = new Set(['admin','priest','clerk','records_admin']);
  for (const r of roles) if (allowed.has(r)) return true;
  return false;
}
export function canManageCalendar(ctx: { roles?: string[] | Set<string> } | string[] | Set<string>): boolean { const roles = __toRoleSet(ctx); const allowed = new Set(['admin','priest','clerk','calendar_admin','events_manager','records_admin']); for (const r of roles) if (allowed.has(r)) return true; return false; }
export function canExportData(ctx: { roles?: string[] | Set<string> } | string[] | Set<string>): boolean { const roles = __toRoleSet(ctx); const allowed = new Set(['admin','records_admin','records_manager','data_exporter','auditor']); for (const r of roles) if (allowed.has(r)) return true; return false; }
export function canDeleteRecords(ctx: { roles?: string[] | Set<string> } | string[] | Set<string>): boolean { const roles = __toRoleSet(ctx); const allowed = new Set(['admin','records_admin']); for (const r of roles) if (allowed.has(r)) return true; return false; }
