/**
 * Date formatting utilities
 */

/**
 * Format a date object to a localized string
 *
 * @param date - The date to format
 * @returns Formatted date string in en-GB locale (DD/MM/YYYY, HH:MM)
 */
export const formatDate = (date: Date): string =>
  date.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
