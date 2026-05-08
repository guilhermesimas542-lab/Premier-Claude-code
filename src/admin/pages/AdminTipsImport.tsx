import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { TeamAutocomplete } from "../components/TeamAutocomplete";

const CSV_HEADERS = [
  "data_hora", "time1", "time2", "categoria", "odd",
  "palpite", "mercado", "explicacao", "justificativa",
];

const CATEGORIA_MAP: Record<string, { tier: string; addon: string | null; feature: string | null }> = {
  free:                 { tier: "free",  addon: null,          feature: null },
  basico:               { tier: "basic", addon: null,          feature: "odds_safes" },
  basic:                { tier: "basic", addon: null,          feature: "odds_safes" },
  pro:                  { tier: "pro",   addon: null,          feature: "odds_pro" },
  ultra:                { tier: "ultra", addon: null,          feature: "odds_pro" },
  premium:              { tier: "pro",   addon: null,          feature: "odds_pro" },
  alavancagem:          { tier: "ultra", addon: "alavancagem", feature: "alavancagem" },
  multiplas_bingo:      { tier: "ultra", addon: null,          feature: "multiplas_bingo" },
  mercados_secundarios: { tier: "ultra", addon: null,          feature: "mercados_secundarios" },
  esportes_americanos:  { tier: "ultra", addon: null,          feature: "esportes_americanos" },
  odds_ultra:           { tier: "ultra", addon: null,          feature: "odds_ultra" },
};

interface Team { id: string; name: string; logo_url: string; }

interface ParsedRow {
  date: string;
  starts_at: string;
  team1_name: string;
  team1_logo_url: string;
  team1_matched: boolean;
  team2_name: string;
  team2_logo_url: string;
  team2_matched: boolean;
  categoria: string;
  odd: string;
  palpite: string;
  mercado: string;
  explicacao: string;
  justificativa: string;
}

function parseCSV(text: string): any[] {
  const sep = text.includes(";") ? ";" : ",";
  const lines = text.trim().split("\n").map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, "")));
  const headers = lines[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).filter(cols => cols.some(c => c.trim())).map((cols) => {
    const row: any = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    return row;
  });
}

function parseDateBR(raw: string): { date: string; starts_at: string } {
  // Supports "26/02/2026 20:00" or "2026-02-26T20:00" or "2026-02-26 20:00"
  let cleaned = raw.trim();
  const brMatch = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})$/);
  if (brMatch) {
    const [, dd, mm, yyyy, time] = brMatch;
    cleaned = `${yyyy}-${mm}-${dd}T${time}`;
  }
  const dt = new Date(cleaned.replace(" ", "T"));
  if (isNaN(dt.getTime())) return { date: "", starts_at: "" };
  const dateOnly = dt.toISOString().split("T")[0];
  return { date: dateOnly, starts_at: dt.toISOString() };
}

export default function AdminTipsImport() {
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (supabase as any).from("teams").select("*").order("name").then(({ data }: any) => {
      setTeams((data as Team[]) || []);
    });
  }, []);

  const matchTeam = useCallback((name: string): { logo_url: string; matched: boolean } => {
    if (!name.trim()) return { logo_url: "", matched: false };
    const lower = name.toLowerCase().trim();
    const exact = teams.find(t => t.name.toLowerCase() === lower);
    if (exact) return { logo_url: exact.logo_url, matched: true };
    const partial = teams.find(t => t.name.toLowerCase().includes(lower) || lower.includes(t.name.toLowerCase()));
    if (partial) return { logo_url: partial.logo_url, matched: true };
    return { logo_url: "", matched: false };
  }, [teams]);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Solo se aceptan archivos CSV");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const raw = parseCSV(text);
      if (raw.length === 0) { toast.error("Ninguna línea encontrada"); return; }

      const parsed: ParsedRow[] = raw.map((r) => {
        const rawDate = r.data_hora || r.date || r.data || "";
        const { date, starts_at } = parseDateBR(rawDate);
        const t1name = r.time1 || r.team1_name || r.team1 || "";
        const t2name = r.time2 || r.team2_name || r.team2 || "";
        const t1 = matchTeam(t1name);
        const t2 = matchTeam(t2name);
        return {
          date,
          starts_at,
          team1_name: t1name,
          team1_logo_url: t1.logo_url,
          team1_matched: t1.matched,
          team2_name: t2name,
          team2_logo_url: t2.logo_url,
          team2_matched: t2.matched,
          categoria: r.categoria || r.category || "free",
          odd: r.odd || "",
          palpite: r.palpite || r.condition_to_win || "",
          mercado: r.mercado || r.market || "",
          explicacao: r.explicacao || r.mercado_explicacao || r.category_explanation || "",
          justificativa: r.justificativa || r.justification || "",
        };
      });

      setRows(parsed);
      setStep("review");
    };
    reader.readAsText(file);
  }, [matchTeam]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const updateRow = (idx: number, field: keyof ParsedRow, value: any) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleTeamChange = (idx: number, teamNum: 1 | 2, name: string, logoUrl: string) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      if (teamNum === 1) return { ...r, team1_name: name, team1_logo_url: logoUrl, team1_matched: !!logoUrl };
      return { ...r, team2_name: name, team2_logo_url: logoUrl, team2_matched: !!logoUrl };
    }));
  };

  const allMatched = rows.every(r => r.team1_matched && r.team2_matched);
  const matchedCount = rows.filter(r => r.team1_matched && r.team2_matched).length;
  const pendingCount = rows.length - matchedCount;
  const validRows = rows.filter(r => r.date && r.team1_name && r.team2_name && r.odd && !isNaN(parseFloat(r.odd)));

  const handleImport = async () => {
    if (!allMatched) { toast.error("Resuelve todos los equipos pendientes antes de importar"); return; }
    if (validRows.length === 0) { toast.error("Ninguna línea válida"); return; }
    setImporting(true);

    const payload = validRows.map((r) => {
      const cat = CATEGORIA_MAP[r.categoria.toLowerCase()] || CATEGORIA_MAP.free;
      return {
        title: `${r.team1_name} x ${r.team2_name}`,
        date: r.date,
        starts_at: r.starts_at || null,
        expires_at: r.date ? `${r.date}T23:59:00` : null,
        odd: parseFloat(r.odd),
        tier_required: cat.tier as any,
        addon_required: cat.addon as any,
        feature_required: cat.feature,
        active: true,
        team1_name: r.team1_name,
        team1_logo_url: r.team1_logo_url || null,
        team2_name: r.team2_name,
        team2_logo_url: r.team2_logo_url || null,
        condition_to_win: r.palpite || null,
        market: r.mercado || null,
        category: r.mercado || null,
        category_explanation: r.explicacao || null,
        justification: r.justificativa || null,
      };
    });

    const { error } = await supabase.from("content_entries").insert(payload);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`¡${validRows.length} tips importadas con éxito!`);
      setRows([]);
      setStep("upload");
      setFileName(null);
    }
    setImporting(false);
  };

  if (step === "review") {
    return (
      <div className="max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Revisar Importación</h2>
          <Button variant="outline" size="sm" onClick={() => { setStep("upload"); setRows([]); setFileName(null); }}>
            ← Volver
          </Button>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">{rows.length} tips</span>
          <span className="text-emerald-400">✅ {matchedCount} confirmadas</span>
          {pendingCount > 0 && <span className="text-amber-400">⚠️ {pendingCount} pendientes</span>}
        </div>

        <div className="space-y-3">
          {rows.map((row, idx) => {
            const hasError = !row.date || !row.odd || isNaN(parseFloat(row.odd));
            return (
              <div key={idx} className={`border rounded-lg p-3 space-y-2 ${hasError ? "border-destructive/50 bg-destructive/5" : "border-border bg-muted/20"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-mono">Línea {idx + 1}</span>
                  <div className="flex items-center gap-2 text-xs">
                    {row.date && <span className="text-muted-foreground">{row.date}</span>}
                    {row.odd && <span className="text-muted-foreground">Cuota: {row.odd}</span>}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${row.categoria === "free" ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"}`}>
                      {row.categoria}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      {row.team1_matched
                        ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      }
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Equipo 1</span>
                    </div>
                    <TeamAutocomplete
                      label=""
                      value={row.team1_name}
                      logoUrl={row.team1_logo_url}
                      onChange={(name, logoUrl) => handleTeamChange(idx, 1, name, logoUrl)}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      {row.team2_matched
                        ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      }
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Equipo 2</span>
                    </div>
                    <TeamAutocomplete
                      label=""
                      value={row.team2_name}
                      logoUrl={row.team2_logo_url}
                      onChange={(name, logoUrl) => handleTeamChange(idx, 2, name, logoUrl)}
                    />
                  </div>
                </div>

                {row.palpite && <p className="text-xs text-muted-foreground">Pronóstico: {row.palpite}</p>}
              </div>
            );
          })}
        </div>

        <Button
          onClick={handleImport}
          disabled={importing || !allMatched || validRows.length === 0}
          className="w-full"
          size="lg"
        >
          {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          {allMatched
            ? `Importar ${validRows.length} Tips`
            : `Resuelve ${pendingCount} pendiente(s) para importar`
          }
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h2 className="text-xl font-bold">Importar CSV</h2>

      <div
        className={`relative rounded-xl p-8 text-center cursor-pointer transition-all duration-200 border-2 border-dashed
          ${isDragging
            ? "border-secondary bg-secondary/10 shadow-[0_0_24px_hsl(var(--secondary)/0.4)]"
            : "border-border bg-muted/30 hover:border-muted-foreground/50 hover:bg-muted/50"
          }`}
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); }}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className={`w-8 h-8 mx-auto mb-2 transition-colors ${isDragging ? "text-secondary" : "text-muted-foreground"}`} />
        <p className={`text-sm font-medium mb-1 transition-colors ${isDragging ? "text-secondary" : "text-foreground"}`}>
          {isDragging ? "¡Suelta el archivo aquí!" : "Arrastra un CSV aquí o haz clic para seleccionar"}
        </p>
        <p className={`text-xs transition-colors ${isDragging ? "text-secondary/70" : "text-muted-foreground"}`}>
          {fileName ? `📄 ${fileName}` : "Solo se aceptan archivos .csv"}
        </p>
        <input ref={inputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
      </div>

      <div className="text-xs text-muted-foreground">
        <span className="font-semibold">Encabezados esperados:</span> {CSV_HEADERS.join(", ")}
      </div>

      <div className="bg-muted/20 border border-border rounded-lg p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">Ejemplo de CSV:</p>
        <pre className="overflow-x-auto text-[10px] leading-relaxed">
{`data_hora,time1,time2,categoria,odd,palpite,mercado,explicacao
26/02/2026 20:00,Colo-Colo,Universidad de Chile,free,1.45,Más de 1.5 goles,Over/Under,Explicación aquí
27/02/2026 18:00,U Católica,Palestino,pro,2.10,Ambos Marcan,BTTS,Clásico chileno`}
        </pre>
      </div>
    </div>
  );
}
