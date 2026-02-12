/**
 * Date formatting utilities for HSE Monitoring
 * All dates from backend are in UTC, displayed in WIB (Asia/Jakarta)
 */

const TIMEZONE = 'Asia/Jakarta';
const LOCALE = 'id-ID';

/**
 * Format date for display (date only)
 * Example: "28 Jan 2024"
 */
export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  return d.toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: TIMEZONE
  });
}

/**
 * Format date for display (date with month and day only)
 * Example: "28 Jan"
 */
export function formatDateShort(date: string | Date | undefined | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  return d.toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: 'short',
    timeZone: TIMEZONE
  });
}

/**
 * Format datetime for display
 * Example: "28 Jan 2024, 14:30:00"
 */
export function formatDateTime(date: string | Date | undefined | null, includeSeconds = true): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIMEZONE
  };

  if (includeSeconds) {
    options.second = '2-digit';
  }

  return d.toLocaleString(LOCALE, options);
}

/**
 * Format time only
 * Example: "14:30:00"
 */
export function formatTime(date: string | Date | undefined | null, includeSeconds = true): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TIMEZONE
  };

  if (includeSeconds) {
    options.second = '2-digit';
  }

  return d.toLocaleTimeString(LOCALE, options);
}

/**
 * Format date for chart/graph axis (month + day)
 * Example: "01/28" (MM/DD format for charts)
 */
export function formatDateForChart(date: string | Date | undefined | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  return d.toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    timeZone: TIMEZONE
  });
}

/**
 * Format date for month/year header
 * Example: "Januari 2024"
 */
export function formatMonthYear(date: string | Date | undefined | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  return d.toLocaleDateString(LOCALE, {
    month: 'long',
    year: 'numeric',
    timeZone: TIMEZONE
  });
}

/**
 * Format date as long format
 * Example: "Minggu, 28 Januari 2024"
 */
export function formatDateLong(date: string | Date | undefined | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  return d.toLocaleDateString(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIMEZONE
  });
}

/**
 * Get current date/time in WIB
 */
export function nowWIB(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
}

/**
 * Format relative time (e.g., "5 menit lalu")
 */
export function formatRelativeTime(date: string | Date | undefined | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;

  return formatDate(d);
}
