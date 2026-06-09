/**
 * Format clergy tenure dates for display and API payloads.
 */

export function formatClergyDate(val: unknown): string {
  if (val == null || val === '') return '';

  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const s = String(val).trim();
  if (!s) return '';

  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : s;
}

export function clergyDateForApi(val: unknown): string | null {
  const formatted = formatClergyDate(val);
  return formatted || null;
}
