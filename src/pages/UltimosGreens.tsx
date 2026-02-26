import { ArrowLeft, Check, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface GreenEntry {
  id: string;
  date: string;
  team1_name: string | null;
  team2_name: string | null;
  market: string | null;
  odd: number | null;
  tier_required: string;
  addon_required: string | null;
  category: string | null;
  title: string;
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

const getPlanBadge = (tier: string, addon: string | null) => {
  if (addon === "alavancagem") return { label: "ALAVANCAGEM", color: "#FF8800" };
  if (addon === "desaltas") return { label: "ODDS ALTAS", color: "#00CC66" };
  const map: Record<string, { label: string; color: string }> = {
    free: { label: "FREE", color: "#888888" },
    basic: { label: "BASIC", color: "#3B82F6" },
    pro: { label: "PRO", color: "#A855F7" },
    ultra: { label: "ULTRA", color: "#EAB308" },
  };
  return map[tier] || { label: tier.toUpperCase(), color: "#888888" };
};

const PER_PAGE = 50;

const UltimosGreens = () => {
  const navigate = useNavigate();
  const [greens, setGreens] = useState<GreenEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all_time");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const offsetRef = useRef(0);
  const observerRef = useRef<HTMLDivElement>(null);

  const buildQuery = useCallback((offset: number) => {
    let q = (supabase
      .from("content_entries")
      .select("id, date, team1_name, team2_name, market, odd, tier_required, addon_required, category, title") as any)
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
      const d = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      q = q.gte("date", d);
    } else if (filter === "last_30") {
      const d = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      q = q.gte("date", d);
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

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const { data } = await buildQuery(offsetRef.current);
    const entries = (data as unknown as GreenEntry[]) ?? [];
    if (entries.length === 0) {
      setHasMore(false);
    } else {
      setGreens((prev) => [...prev, ...entries]);
      offsetRef.current += entries.length;
      setHasMore(entries.length === PER_PAGE);
    }
    setLoadingMore(false);
  }, [buildQuery, loadingMore, hasMore]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loadingMore]);

  // Group by date
  const groupedGreens = greens.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, GreenEntry[]>);
  const sortedDates = Object.keys(groupedGreens).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#000000" }}>
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(0,255,0,0.03)" }} />

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
              <h1 className="text-xl font-bold" style={{ color: "#FFFFFF" }}>Últimos Bilhetes</h1>
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
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1"
                      style={{
                        background: filter === "custom" ? "rgba(0,255,0,0.15)" : "rgba(255,255,255,0.05)",
                        border: filter === "custom" ? "1px solid rgba(0,255,0,0.5)" : "1px solid rgba(255,255,255,0.1)",
                        color: filter === "custom" ? "#00FF00" : "#AAAAAA",
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
                    <Button size="sm" className="w-full text-xs" onClick={() => setFilter("custom")}>
                      Aplicar
                    </Button>
                  </PopoverContent>
                </Popover>
              );
            }
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: filter === f.key ? "rgba(0,255,0,0.15)" : "rgba(255,255,255,0.05)",
                  border: filter === f.key ? "1px solid rgba(0,255,0,0.5)" : "1px solid rgba(255,255,255,0.1)",
                  color: filter === f.key ? "#00FF00" : "#AAAAAA",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" style={{ background: "rgba(0,255,0,0.05)" }} />
            ))}
          </div>
        ) : greens.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ color: "#007700" }}>Nenhum green encontrado para o período selecionado.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date} className="space-y-2">
                {/* Date Header */}
                <div className="sticky top-[73px] z-20 py-2 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.85)" }}>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FFFFFF" }}>
                    {formatDateHeader(date)}
                  </span>
                </div>

                {/* Green entries */}
                <div className="space-y-2">
                  {groupedGreens[date].map((entry) => {
                    const badge = getPlanBadge(entry.tier_required, entry.addon_required);
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl"
                        style={{ background: "rgba(0,20,0,0.5)", border: "1px solid rgba(0,255,0,0.15)" }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#FFFFFF" }}>
                            {entry.team1_name && entry.team2_name
                              ? `${entry.team1_name} x ${entry.team2_name}`
                              : entry.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs truncate" style={{ color: "#CCCCCC" }}>
                              {entry.market || entry.category || "—"}
                            </p>
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                              style={{
                                background: `${badge.color}22`,
                                color: badge.color,
                                border: `1px solid ${badge.color}44`,
                              }}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-base font-bold" style={{ color: "#FFFFFF" }}>
                            {entry.odd != null ? entry.odd.toFixed(2) : "—"}
                          </span>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(0,255,0,0.15)", border: "1px solid rgba(0,255,0,0.4)" }}>
                            <Check className="w-3.5 h-3.5" style={{ color: "#00FF00" }} />
                          </div>
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
    </div>
  );
};

export default UltimosGreens;
