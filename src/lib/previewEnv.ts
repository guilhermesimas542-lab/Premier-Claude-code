/**
 * Detecta se a app está rodando em ambiente de preview (Lovable preview ou local dev).
 * Produção (premierfcapp.com, ultrateste111.lovable.app) retorna false.
 *
 * Usado para gatear features ainda não liberadas em produção (ex: IA Tipster).
 */
export function isPreviewEnv(): boolean {
  // Trava removida: IA Tipster e demais features liberadas em produção.
  return true;
}
