import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTodayInChile } from "@/lib/timezone";

/**
 * Ticker de odds da Home (Lâmina 1 — "Las mejores entradas del día").
 * Mostra as odds do dia passando devagar (marquee). Quando não há odds hoje,
 * mantém as últimas que estiveram no app (cache em localStorage).
 */
interface OddRow {
  id: string | number;
  team1_name: string | null;
  team1_logo_url: string | null;
  team2_name: string | null;
  team2_logo_url: string | null;
  condition_to_win: string | null;
  odd: number | null;
}

const CACHE_KEY = "clscore_ticker_odds";

function loadCache(): OddRow[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as OddRow[]) : [];
  } catch {
    return [];
  }
}

function TeamDot({ logo }: { logo: string | null }) {
  return (
    <span
      style={{
        width: 23,
        height: 23,
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,.12)",
        flex: "none",
        backgroundColor: "rgba(255,255,255,.06)",
        backgroundImage: logo ? `url(${logo})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "block",
      }}
    />
  );
}

function OddMiniCard({ odd }: { odd: OddRow }) {
  return (
    <div
      style={{
        flex: "none",
        width: 168,
        border: "1px solid rgba(255,255,255,.1)",
        borderRadius: 16,
        background:
          "linear-gradient(95deg, rgba(47,107,214,.45) -18%, rgba(11,12,16,.92) 40%, rgba(11,12,16,.94) 60%, rgba(199,154,46,.45) 118%), #0c0d11",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 8px 8px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <TeamDot logo={odd.team1_logo_url} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#DEDCD6", maxWidth: 62, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {odd.team1_name}
          </span>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#6a6c74" }}>VS</span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <TeamDot logo={odd.team2_logo_url} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#DEDCD6", maxWidth: 62, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {odd.team2_name}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 11px 12px", gap: 6 }}>
        <span style={{ fontSize: 11, color: "#9a9ca4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {odd.condition_to_win}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600, color: "#6fb58c", flexShrink: 0 }}>
          {odd.odd != null ? Number(odd.odd).toFixed(2) : "—"}
        </span>
      </div>
    </div>
  );
}

export function OddsTicker() {
  const [odds, setOdds] = useState<OddRow[]>(() => loadCache());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mapRows = (data: OddRow[] | null): OddRow[] =>
          (data ?? [])
            .filter((r) => r.team1_name && r.team2_name && r.odd != null)
            .map((r) => ({
              id: r.id,
              team1_name: r.team1_name,
              team1_logo_url: r.team1_logo_url,
              team2_name: r.team2_name,
              team2_logo_url: r.team2_logo_url,
              condition_to_win: r.condition_to_win,
              odd: r.odd,
            }));

        const today = getTodayInChile();
        const todayRes = await supabase
          .from("content_entries")
          .select("*")
          .eq("active", true)
          .eq("date", today)
          .order("created_at", { ascending: false });
        if (!alive) return;
        let rows = mapRows(todayRes.data as OddRow[] | null);

        // Fallback: sem odds pra hoje → últimas odds que estiveram no app (qualquer data)
        if (rows.length === 0) {
          const lastRes = await supabase
            .from("content_entries")
            .select("*")
            .eq("active", true)
            .order("date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(12);
          if (!alive) return;
          rows = mapRows(lastRes.data as OddRow[] | null);
        }

        if (rows.length > 0) {
          setOdds(rows);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(rows.slice(0, 20)));
          } catch {
            /* ignora */
          }
        }
      } catch {
        /* mantém o cache em caso de erro */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (odds.length === 0) return null;

  // duplica a lista pra dar o efeito de loop contínuo
  const loop = [...odds, ...odds];
  const durationSec = Math.max(18, odds.length * 6);

  return (
    <div
      style={{
        overflow: "hidden",
        margin: "18px 0",
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)",
        maskImage: "linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent)",
      }}
    >
      <style>{`@keyframes odds-ticker-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      <div
        style={{
          display: "flex",
          gap: 12,
          width: "max-content",
          animation: `odds-ticker-scroll ${durationSec}s linear infinite`,
          willChange: "transform",
        }}
      >
        {loop.map((o, i) => (
          <OddMiniCard key={`${o.id}-${i}`} odd={o} />
        ))}
      </div>
    </div>
  );
}
