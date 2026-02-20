import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Loader2, Star, StarOff, Globe } from "lucide-react";
import { toast } from "sonner";

export interface BettingHouse {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  iframe_url: string;
  aviator_url: string | null;
  roleta_url: string | null;
  mines_url: string | null;
  football_studio_url: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  name: "",
  slug: "",
  logo_url: "",
  iframe_url: "",
  aviator_url: "",
  roleta_url: "",
  mines_url: "",
  football_studio_url: "",
  is_active: true,
  is_default: false,
};

type HouseForm = typeof EMPTY_FORM;

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function AdminBettingHouses() {
  const [houses, setHouses] = useState<BettingHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<HouseForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof HouseForm, val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("betting_houses")
      .select("*")
      .order("created_at", { ascending: true });
    setHouses((data as BettingHouse[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (h: BettingHouse) => {
    setEditId(h.id);
    setForm({
      name: h.name,
      slug: h.slug,
      logo_url: h.logo_url ?? "",
      iframe_url: h.iframe_url,
      aviator_url: h.aviator_url ?? "",
      roleta_url: h.roleta_url ?? "",
      mines_url: h.mines_url ?? "",
      football_studio_url: h.football_studio_url ?? "",
      is_active: h.is_active,
      is_default: h.is_default,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug || !form.iframe_url) {
      toast.error("Nome, slug e URL do iframe são obrigatórios");
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name,
      slug: form.slug,
      logo_url: form.logo_url || null,
      iframe_url: form.iframe_url,
      aviator_url: form.aviator_url || null,
      roleta_url: form.roleta_url || null,
      mines_url: form.mines_url || null,
      football_studio_url: form.football_studio_url || null,
      is_active: form.is_active,
      is_default: form.is_default,
    };

    if (editId) {
      // If setting as default, unset others first
      if (form.is_default) {
        await supabase.from("betting_houses").update({ is_default: false }).neq("id", editId);
      }
      const { error } = await supabase.from("betting_houses").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Casa atualizada");
    } else {
      if (form.is_default) {
        await supabase.from("betting_houses").update({ is_default: false }).gte("id", "00000000-0000-0000-0000-000000000000");
      }
      const { error } = await supabase.from("betting_houses").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Casa criada");
    }

    setShowForm(false);
    load();
    setSaving(false);
  };

  const toggleActive = async (h: BettingHouse) => {
    const { error } = await supabase
      .from("betting_houses")
      .update({ is_active: !h.is_active })
      .eq("id", h.id);
    if (error) toast.error(error.message);
    else load();
  };

  const setDefault = async (h: BettingHouse) => {
    await supabase.from("betting_houses").update({ is_default: false }).gte("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("betting_houses").update({ is_default: true }).eq("id", h.id);
    toast.success(`${h.name} definida como casa padrão`);
    load();
  };

  const FieldRow = ({ label, fieldKey, placeholder, type = "text" }: { label: string; fieldKey: keyof HouseForm; placeholder?: string; type?: string }) => (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <Input
        type={type}
        placeholder={placeholder}
        value={(form[fieldKey] as string) ?? ""}
        onChange={(e) => set(fieldKey, e.target.value)}
        className="bg-gray-900 border-gray-800"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Casas Parceiras</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Nova Casa
        </Button>
      </div>

      {loading ? (
        <div className="text-gray-400 py-10 text-center flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <div className="grid gap-3">
          {houses.map((h) => (
            <div key={h.id} className="bg-gray-900 border border-white/10 rounded-xl p-4 flex items-center gap-4">
              {/* Logo/Icon */}
              <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                {h.logo_url ? (
                  <img src={h.logo_url} alt={h.name} className="w-full h-full object-contain" />
                ) : (
                  <Globe className="w-5 h-5 text-gray-500" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white text-sm">{h.name}</span>
                  {h.is_default && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-400/30 font-medium">
                      PADRÃO
                    </span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${h.is_active ? "bg-green-500/20 text-green-400 border border-green-400/30" : "bg-red-500/20 text-red-400 border border-red-400/30"}`}>
                    {h.is_active ? "ATIVA" : "INATIVA"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{h.iframe_url}</p>
                <div className="flex gap-3 mt-1 flex-wrap">
                  {h.aviator_url && <span className="text-[10px] text-gray-400">✈ Aviator</span>}
                  {h.roleta_url && <span className="text-[10px] text-gray-400">◉ Roleta</span>}
                  {h.mines_url && <span className="text-[10px] text-gray-400">💣 Mines</span>}
                  {h.football_studio_url && <span className="text-[10px] text-gray-400">⚽ Football Studio</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setDefault(h)}
                  title="Definir como padrão"
                  className={`p-1.5 rounded transition-colors ${h.is_default ? "text-yellow-400" : "text-gray-600 hover:text-yellow-400"}`}
                >
                  {h.is_default ? <Star className="w-4 h-4 fill-yellow-400" /> : <StarOff className="w-4 h-4" />}
                </button>
                <Switch checked={h.is_active} onCheckedChange={() => toggleActive(h)} />
                <button onClick={() => openEdit(h)} className="text-blue-400 hover:text-blue-300 transition-colors p-1.5 rounded">
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {houses.length === 0 && (
            <p className="text-gray-600 text-center py-8">Nenhuma casa cadastrada</p>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Casa" : "Nova Casa Parceira"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Nome *</label>
                <Input
                  placeholder="Ex: Esportiva Bet"
                  value={form.name}
                  onChange={(e) => {
                    set("name", e.target.value);
                    if (!editId) set("slug", slugify(e.target.value));
                  }}
                  className="bg-gray-900 border-gray-800"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Slug *</label>
                <Input
                  placeholder="ex: esportiva-bet"
                  value={form.slug}
                  onChange={(e) => set("slug", slugify(e.target.value))}
                  className="bg-gray-900 border-gray-800 font-mono text-sm"
                />
              </div>
            </div>

            <FieldRow label="Logo URL" fieldKey="logo_url" placeholder="https://..." />

            <div className="border-t border-white/10 pt-3">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">URLs da Casa</p>
              <div className="space-y-2">
                <FieldRow label="Iframe URL (página principal) *" fieldKey="iframe_url" placeholder="https://esportiva.bet" />
                <FieldRow label="Aviator URL" fieldKey="aviator_url" placeholder="https://esportiva.bet/aviator" />
                <FieldRow label="Roleta URL" fieldKey="roleta_url" placeholder="https://esportiva.bet/roleta" />
                <FieldRow label="Mines URL" fieldKey="mines_url" placeholder="https://esportiva.bet/mines" />
                <FieldRow label="Football Studio URL" fieldKey="football_studio_url" placeholder="https://esportiva.bet/football-studio" />
              </div>
            </div>

            <div className="border-t border-white/10 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm">Casa Ativa</label>
                <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm">Casa Padrão</label>
                  <p className="text-xs text-gray-500">Novos usuários serão atribuídos a esta casa</p>
                </div>
                <Switch checked={form.is_default} onCheckedChange={(v) => set("is_default", v)} />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editId ? "Salvar alterações" : "Criar casa")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
