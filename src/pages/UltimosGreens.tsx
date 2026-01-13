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
    <div className="min-h-screen bg-gradient-to-br from-[#0D0A1A] via-[#1A1030] to-[#0D0A1A] relative overflow-hidden">
      {/* Purple glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0D0A1A]/80 backdrop-blur-xl border-b border-purple-500/20">
        <div className="container max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-purple-300" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Últimos Greens</h1>
              <p className="text-xs text-purple-300/70">Somente entradas green. Histórico por data.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-4 py-6 relative z-10">
        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />
            ))}
          </div>
        ) : greens.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-purple-300/60">Sem greens registrados ainda.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date} className="space-y-2">
                {/* Date Header */}
                <div className="sticky top-[73px] z-20 py-2 bg-[#0D0A1A]/90 backdrop-blur-sm">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                    {formatDateHeader(date)}
                  </span>
                </div>

                {/* Green entries */}
                <div className="space-y-2">
                  {groupedGreens[date].map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/90 backdrop-blur-sm border border-gray-200/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {entry.homeTeam} x {entry.awayTeam}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{entry.market}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-base font-bold text-gray-800">
                          {entry.odd.toFixed(2)}
                        </span>
                        <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-green-500" />
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
                <div className="flex items-center gap-2 text-purple-300/60 text-sm">
                  <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                  Carregando mais...
                </div>
              )}
              {!hasMore && greens.length > 0 && (
                <p className="text-purple-300/50 text-sm">Fim do histórico</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default UltimosGreens;
