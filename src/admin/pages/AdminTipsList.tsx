import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTodayInBrazil } from "@/lib/timezone";
import { fromZonedTime } from "date-fns-tz";
import { BRAZIL_TZ } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Snowflake, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TeamAutocomplete } from "../components/TeamAutocomplete";
import { PredictionAutocomplete } from "../components/PredictionAutocomplete";
import type { AdminContentEntry } from "../types";
import { useBettingHouseAdmin } from "../context/BettingHouseContext";

const CATEGORIA_MAP: Record<string, { tier: string; addon: string | null; feature: string | null }> = {
  free:                 { tier: "free",  addon: null,              feature: null },
  basico:               { tier: "basic", addon: null,              feature: "odds_safes" },
  pro:                  { tier: "pro",   addon: null,              feature: "odds_pro" },
  ultra:                { tier: "ultra", addon: null,              feature: "odds_pro" },
  alavancagem:          { tier: "ultra", addon: "alavancagem",     feature: "alavancagem" },
  multiplas_bingo:      { tier: "ultra", addon: "multiplas_bingo", feature: "multiplas_bingo" },
  mercados_secundarios: { tier: "ultra", addon: null,              feature: "mercados_secundarios" },
  esportes_americanos:  { tier: "ultra", addon: null,              feature: "esportes_americanos" },
  odds_ultra:           { tier: "ultra", addon: null,              feature: "odds_ultra" },
};

function tierToCategoria(tier: string | null, addon: string | null, feature: string | null): string {
  // Prioridade 1: feature_required (modelo novo, granular)
  if (feature === "odds_safes")           return "basico";
  if (feature === "odds_pro")             return "pro";
  if (feature === "odds_ultra")           return "odds_ultra";
  if (feature === "alavancagem")          return "alavancagem";
  if (feature === "multiplas_bingo")      return "multiplas_bingo";
  if (feature === "mercados_secundarios") return "mercados_secundarios";
  if (feature === "esportes_americanos")  return "esportes_americanos";
  // Prioridade 2: addon_required (legacy)
  if (addon === "alavancagem")     return "alavancagem";
  if (addon === "multiplas_bingo") return "multiplas_bingo";
  // Prioridade 3: tier_required puro
  if (tier === "free")  return "free";
  if (tier === "basic") return "basico";
  if (tier === "pro")   return "pro";
  if (tier === "ultra") return "odds_ultra";
  return "free";
}

type SortColumn = "title" | "palpite" | "date" | "starts_at" | "odd" | "tier_required" | "result";
type SortDir = "asc" | "desc";

const TIER_ORDER: Record<string, number> = { free: 0, basic: 1, pro: 2, ultra: 3 };
const ADDON_ORDER: Record<string, number> = { alavancagem: 4, multiplas_bingo: 5 };

// House index → link column
const HOUSE_LINK_COLS = ["link_house_1", "link_house_2", "link_house_3"] as const;

interface CategoryCount {
  label: string;
  count: number;
  bgClass: string;
  textClass: string;
}

const CATEGORY_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  free: { label: "Free", bg: "bg-gray-600/30", text: "text-gray-300" },
  basic: { label: "Basic", bg: "bg-blue-600/30", text: "text-blue-400" },
  pro: { label: "Pro", bg: "bg-green-600/30", text: "text-green-400" },
  ultra: { label: "Ultra", bg: "bg-purple-600/30", text: "text-purple-400" },
  alavancagem: { label: "Alavancagem", bg: "bg-yellow-600/30", text: "text-yellow-400" },
  multiplas_bingo: { label: "Múltiplas / Bingo", bg: "bg-orange-600/30", text: "text-orange-400" },
};

export default function AdminTipsList() {
  const { selectedHouseId, houses } = useBettingHouseAdmin();
  const [items, setItems] = useState<AdminContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const today = getTodayInBrazil();
  const [filters, setFilters] = useState({ tier: "", addon: "", team: "", active: "", dateFrom: today, dateTo: today, result: "" });
  const [activePeriod, setActivePeriod] = useState<string>("hoje");
  const [editItem, setEditItem] = useState<AdminContentEntry | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [sortCol, setSortCol] = useState<SortColumn | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");


  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")), []);
  const minuteOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0")), []);

  const openEditModal = (t: AdminContentEntry) => {
    setEditItem(t);
    const startsAt = t.starts_at ? new Date(t.starts_at) : null;
    // Parse hour/minute from starts_at in local display
    let hour = "20", minute = "00";
    if (startsAt) {
      const timeStr = startsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
      const [h, m] = timeStr.split(":");
      hour = h;
      // Round minute to nearest 5
      const mNum = parseInt(m);
      minute = (Math.round(mNum / 5) * 5).toString().padStart(2, "0");
      if (minute === "60") minute = "55";
    }
    setEditForm({
      gameDate: t.date,
      gameHour: hour,
      gameMinute: minute,
      team1_name: t.team1_name ?? "",
      team1_logo_url: (t as any).team1_logo_url ?? "",
      team2_name: t.team2_name ?? "",
      team2_logo_url: (t as any).team2_logo_url ?? "",
      categoria: tierToCategoria(t.tier_required, (t as any).addon_required, (t as any).feature_required),
      odd: t.odd?.toString() ?? "",
      palpite: t.condition_to_win ?? "",
      mercado: t.market ?? "",
      mercado_explicacao: t.category_explanation ?? "",
      justification: t.justification ?? "",
      link_house_1: (t as any).link_house_1 ?? "",
      link_house_2: (t as any).link_house_2 ?? "",
      link_house_3: (t as any).link_house_3 ?? "",
    });
  };

  const setEF = (key: string, val: string) => setEditForm((f: any) => ({ ...f, [key]: val }));

  const load = async () => {
    setLoading(true);
    setSelectedIds(new Set());
    let q = supabase.from("content_entries").select("*").order("created_at", { ascending: false }).limit(200);
    if (filters.tier) q = q.eq("tier_required", filters.tier as any);
    if (filters.addon) q = q.eq("addon_required", filters.addon as any);
    if (filters.active === "true") q = q.eq("active", true);
    if (filters.active === "false") q = q.eq("active", false);
    if (filters.result) q = q.eq("result", filters.result);
    if (filters.dateFrom) q = q.gte("date", filters.dateFrom);
    if (filters.dateTo) q = q.lte("date", filters.dateTo);
    if (filters.team) q = q.or(`team1_name.ilike.%${filters.team}%,team2_name.ilike.%${filters.team}%`);

    // Filter by selected house — show tips that have a link for the house OR have WSDK metadata (Altenar)
    if (selectedHouseId) {
      q = (q as any).or(
        "link_house_1.not.is.null,link_house_2.not.is.null,link_house_3.not.is.null,metadata.not.is.null"
      );
    }

    const { data } = await q;
    setItems((data as unknown as AdminContentEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [selectedHouseId, filters.dateFrom, filters.dateTo]);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir tip?")) return;
    const { error } = await supabase.from("content_entries").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluída"); load(); }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("content_entries").update({ active }).eq("id", id);
    load();
  };

  const handleUpdateResult = async (id: string, result: "green" | "red") => {
    const { error } = await supabase.from("content_entries").update({ result } as any).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(result === "green" ? "✅ Marcado como Green" : "❌ Marcado como Red"); load(); }
  };

  const saveEdit = async () => {
    if (!editItem || !editForm) return;
    const cat = CATEGORIA_MAP[editForm.categoria] || CATEGORIA_MAP.free;
    const dateOnly = editForm.gameDate;
    const gameLocalStr = `${dateOnly}T${editForm.gameHour}:${editForm.gameMinute}:00`;
    const startsAtUTC = fromZonedTime(gameLocalStr, BRAZIL_TZ);
    const endOfDayLocal = `${dateOnly}T23:59:00`;
    const expiresAtUTC = fromZonedTime(endOfDayLocal, BRAZIL_TZ);

    const payload: any = {
      title: `${editForm.team1_name} x ${editForm.team2_name}`,
      date: dateOnly,
      starts_at: startsAtUTC.toISOString(),
      expires_at: expiresAtUTC.toISOString(),
      odd: editForm.odd ? parseFloat(Number(editForm.odd).toFixed(2)) : null,
      tier_required: cat.tier,
      addon_required: cat.addon,
      feature_required: cat.feature,
      team1_name: editForm.team1_name,
      team1_logo_url: editForm.team1_logo_url || null,
      team2_name: editForm.team2_name,
      team2_logo_url: editForm.team2_logo_url || null,
      condition_to_win: editForm.palpite || null,
      market: editForm.mercado || null,
      category: editForm.mercado || null,
      category_explanation: editForm.mercado_explicacao || null,
      justification: editForm.justification || null,
      link: editForm.link_house_1 || editForm.link_house_2 || editForm.link_house_3 || null,
      link_house_1: editForm.link_house_1 || null,
      link_house_2: editForm.link_house_2 || null,
      link_house_3: editForm.link_house_3 || null,
    };
    const { error } = await supabase.from("content_entries").update(payload).eq("id", editItem.id);
    if (error) toast.error(error.message);
    else { toast.success("Atualizada"); setEditItem(null); setEditForm(null); load(); }
  };

  const handleFreeze = async (tip: AdminContentEntry) => {
    const { id, created_at, ...dataToCopy } = tip;
    const newFreeTip = {
      ...dataToCopy,
      tier_required: "free" as any,
      addon_required: null,
      result: "pending",
    };
    const { error } = await supabase.from("content_entries").insert(newFreeTip);
    if (error) toast.error("Erro ao freezar: " + error.message);
    else { toast.success("❄️ Tip duplicada como Free"); load(); }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("content_entries").delete().in("id", ids);
    setBulkDeleting(false);
    setShowDeleteConfirm(false);
    if (error) toast.error(error.message);
    else { toast.success(`${ids.length} tip(s) excluída(s)`); load(); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((i) => i.id)));
  };

  const setF = (k: string, v: string) => {
    setFilters((f) => ({ ...f, [k]: v }));
    if (k === "dateFrom" || k === "dateTo") setActivePeriod("");
  };

  const handleDateShortcut = (period: string) => {
    const todayDate = getTodayInBrazil();
    const d = new Date(todayDate + "T12:00:00");
    let from = new Date(d);
    let to = new Date(d);

    switch (period) {
      case "hoje": break;
      case "ontem": from.setDate(d.getDate() - 1); to.setDate(d.getDate() - 1); break;
      case "amanha": from.setDate(d.getDate() + 1); to.setDate(d.getDate() + 1); break;
      case "prox_7": to.setDate(d.getDate() + 6); break;
      case "ult_7": from.setDate(d.getDate() - 6); break;
    }

    const fmt = (dt: Date) => dt.toISOString().split("T")[0];
    setFilters((f) => ({ ...f, dateFrom: fmt(from), dateTo: fmt(to) }));
    setActivePeriod(period);
  };

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  const sortedItems = [...items].sort((a, b) => {
    if (!sortCol) return 0;
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortCol === "title") return dir * a.title.localeCompare(b.title);
    if (sortCol === "palpite") {
      const aT = a.condition_to_win ?? "";
      const bT = b.condition_to_win ?? "";
      return dir * aT.localeCompare(bT);
    }
    if (sortCol === "date") return dir * a.date.localeCompare(b.date);
    if (sortCol === "starts_at") {
      const aS = a.starts_at ?? "";
      const bS = b.starts_at ?? "";
      return dir * aS.localeCompare(bS);
    }
    if (sortCol === "odd") return dir * ((a.odd ?? 0) - (b.odd ?? 0));
    if (sortCol === "tier_required") {
      const aOrder = (a as any).addon_required ? (ADDON_ORDER[(a as any).addon_required] ?? 99) : (TIER_ORDER[a.tier_required] ?? 99);
      const bOrder = (b as any).addon_required ? (ADDON_ORDER[(b as any).addon_required] ?? 99) : (TIER_ORDER[b.tier_required] ?? 99);
      return dir * (aOrder - bOrder);
    }
    if (sortCol === "result") {
      const rOrder: Record<string, number> = { pending: 0, green: 1, red: 2 };
      return dir * ((rOrder[(a as any).result] ?? 99) - (rOrder[(b as any).result] ?? 99));
    }
    return 0;
  });

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    let total = 0;
    for (const row of items) {
      const key = (row as any).addon_required || row.tier_required || "free";
      map[key] = (map[key] || 0) + 1;
      total++;
    }
    const cats = Object.entries(map)
      .map(([key, count]) => {
        const style = CATEGORY_STYLES[key] || { label: key, bg: "bg-gray-600/30", text: "text-gray-300" };
        return { label: style.label, count, bgClass: style.bg, textClass: style.text };
      })
      .sort((a, b) => b.count - a.count);
    return { cats, total };
  }, [items]);

  const resultCounts = useMemo(() => {
    let green = 0;
    let red = 0;
    let pending = 0;
    for (const row of items) {
      if ((row as any).result === "green") green++;
      else if ((row as any).result === "red") red++;
      else pending++;
    }
    return { green, red, total: green + red, pending };
  }, [items]);

  const filterLabel = useMemo(() => {
    switch (activePeriod) {
      case "hoje": return "Entradas hoje:";
      case "ontem": return "Entradas ontem:";
      case "amanha": return "Entradas amanhã:";
      case "prox_7": return "Entradas próximos 7 dias:";
      case "ult_7": return "Entradas últimos 7 dias:";
      default: return "Entradas no período:";
    }
  }, [activePeriod]);

  const SortIcon = ({ col }: { col: SortColumn }) => {
    if (sortCol !== col) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="w-3 h-3 text-secondary" />
      : <ArrowDown className="w-3 h-3 text-secondary" />;
  };

  const thClass = (col: SortColumn) =>
    `px-3 py-2 cursor-pointer select-none hover:text-foreground transition-colors ${sortCol === col ? "text-secondary" : ""}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Listar Tips</h2>
        <button
          onClick={() => load()}
          className="p-2 rounded-lg bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-white transition-colors"
          title="Atualizar lista"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Contagem por categoria */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground font-medium">{filterLabel}</span>
        <span className="px-2 py-0.5 rounded text-xs font-bold bg-white/10 text-white">
          Todas: {categoryCounts.total}
        </span>
        {categoryCounts.cats.map((cat) => (
          <span key={cat.label} className={`px-2 py-0.5 rounded text-xs font-bold ${cat.bgClass} ${cat.textClass}`}>
            {cat.label}: {cat.count}
          </span>
        ))}
      </div>
      {/* Contagem de resultados */}
      <div className="flex flex-wrap items-center gap-2 text-sm mt-1">
        <span className="text-muted-foreground font-medium">Resultados:</span>
        <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-600/30 text-green-400">
          Green: {resultCounts.green}
        </span>
        <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-600/30 text-red-400">
          Red: {resultCounts.red}
        </span>
        <span className="px-2 py-0.5 rounded text-xs font-bold bg-white/10 text-white">
          Total: {resultCounts.total}
        </span>
      </div>


      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Time" value={filters.team} onChange={(e) => setF("team", e.target.value)} className="w-36 bg-gray-900 border-gray-800 text-sm" />
        <Input type="date" value={filters.dateFrom} onChange={(e) => setF("dateFrom", e.target.value)} className="w-36 bg-gray-900 border-gray-800 text-sm" />
        <Input type="date" value={filters.dateTo} onChange={(e) => setF("dateTo", e.target.value)} className="w-36 bg-gray-900 border-gray-800 text-sm" />
        <Select value={filters.tier || "all"} onValueChange={(v) => setF("tier", v === "all" ? "" : v)}>
          <SelectTrigger className="w-28 bg-gray-900 border-gray-800 text-sm"><SelectValue placeholder="Plano" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="free">Free</SelectItem><SelectItem value="basic">Basic</SelectItem><SelectItem value="pro">Pro</SelectItem><SelectItem value="ultra">Ultra</SelectItem></SelectContent>
        </Select>
        <Select value={filters.addon || "all"} onValueChange={(v) => setF("addon", v === "all" ? "" : v)}>
          <SelectTrigger className="w-32 bg-gray-900 border-gray-800 text-sm"><SelectValue placeholder="Add-on" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="alavancagem">Alavancagem</SelectItem><SelectItem value="multiplas_bingo">Múltiplas / Bingo</SelectItem></SelectContent>
        </Select>
        <Select value={filters.active || "all"} onValueChange={(v) => setF("active", v === "all" ? "" : v)}>
          <SelectTrigger className="w-28 bg-gray-900 border-gray-800 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="true">Ativas</SelectItem><SelectItem value="false">Inativas</SelectItem></SelectContent>
        </Select>
        <Select value={filters.result || "all"} onValueChange={(v) => setF("result", v === "all" ? "" : v)}>
          <SelectTrigger className="w-28 bg-gray-900 border-gray-800 text-sm"><SelectValue placeholder="Resultado" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="pending">Pendente</SelectItem><SelectItem value="green">Green</SelectItem><SelectItem value="red">Red</SelectItem></SelectContent>
        </Select>
        <Button size="sm" onClick={load}>Filtrar</Button>
        <button
          onClick={() => {
            const formatResult = (r: string | null | undefined) => {
              if (!r || r === "pending") return "Pendente";
              if (r === "green") return "Green";
              if (r === "red") return "Red";
              if (r === "void") return "Void";
              return r;
            };
            const headers = ["Título", "Palpite", "Data", "Hora", "Odd", "Plano", "Resultado"];
            const rows = sortedItems.map((item: any) => [
              item.title ?? `${item.team1_name ?? ""} x ${item.team2_name ?? ""}`,
              item.condition_to_win ?? item.market ?? "",
              item.date ?? "",
              item.starts_at ? item.starts_at.substring(11, 16) : "",
              item.odd?.toFixed(2) ?? "",
              item.tier_required ?? item.addon_required ?? "",
              formatResult(item.result),
            ]);
            const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `tips_premier_${new Date().toISOString().split("T")[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 text-sm font-medium transition-colors"
        >
          Exportar CSV
        </button>
      </div>

      {/* Date shortcut buttons */}
      <div className="flex flex-wrap gap-1.5">
        {[
          { key: "hoje", label: "Hoje" },
          { key: "ontem", label: "Ontem" },
          { key: "amanha", label: "Amanhã" },
          { key: "prox_7", label: "Próximos 7 dias" },
          { key: "ult_7", label: "Últimos 7 dias" },
        ].map((btn) => (
          <Button
            key={btn.key}
            size="sm"
            variant={activePeriod === btn.key ? "default" : "outline"}
            className={`text-xs h-7 ${activePeriod === btn.key ? "" : "border-gray-700 text-gray-400 hover:text-white"}`}
            onClick={() => { handleDateShortcut(btn.key); }}
          >
            {btn.label}
          </Button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-gray-800 border border-white/10 px-4 py-2 text-sm">
          <span className="text-gray-300 font-medium">{selectedIds.size} tip(s) selecionada(s)</span>
          <Button size="sm" variant="destructive" onClick={() => setShowDeleteConfirm(true)}>Excluir selecionados</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-gray-400">Desmarcar todos</Button>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400">Carregando…</div>
      ) : (
        <>
          {/* Legenda das colunas */}
          <TooltipProvider>
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-400 mb-2">
              <Tooltip><TooltipTrigger asChild>
                <span className="flex items-center gap-1 cursor-help"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Plano</span>
              </TooltipTrigger><TooltipContent>Plano necessário: Free, Basic, Pro, Ultra</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild>
                <span className="flex items-center gap-1 cursor-help"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Add-on</span>
              </TooltipTrigger><TooltipContent>Add-on: Alavancagem ou Múltiplas / Bingo</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild>
                <span className="flex items-center gap-1 cursor-help"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Ativo</span>
              </TooltipTrigger><TooltipContent>Se a tip está visível para os usuários</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild>
                <span className="flex items-center gap-1 cursor-help"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Resultado</span>
              </TooltipTrigger><TooltipContent>Pendente, Green ou Red</TooltipContent></Tooltip>
            </div>
          </TooltipProvider>
          <div className="bg-gray-900 rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[850px]">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-500 text-xs">
                <th className="px-3 py-2 w-10">
                  <Checkbox
                    checked={items.length > 0 && selectedIds.size === items.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className={thClass("title")} onClick={() => handleSort("title")}>
                  <span className="flex items-center gap-1">Título <SortIcon col="title" /></span>
                </th>
                <th className={thClass("palpite")} onClick={() => handleSort("palpite")}>
                  <span className="flex items-center gap-1">Palpite <SortIcon col="palpite" /></span>
                </th>
                <th className={thClass("date")} onClick={() => handleSort("date")}>
                  <span className="flex items-center gap-1">Data <SortIcon col="date" /></span>
                </th>
                <th className={thClass("starts_at")} onClick={() => handleSort("starts_at")}>
                  <span className="flex items-center gap-1">Hora <SortIcon col="starts_at" /></span>
                </th>
                <th className={thClass("odd")} onClick={() => handleSort("odd")}>
                  <span className="flex items-center gap-1">Odd <SortIcon col="odd" /></span>
                </th>
                <th className={thClass("tier_required")} onClick={() => handleSort("tier_required")}>
                  <span className="flex items-center gap-1">Plano <SortIcon col="tier_required" /></span>
                </th>
                <th className="px-3 py-2">Ativo</th>
                <th className={thClass("result")} onClick={() => handleSort("result")}>
                  <span className="flex items-center gap-1">Resultado <SortIcon col="result" /></span>
                </th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((t) => (
                <tr
                  key={t.id}
                  className={`border-b border-white/5 text-gray-300 text-xs transition-colors ${selectedIds.has(t.id) ? "bg-white/5" : ""}`}
                >
                  <td className="px-3 py-2">
                    <Checkbox checked={selectedIds.has(t.id)} onCheckedChange={() => toggleSelect(t.id)} />
                  </td>
                  <td className="px-3 py-2 max-w-[150px] truncate">{t.title}</td>
                  <td className="px-3 py-2">{t.condition_to_win ?? "—"}</td>
                  <td className="px-3 py-2">{t.date}</td>
                  <td className="px-3 py-2">{t.starts_at ? new Date(t.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td className="px-3 py-2">{t.odd != null ? t.odd.toFixed(2) : "—"}</td>
                  <td className="px-3 py-2">
                    <span className="capitalize">
                      {(() => {
                        const feature = (t as any).feature_required as string | null;
                        const addon = (t as any).addon_required as string | null;
                        if (feature === "odds_safes") return "Odds Safes";
                        if (feature === "odds_pro") return "Odds Pró";
                        if (feature === "odds_ultra") return "Odds Ultra";
                        if (feature === "alavancagem") return "Alavancagem";
                        if (feature === "multiplas_bingo") return "Múltiplas / Bingo";
                        if (feature === "mercados_secundarios") return "Merc. Secundários";
                        if (feature === "esportes_americanos") return "Esp. Americanos";
                        if (addon === "alavancagem") return "Alavancagem";
                        if (addon === "multiplas_bingo") return "Múltiplas / Bingo";
                        return t.tier_required;
                      })()}
                    </span>
                  </td>
                  <td className="px-3 py-2"><Switch checked={t.active} onCheckedChange={(v) => toggleActive(t.id, v)} /></td>
                  <td className="px-3 py-2">
                    {(t as any).result === "pending" ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleUpdateResult(t.id, "green")} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-600/20 text-green-400 hover:bg-green-600/40 transition-colors">✅ Green</button>
                        <button onClick={() => handleUpdateResult(t.id, "red")} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600/20 text-red-400 hover:bg-red-600/40 transition-colors">❌ Red</button>
                      </div>
                    ) : (t as any).result === "green" ? (
                      <span className="text-green-400 font-bold text-xs">✅ Green</span>
                    ) : (t as any).result === "red" ? (
                      <span className="text-red-400 font-bold text-xs">❌ Red</span>
                    ) : (
                      <span className="text-gray-500 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 flex gap-1">
                    <button onClick={() => handleFreeze(t)} className="text-cyan-400 hover:text-cyan-300 transition-colors" title="Freezar (duplicar como Free)"><Snowflake className="w-3.5 h-3.5" /></button>
                    <button onClick={() => openEditModal(t)} className="text-blue-400"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(t.id)} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={11} className="px-3 py-6 text-center text-gray-600">Nenhuma tip encontrada</td></tr>}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Edit Dialog — Full Form */}
      <Dialog open={!!editItem} onOpenChange={(o) => { if (!o) { setEditItem(null); setEditForm(null); } }}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Tip</DialogTitle></DialogHeader>
          {editItem && editForm && (
            <div className="space-y-4">
              {/* Data e Hora */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-end">
                <div>
                  <label className="text-xs text-muted-foreground">Data do Jogo *</label>
                  <Input type="date" value={editForm.gameDate} onChange={(e) => setEF("gameDate", e.target.value)} className="bg-gray-800 border-gray-700" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Hora *</label>
                  <Select value={editForm.gameHour} onValueChange={(v) => setEF("gameHour", v)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 w-20"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-60">{hourOptions.map((h) => <SelectItem key={h} value={h}>{h}h</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Min *</label>
                  <Select value={editForm.gameMinute} onValueChange={(v) => setEF("gameMinute", v)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>{minuteOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Times */}
              <div className="border border-gray-700 rounded-lg p-3 space-y-3">
                <span className="text-xs text-muted-foreground font-semibold uppercase">Time 1</span>
                <TeamAutocomplete label="Time 1" value={editForm.team1_name} logoUrl={editForm.team1_logo_url}
                  onChange={(name, logoUrl) => setEditForm((f: any) => ({ ...f, team1_name: name, team1_logo_url: logoUrl }))} />
              </div>
              <div className="border border-gray-700 rounded-lg p-3 space-y-3">
                <span className="text-xs text-muted-foreground font-semibold uppercase">Time 2</span>
                <TeamAutocomplete label="Time 2" value={editForm.team2_name} logoUrl={editForm.team2_logo_url}
                  onChange={(name, logoUrl) => setEditForm((f: any) => ({ ...f, team2_name: name, team2_logo_url: logoUrl }))} />
              </div>

              {/* Categoria e Odd */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Categoria *</label>
                  <Select value={editForm.categoria} onValueChange={(v) => setEF("categoria", v)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="basico">Básico</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="ultra">Ultra</SelectItem>
                      <SelectItem value="alavancagem">Alavancagem</SelectItem>
                      <SelectItem value="multiplas_bingo">Múltiplas / Bingo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Odd *</label>
                  <Input type="number" step="0.01" value={editForm.odd} onChange={(e) => setEF("odd", e.target.value)} className="bg-gray-800 border-gray-700" />
                </div>
              </div>

              {/* Palpite */}
              {editForm.categoria !== "alavancagem" && editForm.categoria !== "multiplas_bingo" && (
                <PredictionAutocomplete value={editForm.palpite} onChange={(prediction, market, explanation) => {
                  setEditForm((f: any) => ({ ...f, palpite: prediction, ...(market ? { mercado: market } : {}), ...(explanation ? { mercado_explicacao: explanation } : {}) }));
                }} />
              )}
              <div>
                <label className="text-xs text-muted-foreground">Palpite</label>
                <Input value={editForm.palpite} onChange={(e) => setEF("palpite", e.target.value)} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Mercado</label>
                <Input value={editForm.mercado} onChange={(e) => setEF("mercado", e.target.value)} className="bg-gray-800 border-gray-700" placeholder="Ex: Over/Under" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">O que é esse mercado?</label>
                <Textarea value={editForm.mercado_explicacao} onChange={(e) => setEF("mercado_explicacao", e.target.value)} className="bg-gray-800 border-gray-700" rows={2} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Justificativa *</label>
                <Textarea value={editForm.justification} onChange={(e) => setEF("justification", e.target.value)} className="bg-gray-800 border-gray-700" rows={3} placeholder="Texto do modal de justificativa" />
              </div>

              {/* Links por Casa */}
              {houses.length > 0 && (
                <div className="border border-gray-700 rounded-lg p-3 space-y-2">
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Links por Casa de Apostas *</span>
                  {houses.slice(0, 3).map((h, idx) => {
                    const key = `link_house_${idx + 1}` as "link_house_1" | "link_house_2" | "link_house_3";
                    return (
                      <div key={h.id}>
                        <label className="text-xs text-muted-foreground">🏠 {h.name}</label>
                        <Input value={editForm[key] ?? ""} onChange={(e) => setEF(key, e.target.value)} placeholder={`https://.../${h.slug}/tip`} className="bg-gray-800 border-gray-700" />
                      </div>
                    );
                  })}
                </div>
              )}

              <Button onClick={saveEdit} className="w-full">Salvar Alterações</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão em lote</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja excluir {selectedIds.size} tip(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleting} className="bg-red-600 hover:bg-red-700 text-white">
              {bulkDeleting ? "Excluindo…" : "Confirmar exclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
