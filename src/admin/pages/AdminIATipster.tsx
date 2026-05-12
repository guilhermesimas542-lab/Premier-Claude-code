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
} from "lucide-react";

type MatchTypeFilter = "all" | "chat" | "live";
type PeriodFilter = "today" | "yesterday" | "7d" | "30d" | "custom";

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

function TipsGeradasTab() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
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
          "id, match_key, match_type, generated_at, expires_at, tokens_input, tokens_output, tokens_cached, hit_count, generated_by_user_id, content, source_data"
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
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Tips no período</div>
          <div className="text-2xl font-bold mt-1">{filtered.length}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Tokens consumidos</div>
          <div className="text-2xl font-bold mt-1">
            {filtered.reduce((acc, t) => acc + (t.tokens_input ?? 0) + (t.tokens_output ?? 0), 0).toLocaleString("pt-BR")}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Reusos totais (hits)</div>
          <div className="text-2xl font-bold mt-1">
            {filtered.reduce((acc, t) => acc + (t.hit_count ?? 0), 0)}
          </div>
        </div>
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

function PlaceholderTab({ title, message }: { title: string; message: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-base font-semibold mb-2">{title}</div>
      <div className="text-sm text-muted-foreground">{message}</div>
    </div>
  );
}

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
        <TabsList>
          <TabsTrigger value="tips">Tips Geradas</TabsTrigger>
          <TabsTrigger value="cache">Cache &amp; Reuso</TabsTrigger>
          <TabsTrigger value="telemetria">Telemetria</TabsTrigger>
          <TabsTrigger value="bugs">Bug Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="tips" className="mt-4">
          <TipsGeradasTab />
        </TabsContent>

        <TabsContent value="cache" className="mt-4">
          <PlaceholderTab
            title="Cache & Reuso"
            message="Em construção (Fase 7b.2)."
          />
        </TabsContent>

        <TabsContent value="telemetria" className="mt-4">
          <PlaceholderTab
            title="Telemetria"
            message="Em construção (Fase 7b.2)."
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
