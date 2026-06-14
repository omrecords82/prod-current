import type { User } from '@/types/orthodox-metrics.types';

function readStoredProfileName(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('orthodoxmetrics_profile_data');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { name?: string };
    const name = parsed?.name?.trim();
    if (!name || name === 'Unknown User') return null;
    return name;
  } catch {
    return null;
  }
}

/** Resolve a friendly label for the signed-in portal user. */
export function getPortalUserDisplayName(user: User | null | undefined): string {
  if (!user) return 'User';

  const nick = (user as User & { nick?: string }).nick?.trim();
  if (nick) return nick;

  const storedName = readStoredProfileName();
  if (storedName) return storedName;

  const first = user.first_name?.trim();
  const last = user.last_name?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;

  const username = user.username?.trim();
  if (username) return username;

  const email = user.email?.trim();
  if (email) return email.split('@')[0] || email;

  return 'User';
}

export function getPortalUserInitials(user: User | null | undefined): string {
  if (!user) return '?';

  const first = user.first_name?.trim();
  const last = user.last_name?.trim();
  if (first || last) {
    return `${(first?.[0] || '')}${(last?.[0] || '')}`.toUpperCase() || '?';
  }

  const label = getPortalUserDisplayName(user);
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return label.slice(0, 2).toUpperCase() || '?';
}
