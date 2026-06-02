export const LIFETIME_YEAR_THRESHOLD = 9000;

/**
 * Detecta se a data de unlimited_until representa "Vitalício"
 * (ano > 9000, ou data inválida que tratamos como vitalício).
 */
export const isUnlimitedLifetime = (
  date: string | null | undefined
): boolean => {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return true;
  return d.getFullYear() > LIFETIME_YEAR_THRESHOLD;
};

/**
 * Verifica se o acesso ilimitado está ATIVO (não expirou).
 * Trata vitalício (ano > 9000 ou data não parseável) como sempre ativo.
 */
export const isUnlimitedActive = (
  date: string | null | undefined
): boolean => {
  if (!date) return false;
  if (isUnlimitedLifetime(date)) return true;
  return new Date(date).getTime() > Date.now();
};

/**
 * Formata data de unlimited_until pra display.
 * Retorna "Vitalício" pra datas distantes, formato pt-BR caso contrário.
 */
export const formatUnlimitedUntil = (
  date: string | null | undefined
): string => {
  if (!date) return "";
  if (isUnlimitedLifetime(date)) return "Vitalício";
  return new Date(date).toLocaleDateString("pt-BR");
};
