import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Check, AlertTriangle, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useBettingHouseAdmin } from "../context/BettingHouseContext";

function getUrlStatus(url: string) {
  if (!url || url.trim() === "") {
    return { icon: <XCircle className="w-4 h-4 text-red-400" />, color: "text-red-400", message: "Link não configurado" };
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return { icon: <CheckCircle2 className="w-4 h-4 text-green-400" />, color: "text-green-400", message: "URL válida" };
    }
  } catch {}
  return { icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />, color: "text-yellow-400", message: "URL inválida (deve começar com https://)" };
}

const FIELDS = [
  { key: "iframe_url", label: "🏠 Iframe de Esportes", placeholder: "https://esportivabet.com", section: "sports" },
  { key: "telegram_group_url", label: "📲 Link do Grupo Telegram", placeholder: "https://t.me/seugrupovip", section: "sports" },
  { key: "support_whatsapp_url", label: "📞 URL Suporte WhatsApp", placeholder: "https://wa.me/5511999999999", section: "buttons" },
  { key: "acquire_access_url", label: "🛒 URL Adquirir Acesso", placeholder: "https://checkout.premierfc.app/...", section: "buttons" },
] as const;

type FormKey = "iframe_url" | "telegram_group_url" | "support_whatsapp_url" | "acquire_access_url";

type Form = Record<FormKey, string>;

const EMPTY_FORM: Form = {
  iframe_url: "",
  telegram_group_url: "",
  support_whatsapp_url: "",
  acquire_access_url: "",
};

export default function AdminDefaultLinks() {
  const { selectedHouse, loading: houseLoading } = useBettingHouseAdmin();
  const [form, setForm] = useState<Form>({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedHouse) return;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("betting_houses")
        .select("iframe_url, telegram_group_url, support_whatsapp_url, acquire_access_url, created_at")
        .eq("id", selectedHouse.id)
        .maybeSingle();

      if (!error && data) {
        setForm({
          iframe_url: data.iframe_url ?? "",
          telegram_group_url: (data as any).telegram_group_url ?? "",
          support_whatsapp_url: (data as any).support_whatsapp_url ?? "",
          acquire_access_url: (data as any).acquire_access_url ?? "",
        });
        // Don't set lastUpdated from created_at — it's not the last save time
      }
      setLoading(false);
    };

    load();
  }, [selectedHouse?.id]);

  const handleSave = async () => {
    // Validate URLs before saving
    const invalidFields = FIELDS.filter(({ key }) => {
      const url = form[key];
      if (!url || url.trim() === "") return false;
      try {
        const parsed = new URL(url);
        return parsed.protocol !== "http:" && parsed.protocol !== "https:";
      } catch {
        return true;
      }
    });

    if (invalidFields.length > 0) {
      toast.error(`URLs inválidas: ${invalidFields.map((f) => f.label.replace(/^[^\s]+\s/, "")).join(", ")}`);
      return;
    }

    if (!selectedHouse) return;
    setSaving(true);
    setSaveSuccess(false);

    const { error } = await supabase
      .from("betting_houses")
      .update({
        iframe_url: form.iframe_url,
        telegram_group_url: form.telegram_group_url || null,
        support_whatsapp_url: form.support_whatsapp_url || null,
        acquire_access_url: form.acquire_access_url || null,
      } as any)
      .eq("id", selectedHouse.id);

    setSaving(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSaveSuccess(true);
      setLastUpdated(new Date().toISOString());
      toast.success("Links salvos com sucesso!");
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  if (houseLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
      </div>
    );
  }

  if (!selectedHouse) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Nenhuma casa selecionada. Selecione uma casa no topo da página.
      </div>
    );
  }

  const sportsFields = FIELDS.filter((f) => f.section === "sports");
  
  const buttonFields = FIELDS.filter((f) => f.section === "buttons");

  const renderField = (field: (typeof FIELDS)[number]) => {
    const url = form[field.key];
    const status = getUrlStatus(url);
    return (
      <div key={field.key} className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">{field.label}</label>
          <span title={status.message}>{status.icon}</span>
        </div>
        <Input
          type="url"
          placeholder={field.placeholder}
          value={url}
          onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
          className="bg-gray-800 border-gray-700 text-sm"
        />
        <p className={`text-xs ${status.color}`}>{status.message}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Links Padrão</h2>
          <button
            onClick={async () => { if (selectedHouse) { setLoading(true); const { data } = await supabase.from("betting_houses").select("iframe_url, telegram_group_url, support_whatsapp_url, acquire_access_url").eq("id", selectedHouse.id).maybeSingle(); if (data) { setForm({ iframe_url: (data as any).iframe_url ?? "", telegram_group_url: (data as any).telegram_group_url ?? "", support_whatsapp_url: (data as any).support_whatsapp_url ?? "", acquire_access_url: (data as any).acquire_access_url ?? "" }); } setLoading(false); } }}
            className="p-2 rounded-lg bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-white transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Configure os links padrão para{" "}
          <span className="text-foreground font-medium">{selectedHouse.name}</span>
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Carregando links…</span>
        </div>
      ) : (
        <>
          {/* Sports section */}
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              🏠 Esportes
            </p>
            {sportsFields.map(renderField)}
          </div>


          {/* Buttons section */}
          <div className="bg-gray-900 border border-white/10 rounded-xl p-6 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              🔗 Links de Botões
            </p>
            {buttonFields.map(renderField)}
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className={`w-full gap-2 transition-all ${
              saveSuccess
                ? "bg-green-600 hover:bg-green-600 text-white"
                : ""
            }`}
          >
            {saving && <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>}
            {!saving && saveSuccess && <><Check className="w-4 h-4" /> Links Salvos!</>}
            {!saving && !saveSuccess && <><Save className="w-4 h-4" /> Salvar Links</>}
          </Button>

          {/* Last updated */}
          {lastUpdated && (
            <p className="text-xs text-muted-foreground text-center">
              Última atualização:{" "}
              {new Date(lastUpdated).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
