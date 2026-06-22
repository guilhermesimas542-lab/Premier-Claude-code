import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Loader2, CheckCircle, AlertTriangle, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { TeamAutocomplete } from "../components/TeamAutocomplete";
import {
  CSV_HEADERS,
  CATEGORIA_MAP,
  parseCSV,
  normalizeRow,
  dedupKey,
  type ParsedTipRow,
} from "../lib/csvExportImport";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Team { id: string; name: string; logo_url: string; }

interface ReviewRow extends ParsedTipRow {
  team1_logo_url: string;
  team1_matched: boolean;
  team2_logo_url: string;
  team2_matched: boolean;
}

export default function AdminTipsImport() {
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dedupe, setDedupe] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
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

      // Trava: o CSV precisa ter as colunas de times (formato reimportável).
      const cols = Object.keys(raw[0] || {});
      const hasTeam1 = ["time1", "team1_name", "team1"].some((c) => cols.includes(c));
      const hasTeam2 = ["time2", "team2_name", "team2"].some((c) => cols.includes(c));
      if (!hasTeam1 || !hasTeam2) {
        toast.error('Esse CSV não é o "reimportável" (faltam as colunas time1/time2). Use o botão "Exportar reimportável" — não o "Exportar relatório".');
        setFileName(null);
        return;
      }

      const parsed: ReviewRow[] = raw.map((r) => {
        const norm = normalizeRow(r);
        const t1 = matchTeam(norm.team1_name);
        const t2 = matchTeam(norm.team2_name);
        return {
          ...norm,
          team1_logo_url: t1.logo_url,
          team1_matched: t1.matched,
          team2_logo_url: t2.logo_url,
          team2_matched: t2.matched,
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

    // Dedup: busca tips existentes nas mesmas datas e remove duplicatas da payload
    let rowsToImport = validRows;
    if (dedupe) {
      const dates = Array.from(new Set(validRows.map(r => r.date)));
      const { data: existing } = await (supabase as any)
        .from("content_entries")
        .select("date,team1_name,team2_name,odd,condition_to_win")
        .in("date", dates);

      const existingKeys = new Set(
        (existing || []).map((e: any) =>
          dedupKey({
            date: e.date,
            team1_name: e.team1_name || "",
            team2_name: e.team2_name || "",
            odd: e.odd ?? 0,
            condition_to_win: e.condition_to_win,
          })
        )
      );

      rowsToImport = validRows.filter(r => !existingKeys.has(dedupKey({
        date: r.date,
        team1_name: r.team1_name,
        team2_name: r.team2_name,
        odd: r.odd,
        palpite: r.palpite,
      })));

      const skipped = validRows.length - rowsToImport.length;
      if (skipped > 0) {
        toast.message(`Puladas ${skipped} duplicata(s)`);
      }
      if (rowsToImport.length === 0) {
        toast.success("Nada para importar — todas já existem");
        setImporting(false);
        return;
      }
    }

    const payload = rowsToImport.map((r) => {
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
      toast.success(`¡${rowsToImport.length} tips importadas con éxito!`);
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

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={dedupe} onCheckedChange={(v) => setDedupe(v === true)} />
          <span>Evitar duplicatas (mesma data + times + cuota + palpite)</span>
        </label>

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
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Importar CSV</h2>
        <Button variant="outline" size="sm" onClick={() => setShowHelp(true)}>
          <HelpCircle className="w-4 h-4 mr-2" /> Como importar?
        </Button>
      </div>

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
{`data_hora,time1,time2,categoria,odd,palpite,mercado,explicacao,justificativa
2026-02-26T20:00:00,Colo-Colo,Universidad de Chile,free,1.45,Más de 1.5 goles,Over/Under,Explicación,Justificativa
2026-02-27T18:00:00,U Católica,Palestino,pro,2.10,Ambos Marcan,BTTS,Clásico chileno,Análisis`}
        </pre>
        <p className="text-[10px] text-muted-foreground/70 pt-1">
          💡 Este CSV es <strong>re-importable</strong>: el mismo formato sirve para exportar desde una operación e importar en otra
          (Chile ↔ Espanha). Los escudos resuelven automáticamente desde la tabla <code>teams</code> del destino.
        </p>
      </div>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Como importar tips</DialogTitle>
          </DialogHeader>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
            <li>Na outra operação, clique em <strong className="text-foreground">"Exportar reimportável"</strong> (botão azul). ⚠️ Não use o "Exportar relatório".</li>
            <li>Aqui, <strong className="text-foreground">arraste o arquivo</strong> <code>tips_reimport_*.csv</code> (ou clique pra selecionar).</li>
            <li>Confira os times — eles batem sozinhos com a tabela de times e o escudo aparece. Ajuste os que ficarem pendentes.</li>
            <li>Deixe <strong className="text-foreground">"Evitar duplicatas"</strong> ligado pra não repetir tips.</li>
            <li>Clique em <strong className="text-foreground">Importar</strong>. Pronto ✅</li>
          </ol>
          <p className="text-xs text-muted-foreground border-t border-border pt-2">
            O arquivo precisa ter as colunas: <code>data_hora, time1, time2, categoria, odd, palpite, mercado, explicacao, justificativa</code>
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
