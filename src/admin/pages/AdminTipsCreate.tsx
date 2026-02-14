import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, Upload, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const COLOR_OPTIONS: Record<string, string> = {
  Preto: "#000000",
  Branco: "#FFFFFF",
  Vermelho: "#EF4444",
  Azul: "#3B82F6",
  Verde: "#22C55E",
  Amarelo: "#FACC15",
  Laranja: "#F97316",
  Roxo: "#A855F7",
  Cinza: "#6B7280",
};

const CATEGORIA_MAP: Record<string, { tier: string; addon: string | null }> = {
  free: { tier: "free", addon: null },
  basico: { tier: "basic", addon: null },
  pro: { tier: "pro", addon: null },
  ultra: { tier: "ultra", addon: null },
  alavancagem: { tier: "pro", addon: "alavancagem" },
  odds_altas: { tier: "pro", addon: "desaltas" },
};

const EMPTY_FORM = {
  date: "",
  team1_name: "", team1_shirt_variant: "solid", team1_primary_color: "Branco", team1_secondary_color: "",
  team2_name: "", team2_shirt_variant: "solid", team2_primary_color: "Branco", team2_secondary_color: "",
  categoria: "free",
  palpite: "",
  odd: "",
  mercado: "",
  mercado_explicacao: "",
  justification: "",
  link: "",
};

function parseCSV(text: string) {
  const sep = text.includes(";") ? ";" : ",";
  const lines = text.trim().split("\n").map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, "")));
  const headers = lines[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((cols) => {
    const row: any = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return row;
  });
}

export default function AdminTipsCreate() {
  const [mode, setMode] = useState<"manual" | "csv">("csv");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.team1_name || !form.team2_name || !form.odd || !form.palpite) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setSaving(true);

    const cat = CATEGORIA_MAP[form.categoria] || CATEGORIA_MAP.free;
    const dateOnly = form.date.split("T")[0];

    const payload: any = {
      title: `${form.team1_name} x ${form.team2_name}`,
      date: dateOnly,
      starts_at: form.date ? new Date(form.date).toISOString() : null,
      expires_at: dateOnly ? `${dateOnly}T23:59:00` : null,
      odd: parseFloat(form.odd),
      tier_required: cat.tier,
      addon_required: cat.addon,
      active: true,
      team1_name: form.team1_name,
      team1_shirt_variant: form.team1_shirt_variant,
      team1_primary_color: COLOR_OPTIONS[form.team1_primary_color] || form.team1_primary_color,
      team1_secondary_color: form.team1_secondary_color ? (COLOR_OPTIONS[form.team1_secondary_color] || form.team1_secondary_color) : null,
      team2_name: form.team2_name,
      team2_shirt_variant: form.team2_shirt_variant,
      team2_primary_color: COLOR_OPTIONS[form.team2_primary_color] || form.team2_primary_color,
      team2_secondary_color: form.team2_secondary_color ? (COLOR_OPTIONS[form.team2_secondary_color] || form.team2_secondary_color) : null,
      condition_to_win: form.palpite || null,
      market: form.mercado || null,
      category: form.mercado || null,
      category_explanation: form.mercado_explicacao || null,
      justification: form.justification || null,
      link: form.link || null,
      classification: null,
    };

    const { error } = await supabase.from("content_entries").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success("Tip criada com sucesso");
      setForm({ ...EMPTY_FORM });
    }
    setSaving(false);
  };

  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) { setCsvErrors(["Nenhuma linha encontrada no CSV"]); return; }
      const errs: string[] = [];
      const row = parsed[0];
      if (!row.date && !row.data) errs.push("Campo 'date' vazio");
      if (!row.team1_name && !row.time1) errs.push("Campo 'team1_name' vazio");
      if (!row.team2_name && !row.time2) errs.push("Campo 'team2_name' vazio");
      if (!row.odd || isNaN(parseFloat(row.odd))) errs.push("Campo 'odd' inválido");
      if (!row.palpite && !row.condition_to_win) errs.push("Campo 'palpite' vazio");

      if (errs.length > 0) { setCsvErrors(errs); return; }

      setCsvErrors([]);
      setForm({
        date: row.date || row.data || "",
        team1_name: row.team1_name || row.time1 || "",
        team1_shirt_variant: row.team1_shirt_variant || row.camisa1 || "solid",
        team1_primary_color: row.team1_primary_color || row.cor1 || "Branco",
        team1_secondary_color: row.team1_secondary_color || row.cor1_sec || "",
        team2_name: row.team2_name || row.time2 || "",
        team2_shirt_variant: row.team2_shirt_variant || row.camisa2 || "solid",
        team2_primary_color: row.team2_primary_color || row.cor2 || "Branco",
        team2_secondary_color: row.team2_secondary_color || row.cor2_sec || "",
        categoria: row.categoria || row.category || "free",
        palpite: row.palpite || row.condition_to_win || "",
        odd: row.odd || "",
        mercado: row.mercado || row.market || "",
        mercado_explicacao: row.mercado_explicacao || row.category_explanation || "",
        justification: row.justification || row.justificativa || "",
        link: "",
      });
      setMode("manual");
      toast.success("Dados importados do CSV. Revise e preencha o Link antes de salvar.");
    };
    reader.readAsText(file);
  };

  const colorNames = Object.keys(COLOR_OPTIONS);

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-xl font-bold">Cadastrar Tip</h2>

      <div className="flex rounded-lg bg-gray-800 p-0.5 w-fit">
        <button onClick={() => setMode("manual")} className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${mode === "manual" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
          Cadastro Manual
        </button>
        <button onClick={() => setMode("csv")} className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${mode === "csv" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
          Importar via CSV
        </button>
      </div>

      {mode === "csv" ? (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-8 text-center">
            <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm mb-3">Selecione um CSV com os dados da tip.</p>
            <input type="file" accept=".csv" onChange={handleCSVFile} className="text-sm text-gray-400" />
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-semibold">Colunas esperadas:</span> date, team1_name, team2_name, odd, palpite, categoria, mercado, mercado_explicacao, justification, team1_primary_color, ...
          </div>
          {csvErrors.length > 0 && (
            <div className="bg-red-400/10 border border-red-400/30 rounded-lg p-3 space-y-1">
              {csvErrors.map((err, i) => (
                <div key={i} className="flex items-center gap-1 text-red-400 text-xs"><AlertCircle className="w-3 h-3 shrink-0" /> {err}</div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Data e Hora */}
          <div>
            <label className="text-xs text-gray-500">Data e Hora do Jogo *</label>
            <Input type="datetime-local" value={form.date} onChange={(e) => set("date", e.target.value)} className="bg-gray-900 border-gray-800" />
          </div>

          {/* Time 1 */}
          <div className="border border-white/10 rounded-lg p-3 space-y-3">
            <span className="text-xs text-gray-400 font-semibold uppercase">Time 1</span>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nome *" value={form.team1_name} onChange={(e) => set("team1_name", e.target.value)} className="bg-gray-900 border-gray-800" />
              <Select value={form.team1_shirt_variant} onValueChange={(v) => set("team1_shirt_variant", v)}>
                <SelectTrigger className="bg-gray-900 border-gray-800"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="solid">Sólida</SelectItem><SelectItem value="stripes">Listrada</SelectItem></SelectContent>
              </Select>
              <div>
                <label className="text-xs text-gray-500">Cor principal</label>
                <Select value={form.team1_primary_color} onValueChange={(v) => set("team1_primary_color", v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: COLOR_OPTIONS[form.team1_primary_color] || "#fff" }} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {colorNames.map((c) => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: COLOR_OPTIONS[c] }} />
                          {c}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Cor secundária</label>
                <Select value={form.team1_secondary_color || "none"} onValueChange={(v) => set("team1_secondary_color", v === "none" ? "" : v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-800">
                    <div className="flex items-center gap-2">
                      {form.team1_secondary_color && <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: COLOR_OPTIONS[form.team1_secondary_color] || "#000" }} />}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {colorNames.map((c) => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: COLOR_OPTIONS[c] }} />
                          {c}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Time 2 */}
          <div className="border border-white/10 rounded-lg p-3 space-y-3">
            <span className="text-xs text-gray-400 font-semibold uppercase">Time 2</span>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nome *" value={form.team2_name} onChange={(e) => set("team2_name", e.target.value)} className="bg-gray-900 border-gray-800" />
              <Select value={form.team2_shirt_variant} onValueChange={(v) => set("team2_shirt_variant", v)}>
                <SelectTrigger className="bg-gray-900 border-gray-800"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="solid">Sólida</SelectItem><SelectItem value="stripes">Listrada</SelectItem></SelectContent>
              </Select>
              <div>
                <label className="text-xs text-gray-500">Cor principal</label>
                <Select value={form.team2_primary_color} onValueChange={(v) => set("team2_primary_color", v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: COLOR_OPTIONS[form.team2_primary_color] || "#fff" }} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {colorNames.map((c) => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: COLOR_OPTIONS[c] }} />
                          {c}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Cor secundária</label>
                <Select value={form.team2_secondary_color || "none"} onValueChange={(v) => set("team2_secondary_color", v === "none" ? "" : v)}>
                  <SelectTrigger className="bg-gray-900 border-gray-800">
                    <div className="flex items-center gap-2">
                      {form.team2_secondary_color && <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: COLOR_OPTIONS[form.team2_secondary_color] || "#000" }} />}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {colorNames.map((c) => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: COLOR_OPTIONS[c] }} />
                          {c}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Categoria, Palpite, Odd */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Categoria *</label>
              <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
                <SelectTrigger className="bg-gray-900 border-gray-800"><SelectValue /></SelectTrigger>
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
              <label className="text-xs text-gray-500">Odd *</label>
              <Input type="number" step="0.01" value={form.odd} onChange={(e) => set("odd", e.target.value)} className="bg-gray-900 border-gray-800" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Palpite *</label>
            <Input value={form.palpite} onChange={(e) => set("palpite", e.target.value)} placeholder="Ex: Mais de 1.5 gols" className="bg-gray-900 border-gray-800" />
          </div>

          <div>
            <label className="text-xs text-gray-500">Mercado</label>
            <Input value={form.mercado} onChange={(e) => set("mercado", e.target.value)} placeholder="Ex: Over/Under, Resultado Final" className="bg-gray-900 border-gray-800" />
          </div>

          <div>
            <label className="text-xs text-gray-500">O que é esse mercado?</label>
            <Textarea value={form.mercado_explicacao} onChange={(e) => set("mercado_explicacao", e.target.value)} className="bg-gray-900 border-gray-800" rows={2} placeholder="Explicação que aparece no tooltip (?)" />
          </div>

          <div>
            <label className="text-xs text-gray-500">Justificativa</label>
            <Textarea value={form.justification} onChange={(e) => set("justification", e.target.value)} className="bg-gray-900 border-gray-800" rows={3} placeholder="Texto do modal de justificativa (📊)" />
          </div>

          <div>
            <label className="text-xs text-gray-500">Link</label>
            <Input value={form.link} onChange={(e) => set("link", e.target.value)} className="bg-gray-900 border-gray-800" />
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Salvar Tip
          </Button>
        </form>
      )}
    </div>
  );
}
