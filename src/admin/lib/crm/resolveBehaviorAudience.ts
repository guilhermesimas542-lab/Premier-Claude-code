import { supabase } from "@/integrations/supabase/client";
import type { AudienceBehaviorFilter } from "../../hooks/crm/useAudiences";

/**
 * Resolve filtros de comportamento → lista de user_ids elegíveis.
 *
 * Estratégia client-side: lê events ia_tipster_analysis_opened da janela,
 * filtra por league_names / markets / source, agrupa por user_id, aplica
 * min_analyses e last_analysis_age_days.
 *
 * Quando o volume passar de ~500k events/mês, migrar pra view materializada
 * agregada por user_id (otimização Pilar 5).
 */

const DAY_MS = 86_400_000;

export interface BehaviorAudienceResult {
  /** Lista de user_ids que satisfazem os filtros. */
  user_ids: string[];
  /** Quantos events foram avaliados na janela. */
  events_scanned: number;
}

const EVENT_ANALYSIS_OPENED = "ia_tipster_analysis_opened";

export async function resolveBehaviorUserIds(
  filter: AudienceBehaviorFilter
): Promise<BehaviorAudienceResult> {
  const windowDays = filter.window_days ?? 30;
  const since = new Date(Date.now() - windowDays * DAY_MS).toISOString();

  let q: any = (supabase as any)
    .from("events")
    .select("user_id, properties, created_at")
    .eq("event_name", EVENT_ANALYSIS_OPENED)
    .gte("created_at", since)
    .not("user_id", "is", null)
    .limit(100000);

  const { data: events, error } = await q;
  if (error) {
    console.error("[resolveBehaviorUserIds] erro:", error);
    return { user_ids: [], events_scanned: 0 };
  }

  type Row = {
    user_id: string;
    properties: Record<string, any> | null;
    created_at: string;
  };
  const rows = (events ?? []) as Row[];

  // Filtros aplicados por evento
  const wantedLeagues = new Set(
    (filter.league_names ?? [])
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
  const wantedMarkets = (filter.markets ?? [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  function eventMatches(p: Row): boolean {
    const props = p.properties ?? {};
    // Source
    if (filter.source && filter.source !== "any") {
      if ((props.source ?? null) !== filter.source) return false;
    }
    // Liga
    if (wantedLeagues.size > 0) {
      const lg = String(props.league_name ?? "").trim().toLowerCase();
      if (!wantedLeagues.has(lg)) return false;
    }
    // Mercado — match parcial em main_market / alt_a / alt_b
    if (wantedMarkets.length > 0) {
      const markets = [
        props.main_market,
        props.alt_a_market,
        props.alt_b_market,
      ]
        .filter((m) => typeof m === "string")
        .map((m) => (m as string).toLowerCase());
      const anyMatch = markets.some((m) =>
        wantedMarkets.some((wm) => m.includes(wm))
      );
      if (!anyMatch) return false;
    }
    return true;
  }

  // Agrega por user_id
  type Agg = { count: number; last_at: number };
  const byUser = new Map<string, Agg>();
  for (const r of rows) {
    if (!eventMatches(r)) continue;
    const t = new Date(r.created_at).getTime();
    const cur = byUser.get(r.user_id);
    if (cur) {
      cur.count++;
      if (t > cur.last_at) cur.last_at = t;
    } else {
      byUser.set(r.user_id, { count: 1, last_at: t });
    }
  }

  const minAnalyses = filter.min_analyses ?? 1;
  const now = Date.now();
  const ageGte = filter.last_analysis_age_days?.gte;
  const ageLte = filter.last_analysis_age_days?.lte;

  const userIds: string[] = [];
  for (const [uid, agg] of byUser.entries()) {
    if (agg.count < minAnalyses) continue;
    if (ageGte != null) {
      const ageDays = (now - agg.last_at) / DAY_MS;
      if (ageDays < ageGte) continue;
    }
    if (ageLte != null) {
      const ageDays = (now - agg.last_at) / DAY_MS;
      if (ageDays > ageLte) continue;
    }
    userIds.push(uid);
  }

  return { user_ids: userIds, events_scanned: rows.length };
}

/**
 * Detecta se há filtro de behavior configurado (não vazio).
 */
export function hasBehaviorFilter(b: AudienceBehaviorFilter | undefined | null): boolean {
  if (!b) return false;
  return !!(
    (b.league_names && b.league_names.length > 0) ||
    (b.markets && b.markets.length > 0) ||
    (b.source && b.source !== "any") ||
    (typeof b.min_analyses === "number" && b.min_analyses > 1) ||
    b.last_analysis_age_days?.gte != null ||
    b.last_analysis_age_days?.lte != null
  );
}
