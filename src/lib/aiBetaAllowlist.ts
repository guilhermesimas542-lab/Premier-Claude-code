// Lista de emails autorizados para o beta privado do IA Tipster.
// Quando o beta for liberado geral, removemos os gates (frontend e backend)
// que importam essa lista.
export const AI_BETA_ALLOWLIST: string[] = [
  "teste@exemplo.com",
  "hugofm350@gmail.com",
  "gabriel.fedds@icloud.com",
].map(e => e.toLowerCase().trim());

export function isAIBetaUser(email?: string | null): boolean {
  if (!email) return false;
  return AI_BETA_ALLOWLIST.includes(email.toLowerCase().trim());
}
