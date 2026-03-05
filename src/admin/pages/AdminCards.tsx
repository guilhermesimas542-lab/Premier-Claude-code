import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Loader2, Monitor, Smartphone, Tablet, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AUDIENCE_SEGMENTS, getSegmentLabel, parseAudience } from "@/lib/audienceUtils";
import { toast } from "sonner";
import FunnelBuilder from "@/admin/components/funnel-popup/FunnelBuilder";
import type { PopupFormState, FunnelQuestion } from "@/admin/components/funnel-popup/types";
import { LogoInput } from "@/admin/components/LogoInput";
import { CardType1Lateral } from "@/components/cards/CardType1Lateral";
import { CardType2Top } from "@/components/cards/CardType2Top";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import type { CardData, CardImageUrls } from "@/hooks/useCards";

interface Card {
  id: string;
  slug: string | null;
  name: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_urls: CardImageUrls | null;
  card_type: string;
  category: string;
  badges: string[] | null;
  badge_color: string | null;
  button_text_access: string | null;
  button_text_acquire: string | null;
  button_bg_color: string | null;
  button_font_color: string | null;
  requires_access: boolean;
  access_field: string | null;
  checkout_url: string | null;
  pay_card_id: string | null;
  questions: any;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const BADGE_OPTIONS = ["IA ATIVADA", "META", "BETA", "AO VIVO", "ATUALIZADO", "NOVO"];

const EMPTY_FORM = {
  slug: "",
  name: "",
  title: "",
  subtitle: "",
  description: "",
  image_mobile: "",
  image_tablet: "",
  image_desktop: "",
  card_type: "type2_top",
  category: "sport",
  badges: [] as string[],
  badge_color: "primary",
  button_text_access: "Acessar",
  button_text_acquire: "Adquirir Agora",
  button_bg_color: "",
  button_font_color: "",
  requires_access: false,
  access_field: "[]",
  checkout_url: "",
  pay_card_id: "",
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
  const [previewMode, setPreviewMode] = useState<"mobile" | "tablet" | "desktop">("mobile");
  const [payCards, setPayCards] = useState<{ id: string; name: string }[]>([]);

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

  useEffect(() => {
    supabase.from("pay_cards" as any).select("id, name").eq("is_active", true).order("name").then(({ data }: any) => {
      setPayCards((data as { id: string; name: string }[]) ?? []);
    });
  }, []);

  const openEdit = (c: Card) => {
    setEditId(c.id);
    const imgs = (c.image_urls || {}) as CardImageUrls;
    setForm({
      slug: c.slug ?? "",
      name: c.name,
      title: c.title,
      subtitle: c.subtitle ?? "",
      description: c.description ?? "",
      image_mobile: imgs.mobile ?? "",
      image_tablet: imgs.tablet ?? "",
      image_desktop: imgs.desktop ?? "",
      card_type: c.card_type,
      category: c.category ?? "sport",
      badges: c.badges ?? [],
      badge_color: c.badge_color ?? "primary",
      button_text_access: c.button_text_access ?? "Acessar",
      button_text_acquire: c.button_text_acquire ?? "Adquirir Agora",
      button_bg_color: c.button_bg_color ?? "",
      button_font_color: c.button_font_color ?? "",
      requires_access: c.requires_access ?? false,
      access_field: c.access_field ?? "[]",
      checkout_url: c.checkout_url ?? "",
      pay_card_id: c.pay_card_id ?? "",
      display_order: c.display_order,
      is_active: c.is_active,
    });
    const q = Array.isArray(c.questions) ? c.questions : [];
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

  const toggleBadge = (badge: string) => {
    setForm((f) => {
      const current = f.badges;
      return {
        ...f,
        badges: current.includes(badge) ? current.filter((b) => b !== badge) : [...current, badge],
      };
    });
  };

  const isLateral = form.card_type === "type1_lateral";

  const handleSave = async () => {
    if (!form.name || !form.title) {
      toast.error("Nome e título são obrigatórios");
      return;
    }
    if (!form.image_mobile) {
      toast.error("A imagem mobile é obrigatória");
      return;
    }
    setSaving(true);

    const imageUrls: CardImageUrls = { mobile: form.image_mobile };
    if (form.image_tablet) imageUrls.tablet = form.image_tablet;
    if (form.image_desktop) imageUrls.desktop = form.image_desktop;

    const payload: any = {
      slug: form.slug || null,
      name: form.name,
      title: form.title,
      subtitle: form.subtitle || null,
      description: form.description || null,
      image_urls: imageUrls,
      card_type: form.card_type,
      category: form.category,
      badges: form.badges.length > 0 ? form.badges : null,
      badge_color: form.badge_color || "primary",
      button_text_access: form.button_text_access || "Acessar",
      button_text_acquire: form.button_text_acquire || "Adquirir Agora",
      button_bg_color: form.button_bg_color || null,
      button_font_color: form.button_font_color || null,
      requires_access: form.requires_access,
      access_field: form.access_field || null,
      checkout_url: form.checkout_url || null,
      pay_card_id: form.pay_card_id || null,
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

  // Build a CardData object from current form for live preview
  const previewImageUrls: CardImageUrls = {};
  if (form.image_mobile) previewImageUrls.mobile = form.image_mobile;
  if (form.image_tablet) previewImageUrls.tablet = form.image_tablet;
  if (form.image_desktop) previewImageUrls.desktop = form.image_desktop;

  // Pick image based on preview mode with mobile fallback
  const pickImage = (mode: "mobile" | "tablet" | "desktop") => {
    if (mode === "desktop") return previewImageUrls.desktop || previewImageUrls.tablet || previewImageUrls.mobile || null;
    if (mode === "tablet") return previewImageUrls.tablet || previewImageUrls.mobile || null;
    return previewImageUrls.mobile || null;
  };

  const previewImageForMode: CardImageUrls = {
    mobile: pickImage(previewMode),
  };

  const previewCard: CardData = {
    id: "preview",
    slug: form.slug,
    name: form.name || "Card",
    title: form.title || "Título do Card",
    subtitle: form.subtitle || null,
    description: form.description || null,
    image_urls: previewImageForMode,
    card_type: form.card_type,
    category: form.category,
    badges: form.badges.length > 0 ? form.badges : null,
    badge_color: form.badge_color || null,
    button_text_access: form.button_text_access || "Acessar",
    button_text_acquire: form.button_text_acquire || "Adquirir Agora",
    button_bg_color: form.button_bg_color || null,
    button_font_color: form.button_font_color || null,
    requires_access: form.requires_access,
    access_field: form.access_field || null,
    checkout_url: form.checkout_url || null,
    pay_card_id: form.pay_card_id || null,
    questions: questions,
    display_order: form.display_order,
    is_active: form.is_active,
  };

  // Adapter for FunnelBuilder
  const funnelForm: PopupFormState = {
    type: "card",
    is_active: form.is_active,
    target_audience: "all",
    image_url: form.image_mobile,
    checkout_link: form.checkout_url,
    questions,
    final_title: "",
    final_benefits: [],
    final_template: "default",
    final_config: {},
    button_color: "",
  };

  const handleFunnelChange = (updated: PopupFormState) => {
    setQuestions(updated.questions);
  };

  // Convert Card to CardData for table preview
  const toCardData = (c: Card): CardData => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    title: c.title,
    subtitle: c.subtitle,
    description: c.description,
    image_urls: c.image_urls,
    card_type: c.card_type,
    category: c.category,
    badges: c.badges,
    badge_color: c.badge_color,
    button_text_access: c.button_text_access,
    button_text_acquire: c.button_text_acquire,
    button_bg_color: c.button_bg_color,
    button_font_color: c.button_font_color,
    requires_access: c.requires_access,
    access_field: c.access_field,
    checkout_url: c.checkout_url,
    pay_card_id: c.pay_card_id ?? null,
    questions: c.questions ?? [],
    display_order: c.display_order,
    is_active: c.is_active,
  });

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Preview</TableHead>
              <TableHead>Info</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[60px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.map((c) => {
              const cd = toCardData(c);
              return (
                <TableRow key={c.id} className="border-b border-white/10">
                  <TableCell className="p-2">
                    <div
                      onClick={() => openEdit(c)}
                      className="overflow-hidden relative cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        width: c.card_type === "type1_lateral" ? "130px" : "110px",
                        height: c.card_type === "type1_lateral" ? "55px" : "100px",
                      }}
                    >
                      <div className="pointer-events-none" style={{
                        transform: "scale(0.36)",
                        transformOrigin: "top left",
                        width: c.card_type === "type1_lateral" ? "360px" : "300px",
                      }}>
                        {c.card_type === "type1_lateral" ? (
                          <CardType1Lateral card={cd} onAction={() => {}} />
                        ) : (
                          <CardType2Top card={cd} hasAccess={true} onAction={() => {}} />
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-sm">
                        {c.title}
                        <span className="ml-2 font-normal text-xs text-muted-foreground">
                          {c.card_type === "type1_lateral" ? "(200 x 240 px)" : "(800 x 360 px)"}
                        </span>
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
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
                      </div>
                      <span className="text-[11px] text-gray-500 font-mono">{c.slug} · Ordem: {c.display_order}</span>
                    </div>
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
            {cards.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-600">
                  Nenhum card cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Card" : "Novo Card"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Column */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Slug (identificador)</label>
                  <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="ex: futebol" className="bg-gray-900 border-gray-800 font-mono text-xs" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Ordem exibição</label>
                  <Input type="number" value={form.display_order} onChange={(e) => set("display_order", parseInt(e.target.value) || 0)} className="bg-gray-900 border-gray-800" />
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

              {/* Image Uploads — conditional on card type */}
              <div className="p-3 rounded-lg bg-gray-800 space-y-3">
                <label className="text-sm font-medium">📱 Imagens</label>
                {isLateral ? (
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Imagem <span className="text-red-400">*</span> <span className="text-muted-foreground">(200 x 240 px)</span>
                    </label>
                    <LogoInput
                      currentPreview={form.image_mobile || null}
                      onUploadComplete={(url) => set("image_mobile", url)}
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        Imagem Mobile <span className="text-red-400">*</span> <span className="text-muted-foreground">(800 x 360 px)</span>
                      </label>
                      <LogoInput
                        currentPreview={form.image_mobile || null}
                        onUploadComplete={(url) => set("image_mobile", url)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        Imagem Tablet <span className="text-muted-foreground">(1024 x 400 px) — opcional</span>
                      </label>
                      <LogoInput
                        currentPreview={form.image_tablet || null}
                        onUploadComplete={(url) => set("image_tablet", url)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">
                        Imagem Desktop <span className="text-muted-foreground">(1200 x 400 px) — opcional</span>
                      </label>
                      <LogoInput
                        currentPreview={form.image_desktop || null}
                        onUploadComplete={(url) => set("image_desktop", url)}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Multi-badge selector */}
              <div className="p-3 rounded-lg bg-gray-800 space-y-2">
                <label className="text-sm font-medium">🏷️ Badges</label>
                <div className="flex flex-wrap gap-2">
                  {BADGE_OPTIONS.map((badge) => (
                    <label key={badge} className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={form.badges.includes(badge)}
                        onCheckedChange={() => toggleBadge(badge)}
                      />
                      <span className="text-xs">{badge}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <label className="text-xs text-gray-500">Cor dos badges</label>
                  <Select value={form.badge_color} onValueChange={(v) => set("badge_color", v)}>
                    <SelectTrigger className="bg-gray-900 border-gray-800"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary (laranja)</SelectItem>
                      <SelectItem value="gold">Gold (dourado)</SelectItem>
                      <SelectItem value="green">Green (verde)</SelectItem>
                      <SelectItem value="black_green">Preto (fonte verde)</SelectItem>
                      <SelectItem value="tron">Tron (azul/preto)</SelectItem>
                      <SelectItem value="white">Branco (fonte preta)</SelectItem>
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

              {/* Button Style Section */}
              <div className="p-3 rounded-lg bg-gray-800 space-y-3">
                <label className="text-sm font-medium">🎨 Estilo do Botão</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Cor de Fundo</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.button_bg_color || "#22c55e"}
                        onChange={(e) => set("button_bg_color", e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-700 bg-transparent"
                      />
                      <Input
                        value={form.button_bg_color}
                        onChange={(e) => set("button_bg_color", e.target.value)}
                        placeholder="Padrão do tema"
                        className="bg-gray-900 border-gray-800 text-xs flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Cor da Fonte</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.button_font_color || "#ffffff"}
                        onChange={(e) => set("button_font_color", e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-700 bg-transparent"
                      />
                      <Input
                        value={form.button_font_color}
                        onChange={(e) => set("button_font_color", e.target.value)}
                        placeholder="Padrão do tema"
                        className="bg-gray-900 border-gray-800 text-xs flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {form.requires_access && (
                <div>
                  <label className="text-xs text-gray-500">Pay Card de Destino</label>
                  <Select value={form.pay_card_id} onValueChange={(v) => set("pay_card_id", v === "__none__" ? "" : v)}>
                    <SelectTrigger className="bg-gray-900 border-gray-800"><SelectValue placeholder="Selecione um Pay Card..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {payCards.map((pc) => (
                        <SelectItem key={pc.id} value={pc.id}>{pc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-gray-500 mt-1">O botão "Adquirir" abrirá o funil deste Pay Card</p>
                </div>
              )}

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800">
                <div>
                  <label className="text-sm font-medium">Requer acesso especial</label>
                  <p className="text-[10px] text-gray-500">Exibe botão "Adquirir" para quem não tem acesso</p>
                </div>
                <Switch checked={form.requires_access} onCheckedChange={(v) => set("requires_access", v)} />
              </div>

              {form.requires_access && (
                <div>
                  <label className="text-xs text-gray-500">Bloqueado para</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full flex items-center justify-between bg-gray-900 border border-gray-800 rounded-md px-3 py-2 text-sm text-left min-h-[40px]">
                        <span className="truncate text-gray-300">
                          {(() => {
                            const parsed = parseAudience(form.access_field);
                            return parsed.length > 0 ? parsed.map(getSegmentLabel).join(", ") : "Selecione os critérios...";
                          })()}
                        </span>
                        <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 bg-gray-900 border-gray-700 max-h-72 overflow-y-auto" align="start">
                      {(() => {
                        const groups = [...new Set(AUDIENCE_SEGMENTS.map(s => s.group))];
                        const currentCriteria = parseAudience(form.access_field);
                        const toggleCriterion = (val: string) => {
                          const updated = currentCriteria.includes(val)
                            ? currentCriteria.filter(c => c !== val)
                            : [...currentCriteria, val];
                          set("access_field", JSON.stringify(updated));
                        };
                        return groups.map(group => (
                          <div key={group} className="px-3 py-2">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">{group}</p>
                            {AUDIENCE_SEGMENTS.filter(s => s.group === group).map(seg => (
                              <label key={seg.value} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-800 rounded px-1">
                                <Checkbox
                                  checked={currentCriteria.includes(seg.value)}
                                  onCheckedChange={() => toggleCriterion(seg.value)}
                                />
                                <span className="text-xs text-gray-300">{seg.label}</span>
                              </label>
                            ))}
                          </div>
                        ));
                      })()}
                    </PopoverContent>
                  </Popover>
                  <p className="text-[10px] text-gray-500 mt-1">O card será bloqueado para usuários que atendem TODOS os critérios selecionados</p>
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

            {/* Preview Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Preview Interativo</label>
                <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setPreviewMode("mobile")}
                    className={`p-1.5 rounded-md transition-colors ${previewMode === "mobile" ? "bg-primary text-primary-foreground" : "text-gray-400 hover:text-white"}`}
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewMode("tablet")}
                    className={`p-1.5 rounded-md transition-colors ${previewMode === "tablet" ? "bg-primary text-primary-foreground" : "text-gray-400 hover:text-white"}`}
                  >
                    <Tablet className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewMode("desktop")}
                    className={`p-1.5 rounded-md transition-colors ${previewMode === "desktop" ? "bg-primary text-primary-foreground" : "text-gray-400 hover:text-white"}`}
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {form.requires_access && (
                <label className="text-xs text-green-400">✅ Preview (com acesso)</label>
              )}
              <div
                className="rounded-xl border border-gray-800 p-4 flex justify-center"
                style={{ background: "hsl(0 0% 4%)" }}
              >
                <div style={{ width: previewMode === "mobile" ? "340px" : previewMode === "tablet" ? "500px" : "100%" }}>
                  {form.card_type === "type1_lateral" ? (
                    <CardType1Lateral card={previewCard} onAction={() => {}} />
                  ) : (
                    <CardType2Top card={previewCard} hasAccess={true} onAction={() => {}} />
                  )}
                </div>
              </div>

              {/* Show locked version if requires_access */}
              {form.requires_access && (
                <>
                  <label className="text-xs text-gray-500">Preview (sem acesso / bloqueado)</label>
                  <div
                    className="rounded-xl border border-gray-800 p-4 flex justify-center"
                    style={{ background: "hsl(0 0% 4%)" }}
                  >
                    <div style={{ width: previewMode === "mobile" ? "340px" : previewMode === "tablet" ? "500px" : "100%" }}>
                      {form.card_type === "type1_lateral" ? (
                        <CardType1Lateral card={previewCard} onAction={() => {}} />
                      ) : (
                        <CardType2Top card={previewCard} hasAccess={false} onAction={() => {}} />
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
