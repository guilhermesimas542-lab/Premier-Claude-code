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
  Zap,
  Repeat,
} from "lucide-react";

type MatchTypeFilter = "all" | "chat" | "live";
type PeriodFilter = "today" | "yesterday" | "7d" | "30d" | "custom";

// Pricing Sonnet 4.5 (USD per 1M tokens)
const PRICE_INPUT_PER_MTOK = 3.0;
const PRICE_OUTPUT_PER_MTOK = 15.0;

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

function classifyMatchKey(key: string): "chat" | "live" | "other" {
  if (key.startsWith("chat_prematch:")) return "chat";
  if (key.startsWith("live_tip:")) return "live";
  return "other";
}

function getPeriodRange(period: PeriodFilter, customStart?: string, customEnd?: string) {
  const now = new Date();
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  if (period === "today") {
    return { start: startOfDay(now).toISOString(), end: endOfDay(now).toISOString() };
  }
  if (period === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { start: startOfDay(y).toISOString(), end: endOfDay(y).toISOString() };
  }
  if (period === "7d") {
    const s = new Date(now);
    s.setDate(s.getDate() - 7);
    return { start: startOfDay(s).toISOString(), end: endOfDay(now).toISOString() };
  }
  if (period === "30d") {
    const s = new Date(now);
    s.setDate(s.getDate() - 30);
    return { start: startOfDay(s).toISOString(), end: endOfDay(now).toISOString() };
  }
  if (period === "custom" && customStart && customEnd) {
    return {
      start: new Date(customStart).toISOString(),
      end: endOfDay(new Date(customEnd)).toISOString(),
    };
  }
  return { start: undefined, end: undefined };
}

function formatBrazilDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `há ${days}d`;
}

function estimateUsd(input: number, output: number): number {
  return (input / 1_000_000) * PRICE_INPUT_PER_MTOK + (output / 1_000_000) * PRICE_OUTPUT_PER_MTOK;
}

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

function PeriodFilterBar({
  period,
  setPeriod,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
}: {
  period: PeriodFilter;
  setPeriod: (p: PeriodFilter) => void;
  customStart: string;
  setCustomStart: (s: string) => void;
  customEnd: string;
  setCustomEnd: (s: string) => void;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">Período</div>
      <div className="flex flex-wrap gap-1.5">
        {(["today", "yesterday", "7d", "30d", "custom"] as PeriodFilter[]).map((p) => (
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

function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

/* ---------------- Tips Geradas ---------------- */

function TipsGeradasTab({
  period,
  setPeriod,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
}: {
  period: PeriodFilter;
  setPeriod: (p: PeriodFilter) => void;
  customStart: string;
  setCustomStart: (s: string) => void;
  customEnd: string;
  setCustomEnd: (s: string) => void;
}) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<MatchTypeFilter>("all");
  const [search, setSearch] = useState("");
  const [detailTip, setDetailTip] = useState<Tip | null>(null);

  const fetchTips = async () => {
    setLoading(true);
    try {
      const { start, end } = getPeriodRange(period, customStart, customEnd);
      let query = supabase
        .from("ai_tip_cache")
        .select(
          "id, match_key, match_type, generated_at, expires_at, tokens_input, tokens_output, tokens_cached, hit_count, last_used_at, generated_by_user_id, content, source_data"
        )
        .or("match_key.like.chat_prematch:%,match_key.like.live_tip:%")
        .order("generated_at", { ascending: false })
        .limit(200);

      if (start) query = query.gte("generated_at", start);
      if (end) query = query.lte("generated_at", end);

      const { data, error } = await query;
      if (error) {
        console.error("fetchTips error", error);
        return;
      }
      setTips((data ?? []) as Tip[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customStart, customEnd]);

  const filtered = useMemo(() => {
    return tips.filter((t) => {
      const cls = classifyMatchKey(t.match_key);
      if (typeFilter !== "all" && cls !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const home = t.source_data?.fixture?.home?.name?.toLowerCase() ?? "";
        const away = t.source_data?.fixture?.away?.name?.toLowerCase() ?? "";
        const league = t.source_data?.fixture?.league?.name?.toLowerCase() ?? "";
        if (!home.includes(q) && !away.includes(q) && !league.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [tips, typeFilter, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tips Geradas</h2>
        <Button onClick={fetchTips} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="space-y-3">
        <PeriodFilterBar
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
            <FilterPill active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>
              Todos
            </FilterPill>
            <FilterPill active={typeFilter === "chat"} onClick={() => setTypeFilter("chat")}>
              Chat
            </FilterPill>
            <FilterPill active={typeFilter === "live"} onClick={() => setTypeFilter("live")}>
              Ao Vivo
            </FilterPill>
          </div>
        </div>

        <div>
          <Input
            placeholder="Buscar por time ou liga..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard label="Tips no período" value={filtered.length} />
        <KpiCard
          label="Tokens consumidos"
          value={filtered
            .reduce((acc, t) => acc + (t.tokens_input ?? 0) + (t.tokens_output ?? 0), 0)
            .toLocaleString("pt-BR")}
        />
        <KpiCard
          label="Reusos totais (hits)"
          value={filtered.reduce((acc, t) => acc + (t.hit_count ?? 0), 0)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Nenhuma tip encontrada nos filtros atuais.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Tipo</th>
                <th className="text-left px-3 py-2">Jogo</th>
                <th className="text-left px-3 py-2">Liga</th>
                <th className="text-left px-3 py-2">Gerada em</th>
                <th className="text-right px-3 py-2">Tokens</th>
                <th className="text-right px-3 py-2">Reusos</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const cls = classifyMatchKey(t.match_key);
                const home = t.source_data?.fixture?.home?.name ?? "—";
                const away = t.source_data?.fixture?.away?.name ?? "—";
                const league = t.source_data?.fixture?.league?.name ?? "—";
                const totalTokens = (t.tokens_input ?? 0) + (t.tokens_output ?? 0);
                return (
                  <tr key={t.id} className="border-t hover:bg-muted/30 transition">
                    <td className="px-3 py-2">
                      {cls === "live" ? (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Radio className="w-3 h-3 text-red-500" />
                          Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <MessageSquare className="w-3 h-3 text-primary" />
                          Chat
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {home} × {away}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{league}</td>
                    <td className="px-3 py-2 text-xs">{formatBrazilDate(t.generated_at)}</td>
                    <td className="px-3 py-2 text-right text-xs">
                      {totalTokens.toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {(t.hit_count ?? 0) > 0 ? (
                        <span className="font-semibold text-primary">{t.hit_count}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setDetailTip(t)}>
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
                  {classifyMatchKey(detailTip.match_key) === "live" ? "Ao Vivo" : "Chat"}
                </div>
                <div>
                  <span className="text-muted-foreground">Liga:</span>{" "}
                  {detailTip.source_data?.fixture?.league?.name ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Gerada em:</span>{" "}
                  {formatBrazilDate(detailTip.generated_at)}
                </div>
                <div>
                  <span className="text-muted-foreground">Expira em:</span>{" "}
                  {formatBrazilDate(detailTip.expires_at)}
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
                <div>
                  <span className="text-muted-foreground">Reusos:</span>{" "}
                  {detailTip.hit_count ?? 0}
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

/* ---------------- Cache & Reuso ---------------- */

function CacheReusoTab({
  period,
  setPeriod,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
}: {
  period: PeriodFilter;
  setPeriod: (p: PeriodFilter) => void;
  customStart: string;
  setCustomStart: (s: string) => void;
  customEnd: string;
  setCustomEnd: (s: string) => void;
}) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { start, end } = getPeriodRange(period, customStart, customEnd);
      let query = supabase
        .from("ai_tip_cache")
        .select(
          "id, match_key, match_type, generated_at, expires_at, tokens_input, tokens_output, tokens_cached, hit_count, last_used_at, generated_by_user_id, content, source_data"
        )
        .or("match_key.like.chat_prematch:%,match_key.like.live_tip:%")
        .order("hit_count", { ascending: false })
        .limit(500);

      if (start) query = query.gte("generated_at", start);
      if (end) query = query.lte("generated_at", end);

      const { data, error } = await query;
      if (error) {
        console.error("fetch cache error", error);
        return;
      }
      setTips((data ?? []) as Tip[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customStart, customEnd]);

  const stats = useMemo(() => {
    const reused = tips.filter((t) => (t.hit_count ?? 0) > 0);
    const totalHits = tips.reduce((a, t) => a + (t.hit_count ?? 0), 0);
    const totalGenerations = tips.length;
    const avgTokensPerTip =
      totalGenerations > 0
        ? tips.reduce(
            (a, t) => a + (t.tokens_input ?? 0) + (t.tokens_output ?? 0),
            0
          ) / totalGenerations
        : 0;
    const avgInput =
      totalGenerations > 0
        ? tips.reduce((a, t) => a + (t.tokens_input ?? 0), 0) / totalGenerations
        : 0;
    const avgOutput =
      totalGenerations > 0
        ? tips.reduce((a, t) => a + (t.tokens_output ?? 0), 0) / totalGenerations
        : 0;
    const tokensSaved = avgTokensPerTip * totalHits;
    const usdSaved = estimateUsd(avgInput * totalHits, avgOutput * totalHits);
    const totalCalls = totalGenerations + totalHits;
    const hitRate = totalCalls > 0 ? (totalHits / totalCalls) * 100 : 0;
    return {
      reusedCount: reused.length,
      totalHits,
      tokensSaved: Math.round(tokensSaved),
      usdSaved,
      hitRate,
    };
  }, [tips]);

  const top20 = useMemo(() => tips.filter((t) => (t.hit_count ?? 0) > 0).slice(0, 20), [tips]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cache &amp; Reuso</h2>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <PeriodFilterBar
        period={period}
        setPeriod={setPeriod}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customEnd={customEnd}
        setCustomEnd={setCustomEnd}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Tips com reuso" value={stats.reusedCount} icon={Repeat} />
        <KpiCard label="Reusos totais" value={stats.totalHits} icon={TrendingUp} />
        <KpiCard
          label="Tokens economizados"
          value={stats.tokensSaved.toLocaleString("pt-BR")}
          icon={Zap}
          hint="estimativa baseada em média"
        />
        <KpiCard
          label="USD economizado"
          value={`$${stats.usdSaved.toFixed(4)}`}
          icon={DollarSign}
          hint="baseado em Sonnet 4.5"
        />
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium">Taxa de cache hit</div>
          <div className="text-xs font-bold text-primary">{stats.hitRate.toFixed(1)}%</div>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(stats.hitRate, 100)}%` }}
          />
        </div>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Top 20 tips mais reusadas</div>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : top20.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
            Nenhuma tip foi reusada ainda no período selecionado.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Tipo</th>
                  <th className="text-left px-3 py-2">Jogo</th>
                  <th className="text-right px-3 py-2">Reusos</th>
                  <th className="text-left px-3 py-2">Última vez</th>
                </tr>
              </thead>
              <tbody>
                {top20.map((t) => {
                  const cls = classifyMatchKey(t.match_key);
                  const home = t.source_data?.fixture?.home?.name ?? "—";
                  const away = t.source_data?.fixture?.away?.name ?? "—";
                  return (
                    <tr key={t.id} className="border-t hover:bg-muted/30 transition">
                      <td className="px-3 py-2 text-xs">
                        {cls === "live" ? (
                          <span className="inline-flex items-center gap-1">
                            <Radio className="w-3 h-3 text-red-500" />
                            Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-primary" />
                            Chat
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {home} × {away}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-primary">
                        {t.hit_count}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {formatRelative(t.last_used_at)}
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

/* ---------------- Telemetria ---------------- */

function TelemetriaTab({
  period,
  setPeriod,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
}: {
  period: PeriodFilter;
  setPeriod: (p: PeriodFilter) => void;
  customStart: string;
  setCustomStart: (s: string) => void;
  customEnd: string;
  setCustomEnd: (s: string) => void;
}) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { start, end } = getPeriodRange(period, customStart, customEnd);
      let query = supabase
        .from("ai_tip_cache")
        .select(
          "id, match_key, match_type, generated_at, expires_at, tokens_input, tokens_output, tokens_cached, hit_count, last_used_at, generated_by_user_id, content, source_data"
        )
        .or("match_key.like.chat_prematch:%,match_key.like.live_tip:%")
        .order("generated_at", { ascending: false })
        .limit(2000);

      if (start) query = query.gte("generated_at", start);
      if (end) query = query.lte("generated_at", end);

      const { data, error } = await query;
      if (error) {
        console.error("telemetria fetch error", error);
        return;
      }
      const list = (data ?? []) as Tip[];
      setTips(list);

      const userIds = Array.from(
        new Set(list.map((t) => t.generated_by_user_id).filter((x): x is string => !!x))
      );
      if (userIds.length > 0) {
        const { data: users, error: userErr } = await supabase
          .from("users")
          .select("id, email")
          .in("id", userIds);
        if (!userErr && users) {
          const map: Record<string, string> = {};
          users.forEach((u: any) => {
            map[u.id] = u.email;
          });
          setUserEmails(map);
        }
      } else {
        setUserEmails({});
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customStart, customEnd]);

  const summary = useMemo(() => {
    const totalIn = tips.reduce((a, t) => a + (t.tokens_input ?? 0), 0);
    const totalOut = tips.reduce((a, t) => a + (t.tokens_output ?? 0), 0);
    const totalUsd = estimateUsd(totalIn, totalOut);
    const count = tips.length;
    return {
      totalUsd,
      count,
      totalIn,
      totalOut,
      avgUsd: count > 0 ? totalUsd / count : 0,
    };
  }, [tips]);

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    tips.forEach((t) => {
      const d = new Date(t.generated_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "America/Sao_Paulo",
      });
      map.set(d, (map.get(d) ?? 0) + (t.tokens_input ?? 0) + (t.tokens_output ?? 0));
    });
    const arr = Array.from(map.entries()).map(([day, tokens]) => ({ day, tokens }));
    arr.sort((a, b) => a.day.localeCompare(b.day));
    return arr;
  }, [tips]);

  const maxDayTokens = useMemo(
    () => Math.max(1, ...byDay.map((d) => d.tokens)),
    [byDay]
  );

  const topMatches = useMemo(() => {
    const map = new Map<string, { name: string; count: number; usd: number }>();
    tips.forEach((t) => {
      const home = t.source_data?.fixture?.home?.name ?? "?";
      const away = t.source_data?.fixture?.away?.name ?? "?";
      const name = `${home} × ${away}`;
      const cur = map.get(name) ?? { name, count: 0, usd: 0 };
      cur.count += 1;
      cur.usd += estimateUsd(t.tokens_input ?? 0, t.tokens_output ?? 0);
      map.set(name, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [tips]);

  const topUsers = useMemo(() => {
    const map = new Map<string, { user_id: string; count: number; usd: number }>();
    tips.forEach((t) => {
      if (!t.generated_by_user_id) return;
      const cur = map.get(t.generated_by_user_id) ?? {
        user_id: t.generated_by_user_id,
        count: 0,
        usd: 0,
      };
      cur.count += 1;
      cur.usd += estimateUsd(t.tokens_input ?? 0, t.tokens_output ?? 0);
      map.set(t.generated_by_user_id, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
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

      <PeriodFilterBar
        period={period}
        setPeriod={setPeriod}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customEnd={customEnd}
        setCustomEnd={setCustomEnd}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Custo total (USD)"
          value={`$${summary.totalUsd.toFixed(4)}`}
          icon={DollarSign}
        />
        <KpiCard label="Análises geradas" value={summary.count} icon={Sparkles} />
        <KpiCard
          label="Tokens (in / out)"
          value={`${summary.totalIn.toLocaleString("pt-BR")} / ${summary.totalOut.toLocaleString("pt-BR")}`}
          icon={Zap}
        />
        <KpiCard
          label="Custo médio / tip"
          value={`$${summary.avgUsd.toFixed(4)}`}
          icon={TrendingUp}
        />
      </div>

      <div className="rounded-lg border p-4">
        <div className="text-sm font-medium mb-3">Tokens por dia</div>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : byDay.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Sem dados no período.
          </div>
        ) : (
          <div className="space-y-1.5">
            {byDay.map((d) => (
              <div key={d.day} className="flex items-center gap-2 text-xs">
                <div className="w-12 text-muted-foreground tabular-nums">{d.day}</div>
                <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-primary/80 transition-all"
                    style={{ width: `${(d.tokens / maxDayTokens) * 100}%` }}
                  />
                </div>
                <div className="w-20 text-right tabular-nums">
                  {d.tokens.toLocaleString("pt-BR")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium mb-3">Top 10 jogos analisados</div>
          {topMatches.length === 0 ? (
            <div className="text-xs text-muted-foreground">Sem dados.</div>
          ) : (
            <div className="space-y-1.5">
              {topMatches.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center justify-between text-xs gap-2 border-b last:border-0 pb-1.5"
                >
                  <div className="truncate flex-1">{m.name}</div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-muted-foreground tabular-nums">{m.count}×</span>
                    <span className="font-medium tabular-nums">${m.usd.toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <div className="text-sm font-medium mb-3">Top 10 usuários geradores</div>
          {topUsers.length === 0 ? (
            <div className="text-xs text-muted-foreground">Sem dados.</div>
          ) : (
            <div className="space-y-1.5">
              {topUsers.map((u) => (
                <div
                  key={u.user_id}
                  className="flex items-center justify-between text-xs gap-2 border-b last:border-0 pb-1.5"
                >
                  <div className="truncate flex-1">
                    {userEmails[u.user_id] ?? (
                      <code className="text-[10px]">{u.user_id.slice(0, 8)}…</code>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-muted-foreground tabular-nums">{u.count}×</span>
                    <span className="font-medium tabular-nums">${u.usd.toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */

export default function AdminIATipster() {
  const [activeTab, setActiveTab] = useState("tips");
  const [period, setPeriod] = useState<PeriodFilter>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

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
          <TabsTrigger value="tips">Tips Geradas</TabsTrigger>
          <TabsTrigger value="cache">Cache &amp; Reuso</TabsTrigger>
          <TabsTrigger value="telemetria">Telemetria</TabsTrigger>
          <TabsTrigger value="bugs">Bug Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="tips" className="mt-4">
          <TipsGeradasTab
            period={period}
            setPeriod={setPeriod}
            customStart={customStart}
            setCustomStart={setCustomStart}
            customEnd={customEnd}
            setCustomEnd={setCustomEnd}
          />
        </TabsContent>

        <TabsContent value="cache" className="mt-4">
          <CacheReusoTab
            period={period}
            setPeriod={setPeriod}
            customStart={customStart}
            setCustomStart={setCustomStart}
            customEnd={customEnd}
            setCustomEnd={setCustomEnd}
          />
        </TabsContent>

        <TabsContent value="telemetria" className="mt-4">
          <TelemetriaTab
            period={period}
            setPeriod={setPeriod}
            customStart={customStart}
            setCustomStart={setCustomStart}
            customEnd={customEnd}
            setCustomEnd={setCustomEnd}
          />
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
