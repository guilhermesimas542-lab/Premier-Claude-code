import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const BRAZIL_TZ = 'America/Sao_Paulo';

/** Returns today's date string (YYYY-MM-DD) in São Paulo timezone */
export function getTodayInBrazil(): string {
  return formatInTimeZone(new Date(), BRAZIL_TZ, 'yyyy-MM-dd');
}

/** Returns current Date object adjusted to São Paulo timezone */
export function nowInBrazil(): Date {
  return toZonedTime(new Date(), BRAZIL_TZ);
}

/** Format a UTC date string to Brazilian date display */
export function formatDateBR(dateStr: string): string {
  return formatInTimeZone(new Date(dateStr), BRAZIL_TZ, 'dd/MM/yyyy');
}

/** Format a UTC date string to Brazilian time display */
export function formatTimeBR(dateStr: string): string {
  return formatInTimeZone(new Date(dateStr), BRAZIL_TZ, 'HH:mm');
}

/** Format a UTC date string to Brazilian date + time display */
export function formatDateTimeBR(dateStr: string, format = 'dd/MM HH:mm'): string {
  return formatInTimeZone(new Date(dateStr), BRAZIL_TZ, format);
}
