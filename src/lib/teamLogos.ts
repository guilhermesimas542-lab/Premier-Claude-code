// ============================================================
// team_logos — client dedicado (somente leitura) do bucket público
// de logos de times, hospedado num Supabase SEPARADO do app.
//
// - Usa a PUBLISHABLE key (segura no frontend). NUNCA service_role aqui.
// - Read-only: só faz SELECT em `teams.logo_url`. Escrita é bloqueada por RLS.
// - Cache em memória (Map) — não consulta o banco a cada render.
// Config via env (Vite): VITE_TEAMLOGOS_SUPABASE_URL / VITE_TEAMLOGOS_SUPABASE_KEY.
// ============================================================
import { createClient } from "@supabase/supabase-js";

const TEAMLOGOS_URL =
  import.meta.env.VITE_TEAMLOGOS_SUPABASE_URL ||
  "https://snykhoctikatcpvlcoow.supabase.co";
const TEAMLOGOS_KEY =
  import.meta.env.VITE_TEAMLOGOS_SUPABASE_KEY ||
  "sb_publishable_kV7vddwPAzT8J8AoAWmWsw_TdkFPrbK";

/** Cliente isolado — não compartilha sessão com o client principal do app. */
export const teamLogosClient = createClient(TEAMLOGOS_URL, TEAMLOGOS_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Cache em memória: nome (lower) -> logo_url | null. Promessas em voo são
// deduplicadas pra evitar N queries simultâneas do mesmo time.
const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

/**
 * Retorna a logo_url de um time (case-insensitive), ou null se não existir.
 * SELECT logo_url FROM teams WHERE name ILIKE teamName LIMIT 1.
 */
export async function getTeamLogo(teamName: string): Promise<string | null> {
  const name = (teamName ?? "").trim();
  if (!name) return null;
  const key = name.toLowerCase();

  if (cache.has(key)) return cache.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;

  const promise = (async () => {
    try {
      const { data, error } = await teamLogosClient
        .from("teams")
        .select("logo_url")
        .ilike("name", name)
        .limit(1)
        .maybeSingle();
      const url = error || !data ? null : ((data as any).logo_url ?? null);
      cache.set(key, url);
      return url;
    } catch {
      cache.set(key, null);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}
