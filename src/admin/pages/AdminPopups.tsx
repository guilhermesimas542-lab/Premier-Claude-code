import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Loader2, Upload, X, Check, ChevronRight, ImageIcon, Layers } from "lucide-react";
import { toast } from "sonner";
import { useBettingHouseAdmin } from "../context/BettingHouseContext";

// ─── Types & Constants ───────────────────────────────────────────────────────

const POPUP_TYPES = [
  { value: "welcome",            label: "🎉 Boas-Vindas",          desc: "Exibido na primeira visita" },
  { value: "upgrade_basic",      label: "🔓 Upgrade Básico",        desc: "Para usuários Free" },
  { value: "upgrade_pro",        label: "⭐ Upgrade Pro",           desc: "Para Free e Básico" },
  { value: "upgrade_ultra",      label: "👑 Upgrade Ultra",         desc: "Para todos abaixo de Ultra" },
  { value: "addon_alavancagem",  label: "⚓ Add-on Alavancagem",    desc: "Sem add-on Alavancagem" },
  { value: "addon_odds",         label: "🎯 Add-on Odds Altas",     desc: "Sem add-on Odds Altas" },
  { value: "addon_telegram",     label: "📱 Add-on Live Telegram",  desc: "Sem Live Telegram" },
  { value: "promotional",        label: "📣 Promocional",           desc: "Pop-up avulso com alvo configurável" },
] as const;

const AUDIENCE_OPTIONS = [
  { value: "all",   label: "Todos" },
  { value: "free",  label: "Só Free" },
  { value: "basic", label: "Só Básico" },
  { value: "pro",   label: "Só Pro" },
  { value: "ultra", label: "Só Ultra" },
];

const typeLabel  = (t: string) => POPUP_TYPES.find((p) => p.value === t)?.label ?? t;

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

// ─── Mini Preview ─────────────────────────────────────────────────────────────

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
        {questions.length > 0 ? (
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
        ) : (
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

// ─── Summary Card ─────────────────────────────────────────────────────────────

function PopupSummaryCard({
  popup,
  onEdit,
  onDelete,
  onToggle,
}: {
  popup: PopupRow;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const qCount = [popup.question_1_text, popup.question_2_text, popup.question_3_text].filter(Boolean).length;

  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden flex flex-col">
      {/* Image thumbnail */}
      <div className="relative w-full h-28 bg-gray-800">
        {popup.image_url ? (
          <img src={popup.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-700" />
          </div>
        )}
        {/* Active badge */}
        <span
          className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            popup.is_active
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
        >
          {popup.is_active ? "Ativo" : "Inativo"}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <p className="text-sm font-semibold text-white leading-tight">{typeLabel(popup.type)}</p>

        <div className="flex flex-wrap gap-1.5">
          {qCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/20">
              {qCount} perg.
            </span>
          )}
          {popup.checkout_link && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/20">
              Checkout
            </span>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
            {AUDIENCE_OPTIONS.find((a) => a.value === popup.target_audience)?.label ?? popup.target_audience}
          </span>
        </div>

        <div className="mt-auto flex gap-1.5 pt-2">
          <Button
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={onEdit}
          >
            <Pencil className="w-3 h-3" /> Editar Funil
          </Button>
          <button
            onClick={onToggle}
            className="h-7 px-2 rounded-md border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-colors"
            title={popup.is_active ? "Desativar" : "Ativar"}
          >
            <Switch checked={popup.is_active} onCheckedChange={onToggle} className="pointer-events-none scale-75" />
          </button>
          <button
            onClick={onDelete}
            className="h-7 px-2 rounded-md border border-white/10 text-red-500 hover:text-red-400 hover:border-red-500/30 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPopups() {
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

  const openNew = () => { setEditId(null); setForm({ ...emptyForm }); setOpen(true); };

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

  if (houseLoading) return (
    <div className="flex items-center gap-2 text-gray-400 py-20">
      <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">Pop-ups e Funis de Venda</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {selectedHouse
              ? `Casa: ${selectedHouse.name}`
              : "Nenhuma casa selecionada (global)"}
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="w-4 h-4" /> Novo Pop-up
        </Button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-10">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-600 border border-dashed border-white/10 rounded-xl">
          <Layers className="w-10 h-10" />
          <p className="text-sm">Nenhum pop-up criado ainda</p>
          <Button size="sm" variant="outline" onClick={openNew}>
            <Plus className="w-4 h-4" /> Criar primeiro pop-up
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((row) => (
            <PopupSummaryCard
              key={row.id}
              popup={row}
              onEdit={() => openEdit(row)}
              onDelete={() => setDeleteTarget(row)}
              onToggle={() => toggleActive(row)}
            />
          ))}
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

              {/* Audience */}
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
                  {form.image_url && (
                    <button onClick={() => f("image_url", "")} className="text-gray-500 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-3 border border-dashed border-gray-700 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Funil de Perguntas</p>
                {[1, 2, 3].map((n) => (
                  <div key={n} className="space-y-1.5">
                    <Input
                      placeholder={`Pergunta ${n}`}
                      value={(form as any)[`question_${n}_text`]}
                      onChange={(e) => f(`question_${n}_text` as keyof FormState, e.target.value)}
                      className="bg-gray-800 border-gray-700 text-sm"
                    />
                    <Input
                      placeholder="Opções (separadas por vírgula)"
                      value={(form as any)[`question_${n}_options`]}
                      onChange={(e) => f(`question_${n}_options` as keyof FormState, e.target.value)}
                      className="bg-gray-800 border-gray-700 text-sm text-gray-400"
                    />
                  </div>
                ))}
              </div>

              {/* Final screen */}
              <div className="space-y-3 border border-dashed border-gray-700 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tela Final</p>
                <Input
                  placeholder="Título final (ex: O Plano PRO é pra você!)"
                  value={form.final_title}
                  onChange={(e) => f("final_title", e.target.value)}
                  className="bg-gray-800 border-gray-700 text-sm"
                />
                <Textarea
                  placeholder="Benefícios (separados por vírgula)"
                  value={form.final_benefits}
                  onChange={(e) => f("final_benefits", e.target.value)}
                  className="bg-gray-800 border-gray-700 text-sm min-h-[64px]"
                />
                <Input
                  placeholder="Link de checkout (https://...)"
                  value={form.checkout_link}
                  onChange={(e) => f("checkout_link", e.target.value)}
                  className="bg-gray-800 border-gray-700 text-sm"
                />
              </div>
            </div>

            {/* Right: preview */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pré-visualização</p>
              <PopupPreview form={form} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="border-gray-700 text-gray-300">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editId ? "Salvar Alterações" : "Criar Pop-up"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
