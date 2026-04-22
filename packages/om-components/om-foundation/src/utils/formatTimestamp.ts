import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// Enable relative time plugin
dayjs.extend(relativeTime);

/**
 * Format timestamp for user-friendly display
 * @param date - Date to format (string, Date, or dayjs)
 * @returns Formatted timestamp string
 */
export function formatTimestamp(date: string | Date | null | undefined): string {
  if (!date) return '';
  return dayjs(date).format('MMM D, YYYY h:mm A');
}

/**
 * Format timestamp for compact display (no time)
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDateOnly(date: string | Date | null | undefined): string {
  if (!date) return '';
  return dayjs(date).format('MMM D, YYYY');
}

/**
 * Format timestamp for very compact display
 * @param date - Date to format
 * @returns Formatted time string
 */
export function formatTimeOnly(date: string | Date | null | undefined): string {
  if (!date) return '';
  return dayjs(date).format('h:mm A');
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param date - Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  return dayjs(date).fromNow();
}

/**
 * Format timestamp for detailed display with time
 * @param date - Date to format
 * @returns Detailed formatted timestamp
 */
export function formatTimestampDetailed(date: string | Date | null | undefined): string {
  if (!date) return '';
  return dayjs(date).format('MMMM D, YYYY [at] h:mm A');
}

/**
 * Format timestamp for ISO date input fields
 * @param date - Date to format
 * @returns ISO date string (YYYY-MM-DD)
 */
export function formatISODate(date: string | Date | null | undefined): string {
  if (!date) return '';
  return dayjs(date).format('YYYY-MM-DD');
}

/**
 * Format timestamp for ISO datetime-local input fields
 * @param date - Date to format
 * @returns ISO datetime string (YYYY-MM-DDTHH:mm)
 */
export function formatISODateTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  return dayjs(date).format('YYYY-MM-DDTHH:mm');
}export default formatTimestamp;
