import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useBettingHouseAdmin } from "../context/BettingHouseContext";

type PopupKey =
  | "popup_welcome"
  | "popup_basic"
  | "popup_pro"
  | "popup_ultra"
  | "popup_alavancagem"
  | "popup_odds_altas"
  | "popup_live_telegram";

interface PopupForm {
  popup_welcome_image: string;
  popup_welcome_link: string;
  popup_basic_image: string;
  popup_basic_link: string;
  popup_pro_image: string;
  popup_pro_link: string;
  popup_ultra_image: string;
  popup_ultra_link: string;
  popup_alavancagem_image: string;
  popup_alavancagem_link: string;
  popup_odds_altas_image: string;
  popup_odds_altas_link: string;
  popup_live_telegram_image: string;
  popup_live_telegram_link: string;
}

const EMPTY_FORM: PopupForm = {
  popup_welcome_image: "",
  popup_welcome_link: "",
  popup_basic_image: "",
  popup_basic_link: "",
  popup_pro_image: "",
  popup_pro_link: "",
  popup_ultra_image: "",
  popup_ultra_link: "",
  popup_alavancagem_image: "",
  popup_alavancagem_link: "",
  popup_odds_altas_image: "",
  popup_odds_altas_link: "",
  popup_live_telegram_image: "",
  popup_live_telegram_link: "",
};

const POPUP_SECTIONS = [
  { key: "popup_welcome" as PopupKey, title: "🎉 Pop-up de Boas-Vindas", description: "Exibido na primeira visita do usuário" },
  { key: "popup_basic" as PopupKey, title: "🔓 Free → Basic", description: "Exibido quando usuário Free tenta ver conteúdo Basic" },
  { key: "popup_pro" as PopupKey, title: "🔓 Basic → Pro", description: "Exibido quando usuário Basic tenta ver conteúdo Pro" },
  { key: "popup_ultra" as PopupKey, title: "🔓 Pro → Ultra", description: "Exibido quando usuário Pro tenta ver conteúdo Ultra" },
  { key: "popup_alavancagem" as PopupKey, title: "📈 Add-on Alavancagem", description: "Exibido quando usuário tenta ver tips de Alavancagem" },
  { key: "popup_odds_altas" as PopupKey, title: "🎯 Add-on Odds Altas", description: "Exibido quando usuário tenta ver tips de Odds Altas" },
  { key: "popup_live_telegram" as PopupKey, title: "📱 Add-on Live Telegram", description: "Exibido quando usuário tenta ver tips Live Telegram" },
];

function ImageUpload({
  value,
  onChange,
  houseId,
  popupKey,
}: {
  value: string;
  onChange: (url: string) => void;
  houseId: string;
  popupKey: PopupKey;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${houseId}/${popupKey}.${ext}`;
    const { error } = await supabase.storage.from("popups").upload(path, file, { upsert: true });
    if (error) { toast.error("Erro no upload: " + error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("popups").getPublicUrl(path);
    onChange(data.publicUrl + "?t=" + Date.now());
    setUploading(false);
    toast.success("Imagem enviada!");
  };

  return (
    <div className="space-y-2">
      <label className="text-xs text-gray-400">Imagem</label>
      {value ? (
        <div className="relative group w-full h-24 rounded-lg overflow-hidden border border-white/10">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            onClick={() => onChange("")}
            className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="w-full h-24 rounded-lg border-2 border-dashed border-gray-700 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-gray-500 transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : (
            <>
              <Upload className="w-5 h-5 text-gray-500" />
              <span className="text-xs text-gray-500">Clique para enviar</span>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
      />
    </div>
  );
}

export default function AdminPopups() {
  const { selectedHouse, loading: houseLoading } = useBettingHouseAdmin();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PopupForm>({ ...EMPTY_FORM });

  useEffect(() => {
    if (selectedHouse) {
      const h = selectedHouse as any;
      setForm({
        popup_welcome_image: h.popup_welcome_image ?? "",
        popup_welcome_link: h.popup_welcome_link ?? "",
        popup_basic_image: h.popup_basic_image ?? "",
        popup_basic_link: h.popup_basic_link ?? "",
        popup_pro_image: h.popup_pro_image ?? "",
        popup_pro_link: h.popup_pro_link ?? "",
        popup_ultra_image: h.popup_ultra_image ?? "",
        popup_ultra_link: h.popup_ultra_link ?? "",
        popup_alavancagem_image: h.popup_alavancagem_image ?? "",
        popup_alavancagem_link: h.popup_alavancagem_link ?? "",
        popup_odds_altas_image: h.popup_odds_altas_image ?? "",
        popup_odds_altas_link: h.popup_odds_altas_link ?? "",
        popup_live_telegram_image: h.popup_live_telegram_image ?? "",
        popup_live_telegram_link: h.popup_live_telegram_link ?? "",
      });
    }
  }, [selectedHouse]);

  const handleSave = async () => {
    if (!selectedHouse) return;
    setSaving(true);
    const payload: Record<string, string | null> = {};
    Object.entries(form).forEach(([k, v]) => { payload[k] = v || null; });
    const { error } = await supabase.from("betting_houses").update(payload as any).eq("id", selectedHouse.id);
    if (error) toast.error(error.message);
    else toast.success("Pop-ups salvos com sucesso!");
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold">Pop-ups</h2>
        <p className="text-sm text-gray-400 mt-1">
          Configure pop-ups para <span className="text-white font-medium">{selectedHouse.name}</span>
        </p>
      </div>

      <div className="space-y-4">
        {POPUP_SECTIONS.map(({ key, title, description }) => {
          const imgKey = `${key}_image` as keyof PopupForm;
          const linkKey = `${key}_link` as keyof PopupForm;
          return (
            <div key={key} className="bg-gray-900 border border-white/10 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ImageUpload
                  value={form[imgKey]}
                  onChange={(url) => setForm((f) => ({ ...f, [imgKey]: url }))}
                  houseId={selectedHouse.id}
                  popupKey={key}
                />
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Link ao clicar</label>
                  <Input
                    placeholder="https://..."
                    value={form[linkKey]}
                    onChange={(e) => setForm((f) => ({ ...f, [linkKey]: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-sm"
                  />
                  {form[imgKey] && (
                    <p className="text-[10px] text-green-400">✓ Imagem configurada</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar Pop-ups
      </Button>
    </div>
  );
}
