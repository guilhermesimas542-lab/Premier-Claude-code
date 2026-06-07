// Cópia do helper client-side (src/admin/lib/crm/normalizePhone.ts) pra uso
// na edge function. Mantém em sincronia manualmente.
//
// Normaliza qualquer número BR pro formato que o SMS Dev exige:
// 55 + DDD + 9 + 8 dígitos (13 dígitos, só números).
export function normalizeBrazilMobile(
  raw: string | null | undefined
): { ok: boolean; phone: string; reason?: string } {
  let d = (raw || "").replace(/\D/g, "");
  if (!d) return { ok: false, phone: "", reason: "vazio" };

  d = d.replace(/^0+/, "");

  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);

  if (d.length < 10 || d.length > 11) {
    return { ok: false, phone: "", reason: `tamanho inválido (${d.length} dígitos)` };
  }

  const ddd = d.slice(0, 2);
  let local = d.slice(2);

  if (local.length === 8) local = "9" + local;

  if (local.length !== 9 || local[0] !== "9") {
    return { ok: false, phone: "", reason: "não parece celular" };
  }

  return { ok: true, phone: "55" + ddd + local };
}
