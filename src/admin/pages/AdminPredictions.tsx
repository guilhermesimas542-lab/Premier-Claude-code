import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface MarketPrediction {
  id: string;
  prediction: string;
  market: string;
  market_explanation: string | null;
  created_at: string;
}

export default function AdminPredictions() {
  const [items, setItems] = useState<MarketPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ prediction: "", market: "", market_explanation: "" });
  const [sortField, setSortField] = useState<"prediction" | "market" | "market_explanation">("prediction");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (field: "prediction" | "market" | "market_explanation") => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("market_predictions")
      .select("*")
      .order(sortField, { ascending: sortDir === "asc" });
    setItems((data as MarketPrediction[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [sortField, sortDir]);

  const openNew = () => {
    setEditingId(null);
    setForm({ prediction: "", market: "", market_explanation: "" });
    setDialogOpen(true);
  };

  const openEdit = (item: MarketPrediction) => {
    setEditingId(item.id);
    setForm({ prediction: item.prediction, market: item.market, market_explanation: item.market_explanation ?? "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.prediction.trim() || !form.market.trim()) {
      toast.error("Palpite e Mercado são obrigatórios");
      return;
    }
    setSaving(true);
    const payload = {
      prediction: form.prediction.trim(),
      market: form.market.trim(),
      market_explanation: form.market_explanation.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase.from("market_predictions").update(payload).eq("id", editingId);
      if (error) toast.error(error.message);
      else toast.success("Atualizado!");
    } else {
      const { error } = await supabase.from("market_predictions").insert(payload);
      if (error) toast.error(error.message);
      else toast.success("Criado!");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este palpite/mercado?")) return;
    const { error } = await supabase.from("market_predictions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Excluído!"); fetchItems(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Palpites / Mercado</h2>
        <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">Nenhum palpite cadastrado ainda.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => toggleSort("prediction")} className="cursor-pointer select-none hover:text-white transition-colors">
                <span className="inline-flex items-center gap-1">
                  Palpite
                  <span className="text-xs opacity-50">{sortField === "prediction" ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}</span>
                </span>
              </TableHead>
              <TableHead onClick={() => toggleSort("market")} className="cursor-pointer select-none hover:text-white transition-colors">
                <span className="inline-flex items-center gap-1">
                  Mercado
                  <span className="text-xs opacity-50">{sortField === "market" ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}</span>
                </span>
              </TableHead>
              <TableHead onClick={() => toggleSort("market_explanation")} className="cursor-pointer select-none hover:text-white transition-colors">
                <span className="inline-flex items-center gap-1">
                  Explicação
                  <span className="text-xs opacity-50">{sortField === "market_explanation" ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}</span>
                </span>
              </TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.prediction}</TableCell>
                <TableCell>{item.market}</TableCell>
                <TableCell className="text-muted-foreground text-xs max-w-xs truncate">{item.market_explanation ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar" : "Novo"} Palpite/Mercado</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Palpite *</label>
              <Input value={form.prediction} onChange={(e) => setForm(f => ({ ...f, prediction: e.target.value }))} placeholder="Ex: Mais de 1.5 gols" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Mercado *</label>
              <Input value={form.market} onChange={(e) => setForm(f => ({ ...f, market: e.target.value }))} placeholder="Ex: Over/Under" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Explicação do mercado</label>
              <Textarea value={form.market_explanation} onChange={(e) => setForm(f => ({ ...f, market_explanation: e.target.value }))} rows={3} placeholder="Texto do tooltip (?)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
