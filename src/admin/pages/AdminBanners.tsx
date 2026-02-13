import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Loader2, ChevronRight, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useAdminMode } from "@/admin/context/AdminModeContext";

interface Banner {
  id: string;
  context: string;
  image_url: string;
  tag: string;
  title: string;
  subtitle: string;
  button_text: string | null;
  button_link: string | null;
  active: boolean;
  display_order: number;
  created_at: string;
}

const emptyForm = {
  context: "futebol",
  image_url: "",
  tag: "",
  title: "",
  subtitle: "",
  button_text: "",
  button_link: "",
  active: true,
  display_order: 0,
};

export default function AdminBanners() {
  const { mode } = useAdminMode();
  const ctx = mode === "cassino" ? "cassino" : "futebol";

  const [items, setItems] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Banner>>({ ...emptyForm, context: ctx });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("content_banners")
      .select("*")
      .eq("context", ctx)
      .order("display_order", { ascending: true });
    setItems((data as Banner[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [ctx]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("banners").upload(path, file);
    if (error) { toast.error("Erro no upload: " + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("banners").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
    setUploading(false);
    toast.success("Imagem enviada!");
  };

  const handleSave = async () => {
    if (!form.tag || !form.title || !form.subtitle || !form.button_text || !form.button_link) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSaving(true);
    const payload = {
      context: form.context || ctx,
      image_url: form.image_url || "",
      tag: form.tag!,
      title: form.title!,
      subtitle: form.subtitle!,
      button_text: form.button_text || null,
      button_link: form.button_link || null,
      active: form.active ?? true,
      display_order: form.display_order ?? 0,
    };

    if ((form as Banner).id) {
      const { error } = await supabase.from("content_banners").update(payload).eq("id", (form as Banner).id);
      if (error) toast.error(error.message); else toast.success("Banner atualizado");
    } else {
      const { error } = await supabase.from("content_banners").insert(payload);
      if (error) toast.error(error.message); else toast.success("Banner criado");
    }
    setSaving(false);
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este banner?")) return;
    const { error } = await supabase.from("content_banners").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Excluído"); load(); }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("content_banners").update({ active }).eq("id", id);
    load();
  };

  const openNew = () => {
    const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.display_order)) + 1 : 1;
    setForm({ ...emptyForm, context: ctx, display_order: nextOrder });
    setOpen(true);
  };

  const openEdit = (b: Banner) => {
    setForm(b);
    setOpen(true);
  };

  if (loading) return <div className="text-gray-400">Carregando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Banners — {ctx === "futebol" ? "Futebol" : "Cassino"}</h2>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4" /> Novo</Button>
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-gray-500">
              <th className="px-3 py-2">Preview</th>
              <th className="px-3 py-2">Título</th>
              <th className="px-3 py-2">Tag</th>
              <th className="px-3 py-2">Ativo</th>
              <th className="px-3 py-2">Ordem</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-b border-white/5 text-gray-300">
                <td className="px-3 py-2">
                  {b.image_url ? (
                    <img src={b.image_url} alt="" className="w-20 h-11 object-cover rounded-md border border-white/10" />
                  ) : (
                    <div className="w-20 h-11 rounded-md bg-gradient-to-br from-purple-700 to-purple-900 border border-white/10" />
                  )}
                </td>
                <td className="px-3 py-2 max-w-[160px] truncate">{b.title}</td>
                <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs">{b.tag}</span></td>
                <td className="px-3 py-2"><Switch checked={b.active} onCheckedChange={(v) => toggleActive(b.id, v)} /></td>
                <td className="px-3 py-2 text-center">{b.display_order}</td>
                <td className="px-3 py-2 flex gap-2">
                  <button onClick={() => openEdit(b)} className="text-blue-400 hover:text-blue-300"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(b.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-600">Nenhum banner</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{(form as Banner).id ? "Editar" : "Novo"} Banner</DialogTitle></DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: form fields */}
            <div className="space-y-3">
              <div>
                <Label className="text-gray-400 text-xs">Contexto</Label>
                <Select value={form.context || ctx} onValueChange={(v) => setForm({ ...form, context: v })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="futebol">Futebol</SelectItem>
                    <SelectItem value="cassino">Cassino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-400 text-xs">Imagem de Fundo (16:9)</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="URL da imagem"
                    value={form.image_url ?? ""}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    className="bg-gray-800 border-gray-700 flex-1"
                  />
                  <label className="cursor-pointer shrink-0">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
                    <span className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-purple-600 hover:bg-purple-500 text-sm text-white transition-colors">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    </span>
                  </label>
                </div>
                {form.image_url && (
                  <div className="mt-2 relative">
                    <img src={form.image_url} alt="" className="w-full aspect-video object-cover rounded-md border border-white/10" />
                    <button onClick={() => setForm({ ...form, image_url: "" })} className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white"><X className="w-3 h-3" /></button>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-gray-400 text-xs">Tag / Glass (máx 30)</Label>
                <Input placeholder="PREMIER ULTRA" maxLength={30} value={form.tag ?? ""} onChange={(e) => setForm({ ...form, tag: e.target.value })} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Título (máx 60)</Label>
                <Input placeholder="Desbloqueie Alavancagem" maxLength={60} value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Subtítulo (máx 100)</Label>
                <Input placeholder="Sequências estratégicas de entradas" maxLength={100} value={form.subtitle ?? ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Texto do Botão (máx 25)</Label>
                <Input placeholder="Acesse aqui" maxLength={25} value={form.button_text ?? ""} onChange={(e) => setForm({ ...form, button_text: e.target.value })} className="bg-gray-800 border-gray-700" />
              </div>
              <div>
                <Label className="text-gray-400 text-xs">Link do Botão</Label>
                <Input placeholder="https://... ou /rota" value={form.button_link ?? ""} onChange={(e) => setForm({ ...form, button_link: e.target.value })} className="bg-gray-800 border-gray-700" />
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <Label className="text-gray-400 text-xs">Ordem</Label>
                  <Input type="number" min={0} value={form.display_order ?? 0} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} className="bg-gray-800 border-gray-700" />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <Switch checked={form.active ?? true} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  <Label className="text-gray-400 text-xs">Ativo</Label>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>

            {/* Right: Live preview */}
            <div>
              <Label className="text-gray-400 text-xs mb-2 block">Preview</Label>
              <div className="relative overflow-hidden rounded-xl border border-purple-500/30 shadow-lg shadow-purple-900/30 aspect-video">
                {form.image_url ? (
                  <img src={form.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1A0D2E] via-[#2D1B4E] to-[#0D0A1A]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute top-0 left-1/4 w-40 h-40 bg-purple-500/30 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative h-full flex flex-col justify-end p-4">
                  {form.tag && (
                    <span className="inline-flex w-fit items-center gap-1 px-2 py-1 mb-2 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-[10px] font-medium uppercase tracking-wider backdrop-blur-sm">
                      {form.tag}
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-white leading-tight mb-1">{form.title || "Título"}</h3>
                  <p className="text-xs text-purple-200/70 mb-2">{form.subtitle || "Subtítulo"}</p>
                  {form.button_text && (
                    <span className="inline-flex items-center gap-1 w-fit px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold">
                      {form.button_text}
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
