export function formatDate(dateStr: string): string {
  if (!dateStr) return '\u2014';
  try {
    const safeStr = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr}T12:00:00` : dateStr;
    return new Date(safeStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  } catch {
    return formatDate(dateStr);
  }
}

export function getTodayFormatted(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const HONORIFIC_RE = /^(?:fr|father|rev|reverend|v\.?\s*rev|very\s+reverend|archpriest|protopresbyter|hieromonk|hierodeacon|deacon|protodeacon|bishop|archbishop|metropolitan)\b\.?/i;

export function formatClergy(name?: string | null): string | undefined {
  if (!name) return undefined;
  const trimmed = String(name).trim();
  if (!trimmed) return undefined;
  return HONORIFIC_RE.test(trimmed) ? trimmed : `Fr. ${trimmed}`;
}
