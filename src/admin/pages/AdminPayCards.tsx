import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Loader2, ArrowUp, ArrowDown, ArrowUpDown, BarChart2, X, ChevronDown } from "lucide-react";
import FunnelAnalyticsModal from "@/admin/components/FunnelAnalyticsModal";
import { toast } from "sonner";
import FunnelBuilder from "@/admin/components/funnel-popup/FunnelBuilder";
import type { PopupFormState, FunnelQuestion } from "@/admin/components/funnel-popup/types";
import { LogoInput } from "@/admin/components/LogoInput";
import FinalTemplateEditor, { FINAL_TEMPLATES } from "@/admin/components/funnel-popup/FinalTemplateEditor";
import type { FinalConfig, FinalTemplateType } from "@/components/funnel/FinalTemplates";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PayCardMiniaturePreview } from "@/admin/components/pay-cards/PayCardMiniaturePreview";
import { PayCardInteractivePreview } from "@/admin/components/pay-cards/PayCardInteractivePreview";
import { useBettingHouseAdmin } from "@/admin/context/BettingHouseContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

interface PayCard {
  id: string;
  name: string;
  associated_plan: string;
  has_intro_popup: boolean;
  popup_config: { title?: string; text?: string; image_url?: string; cta_text?: string } | null;
  quiz_questions: FunnelQuestion[] | null;
  checkout_config: { product_id?: string; title?: string; benefits?: string[]; checkout_url?: string; checkout_url_2?: string; checkout_label_1?: string; checkout_label_2?: string } | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  betting_house_id: string | null;
  location: string | null;
  target_audience: string | null;
}

const PLAN_OPTIONS = [
  { value: "basic", label: "Básico" },
  { value: "pro", label: "Pro" },
  { value: "ultra", label: "Ultra" },
  { value: "alavancagem", label: "Alavancagem" },
  { value: "desaltas", label: "Odds Altas" },
  { value: "vitalicio", label: "Vitalício" },
  { value: "live_telegram", label: "Live Telegram" },
];

const PLAN_LABELS: Record<string, string> = Object.fromEntries(PLAN_OPTIONS.map(p => [p.value, p.label]));

const AUDIENCE_OPTIONS = [
  { group: "Gerais", options: [
    { value: "all", label: "Todos os Usuários" },
    { value: "all_paid", label: "Todos os Usuários Pagantes" },
    { value: "all_free", label: "Todos os Usuários Gratuitos" },
  ]},
  { group: "Planos Base", options: [
    { value: "has_basic", label: "Possui Plano Básico" },
    { value: "no_basic", label: "Não Possui Plano Básico" },
    { value: "has_pro", label: "Possui Plano Pro" },
    { value: "no_pro", label: "Não Possui Plano Pro" },
    { value: "has_ultra", label: "Possui Plano Ultra" },
    { value: "no_ultra", label: "Não Possui Plano Ultra" },
  ]},
  { group: "Add-ons", options: [
    { value: "has_vitalicio", label: "Possui Plano Vitalício" },
    { value: "no_vitalicio", label: "Não Possui Plano Vitalício" },
    { value: "has_alavancagem", label: "Possui Add-on Alavancagem" },
    { value: "no_alavancagem", label: "Não Possui Add-on Alavancagem" },
    { value: "has_desaltas", label: "Possui Add-on Odds Altas" },
    { value: "no_desaltas", label: "Não Possui Add-on Odds Altas" },
    { value: "has_live_telegram", label: "Possui Add-on Live Telegram" },
    { value: "no_live_telegram", label: "Não Possui Add-on Live Telegram" },
  ]},
];

const ALL_AUDIENCE_FLAT = AUDIENCE_OPTIONS.flatMap(g => g.options);
const audienceLabel = (v: string) => ALL_AUDIENCE_FLAT.find(o => o.value === v)?.label ?? v;

function parseAudienceArray(val: string | null): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  // Legacy: single string value
  return val ? [val] : [];
}

const EMPTY_FORM = {
  name: "",
  associated_plan: "basic",
  has_intro_popup: false,
  popup_title: "",
  popup_text: "",
  popup_image_url: "",
  popup_cta_text: "",
  checkout_title: "",
  checkout_url: "",
  checkout_url_2: "",
  checkout_label_1: "",
  checkout_label_2: "",
  checkout_benefits: "",
  is_active: true,
  betting_house_id: "__none__",
  location: "",
  target_audience: [] as string[],
  button_color: "",
  checkout_template: "default",
  checkout_final_config: {} as Record<string, any>,
};

export default function AdminPayCards() {
  const { selectedHouseId, selectedHouse } = useBettingHouseAdmin();
  const [payCards, setPayCards] = useState<PayCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<FunnelQuestion[]>([]);
  const [sortCol, setSortCol] = useState<string>("name");
  const [sortDesc, setSortDesc] = useState(false);
  const [analyticsTarget, setAnalyticsTarget] = useState<{ id: string; name: string } | null>(null);
  const [metrics, setMetrics] = useState<Record<string, { views: number; clicks: number }>>({});

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDesc(!sortDesc);
    else { setSortCol(col); setSortDesc(false); }
  };

  const sortedPayCards = useMemo(() => {
    return [...payCards].sort((a, b) => {
      const va = (a as any)[sortCol] || "";
      const vb = (b as any)[sortCol] || "";
      if (va < vb) return sortDesc ? 1 : -1;
      if (va > vb) return sortDesc ? -1 : 1;
      return 0;
    });
  }, [payCards, sortCol, sortDesc]);

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortDesc
      ? <ArrowDown className="w-3 h-3 ml-1 text-emerald-400" />
      : <ArrowUp className="w-3 h-3 ml-1 text-emerald-400" />;
  };

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const loadMetrics = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data } = await supabase
      .from("funnel_analytics")
      .select("entity_id, event_type")
      .eq("entity_type", "paycard")
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
    let q = supabase
      .from("pay_cards" as any)
      .select("*")
      .order("created_at", { ascending: false }) as any;
    if (selectedHouseId) q = q.eq("betting_house_id", selectedHouseId);
    else q = q.is("betting_house_id", null);
    const { data } = await q;
    const rows = (data as any as PayCard[]) ?? [];
    setPayCards(rows);
    setLoading(false);
    loadMetrics(rows.map((r) => r.id));
  };

  useEffect(() => {
    load();
  }, [selectedHouseId]);

  const openEdit = (c: PayCard) => {
    setEditId(c.id);
    const popup = c.popup_config || {};
    const checkout = c.checkout_config || {};
    setForm({
      name: c.name,
      associated_plan: c.associated_plan,
      has_intro_popup: c.has_intro_popup,
      popup_title: popup.title ?? "",
      popup_text: popup.text ?? "",
      popup_image_url: popup.image_url ?? "",
      popup_cta_text: popup.cta_text ?? "",
      checkout_title: checkout.title ?? "",
      checkout_url: checkout.checkout_url ?? "",
      checkout_url_2: checkout.checkout_url_2 ?? "",
      checkout_label_1: checkout.checkout_label_1 ?? "",
      checkout_label_2: checkout.checkout_label_2 ?? "",
      checkout_benefits: (checkout.benefits || []).join("\n"),
      is_active: c.is_active,
      betting_house_id: c.betting_house_id || "__none__",
      location: c.location ?? "",
      target_audience: parseAudienceArray(c.target_audience),
      button_color: (c as any).button_color ?? "",
      checkout_template: (c as any).checkout_template ?? "default",
      checkout_final_config: (c as any).checkout_final_config ?? {},
    });
    const q = Array.isArray(c.quiz_questions) ? c.quiz_questions : [];
    setQuestions(q.map((item: any) => ({
      text: item.text || "",
      options: Array.isArray(item.options) ? item.options : ["", ""],
    })));
    setShowForm(true);
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setQuestions([]);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);

    const payload: any = {
      name: form.name,
      associated_plan: form.associated_plan,
      has_intro_popup: form.has_intro_popup,
      betting_house_id: selectedHouseId || null,
      location: form.location || null,
      target_audience: form.target_audience.length > 0 ? JSON.stringify(form.target_audience) : null,
      popup_config: form.has_intro_popup ? {
        title: form.popup_title || null,
        text: form.popup_text || null,
        image_url: form.popup_image_url || null,
        cta_text: form.popup_cta_text || null,
      } : null,
      quiz_questions: questions.filter(q => q.text && q.options.some(o => o)),
      checkout_config: {
        title: form.checkout_title || null,
        checkout_url: form.checkout_url || null,
        checkout_url_2: form.checkout_url_2 || null,
        checkout_label_1: form.checkout_label_1 || null,
        checkout_label_2: form.checkout_label_2 || null,
        benefits: form.checkout_benefits ? form.checkout_benefits.split("\n").filter(Boolean) : [],
      },
      is_active: form.is_active,
      button_color: form.button_color || null,
      checkout_template: form.checkout_template || "default",
      checkout_final_config: Object.keys(form.checkout_final_config || {}).length > 0 ? form.checkout_final_config : null,
      updated_at: new Date().toISOString(),
    };

    if (editId) {
      const { error } = await supabase.from("pay_cards" as any).update(payload).eq("id", editId);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("pay_cards" as any).insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }

    toast.success(editId ? "Pay Card atualizado" : "Pay Card criado");
    setShowForm(false);
    load();
    setSaving(false);
  };

  // Adapter for FunnelBuilder
  const funnelForm: PopupFormState = {
    type: "card",
    is_active: form.is_active,
    target_audience: "all",
    image_url: form.popup_image_url,
    checkout_link: form.checkout_url,
    checkout_link_2: form.checkout_url_2 || "",
    questions,
    final_title: form.checkout_title,
    final_benefits: form.checkout_benefits ? form.checkout_benefits.split("\n").filter(Boolean) : [],
    final_template: form.checkout_template || "default",
    final_config: form.checkout_final_config || {},
    button_color: form.button_color || "",
  };

  const handleFunnelChange = (updated: PopupFormState) => {
    setQuestions(updated.questions);
    // Sync template/config/color changes back
    if (updated.final_template !== funnelForm.final_template) set("checkout_template", updated.final_template);
    if (updated.final_config !== funnelForm.final_config) set("checkout_final_config", updated.final_config);
    if (updated.button_color !== funnelForm.button_color) set("button_color", updated.button_color);
  };

  // Preview data adapter
  const previewData = {
    has_intro_popup: form.has_intro_popup,
    popup_title: form.popup_title,
    popup_text: form.popup_text,
    popup_image_url: form.popup_image_url,
    popup_cta_text: form.popup_cta_text,
    checkout_title: form.checkout_title,
    checkout_url: form.checkout_url,
    checkout_url_2: form.checkout_url_2,
    checkout_label_1: form.checkout_label_1,
    checkout_label_2: form.checkout_label_2,
    checkout_benefits: form.checkout_benefits,
    questions,
    associated_plan: form.associated_plan,
    name: form.name,
    button_color: form.button_color,
    checkout_template: form.checkout_template,
    checkout_final_config: form.checkout_final_config,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Pay Cards</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {selectedHouse ? `Casa: ${selectedHouse.name}` : "Sem casa selecionada (global)"}
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Novo Pay Card
        </Button>
      </div>

      {loading ? (
        <div className="text-gray-400 py-10 text-center flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <Table>
          <TableHeader>
           <TableRow>
              <TableHead className="w-[100px]">Preview</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
                <span className="flex items-center">Nome <SortIcon col="name" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("associated_plan")}>
                <span className="flex items-center">Plano <SortIcon col="associated_plan" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("location")}>
                <span className="flex items-center">Localização <SortIcon col="location" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("target_audience")}>
                <span className="flex items-center">Público-alvo <SortIcon col="target_audience" /></span>
              </TableHead>
              <TableHead>Popup Intro</TableHead>
              <TableHead>Quiz</TableHead>
              <TableHead className="text-center">Impressões</TableHead>
              <TableHead className="text-center">Cliques</TableHead>
              <TableHead className="text-center">CTR</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
              <TableHead className="w-[60px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPayCards.map((c) => {
              const qCount = Array.isArray(c.quiz_questions) ? c.quiz_questions.filter((q: any) => q.text).length : 0;
              const m = metrics[c.id] || { views: 0, clicks: 0 };
              const ctr = m.views > 0 ? ((m.clicks / m.views) * 100).toFixed(1) + "%" : "—";
              return (
                <TableRow key={c.id} className="border-b border-white/10">
                  <TableCell>
                    <PayCardMiniaturePreview payCard={c} onClick={() => openEdit(c)} />
                  </TableCell>
                  <TableCell className="font-medium text-sm">{c.name}</TableCell>
                  <TableCell>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-400/30 font-medium">
                      {PLAN_LABELS[c.associated_plan] || c.associated_plan}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-gray-400">{c.location || "—"}</span>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const tags = parseAudienceArray(c.target_audience);
                      if (tags.length === 0) return <span className="text-xs text-gray-600">Nenhum</span>;
                      if (tags.includes("all")) return <span className="text-xs text-green-400">Todos</span>;
                      return (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {tags.slice(0, 3).map(t => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/20">
                              {audienceLabel(t)}
                            </span>
                          ))}
                          {tags.length > 3 && <span className="text-[9px] text-gray-500">+{tags.length - 3}</span>}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.has_intro_popup ? "bg-green-500/20 text-green-400 border border-green-400/30" : "bg-gray-500/20 text-gray-400 border border-gray-400/30"}`}>
                      {c.has_intro_popup ? "SIM" : "NÃO"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-gray-400">{qCount} pergunta{qCount !== 1 ? "s" : ""}</span>
                  </TableCell>
                  <TableCell className="text-center text-white text-sm">{m.views}</TableCell>
                  <TableCell className="text-center text-white text-sm">{m.clicks}</TableCell>
                  <TableCell className="text-center text-white text-sm">{ctr}</TableCell>
                  <TableCell>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${c.is_active ? "bg-green-500/20 text-green-400 border border-green-400/30" : "bg-red-500/20 text-red-400 border border-red-400/30"}`}>
                      {c.is_active ? "ATIVO" : "INATIVO"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button onClick={() => setAnalyticsTarget({ id: c.id, name: c.name })} className="text-blue-400 hover:text-blue-300 p-1.5" title="Ver Analytics">
                        <BarChart2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(c)} className="text-blue-400 hover:text-blue-300 p-1.5">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {payCards.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-gray-600">
                  Nenhum Pay Card cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* Form Dialog - Two Column Layout */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Pay Card" : "Novo Pay Card"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
            {/* Left Column: Form */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500">Nome do funil *</label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Funil de Aquisição - Plano Pro" className="bg-gray-900 border-gray-800" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Localização</label>
                  <select value={form.location} onChange={(e) => set("location", e.target.value)} className="w-full rounded-md bg-gray-900 border border-gray-800 text-sm px-3 py-2">
                    <option value="">Selecione...</option>
                    <option value="header">Header</option>
                    <option value="sports_tips">Sports Tips</option>
                    <option value="support">Suporte</option>
                    <option value="home">Home</option>
                    <option value="casino">Cassino</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Público-alvo (segmentação)</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full flex items-center justify-between rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-sm min-h-[40px] text-left">
                        {form.target_audience.length === 0 ? (
                          <span className="text-gray-500">Selecione os critérios…</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 flex-1">
                            {form.target_audience.map(v => (
                              <span key={v} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/20">
                                {audienceLabel(v)}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    set("target_audience", form.target_audience.filter((x: string) => x !== v));
                                  }}
                                  className="hover:text-white"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <ChevronDown className="w-4 h-4 shrink-0 text-gray-500" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[340px] p-0 bg-gray-900 border-gray-700" align="start">
                      <div className="max-h-[300px] overflow-y-auto p-2 space-y-3">
                        {AUDIENCE_OPTIONS.map(group => (
                          <div key={group.group}>
                            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold px-2 py-1">{group.group}</div>
                            {group.options.map(opt => {
                              const checked = form.target_audience.includes(opt.value);
                              return (
                                <label
                                  key={opt.value}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-800 cursor-pointer text-sm text-gray-300"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(c) => {
                                      if (c) {
                                        set("target_audience", [...form.target_audience, opt.value]);
                                      } else {
                                        set("target_audience", form.target_audience.filter((x: string) => x !== opt.value));
                                      }
                                    }}
                                    className="border-gray-600"
                                  />
                                  {opt.label}
                                </label>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                      {form.target_audience.length > 0 && (
                        <div className="border-t border-gray-700 p-2">
                          <button onClick={() => set("target_audience", [])} className="text-xs text-gray-500 hover:text-gray-300">Limpar tudo</button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  <p className="text-[10px] text-gray-600 mt-1">Condição AND: o usuário precisa atender a todos os critérios.</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500">Plano associado *</label>
                <Select value={form.associated_plan} onValueChange={(v) => set("associated_plan", v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-800"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedHouse && (
                <div className="text-xs text-muted-foreground px-1">
                  Casa: <strong className="text-foreground">{selectedHouse.name}</strong>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="text-sm">Ativo</label>
                <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
              </div>

              {/* Intro Popup Section */}
              <div className="p-3 rounded-lg bg-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">🖼️ Popup Introdutório</label>
                  <Switch checked={form.has_intro_popup} onCheckedChange={(v) => set("has_intro_popup", v)} />
                </div>

                {form.has_intro_popup && (
                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <div>
                      <label className="text-xs text-gray-500">Título</label>
                      <Input value={form.popup_title} onChange={(e) => set("popup_title", e.target.value)} placeholder="Ex: Desbloqueie o poder total!" className="bg-gray-900 border-gray-800" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Texto</label>
                      <Textarea value={form.popup_text} onChange={(e) => set("popup_text", e.target.value)} placeholder="Descrição do popup..." className="bg-gray-900 border-gray-800 text-sm" rows={3} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Imagem</label>
                      <LogoInput
                        currentPreview={form.popup_image_url || null}
                        onUploadComplete={(url) => set("popup_image_url", url)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Texto do botão CTA</label>
                      <Input value={form.popup_cta_text} onChange={(e) => set("popup_cta_text", e.target.value)} placeholder="Ex: Continuar" className="bg-gray-900 border-gray-800" />
                    </div>
                  </div>
                )}
              </div>

              {/* Quiz Section */}
              <FunnelBuilder form={funnelForm} onChange={handleFunnelChange} />

              {/* Color Picker */}
              <div className="p-3 rounded-lg bg-gray-800 space-y-3">
                <label className="text-sm font-medium">🎨 Cor Principal dos Botões</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.button_color || "#f97316"}
                    onChange={(e) => set("button_color", e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-white/10 bg-transparent"
                  />
                  <Input
                    value={form.button_color}
                    onChange={(e) => set("button_color", e.target.value)}
                    placeholder="#f97316"
                    className="bg-gray-900 border-gray-800 flex-1"
                  />
                  {form.button_color && (
                    <button onClick={() => set("button_color", "")} className="text-xs text-gray-500 hover:text-gray-300">Resetar</button>
                  )}
                </div>
              </div>

              {/* Checkout Section */}
              <div className="p-3 rounded-lg bg-gray-800 space-y-3">
                <label className="text-sm font-medium">💳 Checkout</label>
                <div>
                  <label className="text-xs text-gray-500">Título da oferta</label>
                  <Input value={form.checkout_title} onChange={(e) => set("checkout_title", e.target.value)} placeholder="Ex: Assine o Plano Pro" className="bg-gray-900 border-gray-800" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">URL de checkout (Botão 1)</label>
                  <Input value={form.checkout_url} onChange={(e) => set("checkout_url", e.target.value)} placeholder="https://..." className="bg-gray-900 border-gray-800" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Label do Botão 1 (opcional)</label>
                  <Input value={form.checkout_label_1} onChange={(e) => set("checkout_label_1", e.target.value)} placeholder="Ex: Comprar somente Pro" className="bg-gray-900 border-gray-800" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">URL de checkout (Botão 2 - opcional)</label>
                  <Input value={form.checkout_url_2} onChange={(e) => set("checkout_url_2", e.target.value)} placeholder="https://... (pacote completo)" className="bg-gray-900 border-gray-800" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Label do Botão 2 (opcional)</label>
                  <Input value={form.checkout_label_2} onChange={(e) => set("checkout_label_2", e.target.value)} placeholder="Ex: Comprar Pacote Completo" className="bg-gray-900 border-gray-800" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Benefícios (um por linha)</label>
                  <Textarea value={form.checkout_benefits} onChange={(e) => set("checkout_benefits", e.target.value)} placeholder={"Acesso a todas as tips Pro\nSuporte prioritário\nGrupo exclusivo"} className="bg-gray-900 border-gray-800 text-sm" rows={4} />
                </div>

                {/* Template selector for checkout */}
                <FinalTemplateEditor
                  form={funnelForm}
                  onChange={(updated) => {
                    set("checkout_template", updated.final_template);
                    set("checkout_final_config", updated.final_config);
                  }}
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? "Salvar alterações" : "Criar Pay Card"}
              </Button>
            </div>

            {/* Right Column: Interactive Preview */}
            <div className="hidden lg:block sticky top-0">
              <PayCardInteractivePreview data={previewData} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Analytics Modal */}
      {analyticsTarget && (
        <FunnelAnalyticsModal
          open={!!analyticsTarget}
          onClose={() => setAnalyticsTarget(null)}
          entityType="paycard"
          entityId={analyticsTarget.id}
          entityName={analyticsTarget.name}
        />
      )}
    </div>
  );
}
