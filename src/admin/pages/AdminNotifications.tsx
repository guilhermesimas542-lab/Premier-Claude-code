import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminNotification } from "../types";

export default function AdminNotifications() {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", target: "all", target_email: "", scheduled_at: "" });

  const load = async () => {
    const { data } = await (supabase as any).from("notifications").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.message) { toast.error("Título e mensagem obrigatórios"); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("notifications").insert({
      title: form.title, message: form.message, target: form.target,
      target_email: form.target === "email" ? form.target_email : null,
      scheduled_at: form.scheduled_at || null,
    });
    if (error) toast.error(error.message); else { toast.success("Criada"); setOpen(false); setForm({ title: "", message: "", target: "all", target_email: "", scheduled_at: "" }); load(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir?")) return;
    const { error } = await (supabase as any).from("notifications").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluída"); load(); }
  };

  if (loading) return <div className="text-gray-400">Carregando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Notificações</h2>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Nova</Button>
      </div>

      <div className="bg-gray-900 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-gray-500 text-xs">
              <th className="px-3 py-2">Título</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Agendada</th>
              <th className="px-3 py-2">Enviada</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.id} className="border-b border-white/5 text-gray-300 text-xs">
                <td className="px-3 py-2">{n.title}</td>
                <td className="px-3 py-2">{n.target}{n.target_email ? ` (${n.target_email})` : ""}</td>
                <td className="px-3 py-2">{n.scheduled_at ? new Date(n.scheduled_at).toLocaleString("pt-BR") : "—"}</td>
                <td className="px-3 py-2">{n.sent_at ? new Date(n.sent_at).toLocaleString("pt-BR") : "—"}</td>
                <td className="px-3 py-2">
                  <button onClick={() => handleDelete(n.id)} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-600">Nenhuma notificação</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader><DialogTitle>Nova Notificação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-gray-800 border-gray-700" />
            <Textarea placeholder="Mensagem" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="bg-gray-800 border-gray-700" rows={3} />
            <Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v })}>
              <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="email">Email específico</SelectItem></SelectContent>
            </Select>
            {form.target === "email" && (
              <Input placeholder="Email do destinatário" value={form.target_email} onChange={(e) => setForm({ ...form, target_email: e.target.value })} className="bg-gray-800 border-gray-700" />
            )}
            <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="bg-gray-800 border-gray-700" />
            <Button onClick={handleCreate} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
