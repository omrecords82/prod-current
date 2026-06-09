/**
 * Normalize DATE column values to YYYY-MM-DD for API responses and MySQL writes.
 */

export function normalizeEntityDate(val: unknown): string | null {
  if (val == null || val === '') return null;

  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const s = String(val).trim();
  if (!s) return null;

  const isoPrefix = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefix) return isoPrefix[1];

  return null;
}

export function normalizeEntityRowDates<T extends Record<string, unknown>>(row: T): T {
  return {
    ...row,
    active_from: normalizeEntityDate(row.active_from),
    active_to: normalizeEntityDate(row.active_to),
  };
}
