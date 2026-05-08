import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, Send, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { AdminNotification } from "../types";
import { useBettingHouseAdmin } from "../context/BettingHouseContext";

export default function AdminNotifications() {
  const { selectedHouseId, selectedHouse } = useBettingHouseAdmin();
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    message: "",
    scheduled_at: new Date().toISOString().slice(0, 16),
  });

  const load = async () => {
    let q = (supabase as any)
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (selectedHouseId) q = q.eq("betting_house_id", selectedHouseId);
    const { data } = await q;
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [selectedHouseId]);

  const handleCreate = async () => {
    if (!form.title || !form.message) {
      toast.error("Título y mensaje obligatorios");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("notifications").insert({
      title: form.title,
      message: form.message,
      target: "all",
      scheduled_at: form.scheduled_at || null,
      betting_house_id: selectedHouseId || null,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("¡Notificación creada!");
      setOpen(false);
      setForm({ title: "", message: "", scheduled_at: new Date().toISOString().slice(0, 16) });
      load();
    }
    setSaving(false);
  };

  const handleSendNow = async (item: AdminNotification) => {
    if (!confirm(`¿Enviar "${item.title}" a todos los usuarios ahora?`)) return;
    setSendingId(item.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: { notification_id: item.id, title: item.title, message: item.message },
      });
      if (error) throw error;
      toast.success(`¡Enviada! ${data?.results?.sent ?? 0} entregadas.`);
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Error al enviar");
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar notificación?")) return;
    const { error } = await (supabase as any).from("notifications").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Eliminada"); load(); }
  };

  const getStatus = (n: AdminNotification) => {
    if (n.sent_at) return { label: "Enviada", icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />, color: "text-green-400" };
    if (n.scheduled_at && new Date(n.scheduled_at) > new Date()) return { label: "Programada", icon: <Clock className="w-3.5 h-3.5 text-yellow-400" />, color: "text-yellow-400" };
    return { label: "Pendiente", icon: <XCircle className="w-3.5 h-3.5 text-gray-500" />, color: "text-gray-500" };
  };

  if (loading) return <div className="text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
        <h2 className="text-xl font-bold">Notificaciones Push</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Notificaciones de la casa: <strong className="text-gray-300">{selectedHouse?.name ?? "—"}</strong>
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Nueva
        </Button>
      </div>

      <div className="bg-gray-900 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-gray-500 text-xs">
              <th className="px-3 py-2">Título</th>
              <th className="px-3 py-2">Audiencia</th>
              <th className="px-3 py-2">Programada para</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((n) => {
              const status = getStatus(n);
              const isSending = sendingId === n.id;
              return (
                <tr key={n.id} className="border-b border-white/5 text-gray-300 text-xs">
                  <td className="px-3 py-2">
                    <div className="font-medium text-white">{n.title}</div>
                    <div className="text-gray-500 text-[11px] truncate max-w-[200px]">{n.message}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-400">Todos los usuarios</td>
                  <td className="px-3 py-2 text-gray-400">
                    {n.scheduled_at ? new Date(n.scheduled_at).toLocaleString("es-CL") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`flex items-center gap-1 ${status.color}`}>
                      {status.icon} {status.label}
                    </span>
                    {n.sent_at && (
                      <div className="text-[10px] text-gray-600">{new Date(n.sent_at).toLocaleString("es-CL")}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {!n.sent_at && (
                        <button
                          onClick={() => handleSendNow(n)}
                          disabled={isSending}
                          className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
                          title="Enviar ahora"
                        >
                          {isSending
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Send className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <button onClick={() => handleDelete(n.id)} className="text-red-400 hover:text-red-300" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-600">
                  Ninguna notificación creada todavía
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-400" />
              Nueva Notificación Push
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Título</label>
              <Input
                placeholder="Ej: ¡Nuevo tip disponible! 🎯"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Mensaje</label>
              <Textarea
                placeholder="Ej: Tenemos un tip especial para ti hoy..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="bg-gray-800 border-gray-700"
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Programar para</label>
              <Input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <p className="text-xs text-gray-600">
              Se enviará a <strong className="text-gray-400">todos los usuarios</strong> que aceptaron notificaciones.
            </p>
            <Button onClick={handleCreate} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Crear notificación</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
