import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, GripVertical, Image } from "lucide-react";
import { toast } from "sonner";

interface Card {
  id: string;
  name: string;
  image_url: string | null;
  title: string;
  subtitle: string | null;
  card_type: string;
  checkout_url: string | null;
  product_id: string | null;
  is_active: boolean;
  display_order: number;
  target_audience: string;
  created_at: string;
}

interface FunnelStep {
  id: string;
  card_id: string;
  step_order: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
}

const EMPTY_CARD = {
  name: "",
  image_url: "",
  title: "",
  subtitle: "",
  card_type: "info",
  checkout_url: "",
  product_id: "",
  is_active: true,
  display_order: 0,
  target_audience: "all",
};

const EMPTY_STEP = {
  question: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
};

export default function AdminCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_CARD });
  const [saving, setSaving] = useState(false);
  const [steps, setSteps] = useState<(typeof EMPTY_STEP & { id?: string })[]>([]);

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
    setForm({ ...EMPTY_CARD });
    setSteps([]);
    setShowForm(true);
  };

  const openEdit = async (c: Card) => {
    setEditId(c.id);
    setForm({
      name: c.name,
      image_url: c.image_url ?? "",
      title: c.title,
      subtitle: c.subtitle ?? "",
      card_type: c.card_type,
      checkout_url: c.checkout_url ?? "",
      product_id: c.product_id ?? "",
      is_active: c.is_active,
      display_order: c.display_order,
      target_audience: c.target_audience,
    });

    if (c.card_type === "funnel") {
      const { data } = await supabase
        .from("funnel_steps" as any)
        .select("*")
        .eq("card_id", c.id)
        .order("step_order", { ascending: true });
      setSteps(
        (data as any as FunnelStep[])?.map((s) => ({
          id: s.id,
          question: s.question,
          option_a: s.option_a,
          option_b: s.option_b,
          option_c: s.option_c ?? "",
          option_d: s.option_d ?? "",
        })) ?? []
      );
    } else {
      setSteps([]);
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.title) {
      toast.error("Nome e título são obrigatórios");
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name,
      image_url: form.image_url || null,
      title: form.title,
      subtitle: form.subtitle || null,
      card_type: form.card_type,
      checkout_url: form.checkout_url || null,
      product_id: form.product_id || null,
      is_active: form.is_active,
      display_order: form.display_order,
      target_audience: form.target_audience,
    };

    let cardId = editId;

    if (editId) {
      const { error } = await supabase.from("cards" as any).update(payload).eq("id", editId);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { data, error } = await (supabase.from("cards" as any).insert(payload).select("id").single() as any);
      if (error) { toast.error(error.message); setSaving(false); return; }
      cardId = (data as any).id;
    }

    // Save funnel steps if type is funnel
    if (form.card_type === "funnel" && cardId) {
      // Delete existing steps
      await supabase.from("funnel_steps" as any).delete().eq("card_id", cardId);
      // Insert new
      const stepsToInsert = steps
        .filter((s) => s.question && s.option_a && s.option_b)
        .map((s, i) => ({
          card_id: cardId,
          step_order: i + 1,
          question: s.question,
          option_a: s.option_a,
          option_b: s.option_b,
          option_c: s.option_c || null,
          option_d: s.option_d || null,
        }));
      if (stepsToInsert.length > 0) {
        await supabase.from("funnel_steps" as any).insert(stepsToInsert);
      }
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

  const addStep = () => {
    if (steps.length >= 5) { toast.error("Máximo de 5 etapas"); return; }
    setSteps([...steps, { ...EMPTY_STEP }]);
  };

  const updateStep = (idx: number, key: string, val: string) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [key]: val } : s)));
  };

  const removeStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
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
                ) : (
                  <Image className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white text-sm">{c.title}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.card_type === "funnel" ? "bg-purple-500/20 text-purple-400 border border-purple-400/30" : "bg-blue-500/20 text-blue-400 border border-blue-400/30"}`}>
                    {c.card_type === "funnel" ? "FUNIL" : "INFO"}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.is_active ? "bg-green-500/20 text-green-400 border border-green-400/30" : "bg-red-500/20 text-red-400 border border-red-400/30"}`}>
                    {c.is_active ? "ATIVO" : "INATIVO"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{c.name} · Ordem: {c.display_order}</p>
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
            <div>
              <label className="text-xs text-gray-500">Nome interno *</label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Upsell Pro" className="bg-gray-900 border-gray-800" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Título *</label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex: Desbloqueie o Plano Pro" className="bg-gray-900 border-gray-800" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Subtítulo</label>
              <Input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="Ex: Acesse tips exclusivas" className="bg-gray-900 border-gray-800" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Imagem URL</label>
              <Input value={form.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://..." className="bg-gray-900 border-gray-800" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Tipo</label>
                <Select value={form.card_type} onValueChange={(v) => set("card_type", v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="funnel">Funil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Público-alvo</label>
                <Select value={form.target_audience} onValueChange={(v) => set("target_audience", v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="ultra">Ultra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Ordem de exibição</label>
                <Input type="number" value={form.display_order} onChange={(e) => set("display_order", parseInt(e.target.value) || 0)} className="bg-gray-900 border-gray-800" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Checkout URL</label>
                <Input value={form.checkout_url} onChange={(e) => set("checkout_url", e.target.value)} placeholder="https://checkout..." className="bg-gray-900 border-gray-800" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500">Product ID (opcional)</label>
              <Input value={form.product_id} onChange={(e) => set("product_id", e.target.value)} placeholder="UUID do produto" className="bg-gray-900 border-gray-800 font-mono text-xs" />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm">Ativo</label>
              <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
            </div>

            {/* Funnel Steps */}
            {form.card_type === "funnel" && (
              <div className="border-t border-white/10 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Etapas do Funil ({steps.length}/5)</p>
                  <Button size="sm" variant="outline" onClick={addStep} disabled={steps.length >= 5}>
                    <Plus className="w-3 h-3" /> Etapa
                  </Button>
                </div>
                <div className="space-y-3">
                  {steps.map((step, idx) => (
                    <div key={idx} className="bg-gray-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                          <GripVertical className="w-3 h-3" /> Etapa {idx + 1}
                        </span>
                        <button onClick={() => removeStep(idx)} className="text-red-400 hover:text-red-300 text-xs">Remover</button>
                      </div>
                      <Input
                        value={step.question}
                        onChange={(e) => updateStep(idx, "question", e.target.value)}
                        placeholder="Pergunta"
                        className="bg-gray-900 border-gray-700 text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={step.option_a} onChange={(e) => updateStep(idx, "option_a", e.target.value)} placeholder="Opção A *" className="bg-gray-900 border-gray-700 text-xs" />
                        <Input value={step.option_b} onChange={(e) => updateStep(idx, "option_b", e.target.value)} placeholder="Opção B *" className="bg-gray-900 border-gray-700 text-xs" />
                        <Input value={step.option_c} onChange={(e) => updateStep(idx, "option_c", e.target.value)} placeholder="Opção C" className="bg-gray-900 border-gray-700 text-xs" />
                        <Input value={step.option_d} onChange={(e) => updateStep(idx, "option_d", e.target.value)} placeholder="Opção D" className="bg-gray-900 border-gray-700 text-xs" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? "Salvar alterações" : "Criar card"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
