import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface BettingHouseOption { id: string; name: string; }

const ADDON_TOGGLES = [
  { key: "alavancagem", label: "Alavancagem" },
  { key: "multiplas_bingo", label: "Múltiplas / Bingo" },
  { key: "live_telegram", label: "Live Telegram" },
  { key: "acesso_vitalicio", label: "Acesso Vitalício" },
  { key: "mercados_secundarios", label: "Merc. Secundário" },
  { key: "esportes_americanos", label: "Ligas Americanas" },
] as const;

export default function AdminClientsCreate() {
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState("free");
  const [origin, setOrigin] = useState("gift");
  const [houseId, setHouseId] = useState("");
  const [houses, setHouses] = useState<BettingHouseOption[]>([]);
  const [addons, setAddons] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("betting_houses").select("id, name").eq("is_active", true).order("created_at").then(({ data }) => {
      setHouses((data as BettingHouseOption[]) ?? []);
    });
  }, []);

  const handleCreate = async () => {
    if (!email) { toast.error("Email obrigatório"); return; }
    if (!origin) { toast.error("Origem do usuário obrigatória"); return; }
    setSaving(true);
    const finalHouseId = houseId || (houses.length > 0 ? houses[0].id : null);

    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        email: email.toLowerCase().trim(),
        main_tier: tier as any,
        betting_house_id: finalHouseId,
        origin,
      } as any)
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    // Grant selected add-ons as entitlements
    const userId = newUser?.id;
    if (userId) {
      const activeAddons = ADDON_TOGGLES.filter(({ key }) => addons[key]);
      for (const { key } of activeAddons) {
        await supabase.from("entitlements").insert({
          user_id: userId,
          product_key: key as any,
          source: "admin" as any,
          status: "active" as any,
        });
      }
    }

    toast.success("Cliente criado com sucesso!");
    setEmail("");
    setTier("free");
    setOrigin("gift");
    setHouseId("");
    setAddons({});
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Cadastrar Novo Cliente</h2>

      <Card className="bg-card border-border max-w-lg">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Dados do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium">Email *</label>
            <Input
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium">Plano</label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="ultra">Ultra</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="diamante">Diamante</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium">Origem do Usuário *</label>
            <Select value={origin} onValueChange={setOrigin}>
              <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gift">Brinde / Parceria</SelectItem>
                <SelectItem value="test">Usuário de Teste</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Usuários de teste são excluídos dos KPIs financeiros e do módulo de Upsell.
            </p>
          </div>

          {houses.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground font-medium">Casa de Apostas</label>
              <Select value={houseId} onValueChange={setHouseId}>
                <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue placeholder="Selecionar casa" /></SelectTrigger>
                <SelectContent>
                  {houses.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="border-t border-white/10 pt-3 space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Add-ons</p>
            {ADDON_TOGGLES.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <Switch
                  checked={addons[key] ?? false}
                  onCheckedChange={(v) => setAddons((prev) => ({ ...prev, [key]: v }))}
                />
                <label className="text-sm">{label}</label>
              </div>
            ))}
          </div>

          <Button onClick={handleCreate} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Cliente"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
