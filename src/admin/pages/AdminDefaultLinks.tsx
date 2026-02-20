import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useBettingHouseAdmin } from "../context/BettingHouseContext";

export default function AdminDefaultLinks() {
  const { selectedHouse, loading: houseLoading } = useBettingHouseAdmin();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    iframe_url: "",
    aviator_url: "",
    roleta_url: "",
    mines_url: "",
    football_studio_url: "",
  });

  useEffect(() => {
    if (selectedHouse) {
      setForm({
        iframe_url: selectedHouse.iframe_url ?? "",
        aviator_url: (selectedHouse as any).aviator_url ?? "",
        roleta_url: (selectedHouse as any).roleta_url ?? "",
        mines_url: (selectedHouse as any).mines_url ?? "",
        football_studio_url: (selectedHouse as any).football_studio_url ?? "",
      });
    }
  }, [selectedHouse]);

  const handleSave = async () => {
    if (!selectedHouse) return;
    setSaving(true);
    const { error } = await supabase
      .from("betting_houses")
      .update({
        iframe_url: form.iframe_url,
        aviator_url: form.aviator_url || null,
        roleta_url: form.roleta_url || null,
        mines_url: form.mines_url || null,
        football_studio_url: form.football_studio_url || null,
      } as any)
      .eq("id", selectedHouse.id);
    if (error) toast.error(error.message);
    else toast.success("Links salvos com sucesso!");
    setSaving(false);
  };

  if (houseLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
      </div>
    );
  }

  if (!selectedHouse) {
    return (
      <div className="text-center py-20 text-gray-500">
        Nenhuma casa selecionada. Selecione uma casa no topo da página.
      </div>
    );
  }

  const fields = [
    { key: "iframe_url", label: "🏠 Iframe de Esportes", placeholder: "https://esportivabet.com" },
    { key: "aviator_url", label: "✈️ Aviator", placeholder: "https://esportivabet.com/cassino/aviator" },
    { key: "roleta_url", label: "🎰 Roleta", placeholder: "https://esportivabet.com/cassino/roleta" },
    { key: "mines_url", label: "💎 Mines", placeholder: "https://esportivabet.com/cassino/mines" },
    { key: "football_studio_url", label: "⚽ Football Studio", placeholder: "https://esportivabet.com/cassino/football" },
  ] as const;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold">Links Padrão</h2>
        <p className="text-sm text-gray-400 mt-1">
          Configure os links padrão para <span className="text-white font-medium">{selectedHouse.name}</span>
        </p>
      </div>

      <div className="bg-gray-900 border border-white/10 rounded-xl p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">URLs da Casa</p>
          <div className="space-y-4">
            {fields.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-sm text-gray-300 mb-1.5 block">{label}</label>
                <Input
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Links
        </Button>
      </div>
    </div>
  );
}
