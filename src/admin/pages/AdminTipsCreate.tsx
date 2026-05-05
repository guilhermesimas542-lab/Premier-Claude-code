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
import { PredictionAutocomplete } from "../components/PredictionAutocomplete";
import AltenarOddsReader from "../components/AltenarOddsReader";

interface BettingHouseOption {
  id: string;
  name: string;
  slug: string;
}

// feature corresponds to the new gating system (user_has_feature).
// Mantemos tier_required + addon_required preenchidos para retrocompat durante a transição.
// feature=null => acesso público (não passa por user_has_feature, gateia só por tier_required='free')
const CATEGORIA_MAP: Record<string, { tier: string; addon: string | null; feature: string | null }> = {
  free:                 { tier: "free",  addon: null,          feature: null },
  basico:               { tier: "basic", addon: null,          feature: "odds_safes" },
  pro:                  { tier: "pro",   addon: null,          feature: "odds_pro" },
  ultra:                { tier: "ultra", addon: null,          feature: "odds_pro" },
  alavancagem:          { tier: "ultra", addon: "alavancagem", feature: "alavancagem" },
  multiplas_bingo:      { tier: "ultra", addon: null,          feature: "multiplas_bingo" },
  mercados_secundarios: { tier: "ultra", addon: null,          feature: "mercados_secundarios" },
  esportes_americanos:  { tier: "ultra", addon: null,          feature: "esportes_americanos" },
  odds_ultra:           { tier: "ultra", addon: null,          feature: "odds_ultra" },
};

function getTodayBrasilia(): string {
  const now = new Date();
  const brasiliaStr = now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return brasiliaStr;
}

function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

const EMPTY_FORM = {
  gameDate: getTomorrowDate(),
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
  const [bilheteSearchValue, setBilheteSearchValue] = useState("");
  const [bilheteAutocompleteKey, setBilheteAutocompleteKey] = useState(0);
  const [wsdkPayload, setWsdkPayload] = useState<Record<string, unknown> | Record<string, unknown>[] | null>(null);
  const [betBuilderJson, setBetBuilderJson] = useState("");
  const [betBuilderImported, setBetBuilderImported] = useState(false);
  const [betBuilderError, setBetBuilderError] = useState("");
  const [betBuilderSummary, setBetBuilderSummary] = useState("");
  const [altenarResetKey, setAltenarResetKey] = useState(0);

  const handleBetBuilderImport = () => {
    try {
      const raw = betBuilderJson.trim();
      if (!raw) {
        setBetBuilderError("Cole o JSON antes de importar.");
        return;
      }
      let parsed: any;
      try {
        // Sanitizar caracteres invisíveis comuns do clipboard
        const sanitized = raw
          .replace(/[\u200B-\u200D\uFEFF]/g, '')  // zero-width spaces, BOM
          .replace(/\u00A0/g, ' ')                  // NBSP → espaço normal
          .replace(/[\u201C\u201D]/g, '"')          // aspas tipográficas → aspas normais
          .replace(/[\u2018\u2019]/g, "'");         // aspas simples tipográficas
        parsed = JSON.parse(sanitized);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        setBetBuilderError("JSON inválido: " + msg);
        return;
      }
      const selections = parsed?.state?.selections;
      if (!selections || !Array.isArray(selections) || selections.length === 0) {
        setBetBuilderError("Estrutura inválida. O JSON deve ter state.selections com pelo menos 1 item.");
        return;
      }
      const first = selections[0];
      if (!first.event?.id || !first.odd?.price) {
        setBetBuilderError("Seleção inválida: falta event.id ou odd.price.");
        return;
      }
      setWsdkPayload(selections);

      const eventName = first.event?.name || "";
      const team1 = first.competitors?.[0]?.name || "";
      const team2 = first.competitors?.[1]?.name || "";
      const startDate = first.event?.startDate || "";
      const combinedOdd = selections.reduce((acc: number, s: any) => acc * (s.odd?.price || 1), 1);
      const isBetBuilder = first.isBBMarketGroup === true;
      const bbCount = first.bbSelections?.length || 0;

      setForm(f => ({
        ...f,
        odd: combinedOdd.toFixed(2),
        team1_name: f.team1_name.trim() ? f.team1_name : team1,
        team2_name: f.team2_name.trim() ? f.team2_name : team2,
      }));

      if (startDate) {
        try {
          const d = new Date(startDate);
          const localDate = d.toISOString().split("T")[0];
          const hours = d.getUTCHours() - 3;
          const minutes = d.getUTCMinutes();
          setForm(f => ({
            ...f,
            gameDate: localDate,
            gameHour: String(hours < 0 ? hours + 24 : hours).padStart(2, "0"),
            gameMinute: String(minutes).padStart(2, "0"),
          }));
        } catch { /* ignora erro de parsing de data */ }
      }

      if (isBetBuilder && bbCount > 0) {
        const bbNames = first.bbSelections.map((bb: any) =>
          `${bb.market?.shortName || bb.market?.name || "?"}: ${bb.odd?.name || "?"}`
        ).join(" · ");
        setBetBuilderSummary(`Criar Aposta — ${eventName} — ${bbCount} pernas — Odd ${combinedOdd.toFixed(2)} — ${bbNames}`);
      } else {
        setBetBuilderSummary(`${selections.length} seleções importadas — Odd combinada ${combinedOdd.toFixed(2)}`);
      }

      setBetBuilderImported(true);
      setBetBuilderError("");
      toast.success(`Criar Aposta importado com sucesso! ${isBetBuilder ? bbCount + " pernas" : selections.length + " seleções"}`);
    } catch (err) {
      setBetBuilderError("Erro inesperado ao processar o JSON.");
      console.error("BetBuilder import error:", err);
    }
  };

  const isMultiTip = (() => {
    const p = form.palpite?.trim().toLowerCase();
    return p === "bilhete especial" || p === "múltipla do dia";
  })();

  const handleAltenarMultiSelection = (selections: Array<{
    wsdkPayload: Record<string, unknown>;
    eventName: string;
    marketName: string;
    oddName: string;
    oddPrice: number;
    team1Name: string;
    team2Name: string;
    startDate?: string;
  }>) => {
    if (!selections.length) return;
    const payloads = selections.map((s) => s.wsdkPayload);
    setWsdkPayload(payloads);
    const combinedOdd = selections.reduce((acc, s) => acc * s.oddPrice, 1);
    const firstSel = selections[0];
    const allSameEvent = selections.every(
      (s) => (s.wsdkPayload as any)?.event?.id === (firstSel.wsdkPayload as any)?.event?.id
    );
    setForm((f) => ({
      ...f,
      odd: combinedOdd.toFixed(2),
      team1_name: f.team1_name.trim() ? f.team1_name : (allSameEvent ? firstSel.team1Name : f.team1_name),
      team2_name: f.team2_name.trim() ? f.team2_name : (allSameEvent ? firstSel.team2Name : f.team2_name),
    }));
  };

  const handleAltenarSelection = (data: {
    wsdkPayload: Record<string, unknown>;
    eventName: string;
    marketName: string;
    oddName: string;
    oddPrice: number;
    team1Name: string;
    team2Name: string;
    startDate?: string;
  }) => {
    setWsdkPayload(data.wsdkPayload);

    setForm((f) => ({
      ...f,
      odd: data.oddPrice ? data.oddPrice.toFixed(2) : f.odd,
      team1_name: f.team1_name.trim() ? f.team1_name : (data.team1Name || f.team1_name),
      team2_name: f.team2_name.trim() ? f.team2_name : (data.team2Name || f.team2_name),
    }));

    // Auto-preencher data e hora do jogo a partir do evento Altenar
    if (data.startDate) {
      try {
        const eventDate = new Date(data.startDate);
        const brasiliaDate = eventDate.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
        const parts = new Intl.DateTimeFormat("en-GB", {
          timeZone: "America/Sao_Paulo",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).formatToParts(eventDate);
        const brasiliaHour = parts.find((p) => p.type === "hour")?.value || "";
        const brasiliaMinute = parts.find((p) => p.type === "minute")?.value || "";

        set("gameDate", brasiliaDate);
        if (brasiliaHour) set("gameHour", brasiliaHour);
        if (brasiliaMinute) set("gameMinute", brasiliaMinute);
      } catch {
        // Se falhar o parse da data, não preenche
      }
    }
  };

  useEffect(() => {
    supabase.from("betting_houses").select("id, name, slug").eq("is_active", true).order("created_at").then(({ data }) => {
      setHouses((data as BettingHouseOption[]) ?? []);
    });
  }, []);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const isSpecialCategory = form.categoria === "alavancagem";
  const isBilheteEspecial = form.palpite?.trim().toLowerCase() === "bilhete especial";

  useEffect(() => {
    if (form.categoria === "alavancagem") {
      setForm(f => ({
        ...f,
        palpite: "Alavancagem do Dia",
        mercado: "Combinação de Mercados",
        mercado_explicacao: "Esta é uma entrada especial que combina múltiplos mercados de baixa odd para criar uma aposta mais segura e com potencial de alavancagem de banca.",
      }));
    }
  }, [form.categoria]);

  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")), []);
  const minuteOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0")), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const teamsRequired = !isSpecialCategory && (!form.team1_name || !form.team2_name);
    if (form.gameDate < getTodayBrasilia()) {
      toast.error("Não é possível cadastrar tips para datas passadas.");
      return;
    }
    if (!form.gameDate || teamsRequired || !form.odd || !form.palpite) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    if (!form.justification.trim()) {
      toast.error("A justificativa é obrigatória");
      return;
    }
    if (!wsdkPayload && !form.link_house_1.trim() && !form.link_house_2.trim() && !form.link_house_3.trim()) {
      toast.error("Preencha pelo menos um link ou importe uma odd do Altenar.");
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
      odd: parseFloat(Number(form.odd).toFixed(2)),
      tier_required: cat.tier,
      addon_required: cat.addon,
      feature_required: cat.feature,
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
      metadata: wsdkPayload
        ? { wsdk: { selections: Array.isArray(wsdkPayload) ? wsdkPayload : [wsdkPayload] } }
        : null,
    };

    // Auto-save new prediction if palpite is filled
    if (form.palpite && form.mercado) {
      const { data: existing } = await supabase
        .from("market_predictions")
        .select("id")
        .eq("prediction", form.palpite)
        .maybeSingle();
      if (!existing) {
        await supabase.from("market_predictions").insert({
          prediction: form.palpite,
          market: form.mercado,
          market_explanation: form.mercado_explicacao || null,
        });
      }
    }

    const { error } = await supabase.from("content_entries").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success("Tip criada com sucesso");
      setForm({ ...EMPTY_FORM });
      setWsdkPayload(null);
      setBetBuilderJson("");
      setBetBuilderImported(false);
      setBetBuilderError("");
      setBetBuilderSummary("");
      setAltenarResetKey(k => k + 1);
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
              min={getTodayBrasilia()}
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

        {/* Categoria */}
        <div>
          <label className="text-xs text-muted-foreground">Categoria *</label>
          <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
            <SelectTrigger className="bg-muted/30 border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="basico">Odds Safes (Básico)</SelectItem>
              <SelectItem value="pro">Odds Pró</SelectItem>
              <SelectItem value="alavancagem">Alavancagem</SelectItem>
              <SelectItem value="multiplas_bingo">Múltiplas / Bingo</SelectItem>
              <SelectItem value="mercados_secundarios">Mercados Secundários</SelectItem>
              <SelectItem value="esportes_americanos">Esportes Americanos</SelectItem>
              <SelectItem value="odds_ultra">Odds Ultra</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Time 1 */}
        {!isSpecialCategory && (
          <div className="border border-border rounded-lg p-3 space-y-3">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Time 1</span>
            <TeamAutocomplete
              label="Time 1"
              value={form.team1_name}
              logoUrl={form.team1_logo_url}
              onChange={(name, logoUrl) => setForm(f => ({ ...f, team1_name: name, team1_logo_url: logoUrl }))}
            />
          </div>
        )}

        {/* Time 2 */}
        {!isSpecialCategory && (
          <div className="border border-border rounded-lg p-3 space-y-3">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Time 2</span>
            <TeamAutocomplete
              label="Time 2"
              value={form.team2_name}
              logoUrl={form.team2_logo_url}
              onChange={(name, logoUrl) => setForm(f => ({ ...f, team2_name: name, team2_logo_url: logoUrl }))}
            />
          </div>
        )}

        {/* Odd */}
        <div>
          <label className="text-xs text-muted-foreground">Odd *</label>
          <Input type="number" step="0.01" value={form.odd} onChange={(e) => set("odd", e.target.value)} className="bg-muted/30 border-border" />
        </div>

        {!isSpecialCategory && (
          <PredictionAutocomplete
            value={form.palpite}
            onChange={(prediction, market, explanation) => {
              setForm(f => ({
                ...f,
                palpite: prediction,
                ...(market ? { mercado: market } : {}),
                ...(explanation ? { mercado_explicacao: explanation } : {}),
              }));
            }}
          />
        )}

        <div>
          <label className="text-xs text-muted-foreground">Palpite {isSpecialCategory && "(auto)"}</label>
          <Input value={form.palpite} onChange={(e) => set("palpite", e.target.value)} disabled={isSpecialCategory} className="bg-muted/30 border-border disabled:opacity-60" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Mercado {isSpecialCategory && "(auto)"}</label>
          <Input value={form.mercado} onChange={(e) => set("mercado", e.target.value)} disabled={isSpecialCategory} placeholder="Ex: Over/Under, Resultado Final" className="bg-muted/30 border-border disabled:opacity-60" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">O que é esse mercado? {isSpecialCategory && "(auto)"}</label>
          <Textarea value={form.mercado_explicacao} onChange={(e) => set("mercado_explicacao", e.target.value)} disabled={isSpecialCategory} className="bg-muted/30 border-border disabled:opacity-60" rows={2} placeholder="Explicação que aparece no tooltip (?)" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Justificativa *</label>

          {isBilheteEspecial && (
            <div className="mb-2">
              <label className="text-xs text-muted-foreground mb-1 block">
                Adicionar palpite ao bilhete (autocomplete)
              </label>
              <PredictionAutocomplete
                key={bilheteAutocompleteKey}
                value={bilheteSearchValue}
                onChange={(prediction, market, explanation) => {
                  if (market) {
                    // Selection made
                    const current = form.justification ?? "";
                    const needsSeparator = current.trim().length > 0 && !current.trim().endsWith(";");
                    const prefix = needsSeparator ? current.trimEnd() + " " : current;
                    const appended = `${prefix}✅ ${prediction}; `;
                    set("justification", appended);
                    setBilheteSearchValue("");
                    setBilheteAutocompleteKey(k => k + 1);
                  } else {
                    // Typing — just update the search input
                    setBilheteSearchValue(prediction);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Selecione um palpite para adicionar ao bilhete. Separador: ponto e vírgula.
              </p>
            </div>
          )}

          <Textarea
            value={form.justification}
            onChange={(e) => set("justification", e.target.value)}
            className="bg-muted/30 border-border"
            rows={isBilheteEspecial ? 6 : 3}
            placeholder={isBilheteEspecial
              ? "Ex: ✅ Mais de 0.5 gol no 1º Tempo; ✅ Ambas Marcam - Sim;"
              : "Texto do modal de justificativa (📊)"}
          />
        </div>

        {/* Leitor Altenar */}
        <AltenarOddsReader
          onSelectionMade={handleAltenarSelection}
          multiMode={isMultiTip}
          onMultiSelectionMade={handleAltenarMultiSelection}
        />

        {/* Importar Criar Aposta (BetBuilder) */}
        <div className="border border-yellow-500/30 rounded-lg p-4 bg-yellow-500/5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-400 font-semibold text-sm">🎯 IMPORTAR CRIAR APOSTA (BetBuilder)</span>
            {betBuilderImported && <span className="text-green-400 text-sm">✓ Importado</span>}
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Cole o JSON do campo WSDK_esportiva_betSelections do localStorage da Esportiva.
          </p>
          {!betBuilderImported ? (
            <>
              <Textarea
                value={betBuilderJson}
                onChange={(e) => {
                  setBetBuilderJson(e.target.value);
                  setBetBuilderError("");
                }}
                className="bg-muted/30 border-border font-mono text-xs"
                rows={4}
                placeholder='{"state":{"selections":[...]}}'
              />
              {betBuilderError && (
                <p className="text-xs text-red-400 mt-1">{betBuilderError}</p>
              )}
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700"
                  onClick={handleBetBuilderImport}
                >
                  Importar Criar Aposta
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText("localStorage.getItem('WSDK_esportiva_betSelections')");
                    toast.success("Comando copiado! Cole no console da Esportiva.");
                  }}
                >
                  Copiar Comando
                </Button>
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>✅ {betBuilderSummary}</p>
              <button
                type="button"
                onClick={() => {
                  setBetBuilderImported(false);
                  setBetBuilderJson("");
                  setBetBuilderError("");
                  setWsdkPayload(null);
                }}
                className="text-yellow-400 hover:text-yellow-300 underline text-xs"
              >
                Refazer importação
              </button>
            </div>
          )}
        </div>

        {/* Links por Casa de Apostas */}
        {houses.length > 0 && (
          <div className="border border-border rounded-lg p-3 space-y-2">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Links por Casa de Apostas *</span>
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
