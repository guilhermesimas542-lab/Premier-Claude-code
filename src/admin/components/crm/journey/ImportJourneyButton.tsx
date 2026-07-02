import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { importJourney, type ImportResult } from "../../../lib/crm/importJourney";

/**
 * Botão "Importar jornada": faz upload de um `.json` exportado por outro app,
 * importa como rascunho (com remapeamento de IDs + validações) e mostra um
 * relatório do que foi ajustado/ignorado.
 */
export function ImportJourneyButton({
  onImported,
  disabled,
}: {
  onImported?: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite reimportar o mesmo arquivo depois
    if (!file) return;

    setLoading(true);
    const res = await importJourney(file);
    setLoading(false);
    setResult(res);

    if (res.ok) {
      toast.success("Jornada importada como rascunho.");
      onImported?.();
    } else {
      toast.error(`Falha ao importar: ${res.error}`);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        disabled={disabled || loading}
        onClick={() => inputRef.current?.click()}
        title={disabled ? "Aplique o schema antes de importar" : "Importar jornada de um arquivo .json"}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        Importar
      </Button>

      <Dialog open={!!result} onOpenChange={(o) => !o && setResult(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {result?.ok ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              )}
              {result?.ok ? "Jornada importada" : "Falha na importação"}
            </DialogTitle>
            <DialogDescription>
              {result?.ok
                ? `"${result.journeyName}" criada como rascunho — ${result.stepsCount} passos, ${result.edgesCount} conexões.`
                : result?.error}
            </DialogDescription>
          </DialogHeader>

          {result?.adjustments && result.adjustments.length > 0 ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 max-h-64 overflow-auto">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-2">
                Ajustes feitos ({result.adjustments.length})
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground list-disc pl-4">
                {result.adjustments.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          ) : result?.ok ? (
            <p className="text-xs text-muted-foreground">
              Nenhum ajuste necessário — o arquivo era totalmente compatível.
            </p>
          ) : null}

          <DialogFooter>
            <Button onClick={() => setResult(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
