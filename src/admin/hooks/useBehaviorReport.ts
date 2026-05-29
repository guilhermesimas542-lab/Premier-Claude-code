import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook que agrega events de comportamento da IA Tipster pra relatórios.
 *
 * Estratégia: roda múltiplas queries paralelas filtradas por intervalo de
 * tempo e agrega no client. Volumes esperados nesta fase do produto (até
 * ~100k events/mês) cabem confortavelmente em SELECT direto.
 *
 * Quando volume passar de 1M events/mês, migrar pra view materializada
 * (mv_behavior_daily) atualizada via cron.
 */

export type Window = "7d" | "30d" | "90d";

const DAY_MS = 86_400_000;
function windowToMs(w: Window): number {
  return w === "7d" ? 7 * DAY_MS : w === "30d" ? 30 * DAY_MS : 90 * DAY_MS;
}

export interface Bucket {
  label: string;
  count: number;
  /** Share relativo ao total (0..1). */
  share: number;
}

export interface BehaviorReport {
  total_analyses: number;
  distinct_users: number;
  distinct_fixtures: number;
  distinct_leagues: number;
  top_leagues: Bucket[];
  top_markets: Bucket[];
  top_teams: Bucket[];
  by_source: Bucket[]; // chat vs live
  by_os: Bucket[];
  by_browser: Bucket[];
  /** Heatmap dia-da-semana × hora. 7 × 24 com contagem. */
  heatmap: number[][];
}

const EMPTY: BehaviorReport = {
  total_analyses: 0,
  distinct_users: 0,
  distinct_fixtures: 0,
  distinct_leagues: 0,
  top_leagues: [],
  top_markets: [],
  top_teams: [],
  by_source: [],
  by_os: [],
  by_browser: [],
  heatmap: Array.from({ length: 7 }, () => Array(24).fill(0)),
};

function toBuckets(
  rows: Array<{ key: string | null | undefined; count: number }>,
  limit: number
): Bucket[] {
  const total = rows.reduce((a, r) => a + r.count, 0);
  const sorted = [...rows]
    .filter((r) => r.key && String(r.key).trim().length > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
  return sorted.map((r) => ({
    label: String(r.key),
    count: r.count,
    share: total > 0 ? r.count / total : 0,
  }));
}

function countBy(
  arr: any[],
  picker: (row: any) => string | null | undefined
): Array<{ key: string | null | undefined; count: number }> {
  const map = new Map<string, number>();
  for (const row of arr) {
    const k = picker(row);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([key, count]) => ({ key, count }));
}

export function useBehaviorReport(initialWindow: Window = "30d") {
  const [data, setData] = useState<BehaviorReport>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [window, setWindow] = useState<Window>(initialWindow);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const since = new Date(Date.now() - windowToMs(window)).toISOString();

    // Lê eventos analysis_opened (nova feature). Quando volume crescer,
    // somar também ia_tipster_open_esportiva pra ter visão completa.
    const { data: events, error: err } = await (supabase as any)
      .from("events")
      .select("user_id, properties, created_at")
      .eq("event_name", "ia_tipster_analysis_opened")
      .gte("created_at", since)
      .limit(50000);

    if (err) {
      console.error("[useBehaviorReport] erro:", err);
      setError(err.message);
      toast.error(`Erro ao carregar relatório: ${err.message}`);
      setLoading(false);
      return;
    }

    const rows = (events ?? []) as Array<{
      user_id: string | null;
      properties: Record<string, any> | null;
      created_at: string;
    }>;

    const distinctUsers = new Set<string>();
    const distinctFixtures = new Set<string>();
    const distinctLeagues = new Set<string>();
    const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));

    for (const r of rows) {
      if (r.user_id) distinctUsers.add(r.user_id);
      const p = r.properties ?? {};
      const fx = p.fixture_id;
      if (fx) distinctFixtures.add(String(fx));
      const lg = p.league_name ?? p.league_id;
      if (lg) distinctLeagues.add(String(lg));

      const d = new Date(r.created_at);
      const dow = d.getDay();
      const hour = d.getHours();
      if (dow >= 0 && dow < 7 && hour >= 0 && hour < 24) {
        heatmap[dow][hour]++;
      }
    }

    const topLeagues = toBuckets(
      countBy(rows, (r) => r.properties?.league_name ?? null),
      10
    );
    const topMarkets = toBuckets(
      countBy(rows, (r) => r.properties?.main_market ?? null),
      10
    );
    const topTeams = toBuckets(
      countBy(rows, (r) => {
        const home = r.properties?.home;
        const away = r.properties?.away;
        return home && away ? `${home} x ${away}` : null;
      }),
      10
    );
    const bySource = toBuckets(
      countBy(rows, (r) => r.properties?.source ?? null),
      5
    );
    const byOs = toBuckets(
      countBy(rows, (r) => r.properties?.os ?? null),
      6
    );
    const byBrowser = toBuckets(
      countBy(rows, (r) => r.properties?.browser ?? null),
      6
    );

    setData({
      total_analyses: rows.length,
      distinct_users: distinctUsers.size,
      distinct_fixtures: distinctFixtures.size,
      distinct_leagues: distinctLeagues.size,
      top_leagues: topLeagues,
      top_markets: topMarkets,
      top_teams: topTeams,
      by_source: bySource,
      by_os: byOs,
      by_browser: byBrowser,
      heatmap,
    });
    setLoading(false);
  }, [window]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, window, setWindow, refresh: load };
}
