import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export const CHILE_TZ = 'America/Santiago';

/** Retorna a data de hoje no formato YYYY-MM-DD no timezone de Santiago */
export function getTodayInChile(): string {
  return formatInTimeZone(new Date(), CHILE_TZ, 'yyyy-MM-dd');
}

/** Retorna o objeto Date atual ajustado para o timezone de Santiago */
export function nowInChile(): Date {
  return toZonedTime(new Date(), CHILE_TZ);
}

/** Formata uma string UTC para data no padrão chileno (DD/MM/YYYY) */
export function formatDateCL(dateStr: string): string {
  return formatInTimeZone(new Date(dateStr), CHILE_TZ, 'dd/MM/yyyy');
}

/** Formata uma string UTC para hora no padrão chileno (HH:mm) */
export function formatTimeCL(dateStr: string): string {
  return formatInTimeZone(new Date(dateStr), CHILE_TZ, 'HH:mm');
}

/** Formata uma string UTC para data + hora no padrão chileno */
export function formatDateTimeCL(dateStr: string, format = 'dd/MM HH:mm'): string {
  return formatInTimeZone(new Date(dateStr), CHILE_TZ, format);
}
