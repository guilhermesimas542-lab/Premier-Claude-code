import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Lê events `ia_tipster_analysis_opened` da janela e devolve valores reais
 * distintos pra alimentar sugestões clicáveis no AudienceBuilder.
 *
 * Ordena por frequência decrescente, top ~60 por categoria.
 */
export interface BehaviorOptions {
  leagues: string[];
  markets: string[];
  teams: string[];
  loading: boolean;
}

const EVENT = "ia_tipster_analysis_opened";
const DAY_MS = 86_400_000;
const TOP_N = 60;

export function useBehaviorOptions(windowDays: number): BehaviorOptions {
  const [state, setState] = useState<BehaviorOptions>({
    leagues: [],
    markets: [],
    teams: [],
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));

    (async () => {
      const since = new Date(Date.now() - windowDays * DAY_MS).toISOString();
      const { data, error } = await (supabase as any)
        .from("events")
        .select("properties")
        .eq("event_name", EVENT)
        .gte("created_at", since)
        .limit(50000);

      if (cancelled) return;
      if (error) {
        console.error("[useBehaviorOptions] erro:", error);
        setState({ leagues: [], markets: [], teams: [], loading: false });
        return;
      }

      const leagueCount = new Map<string, number>();
      const marketCount = new Map<string, number>();
      const teamCount = new Map<string, number>();

      const bump = (m: Map<string, number>, raw: any) => {
        if (typeof raw !== "string") return;
        const v = raw.trim();
        if (!v) return;
        m.set(v, (m.get(v) ?? 0) + 1);
      };

      for (const row of (data ?? []) as Array<{ properties: any }>) {
        const p = row.properties ?? {};
        bump(leagueCount, p.league_name);
        bump(marketCount, p.main_market);
        bump(marketCount, p.alt_a_market);
        bump(marketCount, p.alt_b_market);
        bump(teamCount, p.home);
        bump(teamCount, p.away);
      }

      const topOf = (m: Map<string, number>) =>
        Array.from(m.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, TOP_N)
          .map(([k]) => k);

      setState({
        leagues: topOf(leagueCount),
        markets: topOf(marketCount),
        teams: topOf(teamCount),
        loading: false,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [windowDays]);

  return state;
}
