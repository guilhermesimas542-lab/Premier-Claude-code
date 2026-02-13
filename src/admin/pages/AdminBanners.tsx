import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Banner {
  id: string;
  title: string;
  image_url: string;
  button_text: string | null;
  button_link: string | null;
  active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}

const empty: Partial<Banner> = { title: "", image_url: "", button_text: "", button_link: "", active: true };

export default function AdminBanners() {
  const [items, setItems] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Banner>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("content_banners").select("*").order("created_at", { ascending: false });
    setItems((data as Banner[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.title || !form.image_url) { toast.error("Título e URL da imagem são obrigatórios"); return; }
    setSaving(true);
    if (form.id) {
      const { error } = await supabase.from("content_banners").update({
        title: form.title, image_url: form.image_url, button_text: form.button_text || null,
        button_link: form.button_link || null, active: form.active ?? true,
      }).eq("id", form.id);
      if (error) toast.error(error.message); else toast.success("Banner atualizado");
    } else {
      const { error } = await supabase.from("content_banners").insert({
        title: form.title!, image_url: form.image_url!, button_text: form.button_text || null,
        button_link: form.button_link || null, active: form.active ?? true,
      });
      if (error) toast.error(error.message); else toast.success("Banner criado");
    }
    setSaving(false);
    setOpen(false);
    setForm(empty);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir banner?")) return;
    const { error } = await supabase.from("content_banners").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("content_banners").update({ active }).eq("id", id);
    load();
  };

  if (loading) return <div className="text-gray-400">Carregando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Banners</h2>
        <Button size="sm" onClick={() => { setForm(empty); setOpen(true); }}>
          <Plus className="w-4 h-4" /> Novo
        </Button>
      </div>

      <div className="bg-gray-900 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-gray-500">
              <th className="px-4 py-2">Título</th>
              <th className="px-4 py-2">Ativo</th>
              <th className="px-4 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-b border-white/5 text-gray-300">
                <td className="px-4 py-2">{b.title}</td>
                <td className="px-4 py-2">
                  <Switch checked={b.active} onCheckedChange={(v) => toggleActive(b.id, v)} />
                </td>
                <td className="px-4 py-2 flex gap-2">
                  <button onClick={() => { setForm(b); setOpen(true); }} className="text-blue-400 hover:text-blue-300">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(b.id)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-600">Nenhum banner</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md">
          <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} Banner</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-gray-800 border-gray-700" />
            <Input placeholder="URL da imagem" value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="bg-gray-800 border-gray-700" />
            <Input placeholder="Texto do botão" value={form.button_text ?? ""} onChange={(e) => setForm({ ...form, button_text: e.target.value })} className="bg-gray-800 border-gray-700" />
            <Input placeholder="Link do botão" value={form.button_link ?? ""} onChange={(e) => setForm({ ...form, button_link: e.target.value })} className="bg-gray-800 border-gray-700" />
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
