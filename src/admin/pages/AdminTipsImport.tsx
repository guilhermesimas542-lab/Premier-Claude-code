import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const CSV_HEADERS = [
  "title", "date", "starts_at", "expires_at",
  "team1_name", "team1_shirt_variant", "team1_primary_color", "team1_secondary_color",
  "team2_name", "team2_shirt_variant", "team2_primary_color", "team2_secondary_color",
  "category", "category_explanation", "condition_to_win", "classification",
  "justification", "odd", "tier_required", "addon_required", "link",
];

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

function validateRow(row: any, idx: number): string | null {
  if (!row.title) return `Linha ${idx + 1}: título vazio`;
  if (!row.date) return `Linha ${idx + 1}: data vazia`;
  if (!row.team1_name) return `Linha ${idx + 1}: team1_name vazio`;
  if (!row.team2_name) return `Linha ${idx + 1}: team2_name vazio`;
  if (!row.odd || isNaN(parseFloat(row.odd))) return `Linha ${idx + 1}: odd inválida`;
  if (!row.tier_required) return `Linha ${idx + 1}: tier_required vazio`;
  return null;
}

export default function AdminTipsImport() {
  const [rows, setRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      const errs: string[] = [];
      parsed.forEach((r, i) => {
        const err = validateRow(r, i);
        if (err) errs.push(err);
      });
      setRows(parsed);
      setErrors(errs);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const valid = rows.filter((_, i) => !validateRow(rows[i], i));
    if (valid.length === 0) { toast.error("Nenhuma linha válida"); return; }
    setImporting(true);

    const payload = valid.map((r) => ({
      title: r.title, date: r.date, odd: parseFloat(r.odd),
      tier_required: r.tier_required || "free", active: true,
      starts_at: r.starts_at || null, expires_at: r.expires_at || null,
      team1_name: r.team1_name, team1_shirt_variant: r.team1_shirt_variant || "solid",
      team1_primary_color: r.team1_primary_color || null, team1_secondary_color: r.team1_secondary_color || null,
      team2_name: r.team2_name, team2_shirt_variant: r.team2_shirt_variant || "solid",
      team2_primary_color: r.team2_primary_color || null, team2_secondary_color: r.team2_secondary_color || null,
      category: r.category || null, category_explanation: r.category_explanation || null,
      condition_to_win: r.condition_to_win || null, classification: r.classification || null,
      justification: r.justification || null, addon_required: r.addon_required || null,
      link: r.link || null, market: r.category || null,
    }));

    const { error } = await supabase.from("content_entries").insert(payload);
    if (error) {
      toast.error(error.message);
      setResult({ ok: 0, fail: valid.length });
    } else {
      toast.success(`${valid.length} tips importadas`);
      setResult({ ok: valid.length, fail: rows.length - valid.length });
    }
    setImporting(false);
  };

  return (
    <div className="max-w-3xl space-y-4">
      <h2 className="text-xl font-bold">Importar CSV</h2>

      <div className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-8 text-center">
        <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
        <p className="text-gray-400 text-sm mb-3">Arraste ou selecione um arquivo CSV</p>
        <input type="file" accept=".csv" onChange={handleFile} className="text-sm text-gray-400" />
      </div>

      <div className="text-xs text-gray-500">
        <span className="font-semibold">Cabeçalhos esperados:</span> {CSV_HEADERS.join(", ")}
      </div>

      {errors.length > 0 && (
        <div className="bg-red-400/10 border border-red-400/30 rounded-lg p-3 space-y-1 max-h-40 overflow-auto">
          {errors.map((err, i) => (
            <div key={i} className="flex items-center gap-1 text-red-400 text-xs">
              <AlertCircle className="w-3 h-3 shrink-0" /> {err}
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="text-sm text-gray-400">
            {rows.length} linhas detectadas • {errors.length} com erro • {rows.length - errors.length} válidas
          </div>
          <div className="bg-gray-900 rounded-xl border border-white/10 overflow-x-auto max-h-60">
            <table className="text-xs w-max">
              <thead>
                <tr className="border-b border-white/10 text-gray-500">
                  {Object.keys(rows[0]).slice(0, 8).map((h) => (
                    <th key={h} className="px-3 py-1.5 text-left">{h}</th>
                  ))}
                  <th className="px-3 py-1.5">…</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-b border-white/5 text-gray-300">
                    {Object.values(r).slice(0, 8).map((v: any, j) => (
                      <td key={j} className="px-3 py-1 max-w-[120px] truncate">{v}</td>
                    ))}
                    <td className="px-3 py-1 text-gray-600">…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={handleImport} disabled={importing || rows.length - errors.length === 0}>
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Importar {rows.length - errors.length} válidas
          </Button>
        </>
      )}

      {result && (
        <div className="bg-green-400/10 border border-green-400/30 rounded-lg p-3 text-green-400 text-sm">
          ✅ {result.ok} importadas, {result.fail} com erro
        </div>
      )}
    </div>
  );
}
