import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Link as LinkIcon,
} from "lucide-react";

interface SyncResult {
  ok: boolean;
  championships_synced: number;
  totals: { events: number; matched: number; skipped: number };
  per_championship: Array<{
    league: string;
    altenar_champ_id: number;
    events: number;
    matched: number;
    skipped: number;
    errors: string[];
  }>;
}

export function SyncEsportivaPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const runSync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const startedAt = Date.now();
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "sync-altenar-events",
        { body: {} }
      );
      if (fnError) throw fnError;
      setResult(data as SyncResult);
      setElapsed(Math.round((Date.now() - startedAt) / 1000));
    } catch (e: any) {
      setError(e?.message ?? "Erro desconhecido");
    }
    setLoading(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Sincronizar mapeamento Esportiva
          </h3>
        </div>
        <Button onClick={runSync} disabled={loading} size="sm">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar agora
            </>
          )}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Busca todos os jogos das ligas mapeadas na Altenar (Esportiva) e cruza
        com fixtures da API-Football. Atualiza ai_match_altenar_map. Demora 3-6
        minutos.
      </p>

      {loading && (
        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Processando 46 ligas... não feche essa aba.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-1">
          <div className="flex items-center gap-2 text-destructive font-medium text-sm">
            <AlertCircle className="h-4 w-4" />
            Erro
          </div>
          <p className="text-sm text-destructive/90">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Sincronização concluída em {elapsed}s
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Ligas processadas</p>
                <p className="text-2xl font-bold text-foreground">
                  {result.championships_synced}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Eventos encontrados</p>
                <p className="text-2xl font-bold text-foreground">
                  {result.totals.events}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mapeados</p>
                <p className="text-2xl font-bold text-green-500">
                  {result.totals.matched}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Skipped: {result.totals.skipped} (sem match confiável com
              API-Football)
            </p>
          </div>

          <details className="rounded-md border border-border">
            <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50">
              Ver detalhe por liga ({result.per_championship.length})
            </summary>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2">Liga</th>
                    <th className="px-3 py-2 text-right">Eventos</th>
                    <th className="px-3 py-2 text-right">Mapeados</th>
                    <th className="px-3 py-2 text-right">Skip</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.per_championship.map((c) => {
                    const isEmpty = c.events === 0;
                    const hasErrors = c.errors && c.errors.length > 0;
                    return (
                      <tr
                        key={c.altenar_champ_id}
                        className="border-t border-border"
                      >
                        <td className="px-3 py-2 text-foreground">{c.league}</td>
                        <td className="px-3 py-2 text-right text-foreground">
                          {c.events}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {c.matched > 0 ? (
                            <span className="text-green-500 font-medium">
                              {c.matched}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {c.skipped}
                        </td>
                        <td className="px-3 py-2">
                          {hasErrors ? (
                            <span className="text-destructive text-xs">
                              {c.errors.length} erro(s)
                            </span>
                          ) : isEmpty ? (
                            <span className="text-muted-foreground text-xs">
                              sem jogos (off-season)
                            </span>
                          ) : (
                            <span className="text-green-500 text-xs">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
