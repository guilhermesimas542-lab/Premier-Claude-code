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
  Activity,
  ThumbsUp,
  ThumbsDown,
  Bug,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { SyncEsportivaPanel } from "@/admin/components/SyncEsportivaPanel";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const INPUT_PRICE_PER_M = 3.0;
const OUTPUT_PRICE_PER_M = 15.0;

// ─── Helpers Claude model (B.3) ───
function getClaudeModel(tip: Tip): string | null {
  return tip.source_data?.claude_model_used ?? null;
}

function ModelBadge({ model }: { model: string | null }) {
  if (!model) return <span className="text-[10px] text-muted-foreground">—</span>;
  if (model.startsWith("claude-opus")) {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-600">
        Opus (fallback)
      </span>
    );
  }
  if (model.startsWith("claude-sonnet")) {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-500/20 text-green-600">
        Sonnet 4.5
      </span>
    );
  }
  return <span className="text-[10px] text-muted-foreground">{model}</span>;
}

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type MatchTypeFilter = "all" | "chat" | "live";
type GenPeriod = "today" | "yesterday" | "7d" | "30d" | "custom";
type KickoffPeriod =
  | "today"
  | "tomorrow"
  | "next7d"
  | "yesterday"
  | "last7d"
  | "all"
  | "custom";

// Chaves de ordenação para Tips Geradas
type TipsSortKey = "tipo" | "jogo" | "liga" | "gerada_em" | "tokens" | "reusos";
// Chaves de ordenação para Partidas Analisadas (tem coluna extra)
type PartidasSortKey =
  | "tipo"
  | "jogo"
  | "liga"
  | "data_jogo"
  | "gerada_em"
  | "tokens"
  | "reusos";

type SortDir = "asc" | "desc";

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

interface ApiFootballStatus {
  current: number;
  limit_day: number;
  plan?: string | null;
  end_subscription?: string | null;
}

interface BugReport {
  id: string;
  created_at: string;
  user_id: string | null;
  message: string | null;
  category: string | null;
  source: string | null;
  tip_cache_id: string | null;
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

function getGenRange(
  period: GenPeriod,
  customStart?: string,
  customEnd?: string
): { start: string | undefined; end: string | undefined } {
  const now = new Date();
  if (period === "today")
    return { start: startOfDay(now).toISOString(), end: endOfDay(now).toISOString() };
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
      start: startOfDay(new Date(customStart + "T00:00:00")).toISOString(),
      end: endOfDay(new Date(customEnd + "T00:00:00")).toISOString(),
    };
  }
  return { start: undefined, end: undefined };
}

function getKickoffRange(
  period: KickoffPeriod,
  customStart?: string,
  customEnd?: string
): { start: Date | null; end: Date | null } {
  const now = new Date();
  if (period === "today") return { start: startOfDay(now), end: endOfDay(now) };
  if (period === "tomorrow") {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    return { start: startOfDay(t), end: endOfDay(t) };
  }
  if (period === "next7d") {
    const t = new Date(now);
    t.setDate(t.getDate() + 7);
    // start = AGORA, não startOfDay — pra não pegar jogos já rolados hoje
    return { start: now, end: endOfDay(t) };
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
  return { start: null, end: null };
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

function formatCostUSD(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

function calcCost(tokens_input: number, tokens_output: number): number {
  return (
    (tokens_input / 1_000_000) * INPUT_PRICE_PER_M +
    (tokens_output / 1_000_000) * OUTPUT_PRICE_PER_M
  );
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

async function fetchAllRecentTips(): Promise<Tip[]> {
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

async function fetchEmailsByUserIds(
  userIds: string[]
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(userIds.filter((id) => !!id)));
  if (unique.length === 0) return {};
  const { data } = await supabase.from("users").select("id, email").in("id", unique);
  const map: Record<string, string> = {};
  (data ?? []).forEach((u: any) => {
    map[u.id] = u.email ?? "";
  });
  return map;
}

function getKickoff(t: Tip): Date | null {
  const raw = t.source_data?.fixture?.kickoff_at;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function compareValues(av: any, bv: any, dir: SortDir): number {
  if (av === null || av === undefined) return dir === "asc" ? 1 : -1;
  if (bv === null || bv === undefined) return dir === "asc" ? -1 : 1;
  if (typeof av === "string" && typeof bv === "string") {
    return dir === "asc"
      ? av.localeCompare(bv, "pt-BR")
      : bv.localeCompare(av, "pt-BR");
  }
  return dir === "asc" ? av - bv : bv - av;
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
  value: React.ReactNode;
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
  if (cls === "live")
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <Radio className="w-3 h-3 text-red-500" />
        Live
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <MessageSquare className="w-3 h-3 text-primary" />
      Chat
    </span>
  );
}

/**
 * Cabeçalho de coluna clicável que controla ordenação.
 * Genérico: aceita qualquer string como key.
 */
function SortableHeader<K extends string>({
  label,
  sortKey,
  currentSortKey,
  currentSortDir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: K;
  currentSortKey: K;
  currentSortDir: SortDir;
  onSort: (key: K) => void;
  align?: "left" | "right";
}) {
  const isActive = currentSortKey === sortKey;
  return (
    <th className={`px-3 py-2 ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 text-xs uppercase font-semibold hover:text-foreground transition-colors ${
          isActive ? "text-foreground" : "text-muted-foreground"
        } ${align === "right" ? "flex-row-reverse" : ""}`}
      >
        <span>{label}</span>
        {isActive ? (
          currentSortDir === "asc" ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )
        ) : (
          <ChevronsUpDown className="w-3 h-3 opacity-40" />
        )}
      </button>
    </th>
  );
}

function GenPeriodControls({
  period,
  setPeriod,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  label = "Período",
}: {
  period: GenPeriod;
  setPeriod: (p: GenPeriod) => void;
  customStart: string;
  setCustomStart: (s: string) => void;
  customEnd: string;
  setCustomEnd: (s: string) => void;
  label?: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
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

function TipDetailModal({
  tip,
  userEmail,
  onClose,
}: {
  tip: Tip | null;
  userEmail?: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!tip} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {tip?.source_data?.fixture?.home?.name ?? "—"} ×{" "}
            {tip?.source_data?.fixture?.away?.name ?? "—"}
          </DialogTitle>
        </DialogHeader>
        {tip && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Tipo:</span>{" "}
                {classifyMatchKey(tip.match_key) === "live" ? "Ao Vivo" : "Chat"}
              </div>
              <div>
                <span className="text-muted-foreground">Liga:</span>{" "}
                {tip.source_data?.fixture?.league?.name ?? "—"}
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Solicitada por:</span>{" "}
                <span className="font-medium">
                  {userEmail ||
                    (tip.generated_by_user_id
                      ? tip.generated_by_user_id.slice(0, 8) + "..."
                      : "(anônimo)")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Data do jogo:</span>{" "}
                {(() => {
                  const ko = getKickoff(tip);
                  return ko ? formatBrazilDateTime(ko.toISOString()) : "—";
                })()}
              </div>
              <div>
                <span className="text-muted-foreground">Gerada em:</span>{" "}
                {formatBrazilDateTime(tip.generated_at)}
              </div>
              <div>
                <span className="text-muted-foreground">Expira em:</span>{" "}
                {formatBrazilDateTime(tip.expires_at)}
              </div>
              <div>
                <span className="text-muted-foreground">Reusos:</span>{" "}
                {tip.hit_count ?? 0}
              </div>
              <div>
                <span className="text-muted-foreground">Tokens input:</span>{" "}
                {tip.tokens_input?.toLocaleString("pt-BR") ?? 0}
              </div>
              <div>
                <span className="text-muted-foreground">Tokens output:</span>{" "}
                {tip.tokens_output?.toLocaleString("pt-BR") ?? 0}
              </div>
              <div>
                <span className="text-muted-foreground">Tokens cached:</span>{" "}
                {tip.tokens_cached?.toLocaleString("pt-BR") ?? 0}
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">match_key:</span>{" "}
                <code className="text-[10px]">{tip.match_key}</code>
              </div>
            </div>
            <div className="border-t pt-3">
              <div className="text-xs text-muted-foreground mb-2">
                Markdown gerado pela IA:
              </div>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto whitespace-pre-wrap max-h-96">
                {tip.content?.markdown ?? "(sem markdown)"}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 1: TIPS GERADAS
// ═══════════════════════════════════════════════════════════════════

function TipsGeradasTab() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [emailsByUserId, setEmailsByUserId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<GenPeriod>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [typeFilter, setTypeFilter] = useState<MatchTypeFilter>("all");
  const [search, setSearch] = useState("");
  const [detailTip, setDetailTip] = useState<Tip | null>(null);
  const [sortKey, setSortKey] = useState<TipsSortKey>("gerada_em");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (key: TipsSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "gerada_em" ? "desc" : "asc");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const { start, end } = getGenRange(period, customStart, customEnd);
    const list = await fetchTipsByGenRange(start, end);
    setTips(list);
    const userIds = list
      .map((t) => t.generated_by_user_id)
      .filter((id): id is string => !!id);
    setEmailsByUserId(await fetchEmailsByUserIds(userIds));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
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
        if (!home.includes(q) && !away.includes(q) && !league.includes(q))
          return false;
      }
      return true;
    });
  }, [tips, typeFilter, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: any;
      let bv: any;
      switch (sortKey) {
        case "tipo":
          av = classifyMatchKey(a.match_key);
          bv = classifyMatchKey(b.match_key);
          break;
        case "jogo":
          av = `${a.source_data?.fixture?.home?.name ?? ""} ${
            a.source_data?.fixture?.away?.name ?? ""
          }`.toLowerCase();
          bv = `${b.source_data?.fixture?.home?.name ?? ""} ${
            b.source_data?.fixture?.away?.name ?? ""
          }`.toLowerCase();
          break;
        case "liga":
          av = (a.source_data?.fixture?.league?.name ?? "").toLowerCase();
          bv = (b.source_data?.fixture?.league?.name ?? "").toLowerCase();
          break;
        case "gerada_em":
          av = new Date(a.generated_at).getTime();
          bv = new Date(b.generated_at).getTime();
          break;
        case "tokens":
          av = (a.tokens_input ?? 0) + (a.tokens_output ?? 0);
          bv = (b.tokens_input ?? 0) + (b.tokens_output ?? 0);
          break;
        case "reusos":
          av = a.hit_count ?? 0;
          bv = b.hit_count ?? 0;
          break;
      }
      return compareValues(av, bv, sortDir);
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalCostUSD = filtered.reduce(
    (acc, t) => acc + calcCost(t.tokens_input ?? 0, t.tokens_output ?? 0),
    0
  );

  const detailEmail = detailTip?.generated_by_user_id
    ? emailsByUserId[detailTip.generated_by_user_id]
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tips Geradas</h2>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="space-y-3">
        <GenPeriodControls
          period={period}
          setPeriod={setPeriod}
          customStart={customStart}
          setCustomStart={setCustomStart}
          customEnd={customEnd}
          setCustomEnd={setCustomEnd}
          label="Período (data da geração)"
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

        <Input
          placeholder="Buscar por time ou liga..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {(() => {
        const opusCount = filtered.filter((t) => (getClaudeModel(t) ?? "").startsWith("claude-opus")).length;
        const opusPct = filtered.length > 0 ? (opusCount / filtered.length) * 100 : 0;
        const opusColor =
          opusPct >= 10 ? "text-red-500" : opusPct >= 5 ? "text-orange-500" : "text-muted-foreground";
        return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard
              label="Tips no período"
              value={String(filtered.length)}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <KpiCard
              label="Tokens consumidos"
              value={filtered
                .reduce((acc, t) => acc + (t.tokens_input ?? 0) + (t.tokens_output ?? 0), 0)
                .toLocaleString("pt-BR")}
            />
            <KpiCard
              label="USD gasto"
              value={formatCostUSD(totalCostUSD)}
              hint="Claude Sonnet 4.5"
              icon={<DollarSign className="w-4 h-4" />}
            />
            <KpiCard
              label="Reusos totais (hits)"
              value={String(filtered.reduce((acc, t) => acc + (t.hit_count ?? 0), 0))}
              icon={<Recycle className="w-4 h-4" />}
            />
            <KpiCard
              label="% Opus fallback"
              value={<span className={opusPct >= 5 ? opusColor : ""}>{opusPct.toFixed(1)}%</span> as any}
              hint={`${opusCount} de ${filtered.length}`}
            />
          </div>
        );
      })()}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
          Nenhuma tip encontrada nos filtros atuais.
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <SortableHeader<TipsSortKey>
                  label="Tipo"
                  sortKey="tipo"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHeader<TipsSortKey>
                  label="Jogo"
                  sortKey="jogo"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHeader<TipsSortKey>
                  label="Liga"
                  sortKey="liga"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHeader<TipsSortKey>
                  label="Gerada em"
                  sortKey="gerada_em"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHeader<TipsSortKey>
                  label="Tokens"
                  sortKey="tokens"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={toggleSort}
                  align="right"
                />
                <SortableHeader<TipsSortKey>
                  label="Reusos"
                  sortKey="reusos"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={toggleSort}
                  align="right"
                />
                <th className="text-left px-3 py-2 text-xs uppercase">Modelo</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => {
                const home = t.source_data?.fixture?.home?.name ?? "—";
                const away = t.source_data?.fixture?.away?.name ?? "—";
                const league = t.source_data?.fixture?.league?.name ?? "—";
                const totalTokens = (t.tokens_input ?? 0) + (t.tokens_output ?? 0);
                return (
                  <tr key={t.id} className="border-t hover:bg-muted/30 transition">
                    <td className="px-3 py-2">
                      <MatchTypeBadge matchKey={t.match_key} />
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {home} × {away}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{league}</td>
                    <td className="px-3 py-2 text-xs">
                      {formatBrazilDateTime(t.generated_at)}
                    </td>
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
                    <td className="px-3 py-2">
                      <ModelBadge model={getClaudeModel(t)} />
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

      <TipDetailModal
        tip={detailTip}
        userEmail={detailEmail}
        onClose={() => setDetailTip(null)}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 2: PARTIDAS ANALISADAS
// ═══════════════════════════════════════════════════════════════════

function PartidasAnalisadasTab() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [emailsByUserId, setEmailsByUserId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<KickoffPeriod>("next7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [typeFilter, setTypeFilter] = useState<MatchTypeFilter>("all");
  const [search, setSearch] = useState("");
  const [detailTip, setDetailTip] = useState<Tip | null>(null);
  const [sortKey, setSortKey] = useState<PartidasSortKey>("data_jogo");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (key: PartidasSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "data_jogo" || key === "gerada_em" ? "desc" : "asc");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const list = await fetchAllRecentTips();
    setTips(list);
    const userIds = list
      .map((t) => t.generated_by_user_id)
      .filter((id): id is string => !!id);
    setEmailsByUserId(await fetchEmailsByUserIds(userIds));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const range = getKickoffRange(period, customStart, customEnd);
    return tips.filter((t) => {
      const cls = classifyMatchKey(t.match_key);
      if (typeFilter !== "all" && cls !== typeFilter) return false;
      if (range.start && range.end) {
        const ko = getKickoff(t);
        if (!ko) return false;
        if (ko < range.start || ko > range.end) return false;
      }
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

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: any;
      let bv: any;
      switch (sortKey) {
        case "tipo":
          av = classifyMatchKey(a.match_key);
          bv = classifyMatchKey(b.match_key);
          break;
        case "jogo":
          av = `${a.source_data?.fixture?.home?.name ?? ""} ${
            a.source_data?.fixture?.away?.name ?? ""
          }`.toLowerCase();
          bv = `${b.source_data?.fixture?.home?.name ?? ""} ${
            b.source_data?.fixture?.away?.name ?? ""
          }`.toLowerCase();
          break;
        case "liga":
          av = (a.source_data?.fixture?.league?.name ?? "").toLowerCase();
          bv = (b.source_data?.fixture?.league?.name ?? "").toLowerCase();
          break;
        case "data_jogo": {
          const ka = getKickoff(a);
          const kb = getKickoff(b);
          av = ka ? ka.getTime() : null;
          bv = kb ? kb.getTime() : null;
          break;
        }
        case "gerada_em":
          av = new Date(a.generated_at).getTime();
          bv = new Date(b.generated_at).getTime();
          break;
        case "tokens":
          av = (a.tokens_input ?? 0) + (a.tokens_output ?? 0);
          bv = (b.tokens_input ?? 0) + (b.tokens_output ?? 0);
          break;
        case "reusos":
          av = a.hit_count ?? 0;
          bv = b.hit_count ?? 0;
          break;
      }
      return compareValues(av, bv, sortDir);
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalTokens = sorted.reduce(
    (acc, t) => acc + (t.tokens_input ?? 0) + (t.tokens_output ?? 0),
    0
  );
  const totalReusos = sorted.reduce((acc, t) => acc + (t.hit_count ?? 0), 0);
  const totalCostUSD = sorted.reduce(
    (acc, t) => acc + calcCost(t.tokens_input ?? 0, t.tokens_output ?? 0),
    0
  );

  const detailEmail = detailTip?.generated_by_user_id
    ? emailsByUserId[detailTip.generated_by_user_id]
    : undefined;

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

        <Input
          placeholder="Buscar por time ou liga..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          label="USD gasto"
          value={formatCostUSD(totalCostUSD)}
          hint="Claude Sonnet 4.5"
          icon={<DollarSign className="w-4 h-4" />}
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
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <SortableHeader<PartidasSortKey>
                  label="Tipo"
                  sortKey="tipo"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHeader<PartidasSortKey>
                  label="Jogo"
                  sortKey="jogo"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHeader<PartidasSortKey>
                  label="Liga"
                  sortKey="liga"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHeader<PartidasSortKey>
                  label="Data do jogo"
                  sortKey="data_jogo"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHeader<PartidasSortKey>
                  label="Gerada em"
                  sortKey="gerada_em"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={toggleSort}
                />
                <SortableHeader<PartidasSortKey>
                  label="Tokens"
                  sortKey="tokens"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={toggleSort}
                  align="right"
                />
                <SortableHeader<PartidasSortKey>
                  label="Reusos"
                  sortKey="reusos"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={toggleSort}
                  align="right"
                />
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
                  <tr key={t.id} className="border-t hover:bg-muted/30 transition">
                    <td className="px-3 py-2">
                      <MatchTypeBadge matchKey={t.match_key} />
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {home} × {away}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{league}</td>
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

      <TipDetailModal
        tip={detailTip}
        userEmail={detailEmail}
        onClose={() => setDetailTip(null)}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 3: CACHE & REUSO (sem ordenação por enquanto)
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
      ? tips.reduce((acc, t) => acc + (t.tokens_input ?? 0) + (t.tokens_output ?? 0), 0) /
        totalTips
      : 0;
  const tokensSaved = totalHits * avgTokensPerTip;
  const cacheHitRate =
    totalHits + totalTips > 0 ? (totalHits / (totalHits + totalTips)) * 100 : 0;

  // B.4: hit rate separado chat_prematch vs live_tip (exclui aux_*)
  const prematchTips = tips.filter((t) => t.match_key?.startsWith("chat_prematch:"));
  const liveTips = tips.filter((t) => t.match_key?.startsWith("live_tip:"));
  const prematchHits = prematchTips.filter((t) => (t.hit_count ?? 0) > 0).length;
  const liveHits = liveTips.filter((t) => (t.hit_count ?? 0) > 0).length;
  const prematchHitRate = prematchTips.length > 0 ? (prematchHits / prematchTips.length) * 100 : 0;
  const liveHitRate = liveTips.length > 0 ? (liveHits / liveTips.length) * 100 : 0;
  const avgCostPerTip =
    totalTips > 0
      ? tips.reduce((acc, t) => acc + calcCost(t.tokens_input ?? 0, t.tokens_output ?? 0), 0) /
        totalTips
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
          hint={`${totalTips > 0 ? ((tipsWithHits / totalTips) * 100).toFixed(1) : 0}% das tips`}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground mb-2">Hit rate Pré-jogo</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, prematchHitRate)}%` }} />
            </div>
            <span className="text-sm font-semibold">{prematchHitRate.toFixed(1)}%</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-2">
            {prematchHits} tips reusadas de {prematchTips.length} pré-jogo no período
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground mb-2">Hit rate Ao Vivo</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-red-500 transition-all" style={{ width: `${Math.min(100, liveHitRate)}%` }} />
            </div>
            <span className="text-sm font-semibold">{liveHitRate.toFixed(1)}%</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-2">
            {liveHits} tips reusadas de {liveTips.length} ao vivo no período
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <div className="text-xs text-muted-foreground mb-2">Taxa consolidada (contexto)</div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-muted-foreground/40" style={{ width: `${Math.min(100, cacheHitRate)}%` }} />
          </div>
          <span className="text-xs">{cacheHitRate.toFixed(1)}%</span>
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
                    <tr key={t.id} className="border-t hover:bg-muted/30 transition">
                      <td className="px-3 py-2">
                        <MatchTypeBadge matchKey={t.match_key} />
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {home} × {away}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{league}</td>
                      <td className="px-3 py-2 text-xs">
                        {t.last_used_at ? formatBrazilDateTime(t.last_used_at) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="font-semibold text-primary">{t.hit_count}</span>
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
// API-FOOTBALL STATUS PANEL
// ═══════════════════════════════════════════════════════════════════

function ApiFootballStatusPanel() {
  const [status, setStatus] = useState<ApiFootballStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "admin-api-football-status"
      );
      if (fnError) throw fnError;
      setStatus(data as ApiFootballStatus);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao buscar status");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const pct =
    status && status.limit_day > 0 ? (status.current / status.limit_day) * 100 : 0;
  const barColor =
    pct > 90
      ? "bg-red-500"
      : pct > 70
      ? "bg-orange-500"
      : pct > 40
      ? "bg-yellow-500"
      : "bg-primary";

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">API-Football — uso diário</h3>
        </div>
        <Button onClick={fetchStatus} variant="ghost" size="sm" disabled={loading}>
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading && !status ? (
        <div className="text-xs text-muted-foreground">Carregando...</div>
      ) : error ? (
        <div className="text-xs text-red-500">{error}</div>
      ) : status ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${barColor}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <span className="text-sm font-semibold">{pct.toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">
                {status.current.toLocaleString("pt-BR")}
              </span>{" "}
              / {status.limit_day.toLocaleString("pt-BR")} requests
            </span>
            <span className="text-muted-foreground">
              Restam {(status.limit_day - status.current).toLocaleString("pt-BR")}
            </span>
          </div>
          {(status.plan || status.end_subscription) && (
            <div className="text-[10px] text-muted-foreground pt-1 border-t">
              {status.plan && (
                <>
                  Plano: <span className="font-mono">{status.plan}</span>{" "}
                </>
              )}
              {status.end_subscription && <>· Renova em: {status.end_subscription}</>}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 4: TELEMETRIA
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
    const userIds = list
      .map((t) => t.generated_by_user_id)
      .filter((id): id is string => !!id);
    setEmailsByUserId(await fetchEmailsByUserIds(userIds));
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
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 10);
  }, [tips]);

  const topUsers = useMemo(() => {
    const map = new Map<string, { count: number; tokens: number; cost: number }>();
    tips.forEach((t) => {
      if (!t.generated_by_user_id) return;
      const tokens_in = t.tokens_input ?? 0;
      const tokens_out = t.tokens_output ?? 0;
      const cur = map.get(t.generated_by_user_id) ?? { count: 0, tokens: 0, cost: 0 };
      map.set(t.generated_by_user_id, {
        count: cur.count + 1,
        tokens: cur.tokens + tokens_in + tokens_out,
        cost: cur.cost + calcCost(tokens_in, tokens_out),
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 10);
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
    const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
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
        <KpiCard label="Custo médio por tip" value={formatCostUSD(avgCostPerTip)} />
      </div>

      <ApiFootballStatusPanel />
      <SyncEsportivaPanel />

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
              <div className="text-xs text-muted-foreground">Sem dados no período.</div>
            ) : (
              <div className="space-y-1.5">
                {daily.entries.map(([day, d]) => {
                  const total = d.input + d.output;
                  return (
                    <div key={day} className="flex items-center gap-2">
                      <span className="text-[10px] w-20 text-muted-foreground">{day}</span>
                      <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(total / daily.maxTokens) * 100}%` }}
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
                    <div key={key} className="flex items-center justify-between text-xs">
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
                <h3 className="text-sm font-semibold">Top 10 usuários (geração)</h3>
              </div>
              {topUsers.length === 0 ? (
                <div className="text-xs text-muted-foreground">Sem dados.</div>
              ) : (
                <div className="space-y-1.5">
                  {topUsers.map(([userId, d], i) => {
                    const email = emailsByUserId[userId] ?? userId.slice(0, 8);
                    return (
                      <div key={userId} className="flex items-center justify-between text-xs">
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
// TAB 5: BUG REPORTS
// ═══════════════════════════════════════════════════════════════════

function BugReportsTab() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [detailReport, setDetailReport] = useState<BugReport | null>(null);
  const [relatedTip, setRelatedTip] = useState<Tip | null>(null);
  const [loadingTip, setLoadingTip] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_feedback")
      .select("id, created_at, user_id, message, category, source, tip_cache_id")
      .eq("source", "ia-tipster")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("fetchReports error", error);
      setLoading(false);
      return;
    }
    const list = (data ?? []) as BugReport[];
    setReports(list);

    const userIds = Array.from(
      new Set(list.map((r) => r.user_id).filter((id): id is string => !!id))
    );
    if (userIds.length > 0) {
      const map = await fetchEmailsByUserIds(userIds);
      setEmails(map);
    } else {
      setEmails({});
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const openDetail = async (report: BugReport) => {
    setDetailReport(report);
    setRelatedTip(null);
    if (!report.tip_cache_id) return;
    setLoadingTip(true);
    const { data } = await supabase
      .from("ai_tip_cache")
      .select(
        "id, match_key, match_type, generated_at, expires_at, tokens_input, tokens_output, tokens_cached, hit_count, last_used_at, generated_by_user_id, content, source_data"
      )
      .eq("id", report.tip_cache_id)
      .maybeSingle();
    if (data) setRelatedTip(data as Tip);
    setLoadingTip(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Bug Reports</h2>
        <div className="flex items-center gap-2">
          <Button onClick={fetchReports} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Link to="/admin/feedback">
            <Button variant="ghost" size="sm">
              <ExternalLink className="w-3 h-3 mr-1" />
              Feedback completo
            </Button>
          </Link>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Mostrando até 100 reports recentes do IA Tipster. Para ver feedback de
        outras origens (app etc), abra a tela de Feedback dos clientes.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard
          label="Total reports"
          value={String(reports.length)}
          icon={<Bug className="w-4 h-4" />}
        />
        <KpiCard
          label="Bugs"
          value={String(reports.filter((r) => r.category === "bug").length)}
          icon={<ThumbsDown className="w-4 h-4" />}
        />
        <KpiCard
          label="Sugestões"
          value={String(reports.filter((r) => r.category === "sugestao").length)}
          icon={<ThumbsUp className="w-4 h-4" />}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
          Nenhum bug report do IA Tipster.
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Quando</th>
                <th className="text-left px-3 py-2">Usuário</th>
                <th className="text-left px-3 py-2">Tipo</th>
                <th className="text-left px-3 py-2">Comentário</th>
                <th className="text-left px-3 py-2">Tip relacionada</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const email = r.user_id ? emails[r.user_id] ?? r.user_id.slice(0, 8) : "—";
                const isPositive = r.category === "sugestao";
                const comment = r.message ?? "";
                const truncated =
                  comment.length > 80 ? comment.slice(0, 80) + "..." : comment;
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30 transition">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {formatBrazilDateTime(r.created_at)}
                    </td>
                    <td className="px-3 py-2 text-xs">{email}</td>
                    <td className="px-3 py-2">
                      {isPositive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-500">
                          <ThumbsUp className="w-3 h-3" />
                          {r.category}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500">
                          <Bug className="w-3 h-3" />
                          {r.category ?? "bug"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-md">
                      {truncated || <span className="italic">(sem comentário)</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.tip_cache_id ? (
                        <code className="text-[10px]">
                          {r.tip_cache_id.slice(0, 8)}...
                        </code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(r)}>
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

      <Dialog open={!!detailReport} onOpenChange={(o) => !o && setDetailReport(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Bug report</DialogTitle>
          </DialogHeader>
          {detailReport && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Quando:</span>{" "}
                  {formatBrazilDateTime(detailReport.created_at)}
                </div>
                <div>
                  <span className="text-muted-foreground">Usuário:</span>{" "}
                  {detailReport.user_id
                    ? emails[detailReport.user_id] ?? detailReport.user_id
                    : "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo:</span>{" "}
                  {detailReport.category ?? "bug"}
                </div>
                <div>
                  <span className="text-muted-foreground">Origem:</span>{" "}
                  {detailReport.source}
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="text-xs text-muted-foreground mb-1">
                  Comentário do usuário:
                </div>
                <div className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                  {detailReport.message || (
                    <span className="italic text-muted-foreground">(sem comentário)</span>
                  )}
                </div>
              </div>

              {detailReport.tip_cache_id && (
                <div className="border-t pt-3">
                  <div className="text-xs text-muted-foreground mb-2">
                    Tip relacionada:
                  </div>
                  {loadingTip ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Carregando análise...
                    </div>
                  ) : relatedTip ? (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold">
                        {relatedTip.source_data?.fixture?.home?.name ?? "—"} ×{" "}
                        {relatedTip.source_data?.fixture?.away?.name ?? "—"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {relatedTip.source_data?.fixture?.league?.name ?? "—"} ·
                        Gerada em {formatBrazilDateTime(relatedTip.generated_at)}
                      </div>
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto whitespace-pre-wrap max-h-64">
                        {relatedTip.content?.markdown ?? "(sem markdown)"}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      Tip não encontrada (pode ter expirado).
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

export default function AdminIATipster() {
  const [activeTab, setActiveTab] = useState("tips");

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
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="tips">Tips Geradas</TabsTrigger>
          <TabsTrigger value="partidas">Partidas Analisadas</TabsTrigger>
          <TabsTrigger value="cache">Cache &amp; Reuso</TabsTrigger>
          <TabsTrigger value="telemetria">Telemetria</TabsTrigger>
          <TabsTrigger value="bugs">Bug Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="tips" className="mt-4">
          <TipsGeradasTab />
        </TabsContent>
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
          <BugReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
