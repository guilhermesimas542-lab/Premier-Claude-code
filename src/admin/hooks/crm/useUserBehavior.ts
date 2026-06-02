import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ANALYSIS_EVENTS = ["ia_tipster_analysis_opened", "ia_tipster_open_esportiva"];
const DAY_MS = 86_400_000;

export interface BehaviorBucket { label: string; count: number; share: number; }
export interface TimelineItem {
  created_at: string; event_name: string; source: string | null;
  league_name: string | null; fixture: string | null;
  main_market: string | null; main_odd: number | null;
}
export interface UserBehavior {
  total_analyses: number; total_esportiva_clicks: number;
  first_at: string | null; last_at: string | null; recency_days: number | null;
  analyses_30d: number; per_week: number | null; avg_main_odd: number | null;
  top_leagues: BehaviorBucket[]; top_markets: BehaviorBucket[];
  top_teams: BehaviorBucket[]; by_source: BehaviorBucket[]; timeline: TimelineItem[];
}
const EMPTY: UserBehavior = {
  total_analyses: 0, total_esportiva_clicks: 0, first_at: null, last_at: null,
  recency_days: null, analyses_30d: 0, per_week: null, avg_main_odd: null,
  top_leagues: [], top_markets: [], top_teams: [], by_source: [], timeline: [],
};
function toBuckets(rows: any[], picker: (p: Record<string, any>) => string | null | undefined, limit: number): BehaviorBucket[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = picker(r.properties ?? {});
    if (!k || String(k).trim().length === 0) continue;
    map.set(String(k), (map.get(String(k)) ?? 0) + 1);
  }
  const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
  const top = sorted[0]?.[1] ?? 0;
  return sorted.map(([label, count]) => ({ label, count, share: top > 0 ? count / top : 0 }));
}
const SOURCE_LABELS: Record<string, string> = { chat: "Chat", live: "Ao Vivo" };

export function useUserBehavior(userId: string | null, enabled: boolean = true) {
  const [data, setData] = useState<UserBehavior>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!userId || !enabled) return;
    setLoading(true); setError(null);
    const { data: events, error: err } = await (supabase as any)
      .from("events").select("event_name, properties, created_at")
      .eq("user_id", userId).in("event_name", ANALYSIS_EVENTS)
      .order("created_at", { ascending: false }).limit(500);
    if (err) { console.error("[useUserBehavior]", err); setError(err.message); setData(EMPTY); setLoading(false); return; }
    const rows = (events ?? []) as Array<{ event_name: string; properties: Record<string, any> | null; created_at: string; }>;
    if (rows.length === 0) { setData(EMPTY); setLoading(false); return; }
    const analyses = rows.filter((r) => r.event_name === "ia_tipster_analysis_opened");
    const esportiva = rows.filter((r) => r.event_name === "ia_tipster_open_esportiva");
    const lastAt = rows[0]?.created_at ?? null;
    const firstAt = rows[rows.length - 1]?.created_at ?? null;
    const now = Date.now();
    const recencyDays = lastAt ? Math.floor((now - new Date(lastAt).getTime()) / DAY_MS) : null;
    const since30 = now - 30 * DAY_MS;
    const analyses30d = analyses.filter((r) => new Date(r.created_at).getTime() >= since30).length;
    let perWeek: number | null = null;
    if (firstAt && lastAt && analyses.length > 0) {
      const spanMs = Math.max(new Date(lastAt).getTime() - new Date(firstAt).getTime(), DAY_MS);
      perWeek = analyses.length / Math.max(spanMs / (7 * DAY_MS), 1 / 7);
    }
    const odds = rows.map((r) => r.properties?.main_odd).filter((o): o is number => typeof o === "number" && isFinite(o) && o > 0);
    const avgMainOdd = odds.length > 0 ? odds.reduce((a, b) => a + b, 0) / odds.length : null;
    setData({
      total_analyses: analyses.length, total_esportiva_clicks: esportiva.length,
      first_at: firstAt, last_at: lastAt, recency_days: recencyDays, analyses_30d: analyses30d,
      per_week: perWeek, avg_main_odd: avgMainOdd,
      top_leagues: toBuckets(rows, (p) => p.league_name, 5),
      top_markets: toBuckets(rows, (p) => p.main_market, 5),
      top_teams: toBuckets(rows, (p) => (p.home && p.away ? `${p.home} x ${p.away}` : null), 5),
      by_source: toBuckets(rows, (p) => { const s = p.source; return s ? SOURCE_LABELS[s] ?? s : null; }, 4),
      timeline: rows.slice(0, 30).map((r) => { const p = r.properties ?? {}; return {
        created_at: r.created_at, event_name: r.event_name, source: p.source ?? null,
        league_name: p.league_name ?? null, fixture: p.home && p.away ? `${p.home} x ${p.away}` : null,
        main_market: p.main_market ?? null, main_odd: typeof p.main_odd === "number" ? p.main_odd : null,
      }; }),
    });
    setLoading(false);
  }, [userId, enabled]);
  useEffect(() => { if (userId && enabled) load(); else setData(EMPTY); }, [load, userId, enabled]);
  return { data, loading, error, reload: load };
}
