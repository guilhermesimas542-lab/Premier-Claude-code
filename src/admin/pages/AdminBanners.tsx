import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Loader2, ChevronRight, Upload, X, Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAdminMode } from "@/admin/context/AdminModeContext";
import { format } from "date-fns";

type BannerStatus = "active" | "inactive" | "deleted";

interface Banner {
  id: string;
  context: string;
  image_url: string;
  tag: string;
  title: string;
  subtitle: string;
  button_text: string | null;
  button_link: string | null;
  status: BannerStatus;
  display_order: number;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}

const emptyForm = {
  context: "futebol",
  image_url: "",
  tag: "",
  title: "",
  subtitle: "",
  button_text: "Acesse aqui",
  button_link: "",
  status: "active" as BannerStatus,
  display_order: 0,
  starts_at: "",
  ends_at: "",
};

export default function AdminBanners() {
  const { mode } = useAdminMode();
  const ctx = mode === "cassino" ? "cassino" : "futebol";

  const [allItems, setAllItems] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Banner>>({ ...emptyForm, context: ctx });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<BannerStatus>("active");

  // Confirm dialog state
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("content_banners")
      .select("*")
      .eq("context", ctx)
      .order("display_order", { ascending: true });
    setAllItems((data as unknown as Banner[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [ctx]);

  const items = allItems.filter((b) => b.status === tab);

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

  const toLocalDatetime = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const handleSave = async () => {
    if (!form.tag || !form.title || !form.subtitle || !form.button_text || !form.button_link) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      context: form.context || ctx,
      image_url: form.image_url || "",
      tag: form.tag!,
      title: form.title!,
      subtitle: form.subtitle!,
      button_text: form.button_text || null,
      button_link: form.button_link || null,
      status: form.status ?? "active",
      display_order: form.display_order ?? 0,
      starts_at: form.starts_at || new Date().toISOString(),
      ends_at: form.ends_at || null,
    };

    if ((form as Banner).id) {
      const { error } = await supabase.from("content_banners").update(payload).eq("id", (form as Banner).id);
      if (error) toast.error(error.message); else toast.success("Banner atualizado");
    } else {
      const { error } = await supabase.from("content_banners").insert(payload as any);
      if (error) toast.error(error.message); else toast.success("Banner criado");
    }
    setSaving(false);
    setOpen(false);
    load();
  };

  const changeStatus = async (id: string, newStatus: BannerStatus) => {
    await supabase.from("content_banners").update({ status: newStatus }).eq("id", id);
    load();
  };

  const permanentDelete = async (b: Banner) => {
    // Delete image from storage if it exists
    if (b.image_url) {
      try {
        const url = new URL(b.image_url);
        const parts = url.pathname.split("/banners/");
        if (parts[1]) await supabase.storage.from("banners").remove([parts[1]]);
      } catch { /* ignore */ }
    }
    const { error } = await supabase.from("content_banners").delete().eq("id", b.id);
    if (error) toast.error(error.message); else { toast.success("Excluído permanentemente"); load(); }
  };

  const openNew = () => {
    const nextOrder = allItems.length > 0 ? Math.max(...allItems.map((i) => i.display_order)) + 1 : 1;
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localNow = new Date(now.getTime() - offset).toISOString().slice(0, 16);
    setForm({ ...emptyForm, context: ctx, display_order: nextOrder, starts_at: localNow, ends_at: "" });
    setOpen(true);
  };

  const openEdit = (b: Banner) => {
    setForm({ ...b, starts_at: toLocalDatetime(b.starts_at), ends_at: toLocalDatetime(b.ends_at) });
    setOpen(true);
  };

  const renderScheduleInfo = (b: Banner) => {
    const now = new Date();
    const start = new Date(b.starts_at);
    const isFuture = start > now;
    return (
      <div className="text-xs space-y-0.5">
        {isFuture ? (
          <span className="text-amber-400">Inicia em {format(start, "dd/MM/yyyy HH:mm")}</span>
        ) : (
          <span className="text-green-400">Ativo desde {format(start, "dd/MM/yyyy HH:mm")}</span>
        )}
        {b.ends_at && <div className="text-gray-500">Até {format(new Date(b.ends_at), "dd/MM/yyyy HH:mm")}</div>}
      </div>
    );
  };

  const renderTable = (list: Banner[], tabStatus: BannerStatus) => (
    <div className="bg-gray-900 rounded-xl border border-white/10 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-gray-500">
            <th className="px-3 py-2">Preview</th>
            <th className="px-3 py-2">Título</th>
            <th className="px-3 py-2">Tag</th>
            {tabStatus === "active" && <th className="px-3 py-2">Programado</th>}
            <th className="px-3 py-2">Ordem</th>
            <th className="px-3 py-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {list.map((b) => (
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
              {tabStatus === "active" && <td className="px-3 py-2">{renderScheduleInfo(b)}</td>}
              <td className="px-3 py-2 text-center">{b.display_order}</td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
                  {tabStatus !== "deleted" && (
                    <button onClick={() => openEdit(b)} className="text-blue-400 hover:text-blue-300" title="Editar"><Pencil className="w-4 h-4" /></button>
                  )}
                  {tabStatus === "active" && (
                    <button onClick={() => setConfirmAction({ title: "Desativar banner?", description: "Ele não aparecerá mais no carrossel.", onConfirm: () => { changeStatus(b.id, "inactive"); setConfirmAction(null); } })} className="text-yellow-400 hover:text-yellow-300" title="Desativar"><Pause className="w-4 h-4" /></button>
                  )}
                  {tabStatus === "inactive" && (
                    <button onClick={() => setConfirmAction({ title: "Ativar banner?", description: "Ele passará a aparecer no carrossel.", onConfirm: () => { changeStatus(b.id, "active"); setConfirmAction(null); } })} className="text-green-400 hover:text-green-300" title="Ativar"><Play className="w-4 h-4" /></button>
                  )}
                  {tabStatus !== "deleted" && (
                    <button onClick={() => setConfirmAction({ title: "Excluir banner?", description: "Ele será movido para a lixeira.", onConfirm: () => { changeStatus(b.id, "deleted"); setConfirmAction(null); } })} className="text-red-400 hover:text-red-300" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                  )}
                  {tabStatus === "deleted" && (
                    <>
                      <button onClick={() => setConfirmAction({ title: "Restaurar banner?", description: "Ele voltará para a aba Inativos.", onConfirm: () => { changeStatus(b.id, "inactive"); setConfirmAction(null); } })} className="text-blue-400 hover:text-blue-300" title="Restaurar"><RotateCcw className="w-4 h-4" /></button>
                      <button onClick={() => setConfirmAction({ title: "Excluir permanentemente?", description: "Esta ação é irreversível. O banner será apagado permanentemente.", onConfirm: () => { permanentDelete(b); setConfirmAction(null); } })} className="text-red-500 hover:text-red-400" title="Excluir permanentemente"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr><td colSpan={tabStatus === "active" ? 6 : 5} className="px-4 py-6 text-center text-gray-600">Nenhum banner</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  if (loading) return <div className="text-gray-400">Carregando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Banners — {ctx === "futebol" ? "Futebol" : "Cassino"}</h2>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4" /> Novo</Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as BannerStatus)} className="w-full">
        <TabsList className="bg-gray-800/60 border border-white/10">
          <TabsTrigger value="active" className="data-[state=active]:bg-green-600/20 data-[state=active]:text-green-400">Ativos ({allItems.filter(b => b.status === "active").length})</TabsTrigger>
          <TabsTrigger value="inactive" className="data-[state=active]:bg-yellow-600/20 data-[state=active]:text-yellow-400">Inativos ({allItems.filter(b => b.status === "inactive").length})</TabsTrigger>
          <TabsTrigger value="deleted" className="data-[state=active]:bg-red-600/20 data-[state=active]:text-red-400">Excluídos ({allItems.filter(b => b.status === "deleted").length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">{renderTable(items, "active")}</TabsContent>
        <TabsContent value="inactive">{renderTable(items, "inactive")}</TabsContent>
        <TabsContent value="deleted">{renderTable(items, "deleted")}</TabsContent>
      </Tabs>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => { if (!o) setConfirmAction(null); }}>
        <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">{confirmAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-gray-300 border-gray-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction?.onConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{(form as Banner).id ? "Editar" : "Novo"} Banner</DialogTitle></DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <Label className="text-gray-400 text-xs">Imagem de Fundo (1280 x 720px — 16:9)</Label>
                <div className="flex gap-2 items-center">
                  <Input placeholder="URL da imagem" value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="bg-gray-800 border-gray-700 flex-1" />
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-400 text-xs">Programar Início (Brasília)</Label>
                  <Input type="datetime-local" value={form.starts_at ?? ""} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="bg-gray-800 border-gray-700" />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Programar Fim (opcional)</Label>
                  <Input type="datetime-local" value={form.ends_at ?? ""} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="bg-gray-800 border-gray-700" />
                </div>
              </div>

              <div>
                <Label className="text-gray-400 text-xs">Ordem</Label>
                <Input type="number" min={0} value={form.display_order ?? 0} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} className="bg-gray-800 border-gray-700" />
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
