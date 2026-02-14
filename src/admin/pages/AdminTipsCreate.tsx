import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, Upload, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = {
  title: "", date: "", starts_at: "", expires_at: "",
  team1_name: "", team1_shirt_variant: "solid", team1_primary_color: "#ffffff", team1_secondary_color: "",
  team2_name: "", team2_shirt_variant: "solid", team2_primary_color: "#ffffff", team2_secondary_color: "",
  category: "", category_explanation: "", condition_to_win: "", classification: "",
  justification: "", odd: "", tier_required: "free", addon_required: "", link: "",
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
  const [mode, setMode] = useState<"manual" | "csv">("manual");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date || !form.team1_name || !form.team2_name || !form.odd) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    setSaving(true);

    const payload: any = {
      title: form.title, date: form.date, odd: parseFloat(form.odd),
      tier_required: form.tier_required, active: true,
      starts_at: form.starts_at || null, expires_at: form.expires_at || null,
      team1_name: form.team1_name, team1_shirt_variant: form.team1_shirt_variant,
      team1_primary_color: form.team1_primary_color, team1_secondary_color: form.team1_secondary_color || null,
      team2_name: form.team2_name, team2_shirt_variant: form.team2_shirt_variant,
      team2_primary_color: form.team2_primary_color, team2_secondary_color: form.team2_secondary_color || null,
      category: form.category || null, category_explanation: form.category_explanation || null,
      condition_to_win: form.condition_to_win || null, classification: form.classification || null,
      justification: form.justification || null, addon_required: form.addon_required || null,
      link: form.link || null, market: form.category || null,
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
      if (parsed.length === 0) {
        setCsvErrors(["Nenhuma linha encontrada no CSV"]);
        return;
      }
      const errs: string[] = [];
      const row = parsed[0];
      if (!row.title) errs.push("Campo 'title' vazio");
      if (!row.date) errs.push("Campo 'date' vazio");
      if (!row.team1_name) errs.push("Campo 'team1_name' vazio");
      if (!row.team2_name) errs.push("Campo 'team2_name' vazio");
      if (!row.odd || isNaN(parseFloat(row.odd))) errs.push("Campo 'odd' inválido");

      if (errs.length > 0) {
        setCsvErrors(errs);
        return;
      }

      setCsvErrors([]);
      setForm({
        title: row.title || "",
        date: row.date || "",
        starts_at: row.starts_at || "",
        expires_at: row.expires_at || "",
        team1_name: row.team1_name || "",
        team1_shirt_variant: row.team1_shirt_variant || "solid",
        team1_primary_color: row.team1_primary_color || "#ffffff",
        team1_secondary_color: row.team1_secondary_color || "",
        team2_name: row.team2_name || "",
        team2_shirt_variant: row.team2_shirt_variant || "solid",
        team2_primary_color: row.team2_primary_color || "#ffffff",
        team2_secondary_color: row.team2_secondary_color || "",
        category: row.category || "",
        category_explanation: row.category_explanation || "",
        condition_to_win: row.condition_to_win || "",
        classification: row.classification || "",
        justification: row.justification || "",
        odd: row.odd || "",
        tier_required: row.tier_required || "free",
        addon_required: row.addon_required || "",
        link: "", // sempre vazio — admin preenche manualmente
      });
      setMode("manual");
      toast.success("Dados importados do CSV. Revise e preencha o Link antes de salvar.");
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-xl font-bold">Cadastrar Tip</h2>

      {/* Mode tabs */}
      <div className="flex rounded-lg bg-gray-800 p-0.5 w-fit">
        <button
          onClick={() => setMode("manual")}
          className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
            mode === "manual" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Cadastro Manual
        </button>
        <button
          onClick={() => setMode("csv")}
          className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
            mode === "csv" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Importar via CSV
        </button>
      </div>

      {mode === "csv" ? (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-8 text-center">
            <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm mb-3">
              Selecione um CSV com os dados da tip. A primeira linha será usada para pré-preencher o formulário.
            </p>
            <input type="file" accept=".csv" onChange={handleCSVFile} className="text-sm text-gray-400" />
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-semibold">Cabeçalhos esperados:</span> title, date, starts_at, expires_at, team1_name, team2_name, odd, tier_required, category, ...
          </div>
          {csvErrors.length > 0 && (
            <div className="bg-red-400/10 border border-red-400/30 rounded-lg p-3 space-y-1">
              {csvErrors.map((err, i) => (
                <div key={i} className="flex items-center gap-1 text-red-400 text-xs">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {err}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Título *</label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} className="bg-gray-900 border-gray-800" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Data *</label>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="bg-gray-900 border-gray-800" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Início (datetime)</label>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} className="bg-gray-900 border-gray-800" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Expiração (datetime)</label>
              <Input type="datetime-local" value={form.expires_at} onChange={(e) => set("expires_at", e.target.value)} className="bg-gray-900 border-gray-800" />
            </div>
          </div>

          <div className="border border-white/10 rounded-lg p-3 space-y-3">
            <span className="text-xs text-gray-400 font-semibold uppercase">Time 1</span>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nome *" value={form.team1_name} onChange={(e) => set("team1_name", e.target.value)} className="bg-gray-900 border-gray-800" />
              <Select value={form.team1_shirt_variant} onValueChange={(v) => set("team1_shirt_variant", v)}>
                <SelectTrigger className="bg-gray-900 border-gray-800"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="solid">Sólida</SelectItem><SelectItem value="stripes">Listrada</SelectItem></SelectContent>
              </Select>
              <Input type="color" value={form.team1_primary_color} onChange={(e) => set("team1_primary_color", e.target.value)} className="h-10 p-1 bg-gray-900 border-gray-800" />
              <Input type="color" value={form.team1_secondary_color || "#000000"} onChange={(e) => set("team1_secondary_color", e.target.value)} className="h-10 p-1 bg-gray-900 border-gray-800" />
            </div>
          </div>

          <div className="border border-white/10 rounded-lg p-3 space-y-3">
            <span className="text-xs text-gray-400 font-semibold uppercase">Time 2</span>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nome *" value={form.team2_name} onChange={(e) => set("team2_name", e.target.value)} className="bg-gray-900 border-gray-800" />
              <Select value={form.team2_shirt_variant} onValueChange={(v) => set("team2_shirt_variant", v)}>
                <SelectTrigger className="bg-gray-900 border-gray-800"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="solid">Sólida</SelectItem><SelectItem value="stripes">Listrada</SelectItem></SelectContent>
              </Select>
              <Input type="color" value={form.team2_primary_color} onChange={(e) => set("team2_primary_color", e.target.value)} className="h-10 p-1 bg-gray-900 border-gray-800" />
              <Input type="color" value={form.team2_secondary_color || "#000000"} onChange={(e) => set("team2_secondary_color", e.target.value)} className="h-10 p-1 bg-gray-900 border-gray-800" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">Categoria</label>
              <Input value={form.category} onChange={(e) => set("category", e.target.value)} className="bg-gray-900 border-gray-800" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Odd *</label>
              <Input type="number" step="0.01" value={form.odd} onChange={(e) => set("odd", e.target.value)} className="bg-gray-900 border-gray-800" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Classificação</label>
              <Input value={form.classification} onChange={(e) => set("classification", e.target.value)} className="bg-gray-900 border-gray-800" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Plano *</label>
              <Select value={form.tier_required} onValueChange={(v) => set("tier_required", v)}>
                <SelectTrigger className="bg-gray-900 border-gray-800"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem><SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem><SelectItem value="ultra">Ultra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Add-on</label>
              <Select value={form.addon_required || "none"} onValueChange={(v) => set("addon_required", v === "none" ? "" : v)}>
                <SelectTrigger className="bg-gray-900 border-gray-800"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem><SelectItem value="alavancagem">Alavancagem</SelectItem><SelectItem value="desaltas">De Altas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Link</label>
              <Input value={form.link} onChange={(e) => set("link", e.target.value)} className="bg-gray-900 border-gray-800" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Explicação da categoria</label>
            <Textarea value={form.category_explanation} onChange={(e) => set("category_explanation", e.target.value)} className="bg-gray-900 border-gray-800" rows={2} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Condição pra ganhar</label>
            <Textarea value={form.condition_to_win} onChange={(e) => set("condition_to_win", e.target.value)} className="bg-gray-900 border-gray-800" rows={2} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Justificativa</label>
            <Textarea value={form.justification} onChange={(e) => set("justification", e.target.value)} className="bg-gray-900 border-gray-800" rows={3} />
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
