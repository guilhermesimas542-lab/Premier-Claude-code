/**
 * Detecta se a app está rodando em ambiente de preview (Lovable preview ou local dev).
 * Produção (premierfcapp.com, ultrateste111.lovable.app) retorna false.
 *
 * Usado para gatear features ainda não liberadas em produção (ex: IA Tipster).
 */
export function isPreviewEnv(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return true;
  // Lovable preview tem prefixo "id-preview--"
  if (host.startsWith("id-preview--")) return true;
  return false;
}
