import { useEffect, useState, useMemo, useCallback } from "react";
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import {
  TrendingUp, Trophy, Flame, Target, BarChart3, Activity, DollarSign,
  Percent, Download, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/admin/components/revenue/constants";
import { cn } from "@/lib/utils";

const STAKE = 100;
const WIN_THRESHOLD = 55;

type CategoryFilter = "all" | "free" | "basic" | "pro" | "ultra" | "alavancagem" | "desaltas";

interface Entry {
  id: string;
  date: string;
  title: string;
  market: string | null;
  result: string;
  odd: number | null;
  tier_required: string;
  addon_required: string | null;
  active: boolean;
}

interface DailyStat {
  date: string;
  entries: number;
  greens: number;
  reds: number;
  voids: number;
  pct: number;
  stake: number;
  lucro: number;
  roi: number;
}

type SortKey = keyof DailyStat;

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "Todas as categorias" },
  { value: "free", label: "Free" },
  { value: "basic", label: "Básico" },
  { value: "pro", label: "Pro" },
  { value: "ultra", label: "Ultra" },
  { value: "alavancagem", label: "Alavancagem" },
  { value: "desaltas", label: "Odds Altas" },
];

const SHORTCUTS = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "week", label: "Esta Semana" },
  { key: "month", label: "Este Mês" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "90d", label: "Últimos 90 dias" },
  { key: "all", label: "All Time" },
];

function pctColorClass(pct: number) {
  if (pct >= 55) return "text-green-400";
  if (pct >= 45) return "text-amber-400";
  return "text-red-400";
}

function moneyColorClass(value: number) {
  if (value > 0) return "text-green-400";
  if (value < 0) return "text-red-400";
  return "text-gray-300";
}

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ElementType;
  iconColor?: string;
}

function KpiCard({ label, value, sub, icon: Icon, iconColor = "text-blue-400" }: KpiCardProps) {
  return (
    <div className="bg-gray-900 border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminTipsAnalytics() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState<Date>(new Date(2026, 0, 1));
  const [dateTo, setDateTo] = useState<Date>(now);
  const [activeShortcut, setActiveShortcut] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const applyShortcut = (key: string) => {
    setActiveShortcut(key);
    const today = new Date();
    let from: Date, to: Date;
    switch (key) {
      case "today": from = startOfDay(today); to = today; break;
      case "yesterday": from = startOfDay(subDays(today, 1)); to = endOfDay(subDays(today, 1)); break;
      case "week": from = startOfWeek(today, { weekStartsOn: 1 }); to = today; break;
      case "month": from = startOfMonth(today); to = today; break;
      case "30d": from = subDays(today, 30); to = today; break;
      case "90d": from = subDays(today, 90); to = today; break;
      case "all": from = new Date(2026, 0, 1); to = today; break;
      default: from = startOfDay(today); to = today;
    }
    setDateFrom(from);
    setDateTo(to);
  };

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("content_entries")
      .select("id, date, title, market, result, odd, tier_required, addon_required, active")
      .gte("date", format(dateFrom, "yyyy-MM-dd"))
      .lte("date", format(dateTo, "yyyy-MM-dd"))
      .eq("active", true)
      .order("date", { ascending: true });

    switch (categoryFilter) {
      case "free":
      case "basic":
      case "pro":
      case "ultra":
        q = q.eq("tier_required", categoryFilter).is("addon_required", null);
        break;
      case "alavancagem":
      case "desaltas":
        q = q.eq("addon_required", categoryFilter);
        break;
      case "all":
      default:
        break;
    }

    const { data, error } = await q;
    if (error) {
      toast.error("Erro ao carregar entradas: " + error.message);
      setEntries([]);
    } else {
      setEntries((data ?? []) as Entry[]);
    }
    setLoading(false);
  }, [dateFrom, dateTo, categoryFilter]);

  useEffect(() => { load(); }, [load]);

  /* ── Cálculos globais ── */
  const stats = useMemo(() => {
    const greens = entries.filter((e) => e.result === "green");
    const reds = entries.filter((e) => e.result === "red");
    const voids = entries.filter((e) => e.result === "pending");
    const totalDecided = greens.length + reds.length;
    const winRate = totalDecided > 0 ? (greens.length / totalDecided) * 100 : 0;
    const totalEntries = entries.length;

    const lucroGreens = greens.reduce((sum, e) => sum + ((e.odd ?? 0) * STAKE - STAKE), 0);
    const lucroReds = reds.length * -STAKE;
    const lucroTotal = lucroGreens + lucroReds;
    const stakeTotal = totalDecided * STAKE;
    const roi = stakeTotal > 0 ? (lucroTotal / stakeTotal) * 100 : 0;

    /* ── Agrupar por dia ── */
    const dayMap = new Map<string, Entry[]>();
    entries.forEach((e) => {
      if (!dayMap.has(e.date)) dayMap.set(e.date, []);
      dayMap.get(e.date)!.push(e);
    });
    const dailyStats: DailyStat[] = Array.from(dayMap.entries()).map(([date, dayEntries]) => {
      const dg = dayEntries.filter((e) => e.result === "green");
      const dr = dayEntries.filter((e) => e.result === "red");
      const dv = dayEntries.filter((e) => e.result === "pending");
      const dTotal = dg.length + dr.length;
      const pct = dTotal > 0 ? (dg.length / dTotal) * 100 : 0;
      const dLucroG = dg.reduce((s, e) => s + ((e.odd ?? 0) * STAKE - STAKE), 0);
      const dLucroR = dr.length * -STAKE;
      const dLucro = dLucroG + dLucroR;
      const dStake = dTotal * STAKE;
      const dRoi = dStake > 0 ? (dLucro / dStake) * 100 : 0;
      return {
        date,
        entries: dayEntries.length,
        greens: dg.length,
        reds: dr.length,
        voids: dv.length,
        pct,
        stake: dStake,
        lucro: dLucro,
        roi: dRoi,
      };
    });

    const totalDays = dailyStats.length;
    const daysWithMoreGreens = dailyStats.filter((d) => d.greens > d.reds).length;
    const avgEntriesPerDay = totalDays > 0 ? totalEntries / totalDays : 0;
    const avgGreensPerDay = totalDays > 0 ? greens.length / totalDays : 0;

    /* ── Maior streak de dias acima de 55% ── */
    let maxStreak = 0;
    let currentStreak = 0;
    const sortedAsc = [...dailyStats].sort((a, b) => a.date.localeCompare(b.date));
    sortedAsc.forEach((d) => {
      if (d.pct >= WIN_THRESHOLD) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    return {
      greens, reds, voids, totalDecided, winRate, totalEntries,
      lucroTotal, roi, dailyStats, totalDays, daysWithMoreGreens,
      avgEntriesPerDay, avgGreensPerDay, maxStreak, sortedAsc,
    };
  }, [entries]);

  /* ── Tabela ordenada ── */
  const sortedTable = useMemo(() => {
    const arr = [...stats.dailyStats];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [stats.dailyStats, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortHeader = ({ label, field, align = "left" }: { label: string; field: SortKey; align?: "left" | "center" | "right" }) => (
    <th
      onClick={() => toggleSort(field)}
      className={cn(
        "px-3 py-2 text-xs text-muted-foreground font-medium cursor-pointer hover:text-white transition-colors select-none",
        align === "left" && "text-left",
        align === "center" && "text-center",
        align === "right" && "text-right",
      )}
    >
      <span className={cn("inline-flex items-center gap-1", align === "right" && "justify-end", align === "center" && "justify-center")}>
        {label}
        {sortKey === field && <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>}
      </span>
    </th>
  );

  /* ── CSV export ── */
  const exportCsv = useCallback(() => {
    const BOM = "\uFEFF";
    const headers = ["Data", "Entradas", "Greens", "Reds", "% Acerto", "Voids", "Stake Total", "Lucro", "ROI"];
    const rows = sortedTable.map((d) => [
      d.date,
      d.entries,
      d.greens,
      d.reds,
      d.pct.toFixed(2) + "%",
      d.voids,
      d.stake.toFixed(2),
      d.lucro.toFixed(2),
      d.roi.toFixed(2) + "%",
    ]);
    const csv = BOM + [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tips-analytics-${format(dateFrom, "yyyy-MM-dd")}_${format(dateTo, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`CSV exportado com ${sortedTable.length} dias`);
  }, [sortedTable, dateFrom, dateTo]);

  const chartData = useMemo(
    () => stats.sortedAsc.map((d) => ({
      ...d,
      label: format(new Date(d.date + "T12:00:00"), "dd/MM"),
    })),
    [stats.sortedAsc],
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics de Entradas</h1>
        <p className="text-sm text-gray-400 mt-1">Taxa de acerto e consistência diária — stake fixo de R$ 100 por entrada</p>
      </div>

      {/* ── Filtros ── */}
      <div className="bg-gray-900 border border-white/10 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {SHORTCUTS.map((s) => (
            <button
              key={s.key}
              onClick={() => applyShortcut(s.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                activeShortcut === s.key
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-800 border-white/10 text-gray-400 hover:text-white hover:border-white/20",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="text-xs text-gray-400">
            Período: <span className="text-white font-medium">{format(dateFrom, "dd/MM/yyyy")}</span> → <span className="text-white font-medium">{format(dateTo, "dd/MM/yyyy")}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
              <SelectTrigger className="w-[200px] h-8 text-xs bg-gray-800 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load} className="h-8 gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">Carregando…</div>
      ) : (
        <>
          {/* ── KPI Linha 1 ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Win Rate no Período"
              value={<span className={pctColorClass(stats.winRate)}>{stats.winRate.toFixed(2)}%</span>}
              sub={
                <span>
                  <span className="text-green-400">{stats.greens.length}G</span>
                  {" | "}
                  <span className="text-red-400">{stats.reds.length}R</span>
                  {" | "}
                  <span className="text-gray-400">{stats.voids.length}V</span>
                </span>
              }
              icon={Target}
              iconColor="text-green-400"
            />
            <KpiCard
              label="Dias com + Greens"
              value={stats.daysWithMoreGreens}
              sub={`de ${stats.totalDays} dias no período`}
              icon={Trophy}
              iconColor="text-amber-400"
            />
            <KpiCard
              label="Greens vs Reds"
              value={
                <span>
                  <span className="text-green-400">{stats.greens.length}</span>
                  <span className="text-gray-500 mx-1.5">/</span>
                  <span className="text-red-400">{stats.reds.length}</span>
                </span>
              }
              sub="acertos vs erros"
              icon={BarChart3}
              iconColor="text-cyan-400"
            />
            <KpiCard
              label="Maior Sequência"
              value={`${stats.maxStreak} dias`}
              sub={`acima de ${WIN_THRESHOLD}% de acerto`}
              icon={Flame}
              iconColor="text-orange-400"
            />
          </div>

          {/* ── KPI Linha 2 ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KpiCard
              label="Total de Entradas"
              value={stats.totalEntries}
              sub={`em ${stats.totalDays} dia${stats.totalDays === 1 ? "" : "s"}`}
              icon={Activity}
              iconColor="text-blue-400"
            />
            <KpiCard
              label="Média de Entradas/Dia"
              value={stats.avgEntriesPerDay.toFixed(1)}
              icon={BarChart3}
              iconColor="text-blue-400"
            />
            <KpiCard
              label="Média de Greens/Dia"
              value={stats.avgGreensPerDay.toFixed(1)}
              icon={TrendingUp}
              iconColor="text-green-400"
            />
          </div>

          {/* ── KPI Linha 3 ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <KpiCard
              label="Lucro no Período"
              value={<span className={moneyColorClass(stats.lucroTotal)}>{formatBRL(stats.lucroTotal)}</span>}
              sub={`stake total: ${formatBRL(stats.totalDecided * STAKE)}`}
              icon={DollarSign}
              iconColor="text-green-400"
            />
            <KpiCard
              label="ROI no Período"
              value={<span className={moneyColorClass(stats.roi)}>{stats.roi.toFixed(2)}%</span>}
              sub="sobre stake total"
              icon={Percent}
              iconColor="text-amber-400"
            />
          </div>

          {/* ── Gráficos ── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Greens x Reds por Dia */}
            <div className="bg-gray-900 border border-white/10 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Greens x Reds por Dia</h3>
              <div className="overflow-x-auto">
                <div style={{ minWidth: Math.max(chartData.length * 40, 400) }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "#0b1220", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: "#fff" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="greens" name="Greens" stackId="a" fill="#22c55e" />
                      <Bar dataKey="reds" name="Reds" stackId="a" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Taxa de acerto diária */}
            <div className="bg-gray-900 border border-white/10 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Taxa de Acerto Diária</h3>
              <div className="overflow-x-auto">
                <div style={{ minWidth: Math.max(chartData.length * 40, 400) }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                      <Tooltip
                        contentStyle={{ background: "#0b1220", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: "#fff" }}
                        formatter={(v: number) => [`${v.toFixed(1)}%`, "Acerto"]}
                      />
                      <ReferenceLine y={WIN_THRESHOLD} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `${WIN_THRESHOLD}%`, fill: "#f59e0b", fontSize: 11, position: "right" }} />
                      <Line type="monotone" dataKey="pct" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* ── Tabela ── */}
          <div className="bg-gray-900 border border-white/10 rounded-lg">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">
                Histórico Diário ({stats.totalDays} dia{stats.totalDays === 1 ? "" : "s"})
              </h3>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={sortedTable.length === 0} className="h-8 gap-1.5">
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <SortHeader label="Data" field="date" />
                    <SortHeader label="Entradas" field="entries" align="right" />
                    <SortHeader label="Greens" field="greens" align="right" />
                    <SortHeader label="Reds" field="reds" align="right" />
                    <SortHeader label="% Acerto" field="pct" align="right" />
                    <SortHeader label="Voids" field="voids" align="right" />
                    <SortHeader label="Stake Total" field="stake" align="right" />
                    <SortHeader label="Lucro" field="lucro" align="right" />
                    <SortHeader label="ROI" field="roi" align="right" />
                  </tr>
                </thead>
                <tbody>
                  {sortedTable.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-gray-500">
                        Nenhuma entrada encontrada no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    sortedTable.map((d) => (
                      <tr
                        key={d.date}
                        onClick={() => setSelectedDay(d.date)}
                        className="border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <td className="px-3 py-2 text-white">
                          {format(new Date(d.date + "T12:00:00"), "dd/MM/yyyy")}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-300">{d.entries}</td>
                        <td className="px-3 py-2 text-right text-green-400 font-medium">{d.greens}</td>
                        <td className="px-3 py-2 text-right text-red-400 font-medium">{d.reds}</td>
                        <td className={cn("px-3 py-2 text-right font-medium", pctColorClass(d.pct))}>
                          {d.pct.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400">{d.voids}</td>
                        <td className="px-3 py-2 text-right text-gray-300">{formatBRL(d.stake)}</td>
                        <td className={cn("px-3 py-2 text-right font-medium", moneyColorClass(d.lucro))}>
                          {formatBRL(d.lucro)}
                        </td>
                        <td className={cn("px-3 py-2 text-right font-medium", moneyColorClass(d.roi))}>
                          {d.roi.toFixed(2)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Modal: entradas do dia ── */}
      <Dialog open={!!selectedDay} onOpenChange={(o) => !o && setSelectedDay(null)}>
        <DialogContent className="max-w-3xl bg-gray-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>
              Entradas de {selectedDay && format(new Date(selectedDay + "T12:00:00"), "dd/MM/yyyy")}
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const dayEntries = entries.filter((e) => e.date === selectedDay);
            if (dayEntries.length === 0) {
              return <div className="text-sm text-gray-400 py-4">Nenhuma entrada neste dia.</div>;
            }
            return (
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-900">
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-3 py-2 text-left text-xs text-muted-foreground font-medium">Título</th>
                      <th className="px-3 py-2 text-left text-xs text-muted-foreground font-medium">Mercado</th>
                      <th className="px-3 py-2 text-left text-xs text-muted-foreground font-medium">Categoria</th>
                      <th className="px-3 py-2 text-right text-xs text-muted-foreground font-medium">Odd</th>
                      <th className="px-3 py-2 text-center text-xs text-muted-foreground font-medium">Resultado</th>
                      <th className="px-3 py-2 text-right text-xs text-muted-foreground font-medium">Lucro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayEntries.map((e) => {
                      const lucro =
                        e.result === "green" ? (e.odd ?? 0) * STAKE - STAKE :
                        e.result === "red" ? -STAKE : 0;
                      const cat = e.addon_required ?? e.tier_required;
                      return (
                        <tr key={e.id} className="border-b border-white/5">
                          <td className="px-3 py-2 text-white">{e.title}</td>
                          <td className="px-3 py-2 text-gray-300">{e.market ?? "—"}</td>
                          <td className="px-3 py-2 text-gray-400 capitalize">{cat}</td>
                          <td className="px-3 py-2 text-right text-gray-300">{e.odd?.toFixed(2) ?? "—"}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={cn(
                              "inline-block px-2 py-0.5 rounded text-xs font-medium uppercase",
                              e.result === "green" && "bg-green-500/20 text-green-400",
                              e.result === "red" && "bg-red-500/20 text-red-400",
                              e.result === "pending" && "bg-gray-500/20 text-gray-400",
                            )}>
                              {e.result === "pending" ? "void" : e.result}
                            </span>
                          </td>
                          <td className={cn("px-3 py-2 text-right font-medium", moneyColorClass(lucro))}>
                            {e.result === "pending" ? "—" : formatBRL(lucro)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
