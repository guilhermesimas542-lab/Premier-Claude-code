import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTodayInBrazil } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import type { AdminContentEntry } from "../types";
import { useBettingHouseAdmin } from "../context/BettingHouseContext";

type SortColumn = "title" | "teams" | "date" | "starts_at" | "odd" | "tier_required" | "result";
type SortDir = "asc" | "desc";

const TIER_ORDER: Record<string, number> = { free: 0, alavancagem: 1, desaltas: 2, basic: 3, pro: 4, ultra: 5 };

// House index → link column
const HOUSE_LINK_COLS = ["link_house_1", "link_house_2", "link_house_3"] as const;

export default function AdminTipsList() {
  const { selectedHouseId, houses } = useBettingHouseAdmin();
  const [items, setItems] = useState<AdminContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const today = getTodayInBrazil();
  const [filters, setFilters] = useState({ tier: "", addon: "", team: "", active: "", dateFrom: today, dateTo: today, result: "" });
  const [activePeriod, setActivePeriod] = useState<string>("hoje");
  const [editItem, setEditItem] = useState<AdminContentEntry | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [sortCol, setSortCol] = useState<SortColumn | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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

    // Filter by selected house — show tips that have a link for the house OR have NO links at all (backward compat)
    if (selectedHouseId) {
      const houseIdx = houses.findIndex((h) => h.id === selectedHouseId);
      if (houseIdx >= 0 && houseIdx < HOUSE_LINK_COLS.length) {
        const col = HOUSE_LINK_COLS[houseIdx];
        // Show tips that have the house link OR tips that have NO house links at all (legacy tips)
        q = (q as any).or(`${col}.not.is.null,and(link_house_1.is.null,link_house_2.is.null,link_house_3.is.null)`);
      }
    }

    const { data } = await q;
    setItems((data as unknown as AdminContentEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [selectedHouseId]);

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
    if (!editItem) return;
    const { id, created_at, ...rest } = editItem;
    const { error } = await supabase.from("content_entries").update(rest as any).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Atualizada"); setEditItem(null); load(); }
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
    if (sortCol === "teams") {
      const aT = `${a.team1_name ?? ""} ${a.team2_name ?? ""}`;
      const bT = `${b.team1_name ?? ""} ${b.team2_name ?? ""}`;
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
      return dir * ((TIER_ORDER[a.tier_required] ?? 99) - (TIER_ORDER[b.tier_required] ?? 99));
    }
    if (sortCol === "result") {
      const rOrder: Record<string, number> = { pending: 0, green: 1, red: 2 };
      return dir * ((rOrder[(a as any).result] ?? 99) - (rOrder[(b as any).result] ?? 99));
    }
    return 0;
  });

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
      <h2 className="text-xl font-bold">Listar Tips</h2>

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
          <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="alavancagem">Alavancagem</SelectItem><SelectItem value="desaltas">De Altas</SelectItem></SelectContent>
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
                <th className={thClass("teams")} onClick={() => handleSort("teams")}>
                  <span className="flex items-center gap-1">Times <SortIcon col="teams" /></span>
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
                  <td className="px-3 py-2">{t.team1_name ?? "—"} × {t.team2_name ?? "—"}</td>
                  <td className="px-3 py-2">{t.date}</td>
                  <td className="px-3 py-2">{t.starts_at ? new Date(t.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td className="px-3 py-2">{t.odd != null ? t.odd.toFixed(2) : "—"}</td>
                  <td className="px-3 py-2">{t.tier_required}</td>
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
                    <button onClick={() => setEditItem(t)} className="text-blue-400"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(t.id)} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={11} className="px-3 py-6 text-center text-gray-600">Nenhuma tip encontrada</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Tip</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              <Input value={editItem.title} onChange={(e) => setEditItem({ ...editItem, title: e.target.value })} className="bg-gray-800 border-gray-700" placeholder="Título" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={editItem.team1_name ?? ""} onChange={(e) => setEditItem({ ...editItem, team1_name: e.target.value })} className="bg-gray-800 border-gray-700" placeholder="Time 1" />
                <Input value={editItem.team2_name ?? ""} onChange={(e) => setEditItem({ ...editItem, team2_name: e.target.value })} className="bg-gray-800 border-gray-700" placeholder="Time 2" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" step="0.01" value={editItem.odd ?? ""} onChange={(e) => setEditItem({ ...editItem, odd: parseFloat(e.target.value) })} className="bg-gray-800 border-gray-700" placeholder="Odd" />
                <Input value={editItem.category ?? ""} onChange={(e) => setEditItem({ ...editItem, category: e.target.value })} className="bg-gray-800 border-gray-700" placeholder="Categoria" />
              </div>
              <Textarea value={editItem.justification ?? ""} onChange={(e) => setEditItem({ ...editItem, justification: e.target.value })} className="bg-gray-800 border-gray-700" placeholder="Justificativa" rows={3} />
              <Input value={editItem.link ?? ""} onChange={(e) => setEditItem({ ...editItem, link: e.target.value })} className="bg-gray-800 border-gray-700" placeholder="Link" />
              <Button onClick={saveEdit} className="w-full">Salvar</Button>
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
