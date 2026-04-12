/**
 * Timezone-aware date formatting utilities.
 * All functions accept ISO strings or Date objects and format in the
 * user's LOCAL timezone using the browser's Intl API.
 */

// Cached at module load — safe guard for non-browser environments (tests, SSR)
const userLocale =
  typeof navigator !== 'undefined' ? navigator.language || 'es-ES' : 'es-ES'

const userTimeZone =
  typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'Europe/Madrid'

/** Returns "11 abr 2026" */
export function formatLocalDate(date: string | Date): string {
  return new Intl.DateTimeFormat(userLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: userTimeZone,
  }).format(new Date(date))
}

/** Returns "17:30" */
export function formatLocalTime(date: string | Date): string {
  return new Intl.DateTimeFormat(userLocale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: userTimeZone,
  }).format(new Date(date))
}

/** Returns "11 abr · 17:30" */
export function formatLocalDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat(userLocale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: userTimeZone,
  }).format(new Date(date))
}

/** Returns "lun 7 abr" */
export function formatLocalWeekDay(date: string | Date): string {
  return new Intl.DateTimeFormat(userLocale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: userTimeZone,
  }).format(new Date(date))
}

/** Returns ISO date string "2026-04-11" in local timezone */
export function toLocalDateString(date: string | Date): string {
  // en-CA locale reliably produces YYYY-MM-DD format
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: userTimeZone,
  }).format(new Date(date))
}
