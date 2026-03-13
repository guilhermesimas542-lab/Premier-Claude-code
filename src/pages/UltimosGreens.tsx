import { ArrowLeft, Check, Calendar, X, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getTierStyle, type TierColorStyle } from "@/lib/tierColors";

import { ShirtIcon } from "@/components/ShirtIcon";

interface GreenEntry {
  id: string;
  date: string;
  team1_name: string | null;
  team2_name: string | null;
  team1_shirt_variant: string | null;
  team1_primary_color: string | null;
  team1_secondary_color: string | null;
  team2_shirt_variant: string | null;
  team2_primary_color: string | null;
  team2_secondary_color: string | null;
  team1_logo_url: string | null;
  team2_logo_url: string | null;
  market: string | null;
  odd: number | null;
  tier_required: string;
  addon_required: string | null;
  category: string | null;
  category_explanation: string | null;
  condition_to_win: string | null;
  classification: string | null;
  justification: string | null;
  title: string;
  starts_at: string | null;
}

type FilterKey = "all_time" | "today" | "yesterday" | "last_7" | "last_30" | "custom";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all_time", label: "All Time" },
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "last_7", label: "7 Dias" },
  { key: "last_30", label: "30 Dias" },
  { key: "custom", label: "Personalizado" },
];

const formatDateHeader = (dateStr: string): string => {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (dateStr === today) return "HOJE";
  if (dateStr === yesterday) return "ONTEM";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};


const PER_PAGE = 50;

// ─── Detail Modal ───
const GreenDetailModal = ({ entry, onClose }: { entry: GreenEntry | null; onClose: () => void }) => {
  if (!entry) return null;
  const style = getTierStyle(entry.tier_required, entry.addon_required);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-5 space-y-5 animate-scale-in"
        style={{
          background: "#0D1929",
          borderTop: `3px solid ${style.border}`,
          border: "1.5px solid rgba(255,255,255,0.08)",
          boxShadow: `0 0 30px ${style.color}22, inset 0 1px 0 rgba(255,255,255,0.05)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full transition-colors"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <X className="w-4 h-4" style={{ color: "#888" }} />
        </button>

        {/* Badge */}
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${style.color}22`, color: style.color, border: `1px solid ${style.color}44` }}
          >
            {style.label}
          </span>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(0,255,0,0.1)", border: "1px solid rgba(0,255,0,0.3)" }}>
            <Check className="w-3 h-3" style={{ color: "#00FF00" }} />
            <span className="text-[10px] font-bold" style={{ color: "#00FF00" }}>GREEN</span>
          </div>
        </div>

        {/* Teams with Shirts */}
        {entry.team1_name && entry.team2_name ? (
          <div className="flex items-center justify-center gap-6 py-3">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {entry.team1_logo_url ? (
                  <img src={entry.team1_logo_url} alt={entry.team1_name || "Time 1"} style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 4 }} />
                ) : (
                  <ShirtIcon variant={(entry.team1_shirt_variant as "solid" | "stripes") || "solid"} primaryColor={entry.team1_primary_color || "#3B82F6"} secondaryColor={entry.team1_secondary_color || "#FFFFFF"} size={36} />
                )}
              </div>
              <span className="text-xs font-semibold text-center max-w-[80px] truncate" style={{ color: "#FFFFFF" }}>
                {entry.team1_name}
              </span>
            </div>

            <span className="text-lg font-black" style={{ color: "rgba(255,255,255,0.3)" }}>VS</span>

            <div className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {entry.team2_logo_url ? (
                  <img src={entry.team2_logo_url} alt={entry.team2_name || "Time 2"} style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 4 }} />
                ) : (
                  <ShirtIcon variant={(entry.team2_shirt_variant as "solid" | "stripes") || "solid"} primaryColor={entry.team2_primary_color || "#EF4444"} secondaryColor={entry.team2_secondary_color || "#FFFFFF"} size={36} />
                )}
              </div>
              <span className="text-xs font-semibold text-center max-w-[80px] truncate" style={{ color: "#FFFFFF" }}>
                {entry.team2_name}
              </span>
            </div>
          </div>
        ) : (
          <h3 className="text-lg font-bold text-center" style={{ color: "#FFFFFF" }}>{entry.title}</h3>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2">
          {entry.market && (
            <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "#666" }}>Mercado</p>
              <p className="text-xs font-semibold" style={{ color: "#FFFFFF" }}>{entry.market}</p>
            </div>
          )}
          {entry.odd != null && (
            <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "#666" }}>Odd</p>
              <p className="text-base font-black" style={{ color: style.color }}>{entry.odd.toFixed(2)}</p>
            </div>
          )}
          {entry.category && (
            <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "#666" }}>Categoria</p>
              <p className="text-xs font-semibold" style={{ color: "#FFFFFF" }}>{entry.category}</p>
            </div>
          )}
          {entry.classification && (
            <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "#666" }}>Confiança</p>
              <p className="text-xs font-semibold" style={{ color: "#FFFFFF" }}>{entry.classification}</p>
            </div>
          )}
        </div>

        {/* Condition */}
        {entry.condition_to_win && (
          <div className="rounded-lg p-3" style={{ background: `${style.color}08`, border: `1px solid ${style.color}22` }}>
            <p className="mb-1" style={{ color: "#94A3B8", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>Condição para Green</p>
            <p className="text-xs" style={{ color: "#CCCCCC" }}>{entry.condition_to_win}</p>
          </div>
        )}

        {/* Justification */}
        {entry.justification && (
          <div className="rounded-lg p-3" style={{ background: "rgba(0,255,0,0.03)", border: "1px solid rgba(0,255,0,0.1)" }}>
            <p className="mb-1" style={{ color: "#94A3B8", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>Justificativa</p>
            <p className="text-xs leading-relaxed" style={{ color: "#AAAAAA" }}>{entry.justification}</p>
          </div>
        )}

        {/* Result banner */}
        <div
          className="flex items-center justify-center gap-2"
          style={{
            background: "transparent",
            border: "1.5px solid #00FF7F",
            color: "#00FF7F",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            fontSize: 14,
            padding: "12px 0",
            borderRadius: 10,
            width: "100%",
            cursor: "default",
            letterSpacing: "0.05em",
            textTransform: "uppercase" as const,
          }}
        >
          <Trophy className="w-5 h-5" style={{ color: "#00FF7F" }} />
          <span>GREEN CONFIRMADO ✅</span>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ───
const UltimosGreens = () => {
  const navigate = useNavigate();
  const [greens, setGreens] = useState<GreenEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all_time");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<GreenEntry | null>(null);
  const offsetRef = useRef(0);
  const observerRef = useRef<HTMLDivElement>(null);

  const SELECT_FIELDS = "id, date, team1_name, team2_name, team1_shirt_variant, team1_primary_color, team1_secondary_color, team2_shirt_variant, team2_primary_color, team2_secondary_color, team1_logo_url, team2_logo_url, market, odd, tier_required, addon_required, category, category_explanation, condition_to_win, classification, justification, title, starts_at";

  const buildQuery = useCallback((offset: number) => {
    let q = (supabase
      .from("content_entries")
      .select(SELECT_FIELDS) as any)
      .eq("result", "green")
      .eq("active", true)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + PER_PAGE - 1);

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    if (filter === "today") q = q.eq("date", today);
    else if (filter === "yesterday") q = q.eq("date", yesterday);
    else if (filter === "last_7") {
      q = q.gte("date", new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]);
    } else if (filter === "last_30") {
      q = q.gte("date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]);
    } else if (filter === "custom") {
      if (customFrom) q = q.gte("date", customFrom);
      if (customTo) q = q.lte("date", customTo);
    }
    return q;
  }, [filter, customFrom, customTo]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    offsetRef.current = 0;
    const { data } = await buildQuery(0);
    const entries = (data as unknown as GreenEntry[]) ?? [];
    setGreens(entries);
    setHasMore(entries.length === PER_PAGE);
    offsetRef.current = entries.length;
    setLoading(false);
  }, [buildQuery]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // Navigation achievement
  useEffect(() => {
    (async () => {
      const { mockGetUser } = await import("@/mocks/user");
      const user = mockGetUser();
      if (!user) return;
      const { data: u } = await supabase.from('users').select('id').eq('email', user.email).maybeSingle();
      if (u?.id) await supabase.from('user_achievements').insert({ user_id: u.id, achievement_id: 'open_last_tickets' } as any).select();
    })();
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const { data } = await buildQuery(offsetRef.current);
    const entries = (data as unknown as GreenEntry[]) ?? [];
    if (entries.length === 0) setHasMore(false);
    else {
      setGreens((prev) => [...prev, ...entries]);
      offsetRef.current += entries.length;
      setHasMore(entries.length === PER_PAGE);
    }
    setLoadingMore(false);
  }, [buildQuery, loadingMore, hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loadingMore) loadMore(); },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loadingMore]);

  const groupedGreens = greens.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, GreenEntry[]>);
  const sortedDates = Object.keys(groupedGreens).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen relative overflow-hidden bg-navy-dark">

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(0,0,0,0.92)", borderBottom: "1px solid rgba(0,255,0,0.15)" }}>
        <div className="container max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-lg transition-colors"
              style={{ background: "rgba(0,255,0,0.05)", border: "1px solid rgba(0,255,0,0.25)" }}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: "#00FF00" }} />
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#FFFFFF" }}>Últimos Greens</h1>
              <p className="text-xs" style={{ color: "#AAAAAA" }}>Histórico completo de greens</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-4 relative z-10">
        {/* Filters */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {FILTERS.map((f) => {
            if (f.key === "custom") {
              return (
                <Popover key={f.key}>
                  <PopoverTrigger asChild>
                    <button
                      className="flex items-center gap-1 transition-all"
                      style={{
                        background: filter === "custom" ? "#00FF7F" : "transparent",
                        border: filter === "custom" ? "1.5px solid #00FF7F" : "1.5px solid rgba(255,255,255,0.07)",
                        color: filter === "custom" ? "#060D1E" : "rgba(255,255,255,0.6)",
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 700,
                        fontSize: 13,
                        padding: "6px 14px",
                        borderRadius: 20,
                        cursor: "pointer",
                      }}
                    >
                      <Calendar className="w-3 h-3" />
                      {f.label}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 bg-gray-900 border-gray-700 space-y-3 p-3">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">De</label>
                      <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="bg-gray-800 border-gray-700 text-white text-xs h-8" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Até</label>
                      <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="bg-gray-800 border-gray-700 text-white text-xs h-8" />
                    </div>
                    <Button size="sm" className="w-full text-xs" onClick={() => setFilter("custom")}>Aplicar</Button>
                  </PopoverContent>
                </Popover>
              );
            }
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="transition-all"
                style={{
                  background: filter === f.key ? "#00FF7F" : "transparent",
                  border: filter === f.key ? "1.5px solid #00FF7F" : "1.5px solid rgba(255,255,255,0.07)",
                  color: filter === f.key ? "#060D1E" : "rgba(255,255,255,0.6)",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  padding: "6px 14px",
                  borderRadius: 20,
                  cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" style={{ background: "rgba(0,255,0,0.05)" }} />
            ))}
          </div>
        ) : greens.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ color: "#007700" }}>Nenhum green encontrado para o período selecionado.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date} className="space-y-2.5">
                {/* Date Header */}
                <div className="sticky top-[73px] z-20 py-2 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.85)" }}>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FFFFFF" }}>
                    {formatDateHeader(date)}
                  </span>
                </div>

                {/* Green entries */}
                <div className="space-y-2.5">
                  {groupedGreens[date].map((entry, idx) => {
                    const style = getTierStyle(entry.tier_required, entry.addon_required);
                    return (
                      <div
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                        style={{
                          background: "#0D1929",
                          border: `1.5px solid ${style.border}`,
                          boxShadow: "none",
                          animationDelay: `${idx * 50}ms`,
                        }}
                      >
                        {/* Team shirts or icon */}
                        {entry.team1_name && entry.team2_name ? (
                          <div className="flex items-center -space-x-1 shrink-0">
                            {entry.team1_logo_url ? (
                              <img src={entry.team1_logo_url} alt={entry.team1_name || "Time 1"} style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 4 }} />
                            ) : (
                              <ShirtIcon variant={(entry.team1_shirt_variant as "solid" | "stripes") || "solid"} primaryColor={entry.team1_primary_color || "#3B82F6"} secondaryColor={entry.team1_secondary_color || "#FFFFFF"} size={24} />
                            )}
                            {entry.team2_logo_url ? (
                              <img src={entry.team2_logo_url} alt={entry.team2_name || "Time 2"} style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 4 }} />
                            ) : (
                              <ShirtIcon variant={(entry.team2_shirt_variant as "solid" | "stripes") || "solid"} primaryColor={entry.team2_primary_color || "#EF4444"} secondaryColor={entry.team2_secondary_color || "#FFFFFF"} size={24} />
                            )}
                          </div>
                        ) : (
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${style.color}15`, border: `1px solid ${style.color}30` }}
                          >
                            <Trophy className="w-4 h-4" style={{ color: style.color }} />
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#FFFFFF" }}>
                            {entry.team1_name && entry.team2_name
                              ? `${entry.team1_name} x ${entry.team2_name}`
                              : entry.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs truncate" style={{ color: "#BBBBBB" }}>
                              {entry.market || entry.category || "—"}
                            </p>
                            <span
                              style={{
                                background: `${style.color}26`,
                                border: `1px solid ${style.color}40`,
                                color: style.color,
                                fontFamily: "'Barlow Condensed', sans-serif",
                                fontWeight: 700,
                                fontSize: 11,
                                padding: "3px 8px",
                                borderRadius: 6,
                                letterSpacing: "0.05em",
                                textTransform: "uppercase" as const,
                              }}
                            >
                              {style.label}
                            </span>
                          </div>
                        </div>

                        {/* Odd */}
                        <div className="flex items-center shrink-0">
                          <span className="text-base font-black" style={{ color: style.color }}>
                            {entry.odd != null ? entry.odd.toFixed(2) : "—"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Infinite scroll trigger */}
            <div ref={observerRef} className="h-10 flex items-center justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "#AAAAAA" }}>
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(0,255,0,0.2)", borderTopColor: "#00FF00" }} />
                  Carregando mais...
                </div>
              )}
              {!hasMore && greens.length > 0 && (
                <p className="text-sm" style={{ color: "#888888" }}>Fim do histórico</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <GreenDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  );
};

export default UltimosGreens;
