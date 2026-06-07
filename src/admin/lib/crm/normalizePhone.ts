// Normaliza qualquer número BR pro formato que o SMS Dev exige:
// 55 + DDD + 9 + 8 dígitos (13 dígitos, só números).
//
// Exemplos:
//   "(71) 98137-9776"   -> "5571981379776"
//   "71 8137-9776"      -> "5571981379776" (insere o 9)
//   "+55 (71) 98137..."  -> "5571981379776"
//   "071981379776"      -> "5571981379776" (remove 0 trunk)
export function normalizeBrazilMobile(
  raw: string | null | undefined
): { ok: boolean; phone: string; reason?: string } {
  let d = (raw || "").replace(/\D/g, ""); // remove (), espaços, -, +
  if (!d) return { ok: false, phone: "", reason: "vazio" };

  d = d.replace(/^0+/, ""); // tira zeros à esquerda (trunk/operadora)

  // remove DDI 55 pra normalizar o núcleo (DDD + número)
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);

  if (d.length < 10 || d.length > 11) {
    return { ok: false, phone: "", reason: `tamanho inválido (${d.length} dígitos)` };
  }

  const ddd = d.slice(0, 2);
  let local = d.slice(2);

  if (local.length === 8) local = "9" + local; // insere o 9 se faltar

  if (local.length !== 9 || local[0] !== "9") {
    return { ok: false, phone: "", reason: "não parece celular" };
  }

  return { ok: true, phone: "55" + ddd + local };
}
