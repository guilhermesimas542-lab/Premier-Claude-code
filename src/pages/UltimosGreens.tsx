import { ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface GreenEntry {
  id: string;
  date: string; // YYYY-MM-DD
  homeTeam: string;
  awayTeam: string;
  market: string;
  odd: number;
  status: "GREEN";
}

// Mock data - pronto para substituir por API
const generateMockGreens = (page: number, perPage: number): GreenEntry[] => {
  const baseGreens: Omit<GreenEntry, "id">[] = [
    { date: new Date().toISOString().split("T")[0], homeTeam: "Flamengo", awayTeam: "Palmeiras", market: "Mais de 1.5 gols", odd: 1.45, status: "GREEN" },
    { date: new Date().toISOString().split("T")[0], homeTeam: "Real Madrid", awayTeam: "Barcelona", market: "Ambas marcam", odd: 1.72, status: "GREEN" },
    { date: new Date().toISOString().split("T")[0], homeTeam: "Manchester City", awayTeam: "Liverpool", market: "Total de gols +2.5", odd: 1.55, status: "GREEN" },
    { date: new Date(Date.now() - 86400000).toISOString().split("T")[0], homeTeam: "PSG", awayTeam: "Lyon", market: "Resultado final 1", odd: 1.38, status: "GREEN" },
    { date: new Date(Date.now() - 86400000).toISOString().split("T")[0], homeTeam: "Bayern", awayTeam: "Dortmund", market: "Mais de 2.5 gols", odd: 1.62, status: "GREEN" },
    { date: new Date(Date.now() - 86400000).toISOString().split("T")[0], homeTeam: "Juventus", awayTeam: "Inter", market: "Handicap -1", odd: 2.10, status: "GREEN" },
    { date: new Date(Date.now() - 86400000).toISOString().split("T")[0], homeTeam: "Atlético MG", awayTeam: "Cruzeiro", market: "Empate", odd: 3.20, status: "GREEN" },
    { date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0], homeTeam: "Chelsea", awayTeam: "Arsenal", market: "Mais de 1.5 gols", odd: 1.48, status: "GREEN" },
    { date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0], homeTeam: "AC Milan", awayTeam: "Napoli", market: "Ambas marcam", odd: 1.65, status: "GREEN" },
    { date: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0], homeTeam: "Santos", awayTeam: "São Paulo", market: "Total +1.5", odd: 1.32, status: "GREEN" },
    { date: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0], homeTeam: "Corinthians", awayTeam: "Botafogo", market: "Resultado final 2", odd: 2.45, status: "GREEN" },
    { date: new Date(Date.now() - 4 * 86400000).toISOString().split("T")[0], homeTeam: "Benfica", awayTeam: "Porto", market: "Mais de 2.5 gols", odd: 1.78, status: "GREEN" },
    { date: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0], homeTeam: "Ajax", awayTeam: "PSV", market: "Ambas marcam", odd: 1.58, status: "GREEN" },
    { date: new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0], homeTeam: "Sporting", awayTeam: "Braga", market: "Handicap +0.5", odd: 1.42, status: "GREEN" },
    { date: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0], homeTeam: "Boca Juniors", awayTeam: "River Plate", market: "Mais de 1.5 gols", odd: 1.55, status: "GREEN" },
  ];

  // Simula paginação
  const startIndex = page * perPage;
  return baseGreens.slice(startIndex, startIndex + perPage).map((g, i) => ({
    ...g,
    id: `green-${page}-${i}`,
  }));
};

const formatDateHeader = (dateStr: string): string => {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (dateStr === today) return "HOJE";
  if (dateStr === yesterday) return "ONTEM";

  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};

const groupByDate = (entries: GreenEntry[]): Record<string, GreenEntry[]> => {
  return entries.reduce((acc, entry) => {
    if (!acc[entry.date]) {
      acc[entry.date] = [];
    }
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, GreenEntry[]>);
};

const UltimosGreens = () => {
  const navigate = useNavigate();
  const [greens, setGreens] = useState<GreenEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement>(null);

  const PER_PAGE = 30;

  // Load inicial
  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      // Simula delay de API
      await new Promise((r) => setTimeout(r, 500));
      const data = generateMockGreens(0, PER_PAGE);
      setGreens(data);
      setHasMore(data.length === PER_PAGE);
      setLoading(false);
    };
    loadInitial();
  }, []);

  // Load more
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await new Promise((r) => setTimeout(r, 300));
    const nextPage = page + 1;
    const data = generateMockGreens(nextPage, PER_PAGE);
    if (data.length === 0) {
      setHasMore(false);
    } else {
      setGreens((prev) => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(data.length === PER_PAGE);
    }
    setLoadingMore(false);
  }, [page, loadingMore, hasMore]);

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

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, loadingMore]);

  const groupedGreens = groupByDate(greens);
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
              <h1 className="text-xl font-bold" style={{ color: "#00FF00", textShadow: "0 0 10px rgba(0,255,0,0.3)" }}>Últimos Greens</h1>
              <p className="text-xs" style={{ color: "#007700" }}>Somente entradas green. Histórico por data.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-6 relative z-10">
        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" style={{ background: "rgba(0,255,0,0.05)" }} />
            ))}
          </div>
        ) : greens.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ color: "#007700" }}>Sem greens registrados ainda.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date} className="space-y-2">
                {/* Date Header */}
                <div className="sticky top-[73px] z-20 py-2 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.85)" }}>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#00CC00" }}>
                    {formatDateHeader(date)}
                  </span>
                </div>

                {/* Green entries */}
                <div className="space-y-2">
                  {groupedGreens[date].map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl"
                      style={{ background: "rgba(0,20,0,0.5)", border: "1px solid rgba(0,255,0,0.15)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#00FF00" }}>
                          {entry.homeTeam} x {entry.awayTeam}
                        </p>
                        <p className="text-xs truncate" style={{ color: "#00AA00" }}>{entry.market}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-base font-bold" style={{ color: "#00FF00" }}>
                          {entry.odd.toFixed(2)}
                        </span>
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(0,255,0,0.15)", border: "1px solid rgba(0,255,0,0.4)" }}>
                          <Check className="w-3.5 h-3.5" style={{ color: "#00FF00" }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Infinite scroll trigger */}
            <div ref={observerRef} className="h-10 flex items-center justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "#007700" }}>
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(0,255,0,0.2)", borderTopColor: "#00FF00" }} />
                  Carregando mais...
                </div>
              )}
              {!hasMore && greens.length > 0 && (
                <p className="text-sm" style={{ color: "#005500" }}>Fim do histórico</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default UltimosGreens;
