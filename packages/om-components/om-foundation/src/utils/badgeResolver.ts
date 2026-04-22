/**
 * Badge Resolver — centralized lifecycle resolution for state badges
 *
 * Computes effective badge visibility from server-provided badge state data.
 * Handles expiration, acknowledgment suppression, and state precedence.
 */

export type BadgeState = 'new' | 'recently_updated' | 'none';

export interface BadgeData {
  item_key: string;
  badge_state: BadgeState;
  visible_state: BadgeState;
  badge_started_at: string | null;
  badge_expires_at: string | null;
  badge_duration_days: number | null;
  badge_mode: 'auto' | 'manual' | 'acknowledged';
  badge_acknowledged_at: string | null;
  badge_acknowledged_by: string | null;
}

export interface ResolvedBadge {
  state: BadgeState;
  label: string | null;
  color: 'primary' | 'info' | undefined;
}

/**
 * Resolve a badge data entry to its display properties.
 * The server already computes visible_state, so this is mainly
 * a mapper from state → label + color for the UI.
 */
export function resolveBadge(data: BadgeData | undefined): ResolvedBadge {
  if (!data || data.visible_state === 'none') {
    return { state: 'none', label: null, color: undefined };
  }

  if (data.visible_state === 'new') {
    return { state: 'new', label: 'NEW', color: 'primary' };
  }

  if (data.visible_state === 'recently_updated') {
    return { state: 'recently_updated', label: 'UPDATED', color: 'info' };
  }

  return { state: 'none', label: null, color: undefined };
}

/**
 * Build a lookup map from an array of badge data entries.
 * Key is item_key for O(1) lookups in NavItem rendering.
 */
export function buildBadgeMap(badges: BadgeData[]): Map<string, BadgeData> {
  return new Map(badges.map(b => [b.item_key, b]));
}
