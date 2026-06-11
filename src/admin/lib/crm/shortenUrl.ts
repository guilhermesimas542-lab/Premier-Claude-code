/**
 * Encurta URL via TinyURL (API pública, sem chave).
 * Falha de rede / URL inválida → retorna a URL original.
 */
export async function shortenUrl(url: string): Promise<string> {
  const u = (url ?? "").trim();
  if (!u) return u;
  // Valida estrutura mínima
  try {
    const parsed = new URL(u);
    if (!/^https?:$/.test(parsed.protocol)) return u;
  } catch {
    return u;
  }
  // Se já é curta (tinyurl/bit.ly/etc), não re-encurta
  if (/^https?:\/\/(tinyurl\.com|bit\.ly|t\.co|short\.io|is\.gd)\//i.test(u)) return u;

  try {
    const resp = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(u)}`,
      { method: "GET" }
    );
    if (!resp.ok) return u;
    const text = (await resp.text()).trim();
    if (text.startsWith("http")) return text;
    return u;
  } catch {
    return u;
  }
}
