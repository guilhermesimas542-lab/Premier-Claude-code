import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fromZonedTime } from "date-fns-tz";
import { BRAZIL_TZ } from "@/lib/timezone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { TeamAutocomplete } from "../components/TeamAutocomplete";

interface BettingHouseOption {
  id: string;
  name: string;
  slug: string;
}

const CATEGORIA_MAP: Record<string, { tier: string; addon: string | null }> = {
  free: { tier: "free", addon: null },
  basico: { tier: "basic", addon: null },
  pro: { tier: "pro", addon: null },
  ultra: { tier: "ultra", addon: null },
  alavancagem: { tier: "pro", addon: "alavancagem" },
  odds_altas: { tier: "pro", addon: "desaltas" },
};

const EMPTY_FORM = {
  gameDate: "",
  gameHour: "20",
  gameMinute: "00",
  team1_name: "", team1_logo_url: "",
  team2_name: "", team2_logo_url: "",
  categoria: "free",
  palpite: "",
  odd: "",
  mercado: "",
  mercado_explicacao: "",
  justification: "",
  link_house_1: "",
  link_house_2: "",
  link_house_3: "",
};

export default function AdminTipsCreate() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [houses, setHouses] = useState<BettingHouseOption[]>([]);

  useEffect(() => {
    supabase.from("betting_houses").select("id, name, slug").eq("is_active", true).order("created_at").then(({ data }) => {
      setHouses((data as BettingHouseOption[]) ?? []);
    });
  }, []);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")), []);
  const minuteOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0")), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.gameDate || !form.team1_name || !form.team2_name || !form.odd || !form.palpite) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setSaving(true);

    const cat = CATEGORIA_MAP[form.categoria] || CATEGORIA_MAP.free;
    const dateOnly = form.gameDate;

    // Convert game time from São Paulo timezone to UTC
    const gameLocalStr = `${dateOnly}T${form.gameHour}:${form.gameMinute}:00`;
    const startsAtUTC = fromZonedTime(gameLocalStr, BRAZIL_TZ);

    // expires_at = end of day in São Paulo timezone
    const endOfDayLocal = `${dateOnly}T23:59:00`;
    const expiresAtUTC = fromZonedTime(endOfDayLocal, BRAZIL_TZ);

    const payload: any = {
      title: `${form.team1_name} x ${form.team2_name}`,
      date: dateOnly,
      starts_at: startsAtUTC.toISOString(),
      expires_at: expiresAtUTC.toISOString(),
      odd: parseFloat(form.odd),
      tier_required: cat.tier,
      addon_required: cat.addon,
      active: true,
      team1_name: form.team1_name,
      team1_logo_url: form.team1_logo_url || null,
      team2_name: form.team2_name,
      team2_logo_url: form.team2_logo_url || null,
      condition_to_win: form.palpite || null,
      market: form.mercado || null,
      category: form.mercado || null,
      category_explanation: form.mercado_explicacao || null,
      justification: form.justification || null,
      link: form.link_house_1 || form.link_house_2 || form.link_house_3 || null,
      link_house_1: form.link_house_1 || null,
      link_house_2: form.link_house_2 || null,
      link_house_3: form.link_house_3 || null,
    };

    const { error } = await supabase.from("content_entries").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success("Tip criada com sucesso");
      setForm({ ...EMPTY_FORM });
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-xl font-bold">Cadastrar Tip</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Data e Hora */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Data do Jogo *</label>
            <Input
              type="date"
              value={form.gameDate}
              onChange={(e) => set("gameDate", e.target.value)}
              className="bg-muted/30 border-border"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Hora *</label>
            <Select value={form.gameHour} onValueChange={(v) => set("gameHour", v)}>
              <SelectTrigger className="bg-muted/30 border-border w-20"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">
                {hourOptions.map((h) => (
                  <SelectItem key={h} value={h}>{h}h</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Min *</label>
            <Select value={form.gameMinute} onValueChange={(v) => set("gameMinute", v)}>
              <SelectTrigger className="bg-muted/30 border-border w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {minuteOptions.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Time 1 */}
        <div className="border border-border rounded-lg p-3 space-y-3">
          <span className="text-xs text-muted-foreground font-semibold uppercase">Time 1</span>
          <TeamAutocomplete
            label="Time 1"
            value={form.team1_name}
            logoUrl={form.team1_logo_url}
            onChange={(name, logoUrl) => setForm(f => ({ ...f, team1_name: name, team1_logo_url: logoUrl }))}
          />
        </div>

        {/* Time 2 */}
        <div className="border border-border rounded-lg p-3 space-y-3">
          <span className="text-xs text-muted-foreground font-semibold uppercase">Time 2</span>
          <TeamAutocomplete
            label="Time 2"
            value={form.team2_name}
            logoUrl={form.team2_logo_url}
            onChange={(name, logoUrl) => setForm(f => ({ ...f, team2_name: name, team2_logo_url: logoUrl }))}
          />
        </div>

        {/* Categoria, Odd */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Categoria *</label>
            <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
              <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basico">Básico</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="ultra">Ultra</SelectItem>
                <SelectItem value="alavancagem">Alavancagem</SelectItem>
                <SelectItem value="odds_altas">Odds Altas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Odd *</label>
            <Input type="number" step="0.01" value={form.odd} onChange={(e) => set("odd", e.target.value)} className="bg-muted/30 border-border" />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Palpite *</label>
          <Input value={form.palpite} onChange={(e) => set("palpite", e.target.value)} placeholder="Ex: Mais de 1.5 gols" className="bg-muted/30 border-border" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Mercado</label>
          <Input value={form.mercado} onChange={(e) => set("mercado", e.target.value)} placeholder="Ex: Over/Under, Resultado Final" className="bg-muted/30 border-border" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">O que é esse mercado?</label>
          <Textarea value={form.mercado_explicacao} onChange={(e) => set("mercado_explicacao", e.target.value)} className="bg-muted/30 border-border" rows={2} placeholder="Explicação que aparece no tooltip (?)" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Justificativa</label>
          <Textarea value={form.justification} onChange={(e) => set("justification", e.target.value)} className="bg-muted/30 border-border" rows={3} placeholder="Texto do modal de justificativa (📊)" />
        </div>

        {/* Links por Casa de Apostas */}
        {houses.length > 0 && (
          <div className="border border-border rounded-lg p-3 space-y-2">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Links por Casa de Apostas (opcional)</span>
            {houses.slice(0, 3).map((h, idx) => {
              const key = `link_house_${idx + 1}` as "link_house_1" | "link_house_2" | "link_house_3";
              return (
                <div key={h.id}>
                  <label className="text-xs text-muted-foreground">🏠 {h.name}</label>
                  <Input
                    value={form[key] ?? ""}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={`https://.../${h.slug}/tip`}
                    className="bg-muted/30 border-border"
                  />
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground/60">A tip aparece apenas para clientes da casa com link preenchido.</p>
          </div>
        )}

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Salvar Tip
        </Button>
      </form>
    </div>
  );
}
