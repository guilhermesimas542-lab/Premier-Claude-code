import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Image } from "lucide-react";
import { toast } from "sonner";
import FunnelBuilder from "@/admin/components/funnel-popup/FunnelBuilder";
import type { PopupFormState, FunnelQuestion } from "@/admin/components/funnel-popup/types";

interface Card {
  id: string;
  slug: string | null;
  name: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  icon: string | null;
  card_type: string;
  category: string;
  badge_text: string | null;
  badge_color: string | null;
  button_text_access: string | null;
  button_text_acquire: string | null;
  requires_access: boolean;
  access_field: string | null;
  checkout_url: string | null;
  questions: any;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  slug: "",
  name: "",
  title: "",
  subtitle: "",
  description: "",
  image_url: "",
  icon: "",
  card_type: "type2_top",
  category: "sport",
  badge_text: "",
  badge_color: "primary",
  button_text_access: "Acessar",
  button_text_acquire: "Adquirir Agora",
  requires_access: false,
  access_field: "",
  checkout_url: "",
  display_order: 0,
  is_active: true,
};

const CATEGORY_LABELS: Record<string, string> = {
  sport: "Esporte",
  casino: "Cassino",
  quick_access: "Acesso Rápido",
  blocked: "Bloqueado",
};

export default function AdminCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<FunnelQuestion[]>([]);

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cards" as any)
      .select("*")
      .order("display_order", { ascending: true });
    setCards((data as any as Card[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setQuestions([]);
    setShowForm(true);
  };

  const openEdit = (c: Card) => {
    setEditId(c.id);
    setForm({
      slug: c.slug ?? "",
      name: c.name,
      title: c.title,
      subtitle: c.subtitle ?? "",
      description: c.description ?? "",
      image_url: c.image_url ?? "",
      icon: c.icon ?? "",
      card_type: c.card_type,
      category: c.category ?? "sport",
      badge_text: c.badge_text ?? "",
      badge_color: c.badge_color ?? "primary",
      button_text_access: c.button_text_access ?? "Acessar",
      button_text_acquire: c.button_text_acquire ?? "Adquirir Agora",
      requires_access: c.requires_access ?? false,
      access_field: c.access_field ?? "",
      checkout_url: c.checkout_url ?? "",
      display_order: c.display_order,
      is_active: c.is_active,
    });
    // Parse questions from JSONB
    const q = Array.isArray(c.questions) ? c.questions : [];
    setQuestions(q.map((item: any) => ({
      text: item.text || "",
      options: Array.isArray(item.options) ? item.options : ["", ""],
    })));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.title) {
      toast.error("Nome e título são obrigatórios");
      return;
    }
    setSaving(true);

    const payload: any = {
      slug: form.slug || null,
      name: form.name,
      title: form.title,
      subtitle: form.subtitle || null,
      description: form.description || null,
      image_url: form.image_url || null,
      icon: form.icon || null,
      card_type: form.card_type,
      category: form.category,
      badge_text: form.badge_text || null,
      badge_color: form.badge_color || "primary",
      button_text_access: form.button_text_access || "Acessar",
      button_text_acquire: form.button_text_acquire || "Adquirir Agora",
      requires_access: form.requires_access,
      access_field: form.access_field || null,
      checkout_url: form.checkout_url || null,
      questions: questions.filter(q => q.text && q.options.some(o => o)),
      display_order: form.display_order,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    if (editId) {
      const { error } = await supabase.from("cards" as any).update(payload).eq("id", editId);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("cards" as any).insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }

    toast.success(editId ? "Card atualizado" : "Card criado");
    setShowForm(false);
    load();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este card?")) return;
    await supabase.from("cards" as any).delete().eq("id", id);
    toast.success("Card excluído");
    load();
  };

  // Adapter for FunnelBuilder: it expects PopupFormState
  const funnelForm: PopupFormState = {
    type: "card",
    is_active: form.is_active,
    target_audience: "all",
    image_url: form.image_url,
    checkout_link: form.checkout_url,
    questions,
    final_title: "",
    final_benefits: [],
  };

  const handleFunnelChange = (updated: PopupFormState) => {
    setQuestions(updated.questions);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Cards e Funis</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Novo Card
        </Button>
      </div>

      {loading ? (
        <div className="text-gray-400 py-10 text-center flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <div className="grid gap-3">
          {cards.map((c) => (
            <div key={c.id} className="bg-gray-900 border border-white/10 rounded-xl p-4 flex items-center gap-4">
              <div className="w-14 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                ) : c.icon ? (
                  <span className="text-lg">{c.icon}</span>
                ) : (
                  <Image className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white text-sm">{c.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    c.category === "casino" ? "bg-purple-500/20 text-purple-400 border border-purple-400/30" :
                    c.category === "quick_access" ? "bg-orange-500/20 text-orange-400 border border-orange-400/30" :
                    "bg-blue-500/20 text-blue-400 border border-blue-400/30"
                  }`}>
                    {CATEGORY_LABELS[c.category] || c.category}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    c.card_type === "type1_lateral" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-400/30" :
                    "bg-indigo-500/20 text-indigo-400 border border-indigo-400/30"
                  }`}>
                    {c.card_type === "type1_lateral" ? "LATERAL" : "TOP"}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.is_active ? "bg-green-500/20 text-green-400 border border-green-400/30" : "bg-red-500/20 text-red-400 border border-red-400/30"}`}>
                    {c.is_active ? "ATIVO" : "INATIVO"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {c.slug && <span className="font-mono text-gray-600">{c.slug}</span>}
                  {c.slug && " · "}
                  Ordem: {c.display_order}
                  {c.requires_access && " · 🔒 Requer acesso"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openEdit(c)} className="text-blue-400 hover:text-blue-300 p-1.5">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300 p-1.5">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {cards.length === 0 && (
            <p className="text-gray-600 text-center py-8">Nenhum card cadastrado</p>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Card" : "Novo Card"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Slug (identificador)</label>
                <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="ex: futebol" className="bg-gray-900 border-gray-800 font-mono text-xs" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Ícone (emoji)</label>
                <Input value={form.icon} onChange={(e) => set("icon", e.target.value)} placeholder="⚽" className="bg-gray-900 border-gray-800" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500">Nome interno *</label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Futebol" className="bg-gray-900 border-gray-800" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Título *</label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex: Futebol" className="bg-gray-900 border-gray-800" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Subtítulo</label>
              <Input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="Ex: Champions League, Brasileirão" className="bg-gray-900 border-gray-800" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Imagem URL</label>
              <Input value={form.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://..." className="bg-gray-900 border-gray-800" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Tipo visual</label>
                <Select value={form.card_type} onValueChange={(v) => set("card_type", v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-800"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="type1_lateral">Imagem Lateral</SelectItem>
                    <SelectItem value="type2_top">Imagem em Cima</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Categoria</label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-800"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sport">Esporte</SelectItem>
                    <SelectItem value="casino">Cassino</SelectItem>
                    <SelectItem value="quick_access">Acesso Rápido</SelectItem>
                    <SelectItem value="blocked">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Badge texto</label>
                <Input value={form.badge_text} onChange={(e) => set("badge_text", e.target.value)} placeholder="Ex: BETA" className="bg-gray-900 border-gray-800" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Badge cor</label>
                <Select value={form.badge_color} onValueChange={(v) => set("badge_color", v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-800"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary (verde)</SelectItem>
                    <SelectItem value="gold">Gold (dourado)</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Texto botão acesso</label>
                <Input value={form.button_text_access} onChange={(e) => set("button_text_access", e.target.value)} className="bg-gray-900 border-gray-800" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Texto botão aquisição</label>
                <Input value={form.button_text_acquire} onChange={(e) => set("button_text_acquire", e.target.value)} className="bg-gray-900 border-gray-800" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Ordem exibição</label>
                <Input type="number" value={form.display_order} onChange={(e) => set("display_order", parseInt(e.target.value) || 0)} className="bg-gray-900 border-gray-800" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Checkout URL</label>
                <Input value={form.checkout_url} onChange={(e) => set("checkout_url", e.target.value)} placeholder="https://..." className="bg-gray-900 border-gray-800" />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800">
              <div>
                <label className="text-sm font-medium">Requer acesso especial</label>
                <p className="text-[10px] text-gray-500">Exibe botão "Adquirir" para quem não tem acesso</p>
              </div>
              <Switch checked={form.requires_access} onCheckedChange={(v) => set("requires_access", v)} />
            </div>

            {form.requires_access && (
              <div>
                <label className="text-xs text-gray-500">Campo de acesso (useUserAccess)</label>
                <Select value={form.access_field} onValueChange={(v) => set("access_field", v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-800"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hasAlavancagem">hasAlavancagem</SelectItem>
                    <SelectItem value="hasOddsAltas">hasOddsAltas</SelectItem>
                    <SelectItem value="hasLiveTelegram">hasLiveTelegram</SelectItem>
                    <SelectItem value="isBasic">isBasic</SelectItem>
                    <SelectItem value="isPro">isPro</SelectItem>
                    <SelectItem value="isUltra">isUltra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="text-sm">Ativo</label>
              <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
            </div>

            {/* Funnel Builder */}
            <FunnelBuilder form={funnelForm} onChange={handleFunnelChange} />

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? "Salvar alterações" : "Criar card"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
