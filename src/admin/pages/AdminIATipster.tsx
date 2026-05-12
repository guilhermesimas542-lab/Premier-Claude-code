import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  RefreshCw,
  ExternalLink,
  FileText,
  MessageSquare,
  Radio,
  Loader2,
  TrendingUp,
  DollarSign,
  Recycle,
  Trophy,
  User,
  Calendar,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS — Claude Sonnet 4.5 pricing (USD per 1M tokens)
// ═══════════════════════════════════════════════════════════════════

const INPUT_PRICE_PER_M = 3.0;
const OUTPUT_PRICE_PER_M = 15.0;

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type MatchTypeFilter = "all" | "chat" | "live";

// Filtro para a tab "Partidas Analisadas" (kickoff)
type KickoffPeriod =
  | "today"
  | "tomorrow"
  | "next7d"
  | "yesterday"
  | "last7d"
  | "all"
  | "custom";

// Filtro para Cache & Reuso e Telemetria (data de geração)
type GenPeriod = "today" | "yesterday" | "7d" | "30d" | "custom";

interface Tip {
  id: string;
  match_key: string;
  match_type: string;
  generated_at: string;
  expires_at: string;
  tokens_input: number | null;
  tokens_output: number | null;
  tokens_cached: number | null;
  hit_count: number | null;
  last_used_at: string | null;
  generated_by_user_id: string | null;
  content: any;
  source_data: any;
}

// ═══════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════

function classifyMatchKey(key: string): "chat" | "live" | "other" {
  if (key.startsWith("chat_prematch:")) return "chat";
  if (key.startsWith("live_tip:")) return "live";
  return "other";
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function getKickoffRange(
  period: KickoffPeriod,
  customStart?: string,
  customEnd?: string
): { start: Date | null; end: Date | null } {
  const now = new Date();

  if (period === "today") {
    return { start: startOfDay(now), end: endOfDay(now) };
  }
  if (period === "tomorrow") {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    return { start: startOfDay(t), end: endOfDay(t) };
  }
  if (period === "next7d") {
    const t = new Date(now);
    t.setDate(t.getDate() + 7);
    return { start: startOfDay(now), end: endOfDay(t) };
  }
  if (period === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { start: startOfDay(y), end: endOfDay(y) };
  }
  if (period === "last7d") {
    const s = new Date(now);
    s.setDate(s.getDate() - 7);
    return { start: startOfDay(s), end: endOfDay(now) };
  }
  if (period === "custom" && customStart && customEnd) {
    return {
      start: startOfDay(new Date(customStart + "T00:00:00")),
      end: endOfDay(new Date(customEnd + "T00:00:00")),
    };
  }
  // "all" ou inválido
  return { start: null, end: null };
}

function getGenRange(
  period: GenPeriod,
  customStart?: string,
  customEnd?: string
): { start: string | undefined; end: string | undefined } {
  const now = new Date();

  if (period === "today") {
    return {
      start: startOfDay(now).toISOString(),
      end: endOfDay(now).toISOString(),
    };
  }
  if (period === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return {
      start: startOfDay(y).toISOString(),
      end: endOfDay(y).toISOString(),
    };
  }
  if (period === "7d") {
    const s = new Date(now);
    s.setDate(s.getDate() - 7);
    return {
      start: startOfDay(s).toISOString(),
      end: endOfDay(now).toISOString(),
    };
  }
  if (period === "30d") {
    const s = new Date(now);
    s.setDate(s.getDate() - 30);
    return {
      start: startOfDay(s).toISOString(),
      end: endOfDay(now).toISOString(),
    };
  }
  if (period === "custom" && customStart && customEnd) {
    return {
      start: startOfDay(new Date(customStart + "T00:00:00")).toISOString(),
      end: endOfDay(new Date(customEnd + "T00:00:00")).toISOString(),
    };
  }
  return { start: undefined, end: undefined };
}

function formatBrazilDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function formatBrazilDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function formatCostUSD(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

function calcCost(tokens_input: number, tokens_output: number): number {
  return (
    (tokens_input / 1_000_000) * INPUT_PRICE_PER_M +
    (tokens_output / 1_000_000) * OUTPUT_PRICE_PER_M
  );
}

async function fetchAllRecentTips(): Promise<Tip[]> {
  // Busca os últimos 500 tips (suficiente — cache TTL é 24h)
  const { data, error } = await supabase
    .from("ai_tip_cache")
    .select(
      "id, match_key, match_type, generated_at, expires_at, tokens_input, tokens_output, tokens_cached, hit_count, last_used_at, generated_by_user_id, content, source_data"
    )
    .or("match_key.like.chat_prematch:%,match_key.like.live_tip:%")
    .order("generated_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("fetchAllRecentTips error", error);
    return [];
  }
  return (data ?? []) as Tip[];
}

async function fetchTipsByGenRange(
  start: string | undefined,
  end: string | undefined
): Promise<Tip[]> {
  let query = supabase
    .from("ai_tip_cache")
    .select(
      "id, match_key, match_type, generated_at, expires_at, tokens_input, tokens_output, tokens_cached, hit_count, last_used_at, generated_by_user_id, content, source_data"
    )
    .or("match_key.like.chat_prematch:%,match_key.like.live_tip:%")
    .order("generated_at", { ascending: false })
    .limit(500);

  if (start) query = query.gte("generated_at", start);
  if (end) query = query.lte("generated_at", end);

  const { data, error } = await query;
  if (error) {
    console.error("fetchTipsByGenRange error", error);
    return [];
  }
  return (data ?? []) as Tip[];
}

function getKickoff(t: Tip): Date | null {
  const raw = t.source_data?.fixture?.kickoff_at;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// ═══════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {children}
    </button>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function MatchTypeBadge({ matchKey }: { matchKey: string }) {
  const cls = classifyMatchKey(matchKey);
  if (cls === "live") {
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <Radio className="w-3 h-3 text-red-500" />
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <MessageSquare className="w-3 h-3 text-primary" />
      Chat
    </span>
  );
}

function GenPeriodControls({
  period,
  setPeriod,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
}: {
  period: GenPeriod;
  setPeriod: (p: GenPeriod) => void;
  customStart: string;
  setCustomStart: (s: string) => void;
  customEnd: string;
  setCustomEnd: (s: string) => void;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">
        Período (data da geração)
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(["today", "yesterday", "7d", "30d", "custom"] as GenPeriod[]).map((p) => (
          <FilterPill key={p} active={period === p} onClick={() => setPeriod(p)}>
            {p === "today"
              ? "Hoje"
              : p === "yesterday"
              ? "Ontem"
              : p === "7d"
              ? "7 dias"
              : p === "30d"
              ? "30 dias"
              : "Custom"}
          </FilterPill>
        ))}
      </div>
      {period === "custom" && (
        <div className="flex items-center gap-2 mt-2">
          <Input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="w-auto"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <Input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="w-auto"
          />
        </div>
      )}
    </div>
  );
}

function KickoffPeriodControls({
  period,
  setPeriod,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
}: {
  period: KickoffPeriod;
  setPeriod: (p: KickoffPeriod) => void;
  customStart: string;
  setCustomStart: (s: string) => void;
  customEnd: string;
  setCustomEnd: (s: string) => void;
}) {
  const options: { value: KickoffPeriod; label: string }[] = [
    { value: "today", label: "Hoje" },
    { value: "tomorrow", label: "Amanhã" },
    { value: "next7d", label: "Próximos 7d" },
    { value: "yesterday", label: "Ontem" },
    { value: "last7d", label: "Últimos 7d" },
    { value: "all", label: "Todos" },
    { value: "custom", label: "Custom" },
  ];

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">
        Período (data do jogo)
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <FilterPill
            key={opt.value}
            active={period === opt.value}
            onClick={() => setPeriod(opt.value)}
          >
            {opt.label}
          </FilterPill>
        ))}
      </div>
      {period === "custom" && (
        <div className="flex items-center gap-2 mt-2">
          <Input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="w-auto"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <Input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="w-auto"
          />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB: PARTIDAS ANALISADAS (renomeada de Tips Geradas, filtro por kickoff)
// ═══════════════════════════════════════════════════════════════════

function PartidasAnalisadasTab() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<KickoffPeriod>("next7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [typeFilter, setTypeFilter] = useState<MatchTypeFilter>("all");
  const [search, setSearch] = useState("");
  const [detailTip, setDetailTip] = useState<Tip | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const list = await fetchAllRecentTips();
    setTips(list);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const range = getKickoffRange(period, customStart, customEnd);

    return tips.filter((t) => {
      // Filtro por tipo
      const cls = classifyMatchKey(t.match_key);
      if (typeFilter !== "all" && cls !== typeFilter) return false;

      // Filtro por kickoff
      if (range.start && range.end) {
        const ko = getKickoff(t);
        if (!ko) return false; // sem kickoff registrado → fora
        if (ko < range.start || ko > range.end) return false;
      }

      // Filtro por busca
      if (search.trim()) {
        const q = search.toLowerCase();
        const home = t.source_data?.fixture?.home?.name?.toLowerCase() ?? "";
        const away = t.source_data?.fixture?.away?.name?.toLowerCase() ?? "";
        const league = t.source_data?.fixture?.league?.name?.toLowerCase() ?? "";
        if (!home.includes(q) && !away.includes(q) && !league.includes(q))
          return false;
      }

      return true;
    });
  }, [tips, period, customStart, customEnd, typeFilter, search]);

  // Ordena por kickoff DESC (mais recente/próximo primeiro)
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ka = getKickoff(a);
      const kb = getKickoff(b);
      if (!ka && !kb) return 0;
      if (!ka) return 1;
      if (!kb) return -1;
      return kb.getTime() - ka.getTime();
    });
  }, [filtered]);

  const totalTokens = sorted.reduce(
    (acc, t) => acc + (t.tokens_input ?? 0) + (t.tokens_output ?? 0),
    0
  );
  const totalReusos = sorted.reduce((acc, t) => acc + (t.hit_count ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Partidas Analisadas</h2>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="space-y-3">
        <KickoffPeriodControls
          period={period}
          setPeriod={setPeriod}
          customStart={customStart}
          setCustomStart={setCustomStart}
          customEnd={customEnd}
          setCustomEnd={setCustomEnd}
        />

        <div>
          <div className="text-xs text-muted-foreground mb-1">Tipo</div>
          <div className="flex gap-1.5">
            <FilterPill
              active={typeFilter === "all"}
              onClick={() => setTypeFilter("all")}
            >
              Todos
            </FilterPill>
            <FilterPill
              active={typeFilter === "chat"}
              onClick={() => setTypeFilter("chat")}
            >
              Chat
            </FilterPill>
            <FilterPill
              active={typeFilter === "live"}
              onClick={() => setTypeFilter("live")}
            >
              Ao Vivo
            </FilterPill>
          </div>
        </div>

        <Input
          placeholder="Buscar por time ou liga..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          label="Partidas no período"
          value={String(sorted.length)}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KpiCard
          label="Tokens consumidos"
          value={totalTokens.toLocaleString("pt-BR")}
        />
        <KpiCard
          label="Reusos totais (hits)"
          value={String(totalReusos)}
          icon={<Recycle className="w-4 h-4" />}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
          Nenhuma partida analisada encontrada com esses filtros.
          {period !== "all" && (
            <div className="text-[10px] mt-1">
              Dica: jogos sem campo <code>kickoff_at</code> não aparecem em filtros de data.
            </div>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Tipo</th>
                <th className="text-left px-3 py-2">Jogo</th>
                <th className="text-left px-3 py-2">Liga</th>
                <th className="text-left px-3 py-2">Data do jogo</th>
                <th className="text-left px-3 py-2">Gerada em</th>
                <th className="text-right px-3 py-2">Tokens</th>
                <th className="text-right px-3 py-2">Reusos</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => {
                const home = t.source_data?.fixture?.home?.name ?? "—";
                const away = t.source_data?.fixture?.away?.name ?? "—";
                const league = t.source_data?.fixture?.league?.name ?? "—";
                const ko = getKickoff(t);
                const totalTk = (t.tokens_input ?? 0) + (t.tokens_output ?? 0);
                return (
                  <tr
                    key={t.id}
                    className="border-t hover:bg-muted/30 transition"
                  >
                    <td className="px-3 py-2">
                      <MatchTypeBadge matchKey={t.match_key} />
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {home} × {away}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {league}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {ko ? formatBrazilDateTime(ko.toISOString()) : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {formatBrazilDateTime(t.generated_at)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {totalTk.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {(t.hit_count ?? 0) > 0 ? (
                        <span className="font-semibold text-primary">
                          {t.hit_count}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetailTip(t)}
                      >
                        <FileText className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!detailTip} onOpenChange={(o) => !o && setDetailTip(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {detailTip?.source_data?.fixture?.home?.name ?? "—"} ×{" "}
              {detailTip?.source_data?.fixture?.away?.name ?? "—"}
            </DialogTitle>
          </DialogHeader>
          {detailTip && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Tipo:</span>{" "}
                  {classifyMatchKey(detailTip.match_key) === "live"
                    ? "Ao Vivo"
                    : "Chat"}
                </div>
                <div>
                  <span className="text-muted-foreground">Liga:</span>{" "}
                  {detailTip.source_data?.fixture?.league?.name ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Data do jogo:</span>{" "}
                  {(() => {
                    const ko = getKickoff(detailTip);
                    return ko ? formatBrazilDateTime(ko.toISOString()) : "—";
                  })()}
                </div>
                <div>
                  <span className="text-muted-foreground">Gerada em:</span>{" "}
                  {formatBrazilDateTime(detailTip.generated_at)}
                </div>
                <div>
                  <span className="text-muted-foreground">Expira em:</span>{" "}
                  {formatBrazilDateTime(detailTip.expires_at)}
                </div>
                <div>
                  <span className="text-muted-foreground">Reusos:</span>{" "}
                  {detailTip.hit_count ?? 0}
                </div>
                <div>
                  <span className="text-muted-foreground">Tokens input:</span>{" "}
                  {detailTip.tokens_input?.toLocaleString("pt-BR") ?? 0}
                </div>
                <div>
                  <span className="text-muted-foreground">Tokens output:</span>{" "}
                  {detailTip.tokens_output?.toLocaleString("pt-BR") ?? 0}
                </div>
                <div>
                  <span className="text-muted-foreground">Tokens cached:</span>{" "}
                  {detailTip.tokens_cached?.toLocaleString("pt-BR") ?? 0}
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">match_key:</span>{" "}
                  <code className="text-[10px]">{detailTip.match_key}</code>
                </div>
              </div>
              <div className="border-t pt-3">
                <div className="text-xs text-muted-foreground mb-2">
                  Markdown gerado pela IA:
                </div>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto whitespace-pre-wrap max-h-96">
                  {detailTip.content?.markdown ?? "(sem markdown)"}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB: CACHE & REUSO
// ═══════════════════════════════════════════════════════════════════

function CacheReusoTab() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<GenPeriod>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { start, end } = getGenRange(period, customStart, customEnd);
    const list = await fetchTipsByGenRange(start, end);
    setTips(list);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customStart, customEnd]);

  const totalTips = tips.length;
  const totalHits = tips.reduce((acc, t) => acc + (t.hit_count ?? 0), 0);
  const tipsWithHits = tips.filter((t) => (t.hit_count ?? 0) > 0).length;

  const avgTokensPerTip =
    totalTips > 0
      ? tips.reduce(
          (acc, t) => acc + (t.tokens_input ?? 0) + (t.tokens_output ?? 0),
          0
        ) / totalTips
      : 0;
  const tokensSaved = totalHits * avgTokensPerTip;

  const cacheHitRate =
    totalHits + totalTips > 0 ? (totalHits / (totalHits + totalTips)) * 100 : 0;

  const avgCostPerTip =
    totalTips > 0
      ? tips.reduce(
          (acc, t) => acc + calcCost(t.tokens_input ?? 0, t.tokens_output ?? 0),
          0
        ) / totalTips
      : 0;
  const costSaved = totalHits * avgCostPerTip;

  const topReused = useMemo(() => {
    return [...tips]
      .filter((t) => (t.hit_count ?? 0) > 0)
      .sort((a, b) => (b.hit_count ?? 0) - (a.hit_count ?? 0))
      .slice(0, 20);
  }, [tips]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cache &amp; Reuso</h2>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <GenPeriodControls
        period={period}
        setPeriod={setPeriod}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customEnd={customEnd}
        setCustomEnd={setCustomEnd}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Tips com reuso"
          value={`${tipsWithHits}/${totalTips}`}
          hint={`${
            totalTips > 0 ? ((tipsWithHits / totalTips) * 100).toFixed(1) : 0
          }% das tips`}
          icon={<Recycle className="w-4 h-4" />}
        />
        <KpiCard
          label="Reusos totais"
          value={totalHits.toLocaleString("pt-BR")}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KpiCard
          label="Tokens economizados"
          value={Math.round(tokensSaved).toLocaleString("pt-BR")}
          hint="estimativa: hits × média"
        />
        <KpiCard
          label="USD economizado"
          value={formatCostUSD(costSaved)}
          hint="estimativa com Sonnet 4.5"
          icon={<DollarSign className="w-4 h-4" />}
        />
      </div>

      <div className="rounded-lg border p-4">
        <div className="text-xs text-muted-foreground mb-2">Taxa de cache hit</div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(100, cacheHitRate)}%` }}
            />
          </div>
          <span className="text-sm font-semibold">
            {cacheHitRate.toFixed(1)}%
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-2">
          {totalHits} hits de cache em {totalTips + totalHits} pedidos totais
          (gerações + reusos)
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Top 20 tips mais reusadas</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : topReused.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
            Nenhuma tip foi reusada no período.
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Tipo</th>
                  <th className="text-left px-3 py-2">Jogo</th>
                  <th className="text-left px-3 py-2">Liga</th>
                  <th className="text-left px-3 py-2">Última vez usada</th>
                  <th className="text-right px-3 py-2">Reusos</th>
                </tr>
              </thead>
              <tbody>
                {topReused.map((t) => {
                  const home = t.source_data?.fixture?.home?.name ?? "—";
                  const away = t.source_data?.fixture?.away?.name ?? "—";
                  const league = t.source_data?.fixture?.league?.name ?? "—";
                  return (
                    <tr
                      key={t.id}
                      className="border-t hover:bg-muted/30 transition"
                    >
                      <td className="px-3 py-2">
                        <MatchTypeBadge matchKey={t.match_key} />
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {home} × {away}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {league}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {t.last_used_at
                          ? formatBrazilDateTime(t.last_used_at)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="font-semibold text-primary">
                          {t.hit_count}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB: TELEMETRIA
// ═══════════════════════════════════════════════════════════════════

function TelemetriaTab() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [emailsByUserId, setEmailsByUserId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<GenPeriod>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { start, end } = getGenRange(period, customStart, customEnd);
    const list = await fetchTipsByGenRange(start, end);
    setTips(list);

    const userIds = Array.from(
      new Set(
        list
          .map((t) => t.generated_by_user_id)
          .filter((id): id is string => !!id)
      )
    );
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, email")
        .in("id", userIds);
      const map: Record<string, string> = {};
      (users ?? []).forEach((u: any) => {
        map[u.id] = u.email ?? "";
      });
      setEmailsByUserId(map);
    } else {
      setEmailsByUserId({});
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customStart, customEnd]);

  const totalInput = tips.reduce((acc, t) => acc + (t.tokens_input ?? 0), 0);
  const totalOutput = tips.reduce((acc, t) => acc + (t.tokens_output ?? 0), 0);
  const totalCost = calcCost(totalInput, totalOutput);
  const avgCostPerTip = tips.length > 0 ? totalCost / tips.length : 0;

  const topGames = useMemo(() => {
    const map = new Map<string, { count: number; tokens: number; cost: number }>();
    tips.forEach((t) => {
      const home = t.source_data?.fixture?.home?.name;
      const away = t.source_data?.fixture?.away?.name;
      if (!home || !away) return;
      const key = `${home} × ${away}`;
      const tokens_in = t.tokens_input ?? 0;
      const tokens_out = t.tokens_output ?? 0;
      const cur = map.get(key) ?? { count: 0, tokens: 0, cost: 0 };
      map.set(key, {
        count: cur.count + 1,
        tokens: cur.tokens + tokens_in + tokens_out,
        cost: cur.cost + calcCost(tokens_in, tokens_out),
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
  }, [tips]);

  const topUsers = useMemo(() => {
    const map = new Map<string, { count: number; tokens: number; cost: number }>();
    tips.forEach((t) => {
      if (!t.generated_by_user_id) return;
      const tokens_in = t.tokens_input ?? 0;
      const tokens_out = t.tokens_output ?? 0;
      const cur = map.get(t.generated_by_user_id) ?? {
        count: 0,
        tokens: 0,
        cost: 0,
      };
      map.set(t.generated_by_user_id, {
        count: cur.count + 1,
        tokens: cur.tokens + tokens_in + tokens_out,
        cost: cur.cost + calcCost(tokens_in, tokens_out),
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
  }, [tips]);

  const daily = useMemo(() => {
    const map = new Map<string, { input: number; output: number; count: number }>();
    tips.forEach((t) => {
      const day = t.generated_at.split("T")[0];
      const cur = map.get(day) ?? { input: 0, output: 0, count: 0 };
      map.set(day, {
        input: cur.input + (t.tokens_input ?? 0),
        output: cur.output + (t.tokens_output ?? 0),
        count: cur.count + 1,
      });
    });
    const entries = Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    const maxTokens = Math.max(...entries.map(([, d]) => d.input + d.output), 1);
    return { entries, maxTokens };
  }, [tips]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Telemetria</h2>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <GenPeriodControls
        period={period}
        setPeriod={setPeriod}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customEnd={customEnd}
        setCustomEnd={setCustomEnd}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Custo total"
          value={formatCostUSD(totalCost)}
          hint="Claude Sonnet 4.5"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <KpiCard
          label="Análises geradas"
          value={tips.length.toLocaleString("pt-BR")}
          icon={<Sparkles className="w-4 h-4" />}
        />
        <KpiCard
          label="Tokens consumidos"
          value={(totalInput + totalOutput).toLocaleString("pt-BR")}
          hint={`${totalInput.toLocaleString("pt-BR")} in / ${totalOutput.toLocaleString("pt-BR")} out`}
        />
        <KpiCard
          label="Custo médio por tip"
          value={formatCostUSD(avgCostPerTip)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Tokens por dia</h3>
            </div>
            {daily.entries.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                Sem dados no período.
              </div>
            ) : (
              <div className="space-y-1.5">
                {daily.entries.map(([day, d]) => {
                  const total = d.input + d.output;
                  return (
                    <div key={day} className="flex items-center gap-2">
                      <span className="text-[10px] w-20 text-muted-foreground">
                        {day}
                      </span>
                      <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(total / daily.maxTokens) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] w-24 text-right">
                        {total.toLocaleString("pt-BR")} ({d.count})
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Top 10 jogos</h3>
              </div>
              {topGames.length === 0 ? (
                <div className="text-xs text-muted-foreground">Sem dados.</div>
              ) : (
                <div className="space-y-1.5">
                  {topGames.map(([key, d], i) => (
                    <div
                      key={key}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-muted-foreground w-5">{i + 1}.</span>
                      <span className="flex-1 truncate" title={key}>
                        {key}
                      </span>
                      <span className="font-semibold ml-2">{d.count}</span>
                      <span className="text-muted-foreground ml-2 w-16 text-right">
                        {formatCostUSD(d.cost)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">
                  Top 10 usuários (geração)
                </h3>
              </div>
              {topUsers.length === 0 ? (
                <div className="text-xs text-muted-foreground">Sem dados.</div>
              ) : (
                <div className="space-y-1.5">
                  {topUsers.map(([userId, d], i) => {
                    const email = emailsByUserId[userId] ?? userId.slice(0, 8);
                    return (
                      <div
                        key={userId}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-muted-foreground w-5">{i + 1}.</span>
                        <span className="flex-1 truncate" title={email}>
                          {email}
                        </span>
                        <span className="font-semibold ml-2">{d.count}</span>
                        <span className="text-muted-foreground ml-2 w-16 text-right">
                          {formatCostUSD(d.cost)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground italic">
            Preços usados: $3.00/M input, $15.00/M output (Claude Sonnet 4.5).
            Cache de prompt não é descontado no cálculo (estimativa por cima).
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

export default function AdminIATipster() {
  const [activeTab, setActiveTab] = useState("partidas");

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold">IA Tipster</h1>
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary">
          BETA
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Painel de gerenciamento das análises geradas pela IA Tipster.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="partidas">Partidas Analisadas</TabsTrigger>
          <TabsTrigger value="cache">Cache &amp; Reuso</TabsTrigger>
          <TabsTrigger value="telemetria">Telemetria</TabsTrigger>
          <TabsTrigger value="bugs">Bug Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="partidas" className="mt-4">
          <PartidasAnalisadasTab />
        </TabsContent>

        <TabsContent value="cache" className="mt-4">
          <CacheReusoTab />
        </TabsContent>

        <TabsContent value="telemetria" className="mt-4">
          <TelemetriaTab />
        </TabsContent>

        <TabsContent value="bugs" className="mt-4">
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Bug reports do IA Tipster vivem na tela de Feedback dos clientes,
              filtrados por origem.
            </div>
            <Link to="/admin/feedback">
              <Button variant="default">
                <ExternalLink className="w-3 h-3 mr-2" />
                Abrir Feedback dos Clientes
              </Button>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
