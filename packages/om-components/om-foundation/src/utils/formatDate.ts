/**
 * Centralized Date Formatting Utility
 * Safely formats date values for display in record grids
 * 
 * Handles:
 * - ISO datetime strings (e.g., "2005-01-03T05:00:00.000Z")
 * - Date objects
 * - YYYY-MM-DD strings
 * - Null/undefined values
 * 
 * Prevents timezone drift by extracting date portion only
 */

/**
 * Format a record date value for display
 * Returns YYYY-MM-DD format (or empty string for null/undefined)
 * 
 * @param value - Date value (ISO string, Date object, YYYY-MM-DD string, or null/undefined)
 * @returns Formatted date string (YYYY-MM-DD) or empty string
 */
export function formatRecordDate(value: string | Date | null | undefined): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  // Handle empty string
  if (typeof value === 'string' && value.trim() === '') {
    return '';
  }

  // If already in YYYY-MM-DD format, return as-is
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // Handle ISO datetime strings (e.g., "2005-01-03T05:00:00.000Z")
  if (typeof value === 'string' && value.includes('T')) {
    // Extract date portion before 'T' (safe, no timezone shift)
    const datePart = value.split('T')[0];
    // Validate it's a valid date format
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart;
    }
  }

  // Handle Date objects
  if (value instanceof Date) {
    // Check if valid date
    if (isNaN(value.getTime())) {
      return '';
    }
    // Use UTC methods to prevent timezone drift
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Try to parse as date string
  if (typeof value === 'string') {
    // Try parsing as ISO date first
    const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) {
      return isoMatch[1];
    }

    // Try creating a Date object and extracting UTC date
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // If parsing fails, return empty string
      return '';
    }
  }

  // Fallback: return empty string for unhandled types
  return '';
}

/**
 * Format a record date with a fallback display value
 * Returns formatted date or "—" for empty values
 * 
 * @param value - Date value
 * @param emptyDisplay - What to display for empty values (default: "—")
 * @returns Formatted date string or emptyDisplay
 */
export function formatRecordDateWithFallback(
  value: string | Date | null | undefined,
  emptyDisplay: string = '—'
): string {
  const formatted = formatRecordDate(value);
  return formatted || emptyDisplay;
}
