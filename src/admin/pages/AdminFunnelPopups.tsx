import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Upload, X, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useBettingHouseAdmin } from "@/admin/context/BettingHouseContext";
import { Textarea } from "@/components/ui/textarea";

const POPUP_TYPES = [
  { value: "welcome", label: "🎉 Boas-Vindas", desc: "Exibido na primeira visita" },
  { value: "upgrade_basic", label: "🔓 Upgrade Básico", desc: "Para usuários Free" },
  { value: "upgrade_pro", label: "⭐ Upgrade Pro", desc: "Para Free e Básico" },
  { value: "upgrade_ultra", label: "👑 Upgrade Ultra", desc: "Para todos abaixo de Ultra" },
  { value: "addon_alavancagem", label: "⚓ Add-on Alavancagem", desc: "Sem add-on Alavancagem" },
  { value: "addon_odds", label: "🎯 Add-on Odds Altas", desc: "Sem add-on Odds Altas" },
  { value: "addon_telegram", label: "📱 Add-on Live Telegram", desc: "Sem Live Telegram" },
  { value: "promotional", label: "📣 Promocional", desc: "Pop-up avulso com alvo configurável" },
] as const;

const AUDIENCE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "free", label: "Só Free" },
  { value: "basic", label: "Só Básico" },
  { value: "pro", label: "Só Pro" },
  { value: "ultra", label: "Só Ultra" },
];

const typeLabel = (t: string) => POPUP_TYPES.find((p) => p.value === t)?.label ?? t;

interface PopupRow {
  id: string;
  type: string;
  is_active: boolean;
  target_audience: string;
  image_url: string | null;
  question_1_text: string | null;
  question_1_options: string[] | null;
  question_2_text: string | null;
  question_2_options: string[] | null;
  question_3_text: string | null;
  question_3_options: string[] | null;
  final_title: string | null;
  final_benefits: string[] | null;
  checkout_link: string | null;
  created_at: string;
}

type FormState = {
  type: string;
  is_active: boolean;
  target_audience: string;
  image_url: string;
  question_1_text: string;
  question_1_options: string;
  question_2_text: string;
  question_2_options: string;
  question_3_text: string;
  question_3_options: string;
  final_title: string;
  final_benefits: string;
  checkout_link: string;
};

const emptyForm: FormState = {
  type: "upgrade_pro",
  is_active: true,
  target_audience: "all",
  image_url: "",
  question_1_text: "",
  question_1_options: "",
  question_2_text: "",
  question_2_options: "",
  question_3_text: "",
  question_3_options: "",
  final_title: "",
  final_benefits: "",
  checkout_link: "",
};

function toArray(csv: string): string[] {
  return csv.split(",").map((s) => s.trim()).filter(Boolean);
}

function toCsv(arr: string[] | null): string {
  return (arr ?? []).join(", ");
}

function PopupPreview({ form }: { form: FormState }) {
  const questions = [
    { text: form.question_1_text, opts: toArray(form.question_1_options) },
    { text: form.question_2_text, opts: toArray(form.question_2_options) },
    { text: form.question_3_text, opts: toArray(form.question_3_options) },
  ].filter((q) => q.text && q.opts.length > 0);

  const benefits = toArray(form.final_benefits);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(145deg, #0a1a0a, #0f2410)",
        border: "1px solid rgba(0,255,0,0.2)",
        boxShadow: "0 0 20px rgba(0,255,0,0.06)",
      }}
    >
      {form.image_url && (
        <img src={form.image_url} alt="" className="w-full h-28 object-cover" />
      )}
      <div className="p-4 space-y-3">
        {questions.length > 0 && (
          <>
            <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#00FF00" }}>
              Pergunta 1 de {questions.length}
            </p>
            <p className="text-sm font-bold text-white">{questions[0].text}</p>
            <div className="space-y-1.5">
              {questions[0].opts.slice(0, 3).map((o) => (
                <div
                  key={o}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-white/70"
                  style={{ background: "rgba(0,255,0,0.05)", border: "1px solid rgba(0,255,0,0.12)" }}
                >
                  {o} <ChevronRight className="w-3 h-3 text-white/30" />
                </div>
              ))}
            </div>
          </>
        )}
        {questions.length === 0 && (
          <>
            <p className="text-sm font-bold text-white text-center">{form.final_title || "Título Final"}</p>
            {benefits.slice(0, 3).map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-white/70">
                <Check className="w-3 h-3 shrink-0" style={{ color: "#00FF00" }} />{b}
              </div>
            ))}
            {form.checkout_link && (
              <div
                className="w-full py-2 text-center text-xs font-bold text-black rounded-lg"
                style={{ background: "linear-gradient(135deg, #00FF00, #00CC00)" }}
              >
                QUERO ACESSAR →
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminFunnelPopups() {
  const { selectedHouseId, selectedHouse, loading: houseLoading } = useBettingHouseAdmin();
  const [items, setItems] = useState<PopupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PopupRow | null>(null);

  const load = async () => {
    setLoading(true);
    let q = (supabase.from("popups" as any) as any).select("*").order("created_at", { ascending: false });
    if (selectedHouseId) q = q.eq("betting_house_id", selectedHouseId);
    else q = q.is("betting_house_id", null);
    const { data } = await q;
    setItems((data as PopupRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [selectedHouseId]);

  const openNew = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (row: PopupRow) => {
    setEditId(row.id);
    setForm({
      type: row.type,
      is_active: row.is_active,
      target_audience: row.target_audience,
      image_url: row.image_url ?? "",
      question_1_text: row.question_1_text ?? "",
      question_1_options: toCsv(row.question_1_options),
      question_2_text: row.question_2_text ?? "",
      question_2_options: toCsv(row.question_2_options),
      question_3_text: row.question_3_text ?? "",
      question_3_options: toCsv(row.question_3_options),
      final_title: row.final_title ?? "",
      final_benefits: toCsv(row.final_benefits),
      checkout_link: row.checkout_link ?? "",
    });
    setOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `funnel-popups/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("popups").upload(path, file, { upsert: true });
    if (error) { toast.error("Erro no upload: " + error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("popups").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl + "?t=" + Date.now() }));
    setUploading(false);
    toast.success("Imagem enviada!");
  };

  const handleSave = async () => {
    if (!form.checkout_link && !form.question_1_text) {
      toast.error("Adicione pelo menos um link de checkout ou uma pergunta do funil");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      type: form.type,
      is_active: form.is_active,
      target_audience: form.target_audience,
      image_url: form.image_url || null,
      question_1_text: form.question_1_text || null,
      question_1_options: form.question_1_options ? toArray(form.question_1_options) : null,
      question_2_text: form.question_2_text || null,
      question_2_options: form.question_2_options ? toArray(form.question_2_options) : null,
      question_3_text: form.question_3_text || null,
      question_3_options: form.question_3_options ? toArray(form.question_3_options) : null,
      final_title: form.final_title || null,
      final_benefits: form.final_benefits ? toArray(form.final_benefits) : null,
      checkout_link: form.checkout_link || null,
      betting_house_id: selectedHouseId || null,
      updated_at: new Date().toISOString(),
    };

    let error: any;
    if (editId) {
      ({ error } = await (supabase.from("popups" as any) as any).update(payload).eq("id", editId));
    } else {
      ({ error } = await (supabase.from("popups" as any) as any).insert(payload));
    }

    if (error) toast.error(error.message);
    else toast.success(editId ? "Pop-up atualizado!" : "Pop-up criado!");
    setSaving(false);
    setOpen(false);
    load();
  };

  const handleDelete = async (row: PopupRow) => {
    const { error } = await (supabase.from("popups" as any) as any).delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else { toast.success("Excluído"); load(); }
    setDeleteTarget(null);
  };

  const toggleActive = async (row: PopupRow) => {
    await (supabase.from("popups" as any) as any).update({ is_active: !row.is_active }).eq("id", row.id);
    load();
  };

  const f = (k: keyof FormState, v: string | boolean) => setForm((prev) => ({ ...prev, [k]: v }));

  if (houseLoading) return <div className="flex items-center gap-2 text-gray-400 py-20"><Loader2 className="w-4 h-4 animate-spin" /> Carregando…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Pop-ups de Funil</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {selectedHouse ? `Casa: ${selectedHouse.name}` : "Sem casa selecionada (global)"}
          </p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4" /> Novo</Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-10"><Loader2 className="w-4 h-4 animate-spin" /> Carregando…</div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-500">
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Público</th>
                <th className="px-4 py-3">Perguntas</th>
                <th className="px-4 py-3">Checkout</th>
                <th className="px-4 py-3 text-center">Ativo</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const qCount = [row.question_1_text, row.question_2_text, row.question_3_text].filter(Boolean).length;
                return (
                  <tr key={row.id} className="border-b border-white/5 text-gray-300">
                    <td className="px-4 py-3 font-medium text-white">{typeLabel(row.type)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {AUDIENCE_OPTIONS.find((a) => a.value === row.target_audience)?.label ?? row.target_audience}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${qCount > 0 ? "bg-blue-500/20 text-blue-300" : "bg-gray-700 text-gray-500"}`}>
                        {qCount > 0 ? `${qCount} pergunta${qCount > 1 ? "s" : ""}` : "Sem funil"}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[140px] truncate text-xs text-gray-500">
                      {row.checkout_link ? (
                        <span className="text-green-400 truncate">{row.checkout_link}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch checked={row.is_active} onCheckedChange={() => toggleActive(row)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(row)} className="text-blue-400 hover:text-blue-300"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteTarget(row)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600">Nenhum pop-up criado ainda</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pop-up?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              O pop-up <strong>{typeLabel(deleteTarget?.type ?? "")}</strong> será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-gray-300 border-gray-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar" : "Novo"} Pop-up de Funil</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: form */}
            <div className="space-y-4">
              {/* Type */}
              <div>
                <Label className="text-gray-400 text-xs">Tipo de Pop-up</Label>
                <Select value={form.type} onValueChange={(v) => f("type", v)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POPUP_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div>
                          <div>{t.label}</div>
                          <div className="text-[10px] text-gray-500">{t.desc}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Audience (only for promotional) */}
              {form.type === "promotional" && (
                <div>
                  <Label className="text-gray-400 text-xs">Público-Alvo</Label>
                  <Select value={form.target_audience} onValueChange={(v) => f("target_audience", v)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AUDIENCE_OPTIONS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={(v) => f("is_active", v)} />
                <Label className="text-gray-300 text-sm">Ativo</Label>
              </div>

              {/* Image */}
              <div>
                <Label className="text-gray-400 text-xs">Imagem de Destaque</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="URL da imagem"
                    value={form.image_url}
                    onChange={(e) => f("image_url", e.target.value)}
                    className="bg-gray-800 border-gray-700 flex-1"
                  />
                  <label className="cursor-pointer shrink-0">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
                    <span className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-green-700 hover:bg-green-600 text-sm text-white transition-colors">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    </span>
                  </label>
                </div>
                {form.image_url && (
                  <div className="mt-2 relative">
                    <img src={form.image_url} alt="" className="w-full h-24 object-cover rounded-lg border border-white/10" />
                    <button onClick={() => f("image_url", "")} className="absolute top-1 right-1 p-1 rounded-full bg-black/60"><X className="w-3 h-3 text-white" /></button>
                  </div>
                )}
              </div>

              {/* Questions */}
              <div className="space-y-3 p-3 rounded-xl" style={{ background: "rgba(0,255,0,0.03)", border: "1px dashed rgba(0,255,0,0.15)" }}>
                <p className="text-xs font-semibold text-white">Funil de Perguntas <span className="text-gray-500 font-normal">(opcional)</span></p>

                {([1, 2, 3] as const).map((n) => (
                  <div key={n} className="space-y-1.5">
                    <Label className="text-gray-500 text-[11px]">Pergunta {n}</Label>
                    <Input
                      placeholder={`Texto da pergunta ${n}`}
                      value={(form as any)[`question_${n}_text`]}
                      onChange={(e) => f(`question_${n}_text` as keyof FormState, e.target.value)}
                      className="bg-gray-800 border-gray-700 text-sm"
                    />
                    <Input
                      placeholder="Opções separadas por vírgula: Opção A, Opção B"
                      value={(form as any)[`question_${n}_options`]}
                      onChange={(e) => f(`question_${n}_options` as keyof FormState, e.target.value)}
                      className="bg-gray-800 border-gray-700 text-xs"
                    />
                  </div>
                ))}
              </div>

              {/* Final screen */}
              <div className="space-y-3 p-3 rounded-xl" style={{ background: "rgba(0,200,255,0.03)", border: "1px dashed rgba(0,200,255,0.15)" }}>
                <p className="text-xs font-semibold text-white">Tela Final</p>
                <div>
                  <Label className="text-gray-500 text-[11px]">Título</Label>
                  <Input placeholder="O Plano PRO é perfeito para você!" value={form.final_title} onChange={(e) => f("final_title", e.target.value)} className="bg-gray-800 border-gray-700 text-sm" />
                </div>
                <div>
                  <Label className="text-gray-500 text-[11px]">Benefícios (separados por vírgula)</Label>
                  <Textarea
                    placeholder="Entradas exclusivas Pro, Suporte via Telegram, Análises de IA"
                    value={form.final_benefits}
                    onChange={(e) => f("final_benefits", e.target.value)}
                    className="bg-gray-800 border-gray-700 text-xs resize-none"
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="text-gray-500 text-[11px]">Link de Checkout <span className="text-red-400">*</span></Label>
                  <Input placeholder="https://pay.hotmart.com/..." value={form.checkout_link} onChange={(e) => f("checkout_link", e.target.value)} className="bg-gray-800 border-gray-700 text-sm" />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Pop-up"}
              </Button>
            </div>

            {/* Right: preview */}
            <div>
              <Label className="text-gray-400 text-xs mb-2 block">Preview</Label>
              <PopupPreview form={form} />
              <p className="text-[11px] text-gray-600 mt-2 text-center">Preview aproximado — as perguntas avançam com o clique</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
