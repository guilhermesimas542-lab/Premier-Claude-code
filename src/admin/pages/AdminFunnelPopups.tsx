import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Upload, X, Eye, BarChart2, RefreshCw } from "lucide-react";
import FunnelAnalyticsModal from "@/admin/components/FunnelAnalyticsModal";
import { toast } from "sonner";
import { useBettingHouseAdmin } from "@/admin/context/BettingHouseContext";
import { Textarea } from "@/components/ui/textarea";
import FunnelBuilder from "@/admin/components/funnel-popup/FunnelBuilder";
import FinalTemplateEditor from "@/admin/components/funnel-popup/FinalTemplateEditor";
import InteractivePreview from "@/admin/components/funnel-popup/InteractivePreview";
import TestPopupModal from "@/admin/components/funnel-popup/TestPopupModal";
import {
  type PopupRow, type PopupFormState,
  POPUP_TYPES, AUDIENCE_OPTIONS, typeLabel,
  emptyForm, formToPayload, rowToForm,
} from "@/admin/components/funnel-popup/types";

export default function AdminFunnelPopups() {
  const { selectedHouseId, selectedHouse, loading: houseLoading } = useBettingHouseAdmin();
  const [items, setItems] = useState<PopupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PopupFormState>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PopupRow | null>(null);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [testOpen, setTestOpen] = useState(false);
  const [analyticsTarget, setAnalyticsTarget] = useState<{ id: string; name: string } | null>(null);
  const [metrics, setMetrics] = useState<Record<string, { views: number; clicks: number }>>({});

  const loadMetrics = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data } = await supabase
      .from("funnel_analytics")
      .select("entity_id, event_type")
      .eq("entity_type", "popup")
      .in("entity_id", ids)
      .in("event_type", ["view", "checkout_click"]);
    const map: Record<string, { views: number; clicks: number }> = {};
    (data ?? []).forEach((row: any) => {
      if (!map[row.entity_id]) map[row.entity_id] = { views: 0, clicks: 0 };
      if (row.event_type === "view") map[row.entity_id].views++;
      else if (row.event_type === "checkout_click") map[row.entity_id].clicks++;
    });
    setMetrics(map);
  };

  const load = async () => {
    setLoading(true);
    let q = (supabase.from("popups" as any) as any).select("*").order("created_at", { ascending: false });
    if (selectedHouseId) q = q.eq("betting_house_id", selectedHouseId);
    else q = q.is("betting_house_id", null);
    const { data } = await q;
    const rows = (data as PopupRow[]) ?? [];
    setItems(rows);
    setLoading(false);
    loadMetrics(rows.map((r) => r.id));
  };

  useEffect(() => { load(); }, [selectedHouseId]);

  const openNew = () => { setEditId(null); setForm({ ...emptyForm }); setOpen(true); };
  const openEdit = (row: PopupRow) => { setEditId(row.id); setForm(rowToForm(row)); setOpen(true); };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `funnel-popups/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("popups").upload(path, file, { upsert: true });
    if (error) { toast.error("Error al subir: " + error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("popups").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl + "?t=" + Date.now() }));
    setUploading(false);
    toast.success("¡Imagen enviada!");
  };

  const handleSave = async () => {
    const hasButton = form.checkout_link.trim() && form.final_title.trim();
    const hasFunnel = form.questions.some((q) => q.text.trim());
    if (!hasButton && !hasFunnel && form.type !== "casino_welcome" && form.type !== "welcome_paid") {
      toast.error("Error: el pop-up necesita tener un 'Botón con URL' o, al menos, la 'Pregunta 1' del embudo completada.");
      return;
    }
    setSaving(true);
    const payload = formToPayload(form, selectedHouseId);
    let error: any;
    if (editId) {
      ({ error } = await (supabase.from("popups" as any) as any).update(payload).eq("id", editId));
    } else {
      ({ error } = await (supabase.from("popups" as any) as any).insert(payload));
    }
    if (error) toast.error(error.message);
    else toast.success(editId ? "¡Pop-up actualizado!" : "¡Pop-up creado!");
    setSaving(false);
    setOpen(false);
    load();
  };

  const handleDelete = async (row: PopupRow) => {
    const { error } = await (supabase.from("popups" as any) as any).delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else { toast.success("Eliminado"); load(); }
    setDeleteTarget(null);
  };

  const toggleActive = async (row: PopupRow) => {
    await (supabase.from("popups" as any) as any).update({ is_active: !row.is_active }).eq("id", row.id);
    load();
  };

  const f = (k: keyof PopupFormState, v: any) => setForm((prev) => ({ ...prev, [k]: v }));

  if (houseLoading) return <div className="flex items-center gap-2 text-gray-400 py-20"><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Pop-ups de Embudo</h2>
            <button
              onClick={() => load()}
              className="p-2 rounded-lg bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-white transition-colors"
              title="Actualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            {selectedHouse ? `Casa: ${selectedHouse.name}` : "Sin casa seleccionada (global)"}
          </p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4" /> Nuevo</Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-10"><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-500">
                <th className="px-4 py-3 w-[80px]">Vista previa</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Público</th>
                <th className="px-4 py-3">Preguntas</th>
                <th className="px-4 py-3">Checkout</th>
                <th className="px-4 py-3 text-center">Impresiones</th>
                <th className="px-4 py-3 text-center">Clics</th>
                <th className="px-4 py-3 text-center">CTR</th>
                <th className="px-4 py-3 text-center">Activo</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const qCount = [row.question_1_text, row.question_2_text, row.question_3_text].filter(Boolean).length;
                const m = metrics[row.id] || { views: 0, clicks: 0 };
                const ctr = m.views > 0 ? ((m.clicks / m.views) * 100).toFixed(1) + "%" : "—";
                return (
                  <tr key={row.id} className="border-b border-white/5 text-gray-300">
                    <td className="px-4 py-3">
                      {row.image_url ? (
                        <img src={row.image_url} alt="" className="w-16 h-16 object-cover rounded border border-white/10" />
                      ) : (
                        <div className="w-16 h-16 rounded border border-white/10 bg-gray-800 flex items-center justify-center text-2xl">
                          {row.type === "welcome_free" || row.type === "welcome_paid" || row.type === "welcome" ? "🎉" : row.type === "promotional" ? "📢" : row.type === "retention" ? "🔄" : "📋"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{typeLabel(row.type)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {AUDIENCE_OPTIONS.find((a) => a.value === row.target_audience)?.label ?? row.target_audience}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${qCount > 0 ? "bg-blue-500/20 text-blue-300" : "bg-gray-700 text-gray-500"}`}>
                        {qCount > 0 ? `${qCount} pregunta${qCount > 1 ? "s" : ""}` : "Sin embudo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[140px] truncate text-xs text-gray-500">
                      {row.checkout_link ? <span className="text-green-400 truncate">{row.checkout_link}</span> : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-white text-sm">{m.views}</td>
                    <td className="px-4 py-3 text-center text-white text-sm">{m.clicks}</td>
                    <td className="px-4 py-3 text-center text-white text-sm">{ctr}</td>
                    <td className="px-4 py-3 text-center">
                      <Switch checked={row.is_active} onCheckedChange={() => toggleActive(row)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setAnalyticsTarget({ id: row.id, name: typeLabel(row.type) })} className="text-blue-400 hover:text-blue-300" title="Ver Analítica"><BarChart2 className="w-4 h-4" /></button>
                        <button onClick={() => openEdit(row)} className="text-blue-400 hover:text-blue-300"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteTarget(row)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-600">Ningún pop-up creado todavía</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pop-up?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              El pop-up <strong>{typeLabel(deleteTarget?.type ?? "")}</strong> será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-gray-300 border-gray-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar" : "Nuevo"} Pop-up de Embudo</DialogTitle>
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
                  <Label className="text-gray-400 text-xs">Público Objetivo</Label>
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

              {/* Active */}
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={(v) => f("is_active", v)} />
                <Label className="text-gray-300 text-sm">Activo</Label>
              </div>

              {/* Image */}
              <div>
                <Label className="text-gray-400 text-xs">Imagen Destacada <span className="text-muted-foreground">(480 x 720 px)</span></Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="URL de la imagen"
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
                    <img src={form.image_url} alt="" className="w-full h-24 object-contain rounded-lg border border-white/10 bg-black/30" />
                    <button onClick={() => f("image_url", "")} className="absolute top-1 right-1 p-1 rounded-full bg-black/60"><X className="w-3 h-3 text-white" /></button>
                  </div>
                )}
              </div>

              {/* Dynamic Funnel Builder */}
              <FunnelBuilder form={form} onChange={setForm} />

              {/* Button color picker */}
              <div>
                <Label className="text-gray-400 text-xs">Color Principal de los Botones</Label>
                <div className="flex gap-2 mt-1 items-center">
                  <input
                    type="color"
                    value={form.button_color || "#f97316"}
                    onChange={(e) => f("button_color", e.target.value)}
                    className="w-10 h-10 rounded border border-white/10 cursor-pointer bg-transparent"
                  />
                  <Input
                    placeholder="#f97316"
                    value={form.button_color}
                    onChange={(e) => f("button_color", e.target.value)}
                    className="bg-gray-800 border-gray-700 text-sm flex-1"
                  />
                  {form.button_color && (
                    <button type="button" onClick={() => f("button_color", "")} className="text-gray-500 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-600 mt-0.5">Aplicado a los botones de quiz y CTA final. Vacío = color predeterminado.</p>
              </div>

              {/* Final screen */}
              <div className="space-y-3 p-3 rounded-xl" style={{ background: "rgba(0,200,255,0.03)", border: "1px dashed rgba(0,200,255,0.15)" }}>
                <p className="text-xs font-semibold text-white">Pantalla Final</p>

                {/* Título — acima do template editor */}
                <div>
                  <Label className="text-gray-500 text-[11px]">Título</Label>
                  <Input placeholder="¡El Plan PRO es perfecto para ti!" value={form.final_title} onChange={(e) => f("final_title", e.target.value)} className="bg-gray-800 border-gray-700 text-sm" />
                </div>

                {/* Template selector + dynamic fields */}
                <FinalTemplateEditor form={form} onChange={setForm} />

                <div>
                  <Label className="text-gray-500 text-[11px]">Beneficios</Label>
                  {form.final_benefits.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 mt-1">
                      <Input
                        placeholder={`Beneficio ${i + 1}`}
                        value={b}
                        onChange={(e) => {
                          const arr = [...form.final_benefits];
                          arr[i] = e.target.value;
                          f("final_benefits", arr);
                        }}
                        className="bg-gray-800 border-gray-700 text-xs flex-1"
                      />
                      <button type="button" onClick={() => f("final_benefits", form.final_benefits.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => f("final_benefits", [...form.final_benefits, ""])}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1.5"
                  >
                    <Plus className="w-3 h-3" /> Añadir Beneficio
                  </button>
                </div>
                {/* Link de Checkout — escondido quando plan_comparison (usa os links dentro do FinalTemplateEditor) */}
                {form.final_template !== "plan_comparison" && (
                  <div>
                    <Label className="text-gray-500 text-[11px]">Enlace de Checkout</Label>
                    <Input placeholder="https://pay.hotmart.com/..." value={form.checkout_link} onChange={(e) => f("checkout_link", e.target.value)} className="bg-gray-800 border-gray-700 text-sm" />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Pop-up"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setTestOpen(true)} className="border-green-600/40 text-green-400 hover:bg-green-900/20">
                  <Eye className="w-4 h-4 mr-1" /> Probar
                </Button>
              </div>
            </div>

            {/* Right: preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-400 text-xs">Vista previa</Label>
                <div className="flex gap-1 bg-gray-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("mobile")}
                    className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${previewMode === "mobile" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    📱 Móvil
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("desktop")}
                    className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${previewMode === "desktop" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    🖥️ Escritorio
                  </button>
                </div>
              </div>
              <InteractivePreview form={form} previewMode={previewMode} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Popup */}
      <TestPopupModal form={form} open={testOpen} onClose={() => setTestOpen(false)} />

      {/* Analytics Modal */}
      {analyticsTarget && (
        <FunnelAnalyticsModal
          open={!!analyticsTarget}
          onClose={() => setAnalyticsTarget(null)}
          entityType="popup"
          entityId={analyticsTarget.id}
          entityName={analyticsTarget.name}
        />
      )}
    </div>
  );
}
