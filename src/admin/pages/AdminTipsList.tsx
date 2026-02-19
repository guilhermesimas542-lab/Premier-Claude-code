import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminContentEntry } from "../types";

export default function AdminTipsList() {
  const [items, setItems] = useState<AdminContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split("T")[0];
  const [filters, setFilters] = useState({ tier: "", addon: "", team: "", active: "", dateFrom: today, dateTo: today });
  const [editItem, setEditItem] = useState<AdminContentEntry | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setSelectedIds(new Set());
    let q = supabase.from("content_entries").select("*").order("created_at", { ascending: false }).limit(200);
    if (filters.tier) q = q.eq("tier_required", filters.tier as any);
    if (filters.addon) q = q.eq("addon_required", filters.addon as any);
    if (filters.active === "true") q = q.eq("active", true);
    if (filters.active === "false") q = q.eq("active", false);
    if (filters.dateFrom) q = q.gte("date", filters.dateFrom);
    if (filters.dateTo) q = q.lte("date", filters.dateTo);
    if (filters.team) q = q.or(`team1_name.ilike.%${filters.team}%,team2_name.ilike.%${filters.team}%`);
    const { data } = await q;
    setItems((data as unknown as AdminContentEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir tip?")) return;
    const { error } = await supabase.from("content_entries").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluída"); load(); }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("content_entries").update({ active }).eq("id", id);
    load();
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

  const setF = (k: string, v: string) => setFilters((f) => ({ ...f, [k]: v }));

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
        <Button size="sm" onClick={load}>Filtrar</Button>
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
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Times</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Hora</th>
                <th className="px-3 py-2">Odd</th>
                <th className="px-3 py-2">Plano</th>
                <th className="px-3 py-2">Ativo</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
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
                  <td className="px-3 py-2">{t.odd}</td>
                  <td className="px-3 py-2">{t.tier_required}</td>
                  <td className="px-3 py-2"><Switch checked={t.active} onCheckedChange={(v) => toggleActive(t.id, v)} /></td>
                  <td className="px-3 py-2 flex gap-1">
                    <button onClick={() => setEditItem(t)} className="text-blue-400"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(t.id)} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-600">Nenhuma tip encontrada</td></tr>}
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
