import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Loader2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import FunnelBuilder from "@/admin/components/funnel-popup/FunnelBuilder";
import type { PopupFormState, FunnelQuestion } from "@/admin/components/funnel-popup/types";
import { LogoInput } from "@/admin/components/LogoInput";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PayCardMiniaturePreview } from "@/admin/components/pay-cards/PayCardMiniaturePreview";
import { PayCardInteractivePreview } from "@/admin/components/pay-cards/PayCardInteractivePreview";

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
];

const PLAN_LABELS: Record<string, string> = Object.fromEntries(PLAN_OPTIONS.map(p => [p.value, p.label]));

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
  target_audience: "",
};

export default function AdminPayCards() {
  const [payCards, setPayCards] = useState<PayCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<FunnelQuestion[]>([]);
  const [houses, setHouses] = useState<{ id: string; name: string }[]>([]);
  const [sortCol, setSortCol] = useState<string>("name");
  const [sortDesc, setSortDesc] = useState(false);

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

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pay_cards" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setPayCards((data as any as PayCard[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from("betting_houses").select("id, name").eq("is_active", true).order("name").then(({ data }) => {
      setHouses((data || []) as { id: string; name: string }[]);
    });
  }, []);

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
      target_audience: c.target_audience ?? "",
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
      betting_house_id: form.betting_house_id === "__none__" ? null : form.betting_house_id,
      location: form.location || null,
      target_audience: form.target_audience || null,
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
    questions,
    final_title: form.checkout_title,
    final_benefits: form.checkout_benefits ? form.checkout_benefits.split("\n").filter(Boolean) : [],
  };

  const handleFunnelChange = (updated: PopupFormState) => {
    setQuestions(updated.questions);
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
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Pay Cards</h2>
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
              <TableHead className="w-[80px]">Status</TableHead>
              <TableHead className="w-[60px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPayCards.map((c) => {
              const qCount = Array.isArray(c.quiz_questions) ? c.quiz_questions.filter((q: any) => q.text).length : 0;
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
                    <span className="text-xs text-gray-400">{c.target_audience || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.has_intro_popup ? "bg-green-500/20 text-green-400 border border-green-400/30" : "bg-gray-500/20 text-gray-400 border border-gray-400/30"}`}>
                      {c.has_intro_popup ? "SIM" : "NÃO"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-gray-400">{qCount} pergunta{qCount !== 1 ? "s" : ""}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${c.is_active ? "bg-green-500/20 text-green-400 border border-green-400/30" : "bg-red-500/20 text-red-400 border border-red-400/30"}`}>
                      {c.is_active ? "ATIVO" : "INATIVO"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => openEdit(c)} className="text-blue-400 hover:text-blue-300 p-1.5">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
            {payCards.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-600">
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
                  <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Ex: Home, Sports Tips, Suporte" className="bg-gray-900 border-gray-800" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Público-alvo</label>
                  <Input value={form.target_audience} onChange={(e) => set("target_audience", e.target.value)} placeholder="Ex: Usuário Gratuito" className="bg-gray-900 border-gray-800" />
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

              <div>
                <label className="text-xs text-gray-500">Casa de Apostas</label>
                <Select value={form.betting_house_id} onValueChange={(v) => set("betting_house_id", v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-800"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Geral (Padrão)</SelectItem>
                    {houses.map(h => (
                      <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
    </div>
  );
}
